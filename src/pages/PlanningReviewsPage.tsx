import { useState, useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { usePlanningStore } from '../store/planningStore'
import type { ReviewKind } from '../store/planningStore'

// =============================================================================
// Tokens
// =============================================================================

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10.5,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--ink-3)',
}

const sectionTitle: CSSProperties = {
  fontFamily: 'var(--font-serif, var(--font-sans))',
  fontSize: 28, fontWeight: 500, color: 'var(--fg)',
  letterSpacing: '-0.01em',
}

const card: CSSProperties = {
  background: 'var(--paper-1)',
  border: '1px solid var(--paper-2)',
  borderRadius: 12,
  padding: 16,
}

const chipBtn = (active: boolean): CSSProperties => ({
  ...labelStyle,
  background: active ? 'var(--paper-2)' : 'transparent',
  color:      active ? 'var(--fg)' : 'var(--fg-muted)',
  border:    `1px solid ${active ? 'var(--fg-subtle)' : 'var(--border)'}`,
  padding: '6px 12px', borderRadius: 8, fontSize: 11,
  cursor: 'pointer',
  textDecoration: 'none',
})

const btnPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--terra)', color: 'var(--paper)',
  border: 'none', borderRadius: 8,
  padding: '8px 14px', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', textDecoration: 'none',
}

// =============================================================================
// Labels
// =============================================================================

const KIND_LABEL: Record<ReviewKind, string> = {
  weekly:    'Hebdomadaire',
  monthly:   'Mensuelle',
  quarterly: 'Trimestrielle',
  annual:    'Annuelle',
}

type Filter = 'all' | ReviewKind

const FILTERS: { value: Filter, label: string }[] = [
  { value: 'all',       label: 'Toutes' },
  { value: 'weekly',    label: 'Hebdo' },
  { value: 'monthly',   label: 'Mensuelle' },
  { value: 'quarterly', label: 'Trimestrielle' },
  { value: 'annual',    label: 'Annuelle' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// =============================================================================
// Page
// =============================================================================

export function PlanningReviewsPage() {
  const reviews = usePlanningStore((s) => s.reviews)
  const [filter, setFilter] = useState<Filter>('all')

  const sorted = useMemo(() => {
    const filtered = filter === 'all' ? reviews : reviews.filter((r) => r.kind === filter)
    return [...filtered].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
  }, [reviews, filter])

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '28px 24px 80px',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link to="/planning" style={{ ...labelStyle, color: 'var(--fg-subtle)', textDecoration: 'none' }}>
          ← Planning
        </Link>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <h1 style={sectionTitle}>Revues</h1>
          <span style={{ ...labelStyle, color: 'var(--fg-subtle)' }}>
            {sorted.length} {sorted.length > 1 ? 'entrées' : 'entrée'}
          </span>
        </div>
        <p style={{ color: 'var(--fg-subtle)', fontSize: 13, fontStyle: 'italic', margin: 0 }}>
          Historique de toutes les revues. Une revue qui ne produit pas au moins une décision actionnable dans les 48h est performative.
        </p>
      </header>

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button key={f.value} style={chipBtn(filter === f.value)} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Actions : nouvelle revue ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to="/planning/review/new?kind=weekly" style={btnPrimary}>
          <Plus size={14} /> Hebdo
        </Link>
        <Link to="/planning/review/new?kind=monthly" style={{ ...btnPrimary, background: 'var(--paper-2)', color: 'var(--fg)' }}>
          <Plus size={14} /> Mensuelle
        </Link>
        <Link to="/planning/review/new?kind=quarterly" style={{ ...btnPrimary, background: 'var(--paper-2)', color: 'var(--fg)' }}>
          <Plus size={14} /> Trimestrielle
        </Link>
        <Link to="/planning/review/new?kind=annual" style={{ ...btnPrimary, background: 'var(--paper-2)', color: 'var(--fg)' }}>
          <Plus size={14} /> Annuelle
        </Link>
      </div>

      {/* ── Liste ───────────────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>
          Aucune revue {filter !== 'all' ? KIND_LABEL[filter].toLowerCase() : ''} enregistrée.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((r) => {
            const summary =
              r.kind === 'weekly'
                ? [r.victory, r.learning, r.nextWeekPivot].filter(Boolean).join(' · ')
                : (r.bodyMd?.split('\n').find((l) => l.trim().length > 0) ?? '')
            return (
              <Link
                key={r.id}
                to={`/planning/review/${r.id}`}
                style={{
                  ...card,
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                <FileText size={18} style={{ color: 'var(--fg-subtle)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ ...labelStyle, color: 'var(--terra)' }}>{KIND_LABEL[r.kind]}</span>
                    <span style={{ fontSize: 13.5, color: 'var(--fg)', fontWeight: 500 }}>
                      {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                    </span>
                  </div>
                  {summary && (
                    <p style={{
                      color: 'var(--fg-muted)', fontSize: 13, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {summary}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
