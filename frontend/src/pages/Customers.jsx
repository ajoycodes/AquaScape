import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, createCustomer } from '../api/client'
import { Plus, Search, ShoppingCart, X } from 'lucide-react'

const TIER_BADGE = {
  VIP:        's-yellow',
  REGULAR:    's-blue',
  OCCASIONAL: 's-gray',
}

export default function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [search,    setSearch]    = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [error,     setError]     = useState('')

  const load = () =>
    getCustomers(search ? { search } : {})
      .then(r => setCustomers(r.data))
      .catch(e => setError(e.message))

  useEffect(() => { load() }, [search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aeaeb2' }} />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search customers…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> New Customer
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Email</th>
              <th className="table-th">Phone</th>
              <th className="table-th">Tier</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0
              ? (
                <tr>
                  <td colSpan={5} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '40px 0' }}>
                    No customers found
                  </td>
                </tr>
              )
              : customers.map(c => (
                <tr key={c.CUSTOMER_ID}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="table-td" style={{ fontWeight: 500 }}>{c.FIRST_NAME} {c.LAST_NAME}</td>
                  <td className="table-td" style={{ color: '#6e6e73' }}>{c.EMAIL}</td>
                  <td className="table-td" style={{ color: '#6e6e73' }}>{c.PHONE ?? '—'}</td>
                  <td className="table-td">
                    <span className={`badge ${TIER_BADGE[c.CUSTOMER_TIER] ?? 's-gray'}`}>
                      {c.CUSTOMER_TIER ?? 'NEW'}
                    </span>
                  </td>
                  <td className="table-td">
                    <button className="btn-ghost" onClick={() => navigate(`/cart/${c.CUSTOMER_ID}`)}>
                      <ShoppingCart size={13} /> Cart
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: '#aeaeb2' }}>
        {customers.length} customer{customers.length !== 1 ? 's' : ''}
      </div>

      {showForm && (
        <CustomerModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function CustomerModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', address: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createCustomer(form)
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
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>New Customer</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">First Name</label>
                <input className="input" required value={form.first_name}
                  onChange={e => set('first_name', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Last Name</label>
                <input className="input" required value={form.last_name}
                  onChange={e => set('last_name', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field-label">Email</label>
              <input className="input" type="email" required value={form.email}
                onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input className="input" value={form.phone}
                onChange={e => set('phone', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="field-label">Address</label>
              <textarea className="input" rows={2} value={form.address}
                onChange={e => set('address', e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
