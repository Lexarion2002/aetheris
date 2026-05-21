import { useState, useMemo, type CSSProperties } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { usePlanningStore } from '../store/planningStore'
import {
  getISOWeek, getISOWeekYear, weekRange, formatWeekRange, shiftISOWeek,
} from '../utils/isoWeek'

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
  fontSize: 22, fontWeight: 500, color: 'var(--fg)',
  letterSpacing: '-0.01em',
}

const card: CSSProperties = {
  background: 'var(--paper-1)',
  border: '1px solid var(--paper-2)',
  borderRadius: 12,
  padding: 18,
}

const input: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13.5,
  fontFamily: 'var(--font-sans)',
  color: 'var(--fg)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const textareaStyle: CSSProperties = {
  ...input,
  resize: 'vertical',
  minHeight: 70,
  lineHeight: 1.55,
}

const btnPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--terra)', color: 'var(--paper)',
  border: 'none', borderRadius: 8,
  padding: '10px 18px', fontSize: 13.5, fontWeight: 500,
  cursor: 'pointer',
}

const btnGhost: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'transparent', color: 'var(--fg-muted)',
  border: '1px dashed var(--border)', borderRadius: 8,
  padding: '8px 14px', fontSize: 13,
  cursor: 'pointer',
}

const ghostBtn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', color: 'var(--fg-subtle)',
  border: 'none', cursor: 'pointer',
  padding: 4, borderRadius: 6,
}

const chipBtn = (active: boolean, tone: 'sage' | 'amber' | 'red' | 'neutral'): CSSProperties => {
  const colors = {
    sage:    { bg: 'var(--sage-soft)',  fg: 'var(--sage-deep)' },
    amber:   { bg: '#fef3d0',           fg: '#a36b00' },
    red:     { bg: '#fde2dd',           fg: '#a03826' },
    neutral: { bg: 'var(--paper-2)',    fg: 'var(--ink-3)' },
  }
  const c = colors[tone]
  return {
    ...labelStyle,
    background: active ? c.bg : 'transparent',
    color:      active ? c.fg : 'var(--fg-muted)',
    border:    `1px solid ${active ? c.fg : 'var(--border)'}`,
    padding: '4px 10px', borderRadius: 6, fontSize: 10,
    cursor: 'pointer',
  }
}

// =============================================================================
// Type local pour habit row
// =============================================================================

interface HabitRow {
  name: string
  hit:  number
  total: number
}

type MitStatus = 'done' | 'partial' | 'missed' | undefined

// =============================================================================
// Page
// =============================================================================

