/**
 * Oracle Objects — live schema explorer backed by USER_OBJECTS
 */
import { useEffect, useState } from 'react'
import { getOracleObjects } from '../../api/client'
import OracleBadge from '../../components/OracleBadge'
import { Database, RefreshCw, AlertTriangle } from 'lucide-react'

/* Short descriptions for known objects ─────────────────────────────── */
const DESCRIPTIONS = {
  // Procedures
  PLACE_ORDER:             'Validates cart, checks stock, computes tax, creates ORDER + ORDER_ITEMS atomically',
  CANCEL_ORDER:            'Sets order status to CANCELLED and restores inventory via UPDATE_INVENTORY',
  UPDATE_INVENTORY:        'Adjusts qty_on_hand and writes a row to INVENTORY_MOVEMENTS',
  UPDATE_ORDER_STATUS:     'Transitions an order through the status lifecycle with audit logging',
  CREATE_AQUARIUM_SETUP:   'Creates a new aquarium design record with tank, water type, and temp parameters',
  ADD_ITEM_TO_SETUP:       'Adds a product to a setup; calls CHECK_COMPATIBILITY internally',
  SAVE_SETUP:              'Final validation pass then commits setup with SAVED status',
  CREATE_SUPPLIER_PO:      'Creates a DRAFT purchase order for a supplier',
  ADD_PO_ITEM:             'Adds a product line item to an existing PO',
  SUBMIT_SUPPLIER_PO:      'Transitions PO from DRAFT → SUBMITTED for manager review',
  APPROVE_SUPPLIER_PO:     'Transitions PO from SUBMITTED → APPROVED, authorising the purchase',
  RECEIVE_SUPPLIER_PO:     'Calls UPDATE_INVENTORY for each PO item; transitions to RECEIVED',
  PROCESS_RETURN:          'Approves/rejects a return request and optionally triggers a refund',
  // Functions
  GET_SETUP_TOTAL_PRICE:   'Returns SUM of all item prices + tank price for a setup',
  CHECK_COMPATIBILITY:     'Returns the count of HARD compatibility rule violations in a setup',
  VALIDATE_TANK_CAPACITY:  'Returns 1 if total stocking density is within safe limits for the tank',
  VALIDATE_WATER_TYPE:     'Returns 1 if all setup items share the same water type',
  VALIDATE_TEMPERATURE:    'Returns 1 if temperature ranges of all items overlap',
  CHECK_AVAILABILITY:      'Returns 1 if qty_on_hand − qty_reserved ≥ requested quantity',
  CALC_ORDER_PROFIT:       'Returns revenue − COGS for a given order_id',
  GET_PRODUCT_STOCK:       'Returns current qty_on_hand for a product_id',
  // Triggers
  TRG_DEDUCT_STOCK:        'AFTER INSERT ON order_items — fires UPDATE_INVENTORY to deduct sold qty',
  TRG_NO_NEGATIVE_STOCK:   'BEFORE UPDATE ON inventory — raises ORA-20002 if qty would go negative',
  TRG_LOW_STOCK_ALERT:     'AFTER UPDATE OF qty_on_hand ON inventory — inserts LOW_STOCK_ALERTS row (deduplicated)',
  TRG_AUDIT_LOG:           'AFTER INSERT/UPDATE/DELETE on key tables — records old/new JSON to AUDIT_LOG',
  TRG_AUTO_TIMESTAMP_INVENTORY: 'BEFORE UPDATE ON inventory — stamps updated_at = SYSDATE',
  // Views
  VW_DASHBOARD_KPIS:              'Single-row KPI snapshot: revenue, orders, customers, products this month',
  VW_MONTHLY_SALES:               'Revenue and order count aggregated by calendar month',
  VW_BEST_SELLING_FISH:           'Top products ranked by units sold, includes current stock',
  VW_FAST_MOVERS:                 'Products with units sold in last 30 days + stock alert flag',
  VW_LOW_STOCK:                   'Products where qty_on_hand ≤ reorder_level',
  VW_AUDIT_LOG_SUMMARY:           'Human-readable view of AUDIT_LOG with formatted timestamps',
  VW_STOCK_MOVEMENT_LOG:          'All INVENTORY_MOVEMENTS rows with product name and type labels',
  VW_INVENTORY_SUMMARY:           'Current inventory with stock health (OK / LOW / CRITICAL / OUT)',
  VW_CUSTOMER_PURCHASE_HISTORY:   'Lifetime value, order count, tier, and last order per customer',
  VW_SUPPLIER_INVENTORY:          'Products supplied per supplier with current stock levels',
  VW_ORDER_DETAILS:               'Orders joined to items, products, and customer name',
  VW_PROFIT_ANALYSIS:             'Per-order revenue, COGS, profit, and margin percentage',
  VW_COMPATIBILITY_FAILURE_REPORT:'Setups with unresolved HARD compatibility rule violations',
  VW_PRODUCT_RATING_ANALYSIS:     'Average rating, review count, and sentiment per product',
  VW_POPULAR_SETUPS:              'Saved aquarium setups ranked by save count / orders',
}

const TYPE_ORDER = ['PROCEDURE', 'FUNCTION', 'TRIGGER', 'VIEW', 'TABLE', 'SEQUENCE', 'INDEX', 'PACKAGE']

const TYPE_COLOR = {
  PROCEDURE: '#bf5af2',
  FUNCTION:  '#ff9500',
  TRIGGER:   '#ff3b30',
  VIEW:      '#0071e3',
  TABLE:     '#34c759',
  SEQUENCE:  '#32ade6',
  INDEX:     '#32ade6',
  PACKAGE:   '#8e8e93',
}

