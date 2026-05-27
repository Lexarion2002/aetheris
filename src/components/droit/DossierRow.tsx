// Ligne de dossier dans le tableau "Dossiers & rendus" du hub.

import { useState } from 'react'
import { FormatBadge } from './atoms'

interface Props {
  kind:     string         // DOSSIER · RAPPORT · DM · ÉCRIT
  title:    string
  sub?:     string
  date:     string         // "01.06.2026"
  daysLeft: number
  isLast?:  boolean
  onClick?: () => void
}

export function DossierRow({ kind, title, sub, date, daysLeft, isLast, onClick }: Props) {
  const [hover, setHover] = useState(false)
  const urgent = daysLeft <= 7

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '92px 1fr 110px 60px 24px',
        alignItems: 'center', gap: 16,
        padding: '12px 18px',
        background: hover ? 'var(--paper-2)' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid var(--paper-2)',
        transition: 'background var(--dur) var(--ease)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <FormatBadge tone="soft">{kind}</FormatBadge>

      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 15.5,
          color: 'var(--ink)', lineHeight: 1.3, fontWeight: 500,
        }}>
          {title}
        </div>
        {sub && (
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 12.5,
            color: 'var(--ink-3)', marginTop: 2,
          }}>
            {sub}
          </div>
        )}
      </div>

      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12.5,
        color: 'var(--ink-2)', letterSpacing: '0.02em',
      }}>
        {date}
      </span>

      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 500,
        color: urgent ? 'var(--terra)' : 'var(--ink-3)', textAlign: 'right',
        letterSpacing: '0.02em',
      }}>
        J−{daysLeft}
      </span>

      <span style={{
        color: hover ? 'var(--ink-2)' : 'var(--ink-4)',
        fontFamily: 'var(--font-mono)', fontSize: 14, textAlign: 'right',
        transition: 'color var(--dur) var(--ease)',
      }}>
        ›
      </span>
    </div>
  )
}
