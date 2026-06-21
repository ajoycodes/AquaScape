/**
 * OracleBadge — shows which Oracle DB object backs a UI action.
 *
 * Usage:
 *   <OracleBadge type="PROCEDURE" name="PLACE_ORDER" />
 *   <OracleBadge type="VIEW" name="VW_DASHBOARD_KPIS" detail="Real-time KPI roll-up" />
 *   <OracleBadge type="TRIGGER" name="TRG_DEDUCT_STOCK" inline />
 */

const TYPE_CONFIG = {
  PROCEDURE: { color: '#bf5af2', bg: 'rgba(191,90,242,0.12)', label: 'PROC' },
  FUNCTION:  { color: '#ff9500', bg: 'rgba(255,149,0,0.12)',  label: 'FUNC' },
  TRIGGER:   { color: '#ff3b30', bg: 'rgba(255,59,48,0.12)',  label: 'TRG'  },
  VIEW:      { color: '#0071e3', bg: 'rgba(0,113,227,0.10)',  label: 'VIEW' },
  TABLE:     { color: '#34c759', bg: 'rgba(52,199,89,0.12)',  label: 'TBL'  },
  INDEX:     { color: '#32ade6', bg: 'rgba(50,173,230,0.12)', label: 'IDX'  },
}

export default function OracleBadge({ type, name, detail, inline = false, style: extStyle }) {
  const cfg = TYPE_CONFIG[type?.toUpperCase()] ?? TYPE_CONFIG.TABLE

  if (inline) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: cfg.bg, border: `1px solid ${cfg.color}22`,
        borderRadius: 6, padding: '2px 7px',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
        color: cfg.color, fontFamily: 'monospace',
        whiteSpace: 'nowrap', ...extStyle,
      }}>
        <span style={{ opacity: 0.7, fontSize: 9 }}>{cfg.label}</span>
        {name}
      </span>
    )
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
      borderRadius: 8, padding: '5px 10px',
      ...extStyle,
    }}>
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
        color: cfg.color, opacity: 0.9, textTransform: 'uppercase',
        fontFamily: 'monospace',
      }}>
        {type}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700, color: cfg.color,
        fontFamily: 'monospace', letterSpacing: '0.03em',
      }}>
        {name}
      </span>
      {detail && (
        <span style={{ fontSize: 11, color: cfg.color, opacity: 0.75 }}>
          — {detail}
        </span>
      )}
    </div>
  )
}

/** Small cluster of badges, stacked or inline.
 *  Pass inline prop to force all badges into pill mode. */
export function OracleBadgeGroup({ badges, inline, style }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, ...style }}>
      {badges.map((b, i) => (
        <OracleBadge key={i} {...b} inline={b.inline ?? inline} />
      ))}
    </div>
  )
}
