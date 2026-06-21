import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Fish, Lock } from 'lucide-react'

export default function Login() {
  const { user, loginAdmin } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const submit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTimeout(() => {
      const ok = loginAdmin(username, password)
      if (ok) navigate('/dashboard', { replace: true })
      else   { setError('Invalid username or password'); setLoading(false) }
    }, 300) // tiny delay for UX feel
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #0d2b52 60%, #0a3d6e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20,
        padding: '36px 32px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#0071e3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Fish size={28} color="white" strokeWidth={2} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.03em' }}>AquaScape</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Admin Panel</div>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{
              background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.4)',
              borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#ff6b6b',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Lock size={12} /> {error}
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Username
            </label>
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              autoFocus required autoComplete="username"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '10px 12px', fontSize: 14,
                color: 'white', outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '10px 12px', fontSize: 14,
                color: 'white', outline: 'none',
              }}
            />
          </div>
          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: loading ? 'rgba(0,113,227,0.5)' : '#0071e3',
              color: 'white', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
            }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Demo credentials: <span style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>admin / admin</span>
        </div>
      </div>
    </div>
  )
}