export function PlanningWeeklyReviewPage() {
  const navigate    = useNavigate()
  const [params]    = useSearchParams()
  const kind        = params.get('kind') ?? 'weekly'
  const addReview   = usePlanningStore((s) => s.addReview)
  const weeks       = usePlanningStore((s) => s.weeks)

  // La revue couvre la semaine ISO précédente (qu'on évalue le dimanche soir/lundi)
  // ou la semaine en cours si on est dimanche. Par défaut : semaine en cours.
  const today = useMemo(() => new Date(), [])
  const [isoYear] = useState(getISOWeekYear(today))
  const [isoWeek] = useState(getISOWeek(today))

  const week = weeks.find((w) => w.isoYear === isoYear && w.isoWeek === isoWeek)
  const range = weekRange(isoYear, isoWeek)

  // MIT statuses (pré-remplis depuis Week.mit1/2/3)
  const [mit1Status, setMit1Status] = useState<MitStatus>(undefined)
  const [mit2Status, setMit2Status] = useState<MitStatus>(undefined)
  const [mit3Status, setMit3Status] = useState<MitStatus>(undefined)

  // Habitudes
  const [habits, setHabits] = useState<HabitRow[]>([
    { name: 'Écriture 21h-23h', hit: 0, total: 7 },
    { name: 'Pas de RS avant 9h', hit: 0, total: 7 },
  ])

  // Indicateurs
  const [energyAvg, setEnergyAvg] = useState<number | undefined>(undefined)
  const [rsHours,   setRsHours]   = useState<number | undefined>(undefined)

  // Bilan
  const [victory,             setVictory]             = useState('')
  const [difficulty,          setDifficulty]          = useState('')
  const [difficultyRootCause, setDifficultyRootCause] = useState('')
  const [learning,            setLearning]            = useState('')
  const [nextWeekPivot,       setNextWeekPivot]       = useState('')

  // Note pour revues non-hebdo (markdown libre)
  const [bodyMd, setBodyMd] = useState('')

  const isWeekly = kind === 'weekly'

  const handleSubmit = () => {
    const habitsScore: Record<string, { hit: number, total: number }> = {}
    for (const h of habits) {
      const slug = h.name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      if (slug) habitsScore[slug] = { hit: h.hit, total: h.total }
    }

    addReview({
      kind: kind as 'weekly' | 'monthly' | 'quarterly' | 'annual',
      periodStart: range.start,
      periodEnd:   range.end,
      ...(isWeekly && {
        mit1Status, mit2Status, mit3Status,
        habitsScore,
        energyAvg, rsHours,
        victory, difficulty, difficultyRootCause, learning, nextWeekPivot,
      }),
      ...(!isWeekly && { bodyMd }),
    })

    // Crée aussi la semaine suivante (3 MITs vides) si elle n'existe pas
    // pour faciliter le rituel "planifier la semaine à venir" en fin de revue.
    navigate('/planning/week/' + shiftISOWeek(isoYear, isoWeek, 1).isoYear + '/' + shiftISOWeek(isoYear, isoWeek, 1).isoWeek)
  }

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '28px 24px 80px',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link to="/planning" style={{ ...labelStyle, color: 'var(--fg-subtle)', textDecoration: 'none' }}>
          ← Planning
        </Link>
        <span style={labelStyle}>
          Revue {isWeekly ? 'hebdomadaire' : kind} · S{isoWeek} {isoYear}
        </span>
        <h1 style={sectionTitle}>{formatWeekRange(isoYear, isoWeek)}</h1>
      </header>

      {!isWeekly ? (
        // ── Revue non-hebdo : Markdown libre ────────────────────────────────
        <section style={{ ...card }}>
          <span style={labelStyle}>Bilan libre</span>
          <textarea
            style={{ ...textareaStyle, minHeight: 320, marginTop: 10 }}
            placeholder="Écris la revue en Markdown libre…"
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
          />
        </section>
      ) : (
        <>
          {/* ── MIT statuses ──────────────────────────────────────────────── */}
          <section style={{ ...card }}>
            <span style={{ ...labelStyle, color: 'var(--terra)' }}>MITs de la semaine</span>
            {!week && (
              <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: '6px 0 0' }}>
                Aucune Week S{isoWeek} {isoYear} dans le store — tes MITs ne sont pas saisis.
                Tu peux quand même évaluer en remplissant le contexte plus bas.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              {[
                { num: 1, label: week?.mit1, status: mit1Status, set: setMit1Status },
                { num: 2, label: week?.mit2, status: mit2Status, set: setMit2Status },
                { num: 3, label: week?.mit3, status: mit3Status, set: setMit3Status },
              ].map(({ num, label, status, set }) => (
                <div key={num} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{
                      ...labelStyle, fontSize: 11,
                      width: 22, height: 22, borderRadius: 6,
                      background: 'var(--terra-soft)', color: 'var(--terra)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {num}
                    </span>
                    <span style={{ fontSize: 13.5, color: 'var(--fg)', flex: 1 }}>
                      {label || <span style={{ color: 'var(--fg-subtle)', fontStyle: 'italic' }}>—</span>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, paddingLeft: 30 }}>
                    <button style={chipBtn(status === 'done',    'sage')}  onClick={() => set('done')}>Livré</button>
                    <button style={chipBtn(status === 'partial', 'amber')} onClick={() => set('partial')}>Partiel</button>
                    <button style={chipBtn(status === 'missed',  'red')}   onClick={() => set('missed')}>Raté</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Habitudes ──────────────────────────────────────────────────── */}
          <section style={{ ...card }}>
            <span style={labelStyle}>Tenue des habitudes</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {habits.map((h, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    style={{ ...input, flex: 1 }}
                    placeholder="Nom habitude"
                    value={h.name}
                    onChange={(e) => updateHabit(idx, { name: e.target.value })}
                  />
                  <input
                    style={{ ...input, width: 70, textAlign: 'right' }}
                    type="number" min={0} max={h.total}
                    value={h.hit}
                    onChange={(e) => updateHabit(idx, { hit: Number(e.target.value) })}
                  />
                  <span style={{ ...labelStyle, fontSize: 11 }}>/</span>
                  <input
                    style={{ ...input, width: 70, textAlign: 'right' }}
                    type="number" min={1}
                    value={h.total}
                    onChange={(e) => updateHabit(idx, { total: Number(e.target.value) })}
                  />
                  <button style={ghostBtn} onClick={() => removeHabit(idx)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                style={{ ...btnGhost, alignSelf: 'flex-start' }}
                onClick={() => setHabits([...habits, { name: '', hit: 0, total: 7 }])}
              >
                <Plus size={12} /> Ajouter une habitude
              </button>
            </div>
          </section>

          {/* ── Indicateurs ────────────────────────────────────────────────── */}
          <section style={{ ...card }}>
            <span style={labelStyle}>Indicateurs</span>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
                <span style={labelStyle}>Énergie moyenne (1-10)</span>
                <input
                  style={input}
                  type="number" min={1} max={10}
                  value={energyAvg ?? ''}
                  onChange={(e) => setEnergyAvg(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
                <span style={labelStyle}>Heures RS (Screen Time)</span>
                <input
                  style={input}
                  type="number" step={0.1} min={0}
                  value={rsHours ?? ''}
                  onChange={(e) => setRsHours(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>
          </section>

          {/* ── Bilan qualitatif ───────────────────────────────────────────── */}
          <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={labelStyle}>Bilan qualitatif</span>

            <Field label="Victoire de la semaine" value={victory} onChange={setVictory} />
            <Field label="Difficulté principale" value={difficulty} onChange={setDifficulty} />
            <Field
              label="Cause racine de la difficulté"
              hint="Une cause, pas une liste. Si non identifiable : « à creuser »."
              value={difficultyRootCause}
              onChange={setDifficultyRootCause}
            />
            <Field label="Apprentissage à retenir" value={learning} onChange={setLearning} />
            <Field
              label="Pivot pour la semaine suivante"
              hint="Un seul changement, pas une liste."
              value={nextWeekPivot}
              onChange={setNextWeekPivot}
            />
          </section>
        </>
      )}

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Link to="/planning" style={{ ...btnGhost, textDecoration: 'none' }}>
          Annuler
        </Link>
        <button style={btnPrimary} onClick={handleSubmit}>
          Enregistrer la revue
        </button>
      </div>
    </div>
  )

  // ── helpers ─────────────────────────────────────────────────────────────
  function updateHabit(idx: number, patch: Partial<HabitRow>) {
    setHabits(habits.map((h, i) => i === idx ? { ...h, ...patch } : h))
  }
  function removeHabit(idx: number) {
    setHabits(habits.filter((_, i) => i !== idx))
  }
}

// =============================================================================
// Sous-composant : champ libellé + textarea
// =============================================================================

function Field({ label, value, onChange, hint }: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      {hint && (
        <span style={{ color: 'var(--fg-subtle)', fontSize: 11.5, fontStyle: 'italic' }}>
          {hint}
        </span>
      )}
      <textarea
        style={textareaStyle}
        placeholder="—"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
