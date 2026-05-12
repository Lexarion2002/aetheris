import { Num } from '../primitives'

export function StatChip({ n, unit }: { n: string | number; unit: string }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 8,
      padding: '8px 14px',
      borderRadius: 999,
      background: 'var(--paper-1)',
      border: '1px solid var(--paper-2)',
    }}>
      <Num style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{n}</Num>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>{unit}</span>
    </div>
  )
}
