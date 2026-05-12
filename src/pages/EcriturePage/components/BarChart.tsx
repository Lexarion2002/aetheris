import { Num } from '../primitives'
import type { SemaineStats } from '../data'

export function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--ink-2)',
    }}>
      <span style={{
        width: 14,
        height: 8,
        borderRadius: 2,
        background: dashed ? 'transparent' : color,
        border: dashed ? `1px dashed ${color}` : undefined,
        display: 'inline-block',
      }} />
      {label}
    </span>
  )
}

export function BarChart({ weeks, target }: { weeks: SemaineStats[]; target: number }) {
  const max = Math.max(...weeks.map(w => w.mots), target)
  const H = 180

  return (
    <div>
      <div style={{ position: 'relative', height: H, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        {/* Ligne d'objectif */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: (target / max) * H,
          borderTop: '1px dashed var(--ink-4)',
          pointerEvents: 'none',
        }} />
        <span style={{
          position: 'absolute',
          right: 0,
          bottom: (target / max) * H + 4,
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}>objectif · 6 000</span>

        {weeks.map(w => {
          const h = Math.max(4, (w.mots / max) * H)
          const isAban = w.etat === 'abandonnée'
          const isCurr = w.etat === 'en cours'
          return (
            <div
              key={w.n}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
            >
              <Num style={{ fontSize: 11, color: isAban ? 'var(--ink-3)' : 'var(--ink)', marginBottom: 6, fontWeight: 500 }}>
                {w.mots.toLocaleString('fr-FR').replace(',', ' ')}
              </Num>
              <div style={{
                width: '100%',
                height: h,
                borderRadius: '6px 6px 0 0',
                background: isCurr ? 'transparent' : (isAban ? 'var(--ink-4)' : 'var(--terra)'),
                border: isCurr ? '1.5px dashed var(--terra)' : undefined,
                transition: 'height 320ms var(--ease)',
              }} />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 10, borderTop: '1px solid var(--paper-2)', paddingTop: 8 }}>
        {weeks.map(w => (
          <div key={w.n} style={{ flex: 1, textAlign: 'center' }}>
            <Num style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
              S{String(w.n).padStart(2, '0')}
            </Num>
          </div>
        ))}
      </div>
    </div>
  )
}
