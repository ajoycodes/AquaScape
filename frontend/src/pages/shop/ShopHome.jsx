import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts } from '../../api/client'
import { addToCart } from '../../api/client'
import { useShop } from '../../context/ShopContext'
import { Fish, Leaf, Box, Zap, Gem, ArrowRight, ShoppingCart, Waves } from 'lucide-react'

const CATEGORIES = [
  { type: 'FISH',        label: 'Fish',        icon: Fish,   color: '#0071e3', bg: '#e8f2ff' },
  { type: 'PLANT',       label: 'Plants',       icon: Leaf,   color: '#34c759', bg: '#e8f8ee' },
  { type: 'TANK',        label: 'Tanks',        icon: Box,    color: '#32ade6', bg: '#e5f5fd' },
  { type: 'EQUIPMENT',   label: 'Equipment',    icon: Zap,    color: '#bf5af2', bg: '#f5eaff' },
  { type: 'DECORATION',  label: 'Decorations',  icon: Gem,    color: '#ff9500', bg: '#fff4e5' },
]

export default function ShopHome() {
  const navigate = useNavigate()
  const { customer, refreshCart } = useShop()
  const [featured, setFeatured] = useState([])
  const [adding,   setAdding]   = useState(null)
  const [toast,    setToast]    = useState('')

  useEffect(() => {
    getProducts({}).then(r => {
      const shuffled = [...r.data].sort(() => Math.random() - 0.5)
      setFeatured(shuffled.slice(0, 6))
    }).catch(() => {})
  }, [])

  const handleAdd = async (product) => {
    if (!customer) { navigate('/shop/cart'); return }
    setAdding(product.PRODUCT_ID)
    try {
      await addToCart(customer.id, { product_id: product.PRODUCT_ID, quantity: 1 })
      await refreshCart()
      setToast(`${product.PRODUCT_NAME} added to cart`)
      setTimeout(() => setToast(''), 2500)
    } catch (e) {
      setToast(e.response?.data?.error ?? 'Could not add item')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setAdding(null)
    }
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 48 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#1d1d1f', color: 'white', borderRadius: 12,
          padding: '12px 20px', fontSize: 13, fontWeight: 500, zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}>{toast}</div>
      )}

      {/* Hero */}
      <div style={{
        borderRadius: 24, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #0a1628 0%, #0d2b52 50%, #0a3d6e 100%)',
        padding: '60px 56px', color: 'white',
        minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        {/* decorative circles */}
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 120 + i * 80, height: 120 + i * 80,
            borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)',
            right: 60 - i * 20, top: '50%', transform: 'translateY(-50%)',
          }} />
        ))}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,113,227,0.4)', borderRadius: 20, padding: '4px 14px',
            fontSize: 12, fontWeight: 600, marginBottom: 16, color: '#7eb8ff',
            border: '1px solid rgba(0,113,227,0.5)',
          }}>
            <Fish size={12} /> New arrivals weekly
          </div>
          <h1 style={{ margin: 0, fontSize: 42, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Your perfect<br />aquarium awaits.
          </h1>
          <p style={{ margin: '14px 0 28px', fontSize: 16, color: 'rgba(255,255,255,0.65)', maxWidth: 400 }}>
            Discover premium fish, plants, tanks, and equipment — all in one place.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-primary" onClick={() => navigate('/shop/browse')}>
              Shop Now <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate('/shop/builder')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 20px', height: 38, borderRadius: 9999,
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                transition: 'background 0.15s',
              }}>
              <Waves size={14} /> Build Aquarium
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.025em' }}>
            Shop by Category
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {CATEGORIES.map(({ type, label, icon: Icon, color, bg }) => (
            <button key={type}
              onClick={() => navigate(`/shop/browse?type=${type}`)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                padding: '24px 16px', borderRadius: 18, border: '1px solid rgba(0,0,0,0.04)',
                background: 'white', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
              }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={24} color={color} strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured products */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.025em' }}>
            Featured Products
          </h2>
          <button onClick={() => navigate('/shop/browse')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            View all <ArrowRight size={13} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {featured.map(p => (
            <ProductCard key={p.PRODUCT_ID} product={p} onAdd={handleAdd} loading={adding === p.PRODUCT_ID} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product: p, onAdd, loading }) {
  const TYPE_COLOR = { FISH: '#0071e3', PLANT: '#34c759', TANK: '#32ade6', EQUIPMENT: '#bf5af2', DECORATION: '#ff9500' }
  const color = TYPE_COLOR[p.PRODUCT_TYPE] ?? '#8e8e93'
  const inStock = (p.QTY_ON_HAND ?? 0) > 0

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Color band */}
      <div style={{ height: 6, background: color }} />
      <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            {p.PRODUCT_TYPE}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3 }}>{p.PRODUCT_NAME}</div>
          {p.DESCRIPTION && (
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 4, lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {p.DESCRIPTION}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>
              ${Number(p.UNIT_PRICE).toFixed(2)}
            </div>
            <div style={{ fontSize: 11, color: inStock ? '#34c759' : '#ff3b30', fontWeight: 500 }}>
              {inStock ? `${p.QTY_ON_HAND} in stock` : 'Out of stock'}
            </div>
          </div>
          <button
            onClick={() => onAdd(p)}
            disabled={!inStock || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 34, borderRadius: 9999, border: 'none',
              background: !inStock ? '#e5e5ea' : '#0071e3',
              color: !inStock ? '#aeaeb2' : 'white',
              cursor: !inStock ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600,
              transition: 'background 0.15s, box-shadow 0.15s, opacity 0.12s',
              opacity: loading ? 0.6 : 1,
              boxShadow: inStock ? '0 2px 8px rgba(0,113,227,0.38)' : 'none',
              flexShrink: 0,
            }}>
            <ShoppingCart size={13} />
            {loading ? '…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
