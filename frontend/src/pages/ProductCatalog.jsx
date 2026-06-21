import { useEffect, useState } from 'react'
import { getProducts, createProduct } from '../api/client'
import { Plus, Search, X } from 'lucide-react'

const TYPE_BADGE = {
  FISH:       's-blue',
  PLANT:      's-green',
  TANK:       's-cyan',
  EQUIPMENT:  's-purple',
  DECORATION: 's-orange',
}

export default function ProductCatalog() {
  const [products,   setProducts]  = useState([])
  const [search,     setSearch]    = useState('')
  const [typeFilter, setType]      = useState('')
  const [showForm,   setShowForm]  = useState(false)
  const [error,      setError]     = useState('')

  const load = () =>
    getProducts({ search, type: typeFilter })
      .then(r => setProducts(r.data))
      .catch(e => setError(e.message))

  useEffect(() => { load() }, [search, typeFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aeaeb2' }} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input" style={{ width: 160 }} value={typeFilter} onChange={e => setType(e.target.value)}>
          <option value="">All types</option>
          {Object.keys(TYPE_BADGE).map(t => (
            <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Type</th>
              <th className="table-th">Category</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Unit Price</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Cost</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Stock</th>
              <th className="table-th">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '40px 0' }}>
                    No products found
                  </td>
                </tr>
              )
              : products.map(p => (
                <tr key={p.PRODUCT_ID} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="table-td" style={{ fontWeight: 500 }}>{p.PRODUCT_NAME}</td>
                  <td className="table-td">
                    <span className={`badge ${TYPE_BADGE[p.PRODUCT_TYPE] ?? 's-gray'}`}>
                      {p.PRODUCT_TYPE}
                    </span>
                  </td>
                  <td className="table-td" style={{ color: '#6e6e73' }}>{p.CATEGORY_NAME}</td>
                  <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    ${Number(p.UNIT_PRICE).toFixed(2)}
                  </td>
                  <td className="table-td" style={{ textAlign: 'right', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>
                    ${Number(p.COST_PRICE ?? 0).toFixed(2)}
                  </td>
                  <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {p.QTY_ON_HAND ?? 0}
                  </td>
                  <td className="table-td">
                    <span className={`badge ${p.IS_ACTIVE === 1 ? 's-green' : 's-red'}`}>
                      {p.IS_ACTIVE === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: '#aeaeb2' }}>
        {products.length} product{products.length !== 1 ? 's' : ''}
      </div>

      {showForm && (
        <ProductModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function ProductModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    product_name: '', product_type: 'FISH', description: '',
    unit_price: '', cost_price: '', category_id: 1,
  })
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createProduct(form)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Add Product</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
            <div>
              <label className="field-label">Product Name</label>
              <input className="input" required value={form.product_name}
                onChange={e => set('product_name', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Type</label>
                <select className="input" value={form.product_type}
                  onChange={e => set('product_type', e.target.value)}>
                  <option>FISH</option>
                  <option>PLANT</option>
                  <option>TANK</option>
                  <option>EQUIPMENT</option>
                  <option>DECORATION</option>
                </select>
              </div>
              <div>
                <label className="field-label">Category ID</label>
                <input className="input" type="number" min="1" value={form.category_id}
                  onChange={e => set('category_id', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Unit Price ($)</label>
                <input className="input" type="number" step="0.01" min="0" required
                  value={form.unit_price} onChange={e => set('unit_price', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Cost Price ($)</label>
                <input className="input" type="number" step="0.01" min="0"
                  value={form.cost_price} onChange={e => set('cost_price', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea className="input" rows={2} value={form.description}
                onChange={e => set('description', e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
