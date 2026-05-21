import { useState, useEffect, type CSSProperties } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, ClipboardCheck } from 'lucide-react'
import { usePlanningStore } from '../store/planningStore'
import {
  getISOWeek, getISOWeekYear, shiftISOWeek, formatWeekRange,
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
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  color: 'var(--fg)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const textareaStyle: CSSProperties = {
  ...input,
  resize: 'vertical',
  minHeight: 80,
  lineHeight: 1.55,
}

const ghostBtn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'transparent', color: 'var(--fg-muted)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '6px 12px', fontSize: 12.5,
  cursor: 'pointer',
  textDecoration: 'none',
}

const btnPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--terra)', color: 'var(--paper)',
  border: 'none', borderRadius: 8,
  padding: '8px 14px', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', textDecoration: 'none',
}

// =============================================================================
// PlanningWeekPage
// =============================================================================

export function PlanningWeekPage() {
  const { y, w } = useParams<{ y?: string, w?: string }>()
  const navigate = useNavigate()

  const today = new Date()
  const currentIsoYear = y ? Number(y) : getISOWeekYear(today)
  const currentIsoWeek = w ? Number(w) : getISOWeek(today)

  const weeks       = usePlanningStore((s) => s.weeks)
  const upsertWeek  = usePlanningStore((s) => s.upsertWeek)

  const existing = weeks.find((wk) => wk.isoYear === currentIsoYear && wk.isoWeek === currentIsoWeek)

  const [mit1, setMit1]                   = useState(existing?.mit1 ?? '')
  const [mit2, setMit2]                   = useState(existing?.mit2 ?? '')
  const [mit3, setMit3]                   = useState(existing?.mit3 ?? '')
  const [risk, setRisk]                   = useState(existing?.risk ?? '')
  const [mitigationPlan, setMitigationPlan] = useState(existing?.mitigationPlan ?? '')
  const [notes, setNotes]                 = useState(existing?.notes ?? '')

  // Recharge si on change de semaine
  useEffect(() => {
    const fresh = weeks.find((wk) => wk.isoYear === currentIsoYear && wk.isoWeek === currentIsoWeek)
    setMit1(fresh?.mit1 ?? '')
    setMit2(fresh?.mit2 ?? '')
    setMit3(fresh?.mit3 ?? '')
    setRisk(fresh?.risk ?? '')
    setMitigationPlan(fresh?.mitigationPlan ?? '')
    setNotes(fresh?.notes ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIsoYear, currentIsoWeek])

  const save = (patch: Parameters<typeof upsertWeek>[2]) => {
    upsertWeek(currentIsoYear, currentIsoWeek, patch)
  }

  const isCurrentWeek = currentIsoYear === getISOWeekYear(today) && currentIsoWeek === getISOWeek(today)
  const prev = shiftISOWeek(currentIsoYear, currentIsoWeek, -1)
  const next = shiftISOWeek(currentIsoYear, currentIsoWeek, +1)

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '28px 24px 80px',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* ── Header / navigation ────────────────────────────────────────────── */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Link to="/planning" style={{ ...labelStyle, color: 'var(--fg-subtle)', textDecoration: 'none' }}>
            ← Planning
          </Link>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={ghostBtn} onClick={() => navigate(`/planning/week/${prev.isoYear}/${prev.isoWeek}`)} title="Semaine précédente">
              <ChevronLeft size={14} />
            </button>
            {!isCurrentWeek && (
              <button style={ghostBtn} onClick={() => navigate('/planning/week')}>
                <Calendar size={12} /> Cette semaine
              </button>
            )}
            <button style={ghostBtn} onClick={() => navigate(`/planning/week/${next.isoYear}/${next.isoWeek}`)} title="Semaine suivante">
              <ChevronRight size={14} />
            </button>
            <Link to="/planning/review/new?kind=weekly" style={btnPrimary}>
              <ClipboardCheck size={14} /> Faire la revue hebdo
            </Link>
          </div>
        </div>
        <div>
          <span style={labelStyle}>
            {isCurrentWeek ? 'Cette semaine' : 'Semaine'} · S{currentIsoWeek} {currentIsoYear}
          </span>
          <h1 style={{ ...sectionTitle, marginTop: 4 }}>
            {formatWeekRange(currentIsoYear, currentIsoWeek)}
          </h1>
        </div>
      </header>

      {/* ── 3 MITs ─────────────────────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ ...labelStyle, color: 'var(--terra)' }}>Most Important Tasks · 3 max</span>
        </div>
        <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: '4px 0 14px' }}>
          Trois livrables qui, s'ils sont faits, rendent la semaine réussie. Pas des tâches —
          des résultats. Les sous-tâches d'exécution vivent dans TickTick.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { num: 1, val: mit1, set: setMit1, key: 'mit1' as const },
            { num: 2, val: mit2, set: setMit2, key: 'mit2' as const },
            { num: 3, val: mit3, set: setMit3, key: 'mit3' as const },
          ].map(({ num, val, set, key }) => (
            <div key={num} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                ...labelStyle, fontSize: 11,
                width: 24, height: 24, borderRadius: 6,
                background: 'var(--terra-soft)', color: 'var(--terra)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {num}
              </span>
              <textarea
                style={{ ...textareaStyle, minHeight: 50 }}
                placeholder={`MIT ${num} — un livrable hebdo`}
                value={val}
                onChange={(e) => set(e.target.value)}
                onBlur={() => save({ [key]: val })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Risque + mitigation ────────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <span style={labelStyle}>Risque identifié pour la semaine</span>
        <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: '4px 0 10px' }}>
          « Quel risque concret pourrait casser cette semaine ? »
        </p>
        <textarea
          style={{ ...textareaStyle, minHeight: 50 }}
          placeholder="—"
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          onBlur={() => save({ risk })}
        />
        <div style={{ marginTop: 14 }}>
          <span style={labelStyle}>Plan de mitigation</span>
          <textarea
            style={{ ...textareaStyle, minHeight: 50, marginTop: 6 }}
            placeholder="Comment je désamorce ce risque ?"
            value={mitigationPlan}
            onChange={(e) => setMitigationPlan(e.target.value)}
            onBlur={() => save({ mitigationPlan })}
          />
        </div>
      </section>

      {/* ── Notes libres ──────────────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <span style={labelStyle}>Notes libres</span>
        <textarea
          style={{ ...textareaStyle, marginTop: 10, minHeight: 80 }}
          placeholder="Pensées, contexte, ce qui peut influencer la semaine…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => save({ notes })}
        />
      </section>
    </div>
  )
}
