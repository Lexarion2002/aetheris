import { Label } from '../primitives'
import type { Fragment } from '../data'

interface Props extends Fragment {
  kind: 'idee' | 'alt'
}

export function FragmentCard({ kind, titre, corps }: Props) {
  const isIdee = kind === 'idee'
  return (
    <div style={{
      background: 'var(--paper-1)',
      borderRadius: 10,
      border: '1px solid var(--paper-2)',
      padding: '14px 16px 16px',
      borderLeft: `3px solid ${isIdee ? 'var(--terra)' : 'var(--ink-4)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Label style={{ color: isIdee ? 'var(--terra)' : 'var(--ink-3)' }}>
          {isIdee ? 'idée' : 'alternative'}
        </Label>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
          {titre}
        </span>
      </div>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 14.5,
        color: 'var(--ink-2)',
        lineHeight: 1.45,
        margin: 0,
      }}>{corps}</p>
    </div>
  )
}
