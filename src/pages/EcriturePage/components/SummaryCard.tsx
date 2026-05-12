import { Label } from '../primitives'

export function SummaryCard({
  label,
  n,
  unit,
  legend,
  accent,
}: {
  label: string
  n: string | number
  unit?: string
  legend: string
  accent?: boolean
}) {
  return (
    <div style={{
      background: 'var(--paper-1)',
      border: '1px solid var(--paper-2)',
      borderRadius: 12,
      padding: '18px 20px 16px',
    }}>
      <Label style={{ display: 'block', marginBottom: 12 }}>{label}</Label>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 40,
          fontWeight: 500,
          color: accent ? 'var(--terra)' : 'var(--ink)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>{n}</span>
        {unit && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
            {unit}
          </span>
        )}
      </div>
      <span style={{
        display: 'block',
        marginTop: 8,
        fontFamily: 'var(--font-sans)',
        fontStyle: 'italic',
        fontSize: 13,
        color: 'var(--ink-3)',
      }}>{legend}</span>
    </div>
  )
}
