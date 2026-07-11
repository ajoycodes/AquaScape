import { Fish, Leaf, Box, Zap, Gem, ShoppingCart } from 'lucide-react'

// Muted type palette — chip background + icon/label tone (AquaSense style)
const TYPE_STYLE = {
  FISH:       { icon: Fish, chip: '#E8F1F5', tone: '#33607E' },
  PLANT:      { icon: Leaf, chip: '#E6F3F1', tone: '#2A6B60' },
  TANK:       { icon: Box,  chip: '#EDF0F4', tone: '#4A5C6E' },
  EQUIPMENT:  { icon: Zap,  chip: '#F0EDF6', tone: '#61548A' },
  DECORATION: { icon: Gem,  chip: '#FBF3E4', tone: '#8A6A24' },
}

export default function ProductCard({ product: p, onAdd, onOpen, loading }) {
  const { icon: Icon, chip, tone } = TYPE_STYLE[p.PRODUCT_TYPE] ?? { icon: Gem, chip: '#F1EFE9', tone: '#75726A' }
  const inStock = (p.QTY_ON_HAND ?? 0) > 0

  return (
    <div
      onClick={onOpen}
      style={{
        background: 'white', border: '1px solid var(--border, #EAE7DF)', borderRadius: 16,
        padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 1px 2px rgba(22,21,15,0.03)',
        cursor: onOpen ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(22,21,15,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(22,21,15,0.03)' }}
    >
      {/* Icon chip + type */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: chip,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={18} color={tone} strokeWidth={1.9} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: tone, letterSpacing: '0.04em' }}>
          {p.PRODUCT_TYPE}
        </span>
      </div>

      {/* Name + description */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text, #1C1B18)', letterSpacing: '-0.015em', lineHeight: 1.3 }}>
          {p.PRODUCT_NAME}
        </div>
        {p.DESCRIPTION && (
          <div style={{
            fontSize: 12.5, color: 'var(--text-2, #75726A)', marginTop: 5, lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {p.DESCRIPTION}
          </div>
        )}
      </div>

      {/* Price + stock + add */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text, #1C1B18)', letterSpacing: '-0.03em' }}>
            ${Number(p.UNIT_PRICE).toFixed(2)}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: inStock ? 'var(--good, #1F7A45)' : 'var(--bad, #C0392B)', marginTop: 2 }}>
            {inStock ? `${p.QTY_ON_HAND} in stock` : 'Out of stock'}
          </div>
        </div>
        {onAdd && (
          <button
            onClick={e => { e.stopPropagation(); onAdd(p) }}
            disabled={!inStock || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 16px', height: 36, borderRadius: 11, border: 'none',
              background: !inStock ? '#EFEDE6' : 'var(--ink, #16150F)',
              color: !inStock ? 'var(--text-3, #A6A299)' : 'white',
              cursor: !inStock ? 'not-allowed' : 'pointer',
              fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
              opacity: loading ? 0.6 : 1,
              transition: 'background 0.15s, opacity 0.12s',
              flexShrink: 0,
            }}>
            <ShoppingCart size={13} />
            {loading ? '…' : 'Add'}
          </button>
        )}
      </div>
    </div>
  )
}
