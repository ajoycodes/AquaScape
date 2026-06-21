import { useEffect, useState } from 'react'
import { getOrders, getOrder, cancelOrder } from '../../api/client'
import { useShop } from '../../context/ShopContext'
import { Package, ChevronDown, ChevronUp, CreditCard, X } from 'lucide-react'

const STATUS_BADGE = {
  PENDING:    's-yellow',
  CONFIRMED:  's-blue',
  PROCESSING: 's-purple',
  SHIPPED:    's-cyan',
  DELIVERED:  's-green',
  CANCELLED:  's-red',
  REFUNDED:   's-gray',
}

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

const PMT_STYLE = {
  COMPLETED: { color: '#1c7737', bg: '#e8f8ee' },
  PENDING:   { color: '#b45309', bg: '#fff7ed' },
  FAILED:    { color: '#c0392b', bg: '#fff2f2' },
  REFUNDED:  { color: '#6e6e73', bg: '#f5f5f7' },
}

export default function ShopOrders() {
  const { customer } = useShop()
  const [orders,     setOrders]     = useState([])
  const [detail,     setDetail]     = useState(null)
  const [open,       setOpen]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [cancelling, setCancelling] = useState(null)
  const [error,      setError]      = useState('')

  const loadOrders = () => {
    if (!customer) return
    setLoading(true)
    getOrders({ customer_id: customer.id })
      .then(r => setOrders(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadOrders() }, [customer])  // eslint-disable-line

  const toggleDetail = async (orderId) => {
    if (open === orderId) { setOpen(null); setDetail(null); return }
    setOpen(orderId)
    setDetail(null)
    try {
      const r = await getOrder(orderId)
      setDetail(r.data)
    } catch (e) { setError(e.message) }
  }

  const handleCancel = async (orderId) => {
    setCancelling(orderId)
    setError('')
    try {
      await cancelOrder(orderId, { reason: 'Customer requested cancellation' })
      setOpen(null)
      setDetail(null)
      loadOrders()
    } catch (e) {
      setError(e.message)
    } finally {
      setCancelling(null)
    }
  }

  if (!customer) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '64px 0' }}>
          <Package size={40} color="#aeaeb2" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>Select an account to view orders</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em' }}>My Orders</h1>

      {error && (
        <div style={{ color: '#ff3b30', fontSize: 13, background: '#fff2f2', borderRadius: 10, padding: '10px 14px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: '#aeaeb2', fontSize: 13 }}>Loading…</div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Package size={40} color="#aeaeb2" />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#3a3a3c' }}>No orders yet</div>
          <div style={{ fontSize: 13, color: '#8e8e93' }}>Your placed orders will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(o => {
            const isOpen = open === o.ORDER_ID
            const currentDetail = isOpen ? detail : null
            const stepIdx = STATUS_STEPS.indexOf(o.STATUS)
            const orderDate = o.ORDER_DATE ?? o.CREATED_AT

            return (
              <div key={o.ORDER_ID} className="card" style={{ padding: 0, overflow: 'hidden' }}>

                {/* Order header row */}
                <button
                  onClick={() => toggleDetail(o.ORDER_ID)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                  }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: o.STATUS === 'DELIVERED' ? '#e8f8ee' : o.STATUS === 'CANCELLED' ? '#fff2f2' : '#e8f2ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Package size={20} color={o.STATUS === 'DELIVERED' ? '#34c759' : o.STATUS === 'CANCELLED' ? '#ff3b30' : '#0071e3'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', fontFamily: 'monospace' }}>
                        Order #{o.ORDER_ID}
                      </span>
                      <span className={`badge ${STATUS_BADGE[o.STATUS] ?? 's-gray'}`}>{o.STATUS}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8e8e93' }}>
                      {orderDate
                        ? new Date(orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', marginRight: 8, fontVariantNumeric: 'tabular-nums' }}>
                    ${Number(o.TOTAL_AMOUNT).toFixed(2)}
                  </div>
                  {isOpen ? <ChevronUp size={16} color="#8e8e93" /> : <ChevronDown size={16} color="#8e8e93" />}
                </button>

                {/* Status progress bar */}
                {stepIdx >= 0 && o.STATUS !== 'CANCELLED' && o.STATUS !== 'REFUNDED' && (
                  <div style={{ padding: '0 18px 14px', display: 'flex', alignItems: 'center' }}>
                    {STATUS_STEPS.map((step, i) => (
                      <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: i <= stepIdx ? '#0071e3' : '#e5e5ea',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {i < stepIdx && <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>✓</span>}
                            {i === stepIdx && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 500, color: i <= stepIdx ? '#0071e3' : '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {step}
                          </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div style={{ flex: 1, height: 2, background: i < stepIdx ? '#0071e3' : '#e5e5ea', marginBottom: 20 }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Expanded detail */}
                {isOpen && currentDetail && (
                  <div style={{ borderTop: '1px solid #f2f2f2', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Items */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                        Items
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(currentDetail.items ?? []).map(item => (
                          <div key={item.ORDER_ITEM_ID} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span style={{ color: '#3a3a3c' }}>
                              {item.PRODUCT_NAME}
                              <span style={{ color: '#8e8e93' }}> ×{item.QUANTITY}</span>
                            </span>
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                              ${Number(item.LINE_TOTAL).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div style={{ borderTop: '1px solid #f2f2f2', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        ['Subtotal', `$${Number(currentDetail.SUBTOTAL ?? 0).toFixed(2)}`],
                        ['Tax',      `$${Number(currentDetail.TAX_AMOUNT ?? 0).toFixed(2)}`],
                        ['Total',    `$${Number(currentDetail.TOTAL_AMOUNT ?? 0).toFixed(2)}`],
                      ].map(([label, val], i) => (
                        <div key={label} style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontSize: i === 2 ? 14 : 12, fontWeight: i === 2 ? 700 : 400,
                          color: i === 2 ? '#1d1d1f' : '#6e6e73',
                        }}>
                          <span>{label}</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Payment section — sourced from PAYMENTS table */}
                    {(currentDetail.payments ?? []).length > 0 && (
                      <div style={{ borderTop: '1px solid #f2f2f2', paddingTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                          Payment
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {currentDetail.payments.map((pmt, i) => {
                            const ps = PMT_STYLE[pmt.PAYMENT_STATUS] ?? PMT_STYLE.PENDING
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                                <CreditCard size={14} color="#8e8e93" />
                                <span style={{ color: '#3a3a3c', flex: 1 }}>
                                  {pmt.PAYMENT_METHOD ?? 'Payment'}
                                </span>
                                {pmt.PAYMENT_STATUS && (
                                  <span style={{
                                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                                    color: ps.color, background: ps.bg,
                                  }}>
                                    {pmt.PAYMENT_STATUS}
                                  </span>
                                )}
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, minWidth: 64, textAlign: 'right' }}>
                                  ${Number(pmt.AMOUNT_PAID ?? 0).toFixed(2)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Cancel Order — only for PENDING orders, calls CANCEL_ORDER procedure */}
                    {(currentDetail.ORDER_STATUS ?? currentDetail.STATUS) === 'PENDING' && (
                      <div style={{ borderTop: '1px solid #f2f2f2', paddingTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn-danger"
                          onClick={() => handleCancel(currentDetail.ORDER_ID)}
                          disabled={!!cancelling}
                        >
                          <X size={13} />
                          {cancelling === currentDetail.ORDER_ID ? 'Cancelling…' : 'Cancel Order'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isOpen && !currentDetail && (
                  <div style={{ padding: '14px 18px', color: '#aeaeb2', fontSize: 13 }}>Loading details…</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
