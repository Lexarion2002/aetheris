// Page matière /droit/:matiereId
// Header + plan de révision collapsible + priorités épinglées + tableau de
// sujets + log de simulations + flashcards rattachées.

import { useMemo, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useDroitStore } from '../store/droitStore'
import { FlashcardReviewModal } from '../components/FlashcardReviewModal'
import {
  FormatBadge,
  ConfDot,
  SubjectRow,
  FlashModal,
  ML,
  daysUntil,
  formatShortNumericDate,
} from '../components/droit'
import type { Sujet, Simulation } from '../store/droitStore'

const todayIso = () => new Date().toISOString().split('T')[0]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DroitMatierePage() {
  const { matiereId } = useParams<{ matiereId: string }>()
  const navigate      = useNavigate()

  // ATTENTION : ne JAMAIS faire .filter()/.map() directement dans un sélecteur
  // zustand — chaque appel renvoie une nouvelle référence et React 18 avec
  // useSyncExternalStore détecte un état "incohérent", ce qui déclenche une
  // boucle de re-render (React error #185). On sélectionne la liste complète
  // (référence stable) et on filtre dans un useMemo.
  const allMatieres    = useDroitStore((s) => s.matieres)
  const allSujets      = useDroitStore((s) => s.sujets)
  const allSimulations = useDroitStore((s) => s.simulations)
  const allFlashcards  = useDroitStore((s) => s.flashcards)
  const matiere     = useMemo(() => allMatieres.find((m) => m.id === matiereId),         [allMatieres, matiereId])
  const sujets      = useMemo(() => allSujets.filter((sj) => sj.matiereId === matiereId), [allSujets, matiereId])
  const simulations = useMemo(() => allSimulations.filter((sm) => sm.matiereId === matiereId), [allSimulations, matiereId])
  const flashcards  = useMemo(() => allFlashcards.filter((c) => c.matiereId === matiereId), [allFlashcards, matiereId])
  const cycleConfidence = useDroitStore((s) => s.cycleConfidence)
  const toggleCheck     = useDroitStore((s) => s.toggleCheck)
  const addFlashcard    = useDroitStore((s) => s.addFlashcard)
  const deleteFlashcard = useDroitStore((s) => s.deleteFlashcard)
  const addSimulation   = useDroitStore((s) => s.addSimulation)
  const deleteSimulation = useDroitStore((s) => s.deleteSimulation)

  const [planOpen,   setPlanOpen]   = useState(true)
  const [flashFor,   setFlashFor]   = useState<Sujet | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [simDraftOpen, setSimDraftOpen] = useState(false)

  if (!matiere) {
    return <Navigate to="/droit" replace />
  }

  const fichedCount = sujets.filter((s) => s.checks.fiche).length
  const conf = sujets.reduce(
    (acc, s) => { acc[s.confidence]++; return acc },
    { red: 0, amber: 0, green: 0 },
  )

  const examLabel = matiere.examLabel ?? formatShortNumericDate(matiere.examDate)
  const daysLeft  = Math.max(0, daysUntil(matiere.examDate))

  const todayStr  = todayIso()
  const dueCount  = flashcards.filter((c) => c.nextReview <= todayStr).length

  const handleConfirmFlash = (q: string, a: string) => {
    if (flashFor) {
      addFlashcard({ matiereId: matiere.id, sujetId: flashFor.id, question: q, answer: a })
    }
    setFlashFor(null)
  }

  return (
    <div style={{ padding: '36px 56px 72px', maxWidth: 980, margin: '0 auto' }}>

      {/* ─── Back + breadcrumb ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/droit')}
          style={{
            background: 'none', border: 0, padding: 0, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink-3)',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color var(--dur) var(--ease)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-3)')}
        >
          ← droit
        </button>
        <span style={{ color: 'var(--ink-4)' }}>›</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)' }}>
          {matiere.title}
        </span>
      </div>

      {/* ─── Header ─── */}
      <header style={{ marginBottom: 32 }}>
        <FormatBadge>{matiere.format}</FormatBadge>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 500,
          color: 'var(--ink)', letterSpacing: '-0.01em',
          margin: '10px 0 12px', lineHeight: 1.1,
        }}>
          {matiere.title}.
        </h1>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'var(--ink-2)', letterSpacing: '0.04em',
          display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span>Examen {examLabel}</span>
          <span style={{ color: 'var(--terra)', fontWeight: 500 }}>J−{daysLeft}</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span>
            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{fichedCount}</span>
            /{sujets.length} sujets fichés
          </span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <ConfDot tone="red"   /><span style={{ color: 'var(--ink)' }}>{conf.red}</span>
            <ConfDot tone="amber" /><span style={{ color: 'var(--ink)' }}>{conf.amber}</span>
            <ConfDot tone="green" /><span style={{ color: 'var(--ink)' }}>{conf.green}</span>
          </span>
        </div>
      </header>

      {/* ─── Plan de révision (collapsible) ─── */}
      {matiere.plan.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <button
            onClick={() => setPlanOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '14px 20px',
              background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
              borderRadius: planOpen ? '12px 12px 0 0' : 12, cursor: 'pointer',
              transition: 'border-radius var(--dur) var(--ease)',
            }}
          >
            <ML>Plan de révision</ML>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--ink-3)',
              transform: planOpen ? 'rotate(180deg)' : 'none',
              display: 'inline-block',
              transition: 'transform var(--dur) var(--ease)',
            }}>
              ▾
            </span>
          </button>
          {planOpen && (
            <div style={{
              background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
              borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden',
            }}>
              {matiere.plan.map((r, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr',
                  gap: 20, padding: '11px 20px',
                  borderBottom: i < matiere.plan.length - 1 ? '1px solid var(--paper-2)' : 'none',
                  alignItems: 'baseline',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: 'var(--terra)', letterSpacing: '0.02em',
                  }}>
                    {r.day}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 14,
                    color: 'var(--ink-2)', lineHeight: 1.5,
                  }}>
                    {r.focus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── Priorités épinglées ─── */}
      {matiere.priorities.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{
            background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
            borderLeft: '3px solid var(--terra)', borderRadius: 12,
            padding: '18px 22px',
          }}>
            <ML style={{ display: 'block', marginBottom: 14, color: 'var(--ink-2)' }}>
              {matiere.priorities.length} priorités
            </ML>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {matiere.priorities.map((p) => (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{
                    fontFamily: 'var(--font-serif)', fontSize: 15.5, fontStyle: 'italic',
                    color: 'var(--ink)', lineHeight: 1.3,
                  }}>
                    {p.text}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 13,
                    color: 'var(--ink-3)', lineHeight: 1.5,
                  }}>
                    {p.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Tableau de sujets ─── */}
      <section style={{ marginBottom: 28 }}>
        <SectionHead
          label={`Sujets · ${sujets.length}`}
          right={
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)',
              letterSpacing: '0.06em',
            }}>
              Clic pastille — changer confiance
            </span>
          }
        />
        <div style={{
          background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <SujetsTableHeader />
          {sujets.length === 0 ? (
            <div style={{ padding: '24px 22px' }}>
              <p style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: 14, color: 'var(--ink-3)', margin: 0,
              }}>
                Pas encore de sujets pour cette matière.
              </p>
            </div>
          ) : sujets.map((s, i) => (
            <SubjectRow
              key={s.id}
              sujet={s}
              isLast={i === sujets.length - 1}
              onCycleConfidence={() => cycleConfidence(s.id)}
              onToggle={(key) => toggleCheck(s.id, key)}
              onAddFlash={() => setFlashFor(s)}
            />
          ))}
        </div>
      </section>

      {/* ─── Simulations ─── */}
      <section style={{ marginBottom: 28 }}>
        <SectionHead
          label="Simulations"
          right={
            <button
              onClick={() => setSimDraftOpen(true)}
              style={{
                background: 'none', border: '1px solid var(--ink-4)',
                borderRadius: 7, padding: '4px 12px', cursor: 'pointer',
                color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 12.5,
                transition: 'background var(--dur) var(--ease)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              + Nouvelle simulation
            </button>
          }
        />
        <div style={{
          background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <SimulationsTableHeader />
          {simulations.map((sim) => (
            <SimulationRow
              key={sim.id}
              sim={sim}
              onDelete={() => deleteSimulation(sim.id)}
            />
          ))}
          {simDraftOpen ? (
            <SimulationDraftRow
              onCancel={() => setSimDraftOpen(false)}
              onConfirm={(input) => {
                addSimulation({ ...input, matiereId: matiere.id })
                setSimDraftOpen(false)
              }}
            />
          ) : (
            <div style={{ padding: '18px 20px', textAlign: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 13,
                color: 'var(--ink-4)', fontStyle: 'italic',
              }}>
                {simulations.length === 0
                  ? 'Tire un sujet, chronomètre-toi, note ta prestation.'
                  : 'Lance une nouvelle simulation.'}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ─── Flashcards rattachées ─── */}
      <section>
        <SectionHead
          label={`Flashcards · ${flashcards.length} cartes${dueCount > 0 ? ` · ${dueCount} due${dueCount > 1 ? 's' : ''}` : ''}`}
          right={
            dueCount > 0 && (
              <button
                onClick={() => setReviewOpen(true)}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: 'var(--terra)', border: 0,
                  color: 'var(--paper-1)',
                  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Réviser ces {dueCount} cartes →
              </button>
            )
          }
        />
        <div style={{
          background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
          borderRadius: 12, padding: flashcards.length === 0 ? '20px 22px' : 0,
          overflow: 'hidden',
        }}>
          {flashcards.length === 0 ? (
            <p style={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: 14, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5,
            }}>
              Pas encore de flashcards pour cette matière. Crée-les depuis un sujet (bouton +).
            </p>
          ) : flashcards.map((c, i) => {
            const sujetTitle = sujets.find((s) => s.id === c.sujetId)?.title
            const due = c.nextReview <= todayStr
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 14,
                  padding: '11px 22px',
                  borderBottom: i < flashcards.length - 1 ? '1px solid var(--paper-2)' : 'none',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-serif)', fontSize: 14.5,
                  color: 'var(--ink)', flex: 1, fontStyle: 'italic',
                }}>
                  {c.question}
                </span>
                {sujetTitle && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--ink-3)', letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                  }}>
                    {sujetTitle}
                  </span>
                )}
                {due && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--terra)', letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}>
                    due
                  </span>
                )}
                <button
                  onClick={() => deleteFlashcard(c.id)}
                  title="Supprimer"
                  style={{
                    background: 'transparent', border: 0, cursor: 'pointer',
                    color: 'var(--ink-4)', padding: 2, fontSize: 12,
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── Modal d'ajout flashcard ─── */}
      {flashFor && (
        <FlashModal
          matiereId={matiere.id}
          sujetId={flashFor.id}
          subjectTitle={flashFor.title}
          onClose={() => setFlashFor(null)}
          onConfirm={handleConfirmFlash}
        />
      )}

      {/* ─── Modal révision flashcards (filtrée par cette matière) ─── */}
      {reviewOpen && (
        <FlashcardReviewModal
          matiereId={matiere.id}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  )
}

// ─── SectionHead ──────────────────────────────────────────────────────────────

function SectionHead({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', marginBottom: 12,
    }}>
      <ML>{label}</ML>
      {right}
    </div>
  )
}

