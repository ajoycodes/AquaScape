import { Droplets, AlertTriangle, X } from 'lucide-react'

// Error banner for the aquarium builder.
// Compatibility rule violations (water type, capacity, temperature) get a
// friendly amber card; everything else stays a plain red error strip.
export default function BuilderAlert({ error, onDismiss }) {
  if (!error) return null

  const isCompat = error.code === 'COMPATIBILITY'
  const message  = error.message ?? String(error)

  if (!isCompat) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        color: '#d70015', fontSize: 13, background: '#fff2f2',
        border: '1px solid rgba(255,59,48,0.2)', borderRadius: 12, padding: '11px 14px',
      }}>
        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{message}</span>
        {onDismiss && (
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d70015', padding: 2, display: 'flex' }}>
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      background: 'linear-gradient(135deg, #fff8ed, #fff3e0)',
      border: '1px solid rgba(255,149,0,0.3)', borderRadius: 14,
      padding: '14px 16px',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, background: '#ffe8cc', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Droplets size={19} color="#e07800" strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#8a4b00', marginBottom: 3 }}>
          Not compatible with this setup
        </div>
        <div style={{ fontSize: 12.5, color: '#a05e10', lineHeight: 1.55 }}>
          {message}
        </div>
        <div style={{ fontSize: 11.5, color: '#c08840', marginTop: 6 }}>
          Checked live by the database — try a different species, or adjust your tank's water type.
        </div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c08840', padding: 2, display: 'flex', flexShrink: 0 }}>
          <X size={15} />
        </button>
      )}
    </div>
  )
}
