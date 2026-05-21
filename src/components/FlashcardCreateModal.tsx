import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useDroitStore } from '../store/droitStore'

interface Props {
  defaultMatiere?: string
  onClose: () => void
}

export function FlashcardCreateModal({ defaultMatiere, onClose }: Props) {
  const addFlashcard = useDroitStore((s) => s.addFlashcard)
  const flashcards   = useDroitStore((s) => s.flashcards)

  const existingMatieres = Array.from(new Set(flashcards.map((c) => c.matiere))).sort()

  const [manQuestion, setManQuestion] = useState('')
  const [manAnswer,   setManAnswer]   = useState('')
  const [manMatiere,  setManMatiere]  = useState(defaultMatiere ?? '')

  const canSave = manQuestion.trim() && manAnswer.trim() && manMatiere.trim()

  const save = () => {
    if (!canSave) return
    addFlashcard({
      matiere:  manMatiere.trim(),
      question: manQuestion.trim(),
      answer:   manAnswer.trim(),
    })
    setManQuestion('')
    setManAnswer('')
  }

  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)',
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--ink-4)', background: 'var(--paper-1)', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6, display: 'block',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(58,46,34,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 50, padding: '40px 20px 20px', overflowY: 'auto',
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
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--paper-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>
              Nouvelle carte de révision
            </h2>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)', margin: '4px 0 0' }}>
              Question / réponse à mémoriser avec spaced repetition.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Matière</label>
              <input
                list="matieres-list"
                value={manMatiere}
                onChange={(e) => setManMatiere(e.target.value)}
                placeholder="ex: Droit fiscal"
                style={input}
              />
              <datalist id="matieres-list">
                {existingMatieres.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Question</label>
              <textarea
                value={manQuestion}
                onChange={(e) => setManQuestion(e.target.value)}
                rows={2}
                placeholder="Qu'est-ce que…"
                style={{ ...input, resize: 'vertical', fontFamily: 'var(--font-serif)' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Réponse</label>
              <textarea
                value={manAnswer}
                onChange={(e) => setManAnswer(e.target.value)}
                rows={3}
                placeholder="Réponse courte, 1-3 phrases…"
                style={{ ...input, resize: 'vertical', fontFamily: 'var(--font-serif)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                onClick={onClose}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 13,
                  background: 'transparent', color: 'var(--ink-2)',
                  border: '1px solid var(--ink-4)', borderRadius: 8,
                  padding: '7px 14px', cursor: 'pointer',
                }}
              >
                Fermer
              </button>
              <button
                onClick={save}
                disabled={!canSave}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                  background: 'var(--terra)', color: 'var(--paper-1)',
                  border: 0, borderRadius: 8, padding: '7px 16px',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  opacity: canSave ? 1 : 0.5,
                }}
              >
                <Plus size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                Ajouter et continuer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
