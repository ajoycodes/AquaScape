import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getProducts, addToCart } from '../../api/client'
import { useShop } from '../../context/ShopContext'
import { Search, SlidersHorizontal } from 'lucide-react'
import ProductCard from '../../components/ProductCard'

const TYPE_CONFIG = {
  ALL:         { label: 'All',         color: '#16150F' },
  FISH:        { label: 'Fish',        color: '#33607E' },
  PLANT:       { label: 'Plants',      color: '#2A6B60' },
  TANK:        { label: 'Tanks',       color: '#4A5C6E' },
  EQUIPMENT:   { label: 'Equipment',   color: '#61548A' },
  DECORATION:  { label: 'Decorations', color: '#8A6A24' },
}

const SORT_OPTIONS = [
  { value: 'name-asc',    label: 'Name A–Z' },
  { value: 'name-desc',   label: 'Name Z–A' },
  { value: 'price-asc',   label: 'Price: Low to High' },
  { value: 'price-desc',  label: 'Price: High to Low' },
  { value: 'stock-desc',  label: 'Most in Stock' },
]

export default function ShopBrowse() {
  const navigate = useNavigate()
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
    if (!customer) { setToast('Please sign in first'); setTimeout(() => setToast(''), 2500); return }
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
                padding: '7px 15px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                background: activeType === type ? cfg.color : '#EFEDE6',
                color: activeType === type ? 'white' : 'var(--text-2)',
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
          {filtered.map(p => (
            <ProductCard key={p.PRODUCT_ID} product={p} onAdd={handleAdd}
              onOpen={() => navigate(`/shop/product/${p.PRODUCT_ID}`)}
              loading={adding === p.PRODUCT_ID} />
          ))}
        </div>
      )}
    </div>
  )
}
