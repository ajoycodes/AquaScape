import { useEffect, useState } from 'react'
import {
  getSetups, getSetup, createSetup, addSetupItem, removeSetupItem,
  validateSetup, getSetupPrice, saveSetup, getTanks, getProducts, getCustomers,
} from '../api/client'
import { Plus, Trash2, CheckCircle, Save, X, Droplets, AlertTriangle } from 'lucide-react'

/* Extract the first meaningful sentence from an Oracle error string */
function parseOraError(err) {
  const raw = err.response?.data?.error ?? err.message ?? 'Something went wrong.'
  // ORA-20xxx = user-defined PL/SQL errors — these have the real message
  const m = raw.match(/ORA-20\d{3}:\s*(.*?)(?:\s*ORA-\d{5}:|$)/s)
  if (m) {
    return m[1]
      .replace(/^DB TRIGGER BLOCKED:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  // Fallback: first ORA line
  const fb = raw.match(/ORA-\d{5}:\s*(.*?)(?:\s*ORA-\d{5}:|$)/s)
  if (fb) return fb[1].replace(/\s+/g, ' ').trim()
  return raw
}

const WATER_COLOR = {
  FRESHWATER: { color: '#1c7737', bg: '#e8f8ee' },
  SALTWATER:  { color: '#0071e3', bg: '#e3f0fd' },
  BRACKISH:   { color: '#b45309', bg: '#fff7ed' },
}

export default function AquariumBuilder() {
  const [customers, setCustomers] = useState([])
  const [custId,    setCustId]    = useState('')
  const [setups,    setSetups]    = useState([])
  const [activeId,  setActiveId]  = useState(null)
  const [setup,     setSetup]     = useState(null)
  const [addForm,   setAddForm]   = useState(false)
  const [newSetup,  setNewSetup]  = useState(false)
  const [validation,setVal]       = useState(null)
  const [price,     setPrice]     = useState(null)
  const [error,     setError]     = useState('')
  const [msg,       setMsg]       = useState('')

  useEffect(() => {
    getCustomers().then(r => setCustomers(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (custId) {
      getSetups(custId).then(r => setSetups(r.data)).catch(e => setError(parseOraError(e)))
    } else {
      setSetups([])
      setActiveId(null)
      setSetup(null)
    }
  }, [custId])

  const loadSetup = (id) => {
    setActiveId(id)
    setSetup(null)
    setVal(null)
    setPrice(null)
    setError('')
    getSetup(id)
      .then(r => setSetup(r.data))
      .catch(e => {
        setActiveId(null)
        setError(parseOraError(e))
      })
  }

  const handleRemove = async (pid) => {
    try { await removeSetupItem(activeId, pid); loadSetup(activeId) }
    catch (e) { setError(parseOraError(e)) }
  }

  const handleValidate = async () => {
    try { const r = await validateSetup(activeId); setVal(r.data) }
    catch (e) { setError(parseOraError(e)) }
  }

  const handlePrice = async () => {
    try { const r = await getSetupPrice(activeId); setPrice(r.data.total_price) }
    catch (e) { setError(parseOraError(e)) }
  }

  const handleSave = async () => {
    try {
      await saveSetup(activeId, { customer_id: custId, is_public: 0 })
      setMsg('Saved!')
      loadSetup(activeId)
      setTimeout(() => setMsg(''), 3000)
    } catch (e) { setError(parseOraError(e)) }
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%', minHeight: 0 }}>

      {/* ── Left rail ────────────────────────────────── */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Customer */}
        <div>
          <label className="field-label">Customer</label>
          <select className="input" value={custId} onChange={e => setCustId(e.target.value)}>
            <option value="">Select customer…</option>
            {customers.map(c => (
              <option key={c.CUSTOMER_ID} value={c.CUSTOMER_ID}>
                {c.FIRST_NAME} {c.LAST_NAME}
              </option>
            ))}
          </select>
        </div>

        {/* Setup list */}
        {custId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}
              onClick={() => setNewSetup(true)}>
              <Plus size={14} /> New Setup
            </button>

            {setups.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '24px 0' }}>
                No setups yet
              </div>
            ) : (
              setups.map(s => {
                const wc = WATER_COLOR[s.WATER_TYPE] ?? { color: '#6e6e73', bg: '#f5f5f7' }
                const active = activeId === s.SETUP_ID
                return (
                  <button key={s.SETUP_ID}
                    onClick={() => loadSetup(s.SETUP_ID)}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: active ? 'rgba(0,113,227,0.06)' : 'white',
                      border: `1px solid ${active ? '#0071e3' : '#e5e5ea'}`,
                      borderRadius: 12, padding: '12px 14px',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = '#c7c7cc' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#e5e5ea' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>
                      {s.SETUP_NAME || 'Untitled Setup'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                        color: wc.color, background: wc.bg,
                        borderRadius: 6, padding: '2px 6px',
                      }}>
                        {s.WATER_TYPE}
                      </span>
                      <span style={{ fontSize: 11, color: '#aeaeb2' }}>{s.STATUS}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* Errors / success */}
        {error && (
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            background: '#fff2f2', border: '1px solid #ffd5d2',
            borderRadius: 10, padding: '10px 12px',
          }}>
            <AlertTriangle size={14} color="#ff3b30" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: '#c0392b', lineHeight: 1.5, flex: 1 }}>{error}</span>
            <button onClick={() => setError('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3b30', padding: 0, flexShrink: 0, lineHeight: 1 }}>
              <X size={13} />
            </button>
          </div>
        )}
        {msg && (
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            background: '#e8f8ee', border: '1px solid #b8f0ca',
            borderRadius: 10, padding: '10px 12px',
          }}>
            <CheckCircle size={14} color="#34c759" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#1c7737', flex: 1 }}>{msg}</span>
          </div>
        )}
      </div>

      {/* ── Right panel ──────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        {setup ? (
          <>
            {/* Setup header card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.025em' }}>
                    {setup.SETUP_NAME || 'Untitled Setup'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    {setup.WATER_TYPE && (() => {
                      const wc = WATER_COLOR[setup.WATER_TYPE] ?? { color: '#6e6e73', bg: '#f5f5f7' }
                      return (
                        <span style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                          color: wc.color, background: wc.bg,
                          borderRadius: 6, padding: '2px 8px',
                        }}>
                          {setup.WATER_TYPE}
                        </span>
                      )
                    })()}
                    <span style={{ fontSize: 12, color: '#8e8e93' }}>{setup.STATUS}</span>
                    {setup.TARGET_TEMP_C && (
                      <span style={{ fontSize: 12, color: '#8e8e93' }}>{setup.TARGET_TEMP_C}°C</span>
                    )}
                    {setup.TARGET_PH && (
                      <span style={{ fontSize: 12, color: '#8e8e93' }}>pH {setup.TARGET_PH}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                    onClick={handleValidate}>
                    <CheckCircle size={13} /> Validate
                  </button>
                  <button className="btn-secondary"
                    style={{ fontSize: 12 }}
                    onClick={handlePrice}>
                    Est. Price
                  </button>
                  {setup.STATUS === 'DRAFT' && (
                    <button className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                      onClick={handleSave}>
                      <Save size={13} /> Save
                    </button>
                  )}
                </div>
              </div>

              {/* Validation */}
              {val && (
                <div style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  background: (val.capacity_ok && val.water_ok && val.temp_ok) ? '#e8f8ee' : '#fff2f2',
                  color:      (val.capacity_ok && val.water_ok && val.temp_ok) ? '#1c7737' : '#c0392b',
                }}>
                  {val.capacity_ok && val.water_ok && val.temp_ok
                    ? '✓ All checks passed — setup is valid'
                    : [
                        !val.capacity_ok && 'Capacity exceeded',
                        !val.water_ok    && 'Water type mismatch',
                        !val.temp_ok     && 'Temperature out of range',
                      ].filter(Boolean).join(' · ')
                  }
                </div>
              )}

              {/* Price */}
              {price !== null && (
                <div style={{
                  marginTop: 10, padding: '10px 14px', borderRadius: 10,
                  background: '#e3f0fd', color: '#0071e3', fontSize: 13,
                }}>
                  Estimated total: <strong>${Number(price).toFixed(2)}</strong>
                </div>
              )}
            </div>

            {/* Items card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: '1px solid #f2f2f2',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                  Items
                  {(setup.items ?? []).length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#aeaeb2', fontWeight: 400 }}>
                      {setup.items.length}
                    </span>
                  )}
                </div>
                {setup.STATUS === 'DRAFT' && (
                  <button className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                    onClick={() => setAddForm(true)}>
                    <Plus size={13} /> Add Item
                  </button>
                )}
              </div>

              {(setup.items ?? []).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 13, padding: '48px 0' }}>
                  No items yet — add fish, plants, or equipment
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th className="table-th">Product</th>
                      <th className="table-th">Type</th>
                      <th className="table-th" style={{ textAlign: 'right' }}>Qty</th>
                      <th className="table-th" style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(setup.items ?? []).map(item => (
                      <tr key={item.SETUP_ITEM_ID}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="table-td" style={{ fontWeight: 500 }}>{item.PRODUCT_NAME}</td>
                        <td className="table-td" style={{ fontSize: 12, color: '#6e6e73' }}>{item.ITEM_TYPE}</td>
                        <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {item.QUANTITY}
                        </td>
                        <td className="table-td">
                          {setup.STATUS === 'DRAFT' && (
                            <button onClick={() => handleRemove(item.PRODUCT_ID)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3b30', padding: 4 }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="card" style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: '#aeaeb2', minHeight: 240,
          }}>
            <Droplets size={32} color="#c7c7cc" />
            <div style={{ fontSize: 14, color: '#8e8e93' }}>
              {custId ? 'Select or create a setup' : 'Select a customer to begin'}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {newSetup && (
        <NewSetupModal
          customerId={custId}
          onClose={() => setNewSetup(false)}
          onCreated={(id) => {
            setNewSetup(false)
            getSetups(custId).then(r => setSetups(r.data))
            loadSetup(id)
          }}
        />
      )}

      {addForm && setup && (
        <AddItemModal
          setupId={activeId}
          onClose={() => setAddForm(false)}
          onAdded={() => { setAddForm(false); loadSetup(activeId) }}
        />
      )}
    </div>
  )
}

/* ── New Setup Modal ─────────────────────────────────────── */
const WATER_OPTS = [
  { value: 'FRESHWATER', label: 'Freshwater', hint: 'Rivers, lakes',  temp: '22–26', ph: '6.5–7.5' },
  { value: 'SALTWATER',  label: 'Saltwater',  hint: 'Ocean, reef',    temp: '24–27', ph: '8.0–8.4' },
  { value: 'BRACKISH',   label: 'Brackish',   hint: 'Estuary mix',    temp: '23–28', ph: '7.5–8.5' },
]

function NewSetupModal({ customerId, onClose, onCreated }) {
  const [tanks,  setTanks]  = useState([])
  const [form,   setForm]   = useState({
    tank_id: '', setup_name: '', water_type: 'FRESHWATER',
    target_temp_c: '', target_ph: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    getTanks().then(r => setTanks(r.data)).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const activeWater = WATER_OPTS.find(w => w.value === form.water_type)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const r = await createSetup({
        customer_id:   Number(customerId),
        tank_id:       Number(form.tank_id),
        setup_name:    form.setup_name,
        water_type:    form.water_type,
        target_temp_c: form.target_temp_c ? Number(form.target_temp_c) : null,
        target_ph:     form.target_ph     ? Number(form.target_ph)     : null,
      })
      onCreated(r.data.setup_id)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 460 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>New Aquarium Setup</div>
            <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>Configure your tank before adding livestock</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && (
              <div style={{ fontSize: 12, color: '#ff3b30', background: '#fff2f2', borderRadius: 8, padding: '10px 12px' }}>
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="field-label">Setup Name</label>
              <input className="input" required
                value={form.setup_name}
                onChange={e => set('setup_name', e.target.value)}
                placeholder="e.g. My Reef Tank" />
            </div>

            {/* Tank */}
            <div>
              <label className="field-label">Tank</label>
              <select className="input" required value={form.tank_id}
                onChange={e => set('tank_id', e.target.value)}>
                <option value="">Choose a tank…</option>
                {tanks.map(t => (
                  <option key={t.TANK_ID} value={t.TANK_ID}>
                    {t.PRODUCT_NAME}{t.VOLUME_LITERS ? ` (${t.VOLUME_LITERS}L)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Water Type — pill selector */}
            <div>
              <label className="field-label">Water Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 6 }}>
                {WATER_OPTS.map(opt => {
                  const wc = WATER_COLOR[opt.value] ?? { color: '#6e6e73', bg: '#f5f5f7' }
                  const active = form.water_type === opt.value
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => set('water_type', opt.value)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: `1.5px solid ${active ? wc.color : '#e5e5ea'}`,
                        background: active ? wc.bg : 'white',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? wc.color : '#1d1d1f' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 11, color: active ? wc.color : '#aeaeb2', marginTop: 2 }}>
                        {opt.hint}
                      </div>
                    </button>
                  )
                })}
              </div>
              {activeWater && (
                <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 8, display: 'flex', gap: 12 }}>
                  <span>Suggested temp: <strong>{activeWater.temp}°C</strong></span>
                  <span>Suggested pH: <strong>{activeWater.ph}</strong></span>
                </div>
              )}
            </div>

            {/* Temp + pH */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Target Temp (°C) <span style={{ color: '#aeaeb2', fontWeight: 400 }}>optional</span></label>
                <input className="input" type="number" step="0.1"
                  placeholder={activeWater?.temp.split('–')[0] ?? '24'}
                  value={form.target_temp_c}
                  onChange={e => set('target_temp_c', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Target pH <span style={{ color: '#aeaeb2', fontWeight: 400 }}>optional</span></label>
                <input className="input" type="number" step="0.1" min="0" max="14"
                  placeholder={activeWater?.ph.split('–')[0] ?? '7.0'}
                  value={form.target_ph}
                  onChange={e => set('target_ph', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Add Item Modal ──────────────────────────────────────── */
function AddItemModal({ setupId, onClose, onAdded }) {
  const [products, setProducts] = useState([])
  const [form,   setForm]   = useState({ product_id: '', item_type: 'FISH', quantity: 1 })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    getProducts().then(r => setProducts(r.data)).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await addSetupItem(setupId, {
        product_id: Number(form.product_id),
        item_type:  form.item_type,
        quantity:   Number(form.quantity),
      })
      onAdded()
    } catch (err) {
      setError(parseOraError(err))
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Add Item</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: '#fff2f2', border: '1px solid #ffd5d2',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <AlertTriangle size={15} color="#ff3b30" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#c0392b', marginBottom: 2 }}>
                    Can't add this item
                  </div>
                  <div style={{ fontSize: 12, color: '#c0392b', lineHeight: 1.5 }}>{error}</div>
                </div>
                <button type="button" onClick={() => setError('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3b30', padding: 0, flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </div>
            )}
            <div>
              <label className="field-label">Product</label>
              <select className="input" required value={form.product_id}
                onChange={e => set('product_id', e.target.value)}>
                <option value="">Select product…</option>
                {products.map(p => (
                  <option key={p.PRODUCT_ID} value={p.PRODUCT_ID}>
                    {p.PRODUCT_NAME} ({p.PRODUCT_TYPE})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Item Type</label>
              <select className="input" value={form.item_type}
                onChange={e => set('item_type', e.target.value)}>
                <option value="FISH">Fish</option>
                <option value="PLANT">Plant</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="DECORATION">Decoration</option>
              </select>
            </div>
            <div>
              <label className="field-label">Quantity</label>
              <input className="input" type="number" min="1" value={form.quantity}
                onChange={e => set('quantity', e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
