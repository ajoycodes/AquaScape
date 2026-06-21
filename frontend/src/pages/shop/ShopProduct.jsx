import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProduct, addToCart } from '../../api/client'
import { useShop } from '../../context/ShopContext'
import { ArrowLeft, ShoppingCart, Package, Droplets, Thermometer, Tag, Info } from 'lucide-react'

const TYPE_EMOJI = {
  FISH:  '🐠', PLANT: '🌿', CORAL: '🪸',
  INVERTEBRATE: '🦐', EQUIPMENT: '⚙️', FOOD: '🥣',
  DECOR: '🪨', ACCESSORY: '🔧',
}

export default function ShopProduct() {
  const { id }        = useParams()
  const navigate      = useNavigate()
  const { customer, refreshCart } = useShop()
  const [product,  setProduct]  = useState(null)
  const [qty,      setQty]      = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [adding,   setAdding]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  useEffect(() => {
    setLoading(true)
    getProduct(id)
      .then(r => setProduct(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleAdd = async () => {
    if (!customer) { setError('Please select your account in the header first.'); return }
    setAdding(true)
    setError('')
    try {
      await addToCart(customer.id, { product_id: Number(id), quantity: qty })
      await refreshCart()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e.response?.data?.error ?? e.message)
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '64px 0', color: '#aeaeb2', fontSize: 13 }}>
          Loading…
        </div>
      </div>
    )
  }

  if (error && !product) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ color: '#ff3b30', fontSize: 14, marginBottom: 16 }}>{error}</div>
          <button className="btn-secondary" onClick={() => navigate('/shop/browse')}>
            Back to Browse
          </button>
        </div>
      </div>
    )
  }

  if (!product) return null

  const inStock = Number(product.QTY_ON_HAND ?? 0) > 0
  const stock   = Number(product.QTY_ON_HAND ?? 0)
  const emoji   = TYPE_EMOJI[product.PRODUCT_TYPE] ?? '📦'

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: '#0071e3', fontWeight: 500, padding: 0, alignSelf: 'flex-start',
        }}>
        <ArrowLeft size={15} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>

        {/* Product image placeholder */}
        <div className="card" style={{
          aspectRatio: '1', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 72, lineHeight: 1 }}>{emoji}</div>
          <div style={{ fontSize: 11, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {product.PRODUCT_TYPE}
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {product.PRODUCT_NAME}
            </div>
            {product.SPECIES && (
              <div style={{ fontSize: 13, color: '#8e8e93', marginTop: 4, fontStyle: 'italic' }}>
                {product.SPECIES}
              </div>
            )}
          </div>

          <div style={{ fontSize: 32, fontWeight: 700, color: '#0071e3', letterSpacing: '-0.03em' }}>
            ${Number(product.UNIT_PRICE).toFixed(2)}
          </div>

          {/* Attributes grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              product.WATER_TYPE   && { icon: Droplets,    label: 'Water Type',  value: product.WATER_TYPE },
              product.CARE_LEVEL   && { icon: Tag,         label: 'Care Level',  value: product.CARE_LEVEL },
              product.TEMPERATURE_MIN != null && { icon: Thermometer, label: 'Temperature',
                value: `${product.TEMPERATURE_MIN}–${product.TEMPERATURE_MAX}°C` },
              product.CATEGORY_NAME && { icon: Info,       label: 'Category',    value: product.CATEGORY_NAME },
            ].filter(Boolean).map(({ icon: Icon, label, value }) => (
              <div key={label} style={{
                background: '#f5f5f7', borderRadius: 10, padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <Icon size={15} color="#8e8e93" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', marginTop: 2 }}>
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          {product.DESCRIPTION && (
            <div style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.6 }}>
              {product.DESCRIPTION}
            </div>
          )}

          {/* Stock status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: inStock ? '#34c759' : '#ff3b30',
            }} />
            <span style={{ fontSize: 13, color: inStock ? '#1c7737' : '#c0392b', fontWeight: 500 }}>
              {inStock ? `${stock} in stock` : 'Out of stock'}
            </span>
          </div>

          {/* Qty + Add to cart */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 0,
              border: '1px solid #d1d1d6', borderRadius: 10, overflow: 'hidden',
            }}>
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#3a3a3c' }}>
                −
              </button>
              <span style={{ padding: '10px 12px', fontSize: 14, fontWeight: 600, minWidth: 32, textAlign: 'center', borderLeft: '1px solid #d1d1d6', borderRight: '1px solid #d1d1d6' }}>
                {qty}
              </span>
              <button
                onClick={() => setQty(q => Math.min(stock, q + 1))}
                disabled={!inStock}
                style={{ padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#3a3a3c' }}>
                +
              </button>
            </div>

            <button
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center', gap: 8 }}
              onClick={handleAdd}
              disabled={adding || !inStock}>
              <ShoppingCart size={15} />
              {adding ? 'Adding…' : success ? 'Added!' : 'Add to Cart'}
            </button>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#ff3b30', background: '#fff2f2', borderRadius: 10, padding: '10px 14px' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ fontSize: 13, color: '#1c7737', background: '#e8f8ee', borderRadius: 10, padding: '10px 14px' }}>
              Added {qty}× {product.PRODUCT_NAME} to your cart.
            </div>
          )}

          <button
            className="btn-secondary"
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => navigate('/shop/cart')}>
            <ShoppingCart size={13} /> View Cart
          </button>
        </div>
      </div>
    </div>
  )
}
