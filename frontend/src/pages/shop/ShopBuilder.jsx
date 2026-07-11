import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts, getTanks, createSetup, addSetupItem, validateSetup, getSetupPrice, saveSetup, getSetups, getSetup, addToCart } from '../../api/client'
import { useShop } from '../../context/ShopContext'
import BuilderAlert from '../../components/BuilderAlert'
import { Waves, Fish, Leaf, Zap, Gem, Plus, Trash2, CheckCircle, XCircle, ShoppingBag, FolderOpen, ArrowRight } from 'lucide-react'

const WATER_TYPES   = ['FRESHWATER', 'SALTWATER', 'BRACKISH']
const ITEM_TYPES    = ['FISH', 'PLANT', 'DECORATION', 'EQUIPMENT']
const STEP_LABELS   = ['Tank', 'Parameters', 'Stock', 'Review']

const ITEM_ICON = { FISH: Fish, PLANT: Leaf, EQUIPMENT: Zap, DECORATION: Gem }

export default function ShopBuilder() {
  const navigate = useNavigate()
  const { customer, refreshCart } = useShop()
  const [view,      setView]      = useState('loading')   // 'loading' | 'list' | 'wizard'
  const [setups,    setSetups]    = useState([])
  const [carting,   setCarting]   = useState(null)
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
  const [error,      setError]      = useState(null)

  useEffect(() => {
    getTanks().then(r => setTanks(r.data)).catch(() => {})
    getProducts({}).then(r => setProducts(r.data.filter(p => p.PRODUCT_TYPE !== 'TANK'))).catch(() => {})
  }, [])

  const loadSetups = () => {
    if (!customer) return
    getSetups(customer.id)
      .then(r => { setSetups(r.data); setView(r.data.length > 0 ? 'list' : 'wizard') })
      .catch(() => setView('wizard'))
  }
  useEffect(() => { loadSetups() }, [customer])

  const startNewSetup = () => {
    setForm({ tank_id: '', setup_name: '', water_type: 'FRESHWATER', target_temp_c: 25, target_ph: 7.0 })
    setItems([]); setSetupId(null); setStep(0); setSaved(false); setError(null)
    setView('wizard')
  }

  // Put the tank + every setup item into the shopping cart
  const addSetupToCart = async (sid) => {
    setCarting(sid)
    setError(null)
    try {
      const detail = (await getSetup(sid)).data
      const tank = tanks.find(t => t.TANK_ID === detail.TANK_ID)
      if (tank) await addToCart(customer.id, { product_id: tank.PRODUCT_ID, quantity: 1 })
      for (const it of (detail.items ?? [])) {
        await addToCart(customer.id, { product_id: it.PRODUCT_ID, quantity: it.QUANTITY })
      }
      await refreshCart()
      navigate('/shop/cart')
    } catch (e) {
      setError(e)
    } finally {
      setCarting(null)
    }
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Step 0: pick tank
  const handleTankNext = async () => {
    if (!form.tank_id || !form.setup_name) { setError({ message: 'Please fill in all fields' }); return }
    if (!customer) { setError({ message: 'Please sign in first' }); return }
    setError(null)
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
      setError(e)
    }
  }

  // Step 1: already captured in form during step 0 (params are set with tank)
  // jump to stock directly
  const goToStock = () => { setError(null); setStep(2) }

  // Step 2: add items
  const handleAddItem = async () => {
    if (!addForm.product_id) { setError({ message: 'Select a product' }); return }
    setError(null)
    // item_type always comes from the product itself — never user-selected
    const p = products.find(x => x.PRODUCT_ID === Number(addForm.product_id))
    const itemType = p?.PRODUCT_TYPE ?? 'FISH'
    try {
      await addSetupItem(setupId, {
        product_id: Number(addForm.product_id),
        item_type:  itemType,
        quantity:   Number(addForm.quantity),
      })
      setItems(prev => [...prev, { ...addForm, item_type: itemType, PRODUCT_NAME: p?.PRODUCT_NAME ?? '?', PRODUCT_ID: Number(addForm.product_id) }])
      setAddForm({ product_id: '', item_type: 'FISH', quantity: 1 })
    } catch (e) {
      // Swap internal IDs for names the customer recognises
      const p = products.find(x => x.PRODUCT_ID === Number(addForm.product_id))
      if (p) e.message = e.message
        .replace(/Product \d+/, p.PRODUCT_NAME)
        .replace(/setup \d+ is/, 'your setup is')
      setError(e)
    }
  }

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const goToReview = async () => {
    setError(null)
    try {
      const [vr, pr] = await Promise.all([validateSetup(setupId), getSetupPrice(setupId)])
      setValidation(vr.data)
      setPrice(pr.data)
      setStep(3)
    } catch (e) {
      setError(e)
    }
  }

  const handleSave = async () => {
    if (!customer) return
    setSaving(true)
    setError(null)
    try {
      await saveSetup(setupId, { customer_id: customer.id, is_public: 0 })
      setSaved(true)
      getSetups(customer.id).then(r => setSetups(r.data)).catch(() => {})
    } catch (e) {
      setError(e)
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

  if (view === 'loading') {
    return <div style={{ textAlign: 'center', padding: '80px 0', color: '#A6A299', fontSize: 13 }}>Loading…</div>
  }

  if (view === 'list') {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em' }}>
              My Setups
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#8e8e93' }}>
              {setups.length} saved aquarium design{setups.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn-primary" onClick={startNewSetup}>
            <Plus size={14} /> New Setup
          </button>
        </div>

        <BuilderAlert error={error} onDismiss={() => setError(null)} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {setups.map(s => (
            <div key={s.SETUP_ID} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: 'var(--chip-teal)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Waves size={20} color="#2A6B60" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1d1d1f' }}>{s.SETUP_NAME}</div>
                <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>
                  {s.TANK_NAME}{s.VOLUME_LITERS ? ` · ${s.VOLUME_LITERS}L` : ''} · {s.WATER_TYPE}
                  {s.CREATED_AT ? ` · ${s.CREATED_AT}` : ''}
                </div>
              </div>
              {s.STATUS && <span className="badge s-gray">{s.STATUS}</span>}
              <button className="btn-secondary" style={{ height: 36, padding: '0 14px', fontSize: 12.5 }}
                onClick={() => addSetupToCart(s.SETUP_ID)} disabled={carting !== null}>
                <ShoppingBag size={13} />
                {carting === s.SETUP_ID ? 'Adding…' : 'Add to Cart'}
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em' }}>
            Aquarium Builder
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#8e8e93' }}>
            Design your perfect tank step by step
          </p>
        </div>
        {setups.length > 0 && (
          <button className="btn-ghost" onClick={() => { loadSetups(); setView('list') }}>
            <FolderOpen size={13} /> My Setups
          </button>
        )}
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', border: `2px solid ${i <= step ? '#16150F' : '#e5e5ea'}`,
                background: i < step ? '#16150F' : i === step ? 'white' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: i < step ? 'white' : i === step ? '#16150F' : '#aeaeb2',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: i === step ? 700 : 400, color: i <= step ? '#16150F' : '#aeaeb2' }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? '#16150F' : '#e5e5ea', marginBottom: 20 }} />
            )}
          </div>
        ))}
      </div>

      <BuilderAlert error={error} onDismiss={() => setError(null)} />

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
                      padding: '12px 14px', borderRadius: 12, border: `2px solid ${sel ? '#16150F' : '#e5e5ea'}`,
                      background: sel ? 'rgba(22,21,15,0.04)' : 'white', cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: sel ? '#EFEDE6' : '#f5f5f7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Waves size={18} color={sel ? '#16150F' : '#8e8e93'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{t.PRODUCT_NAME}</div>
                      <div style={{ fontSize: 11, color: '#8e8e93' }}>
                        {[t.VOLUME_LITERS && `${t.VOLUME_LITERS}L`, t.MATERIAL, t.LENGTH_CM && `${t.LENGTH_CM}×${t.WIDTH_CM}×${t.HEIGHT_CM} cm`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: sel ? '#16150F' : '#3a3a3c' }}>
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
              <div key={k} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
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
                  ? <CheckCircle size={18} color="#1F7A45" />
                  : <XCircle    size={18} color="#ff3b30" />
                }
                <span style={{ fontSize: 13, color: validation[key] ? '#1d1d1f' : '#ff3b30' }}>{label}</span>
                <span className={`badge ${validation[key] ? 's-green' : 's-red'}`} style={{ marginLeft: 'auto' }}>
                  {validation[key] ? 'OK' : 'Issue'}
                </span>
              </div>
            ))}

            {/* Which items caused the failures */}
            {(validation.issues ?? []).length > 0 && (
              <div style={{
                background: '#fff8ed', border: '1px solid rgba(255,149,0,0.25)',
                borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 5,
              }}>
                {validation.issues.map((iss, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: '#a05e10' }}>
                    <strong>{iss.product}</strong> {iss.detail}
                    {iss.check === 'water' ? ` — your setup is ${form.water_type}` : ''}
                    {iss.check === 'temperature' && form.target_temp_c ? ` — your setup runs at ${form.target_temp_c}°C` : ''}.
                  </div>
                ))}
                <div style={{ fontSize: 11.5, color: '#c08840', marginTop: 2 }}>
                  Remove these items or adjust the setup to resolve.
                </div>
              </div>
            )}
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
              background: '#e8f8ee', border: '1px solid #1F7A45', borderRadius: 12,
              padding: '14px 18px', fontSize: 13, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle size={18} color="#1F7A45" />
              Setup saved! Find it any time under My Setups, or add everything to your cart now.
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={() => setStep(2)}>← Edit Items</button>
            {!saved && (
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Setup'}
              </button>
            )}
            <button className={saved ? 'btn-primary' : 'btn-secondary'}
              onClick={() => addSetupToCart(setupId)} disabled={carting !== null}>
              <ShoppingBag size={14} /> {carting !== null ? 'Adding…' : 'Add Setup to Cart'}
            </button>
            {saved && (
              <button className="btn-secondary" onClick={() => { loadSetups(); setView('list') }}>
                <FolderOpen size={14} /> My Setups
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
