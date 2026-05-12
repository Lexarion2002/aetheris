import { useState } from 'react'
import { Label, Num } from './primitives'
import { StoryRow } from './components/StoryRow'
import type { NouvellePassee } from './data'

type Filtre = 'tout' | 'term' | 'aban'

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 999,
        background: active ? 'var(--ink)' : (hover ? 'var(--paper-2)' : 'transparent'),
        color: active ? 'var(--paper-1)' : 'var(--ink-2)',
        border: `1px solid ${active ? 'var(--ink)' : 'var(--paper-2)'}`,
        fontFamily: 'var(--font-sans)',
        fontSize: 13.5,
        fontWeight: 400,
        cursor: 'pointer',
        transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
      }}
    >{children}</button>
  )
}

export function Bibliotheque({ past }: { past: NouvellePassee[] }) {
  const [filtre, setFiltre] = useState<Filtre>('tout')

  const totalTerm = past.filter(s => s.statut === 'terminée').length
  const totalAban = past.filter(s => s.statut === 'abandonnée').length
  const visibles = past.filter(s =>
    filtre === 'tout' ||
    (filtre === 'term' && s.statut === 'terminée') ||
    (filtre === 'aban' && s.statut === 'abandonnée')
  )

  return (
    <div style={{ paddingTop: 36, paddingBottom: 64 }}>

      {/* ── Filtres + résumé ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterPill active={filtre === 'tout'} onClick={() => setFiltre('tout')}>
            Tout <Num style={{ color: 'var(--ink-3)', fontSize: 12 }}>· {past.length}</Num>
          </FilterPill>
          <FilterPill active={filtre === 'term'} onClick={() => setFiltre('term')}>
            Terminées <Num style={{ color: 'var(--ink-3)', fontSize: 12 }}>· {totalTerm}</Num>
          </FilterPill>
          <FilterPill active={filtre === 'aban'} onClick={() => setFiltre('aban')}>
            Abandonnées <Num style={{ color: 'var(--ink-3)', fontSize: 12 }}>· {totalAban}</Num>
          </FilterPill>
        </div>
        <span style={{ fontFamily: 'var(--font-sans)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)' }}>
          ordre anti-chronologique — la plus récente d'abord
        </span>
      </div>

      {/* ── En-tête colonnes ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '54px 1fr 170px 110px 120px 110px',
        gap: 16,
        alignItems: 'center',
        padding: '0 18px 10px',
        borderBottom: '1px solid var(--paper-2)',
      }}>
        <Label>n°</Label>
        <Label>titre</Label>
        <Label>genre</Label>
        <Label style={{ textAlign: 'right', display: 'block' }}>mots</Label>
        <Label>jugement</Label>
        <Label style={{ textAlign: 'right', display: 'block' }}>statut</Label>
      </div>

      {/* ── Lignes ────────────────────────────────────────────────────────────── */}
      <div>
        {visibles.map(s => <StoryRow key={s.n} {...s} />)}
      </div>

      {visibles.length === 0 && (
        <div style={{
          padding: '40px 0',
          textAlign: 'center',
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 16,
          color: 'var(--ink-3)',
        }}>Rien à montrer ici pour l'instant.</div>
      )}
    </div>
  )
}
