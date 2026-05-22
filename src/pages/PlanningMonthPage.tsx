import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, Plus, X } from 'lucide-react'
import { usePlanningStore } from '../store/planningStore'

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
  minHeight: 60,
  lineHeight: 1.55,
}

const ghostBtn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: 'transparent', color: 'var(--fg-muted)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '6px 12px', fontSize: 12.5,
  cursor: 'pointer', textDecoration: 'none',
}

const subtleBtn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'transparent', color: 'var(--fg-muted)',
  border: '1px dashed var(--border)', borderRadius: 8,
  padding: '6px 12px', fontSize: 12.5,
  cursor: 'pointer',
}

const iconGhost: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', color: 'var(--fg-subtle)',
  border: 'none', cursor: 'pointer',
  padding: 4, borderRadius: 6,
}

// =============================================================================
// Utils
// =============================================================================

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function shiftMonth(year: number, month: number, delta: number): { year: number, month: number } {
  // month en 1-12
  const idx = (year * 12 + (month - 1)) + delta
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 }
}

function getCurrentYearMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

// =============================================================================
// Page
// =============================================================================

export function PlanningMonthPage() {
  const { y, w: _w, m } = useParams<{ y: string, m: string, w?: string }>()
  const navigate = useNavigate()

  const cur = getCurrentYearMonth()
  const year  = y ? Number(y) : cur.year
  const month = m ? Number(m) : cur.month

  const months      = usePlanningStore((s) => s.months)
  const addMonth    = usePlanningStore((s) => s.addMonth)
  const updateMonth = usePlanningStore((s) => s.updateMonth)

  const existing = useMemo(
    () => months.find((mo) => mo.year === year && mo.month === month),
    [months, year, month],
  )

  const [milestones, setMilestones]         = useState<string[]>(existing?.milestones ?? [])
  const [weeklyFocus, setWeeklyFocus]       = useState(existing?.weeklyFocus ?? [])
  const [identifiedRisk, setIdentifiedRisk] = useState(existing?.identifiedRisk ?? '')
  const [mitigationPlan, setMitigationPlan] = useState(existing?.mitigationPlan ?? '')

  // Reload quand on change de mois
  useEffect(() => {
    const fresh = months.find((mo) => mo.year === year && mo.month === month)
    setMilestones(fresh?.milestones ?? [])
    setWeeklyFocus(fresh?.weeklyFocus ?? [])
    setIdentifiedRisk(fresh?.identifiedRisk ?? '')
    setMitigationPlan(fresh?.mitigationPlan ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  const persist = (patch: {
    milestones?: string[]
    weeklyFocus?: { isoWeek: number, focus: string }[]
    identifiedRisk?: string
    mitigationPlan?: string
  }) => {
    if (existing) {
      updateMonth(existing.id, patch)
    } else {
      addMonth({
        year, month,
        milestones:     patch.milestones     ?? milestones,
        weeklyFocus:    patch.weeklyFocus    ?? weeklyFocus,
        identifiedRisk: patch.identifiedRisk ?? identifiedRisk,
        mitigationPlan: patch.mitigationPlan ?? mitigationPlan,
      })
    }
  }

  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, +1)
  const isCurrentMonth = year === cur.year && month === cur.month

  const milestoneAtCap = milestones.length >= 3

  // ── Mutations milestones ─────────────────────────────────────────────────
  const updateMilestone = (idx: number, value: string) => {
    const updated = milestones.map((m_, i) => i === idx ? value : m_)
    setMilestones(updated)
  }
  const commitMilestones = (updated: string[]) => {
    setMilestones(updated)
    persist({ milestones: updated })
  }
  const addMilestone = () => {
    if (milestoneAtCap) return
    commitMilestones([...milestones, ''])
  }
  const removeMilestone = (idx: number) => {
    commitMilestones(milestones.filter((_, i) => i !== idx))
  }

  // ── Mutations weeklyFocus ────────────────────────────────────────────────
  const updateFocus = (idx: number, patch: Partial<{ isoWeek: number, focus: string }>) => {
    setWeeklyFocus(weeklyFocus.map((wf, i) => i === idx ? { ...wf, ...patch } : wf))
  }
  const commitFocus = (updated: { isoWeek: number, focus: string }[]) => {
    setWeeklyFocus(updated)
    persist({ weeklyFocus: updated })
  }
  const addFocus = () => {
    commitFocus([...weeklyFocus, { isoWeek: 0, focus: '' }])
  }
  const removeFocus = (idx: number) => {
    commitFocus(weeklyFocus.filter((_, i) => i !== idx))
  }

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '28px 24px 80px',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* ── Header / nav ────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/planning" style={{ ...labelStyle, color: 'var(--fg-subtle)', textDecoration: 'none' }}>
            ← Planning
          </Link>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={ghostBtn} onClick={() => navigate(`/planning/months/${prev.year}/${prev.month}`)} title="Mois précédent">
              <ChevronLeft size={14} />
            </button>
            {!isCurrentMonth && (
              <button style={ghostBtn} onClick={() => navigate(`/planning/months/${cur.year}/${cur.month}`)}>
                <Calendar size={12} /> Ce mois-ci
              </button>
            )}
            <button style={ghostBtn} onClick={() => navigate(`/planning/months/${next.year}/${next.month}`)} title="Mois suivant">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div>
          <span style={labelStyle}>
            {isCurrentMonth ? 'Ce mois-ci' : 'Mois'}
          </span>
          <h1 style={{ ...sectionTitle, marginTop: 4 }}>
            {MONTH_NAMES[month - 1]} {year}
          </h1>
        </div>
      </header>

      {/* ── Jalons ──────────────────────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ ...labelStyle, color: 'var(--terra)' }}>Jalons du mois · 3 max</span>
          <span style={{ ...labelStyle, color: 'var(--fg-subtle)' }}>{milestones.length}/3</span>
        </div>
        <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: '4px 0 14px' }}>
          Ce qui doit être livré dans le mois pour que les Rocks avancent. Pas des intentions — des livrables.
        </p>

        {milestones.length === 0 && (
          <p style={{ color: 'var(--fg-subtle)', fontSize: 13, fontStyle: 'italic', margin: '0 0 12px' }}>
            Aucun jalon. Ajoute jusqu'à 3 livrables datés.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {milestones.map((ms, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                ...labelStyle, fontSize: 11,
                width: 24, height: 24, borderRadius: 6,
                background: 'var(--terra-soft)', color: 'var(--terra)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {idx + 1}
              </span>
              <textarea
                style={{ ...textareaStyle, minHeight: 50 }}
                placeholder="Ex: Rendre la première partie du rapport"
                value={ms}
                onChange={(e) => updateMilestone(idx, e.target.value)}
                onBlur={() => commitMilestones(milestones)}
              />
              <button style={iconGhost} onClick={() => removeMilestone(idx)} title="Retirer">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <button
          style={{ ...subtleBtn, marginTop: 14 }}
          onClick={addMilestone}
          disabled={milestoneAtCap}
          title={milestoneAtCap ? 'Maximum 3 jalons atteint' : 'Ajouter un jalon'}
        >
          <Plus size={12} /> {milestoneAtCap ? 'Maximum atteint' : 'Ajouter un jalon'}
        </button>
      </section>

      {/* ── Risque + mitigation ─────────────────────────────────────────────── */}
      <section style={{ ...card }}>
        <span style={labelStyle}>Risque identifié pour le mois</span>
        <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: '4px 0 10px' }}>
          « Quel risque concret pourrait casser ce mois ? »
        </p>
        <textarea
          style={{ ...textareaStyle, minHeight: 50 }}
          placeholder="—"
          value={identifiedRisk}
          onChange={(e) => setIdentifiedRisk(e.target.value)}
          onBlur={() => persist({ identifiedRisk })}
        />
        <div style={{ marginTop: 14 }}>
          <span style={labelStyle}>Plan de mitigation</span>
          <textarea
            style={{ ...textareaStyle, minHeight: 50, marginTop: 6 }}
            placeholder="Comment je désamorce ce risque ?"
            value={mitigationPlan}
            onChange={(e) => setMitigationPlan(e.target.value)}
            onBlur={() => persist({ mitigationPlan })}
          />
        </div>
      </section>

      {/* ── Découpage hebdo prévisionnel ────────────────────────────────────── */}
      <section style={{ ...card }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={labelStyle}>Découpage hebdo prévisionnel</span>
          <span style={{ ...labelStyle, color: 'var(--fg-subtle)' }}>Optionnel</span>
        </div>
        <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: '4px 0 14px' }}>
          Pour chaque semaine ISO du mois, un focus en une phrase.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weeklyFocus.map((wf, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                style={{ ...input, width: 90, flexShrink: 0 }}
                type="number" min={1} max={53}
                placeholder="S"
                value={wf.isoWeek || ''}
                onChange={(e) => updateFocus(idx, { isoWeek: Number(e.target.value) })}
                onBlur={() => commitFocus(weeklyFocus)}
              />
              <input
                style={{ ...input, flex: 1 }}
                placeholder="Focus de la semaine"
                value={wf.focus}
                onChange={(e) => updateFocus(idx, { focus: e.target.value })}
                onBlur={() => commitFocus(weeklyFocus)}
              />
              <button style={iconGhost} onClick={() => removeFocus(idx)} title="Retirer">
                <X size={14} />
              </button>
            </div>
          ))}
          <button style={{ ...subtleBtn, alignSelf: 'flex-start', marginTop: 4 }} onClick={addFocus}>
            <Plus size={12} /> Ajouter une semaine
          </button>
        </div>
      </section>
    </div>
  )
}
