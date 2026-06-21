import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  getDashboard, getMonthlySales, getBestSellers,
} from '../api/client'
import { Package, ShoppingCart, AlertTriangle, TrendingUp, Users, Truck, Clock, Layers, RefreshCw } from 'lucide-react'

const KPI_CONFIG = [
  { key: 'TOTAL_PRODUCTS',       label: 'Products',           icon: Package,       color: '#0071e3', bg: '#e3f0fd' },
  { key: 'ORDERS_THIS_MONTH',    label: 'Orders This Month',  icon: ShoppingCart,  color: '#34c759', bg: '#e8f8ed' },
  { key: 'REVENUE_THIS_MONTH',   label: 'Revenue This Month', icon: TrendingUp,    color: '#bf5af2', bg: '#f4eaff', money: true },
  { key: 'OPEN_LOW_STOCK_ALERTS',label: 'Low Stock Alerts',   icon: AlertTriangle, color: '#ff9500', bg: '#fff0d9' },
]

const KPI_CONFIG2 = [
  { key: 'TOTAL_CUSTOMERS', label: 'Customers',      icon: Users,    color: '#32ade6', bg: '#e5f6ff' },
  { key: 'TOTAL_SUPPLIERS', label: 'Suppliers',      icon: Truck,    color: '#ff3b30', bg: '#fff0ef' },
  { key: 'PENDING_ORDERS',  label: 'Pending Orders', icon: Clock,    color: '#ff9500', bg: '#fff0d9' },
  { key: 'ACTIVE_SETUPS',   label: 'Active Setups',  icon: Layers,   color: '#34c759', bg: '#e8f8ed' },
]

export default function Dashboard() {
  const [kpis,        setKpis]        = useState(null)
  const [monthly,     setMonthly]     = useState([])
  const [topFish,     setTopFish]     = useState([])
  const [error,       setError]       = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [refreshing,  setRefreshing]  = useState(false)

  const load = useCallback(() => {
    setRefreshing(true)
    Promise.all([getDashboard(), getMonthlySales(), getBestSellers()])
      .then(([d, m, b]) => {
        setKpis(d.data[0])
        setMonthly(m.data.slice(-6))
        setTopFish(b.data.slice(0, 5))
        setLastRefresh(new Date())
      })
      .catch(e => setError(e.message))
      .finally(() => setRefreshing(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (error) return <div style={{ color: '#ff3b30', padding: 16, fontSize: 13 }}>{error}</div>
  if (!kpis)  return <LoadingState />

  const K = k => kpis[k] ?? kpis[k.toUpperCase()] ?? '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Refresh controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        {lastRefresh && (
          <span style={{ fontSize: 11, color: '#aeaeb2' }}>
            Refreshed {lastRefresh.toLocaleTimeString()}
          </span>
        )}
        <button
          className="btn-secondary"
          onClick={load}
          disabled={refreshing}
        >
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {KPI_CONFIG.map(({ key, label, icon: Icon, color, bg, money }) => (
          <div key={key} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={18} color={color} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {money ? `$${Number(K(key) || 0).toFixed(0)}` : K(key)}
              </div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 4, letterSpacing: '-0.01em' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Monthly revenue bar chart */}
        <div className="card">
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.018em' }}>
              Monthly Sales — Last 6 Months
            </div>
          </div>
          {monthly.length === 0
            ? <EmptyChart />
            : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthly} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f2" vertical={false} />
                  <XAxis dataKey="MONTH_LABEL" tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #e5e5ea', borderRadius: 10, fontSize: 12 }}
                    formatter={v => [`$${Number(v).toFixed(2)}`, 'Revenue']}
                  />
                  <Bar dataKey="TOTAL_REVENUE" fill="#0071e3" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Top 5 fish horizontal */}
        <div className="card">
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.018em' }}>
              Top 5 Best-Selling Fish
            </div>
          </div>
          {topFish.length === 0
            ? <EmptyChart />
            : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={topFish} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f2" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="PRODUCT_NAME" type="category" width={130} tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #e5e5ea', borderRadius: 10, fontSize: 12 }}
                  />
                  <Bar dataKey="TOTAL_SOLD" name="Units Sold" fill="#32ade6" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {/* KPI row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {KPI_CONFIG2.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={16} color={color} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.025em', lineHeight: 1 }}>
                {K(key)}
              </div>
              <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: '#aeaeb2', fontSize: 13 }}>
      Loading…
    </div>
  )
}

function EmptyChart() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, color: '#aeaeb2', fontSize: 13 }}>
      No data available
    </div>
  )
}
