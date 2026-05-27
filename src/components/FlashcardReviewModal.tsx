import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useDroitStore, type Flashcard, type ReviewQuality } from '../store/droitStore'

interface Props {
  // Si fourni → on révise uniquement les cartes de cette matière (id stable, v3+)
  matiereId?: string
  onClose: () => void
}

const todayIso = () => new Date().toISOString().split('T')[0]

export function FlashcardReviewModal({ matiereId, onClose }: Props) {
  const flashcards      = useDroitStore((s) => s.flashcards)
  const matieres        = useDroitStore((s) => s.matieres)
  const reviewFlashcard = useDroitStore((s) => s.reviewFlashcard)

  const matiereTitle = (id: string): string =>
    matieres.find((m) => m.id === id)?.title ?? id

  // Titre lisible de la matière filtrée (pour l'empty state)
  const filterLabel = matiereId ? matiereTitle(matiereId) : undefined

  // Snapshot des cartes à réviser au début de la session (figé pour ne pas
  // que la liste change quand on note une carte)
  const [queue] = useState<Flashcard[]>(() => {
    const today = todayIso()
    return flashcards.filter((c) => {
      if (matiereId && c.matiereId !== matiereId) return false
      return c.nextReview <= today
    })
  })

  const [index, setIndex]   = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState<Record<ReviewQuality, number>>({
    again: 0, hard: 0, good: 0, easy: 0,
  })

  const current = queue[index]
  const isDone  = index >= queue.length

  const handleRate = (quality: ReviewQuality) => {
    if (!current) return
    reviewFlashcard(current.id, quality)
    setStats((s) => ({ ...s, [quality]: s[quality] + 1 }))
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (queue.length === 0) {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ padding: '40px 30px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 8px' }}>
            Rien à réviser pour le moment.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>
            {filterLabel
              ? `Aucune carte de "${filterLabel}" n'est due aujourd'hui.`
              : 'Toutes tes cartes sont à jour. Reviens plus tard ou crée-en de nouvelles.'}
          </p>
        </div>
      </ModalShell>
    )
  }

  // ── Fin de session ──────────────────────────────────────────────────────
  if (isDone) {
    const total = stats.again + stats.hard + stats.good + stats.easy
    return (
      <ModalShell onClose={onClose}>
        <div style={{ padding: '40px 30px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--terra)', marginBottom: 12 }}>
            ✦ session terminée
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--ink)', margin: '0 0 16px', fontWeight: 500 }}>
            {total} carte{total > 1 ? 's' : ''} révisée{total > 1 ? 's' : ''}.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, maxWidth: 360, margin: '0 auto 24px' }}>
            <StatBox label="Encore"    value={stats.again} color="var(--terra)" />
            <StatBox label="Difficile" value={stats.hard}  color="var(--ink-2)" />
            <StatBox label="Bien"      value={stats.good}  color="var(--sage)" />
            <StatBox label="Facile"    value={stats.easy}  color="var(--sage-deep)" />
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
              background: 'var(--terra)', color: 'var(--paper-1)',
              border: 0, borderRadius: 8, padding: '8px 20px', cursor: 'pointer',
            }}
          >
            Terminer
          </button>
        </div>
      </ModalShell>
    )
  }

  // ── Carte en cours ──────────────────────────────────────────────────────
  return (
    <ModalShell onClose={onClose}>
      {/* Progression */}
      <div style={{
        padding: '14px 22px', borderBottom: '1px solid var(--paper-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            {matiereTitle(current.matiereId)}
          </span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--ink-2)' }}>
            {index + 1} / {queue.length}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 2, background: 'var(--paper-2)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${(index / queue.length) * 100}%`,
            height: '100%', background: 'var(--terra)',
            transition: 'width 280ms var(--ease)',
          }}
        />
      </div>

      {/* Question + réponse */}
      <div style={{ padding: '32px 30px', minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
          Question
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)',
          lineHeight: 1.4, letterSpacing: '-0.005em',
          marginBottom: 24,
        }}>
          {current.question}
        </div>

        {revealed ? (
          <>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 8 }}>
              Réponse
            </div>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--ink-2)',
              lineHeight: 1.5, marginBottom: 8,
              padding: '14px 18px', background: 'var(--paper)', borderLeft: '2px solid var(--sage)',
              borderRadius: '0 6px 6px 0',
            }}>
              {current.answer}
            </div>
          </>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
              background: 'var(--paper-1)', color: 'var(--ink-2)',
              border: '1px dashed var(--ink-4)', borderRadius: 8,
              padding: '12px 24px', cursor: 'pointer', alignSelf: 'flex-start',
            }}
          >
            Voir la réponse  <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 11, marginLeft: 6 }}>espace</span>
          </button>
        )}
      </div>

      {/* Boutons de rating */}
      {revealed && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          padding: '14px 22px', borderTop: '1px solid var(--paper-2)',
          gap: 8, background: 'var(--paper)',
        }}>
          <RateButton label="Encore"    sub="<1j"  color="var(--terra)"     onClick={() => handleRate('again')} />
          <RateButton label="Difficile" sub={hint(current, 'hard')}  color="var(--ink-2)"  onClick={() => handleRate('hard')} />
          <RateButton label="Bien"      sub={hint(current, 'good')}  color="var(--sage)"   onClick={() => handleRate('good')} />
          <RateButton label="Facile"    sub={hint(current, 'easy')}  color="var(--sage-deep)" onClick={() => handleRate('easy')} />
        </div>
      )}

      {/* Espace = reveal */}
      <KeyboardShortcut revealed={revealed} setRevealed={setRevealed} handleRate={handleRate} />
    </ModalShell>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hint(card: Flashcard, quality: ReviewQuality): string {
  // Estimation grossière du prochain intervalle si on note avec cette qualité
  const q = { again: 0, hard: 3, good: 4, easy: 5 }[quality]
  const { easeFactor } = card
  let { interval, repetitions } = card
  if (q < 3) {
    interval = 1
  } else {
    repetitions += 1
    if (repetitions === 1)      interval = 1
    else if (repetitions === 2) interval = 6
    else                        interval = Math.round(interval * easeFactor)
  }
  if (interval === 1) return '1j'
  if (interval < 30) return `${interval}j`
  if (interval < 365) return `${Math.round(interval / 30)}m`
  return `${Math.round(interval / 365)}a`
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: '10px 8px', background: 'var(--paper)', borderRadius: 8 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 22, color, fontWeight: 500 }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        {label}
      </div>
    </div>
  )
}

function RateButton({ label, sub, color, onClick }: { label: string; sub: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
        background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
        borderRadius: 8, padding: '10px 8px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        transition: 'border-color var(--dur) var(--ease), background var(--dur) var(--ease)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.background = 'var(--paper)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--paper-2)'
        e.currentTarget.style.background = 'var(--paper-1)'
      }}
    >
      <span style={{ color }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>{sub}</span>
    </button>
  )
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(58,46,34,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 60, padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper-1)', border: '1px solid var(--ink-4)',
          borderRadius: 14, maxWidth: 640, width: '100%',
          boxShadow: 'var(--shadow-2)', overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Raccourcis clavier : Espace pour reveal, 1-4 pour rate
function KeyboardShortcut({
  revealed, setRevealed, handleRate,
}: {
  revealed: boolean
  setRevealed: (v: boolean) => void
  handleRate: (q: ReviewQuality) => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
      }
      if (revealed) {
        if (e.key === '1') handleRate('again')
        if (e.key === '2') handleRate('hard')
        if (e.key === '3') handleRate('good')
        if (e.key === '4') handleRate('easy')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed])
  return null
}