export default function OracleObjects() {
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [filter,   setFilter]   = useState('ALL')
  const [search,   setSearch]   = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = () => {
    setLoading(true)
    setError('')
    getOracleObjects()
      .then(r => {
        setData(r.data)
        setLastRefresh(new Date())
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const counts  = data?.counts ?? []
  const objects = data?.objects ?? []
  const invalid = data?.invalid_count ?? 0

  // Build count map
  const countMap = {}
  for (const r of counts) countMap[r.OBJECT_TYPE] = Number(r.OBJECT_COUNT)
  const totalObjects = counts.reduce((s, r) => s + Number(r.OBJECT_COUNT), 0)

  // Filtered object list
  const filtered = objects.filter(o => {
    const typeMatch = filter === 'ALL' || o.OBJECT_TYPE === filter
    const searchMatch = !search || o.OBJECT_NAME.toLowerCase().includes(search.toLowerCase())
    return typeMatch && searchMatch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a0a2e 100%)',
        borderRadius: 20, padding: '24px 28px', color: 'white',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Database size={20} color="#bf5af2" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              USER_OBJECTS · Oracle 21c XE
            </span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Schema Object Explorer
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            Live counts and descriptions of every Oracle object in the AquaScape schema.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={load} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
            borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent', color: 'rgba(255,255,255,0.8)',
            fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          {lastRefresh && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              Refreshed {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff2f2', border: '1px solid #ff3b3033', borderRadius: 12, padding: '14px 18px', color: '#c0392b', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Count cards */}
      {!loading && data && (
        <>
          {/* Total + invalid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            <div className="card" style={{ padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.04em' }}>{totalObjects}</div>
              <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Objects</div>
            </div>
            {invalid > 0 && (
              <div className="card" style={{ padding: '16px 18px', textAlign: 'center', background: '#fff8f0', border: '1px solid #ff950033' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <AlertTriangle size={16} color="#ff9500" />
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#ff9500', letterSpacing: '-0.04em' }}>{invalid}</div>
                </div>
                <div style={{ fontSize: 11, color: '#ff9500', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invalid</div>
              </div>
            )}
            {TYPE_ORDER.filter(t => countMap[t] > 0).map(type => (
              <div
                key={type}
                className="card"
                onClick={() => setFilter(filter === type ? 'ALL' : type)}
                style={{
                  padding: '16px 18px', textAlign: 'center', cursor: 'pointer',
                  border: filter === type ? `2px solid ${TYPE_COLOR[type]}` : '1px solid #e5e5ea',
                  background: filter === type ? TYPE_COLOR[type] + '10' : 'white',
                  transition: 'all 0.15s',
                }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: TYPE_COLOR[type], letterSpacing: '-0.04em' }}>
                  {countMap[type] ?? 0}
                </div>
                <div style={{ fontSize: 10, color: TYPE_COLOR[type], marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  {type}{(countMap[type] ?? 0) !== 1 ? 'S' : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Filter + search */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['ALL', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'VIEW'].map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: filter === t ? `1.5px solid ${t === 'ALL' ? '#0071e3' : TYPE_COLOR[t]}` : '1px solid #e5e5ea',
                    background: filter === t ? (t === 'ALL' ? '#0071e310' : TYPE_COLOR[t] + '10') : 'white',
                    color: filter === t ? (t === 'ALL' ? '#0071e3' : TYPE_COLOR[t]) : '#6e6e73',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {t === 'ALL' ? 'All Types' : t}
                </button>
              ))}
            </div>
            <input
              className="input"
              placeholder="Search object name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 220, marginLeft: 'auto' }}
            />
          </div>

          {/* Object table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f7' }}>
                  <th className="table-th" style={{ width: 90 }}>Type</th>
                  <th className="table-th">Object Name</th>
                  <th className="table-th">Description</th>
                  <th className="table-th" style={{ width: 90 }}>Status</th>
                  <th className="table-th" style={{ width: 130 }}>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px 0', textAlign: 'center', color: '#aeaeb2', fontSize: 13 }}>
                      No objects match
                    </td>
                  </tr>
                )}
                {filtered.map((obj, i) => (
                  <tr key={`${obj.OBJECT_TYPE}-${obj.OBJECT_NAME}`} style={{ borderTop: i > 0 ? '1px solid #f2f2f2' : 'none' }}>
                    <td className="table-td">
                      <OracleBadge type={obj.OBJECT_TYPE} name={obj.OBJECT_TYPE.slice(0, 4)} inline />
                    </td>
                    <td className="table-td" style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: TYPE_COLOR[obj.OBJECT_TYPE] ?? '#1d1d1f' }}>
                      {obj.OBJECT_NAME}
                    </td>
                    <td className="table-td" style={{ fontSize: 12, color: '#3a3a3c', lineHeight: 1.5 }}>
                      {DESCRIPTIONS[obj.OBJECT_NAME] ?? <span style={{ color: '#aeaeb2' }}>—</span>}
                    </td>
                    <td className="table-td">
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        color: obj.STATUS === 'VALID' ? '#1c7737' : '#c0392b',
                        background: obj.STATUS === 'VALID' ? '#e8f8ee' : '#fff2f2',
                      }}>
                        {obj.STATUS}
                      </span>
                    </td>
                    <td className="table-td" style={{ fontSize: 11, color: '#8e8e93', fontFamily: 'monospace' }}>
                      {obj.LAST_DDL_TIME ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'right' }}>
            Showing {filtered.length} of {objects.length} objects · Source: USER_OBJECTS
          </div>
        </>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '64px 0', color: '#aeaeb2', fontSize: 13 }}>
          Loading schema objects…
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
