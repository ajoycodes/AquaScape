import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  getMonthlySales, getBestSellers, getProfitReport,
  getFastMovers, getStockMovements,
} from '../api/client'
import { Download, RefreshCw } from 'lucide-react'

const APPLE_COLORS = ['#0071e3', '#32ade6', '#34c759', '#bf5af2', '#ff9500', '#ff3b30', '#ff2d55']

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'white', border: '1px solid #e5e5ea',
    borderRadius: 10, fontSize: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
}

const TABS = [
  { id: 'sales',     label: 'Monthly Sales'   },
  { id: 'sellers',   label: 'Best Sellers'    },
  { id: 'profit',    label: 'Profit'          },
  { id: 'movers',    label: 'Fast Movers'     },
  { id: 'movements', label: 'Stock Movements' },
]

/* ── CSV helper ──────────────────────────────────────────── */
function exportCSV(data, filename) {
  if (!data?.length) return
  const cols = Object.keys(data[0])
  const csv  = [cols.join(','), ...data.map(r =>
    cols.map(c => {
      const v = r[c] ?? ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }).join(',')
  )].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const [tab,         setTab]         = useState('sales')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [refreshKey,  setRefreshKey]  = useState(0)
  const [lastRefresh, setLastRefresh] = useState(null)

  const handleRefresh = () => {
    setRefreshKey(k => k + 1)
    setLastRefresh(new Date())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Segment + date filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className="segment">
          {TABS.map(t => (
            <button key={t.id} className={`seg-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, color: '#8e8e93', whiteSpace: 'nowrap' }}>From</span>
          <input type="date" className="input" style={{ width: 148, fontSize: 13 }}
            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ fontSize: 12, color: '#8e8e93' }}>To</span>
          <input type="date" className="input" style={{ width: 148, fontSize: 13 }}
            value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(dateFrom || dateTo) && (
            <button className="btn-secondary"
              onClick={() => { setDateFrom(''); setDateTo('') }}>
              Clear
            </button>
          )}
          <button className="btn-secondary" onClick={handleRefresh}>
            <RefreshCw size={12} />
            Refresh
          </button>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: '#aeaeb2', whiteSpace: 'nowrap' }}>
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {tab === 'sales'     && <MonthlySalesReport  key={refreshKey} dateFrom={dateFrom} dateTo={dateTo} />}
      {tab === 'sellers'   && <BestSellersReport   key={refreshKey} dateFrom={dateFrom} dateTo={dateTo} />}
      {tab === 'profit'    && <ProfitReport         key={refreshKey} dateFrom={dateFrom} dateTo={dateTo} />}
      {tab === 'movers'    && <FastMoversReport     key={refreshKey} dateFrom={dateFrom} dateTo={dateTo} />}
      {tab === 'movements' && <MovementsReport      key={refreshKey} dateFrom={dateFrom} dateTo={dateTo} />}
    </div>
  )
}

/* ── Shared helpers ─────────────────────────────────────── */
const TICK = { fontSize: 11, fill: '#8e8e93' }
const GRID = { strokeDasharray: '3 3', stroke: '#f2f2f2' }

function SectionTitle({ children, onExport }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.018em' }}>
        {children}
      </div>
      {onExport && (
        <button className="btn-secondary" onClick={onExport}>
          <Download size={12} /> CSV
        </button>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#aeaeb2', fontSize: 13 }}>
      No data available
    </div>
  )
}

/* ─── Monthly Sales ─────────────────────────────────────── */
function MonthlySalesReport({ dateFrom, dateTo }) {
  const [data, setData] = useState([])

  const fetch = useCallback(() => {
    const p = {}
    if (dateFrom) p.date_from = dateFrom
    if (dateTo)   p.date_to   = dateTo
    getMonthlySales(p).then(r => setData(r.data)).catch(() => {})
  }, [dateFrom, dateTo])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <SectionTitle onExport={() => exportCSV(data, 'monthly-sales.csv')}>
          Monthly Sales Revenue
        </SectionTitle>
        {data.length === 0
          ? <EmptyState />
          : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 5, right: 20, left: -16, bottom: 5 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="MONTH_LABEL" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => `$${Number(v).toFixed(2)}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="TOTAL_REVENUE" name="Revenue"
                  stroke="#0071e3" strokeWidth={2.5} dot={{ r: 4, fill: '#0071e3' }} />
                <Line type="monotone" dataKey="ORDER_COUNT" name="Orders"
                  stroke="#34c759" strokeWidth={2.5} dot={{ r: 4, fill: '#34c759' }} />
              </LineChart>
            </ResponsiveContainer>
          )
        }
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="table-th">Month</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Orders</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Revenue</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Avg Order</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}
                onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="table-td">{r.MONTH_LABEL}</td>
                <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.ORDER_COUNT}</td>
                <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${Number(r.TOTAL_REVENUE).toFixed(2)}</td>
                <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${Number(r.AVG_ORDER_VALUE ?? 0).toFixed(2)}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '32px 0' }}>No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Best Sellers ──────────────────────────────────────── */
