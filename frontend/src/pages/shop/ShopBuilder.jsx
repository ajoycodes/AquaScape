import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts, createSetup, addSetupItem, validateSetup, getSetupPrice, saveSetup } from '../../api/client'
import { useShop } from '../../context/ShopContext'
import { Waves, Fish, Leaf, Zap, Gem, Plus, Trash2, CheckCircle, XCircle, ShoppingBag } from 'lucide-react'

const WATER_TYPES   = ['FRESHWATER', 'SALTWATER', 'BRACKISH']
const ITEM_TYPES    = ['FISH', 'PLANT', 'DECORATION', 'EQUIPMENT']
const STEP_LABELS   = ['Tank', 'Parameters', 'Stock', 'Review']

const ITEM_ICON = { FISH: Fish, PLANT: Leaf, EQUIPMENT: Zap, DECORATION: Gem }

export default function ShopBuilder() {
  const navigate = useNavigate()
  const { customer } = useShop()
  const [step,      setStep]      = useState(0)
  const [tanks,     setTanks]     = useState([])
  const [products,  setProducts]  = useState([])
  const [setupId,   setSetupId]   = useState(null)

  const [form, setForm] = useState({
    tank_id: '', setup_name: '', water_type: 'FRESHWATER',
    target_temp_c: 25, target_ph: 7.0,
  })
  const [items,      setItems]      = useState([])
  const [addForm,    setAddForm]    = useState({ product_id: '', item_type: 'FISH', quantity: 1 })
  const [validation, setValidation] = useState(null)
  const [price,      setPrice]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    getProducts({ type: 'TANK' }).then(r => setTanks(r.data)).catch(() => {})
    getProducts({}).then(r => setProducts(r.data.filter(p => p.PRODUCT_TYPE !== 'TANK'))).catch(() => {})
  }, [])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Step 0: pick tank
  const handleTankNext = async () => {
    if (!form.tank_id || !form.setup_name) { setError('Please fill in all fields'); return }
    if (!customer) { setError('Please select an account first'); return }
    setError('')
    try {
      const r = await createSetup({
        customer_id:    customer.id,
        tank_id:        Number(form.tank_id),
        setup_name:     form.setup_name,
        water_type:     form.water_type,
        target_temp_c:  Number(form.target_temp_c),
        target_ph:      Number(form.target_ph),
      })
      setSetupId(r.data.setup_id)
      setStep(1)
    } catch (e) {
      setError(e.response?.data?.error ?? e.message)
    }
  }

  // Step 1: already captured in form during step 0 (params are set with tank)
  // jump to stock directly
  const goToStock = () => { setError(''); setStep(2) }

  // Step 2: add items
  const handleAddItem = async () => {
    if (!addForm.product_id) { setError('Select a product'); return }
    setError('')
    try {
      await addSetupItem(setupId, {
        product_id: Number(addForm.product_id),
        item_type:  addForm.item_type,
        quantity:   Number(addForm.quantity),
      })
      const p = products.find(x => x.PRODUCT_ID === Number(addForm.product_id))
      setItems(prev => [...prev, { ...addForm, PRODUCT_NAME: p?.PRODUCT_NAME ?? '?', PRODUCT_ID: Number(addForm.product_id) }])
      setAddForm({ product_id: '', item_type: 'FISH', quantity: 1 })
    } catch (e) {
      setError(e.response?.data?.error ?? e.message)
    }
  }

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const goToReview = async () => {
    setError('')
    try {
      const [vr, pr] = await Promise.all([validateSetup(setupId), getSetupPrice(setupId)])
      setValidation(vr.data)
      setPrice(pr.data)
      setStep(3)
    } catch (e) {
      setError(e.response?.data?.error ?? e.message)
    }
  }

  const handleSave = async () => {
    if (!customer) return
    setSaving(true)
    setError('')
    try {
      await saveSetup(setupId, { customer_id: customer.id, is_public: 0 })
      setSaved(true)
    } catch (e) {
      setError(e.response?.data?.error ?? e.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedTank = tanks.find(t => String(t.TANK_ID ?? t.PRODUCT_ID) === String(form.tank_id))

  if (!customer) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '64px 0' }}>
          <Waves size={40} color="#aeaeb2" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>Select an account to use the Builder</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em' }}>
          Aquarium Builder
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: '#8e8e93' }}>
          Design your perfect tank step by step
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', border: `2px solid ${i <= step ? '#0071e3' : '#e5e5ea'}`,
                background: i < step ? '#0071e3' : i === step ? 'white' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: i < step ? 'white' : i === step ? '#0071e3' : '#aeaeb2',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: i === step ? 700 : 400, color: i <= step ? '#0071e3' : '#aeaeb2' }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? '#0071e3' : '#e5e5ea', marginBottom: 20 }} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ color: '#ff3b30', fontSize: 13, background: '#fff2f2', borderRadius: 10, padding: '10px 14px' }}>
          {error}
        </div>
      )}

      {/* Step 0 – Tank & Parameters */}
      {step === 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>Tank & Parameters</div>

          <div>
            <label className="field-label">Setup Name</label>
            <input className="input" placeholder="e.g. My Living Room Tank"
              value={form.setup_name} onChange={e => setF('setup_name', e.target.value)} />
          </div>

          <div>
            <label className="field-label">Choose Tank</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tanks.map(t => {
                const id = String(t.TANK_ID ?? t.PRODUCT_ID)
                const sel = form.tank_id === id
                return (
                  <button key={id} onClick={() => setF('tank_id', id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 14px', borderRadius: 12, border: `2px solid ${sel ? '#0071e3' : '#e5e5ea'}`,
                      background: sel ? 'rgba(0,113,227,0.04)' : 'white', cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: sel ? '#e8f2ff' : '#f5f5f7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Waves size={18} color={sel ? '#0071e3' : '#8e8e93'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{t.PRODUCT_NAME}</div>
                      {t.DESCRIPTION && <div style={{ fontSize: 11, color: '#8e8e93' }}>{t.DESCRIPTION}</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: sel ? '#0071e3' : '#3a3a3c' }}>
                      ${Number(t.UNIT_PRICE).toFixed(2)}
                    </div>
                  </button>
                )
              })}
              {tanks.length === 0 && (
                <div style={{ fontSize: 13, color: '#aeaeb2', textAlign: 'center', padding: '24px 0' }}>No tanks available</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">Water Type</label>
              <select className="input" value={form.water_type} onChange={e => setF('water_type', e.target.value)}>
                {WATER_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Temp (°C)</label>
              <input className="input" type="number" step="0.5" min="10" max="35"
                value={form.target_temp_c} onChange={e => setF('target_temp_c', e.target.value)} />
            </div>
            <div>
              <label className="field-label">pH</label>
              <input className="input" type="number" step="0.1" min="5" max="9"
                value={form.target_ph} onChange={e => setF('target_ph', e.target.value)} />
            </div>
          </div>

          <button className="btn-primary" onClick={handleTankNext}>Continue →</button>
        </div>
      )}

      {/* Step 1 – skip (params already done) or confirmation */}
      {step === 1 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>Setup Created</div>
          <div style={{ fontSize: 13, color: '#6e6e73' }}>
            <strong>{selectedTank?.PRODUCT_NAME ?? 'Tank'}</strong> is ready.
            Now add fish, plants, and decorations to your setup.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              ['Water', form.water_type],
              ['Temp', `${form.target_temp_c}°C`],
              ['pH', form.target_ph],
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#f5f5f7', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{v}</div>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={goToStock}>Add Items →</button>
        </div>
      )}

      {/* Step 2 – add items */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Add form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>Add to Setup</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px', gap: 10 }}>
              <div>
                <label className="field-label">Product</label>
                <select className="input" value={addForm.product_id}
                  onChange={e => setAddForm(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">Choose…</option>
                  {ITEM_TYPES.map(type => {
                    const typeProducts = products.filter(p => p.PRODUCT_TYPE === type)
                    if (typeProducts.length === 0) return null
                    return (
                      <optgroup key={type} label={type}>
                        {typeProducts.map(p => (
                          <option key={p.PRODUCT_ID} value={p.PRODUCT_ID}>{p.PRODUCT_NAME}</option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="field-label">Type</label>
                <select className="input" value={addForm.item_type}
                  onChange={e => setAddForm(f => ({ ...f, item_type: e.target.value }))}>
                  {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Qty</label>
                <input className="input" type="number" min="1" value={addForm.quantity}
                  onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
            </div>
            <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={handleAddItem}>
              <Plus size={13} /> Add Item
            </button>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>
                Items ({items.length})
              </div>
              {items.map((item, i) => {
                const Icon = ITEM_ICON[item.item_type] ?? Gem
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={14} color="#8e8e93" />
                    <span style={{ flex: 1, fontSize: 13, color: '#1d1d1f' }}>{item.PRODUCT_NAME}</span>
                    <span style={{ fontSize: 11, color: '#8e8e93' }}>×{item.quantity} · {item.item_type}</span>
                    <button onClick={() => removeItem(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', padding: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn-primary" onClick={goToReview}>Review Setup →</button>
          </div>
        </div>
      )}

      {/* Step 3 – review & save */}
      {step === 3 && validation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Validation */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>Compatibility Check</div>
            {[
              { key: 'capacity_ok', label: 'Tank Capacity' },
              { key: 'water_ok',    label: 'Water Type' },
              { key: 'temp_ok',     label: 'Temperature Range' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {validation[key]
                  ? <CheckCircle size={18} color="#34c759" />
                  : <XCircle    size={18} color="#ff3b30" />
                }
                <span style={{ fontSize: 13, color: validation[key] ? '#1d1d1f' : '#ff3b30' }}>{label}</span>
                <span className={`badge ${validation[key] ? 's-green' : 's-red'}`} style={{ marginLeft: 'auto' }}>
                  {validation[key] ? 'OK' : 'Issue'}
                </span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>Setup Summary</div>
            <div style={{ fontSize: 13, color: '#6e6e73' }}>
              <strong style={{ color: '#1d1d1f' }}>{form.setup_name}</strong>
              {' · '}{selectedTank?.PRODUCT_NAME}{' · '}{form.water_type}
            </div>
            <div style={{ fontSize: 13, color: '#6e6e73' }}>
              {items.length} item{items.length !== 1 ? 's' : ''} added
            </div>
            {price && (
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1d1d1f', marginTop: 4 }}>
                Estimated Total: ${Number(price.total_price ?? 0).toFixed(2)}
              </div>
            )}
          </div>

          {saved ? (
            <div style={{
              background: '#e8f8ee', border: '1px solid #34c759', borderRadius: 12,
              padding: '14px 18px', fontSize: 13, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle size={18} color="#34c759" />
              Setup saved! You can now add items to your cart.
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={() => setStep(2)}>← Edit Items</button>
            {!saved && (
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Setup'}
              </button>
            )}
            <button
              onClick={() => navigate('/shop/browse')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 9999, border: 'none',
                background: '#e8f2ff', color: '#0071e3', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
              }}>
              <ShoppingBag size={14} /> Add Items to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
