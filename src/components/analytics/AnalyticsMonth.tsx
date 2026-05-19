import { useMemo, type CSSProperties } from 'react'
import { useStore } from '../../store'
import { getDomainIcon } from '../../utils/domainColors'
import {
  getDomainColor, getMonthBounds, deltaPct, mondayBasedDayIndex,
  DAYS_SHORT_LOWER, getISOWeekNumber,
} from '../../utils/analyticsUtils'
import {
  Sparkline, Heatmap, TrendChart, DomainBars, AreaLine,
  type DomainBarRow, type TrendPoint,
} from './charts'
import { Circle } from 'lucide-react'
import type { Task, TimeSession, Transaction, Objective, Milestone } from '../../types'

// ─── Primitives ──────────────────────────────────────────────────────────────

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink-3)',
}

function Card({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, ...style }}>
      {children}
    </div>
  )
}

function Delta({ value, previous, inverse = false }: { value: number; previous: number; inverse?: boolean }) {
  const d = deltaPct(value, previous)
  if (d === null) return null
  const zero = Math.abs(d) < 0.5
  const positive = inverse ? d < 0 : d > 0
  const tone = zero ? 'var(--ink-3)' : positive ? 'var(--sage-deep)' : 'var(--terra-deep)'
  const arrow = zero ? '·' : d > 0 ? '↗' : '↘'
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, color: tone,
      letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'baseline', gap: 4,
    }}>
      <span style={{ fontSize: 12 }}>{arrow}</span>
      {Math.abs(d).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
    </span>
  )
}

interface KpiCardProps {
  label:     string
  value:     string
  suffix?:   string
  current:   number
  previous:  number
  sparkline: number[] | null
  inverse?:  boolean
  sparkColor?: string
}

function KpiCard({ label, value, suffix, current, previous, sparkline, inverse, sparkColor }: KpiCardProps) {
  return (
    <div style={{
      background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
      borderRadius: 12, padding: '16px 18px 14px',
      display: 'flex', flexDirection: 'column', gap: 4, minHeight: 132,
    }}>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 36,
          color: 'var(--ink)', letterSpacing: '-0.015em', lineHeight: 1,
        }}>{value}</span>
        {suffix && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-3)' }}>{suffix}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {previous > 0 && <Delta value={current} previous={previous} inverse={inverse} />}
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic' }}>
            vs mois dernier
          </span>
        </div>
        {sparkline && sparkline.some((v) => v > 0) && (
          <Sparkline values={sparkline} color={sparkColor ?? 'var(--terra)'} />
        )}
      </div>
    </div>
  )
}

function NoData({ children = "Aucune donnée sur cette période." }: { children?: React.ReactNode }) {
  return (
    <div style={{
      padding: '24px 8px', textAlign: 'center',
      fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14,
      color: 'var(--ink-3)',
    }}>
      {children}
    </div>
  )
}

// ─── Calculs Mois ────────────────────────────────────────────────────────────

interface MonthData {
  bounds:           { start: Date; end: Date }
  totalFocus:       number
  tasksTotal:       number
  goalsDoneCount:   number
  goalsTotalCount:  number
  spendingTotal:    number
  // Tendance par semaine ISO
  weekTrend:        Array<{ label: string; focus: number; tasks: number; spending: number }>
  // Heatmap : [weekRowIndex][dayOfWeek 0..6] = intensité 0..4
  heatmap:          number[][]
  heatmapWeekLabels: string[]
  // Top domaines
  domainTotals:     Record<string, number>
  // Dépenses cumulatives par jour
  dailySpending:    number[]
}

