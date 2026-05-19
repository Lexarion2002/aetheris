import { useState } from 'react'
import { X, Sparkles, Plus, Trash2 } from 'lucide-react'
import { useDroitStore } from '../store/droitStore'
import { useStore } from '../store'
import { generateFlashcards, type GeneratedFlashcard } from '../lib/aiService'

interface Props {
  defaultMatiere?: string
  onClose: () => void
}

type Mode = 'manual' | 'kit'

export function FlashcardCreateModal({ defaultMatiere, onClose }: Props) {
  const addFlashcard = useDroitStore((s) => s.addFlashcard)
  const flashcards   = useDroitStore((s) => s.flashcards)
  const kitEnabled   = useStore((s) => !!s.anthropicApiKey)

  const existingMatieres = Array.from(new Set(flashcards.map((c) => c.matiere))).sort()

  const [mode, setMode] = useState<Mode>(kitEnabled ? 'kit' : 'manual')

  // ── Mode manuel ─────────────────────────────────────────────────────────
  const [manQuestion, setManQuestion] = useState('')
  const [manAnswer,   setManAnswer]   = useState('')
  const [manMatiere,  setManMatiere]  = useState(defaultMatiere ?? '')

  const canSaveManual = manQuestion.trim() && manAnswer.trim() && manMatiere.trim()

  const saveManual = () => {
    if (!canSaveManual) return
    addFlashcard({
      matiere:  manMatiere.trim(),
      question: manQuestion.trim(),
      answer:   manAnswer.trim(),
    })
    setManQuestion('')
    setManAnswer('')
  }

  // ── Mode Kit ────────────────────────────────────────────────────────────
  const [kitText,    setKitText]    = useState('')
  const [kitMatiere, setKitMatiere] = useState(defaultMatiere ?? '')
  const [kitLoading, setKitLoading] = useState(false)
  const [kitError,   setKitError]   = useState<string | null>(null)
  const [generated,  setGenerated]  = useState<GeneratedFlashcard[]>([])

  const runKit = async () => {
    if (!kitText.trim() || !kitMatiere.trim() || kitLoading) return
    setKitLoading(true); setKitError(null)
    try {
      const cards = await generateFlashcards(kitText.trim(), kitMatiere.trim(), 10)
      setGenerated(cards)
    } catch (err) {
      setKitError(err instanceof Error ? err.message : 'Erreur Kit')
    } finally {
      setKitLoading(false)
    }
  }

  const updateGenerated = (idx: number, updates: Partial<GeneratedFlashcard>) => {
    setGenerated((prev) => prev.map((c, i) => (i === idx ? { ...c, ...updates } : c)))
  }
  const removeGenerated = (idx: number) => {
    setGenerated((prev) => prev.filter((_, i) => i !== idx))
  }

  const saveAllGenerated = () => {
    for (const c of generated) {
      if (c.question.trim() && c.answer.trim()) {
        addFlashcard({
          matiere:  kitMatiere.trim(),
          question: c.question.trim(),
          answer:   c.answer.trim(),
        })
      }
    }
    setGenerated([])
    setKitText('')
    onClose()
  }

  // ── Styles partagés ─────────────────────────────────────────────────────
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
        {/* Header */}
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

        {/* Tabs mode */}
        {kitEnabled && (
          <div style={{ display: 'flex', padding: '12px 22px 0', borderBottom: '1px solid var(--paper-2)' }}>
            {(['kit', 'manual'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 13,
                  fontWeight: mode === m ? 500 : 400,
                  color: mode === m ? 'var(--ink)' : 'var(--ink-2)',
                  background: 'transparent', border: 0, cursor: 'pointer',
                  padding: '10px 0', marginRight: 24,
                  borderBottom: `2px solid ${mode === m ? 'var(--terra)' : 'transparent'}`,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {m === 'kit' ? <><Sparkles size={13} /> Avec Kit</> : 'Manuel'}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '20px 22px' }}>
          {/* ── MODE MANUEL ──────────────────────────────────────────────── */}
          {mode === 'manual' && (
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
                  onClick={saveManual}
                  disabled={!canSaveManual}
                  style={{
                    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                    background: 'var(--terra)', color: 'var(--paper-1)',
                    border: 0, borderRadius: 8, padding: '7px 16px',
                    cursor: canSaveManual ? 'pointer' : 'not-allowed',
                    opacity: canSaveManual ? 1 : 0.5,
                  }}
                >
                  <Plus size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                  Ajouter et continuer
                </button>
              </div>
            </div>
          )}

          {/* ── MODE KIT ─────────────────────────────────────────────────── */}
          {mode === 'kit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {generated.length === 0 ? (
                <>
                  <div>
                    <label style={labelStyle}>Matière</label>
                    <input
                      list="matieres-list"
                      value={kitMatiere}
                      onChange={(e) => setKitMatiere(e.target.value)}
                      placeholder="ex: Droit fiscal"
                      style={input}
                    />
                    <datalist id="matieres-list">
                      {existingMatieres.map((m) => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                  <div>
                    <label style={labelStyle}>Texte du cours / fiche</label>
                    <textarea
                      value={kitText}
                      onChange={(e) => setKitText(e.target.value)}
                      rows={10}
                      placeholder="Colle un extrait de cours, une fiche de révision, un résumé… Kit en tirera 5 à 10 flashcards."
                      style={{ ...input, resize: 'vertical', fontFamily: 'var(--font-serif)', lineHeight: 1.5 }}
                    />
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', marginTop: 4 }}>
                      {kitText.length} caractères
                    </div>
                  </div>
                  {kitError && (
                    <div style={{
                      fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)',
                      padding: '8px 12px', borderRadius: 6,
                      background: 'var(--terra-soft)', border: '1px solid #DEB89C',
                    }}>
                      {kitError}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
                      onClick={() => void runKit()}
                      disabled={!kitText.trim() || !kitMatiere.trim() || kitLoading}
                      style={{
                        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                        background: 'var(--terra)', color: 'var(--paper-1)',
                        border: 0, borderRadius: 8, padding: '7px 16px',
                        cursor: 'pointer',
                        opacity: (!kitText.trim() || !kitMatiere.trim() || kitLoading) ? 0.5 : 1,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Sparkles size={13} />
                      {kitLoading ? 'Kit génère…' : 'Générer'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-2)' }}>
                    Kit a généré {generated.length} cartes. Édite ou supprime celles qui ne te conviennent pas, puis ajoute tout.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '50vh', overflowY: 'auto', paddingRight: 4 }}>
                    {generated.map((card, idx) => (
                      <div key={idx} style={{ background: 'var(--paper)', border: '1px solid var(--paper-2)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <textarea
                              value={card.question}
                              onChange={(e) => updateGenerated(idx, { question: e.target.value })}
                              rows={2}
                              style={{
                                ...input, padding: '6px 8px', fontSize: 13,
                                fontFamily: 'var(--font-serif)', resize: 'vertical',
                                background: 'var(--paper-1)',
                              }}
                            />
                            <textarea
                              value={card.answer}
                              onChange={(e) => updateGenerated(idx, { answer: e.target.value })}
                              rows={3}
                              style={{
                                ...input, padding: '6px 8px', fontSize: 13,
                                fontFamily: 'var(--font-serif)', resize: 'vertical',
                                color: 'var(--ink-2)', background: 'var(--paper-1)',
                              }}
                            />
                          </div>
                          <button
                            onClick={() => removeGenerated(idx)}
                            style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-4)', padding: 4 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => setGenerated([])}
                      style={{
                        fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)',
                        background: 'transparent', border: 0, cursor: 'pointer', padding: 0,
                      }}
                    >
                      ← Recommencer
                    </button>
                    <button
                      onClick={saveAllGenerated}
                      disabled={generated.length === 0}
                      style={{
                        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                        background: 'var(--terra)', color: 'var(--paper-1)',
                        border: 0, borderRadius: 8, padding: '7px 16px',
                        cursor: 'pointer',
                      }}
                    >
                      Ajouter {generated.length} carte{generated.length > 1 ? 's' : ''}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