function BestSellersReport({ dateFrom, dateTo }) {
  const [data, setData] = useState([])

  const fetch = useCallback(() => {
    const p = {}
    if (dateFrom) p.date_from = dateFrom
    if (dateTo)   p.date_to   = dateTo
    getBestSellers(p).then(r => setData(r.data)).catch(() => {})
  }, [dateFrom, dateTo])

  useEffect(() => { fetch() }, [fetch])

  const top5 = data.slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <SectionTitle onExport={() => exportCSV(data, 'best-sellers.csv')}>
            Best-Selling Fish — Units
          </SectionTitle>
          {top5.length === 0
            ? <EmptyState />
            : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={top5} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID} horizontal={false} />
                  <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis dataKey="PRODUCT_NAME" type="category" width={130} tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="TOTAL_SOLD" name="Units Sold" fill="#32ade6" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>
        <div className="card">
          <SectionTitle>Revenue Share</SectionTitle>
          {top5.length === 0
            ? <EmptyState />
            : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={top5} dataKey="TOTAL_REVENUE" nameKey="PRODUCT_NAME"
                    cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#d1d1d6' }}>
                    {top5.map((_, i) => <Cell key={i} fill={APPLE_COLORS[i % APPLE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={v => `$${Number(v).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="table-th">Product</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Units Sold</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Revenue</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Orders</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}
                onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="table-td" style={{ fontWeight: 500 }}>{r.PRODUCT_NAME}</td>
                <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.TOTAL_SOLD}</td>
                <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${Number(r.TOTAL_REVENUE ?? 0).toFixed(2)}</td>
                <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.ORDER_COUNT}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '32px 0' }}>No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Profit ────────────────────────────────────────────── */
function ProfitReport({ dateFrom, dateTo }) {
  const [data, setData] = useState([])

  const fetch = useCallback(() => {
    const p = {}
    if (dateFrom) p.date_from = dateFrom
    if (dateTo)   p.date_to   = dateTo
    getProfitReport(p).then(r => setData(r.data)).catch(() => {})
  }, [dateFrom, dateTo])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.018em' }}>
          Profit Analysis by Order
        </div>
        <button className="btn-secondary" onClick={() => exportCSV(data, 'profit-analysis.csv')}>
          <Download size={12} /> CSV
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th className="table-th">Order #</th>
            <th className="table-th">Customer</th>
            <th className="table-th" style={{ textAlign: 'right' }}>Revenue</th>
            <th className="table-th" style={{ textAlign: 'right' }}>COGS</th>
            <th className="table-th" style={{ textAlign: 'right' }}>Profit</th>
            <th className="table-th" style={{ textAlign: 'right' }}>Margin</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i}
              onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td className="table-td" style={{ fontFamily: 'monospace', color: '#0071e3', fontWeight: 600 }}>#{r.ORDER_ID}</td>
              <td className="table-td">{r.CUSTOMER_NAME ?? r.CUSTOMER_ID}</td>
              <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${Number(r.REVENUE ?? 0).toFixed(2)}</td>
              <td className="table-td" style={{ textAlign: 'right', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>${Number(r.COGS ?? 0).toFixed(2)}</td>
              <td className="table-td" style={{
                textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                color: Number(r.PROFIT ?? 0) >= 0 ? '#1c7737' : '#c0392b',
              }}>
                ${Number(r.PROFIT ?? 0).toFixed(2)}
              </td>
              <td className="table-td" style={{ textAlign: 'right', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>
                {r.MARGIN_PCT ? `${Number(r.MARGIN_PCT).toFixed(1)}%` : '—'}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={6} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '40px 0' }}>No orders</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Fast Movers ───────────────────────────────────────── */
function FastMoversReport({ dateFrom, dateTo }) {
  const [data, setData] = useState([])

  const fetch = useCallback(() => {
    const p = {}
    if (dateFrom) p.date_from = dateFrom
    if (dateTo)   p.date_to   = dateTo
    getFastMovers(p).then(r => setData(r.data)).catch(() => {})
  }, [dateFrom, dateTo])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <SectionTitle onExport={() => exportCSV(data, 'fast-movers.csv')}>
          Fast Movers — Top 10
        </SectionTitle>
        {data.length === 0
          ? <EmptyState />
          : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.slice(0, 10)} margin={{ top: 0, right: 20, left: -16, bottom: 48 }}>
                <CartesianGrid {...GRID} vertical={false} />
                <XAxis dataKey="PRODUCT_NAME" tick={{ ...TICK, fontSize: 10 }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="UNITS_SOLD_30D" name="Units (30d)" fill="#bf5af2" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Drill-down table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="table-th">Product</th>
              <th className="table-th">Type</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Units (30d)</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Revenue (30d)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}
                onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="table-td" style={{ fontWeight: 500 }}>{r.PRODUCT_NAME}</td>
                <td className="table-td" style={{ fontSize: 11, color: '#6e6e73' }}>{r.PRODUCT_TYPE ?? '—'}</td>
                <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.UNITS_SOLD_30D}</td>
                <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${Number(r.REVENUE_30D ?? 0).toFixed(2)}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '32px 0' }}>No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Stock Movements ───────────────────────────────────── */
function MovementsReport({ dateFrom, dateTo }) {
  const [data,       setData] = useState([])
  const [typeFilter, setType] = useState('')

  const fetch = useCallback(() => {
    const p = {}
    if (typeFilter) p.type     = typeFilter
    if (dateFrom)   p.date_from = dateFrom
    if (dateTo)     p.date_to   = dateTo
    getStockMovements(p).then(r => setData(r.data)).catch(() => {})
  }, [typeFilter, dateFrom, dateTo])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <select className="input" style={{ width: 180 }} value={typeFilter} onChange={e => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="SALE">SALE</option>
          <option value="PURCHASE">PURCHASE</option>
          <option value="RETURN">RETURN</option>
          <option value="ADJUSTMENT">ADJUSTMENT</option>
          <option value="WRITE_OFF">WRITE_OFF</option>
        </select>
        <button className="btn-secondary" onClick={() => exportCSV(data, 'stock-movements.csv')}>
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="table-th">Product</th>
              <th className="table-th">Type</th>
              <th className="table-th" style={{ textAlign: 'right' }}>Delta</th>
              <th className="table-th" style={{ textAlign: 'right' }}>After</th>
              <th className="table-th">Reference</th>
              <th className="table-th">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}
                onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="table-td" style={{ fontWeight: 500 }}>{r.PRODUCT_NAME}</td>
                <td className="table-td" style={{ fontSize: 11, color: '#6e6e73' }}>{r.MOVEMENT_TYPE}</td>
                <td className="table-td" style={{
                  textAlign: 'right', fontFamily: 'monospace', fontWeight: 600,
                  color: r.QUANTITY_DELTA > 0 ? '#1c7737' : '#c0392b',
                }}>
                  {r.QUANTITY_DELTA > 0 ? '+' : ''}{r.QUANTITY_DELTA}
                </td>
                <td className="table-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6e6e73' }}>{r.QTY_AFTER}</td>
                <td className="table-td" style={{ fontSize: 12, color: '#8e8e93' }}>
                  {r.REFERENCE_TYPE ? `${r.REFERENCE_TYPE} #${r.REFERENCE_ID}` : '—'}
                </td>
                <td className="table-td" style={{ fontSize: 11, color: '#aeaeb2', whiteSpace: 'nowrap' }}>{r.MOVED_AT}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={6} className="table-td" style={{ textAlign: 'center', color: '#aeaeb2', padding: '40px 0' }}>No movements</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