// ─── Tableaux : en-têtes ──────────────────────────────────────────────────────

function SujetsTableHeader() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto auto',
      gap: 24, padding: '10px 20px',
      background: 'var(--paper-2)', borderBottom: '1px solid var(--paper-2)',
      alignItems: 'center',
    }}>
      <ML>Intitulé</ML>
      <div style={{ display: 'flex', gap: 16 }}>
        {['F', 'R', 'S', 'Q'].map((l) => (
          <span key={l} style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-3)',
            width: 20, textAlign: 'center', display: 'block',
          }}>
            {l}
          </span>
        ))}
      </div>
      <ML>Conf.</ML>
      <div style={{ width: 28 }} />
    </div>
  )
}

function SimulationsTableHeader() {
  const headers = ['Date', 'Sujet tiré', 'Plan', 'Solidité', 'Temps', 'À corriger', '']
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '96px 1fr 78px 78px 70px 1fr 24px',
      gap: 12, padding: '10px 20px',
      background: 'var(--paper-2)', borderBottom: '1px solid var(--paper-2)',
    }}>
      {headers.map((h) => <ML key={h}>{h}</ML>)}
    </div>
  )
}

// ─── SimulationRow ────────────────────────────────────────────────────────────

const APPRAISAL_TONE: Record<'oui' | 'moyen' | 'non', 'green' | 'amber' | 'red'> = {
  oui:   'green',
  moyen: 'amber',
  non:   'red',
}

