// Atomes UI réutilisés sur le hub droit + la page matière.
// FormatBadge, ConfDot, ProgressBar, MiniCheck, Label.

import type { CSSProperties, ReactNode } from 'react'
import type { Confidence } from '../../store/droitStore'

// ─── FormatBadge ──────────────────────────────────────────────────────────────
// Badge en mono SMALL CAPS — QCM, ORAL, ÉCRIT, DOSSIER, DM, RAPPORT.

type BadgeTone = 'ink' | 'soft' | 'terra'

const BADGE_TONES: Record<BadgeTone, { bg: string; border: string; color: string }> = {
  ink:   { bg: 'transparent',       border: 'var(--ink-4)', color: 'var(--ink)' },
  soft:  { bg: 'var(--paper-2)',    border: 'var(--paper-2)', color: 'var(--ink-2)' },
  terra: { bg: 'var(--terra-soft)', border: '#DEB89C',      color: 'var(--terra-deep)' },
}

export function FormatBadge({ children, tone = 'ink' }: { children: ReactNode; tone?: BadgeTone }) {
  const t = BADGE_TONES[tone]
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
      textTransform: 'uppercase', padding: '2px 7px', borderRadius: 3,
      background: t.bg, border: `1px solid ${t.border}`, color: t.color,
      fontWeight: 500, lineHeight: 1.4, whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>
      {children}
    </span>
  )
}

// ─── ConfDot ──────────────────────────────────────────────────────────────────
// Pastille colorée pour la confiance.

const CONF_COLORS: Record<Confidence, string> = {
  red:   'var(--danger)',
  amber: 'var(--warn)',
  green: 'var(--sage)',
}

const CONF_RING: Record<Confidence, string> = {
  red:   'rgba(155, 58, 28, 0.12)',
  amber: 'rgba(192, 106, 47, 0.12)',
  green: 'rgba(126, 154, 122, 0.16)',
}

export function ConfDot({ tone, size = 9, ring = false }: { tone: Confidence; size?: number; ring?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block', width: size, height: size, borderRadius: 999,
        background: CONF_COLORS[tone], flexShrink: 0,
        boxShadow: ring ? `0 0 0 3px ${CONF_RING[tone]}` : 'none',
      }}
    />
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

export function ProgressBar({ value, height = 4, style }: { value: number; height?: number; style?: CSSProperties }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div style={{
      width: '100%', height, background: 'var(--paper-2)',
      borderRadius: 999, overflow: 'hidden', ...style,
    }}>
      <div style={{
        width: `${clamped}%`, height: '100%',
        background: 'var(--ink)', borderRadius: 999,
        transition: 'width var(--dur) var(--ease)',
      }} />
    </div>
  )
}

// ─── MiniCheck ────────────────────────────────────────────────────────────────
// Checkbox carrée 14px utilisée dans le tableau de sujets.

export function MiniCheck({
  checked, onClick, label,
}: { checked: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={checked}
      style={{
        width: 14, height: 14, padding: 0, cursor: 'pointer',
        border: '1px solid ' + (checked ? 'var(--ink)' : 'var(--ink-4)'),
        background: checked ? 'var(--ink)' : 'transparent',
        borderRadius: 3,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
        flexShrink: 0,
      }}
    >
      {checked && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M1.5 4.5L3.5 6.5L7.5 2"
            stroke="var(--paper-1)" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

// ─── ML (mono label) ──────────────────────────────────────────────────────────
// Petit label mono SMALL CAPS espacé, réutilisé partout pour les section-heads.

export function ML({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--ink-3)', lineHeight: 1,
      ...style,
    }}>
      {children}
    </span>
  )
}
