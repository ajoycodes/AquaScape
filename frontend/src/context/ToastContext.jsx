import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

let _nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const toast = useCallback((msg, type = 'info', duration = 3000) => {
    const id = ++_nextId
    setToasts(t => [...t, { id, msg, type }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const success = useCallback((msg, d) => toast(msg, 'success', d), [toast])
  const error   = useCallback((msg, d) => toast(msg, 'error',   d ?? 4500), [toast])
  const info    = useCallback((msg, d) => toast(msg, 'info',    d), [toast])
  const warn    = useCallback((msg, d) => toast(msg, 'warn',    d), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warn }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

const TYPE_STYLE = {
  success: { bg: '#1c3a28', border: '#34c759', icon: '✓' },
  error:   { bg: '#3a1c1c', border: '#ff3b30', icon: '✕' },
  warn:    { bg: '#3a2e0a', border: '#ff9500', icon: '!' },
  info:    { bg: '#1c2a3a', border: '#0071e3', icon: 'i' },
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const s = TYPE_STYLE[t.type] ?? TYPE_STYLE.info
        return (
          <div key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 12, padding: '11px 18px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              fontSize: 13, fontWeight: 500, color: 'white',
              pointerEvents: 'all', cursor: 'pointer',
              maxWidth: 420, animation: 'fadeSlideUp 0.2s ease',
            }}
            onClick={() => onDismiss(t.id)}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: s.border, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 900, flexShrink: 0,
            }}>{s.icon}</span>
            {t.msg}
          </div>
        )
      })}
    </div>
  )
}
