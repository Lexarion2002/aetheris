// Carte matière du hub /droit.
// Affiche le titre, le format d'examen, la date + J-X, la couverture
// (% de sujets fichés), et les compteurs de confiance par couleur.

import { useState } from 'react'
import { FormatBadge, ConfDot, ProgressBar, ML } from './atoms'

export interface SubjectCardData {
  id:          string
  title:       string
  subtitle?:   string
  format:      string
  date:        string                   // "2 juin 2026" / "1—4 juin"
  daysLeft:    number
  progress:    number                   // 0..100
  progressLabel?: string                // "Couverture" / "Sujets fichés"
  fichesLine?: string                   // "2 / 13 sujets fichés"
  counters:    { red: number; amber: number; green: number }
  priorities?: number                   // count, optional
  planTag?:    string                   // ex. "plan J3 / J8"
}

interface Props {
  data:      SubjectCardData
  onOpen?:   () => void
  onReview?: () => void
}

export function SubjectCard({ data, onOpen, onReview }: Props) {
  const [hover, setHover] = useState(false)
  const isUrgent = data.daysLeft < 7

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:    'var(--paper-1)',
        border:        '1px solid ' + (hover ? 'var(--ink-4)' : 'var(--paper-2)'),
        borderRadius:  12,
        padding:       '20px 22px 18px',
        boxShadow:     hover ? '0 1px 2px rgba(58,46,34,0.06)' : 'none',
        transition:    'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
        display:       'flex', flexDirection: 'column', gap: 14,
        cursor:        onOpen ? 'pointer' : 'default',
      }}
    >
      {/* Header : titre + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{
            fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500,
            color: 'var(--ink)', letterSpacing: '-0.01em',
            margin: 0, lineHeight: 1.15,
          }}>
            {data.title}
          </h3>
          {data.subtitle && (
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)',
              marginTop: 4, fontStyle: 'italic',
            }}>
              {data.subtitle}
            </div>
          )}
        </div>
        <FormatBadge>{data.format}</FormatBadge>
      </div>

      {/* Date + J-X + planTag */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: -4, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)',
          letterSpacing: '0.02em',
        }}>
          {data.date}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
          color: isUrgent ? 'var(--terra)' : 'var(--ink-3)',
          letterSpacing: '0.02em',
        }}>
          J−{data.daysLeft}
        </span>
        {data.planTag && (
          <>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>
              {data.planTag}
            </span>
          </>
        )}
      </div>

      {/* Progression */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <ML>{data.progressLabel || 'Couverture'}</ML>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)',
            fontWeight: 500,
          }}>
            {data.progress}%
          </span>
        </div>
        <ProgressBar value={data.progress} />
      </div>

      {/* Ligne sujets fichés (sous la barre) */}
      {data.fichesLine && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)', marginTop: -4 }}>
          {data.fichesLine}
        </div>
      )}

      {/* Pied : compteurs confiance + actions */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 2, paddingTop: 14, borderTop: '1px solid var(--paper-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <ConfCount tone="red"   value={data.counters.red} />
          <ConfCount tone="amber" value={data.counters.amber} />
          <ConfCount tone="green" value={data.counters.green} />
          {data.priorities != null && data.priorities > 0 && (
            <>
              <span style={{ color: 'var(--ink-4)' }}>·</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--ink)' }}>
                  {data.priorities}
                </span>{' '}
                priorités
              </span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {onOpen && <CardAction onClick={(e) => { e.stopPropagation(); onOpen() }}>Ouvrir</CardAction>}
          {onReview && (
            <CardAction strong onClick={(e) => { e.stopPropagation(); onReview() }}>
              Réviser →
            </CardAction>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ConfCount ────────────────────────────────────────────────────────────────

function ConfCount({ tone, value }: { tone: 'red' | 'amber' | 'green'; value: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <ConfDot tone={tone} />
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
        color: value > 0 ? 'var(--ink)' : 'var(--ink-4)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </span>
  )
}

// ─── CardAction ───────────────────────────────────────────────────────────────

function CardAction({
  children, strong, onClick,
}: {
  children: React.ReactNode
  strong?:  boolean
  onClick?: (e: React.MouseEvent) => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '4px 10px', borderRadius: 6, border: 0,
        background: hover ? 'var(--paper-2)' : 'transparent',
        color: strong ? 'var(--terra)' : 'var(--ink-2)',
        fontFamily: 'var(--font-sans)', fontSize: 12.5,
        fontWeight: strong ? 500 : 400, cursor: 'pointer',
        transition: 'background var(--dur) var(--ease)',
      }}
    >
      {children}
    </button>
  )
}
