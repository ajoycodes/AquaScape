import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { Fish, ShoppingCart, BookOpen, Waves, ClipboardList, Search, LogOut, ChevronDown } from 'lucide-react'
import { useShop } from '../context/ShopContext'

export default function ShopLayout() {
  const { customer, logout, cartCount } = useShop()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const NAV = [
    { to: '/shop',         label: 'Home',      icon: BookOpen, end: true },
    { to: '/shop/browse',  label: 'Browse',    icon: Search },
    { to: '/shop/builder', label: 'Builder',   icon: Waves },
    { to: '/shop/orders',  label: 'My Orders', icon: ClipboardList },
  ]

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/shop')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(247,245,241,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 28px', height: 56,
        gap: 24,
      }}>
        {/* Brand */}
        <NavLink to="/shop" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: '#16150F',
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
              color: isActive ? '#16150F' : '#3a3a3c',
              background: isActive ? 'rgba(22,21,15,0.08)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Account + cart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {customer ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 12px', borderRadius: 20, border: '1px solid #d1d1d6',
                  background: 'white', cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
                  color: '#1d1d1f',
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: '#16150F',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 10, fontWeight: 700,
                }}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                {customer.name}
                <ChevronDown size={12} color="#8e8e93" />
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'white', borderRadius: 12, border: '1px solid #e5e5ea',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: 200, padding: 6,
                  zIndex: 200,
                }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid #f2f2f2' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{customer.name}</div>
                    <div style={{ fontSize: 11.5, color: '#8e8e93', marginTop: 2 }}>{customer.email}</div>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/shop/orders') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '9px 12px', borderRadius: 8, border: 'none', background: 'none',
                      cursor: 'pointer', fontSize: 13, color: '#1d1d1f', textAlign: 'left',
                    }}>
                    <ClipboardList size={14} color="#6e6e73" /> My Orders
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '9px 12px', borderRadius: 8, border: 'none', background: 'none',
                      cursor: 'pointer', fontSize: 13, color: '#d70015', textAlign: 'left',
                    }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/shop/login', { state: { from: location.pathname } })}
              style={{
                padding: '7px 16px', borderRadius: 20, border: 'none',
                background: '#16150F', color: 'white', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
              }}>
              Sign In
            </button>
          )}

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
        <Outlet />
      </main>

      {/* Admin link strip */}
      <div style={{
        borderTop: '1px solid #e5e5ea', padding: '10px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'white', fontSize: 11, color: '#aeaeb2',
      }}>
        <span>AquaScape Customer Store</span>
        <NavLink to="/dashboard" style={{ color: '#16150F', textDecoration: 'none', fontSize: 11 }}>
          Admin Panel →
        </NavLink>
      </div>
    </div>
  )
}
