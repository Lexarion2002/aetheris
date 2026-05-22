import { useState, type CSSProperties } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Check, Trash2 } from 'lucide-react'
import { usePlanningStore } from '../store/planningStore'
import type { Review, ReviewKind } from '../store/planningStore'

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
  fontSize: 24, fontWeight: 500, color: 'var(--fg)',
  letterSpacing: '-0.01em',
}

const card: CSSProperties = {
  background: 'var(--paper-1)',
  border: '1px solid var(--paper-2)',
  borderRadius: 12,
  padding: 18,
}

const btnPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--terra)', color: 'var(--paper)',
  border: 'none', borderRadius: 8,
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  cursor: 'pointer',
}

const btnDanger: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'transparent', color: '#a03826',
  border: '1px solid #a03826', borderRadius: 8,
  padding: '8px 14px', fontSize: 12.5,
  cursor: 'pointer',
}

const statusChip = (status: 'done' | 'partial' | 'missed' | undefined): CSSProperties => {
  const map = {
    done:    { bg: 'var(--sage-soft)', fg: 'var(--sage-deep)', label: 'Livré' },
    partial: { bg: '#fef3d0',          fg: '#a36b00',          label: 'Partiel' },
    missed:  { bg: '#fde2dd',          fg: '#a03826',          label: 'Raté' },
  }
  const c = status ? map[status] : { bg: 'var(--paper-2)', fg: 'var(--ink-3)', label: '—' }
  return {
    ...labelStyle,
    background: c.bg, color: c.fg,
    padding: '3px 10px', borderRadius: 6, fontSize: 10,
    display: 'inline-flex', alignItems: 'center',
  } as CSSProperties & { __label?: string }
}

