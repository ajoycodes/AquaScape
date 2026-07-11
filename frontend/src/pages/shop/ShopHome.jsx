import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts } from '../../api/client'
import { addToCart } from '../../api/client'
import { useShop } from '../../context/ShopContext'
import ProductCard from '../../components/ProductCard'
import { Fish, Leaf, Box, Zap, Gem, ArrowRight, Waves, Truck, ShieldCheck, HeartHandshake, BadgePercent } from 'lucide-react'

const CATEGORIES = [
  { type: 'FISH',        label: 'Fish',        icon: Fish,   color: '#33607E', bg: '#E8F1F5' },
  { type: 'PLANT',       label: 'Plants',       icon: Leaf,   color: '#2A6B60', bg: '#E6F3F1' },
  { type: 'TANK',        label: 'Tanks',        icon: Box,    color: '#4A5C6E', bg: '#EDF0F4' },
  { type: 'EQUIPMENT',   label: 'Equipment',    icon: Zap,    color: '#61548A', bg: '#F0EDF6' },
  { type: 'DECORATION',  label: 'Decorations',  icon: Gem,    color: '#8A6A24', bg: '#FBF3E4' },
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
    if (!customer) { navigate('/shop/login', { state: { from: '/shop' } }); return }
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

      {/* Promo ribbon */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: 'var(--ink)', color: 'rgba(255,255,255,0.92)',
        borderRadius: 12, padding: '11px 16px', fontSize: 13, fontWeight: 600,
        margin: '-16px 0 -28px',
      }}>
        <BadgePercent size={15} />
        Free shipping on orders over $75 · Live arrival guarantee on all fish
      </div>

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
        borderRadius: 20, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #16150F 0%, #23221A 65%, #2C2A1F 100%)',
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
            background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: '5px 14px',
            fontSize: 12, fontWeight: 600, marginBottom: 16, color: 'rgba(247,245,241,0.88)',
            border: '1px solid rgba(255,255,255,0.16)',
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
            <button
              onClick={() => navigate('/shop/browse')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0 22px', height: 42, borderRadius: 12, border: 'none',
                background: 'white', color: 'var(--ink)', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
              }}>
              Shop Now <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate('/shop/builder')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0 22px', height: 42, borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
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
            style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16150F', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            View all <ArrowRight size={13} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {featured.map(p => (
            <ProductCard key={p.PRODUCT_ID} product={p} onAdd={handleAdd} loading={adding === p.PRODUCT_ID} />
          ))}
        </div>
      </div>

      {/* Builder CTA */}
      <div style={{
        borderRadius: 24, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(120deg, #11312B 0%, #1A4A3F 70%, #205A4B 100%)',
        padding: '48px 56px', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32,
      }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 14px',
            fontSize: 12, fontWeight: 600, marginBottom: 14,
          }}>
            <Waves size={12} /> Aquarium Builder
          </div>
          <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Design your dream tank, piece by piece.
          </h2>
          <p style={{ margin: '12px 0 24px', fontSize: 14.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Pick a tank, add fish, plants and equipment — our compatibility engine checks water type,
            temperature and capacity so everything you choose lives happily together.
          </p>
          <button onClick={() => navigate('/shop/builder')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 22px', height: 40, borderRadius: 9999, border: 'none',
              background: 'white', color: '#1A4A3F', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 700,
            }}>
            Start Building <ArrowRight size={14} />
          </button>
        </div>
        <Waves size={140} style={{ opacity: 0.15, flexShrink: 0 }} />
      </div>

      {/* Value props */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 8 }}>
        {[
          { icon: Truck,          title: 'Fast Delivery',        text: 'Careful packaging, quick dispatch' },
          { icon: ShieldCheck,    title: 'Live Arrival Promise', text: 'Every fish arrives healthy — guaranteed' },
          { icon: HeartHandshake, title: 'Expert Support',       text: 'Real aquarists answer your questions' },
          { icon: BadgePercent,   title: 'Fair Prices',          text: 'Quality livestock without the markup' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} style={{
            background: 'white', borderRadius: 16, padding: '20px 18px',
            border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, background: 'var(--chip-teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color="#2A6B60" strokeWidth={1.9} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1d1d1f' }}>{title}</div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 3, lineHeight: 1.5 }}>{text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
