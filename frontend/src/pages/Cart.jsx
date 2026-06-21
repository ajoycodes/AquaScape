import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getCart, addToCart, updateCartItem, removeFromCart, clearCart,
  placeOrder, getProducts,
} from '../api/client'
import { Trash2, ShoppingBag, Plus } from 'lucide-react'

export default function Cart() {
  const { customerId } = useParams()
  const navigate       = useNavigate()
  const [cart,     setCart]     = useState({ items: [], subtotal: 0 })
  const [products, setProducts] = useState([])
  const [addForm,  setAddForm]  = useState(false)
  const [placing,  setPlacing]  = useState(false)
  const [error,    setError]    = useState('')
  const [msg,      setMsg]      = useState('')

  const load = () =>
    getCart(customerId)
      .then(r => setCart(r.data))
      .catch(e => setError(e.message))

  useEffect(() => {
    load()
    getProducts().then(r => setProducts(r.data)).catch(() => {})
  }, [customerId])

  const handleUpdate = async (pid, qty) => {
    try {
      await updateCartItem(customerId, pid, { quantity: qty })
      load()
    } catch (e) { setError(e.message) }
  }

  const handleRemove = async (pid) => {
    try {
      await removeFromCart(customerId, pid)
      load()
    } catch (e) { setError(e.message) }
  }

  const handleClear = async () => {
    if (!window.confirm('Clear cart?')) return
    try {
      await clearCart(customerId)
      load()
    } catch (e) { setError(e.message) }
  }

  const handlePlace = async () => {
    setPlacing(true)
    setError('')
    try {
      await placeOrder({
        customer_id: Number(customerId),
        user_id:     1,
      })
      setMsg('Order placed successfully!')
      load()
      setTimeout(() => { setMsg(''); navigate('/orders') }, 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setPlacing(false)
    }
  }

  const items = cart.items ?? []

  return (
    <div className="max-w-2xl space-y-4">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {msg   && <div className="text-green-600 text-sm">{msg}</div>}

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Cart — Customer #{customerId}</h2>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={() => setAddForm(true)}>
            <Plus className="w-4 h-4" /> Add Item
          </button>
          {items.length > 0 && (
            <button className="btn-danger text-xs" onClick={handleClear}>
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {items.length === 0
        ? (
          <div className="card text-center py-14 text-gray-400">
            Cart is empty
          </div>
        )
        : (
          <>
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th text-right">Price</th>
                    <th className="table-th text-center">Qty</th>
                    <th className="table-th text-right">Line Total</th>
                    <th className="table-th text-right">Stock</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item.CART_ITEM_ID} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{item.PRODUCT_NAME}</td>
                      <td className="table-td text-right">${Number(item.UNIT_PRICE).toFixed(2)}</td>
                      <td className="table-td text-center">
                        <input
                          type="number" min="1"
                          defaultValue={item.QUANTITY}
                          onBlur={e => {
                            const v = parseInt(e.target.value)
                            if (v !== item.QUANTITY && v >= 1) handleUpdate(item.PRODUCT_ID, v)
                          }}
                          className="w-16 text-center input py-1"
                        />
                      </td>
                      <td className="table-td text-right">${Number(item.LINE_TOTAL).toFixed(2)}</td>
                      <td className="table-td text-right">
                        <span className={item.STOCK_AVAILABLE >= item.QUANTITY
                          ? 'text-green-600' : 'text-red-600'}>
                          {item.STOCK_AVAILABLE}
                        </span>
                      </td>
                      <td className="table-td text-right">
                        <button onClick={() => handleRemove(item.PRODUCT_ID)}
                          className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">
                  Subtotal: ${Number(cart.subtotal).toFixed(2)}
                </div>
                <button className="btn-primary" disabled={placing} onClick={handlePlace}>
                  <ShoppingBag className="w-4 h-4" />
                  {placing ? 'Placing…' : 'Place Order'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                6% tax will be added automatically at checkout
              </p>
            </div>
          </>
        )
      }

      {addForm && (
        <AddToCartModal
          customerId={customerId}
          products={products}
          onClose={() => setAddForm(false)}
          onAdded={() => { setAddForm(false); load() }}
        />
      )}
    </div>
  )
}

function AddToCartModal({ customerId, products, onClose, onAdded }) {
  const [productId, setProductId] = useState('')
  const [quantity,  setQuantity]  = useState(1)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await addToCart(customerId, { product_id: Number(productId), quantity: Number(quantity) })
      onAdded()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold">Add to Cart</h2>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
            <select className="input" required value={productId}
              onChange={e => setProductId(e.target.value)}>
              <option value="">Choose…</option>
              {products.map(p => (
                <option key={p.PRODUCT_ID} value={p.PRODUCT_ID}>
                  {p.PRODUCT_NAME} — ${Number(p.UNIT_PRICE).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
            <input className="input" type="number" min="1" value={quantity}
              onChange={e => setQuantity(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add to Cart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
