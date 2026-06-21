import { useEffect, useState } from 'react'
import { getSuppliers, getPOs, getPO, createPO, addPOItem, submitPO, approvePO, receivePO } from '../api/client'
import { getProducts } from '../api/client'
import { Plus, Send, CheckCircle, PackageCheck, X } from 'lucide-react'

const PO_STATUS_BADGE = {
  DRAFT:     's-gray',
  SUBMITTED: 's-yellow',
  APPROVED:  's-blue',
  ORDERED:   's-purple',
  RECEIVED:  's-green',
  CANCELLED: 's-red',
}

export default function Suppliers() {
  const [tab,       setTab]       = useState('pos')
  const [suppliers, setSuppliers] = useState([])
  const [pos,       setPOs]       = useState([])
  const [detail,    setDetail]    = useState(null)
  const [newPO,     setNewPO]     = useState(false)
  const [addItem,   setAddItem]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    getSuppliers().then(r => setSuppliers(r.data)).catch(() => {})
    getPOs().then(r => setPOs(r.data)).catch(e => setError(e.message))
  }, [])

  const loadPO = (id) =>
    getPO(id).then(r => setDetail(r.data)).catch(e => setError(e.message))

  const reload = () =>
    getPOs().then(r => setPOs(r.data)).catch(e => setError(e.message))

  const handleSubmit  = async () => { try { await submitPO(detail.PO_ID, { user_id: 1 });  loadPO(detail.PO_ID); reload() } catch (e) { setError(e.message) } }
  const handleApprove = async () => { try { await approvePO(detail.PO_ID, { user_id: 1 }); loadPO(detail.PO_ID); reload() } catch (e) { setError(e.message) } }
  const handleReceive = async () => { try { await receivePO(detail.PO_ID, { user_id: 1 }); loadPO(detail.PO_ID); reload() } catch (e) { setError(e.message) } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}

      {/* Segment + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="segment">
          <button className={`seg-btn${tab === 'pos' ? ' active' : ''}`} onClick={() => setTab('pos')}>
            Purchase Orders
          </button>
          <button className={`seg-btn${tab === 'suppliers' ? ' active' : ''}`} onClick={() => setTab('suppliers')}>
            Suppliers
          </button>
        </div>
        {tab === 'pos' && (
          <button className="btn-primary" onClick={() => setNewPO(true)}>
            <Plus size={14} /> New PO
          </button>
        )}
      </div>

      {/* Suppliers tab */}
      {tab === 'suppliers' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="table-th">Supplier</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Email</th>
                <th className="table-th">Phone</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.SUPPLIER_ID}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="table-td" style={{ fontWeight: 500 }}>{s.SUPPLIER_NAME}</td>
                  <td className="table-td">{s.CONTACT_NAME ?? '—'}</td>
                  <td className="table-td" style={{ color: '#6e6e73' }}>{s.EMAIL ?? '—'}</td>
                  <td className="table-td" style={{ color: '#6e6e73' }}>{s.PHONE ?? '—'}</td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '40px 0' }}>
                    No suppliers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* POs tab */}
      {tab === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: detail ? '1fr 1fr' : '1fr', gap: 14 }}>

          {/* PO list */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="table-th">PO #</th>
                  <th className="table-th">Supplier</th>
                  <th className="table-th" style={{ textAlign: 'right' }}>Total</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {pos.map(p => (
                  <tr key={p.PO_ID}
                    style={{
                      cursor: 'pointer',
                      background: detail?.PO_ID === p.PO_ID ? 'rgba(0,113,227,0.06)' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (detail?.PO_ID !== p.PO_ID) e.currentTarget.style.background = '#f9f9fb'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background =
                        detail?.PO_ID === p.PO_ID ? 'rgba(0,113,227,0.06)' : 'transparent'
                    }}
                    onClick={() => loadPO(p.PO_ID)}>
                    <td className="table-td" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0071e3' }}>#{p.PO_ID}</td>
                    <td className="table-td">{p.SUPPLIER_NAME}</td>
                    <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${Number(p.TOTAL_AMOUNT ?? 0).toFixed(2)}
                    </td>
                    <td className="table-td">
                      <span className={`badge ${PO_STATUS_BADGE[p.STATUS] ?? 's-gray'}`}>{p.STATUS}</span>
                    </td>
                  </tr>
                ))}
                {pos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '40px 0' }}>
                      No purchase orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PO detail */}
          {detail && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.022em' }}>
                    PO #{detail.PO_ID}
                  </div>
                  <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 3 }}>{detail.SUPPLIER_NAME}</div>
                </div>
                <span className={`badge ${PO_STATUS_BADGE[detail.STATUS] ?? 's-gray'}`}>{detail.STATUS}</span>
              </div>

              {/* Items */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Line Items
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(detail.items ?? []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>{item.PRODUCT_NAME} <span style={{ color: '#8e8e93' }}>×{item.QUANTITY_ORDERED}</span></span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>${Number(item.LINE_TOTAL ?? 0).toFixed(2)}</span>
                    </div>
                  ))}
                  {(detail.items ?? []).length === 0 && (
                    <div style={{ fontSize: 13, color: '#aeaeb2' }}>No items — add items before submitting</div>
                  )}
                </div>
              </div>

              {/* Total */}
              <div style={{ borderTop: '1px solid #f2f2f2', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>${Number(detail.TOTAL_AMOUNT ?? 0).toFixed(2)}</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {detail.STATUS === 'DRAFT' && (
                  <>
                    <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setAddItem(true)}>
                      <Plus size={13} /> Add Item
                    </button>
                    <button className="btn-primary" style={{ fontSize: 12 }} onClick={handleSubmit}>
                      <Send size={13} /> Submit
                    </button>
                  </>
                )}
                {detail.STATUS === 'SUBMITTED' && (
                  <button className="btn-primary" style={{ fontSize: 12 }} onClick={handleApprove}>
                    <CheckCircle size={13} /> Approve
                  </button>
                )}
                {detail.STATUS === 'APPROVED' && (
                  <button className="btn-primary" style={{ fontSize: 12 }} onClick={handleReceive}>
                    <PackageCheck size={13} /> Mark Received
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {newPO && (
        <NewPOModal
          suppliers={suppliers}
          onClose={() => setNewPO(false)}
          onCreated={(id) => { setNewPO(false); reload(); loadPO(id) }}
        />
      )}
      {addItem && detail && (
        <AddPOItemModal
          poId={detail.PO_ID}
          onClose={() => setAddItem(false)}
          onAdded={() => { setAddItem(false); loadPO(detail.PO_ID) }}
        />
      )}
    </div>
  )
}

function NewPOModal({ suppliers, onClose, onCreated }) {
  const [suppId, setSuppId] = useState('')
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const r = await createPO({ supplier_id: Number(suppId), notes, created_by: 1 })
      onCreated(r.data.po_id)
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>New Purchase Order</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
            <div>
              <label className="field-label">Supplier</label>
              <select className="input" required value={suppId} onChange={e => setSuppId(e.target.value)}>
                <option value="">Select supplier…</option>
                {suppliers.map(s => (
                  <option key={s.SUPPLIER_ID} value={s.SUPPLIER_ID}>{s.SUPPLIER_NAME}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Notes</label>
              <textarea className="input" rows={2} value={notes}
                onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddPOItemModal({ poId, onClose, onAdded }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ product_id: '', quantity: 1, unit_cost: '' })
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
      await addPOItem(poId, {
        product_id: Number(form.product_id),
        quantity:   Number(form.quantity),
        unit_cost:  Number(form.unit_cost),
      })
      onAdded()
    } catch (err) {
      setError(err.response?.data?.error ?? err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Add Item to PO</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
            <div>
              <label className="field-label">Product</label>
              <select className="input" required value={form.product_id}
                onChange={e => set('product_id', e.target.value)}>
                <option value="">Choose product…</option>
                {products.map(p => (
                  <option key={p.PRODUCT_ID} value={p.PRODUCT_ID}>{p.PRODUCT_NAME}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Quantity</label>
                <input className="input" type="number" min="1" value={form.quantity}
                  onChange={e => set('quantity', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Unit Cost ($)</label>
                <input className="input" type="number" step="0.01" required value={form.unit_cost}
                  onChange={e => set('unit_cost', e.target.value)} />
              </div>
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
