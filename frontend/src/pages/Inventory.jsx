import { useEffect, useState } from 'react'
import { getInventory, getAlerts, resolveAlert, adjustInventory } from '../api/client'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'

const HEALTH_BADGE = {
  HEALTHY:      's-green',
  MODERATE:     's-yellow',
  LOW_STOCK:    's-orange',
  OUT_OF_STOCK: 's-red',
}

export default function Inventory() {
  const [tab,     setTab]     = useState('summary')
  const [rows,    setRows]    = useState([])
  const [alerts,  setAlerts]  = useState([])
  const [adjForm, setAdjForm] = useState(null)
  const [error,   setError]   = useState('')

  const loadSummary = () =>
    getInventory().then(r => setRows(r.data)).catch(e => setError(e.message))

  const loadAlerts = () =>
    getAlerts().then(r => setAlerts(r.data)).catch(e => setError(e.message))

  useEffect(() => {
    if (tab === 'summary') loadSummary()
    if (tab === 'alerts')  loadAlerts()
  }, [tab])

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id, 1)
      loadAlerts()
    } catch (e) { setError(e.message) }
  }

  const handleAdjust = async (data) => {
    try {
      await adjustInventory(data)
      setAdjForm(null)
      loadSummary()
    } catch (e) { setError(e.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}

      {/* Segment control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="segment">
          <button className={`seg-btn${tab === 'summary' ? ' active' : ''}`}
            onClick={() => setTab('summary')}>
            Stock Summary
          </button>
          <button className={`seg-btn${tab === 'alerts' ? ' active' : ''}`}
            onClick={() => setTab('alerts')}>
            Low-Stock Alerts
            {alerts.length > 0 && tab !== 'alerts' && (
              <span style={{
                marginLeft: 6, background: '#ff3b30', color: 'white',
                fontSize: 10, fontWeight: 700, borderRadius: 9999,
                padding: '1px 5px', lineHeight: 1.4,
              }}>
                {alerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Summary tab */}
      {tab === 'summary' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="table-th">Product</th>
                <th className="table-th">Type</th>
                <th className="table-th" style={{ textAlign: 'right' }}>On Hand</th>
                <th className="table-th" style={{ textAlign: 'right' }}>Reserved</th>
                <th className="table-th" style={{ textAlign: 'right' }}>Reorder At</th>
                <th className="table-th">Health</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '40px 0' }}>
                      No inventory records
                    </td>
                  </tr>
                )
                : rows.map(r => (
                  <tr key={r.PRODUCT_ID}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="table-td" style={{ fontWeight: 500 }}>{r.PRODUCT_NAME}</td>
                    <td className="table-td" style={{ color: '#6e6e73', fontSize: 12 }}>{r.PRODUCT_TYPE}</td>
                    <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.QTY_ON_HAND}</td>
                    <td className="table-td" style={{ textAlign: 'right', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>{r.QTY_RESERVED}</td>
                    <td className="table-td" style={{ textAlign: 'right', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>{r.REORDER_LEVEL}</td>
                    <td className="table-td">
                      <span className={`badge ${HEALTH_BADGE[r.STOCK_HEALTH] ?? 's-gray'}`}>
                        {r.STOCK_HEALTH?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-td">
                      <button className="btn-ghost" onClick={() => setAdjForm(r)}>
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.length === 0
            ? (
              <div className="card" style={{ textAlign: 'center', color: '#aeaeb2', padding: '48px 0', fontSize: 13 }}>
                No open alerts — all stock levels look good.
              </div>
            )
            : alerts.map(a => (
              <div key={a.ALERT_ID} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: '#fff0d9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <AlertTriangle size={16} color="#ff9500" strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{a.PRODUCT_NAME}</div>
                  <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>
                    On hand: <strong>{a.QTY_ON_HAND}</strong> · Reorder at: <strong>{a.REORDER_LEVEL}</strong>
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => handleResolve(a.ALERT_ID)}>
                  <CheckCircle size={14} /> Resolve
                </button>
              </div>
            ))
          }
        </div>
      )}

      {adjForm && (
        <AdjustModal
          product={adjForm}
          onClose={() => setAdjForm(null)}
          onSubmit={handleAdjust}
        />
      )}
    </div>
  )
}

function AdjustModal({ product, onClose, onSubmit }) {
  const [delta,  setDelta]  = useState('')
  const [type,   setType]   = useState('ADJUSTMENT')
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit({ product_id: product.PRODUCT_ID, delta: Number(delta), move_type: type, notes, user_id: 1 })
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>
            Adjust Stock
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: '#6e6e73' }}>
              Product: <strong style={{ color: '#1d1d1f' }}>{product.PRODUCT_NAME}</strong>
              {' '}· Current stock: <strong style={{ color: '#1d1d1f' }}>{product.QTY_ON_HAND}</strong>
            </div>
            {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
            <div>
              <label className="field-label">Delta (+ to add, − to remove)</label>
              <input className="input" type="number" required value={delta}
                onChange={e => setDelta(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Move Type</label>
              <select className="input" value={type} onChange={e => setType(e.target.value)}>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
                <option value="RETURN">RETURN</option>
                <option value="WRITE_OFF">WRITE_OFF</option>
                <option value="PURCHASE">PURCHASE</option>
              </select>
            </div>
            <div>
              <label className="field-label">Notes</label>
              <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
