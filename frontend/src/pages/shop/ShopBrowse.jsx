import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getProducts, addToCart } from '../../api/client'
import { useShop } from '../../context/ShopContext'
import { Search, ShoppingCart, Fish, Leaf, Box, Zap, Gem, SlidersHorizontal } from 'lucide-react'

const TYPE_CONFIG = {
  ALL:         { label: 'All',         color: '#1d1d1f', bg: '#e5e5ea' },
  FISH:        { label: 'Fish',        color: '#0071e3', bg: '#e8f2ff' },
  PLANT:       { label: 'Plants',      color: '#34c759', bg: '#e8f8ee' },
  TANK:        { label: 'Tanks',       color: '#32ade6', bg: '#e5f5fd' },
  EQUIPMENT:   { label: 'Equipment',   color: '#bf5af2', bg: '#f5eaff' },
  DECORATION:  { label: 'Decorations', color: '#ff9500', bg: '#fff4e5' },
}

const SORT_OPTIONS = [
  { value: 'name-asc',    label: 'Name A–Z' },
  { value: 'name-desc',   label: 'Name Z–A' },
  { value: 'price-asc',   label: 'Price: Low to High' },
  { value: 'price-desc',  label: 'Price: High to Low' },
  { value: 'stock-desc',  label: 'Most in Stock' },
]

export default function ShopBrowse() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { customer, refreshCart } = useShop()
  const [products,  setProducts]  = useState([])
  const [search,    setSearch]    = useState('')
  const [sort,      setSort]      = useState('name-asc')
  const [adding,    setAdding]    = useState(null)
  const [toast,     setToast]     = useState('')

  const activeType = searchParams.get('type') ?? 'ALL'

  const load = useCallback(() => {
    const params = activeType !== 'ALL' ? { type: activeType } : {}
    getProducts(params).then(r => setProducts(r.data)).catch(() => {})
  }, [activeType])

  useEffect(() => { load() }, [load])

  const handleAdd = async (product) => {
    if (!customer) { setToast('Please select an account first'); setTimeout(() => setToast(''), 2500); return }
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

  let filtered = products.filter(p =>
    p.PRODUCT_NAME.toLowerCase().includes(search.toLowerCase()) ||
    (p.DESCRIPTION ?? '').toLowerCase().includes(search.toLowerCase())
  )

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'name-asc')    return a.PRODUCT_NAME.localeCompare(b.PRODUCT_NAME)
    if (sort === 'name-desc')   return b.PRODUCT_NAME.localeCompare(a.PRODUCT_NAME)
    if (sort === 'price-asc')   return Number(a.UNIT_PRICE) - Number(b.UNIT_PRICE)
    if (sort === 'price-desc')  return Number(b.UNIT_PRICE) - Number(a.UNIT_PRICE)
    if (sort === 'stock-desc')  return (b.QTY_ON_HAND ?? 0) - (a.QTY_ON_HAND ?? 0)
    return 0
  })

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#1d1d1f', color: 'white', borderRadius: 12,
          padding: '12px 20px', fontSize: 13, fontWeight: 500, zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}>{toast}</div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em' }}>Browse Products</h1>
        <p style={{ margin: 0, fontSize: 14, color: '#8e8e93' }}>{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <button key={type}
              onClick={() => setSearchParams(type === 'ALL' ? {} : { type })}
              style={{
                padding: '6px 14px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                background: activeType === type ? cfg.color : '#e5e5ea',
                color: activeType === type ? 'white' : '#6e6e73',
              }}>
              {cfg.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aeaeb2' }} />
          <input className="input" style={{ paddingLeft: 32, width: 200 }} placeholder="Search…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SlidersHorizontal size={13} color="#8e8e93" />
          <select className="input" style={{ width: 180, padding: '7px 10px' }}
            value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 0', color: '#aeaeb2', fontSize: 14 }}>
          No products found
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {filtered.map(p => (
            <BrowseCard key={p.PRODUCT_ID} product={p} onAdd={handleAdd} loading={adding === p.PRODUCT_ID} />
          ))}
        </div>
      )}
    </div>
  )
}

function BrowseCard({ product: p, onAdd, loading }) {
  const navigate    = useNavigate()
  const TYPE_COLOR  = { FISH: '#0071e3', PLANT: '#34c759', TANK: '#32ade6', EQUIPMENT: '#bf5af2', DECORATION: '#ff9500' }
  const color   = TYPE_COLOR[p.PRODUCT_TYPE] ?? '#8e8e93'
  const inStock = (p.QTY_ON_HAND ?? 0) > 0

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = ''
      }}>
      {/* Color band top */}
      <div style={{ height: 4, background: color }} />

      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
        <div>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 700, color,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5,
          }}>
            {p.PRODUCT_TYPE}
          </span>
          <div
            onClick={() => navigate(`/shop/product/${p.PRODUCT_ID}`)}
            style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3, marginBottom: 4, cursor: 'pointer' }}
            title="View details">
            {p.PRODUCT_NAME}
          </div>
          {p.DESCRIPTION && (
            <div style={{
              fontSize: 11, color: '#8e8e93', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {p.DESCRIPTION}
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f' }}>
              ${Number(p.UNIT_PRICE).toFixed(2)}
            </span>
            <span style={{ fontSize: 11, color: inStock ? '#34c759' : '#ff3b30', fontWeight: 500 }}>
              {inStock ? `${p.QTY_ON_HAND} avail.` : 'Out of stock'}
            </span>
          </div>
          <button
            onClick={() => onAdd(p)}
            disabled={!inStock || loading}
            style={{
              width: '100%', height: 36, borderRadius: 9999, border: 'none',
              background: !inStock ? '#e5e5ea' : '#0071e3',
              color: !inStock ? '#aeaeb2' : 'white',
              cursor: !inStock ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: loading ? 0.6 : 1,
              transition: 'background 0.15s, box-shadow 0.15s, opacity 0.12s',
              boxShadow: inStock ? '0 2px 8px rgba(0,113,227,0.38)' : 'none',
            }}>
            <ShoppingCart size={12} />
            {loading ? 'Adding…' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