function computeMonth(
  bounds: { start: Date; end: Date },
  tasks: Task[],
  timeSessions: TimeSession[],
  objectives: Objective[],
  milestones: Milestone[],
  transactions: Transaction[],
): MonthData {
  // Total focus + per-day buckets pour le heatmap
  const daysInMonth = bounds.end.getDate()

  // Build per-day focus minutes
  const dailyMinutes = new Array(daysInMonth).fill(0)
  for (const s of timeSessions) {
    const d = new Date(s.date + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    const dayIdx = d.getDate() - 1
    dailyMinutes[dayIdx] += s.duration ?? 0
  }
  const totalFocus = dailyMinutes.reduce((a, b) => a + b, 0) / 60

  // Build heatmap by ISO week rows
  // We iterate each day of the month, place it in its week (Mon-Sun) row.
  const weekRows = new Map<number, number[]>()
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(bounds.start.getFullYear(), bounds.start.getMonth(), day)
    const weekNum = getISOWeekNumber(date)
    const dayIdx = mondayBasedDayIndex(date)
    if (!weekRows.has(weekNum)) weekRows.set(weekNum, [0, 0, 0, 0, 0, 0, 0])
    const minutes = dailyMinutes[day - 1]
    // Intensité 0-4 sur durée
    let intensity = 0
    if (minutes > 240) intensity = 4
    else if (minutes > 120) intensity = 3
    else if (minutes > 60) intensity = 2
    else if (minutes > 0) intensity = 1
    weekRows.get(weekNum)![dayIdx] = intensity
  }
  const sortedWeeks = [...weekRows.entries()].sort(([a], [b]) => a - b)
  const heatmap = sortedWeeks.map(([, row]) => row)
  const heatmapWeekLabels = sortedWeeks.map(([wn]) => `s ${wn}`)

  // Tasks done in month
  let tasksTotal = 0
  for (const t of tasks) {
    if (t.status !== 'done') continue
    if (!t.dueDate) continue
    const d = new Date(t.dueDate + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    tasksTotal += 1
  }

  // Objectifs : nb terminés (progress >= 100 ou tous milestones done) sur le mois (on prend updatedAt si non-archivé en cours d'évaluation = current count)
  let goalsDone = 0
  let goalsTotal = 0
  for (const o of objectives) {
    if (o.archived) continue
    goalsTotal += 1
    const ms = milestones.filter((m) => m.objectiveId === o.id)
    const done = ms.length > 0 ? ms.every((m) => m.done) : o.progress >= 100
    if (done) goalsDone += 1
  }

  // Tendance par semaine ISO
  const weekMap = new Map<number, { focus: number; tasks: number; spending: number }>()
  for (const s of timeSessions) {
    const d = new Date(s.date + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    const wn = getISOWeekNumber(d)
    if (!weekMap.has(wn)) weekMap.set(wn, { focus: 0, tasks: 0, spending: 0 })
    weekMap.get(wn)!.focus += (s.duration ?? 0) / 60
  }
  for (const t of tasks) {
    if (t.status !== 'done' || !t.dueDate) continue
    const d = new Date(t.dueDate + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    const wn = getISOWeekNumber(d)
    if (!weekMap.has(wn)) weekMap.set(wn, { focus: 0, tasks: 0, spending: 0 })
    weekMap.get(wn)!.tasks += 1
  }
  for (const tr of transactions) {
    if (tr.type !== 'expense') continue
    const d = new Date(tr.date + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    const wn = getISOWeekNumber(d)
    if (!weekMap.has(wn)) weekMap.set(wn, { focus: 0, tasks: 0, spending: 0 })
    weekMap.get(wn)!.spending += tr.amount
  }
  const weekTrend = [...weekMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([wn, v]) => ({ label: `s ${wn}`, focus: Number(v.focus.toFixed(1)), tasks: v.tasks, spending: v.spending }))

  // Domaines : total minutes par domaine sur le mois
  const domainTotals: Record<string, number> = {}
  for (const s of timeSessions) {
    const d = new Date(s.date + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    const t = tasks.find((x) => x.id === s.taskId)
    if (!t) continue
    domainTotals[t.domainId] = (domainTotals[t.domainId] ?? 0) + (s.duration ?? 0) / 60
  }

  // Dépenses cumulatives quotidiennes
  const dailySpendingRaw = new Array(daysInMonth).fill(0)
  for (const tr of transactions) {
    if (tr.type !== 'expense') continue
    const d = new Date(tr.date + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    dailySpendingRaw[d.getDate() - 1] += tr.amount
  }
  let cum = 0
  const dailySpending = dailySpendingRaw.map((v) => (cum += v))
  const spendingTotal = cum

  return {
    bounds, totalFocus, tasksTotal,
    goalsDoneCount: goalsDone, goalsTotalCount: goalsTotal,
    spendingTotal,
    weekTrend, heatmap, heatmapWeekLabels,
    domainTotals, dailySpending,
  }
}

// ─── Habits (constances) ─────────────────────────────────────────────────────

interface Habit {
  label: string
  count: number
  total: number
  hint:  string
  tone:  string
}

function computeHabits(bounds: { start: Date; end: Date }, timeSessions: TimeSession[], tasks: Task[]): Habit[] {
  const daysInMonth = bounds.end.getDate()
  const today = new Date()
  const elapsed = today < bounds.end
    ? Math.min(daysInMonth, today.getDate() - bounds.start.getDate() + 1)
    : daysInMonth

  // Habit 1 : Jour avec ≥1 session de focus
  const daysWithFocus = new Set<string>()
  for (const s of timeSessions) {
    const d = new Date(s.date + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    daysWithFocus.add(s.date)
  }

  // Habit 2 : Jour avec ≥1 tâche done
  const daysWithDoneTask = new Set<string>()
  for (const t of tasks) {
    if (t.status !== 'done' || !t.updatedAt) continue
    const d = new Date(t.updatedAt)
    if (d < bounds.start || d > bounds.end) continue
    daysWithDoneTask.add(t.updatedAt.split('T')[0])
  }

  // Habit 3 : sessions matinales (avant 12h)
  const morningDays = new Set<string>()
  for (const s of timeSessions) {
    if (!s.createdAt) continue
    const d = new Date(s.createdAt)
    if (d < bounds.start || d > bounds.end) continue
    if (d.getHours() < 12) morningDays.add(s.date)
  }

  const result: Habit[] = []
  if (daysWithFocus.size > 0) {
    result.push({
      label: 'Une session de focus',
      count: daysWithFocus.size,
      total: elapsed,
      hint:  daysWithFocus.size > elapsed * 0.6 ? 'soutenu' : 'à reprendre',
      tone:  'var(--terra)',
    })
  }
  if (daysWithDoneTask.size > 0) {
    result.push({
      label: 'Une tâche cochée',
      count: daysWithDoneTask.size,
      total: elapsed,
      hint:  'au moins une chaque jour',
      tone:  'var(--sage)',
    })
  }
  if (morningDays.size > 0) {
    result.push({
      label: 'Démarrage avant midi',
      count: morningDays.size,
      total: elapsed,
      hint:  'les meilleurs matins',
      tone:  'var(--ink-2)',
    })
  }
  return result
}

// ─── Composant principal ─────────────────────────────────────────────────────

interface Props {
  monthOffset: number
}

export function AnalyticsMonth({ monthOffset }: Props) {
  const domains      = useStore((s) => s.domains)
  const tasks        = useStore((s) => s.tasks)
  const objectives   = useStore((s) => s.objectives)
  const milestones   = useStore((s) => s.milestones)
  const timeSessions = useStore((s) => s.timeSessions)
  const transactions = useStore((s) => s.transactions)

  const bounds = useMemo(() => getMonthBounds(monthOffset), [monthOffset])
  const prevBounds = useMemo(() => getMonthBounds(monthOffset - 1), [monthOffset])

  const month = useMemo(
    () => computeMonth(bounds, tasks, timeSessions, objectives, milestones, transactions),
    [bounds, domains, tasks, timeSessions, objectives, milestones, transactions],
  )
  const prevMonth = useMemo(
    () => computeMonth(prevBounds, tasks, timeSessions, objectives, milestones, transactions),
    [prevBounds, domains, tasks, timeSessions, objectives, milestones, transactions],
  )

  const colorByDomainId: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = {}
    for (const d of domains) m[d.id] = getDomainColor(d.color)
    return m
  }, [domains])

  const monthDomainRows: DomainBarRow[] = useMemo(() => {
    return Object.entries(month.domainTotals)
      .map(([domainId, value]) => {
        const d = domains.find((x) => x.id === domainId)
        const Icon = d ? getDomainIcon(d.name) : null
        return {
          key:   domainId,
          label: d?.name ?? 'Inconnu',
          value,
          color: colorByDomainId[domainId] ?? 'var(--terra)',
          icon:  Icon ? <Icon size={14} style={{ color: 'var(--ink-3)' }} /> : <Circle size={14} style={{ color: 'var(--ink-3)' }} />,
          unit:  'h',
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  }, [month.domainTotals, domains, colorByDomainId])

  const trendPoints: TrendPoint[] = month.weekTrend.map((w) => ({
    label: w.label, focus: w.focus, tasks: w.tasks,
  }))

  const habits = useMemo(() => computeHabits(bounds, timeSessions, tasks), [bounds, timeSessions, tasks])

  const dailyLabels = month.dailySpending.map((_, i) => {
    const day = i + 1
    if (day === 1 || day % 5 === 0 || day === month.dailySpending.length) return `j ${day}`
    return ''
  })

  const hasFocus = month.totalFocus > 0
  const hasTasks = month.tasksTotal > 0
  const hasGoals = month.goalsTotalCount > 0
  const hasSpending = month.spendingTotal > 0
  const hasTrend = month.weekTrend.length >= 2
  const hasDomains = monthDomainRows.length > 0
  const hasHeatmap = month.heatmap.some((row) => row.some((v) => v > 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard
          label="focus · cumul"
          value={hasFocus ? month.totalFocus.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—'}
          suffix={hasFocus ? 'h' : undefined}
          current={month.totalFocus}
          previous={prevMonth.totalFocus}
          sparkline={hasTrend ? month.weekTrend.map((w) => w.focus) : null}
          sparkColor="var(--terra)"
        />
        <KpiCard
          label="tâches · cochées"
          value={hasTasks ? String(month.tasksTotal) : '—'}
          current={month.tasksTotal}
          previous={prevMonth.tasksTotal}
          sparkline={hasTrend ? month.weekTrend.map((w) => w.tasks) : null}
          sparkColor="var(--sage-deep)"
        />
        <KpiCard
          label="objectifs · atteints"
          value={hasGoals ? String(month.goalsDoneCount) : '—'}
          suffix={hasGoals ? `/ ${month.goalsTotalCount}` : undefined}
          current={month.goalsDoneCount}
          previous={prevMonth.goalsDoneCount}
          sparkline={null}
          sparkColor="var(--sage)"
        />
        <KpiCard
          label="dépenses"
          value={hasSpending ? month.spendingTotal.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}
          suffix={hasSpending ? '€' : undefined}
          current={month.spendingTotal}
          previous={prevMonth.spendingTotal}
          inverse
          sparkline={hasTrend ? month.weekTrend.map((w) => w.spending) : null}
          sparkColor="var(--ink-2)"
        />
      </div>

      {/* Heatmap focus + tendance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 14 }}>
        <Card style={{ padding: '22px 24px' }}>
          <span style={labelStyle}>focus · intensité jour par jour</span>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500, color: 'var(--ink)', marginTop: 4, marginBottom: 16 }}>
            {hasHeatmap ? 'Où sont tombés les jours pleins.' : 'Pas encore de chaleur sur ce mois.'}
          </h3>
          {hasHeatmap ? (
            <>
              <Heatmap
                weeks={month.heatmap}
                weekLabels={month.heatmapWeekLabels}
                dayLabels={DAYS_SHORT_LOWER}
                color="var(--terra)"
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <span style={labelStyle}>moins</span>
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} style={{
                    width: 16, height: 16, borderRadius: 3,
                    background: 'var(--terra)', opacity: 0.12 + (i / 4) * 0.55,
                  }} />
                ))}
                <span style={labelStyle}>plus</span>
              </div>
            </>
          ) : (
            <NoData />
          )}
        </Card>

        <Card style={{ padding: '22px 24px' }}>
          <span style={labelStyle}>tendance · multi-semaines</span>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>
            {hasTrend ? 'Comment ça monte, semaine après semaine.' : 'Pas encore de données suffisantes.'}
          </h3>
          {hasTrend && (
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-2)', margin: '6px 0 8px', lineHeight: 1.5 }}>
              Heures de focus en terra · tâches en sauge.
            </p>
          )}
          {hasTrend ? (
            <TrendChart
              points={trendPoints}
              series={[
                { key: 'focus', color: 'var(--terra)', label: 'focus', fill: true },
                { key: 'tasks', color: 'var(--sage-deep)', label: 'tâches', dashed: true },
              ]}
            />
          ) : (
            <NoData />
          )}
        </Card>
      </div>

      {/* Top domaines · Dépenses cumulées */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 14 }}>
        <Card style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <span style={labelStyle}>domaines · cumul mensuel</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>
                {hasDomains ? "Où s'est posée ton attention, ce mois-ci." : "Pas d'activité enregistrée par domaine."}
              </h3>
            </div>
          </div>
          {hasDomains ? (
            <DomainBars rows={monthDomainRows} max={monthDomainRows[0].value} />
          ) : (
            <NoData />
          )}
        </Card>

        <Card style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <span style={labelStyle}>dépenses · cumul</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>
                {hasSpending ? 'Cumul des dépenses jour par jour.' : 'Aucune dépense enregistrée.'}
              </h3>
            </div>
            {hasSpending && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500 }}>
                  {month.spendingTotal.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                </div>
              </div>
            )}
          </div>
          {hasSpending ? (
            <div style={{ marginTop: 18 }}>
              <AreaLine
                values={month.dailySpending}
                labels={dailyLabels}
                color="var(--ink-2)"
                height={180}
                unit="€"
                yTicks={4}
              />
            </div>
          ) : (
            <div style={{ marginTop: 16 }}><NoData /></div>
          )}
        </Card>
      </div>

      {/* Constances */}
      {habits.length >= 1 && (
        <Card style={{ padding: '22px 24px' }}>
          <span style={labelStyle}>constances · ce mois-ci</span>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500, color: 'var(--ink)', marginTop: 4, marginBottom: 18 }}>
            {habits.length === 3 ? 'Trois petites habitudes qui ont tenu.' : `${habits.length === 1 ? 'Une habitude' : 'Quelques habitudes'} mesuré${habits.length > 1 ? 'es' : 'e'}.`}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(habits.length, 3)}, 1fr)`, gap: 14 }}>
            {habits.map((h) => {
              const pct = (h.count / h.total) * 100
              return (
                <div key={h.label} style={{
                  padding: 16, borderRadius: 10, border: '1px solid var(--paper-2)',
                  background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  <MiniRing value={h.count} total={h.total} color={h.tone} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                      {h.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.4 }}>
                      {h.hint} · {Math.round(pct)} %
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function MiniRing({ value, total, color }: { value: number; total: number; color: string }) {
  const size = 56, stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, value / total) : 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--paper-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
        fontSize: 13, color: 'var(--ink)',
      }}>
        {value}<span style={{ color: 'var(--ink-3)', fontSize: 10, marginLeft: 1 }}>/{total}</span>
      </div>
    </div>
  )
}
