import { useState } from 'react'

// ─── Label ────────────────────────────────────────────────────────────────────

export function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
      ...style,
    }}>{children}</span>
  )
}

// ─── Num ──────────────────────────────────────────────────────────────────────

export function Num({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--ink)',
      letterSpacing: '0.01em',
      ...style,
    }}>{children}</span>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeTone = 'default' | 'terra' | 'sauge' | 'ink'

const BADGE_TONES: Record<BadgeTone, { bg: string; color: string }> = {
  default: { bg: 'var(--paper-2)',    color: 'var(--ink-2)' },
  terra:   { bg: 'var(--terra-soft)', color: '#6B2F14'      },
  sauge:   { bg: 'var(--sage-soft)',  color: '#3F5A3C'      },
  ink:     { bg: 'var(--ink)',        color: 'var(--paper-1)' },
}

export function Badge({ tone, children }: { tone?: BadgeTone; children: React.ReactNode }) {
  const t = BADGE_TONES[tone ?? 'default']
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: '3px 8px',
      borderRadius: 4,
      background: t.bg,
      color: t.color,
    }}>{children}</span>
  )
}

// ─── Btn ──────────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type BtnSize = 'sm' | 'md'

const BTN_BASE: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  lineHeight: 1.2,
}

const BTN_VARIANTS: Record<BtnVariant, React.CSSProperties> = {
  primary:   { background: 'var(--terra)',     color: 'var(--paper-1)', border: '1px solid transparent' },
  secondary: { background: 'transparent',      color: 'var(--ink)',     border: '1px solid var(--ink-4)' },
  ghost:     { background: 'transparent',      color: 'var(--ink-2)',   border: 0 },
  danger:    { background: 'transparent',      color: 'var(--danger)',  border: '1px solid var(--ink-4)' },
}

export function Btn({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  style,
}: {
  variant?: BtnVariant
  size?: BtnSize
  children: React.ReactNode
  onClick?: () => void
  style?: React.CSSProperties
}) {
  const [hover, setHover] = useState(false)
  const sizeStyle: React.CSSProperties = {
    fontSize: size === 'sm' ? 13 : 14,
    padding: size === 'sm' ? '6px 12px' : '8px 16px',
  }
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...BTN_BASE,
        ...sizeStyle,
        ...BTN_VARIANTS[variant],
        opacity: hover ? 0.88 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
