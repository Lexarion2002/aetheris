// Modal d'ajout d'une flashcard rattachée à un sujet.
// Sheet ancrée en bas de l'écran, esthétique calme cohérente avec le hub droit.

import { useEffect, useState } from 'react'
import { ML } from './atoms'

interface Props {
  matiereId:    string
  sujetId:      string
  subjectTitle: string
  onClose:      () => void
  onConfirm:    (q: string, a: string) => void
}

export function FlashModal({ subjectTitle, onClose, onConfirm }: Props) {
  const [front, setFront] = useState('')
  const [back,  setBack]  = useState('')

  // Esc ferme
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const canSave = front.trim() && back.trim()

  const handleConfirm = () => {
    if (!canSave) return
    onConfirm(front.trim(), back.trim())
  }

  const taStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    height: 80, padding: '10px 12px',
    background: 'var(--paper)', border: '1px solid var(--ink-4)',
    borderRadius: 8,
    fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)',
    resize: 'none', lineHeight: 1.55, outline: 'none',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(58,46,34,0.28)',
        display: 'flex', alignItems: 'flex-end', zIndex: 60,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 820, margin: '0 auto',
          background: 'var(--paper-1)', borderRadius: '14px 14px 0 0',
          padding: '28px 36px 36px',
          boxShadow: '0 -8px 48px rgba(58,46,34,0.16)',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 22,
        }}>
          <div>
            <ML style={{ display: 'block', marginBottom: 7, color: 'var(--terra)' }}>
              Nouvelle flashcard
            </ML>
            <p style={{
              fontFamily: 'var(--font-serif)', fontSize: 17, fontStyle: 'italic',
              color: 'var(--ink)', margin: '4px 0 0',
            }}>
              {subjectTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 30, height: 30, borderRadius: 7,
              border: '1px solid var(--paper-2)', background: 'transparent',
              color: 'var(--ink-3)', fontSize: 18,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <ML style={{ display: 'block', marginBottom: 8 }}>Recto</ML>
            <textarea
              autoFocus
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Question, notion clé…"
              style={taStyle}
            />
          </div>
          <div>
            <ML style={{ display: 'block', marginBottom: 8 }}>Verso</ML>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Réponse, définition, article…"
              style={taStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid var(--ink-4)', background: 'transparent',
              color: 'var(--ink-2)', fontFamily: 'var(--font-sans)', fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSave}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 0,
              background: 'var(--terra)', color: 'var(--paper-1)',
              fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500,
              cursor: canSave ? 'pointer' : 'not-allowed',
              opacity: canSave ? 1 : 0.5,
            }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