// Helper hack pour utiliser le label dans le rendu
function statusLabel(s: 'done' | 'partial' | 'missed' | undefined): string {
  return s === 'done' ? 'Livré' : s === 'partial' ? 'Partiel' : s === 'missed' ? 'Raté' : '—'
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// =============================================================================
// Page
// =============================================================================

export function PlanningReviewPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const reviews      = usePlanningStore((s) => s.reviews)
  const updateReview = usePlanningStore((s) => s.updateReview)
  const deleteReview = usePlanningStore((s) => s.deleteReview)

  const review = reviews.find((r) => r.id === id)

  if (!review) {
    return (
      <div style={{
        maxWidth: 820, margin: '0 auto', padding: '28px 24px 80px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <Link to="/planning/reviews" style={{ ...labelStyle, color: 'var(--fg-subtle)', textDecoration: 'none' }}>
          ← Toutes les revues
        </Link>
        <p style={{ color: 'var(--fg-subtle)', fontStyle: 'italic' }}>
          Revue introuvable. Elle a peut-être été supprimée.
        </p>
      </div>
    )
  }

  const handleDelete = () => {
    if (confirm('Supprimer cette revue ?')) {
      deleteReview(review.id)
      navigate('/planning/reviews')
    }
  }

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '28px 24px 80px',
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link to="/planning/reviews" style={{ ...labelStyle, color: 'var(--fg-subtle)', textDecoration: 'none' }}>
          ← Toutes les revues
        </Link>
        <span style={{ ...labelStyle, color: 'var(--terra)' }}>
          Revue {KIND_LABEL[review.kind]}
        </span>
        <h1 style={sectionTitle}>
          {formatDate(review.periodStart)} – {formatDate(review.periodEnd)}
        </h1>
      </header>

      {/* ── Contenu structuré (weekly) ──────────────────────────────────────── */}
      {review.kind === 'weekly' && <WeeklyDetail review={review} onSave={(patch) => updateReview(review.id, patch)} />}

      {/* ── Bilan libre (Markdown) — toujours dispo ────────────────────────── */}
      <FreeBodySection
        initial={review.bodyMd ?? ''}
        onSave={(bodyMd) => updateReview(review.id, { bodyMd })}
      />

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, paddingTop: 8 }}>
        <button style={btnDanger} onClick={handleDelete}>
          <Trash2 size={14} /> Supprimer
        </button>
        <span style={{ ...labelStyle, color: 'var(--fg-subtle)', alignSelf: 'center' }}>
          Modifié {new Date(review.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// Sous-composant : détail revue hebdo (lecture)
// =============================================================================

function WeeklyDetail({ review, onSave: _onSave }: { review: Review, onSave: (patch: Partial<Review>) => void }) {
  return (
    <>
      {/* ── MITs ─────────────────────────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <span style={{ ...labelStyle, color: 'var(--terra)' }}>MITs</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {[
            { num: 1, status: review.mit1Status },
            { num: 2, status: review.mit2Status },
            { num: 3, status: review.mit3Status },
          ].map(({ num, status }) => (
            <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                ...labelStyle, fontSize: 11,
                width: 22, height: 22, borderRadius: 6,
                background: 'var(--terra-soft)', color: 'var(--terra)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {num}
              </span>
              <span style={statusChip(status)}>{statusLabel(status)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Habitudes + indicateurs ─────────────────────────────────────────── */}
      {(review.habitsScore || review.energyAvg != null || review.rsHours != null) && (
        <section style={{ ...card }}>
          <span style={labelStyle}>Habitudes & indicateurs</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {review.habitsScore && Object.entries(review.habitsScore).map(([slug, score]) => (
              <div key={slug} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <span style={{ color: 'var(--fg)' }}>{slug.replace(/_/g, ' ')}</span>
                <span style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                  {score.hit}/{score.total}
                </span>
              </div>
            ))}
            {review.energyAvg != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <span style={{ color: 'var(--fg)' }}>Énergie moyenne</span>
                <span style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{review.energyAvg}/10</span>
              </div>
            )}
            {review.rsHours != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <span style={{ color: 'var(--fg)' }}>Heures RS</span>
                <span style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{review.rsHours}h</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Bilan qualitatif ─────────────────────────────────────────────────── */}
      <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span style={labelStyle}>Bilan qualitatif</span>
        <ReadField label="Victoire" value={review.victory} />
        <ReadField label="Difficulté" value={review.difficulty} />
        <ReadField label="Cause racine" value={review.difficultyRootCause} />
        <ReadField label="Apprentissage" value={review.learning} />
        <ReadField label="Pivot semaine suivante" value={review.nextWeekPivot} />
      </section>
    </>
  )
}

function ReadField({ label, value }: { label: string, value?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={labelStyle}>{label}</span>
      <p style={{
        margin: 0, fontSize: 14, color: value ? 'var(--fg)' : 'var(--fg-subtle)',
        fontStyle: value ? 'normal' : 'italic', whiteSpace: 'pre-wrap',
      }}>
        {value || '—'}
      </p>
    </div>
  )
}

// =============================================================================
// Sous-composant : éditeur Markdown libre (bodyMd)
// =============================================================================

function FreeBodySection({ initial, onSave }: { initial: string, onSave: (md: string) => void }) {
  const [bodyMd, setBodyMd] = useState(initial)
  const [dirty,  setDirty]  = useState(false)

  return (
    <section style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={labelStyle}>Bilan libre (Markdown)</span>
        <button
          style={{ ...btnPrimary, padding: '6px 12px', fontSize: 12 }}
          disabled={!dirty}
          onClick={() => { onSave(bodyMd); setDirty(false) }}
        >
          <Check size={12} /> Enregistrer
        </button>
      </div>
      <textarea
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'transparent', border: 'none',
          outline: 'none', resize: 'vertical',
          padding: 18, minHeight: 280,
          fontFamily: 'var(--font-mono)', fontSize: 13.5,
          lineHeight: 1.65, color: 'var(--fg)',
        }}
        value={bodyMd}
        onChange={(e) => { setBodyMd(e.target.value); setDirty(true) }}
        placeholder="Markdown libre…"
      />
    </section>
  )
}
