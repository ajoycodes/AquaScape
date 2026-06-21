import { useEffect, useState } from 'react'
import { getOrders, getOrder, updateStatus, cancelOrder } from '../api/client'
import { Eye } from 'lucide-react'

const STATUS_BADGE = {
  PENDING:    's-yellow',
  CONFIRMED:  's-blue',
  PROCESSING: 's-purple',
  SHIPPED:    's-cyan',
  DELIVERED:  's-green',
  CANCELLED:  's-red',
  REFUNDED:   's-gray',
}

const NEXT_STATUS = {
  PENDING:    'CONFIRMED',
  CONFIRMED:  'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED:    'DELIVERED',
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [detail, setDetail] = useState(null)
  const [filter, setFilter] = useState('')
  const [error,  setError]  = useState('')

  const load = () =>
    getOrders(filter ? { status: filter } : {})
      .then(r => setOrders(r.data))
      .catch(e => setError(e.message))

  useEffect(() => { load() }, [filter])

  const openDetail = (id) =>
    getOrder(id)
      .then(r => setDetail(r.data))
      .catch(e => setError(e.message))

  const advance = async (order) => {
    const next = NEXT_STATUS[order.STATUS]
    if (!next) return
    try {
      await updateStatus(order.ORDER_ID, { status: next, notes: 'Status updated via UI' })
      load()
      if (detail?.ORDER_ID === order.ORDER_ID) openDetail(order.ORDER_ID)
    } catch (e) { setError(e.message) }
  }

  const cancel = async (id) => {
    if (!window.confirm('Cancel this order?')) return
    try {
      await cancelOrder(id, { reason: 'Cancelled by admin', user_id: 1 })
      load()
      setDetail(null)
    } catch (e) { setError(e.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}

      {/* Filter */}
      <div>
        <select className="input" style={{ width: 180 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_BADGE).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: detail ? '1fr 1fr' : '1fr', gap: 14 }}>

        {/* List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="table-th">Order #</th>
                <th className="table-th">Customer</th>
                <th className="table-th" style={{ textAlign: 'right' }}>Total</th>
                <th className="table-th">Status</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0
                ? (
                  <tr>
                    <td colSpan={5} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '40px 0' }}>
                      No orders found
                    </td>
                  </tr>
                )
                : orders.map(o => (
                  <tr key={o.ORDER_ID}
                    style={{
                      cursor: 'pointer',
                      background: detail?.ORDER_ID === o.ORDER_ID ? 'rgba(0,113,227,0.06)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (detail?.ORDER_ID !== o.ORDER_ID)
                        e.currentTarget.style.background = '#f9f9fb'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background =
                        detail?.ORDER_ID === o.ORDER_ID ? 'rgba(0,113,227,0.06)' : 'transparent'
                    }}
                    onClick={() => openDetail(o.ORDER_ID)}>
                    <td className="table-td" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0071e3' }}>
                      #{o.ORDER_ID}
                    </td>
                    <td className="table-td">{o.CUSTOMER_NAME ?? o.CUSTOMER_ID}</td>
                    <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${Number(o.TOTAL_AMOUNT).toFixed(2)}
                    </td>
                    <td className="table-td">
                      <span className={`badge ${STATUS_BADGE[o.STATUS] ?? 's-gray'}`}>{o.STATUS}</span>
                    </td>
                    <td className="table-td" style={{ width: 36 }}>
                      <Eye size={14} color="#aeaeb2" />
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {detail && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.025em' }}>
                  Order #{detail.ORDER_ID}
                </div>
                <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 3 }}>{detail.CREATED_AT}</div>
              </div>
              <span className={`badge ${STATUS_BADGE[detail.STATUS] ?? 's-gray'}`}>{detail.STATUS}</span>
            </div>

            {/* Items */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Items
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(detail.items ?? []).map(item => (
                  <div key={item.ORDER_ITEM_ID}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>{item.PRODUCT_NAME} <span style={{ color: '#8e8e93' }}>×{item.QUANTITY}</span></span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#3a3a3c' }}>
                      ${Number(item.LINE_TOTAL).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div style={{ borderTop: '1px solid #f2f2f2', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Subtotal', `$${Number(detail.SUBTOTAL).toFixed(2)}`],
                ['Tax',      `$${Number(detail.TAX_AMOUNT ?? 0).toFixed(2)}`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6e6e73' }}>{label}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                <span>Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>${Number(detail.TOTAL_AMOUNT).toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              {NEXT_STATUS[detail.STATUS] && (
                <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => advance(detail)}>
                  → {NEXT_STATUS[detail.STATUS]}
                </button>
              )}
              {['PENDING', 'CONFIRMED', 'PROCESSING'].includes(detail.STATUS) && (
                <button className="btn-danger" style={{ fontSize: 12 }} onClick={() => cancel(detail.ORDER_ID)}>
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
