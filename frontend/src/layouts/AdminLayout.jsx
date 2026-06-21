import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutGrid, Box, Waves, ShoppingCart,
  Archive, ClipboardCheck, Users,
  Building2, TrendingUp, History,
  Fish, LogOut,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutGrid,     label: 'Dashboard' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/products',  icon: Box,   label: 'Products'         },
      { to: '/builder',   icon: Waves, label: 'Aquarium Builder' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/inventory', icon: Archive,        label: 'Inventory'  },
      { to: '/orders',    icon: ClipboardCheck, label: 'Orders'     },
      { to: '/customers', icon: Users,          label: 'Customers'  },
      { to: '/suppliers', icon: Building2,      label: 'Suppliers'  },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/reports', icon: TrendingUp, label: 'Reports'   },
      { to: '/audit',   icon: History,    label: 'Audit Log' },
    ],
  },
]

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items)

export default function AdminLayout() {
  const { user, logout } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f5f7' }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: '#f5f5f7',
        borderRight: '1px solid #d1d1d6',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '20px 18px 18px',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#0071e3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Fish size={20} color="white" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1 }}>
              AquaScape
            </div>
            <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 3, letterSpacing: '-0.01em' }}>
              Smart Aquarium
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: '#c7c7cc',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '12px 10px 5px',
              }}>
                {group.label}
              </div>
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 13, fontWeight: 500,
                    letterSpacing: '-0.01em',
                    textDecoration: 'none',
                    marginBottom: 2,
                    transition: 'background 0.12s',
                    background: isActive ? 'rgba(0,113,227,0.1)' : 'transparent',
                    color: isActive ? '#0071e3' : '#3a3a3c',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} strokeWidth={isActive ? 2.2 : 1.7} style={{ flexShrink: 0 }} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid #e5e5ea',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <NavLink to="/shop" style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 8px', borderRadius: 8, textDecoration: 'none',
            fontSize: 13, fontWeight: 500, color: '#0071e3',
            background: 'rgba(0,113,227,0.07)',
          }}>
            <ShoppingCart size={14} strokeWidth={1.8} /> Visit Store
          </NavLink>

          {/* User + logout */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: '#3a3a3c', fontWeight: 500 }}>{user.name}</div>
            <button
              onClick={logout}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center',
                color: '#8e8e93',
              }}
            >
              <LogOut size={14} strokeWidth={1.8} />
            </button>
          </div>

        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{
          height: 52,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid #d1d1d6',
          display: 'flex', alignItems: 'center',
          padding: '0 24px',
          flexShrink: 0,
        }}>
          <PageTitle />
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function PageTitle() {
  const { pathname } = useLocation()
  const match = ALL_NAV.find(n => pathname.startsWith(n.to))
  return (
    <h1 style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.022em' }}>
      {match?.label ?? 'AquaScape'}
    </h1>
  )
}
