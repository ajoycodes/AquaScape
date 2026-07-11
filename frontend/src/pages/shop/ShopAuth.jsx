import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Fish, Mail, Lock, User, ArrowRight } from 'lucide-react'
import { useShop } from '../../context/ShopContext'

export default function ShopAuth({ mode: initialMode = 'login' }) {
  const { login, register } = useShop()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/shop'

  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else                  await register(form)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputWrap = { position: 'relative' }
  const iconStyle = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aeaeb2' }
  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '11px 12px 11px 38px',
    borderRadius: 10, border: '1px solid #d1d1d6', fontSize: 14, outline: 'none',
    background: 'white',
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#16150F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Fish size={28} color="white" strokeWidth={2} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em' }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </div>
            <div style={{ fontSize: 13, color: '#8e8e93', marginTop: 4 }}>
              {mode === 'login'
                ? 'Sign in to shop, build aquariums and track orders'
                : 'Join AquaScape to start building your dream aquarium'}
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: 18, padding: '28px 26px',
          border: '1px solid #e5e5ea', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {error && (
              <div style={{
                background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)',
                borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#d70015',
              }}>
                {error}
              </div>
            )}

            {mode === 'register' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={inputWrap}>
                  <User size={15} style={iconStyle} />
                  <input style={inputStyle} placeholder="First name" value={form.first_name} onChange={set('first_name')} required autoFocus />
                </div>
                <div style={inputWrap}>
                  <User size={15} style={iconStyle} />
                  <input style={inputStyle} placeholder="Last name" value={form.last_name} onChange={set('last_name')} required />
                </div>
              </div>
            )}

            <div style={inputWrap}>
              <Mail size={15} style={iconStyle} />
              <input style={inputStyle} type="email" placeholder="Email address" value={form.email} onChange={set('email')} required autoFocus={mode === 'login'} autoComplete="email" />
            </div>

            <div style={inputWrap}>
              <Lock size={15} style={iconStyle} />
              <input style={inputStyle} type="password"
                placeholder={mode === 'register' ? 'Password (min 6 characters)' : 'Password'}
                value={form.password} onChange={set('password')} required minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: loading ? 'rgba(22,21,15,0.5)' : '#16150F',
                color: 'white', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {loading
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>
        </div>

        {/* Switch mode */}
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#6e6e73' }}>
          {mode === 'login' ? (
            <>New to AquaScape?{' '}
              <button onClick={() => { setMode('register'); setError('') }}
                style={{ background: 'none', border: 'none', color: '#16150F', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
                Create an account
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError('') }}
                style={{ background: 'none', border: 'none', color: '#16150F', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
                Sign in
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 22, fontSize: 11, color: '#aeaeb2' }}>
          Demo account: <span style={{ fontFamily: 'monospace', color: '#8e8e93' }}>priya.nair@email.com / fish123</span>
        </div>
      </div>
    </div>
  )
}
