import { useState } from 'react'
import { Num, Badge } from '../primitives'
import type { NouvellePassee } from '../data'

function Stars({ value, disabled }: { value: number; disabled: boolean }) {
  return (
    <div style={{
      display: 'inline-flex',
      gap: 2,
      fontFamily: 'var(--font-serif)',
      fontSize: 16,
      color: disabled ? 'var(--ink-4)' : 'var(--terra)',
      letterSpacing: '0.05em',
    }}>
      {value === 0 ? (
        <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', fontSize: 13, fontStyle: 'italic' }}>—</span>
      ) : (
        [1, 2, 3, 4, 5].map(i => (
          <span key={i} style={{ opacity: i <= value ? 1 : 0.25 }}>
            {i <= value ? '★' : '☆'}
          </span>
        ))
      )}
    </div>
  )
}

function StatutLabel({ statut }: { statut: NouvellePassee['statut'] }) {
  const map: Record<NouvellePassee['statut'], { color: string; dot: string }> = {
    'terminée':   { color: 'var(--sage-deep)', dot: 'var(--sage)'  },
    'abandonnée': { color: 'var(--ink-3)',     dot: 'var(--ink-4)' },
  }
  const t = map[statut]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: t.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot, display: 'inline-block' }} />
      {statut}
    </span>
  )
}

export function StoryRow({ n, titre, genre, mots, etoiles, statut }: NouvellePassee) {
  const abandoned = statut === 'abandonnée'
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '54px 1fr 170px 110px 120px 110px',
        gap: 16,
        alignItems: 'center',
        padding: '18px',
        borderBottom: '1px solid var(--paper-2)',
        background: hover ? 'var(--paper-1)' : 'transparent',
        opacity: abandoned ? 0.55 : 1,
        cursor: 'pointer',
        transition: 'background var(--dur) var(--ease)',
      }}
    >
      <Num style={{ fontSize: 15, color: 'var(--ink-3)', fontWeight: 500 }}>
        #{String(n).padStart(2, '0')}
      </Num>
      <span style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 21,
        fontWeight: 500,
        color: 'var(--ink)',
        letterSpacing: '-0.005em',
        textDecoration: abandoned ? 'line-through' : 'none',
        textDecorationColor: 'var(--ink-3)',
        textDecorationThickness: '1px',
      }}>{titre}</span>
      <div>
        <Badge tone={abandoned ? 'default' : 'terra'}>{genre}</Badge>
      </div>
      <Num style={{ fontSize: 14, color: 'var(--ink)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {mots.toLocaleString('fr-FR').replace(',', ' ')}
      </Num>
      <Stars value={etoiles} disabled={abandoned} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <StatutLabel statut={statut} />
      </div>
    </div>
  )
}