const APPRAISAL_LABEL: Record<'oui' | 'moyen' | 'non', string> = {
  oui:   'Oui',
  moyen: 'Moyen',
  non:   'Non',
}

function AppraisalCell({ value }: { value: Simulation['planClair'] }) {
  if (!value) {
    return <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-4)' }}>—</span>
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <ConfDot tone={APPRAISAL_TONE[value]} size={8} />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>
        {APPRAISAL_LABEL[value]}
      </span>
    </span>
  )
}

function SimulationRow({ sim, onDelete }: { sim: Simulation; onDelete: () => void }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '96px 1fr 78px 78px 70px 1fr 24px',
      gap: 12, padding: '13px 20px',
      borderBottom: '1px solid var(--paper-2)', alignItems: 'center',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
        {formatShortNumericDate(sim.date)}
      </span>
      <span style={{
        fontFamily: 'var(--font-serif)', fontSize: 14.5,
        color: 'var(--ink)', fontStyle: 'italic',
      }}>
        {sim.sujetTire}
      </span>
      <AppraisalCell value={sim.planClair} />
      <AppraisalCell value={sim.solidite} />
      <AppraisalCell value={sim.temps} />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>
        {sim.point || '—'}
      </span>
      <button
        onClick={onDelete}
        title="Supprimer la simulation"
        style={{
          background: 'transparent', border: 0, cursor: 'pointer',
          color: 'var(--ink-4)', padding: 0, fontSize: 12, lineHeight: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
      >
        ✕
      </button>
    </div>
  )
}

// ─── SimulationDraftRow (saisie inline) ───────────────────────────────────────

function SimulationDraftRow({
  onCancel, onConfirm,
}: {
  onCancel:  () => void
  onConfirm: (input: Omit<Simulation, 'id' | 'createdAt' | 'matiereId'>) => void
}) {
  const [date,       setDate]       = useState<string>(todayIso())
  const [sujetTire,  setSujetTire]  = useState('')
  const [planClair,  setPlanClair]  = useState<Simulation['planClair']>(null)
  const [solidite,   setSolidite]   = useState<Simulation['solidite']>(null)
  const [temps,      setTemps]      = useState<Simulation['temps']>(null)
  const [point,      setPoint]      = useState('')

  const canSave = sujetTire.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    onConfirm({ date, sujetId: null, sujetTire: sujetTire.trim(), planClair, solidite, temps, point: point.trim() })
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '96px 1fr 78px 78px 70px 1fr 24px',
      gap: 12, padding: '12px 20px',
      borderBottom: '1px solid var(--paper-2)', alignItems: 'center',
      background: 'var(--paper)',
    }}>
      <input
        type="date" value={date} onChange={(e) => setDate(e.target.value)}
        style={inputStyle}
      />
      <input
        autoFocus
        value={sujetTire}
        onChange={(e) => setSujetTire(e.target.value)}
        placeholder="Sujet tiré"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') onCancel()
        }}
        style={{ ...inputStyle, fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
      />
      <AppraisalSelect value={planClair} onChange={setPlanClair} />
      <AppraisalSelect value={solidite}  onChange={setSolidite} />
      <AppraisalSelect value={temps}     onChange={setTemps} />
      <input
        value={point} onChange={(e) => setPoint(e.target.value)}
        placeholder="à corriger…"
        style={inputStyle}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          onClick={handleSave}
          disabled={!canSave}
          title="Enregistrer"
          style={{
            background: canSave ? 'var(--terra)' : 'var(--paper-2)',
            color: canSave ? 'var(--paper-1)' : 'var(--ink-4)',
            border: 0, borderRadius: 4, padding: 0,
            width: 22, height: 14, fontSize: 10, lineHeight: 1, cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          ✓
        </button>
        <button
          onClick={onCancel}
          title="Annuler"
          style={{
            background: 'transparent', border: '1px solid var(--ink-4)',
            color: 'var(--ink-3)', borderRadius: 4, padding: 0,
            width: 22, height: 14, fontSize: 10, lineHeight: 1, cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)',
  background: 'var(--paper-1)', border: '1px solid var(--ink-4)',
  borderRadius: 6, padding: '6px 8px', outline: 'none', width: '100%',
  boxSizing: 'border-box',
}

function AppraisalSelect({
  value, onChange,
}: {
  value:    Simulation['planClair']
  onChange: (v: Simulation['planClair']) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value || null) as Simulation['planClair'])}
      style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
    >
      <option value="">—</option>
      <option value="oui">Oui</option>
      <option value="moyen">Moyen</option>
      <option value="non">Non</option>
    </select>
  )
}

