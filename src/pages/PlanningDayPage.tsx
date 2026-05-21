import { useState, useEffect, type CSSProperties } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { usePlanningStore } from '../store/planningStore'
import type { DayType, Energy } from '../store/planningStore'
import { todayISO, tomorrowISO, shiftDateISO, formatDayLong } from '../utils/isoWeek'

// =============================================================================
// Tokens (cohérents avec PlanningPage)
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
  minHeight: 60,
  lineHeight: 1.55,
  fontSize: 14,
}

const ghostBtn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'transparent', color: 'var(--fg-muted)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '6px 12px', fontSize: 12.5,
  cursor: 'pointer',
  textDecoration: 'none',
}

const chipBtn = (active: boolean): CSSProperties => ({
  ...labelStyle,
  background: active ? 'var(--terra-soft)' : 'transparent',
  color:      active ? 'var(--terra)' : 'var(--fg-muted)',
  border:    `1px solid ${active ? 'var(--terra)' : 'var(--border)'}`,
  padding: '4px 10px', borderRadius: 6, fontSize: 10,
  cursor: 'pointer',
})

// =============================================================================
// PlanningDayPage
// =============================================================================

export function PlanningDayPage() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const navigate = useNavigate()
  const date = dateParam ?? todayISO()

  const dayPlans      = usePlanningStore((s) => s.dayPlans)
  const upsertDayPlan = usePlanningStore((s) => s.upsertDayPlan)

  const existing = dayPlans.find((d) => d.date === date)

  // État local (synchronisé avec le store) — édition immédiate
  const [priority,       setPriority]       = useState(existing?.priority ?? '')
  const [importants,     setImportants]     = useState<string[]>(existing?.importants ?? ['', '', ''])
  const [secondaries,    setSecondaries]    = useState<string[]>(existing?.secondaries ?? ['', '', '', '', ''])
  const [dayType,        setDayType]        = useState<DayType | undefined>(existing?.dayType)
  const [energyExpected, setEnergyExpected] = useState<Energy | undefined>(existing?.energyExpected)
  const [pivotQuestion,  setPivotQuestion]  = useState(existing?.pivotQuestion ?? '')
  const [prepChecklist,  setPrepChecklist]  = useState(
    existing?.prepChecklist ?? [
      { label: 'Tenue préparée',      done: false },
      { label: 'Sac préparé',         done: false },
      { label: 'Kindle chargé',       done: false },
      { label: 'Documents prêts',     done: false },
    ],
  )

  // Recharge si la date change (navigation)
  useEffect(() => {
    const fresh = dayPlans.find((d) => d.date === date)
    setPriority(fresh?.priority ?? '')
    setImportants(padArray(fresh?.importants ?? [], 3))
    setSecondaries(padArray(fresh?.secondaries ?? [], 5))
    setDayType(fresh?.dayType)
    setEnergyExpected(fresh?.energyExpected)
    setPivotQuestion(fresh?.pivotQuestion ?? '')
    setPrepChecklist(fresh?.prepChecklist ?? [
      { label: 'Tenue préparée',  done: false },
      { label: 'Sac préparé',     done: false },
      { label: 'Kindle chargé',   done: false },
      { label: 'Documents prêts', done: false },
    ])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const save = (patch: Partial<Parameters<typeof upsertDayPlan>[1]>) => {
    upsertDayPlan(date, {
      priority:       patch.priority       ?? priority,
      importants:     patch.importants     ?? importants.filter((s) => s.trim().length > 0),
      secondaries:    patch.secondaries    ?? secondaries.filter((s) => s.trim().length > 0),
      dayType:        patch.dayType        ?? dayType,
      energyExpected: patch.energyExpected ?? energyExpected,
      pivotQuestion:  patch.pivotQuestion  ?? pivotQuestion,
      prepChecklist:  patch.prepChecklist  ?? prepChecklist,
    })
  }

  const isToday    = date === todayISO()
  const isTomorrow = date === tomorrowISO()
  const prevDate   = shiftDateISO(date, -1)
  const nextDate   = shiftDateISO(date, +1)

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '28px 24px 80px',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* ── Header / navigation ────────────────────────────────────────────── */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <Link to="/planning" style={{ ...labelStyle, color: 'var(--fg-subtle)', textDecoration: 'none' }}>
            ← Planning
          </Link>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button style={ghostBtn} onClick={() => navigate(`/planning/day/${prevDate}`)} title="Jour précédent">
              <ChevronLeft size={14} />
            </button>
            {!isToday && (
              <button style={ghostBtn} onClick={() => navigate('/planning/day')}>
                <Calendar size={12} /> Aujourd'hui
              </button>
            )}
            {!isTomorrow && (
              <button style={ghostBtn} onClick={() => navigate(`/planning/day/${tomorrowISO()}`)}>
                Demain →
              </button>
            )}
            <button style={ghostBtn} onClick={() => navigate(`/planning/day/${nextDate}`)} title="Jour suivant">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div>
          <span style={labelStyle}>
            {isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : 'Planification'}
          </span>
          <h1 style={{ ...sectionTitle, marginTop: 4, textTransform: 'capitalize' }}>
            {formatDayLong(date)}
          </h1>
        </div>
      </header>

      {/* ── Type de journée + énergie ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>Type de journée</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['cabinet', 'ecole', 'libre'] as DayType[]).map((t) => (
              <button
                key={t}
                style={chipBtn(dayType === t)}
                onClick={() => { setDayType(t); save({ dayType: t }) }}
              >
                {t === 'cabinet' ? 'Cabinet' : t === 'ecole' ? 'École' : 'Libre'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>Énergie attendue</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['faible', 'moyenne', 'haute'] as Energy[]).map((e) => (
              <button
                key={e}
                style={chipBtn(energyExpected === e)}
                onClick={() => { setEnergyExpected(e); save({ energyExpected: e }) }}
              >
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Priorité absolue ────────────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <span style={{ ...labelStyle, color: 'var(--terra)' }}>Priorité absolue · 1</span>
        <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: '4px 0 10px' }}>
          La seule chose qui doit être faite. Si rien d'autre n'est livré, la journée est réussie.
        </p>
        <textarea
          style={{ ...textareaStyle, minHeight: 50 }}
          placeholder="Ex. Rédiger la partie II § 2 du rapport d'alternance"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          onBlur={() => save({ priority })}
        />
      </section>

      {/* ── 3 importantes ───────────────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <span style={labelStyle}>Importantes · 3 max</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {importants.map((val, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ ...labelStyle, fontSize: 11, width: 16 }}>{idx + 1}</span>
              <input
                style={input}
                placeholder="—"
                value={val}
                onChange={(e) => {
                  const next = [...importants]
                  next[idx] = e.target.value
                  setImportants(next)
                }}
                onBlur={() => save({ importants: importants.filter((s) => s.trim().length > 0) })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── 5 secondaires ───────────────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <span style={labelStyle}>Secondaires · 5 max</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {secondaries.map((val, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ ...labelStyle, fontSize: 10, width: 16, color: 'var(--fg-subtle)' }}>{idx + 1}</span>
              <input
                style={{ ...input, padding: '6px 10px', fontSize: 13 }}
                placeholder="—"
                value={val}
                onChange={(e) => {
                  const next = [...secondaries]
                  next[idx] = e.target.value
                  setSecondaries(next)
                }}
                onBlur={() => save({ secondaries: secondaries.filter((s) => s.trim().length > 0) })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Question pivot ──────────────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <span style={labelStyle}>Question pivot</span>
        <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: '4px 0 10px' }}>
          « Si je ne fais qu'UNE chose demain, c'est… »
        </p>
        <input
          style={input}
          placeholder="—"
          value={pivotQuestion}
          onChange={(e) => setPivotQuestion(e.target.value)}
          onBlur={() => save({ pivotQuestion })}
        />
      </section>

      {/* ── Préparation matérielle ─────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <span style={labelStyle}>Préparation matérielle</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {prepChecklist.map((item, idx) => (
            <label key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13.5, color: 'var(--fg)',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => {
                  const next = prepChecklist.map((it, i) => i === idx ? { ...it, done: !it.done } : it)
                  setPrepChecklist(next)
                  save({ prepChecklist: next })
                }}
                style={{ accentColor: 'var(--terra)' }}
              />
              <input
                type="text"
                style={{ ...input, padding: '4px 8px', fontSize: 13, border: 'none', textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.5 : 1 }}
                value={item.label}
                onChange={(e) => {
                  const next = prepChecklist.map((it, i) => i === idx ? { ...it, label: e.target.value } : it)
                  setPrepChecklist(next)
                }}
                onBlur={() => save({ prepChecklist })}
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function padArray(arr: string[], n: number): string[] {
  const result = [...arr]
  while (result.length < n) result.push('')
  return result.slice(0, n)
}
