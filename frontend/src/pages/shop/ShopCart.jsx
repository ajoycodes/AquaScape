import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCart, updateCartItem, removeFromCart, clearCart, placeOrder } from '../../api/client'
import { useShop } from '../../context/ShopContext'
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Package } from 'lucide-react'

const TAX_RATE = 0.06

export default function ShopCart() {
  const navigate = useNavigate()
  const { customer, refreshCart } = useShop()
  const [items,       setItems]       = useState([])
  const [subtotal,    setSubtotal]    = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [placing,     setPlacing]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(null)
  const [shipAddr,    setShipAddr]    = useState('')

  const load = async () => {
    if (!customer) return
    setLoading(true)
    try {
      const r = await getCart(customer.id)
      setItems(r.data.items ?? [])
      setSubtotal(Number(r.data.subtotal ?? 0))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [customer])

  const updateQty = async (productId, delta, current) => {
    const newQty = current + delta
    if (newQty < 1) return
    try {
      await updateCartItem(customer.id, productId, { quantity: newQty })
      await load()
      await refreshCart()
    } catch (e) { setError(e.response?.data?.error ?? e.message) }
  }

  const remove = async (productId) => {
    try {
      await removeFromCart(customer.id, productId)
      await load()
      await refreshCart()
    } catch (e) { setError(e.message) }
  }

  const handleOrder = async () => {
    if (!customer) return
    if (!shipAddr.trim()) { setError('Please enter a shipping address.'); return }
    setPlacing(true)
    setError('')
    try {
      const r = await placeOrder({ customer_id: customer.id, shipping_addr: shipAddr.trim(), user_id: 1 })
      await refreshCart()
      setSuccess(r.data.order_id ?? r.data.ORDER_ID)
      setItems([])
      setSubtotal(0)
    } catch (e) {
      setError(e.response?.data?.error ?? e.message)
    } finally {
      setPlacing(false)
    }
  }

  const tax   = subtotal * TAX_RATE
  const total = subtotal + tax

  if (!customer) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '64px 0' }}>
          <ShoppingCart size={40} color="#aeaeb2" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>Select an account to view cart</div>
          <div style={{ fontSize: 13, color: '#8e8e93' }}>Choose your account from the header to manage your cart.</div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '56px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#e8f8ee',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Package size={28} color="#34c759" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 6 }}>Order Placed!</div>
            <div style={{ fontSize: 13, color: '#8e8e93' }}>
              Your order <span style={{ fontFamily: 'monospace', color: '#0071e3', fontWeight: 600 }}>#{success}</span> has been confirmed.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn-secondary" onClick={() => navigate('/shop/browse')}>Keep Shopping</button>
            <button className="btn-primary" onClick={() => navigate('/shop/orders')}>
              View Orders <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em' }}>Your Cart</h1>

      {error && <div style={{ color: '#ff3b30', fontSize: 13, background: '#fff2f2', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0', color: '#aeaeb2', fontSize: 13 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <ShoppingCart size={40} color="#aeaeb2" />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#3a3a3c' }}>Your cart is empty</div>
          <button className="btn-primary" onClick={() => navigate('/shop/browse')}>Browse Products</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

          {/* Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <div key={item.CART_ITEM_ID} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: '#f5f5f7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Package size={20} color="#8e8e93" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{item.PRODUCT_NAME}</div>
                  <div style={{ fontSize: 12, color: '#8e8e93' }}>${Number(item.UNIT_PRICE).toFixed(2)} each</div>
                  {item.STOCK_AVAILABLE < item.QUANTITY && (
                    <div style={{ fontSize: 11, color: '#ff9500', marginTop: 2 }}>
                      Only {item.STOCK_AVAILABLE} available
                    </div>
                  )}
                </div>

                {/* Qty stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => updateQty(item.PRODUCT_ID, -1, item.QUANTITY)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: '1px solid #d1d1d6',
                      background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <Minus size={12} color="#3a3a3c" />
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', minWidth: 20, textAlign: 'center' }}>
                    {item.QUANTITY}
                  </span>
                  <button onClick={() => updateQty(item.PRODUCT_ID, 1, item.QUANTITY)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: '1px solid #d1d1d6',
                      background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <Plus size={12} color="#3a3a3c" />
                  </button>
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', minWidth: 64, textAlign: 'right' }}>
                  ${Number(item.LINE_TOTAL).toFixed(2)}
                </div>

                <button onClick={() => remove(item.PRODUCT_ID)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#aeaeb2' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 76 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>Order Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Subtotal', `$${subtotal.toFixed(2)}`],
                ['Tax (6%)', `$${tax.toFixed(2)}`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6e6e73' }}>{label}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #f2f2f2', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping address */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6e6e73', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Shipping Address
              </label>
              <textarea
                value={shipAddr}
                onChange={e => setShipAddr(e.target.value)}
                placeholder="123 Main St, City, State 00000"
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none',
                  background: '#f5f5f7', border: '1px solid #d1d1d6',
                  borderRadius: 10, padding: '8px 10px', fontSize: 13,
                  color: '#1d1d1f', outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}
              onClick={handleOrder} disabled={placing || items.length === 0 || !shipAddr.trim()}>
              {placing ? 'Placing order…' : 'Place Order'}
              {!placing && <ArrowRight size={14} />}
            </button>
            <div style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'center' }}>
              Free shipping on all orders.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
