import { useState } from 'react'
import { Label } from './primitives'

export type TabKey = 'semaine' | 'biblio' | 'stats'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'semaine', label: 'Semaine en cours' },
  { key: 'biblio',  label: 'Bibliothèque' },
  { key: 'stats',   label: 'Statistiques' },
]

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        padding: '12px 18px 14px',
        marginBottom: -1,
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        color: active || hover ? 'var(--ink)' : 'var(--ink-2)',
        borderBottom: `2px solid ${active ? 'var(--terra)' : 'transparent'}`,
        transition: 'color var(--dur) var(--ease), border-color var(--dur) var(--ease)',
      }}
    >{children}</button>
  )
}

export function EcritureHeader({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  return (
    <div>
      <Label>écriture · défi hebdomadaire</Label>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 44,
        fontWeight: 500,
        color: 'var(--ink)',
        letterSpacing: '-0.01em',
        margin: '6px 0 10px',
        lineHeight: 1.1,
      }}>Écriture.</h1>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 18,
        color: 'var(--ink-2)',
        margin: 0,
        maxWidth: '60ch',
        lineHeight: 1.4,
      }}>« Une nouvelle par semaine. Du lundi au dimanche. Pas d'excuse, pas de punition. »</p>

      <div style={{
        display: 'flex',
        gap: 0,
        marginTop: 32,
        borderBottom: '1px solid var(--paper-2)',
      }}>
        {TABS.map(t => (
          <Tab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</Tab>
        ))}
      </div>
    </div>
  )
}
