import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Fish, ShoppingCart, BookOpen, Waves, ClipboardList, ChevronDown, X, Search } from 'lucide-react'
import { useShop } from '../context/ShopContext'
import { getCustomers } from '../api/client'

export default function ShopLayout() {
  const { customer, setCustomer, cartCount } = useShop()
  const [showPicker, setShowPicker] = useState(!customer)
  const [customers,  setCustomers]  = useState([])
  const [search,     setSearch]     = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getCustomers({}).then(r => setCustomers(r.data)).catch(() => {})
  }, [])

  const filtered = customers.filter(c =>
    `${c.FIRST_NAME} ${c.LAST_NAME}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.EMAIL ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const pick = (c) => {
    setCustomer({ id: c.CUSTOMER_ID, name: `${c.FIRST_NAME} ${c.LAST_NAME}` })
    setShowPicker(false)
  }

  const NAV = [
    { to: '/shop',         label: 'Home',    icon: BookOpen,      end: true },
    { to: '/shop/browse',  label: 'Browse',  icon: Search },
    { to: '/shop/builder', label: 'Builder', icon: Waves },
    { to: '/shop/orders',  label: 'My Orders', icon: ClipboardList },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 28px', height: 56,
        gap: 24,
      }}>
        {/* Brand */}
        <NavLink to="/shop" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: '#0071e3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Fish size={17} color="white" strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>AquaScape</span>
        </NavLink>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, textDecoration: 'none',
              fontSize: 13, fontWeight: 500,
              color: isActive ? '#0071e3' : '#3a3a3c',
              background: isActive ? 'rgba(0,113,227,0.08)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Customer badge + cart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowPicker(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 20, border: '1px solid #d1d1d6',
              background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              color: customer ? '#1d1d1f' : '#8e8e93',
            }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: customer ? '#0071e3' : '#e5e5ea',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: customer ? 'white' : '#8e8e93', fontSize: 10, fontWeight: 700,
            }}>
              {customer ? customer.name.charAt(0).toUpperCase() : '?'}
            </div>
            {customer ? customer.name : 'Select account'}
            <ChevronDown size={12} color="#8e8e93" />
          </button>

          <NavLink to="/shop/cart" style={{ position: 'relative', display: 'flex', color: '#1d1d1f' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <ShoppingCart size={17} />
            </div>
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#ff3b30', color: 'white',
                fontSize: 9, fontWeight: 700, borderRadius: '50%',
                width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{cartCount > 99 ? '99+' : cartCount}</span>
            )}
          </NavLink>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, padding: '28px 28px 48px' }}>
        {!customer && (
          <div style={{
            background: 'rgba(0,113,227,0.06)', border: '1px solid rgba(0,113,227,0.2)',
            borderRadius: 12, padding: '12px 18px', marginBottom: 20,
            fontSize: 13, color: '#0071e3', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Fish size={14} />
            Please select your account above to start shopping and save your cart.
          </div>
        )}
        <Outlet />
      </main>

      {/* Admin link strip */}
      <div style={{
        borderTop: '1px solid #e5e5ea', padding: '10px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'white', fontSize: 11, color: '#aeaeb2',
      }}>
        <span>AquaScape Customer Store</span>
        <NavLink to="/dashboard" style={{ color: '#0071e3', textDecoration: 'none', fontSize: 11 }}>
          Admin Panel →
        </NavLink>
      </div>

      {/* Customer picker modal */}
      {showPicker && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Choose your account</span>
              {customer && (
                <button onClick={() => setShowPicker(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 4 }}>
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aeaeb2' }} />
                <input className="input" style={{ paddingLeft: 32 }} placeholder="Search by name or email…"
                  value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filtered.map(c => (
                  <button key={c.CUSTOMER_ID}
                    onClick={() => pick(c)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 10, border: 'none', background: 'none',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: '#0071e3',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {c.FIRST_NAME.charAt(0)}{c.LAST_NAME.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                        {c.FIRST_NAME} {c.LAST_NAME}
                        {c.CUSTOMER_TIER && (
                          <span className={`badge s-${c.CUSTOMER_TIER === 'VIP' ? 'yellow' : c.CUSTOMER_TIER === 'REGULAR' ? 'blue' : 'gray'}`}
                            style={{ marginLeft: 8, fontSize: 9 }}>
                            {c.CUSTOMER_TIER}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#8e8e93' }}>{c.EMAIL}</div>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#aeaeb2', padding: '24px 0', fontSize: 13 }}>
                    No customers found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
