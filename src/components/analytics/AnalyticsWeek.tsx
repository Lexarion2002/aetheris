import { useMemo, type CSSProperties } from 'react'
import { useStore } from '../../store'
import { getDomainIcon } from '../../utils/domainColors'
import {
  getDomainColor, getWeekBounds, deltaPct, mondayBasedDayIndex,
  DAYS_SHORT_LOWER, fmtEUR, fmtH, formatWeekRangeLong,
} from '../../utils/analyticsUtils'
import {
  Sparkline, StackedDayBars, AreaLine, DomainBars, Ring,
  type DomainBarRow,
} from './charts'
import { Circle, ArrowRight } from 'lucide-react'
import type { Domain, Task, TimeSession, Transaction, Objective } from '../../types'

// ─── Primitives locales ──────────────────────────────────────────────────────

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink-3)',
}

function Card({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
      borderRadius: 12, ...style,
    }}>
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
  label:    string
  value:    string | number
  suffix?:  string
  current:  number
  previous: number
  sparkline: number[] | null
  inverse?: boolean
  sparkColor?: string
}

function KpiCard({ label, value, suffix, current, previous, sparkline, inverse, sparkColor }: KpiCardProps) {
  const hasValue = value !== '—'
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
        {suffix && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-3)' }}>{suffix}</span>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 'auto', paddingTop: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {hasValue && previous > 0 && <Delta value={current} previous={previous} inverse={inverse} />}
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic' }}>
            vs sem. dernière
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

// ─── Calculs ─────────────────────────────────────────────────────────────────

interface WeekData {
  bounds: { start: Date; end: Date }
  byDomain: Record<string, number[]>     // domainId → [lun..dim] heures
  totalByDay: number[]                   // [lun..dim] heures
  totalFocus: number                     // heures
  domainTotals: Record<string, number>   // domainId → total heures
  tasksPerDay: number[]                  // [lun..dim] count done
  tasksTotal: number
  goals: Array<{
    objective: Objective
    domain:    Domain | undefined
    done:      number
    total:     number
    completed: boolean
  }>
  goalsDone: number
  spendingByCategory: Array<{ category: string; amount: number }>
  spendingTotal: number
}

function computeWeekData(
  bounds: { start: Date; end: Date },
  domains: Domain[],
  tasks: Task[],
  timeSessions: TimeSession[],
  objectives: Objective[],
  milestonesAll: Array<{ objectiveId: string; done: boolean }>,
  transactions: Transaction[],
  financeCategoryById: Map<string, { name: string }>,
): WeekData {
  // Time sessions → byDomain matrix + totals
  const byDomain: Record<string, number[]> = {}
  const totalByDay = [0, 0, 0, 0, 0, 0, 0]
  for (const s of timeSessions) {
    const d = new Date(s.date + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    const task = tasks.find((t) => t.id === s.taskId)
    if (!task) continue
    const di = mondayBasedDayIndex(d)
    const hours = (s.duration ?? 0) / 60
    if (!byDomain[task.domainId]) byDomain[task.domainId] = [0, 0, 0, 0, 0, 0, 0]
    byDomain[task.domainId][di] += hours
    totalByDay[di] += hours
  }
  const totalFocus = totalByDay.reduce((a, b) => a + b, 0)
  const domainTotals: Record<string, number> = {}
  for (const k of Object.keys(byDomain)) {
    domainTotals[k] = byDomain[k].reduce((a, b) => a + b, 0)
  }

  // Tasks done per day (par dueDate dans la semaine, status done)
  const tasksPerDay = [0, 0, 0, 0, 0, 0, 0]
  let tasksTotal = 0
  for (const t of tasks) {
    if (t.status !== 'done') continue
    if (!t.dueDate) continue
    const d = new Date(t.dueDate + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    const di = mondayBasedDayIndex(d)
    tasksPerDay[di] += 1
    tasksTotal += 1
  }

  // Objectifs actifs : done = milestones done, total = milestones total
  const goals = objectives
    .filter((o) => !o.archived)
    .map((o) => {
      const ms = milestonesAll.filter((m) => m.objectiveId === o.id)
      const done = ms.filter((m) => m.done).length
      const total = ms.length || 1
      return {
        objective: o,
        domain: domains.find((d) => d.id === o.domainId),
        done,
        total: ms.length || 0,
        completed: ms.length > 0 ? done >= total : o.progress >= 100,
      }
    })
  const goalsDone = goals.filter((g) => g.completed).length

  // Dépenses par catégorie sur la semaine
  const spendingMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const d = new Date(t.date + 'T12:00:00')
    if (d < bounds.start || d > bounds.end) continue
    const cat = financeCategoryById.get(t.category)?.name ?? t.category ?? 'Autre'
    spendingMap.set(cat, (spendingMap.get(cat) ?? 0) + t.amount)
  }
  const spendingByCategory = [...spendingMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
  const spendingTotal = spendingByCategory.reduce((s, x) => s + x.amount, 0)

  return {
    bounds, byDomain, totalByDay, totalFocus,
    domainTotals, tasksPerDay, tasksTotal,
    goals, goalsDone,
    spendingByCategory, spendingTotal,
  }
}

function findNeglected(
  domains: Domain[],
  tasks: Task[],
  timeSessions: TimeSession[],
): Array<{ domain: Domain; lastActivityDays: number | null }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return domains
    .map((d) => {
      // Sessions liées à ce domaine
      const taskIds = new Set(tasks.filter((t) => t.domainId === d.id).map((t) => t.id))
      let lastDate: Date | null = null
      for (const s of timeSessions) {
        if (!taskIds.has(s.taskId)) continue
        const sd = new Date(s.date + 'T12:00:00')
        if (!lastDate || sd > lastDate) lastDate = sd
      }
      const lastActivityDays = lastDate
        ? Math.round((today.getTime() - lastDate.getTime()) / 86400000)
        : null
      return { domain: d, lastActivityDays }
    })
    .filter((x) => x.lastActivityDays === null || x.lastActivityDays > 14)
}

// ─── Composant principal ─────────────────────────────────────────────────────

interface Props {
  weekOffset: number
}

export function AnalyticsWeek({ weekOffset }: Props) {
  const domains      = useStore((s) => s.domains)
  const tasks        = useStore((s) => s.tasks)
  const objectives   = useStore((s) => s.objectives)
  const milestones   = useStore((s) => s.milestones)
  const timeSessions = useStore((s) => s.timeSessions)
  const transactions = useStore((s) => s.transactions)
  const financeCategories = useStore((s) => s.financeCategories)

  const bounds = useMemo(() => getWeekBounds(weekOffset), [weekOffset])
  const prevBounds = useMemo(() => getWeekBounds(weekOffset - 1), [weekOffset])

  const financeCatById = useMemo(
    () => new Map(financeCategories.map((c) => [c.id, c])),
    [financeCategories],
  )

  const week = useMemo(
    () => computeWeekData(bounds, domains, tasks, timeSessions, objectives, milestones, transactions, financeCatById),
    [bounds, domains, tasks, timeSessions, objectives, milestones, transactions, financeCatById],
  )
  const prevWeek = useMemo(
    () => computeWeekData(prevBounds, domains, tasks, timeSessions, objectives, milestones, transactions, financeCatById),
    [prevBounds, domains, tasks, timeSessions, objectives, milestones, transactions, financeCatById],
  )

  // Domain colors mapping
  const colorByDomainId: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = {}
    for (const d of domains) m[d.id] = getDomainColor(d.color)
    return m
  }, [domains])

  const domainRows: DomainBarRow[] = useMemo(() => {
    return Object.entries(week.domainTotals)
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
  }, [week.domainTotals, domains, colorByDomainId])

  const neglected = useMemo(() => findNeglected(domains, tasks, timeSessions), [domains, tasks, timeSessions])

  const hasFocusData = week.totalFocus > 0
  const hasTasksData = week.tasksTotal > 0
  const hasGoalsData = week.goals.length > 0
  const hasSpendingData = week.spendingTotal > 0
  const rangeLabel = formatWeekRangeLong(bounds).replace(/\s\d{4}$/, '')  // sans l'année

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard
          label="focus · total"
          value={hasFocusData ? fmtH(week.totalFocus).split(' ')[0] : '—'}
          suffix={hasFocusData ? 'h' : undefined}
          current={week.totalFocus}
          previous={prevWeek.totalFocus}
          sparkline={hasFocusData ? week.totalByDay : null}
          sparkColor="var(--terra)"
        />
        <KpiCard
          label="tâches · cochées"
          value={hasTasksData ? String(week.tasksTotal) : '—'}
          current={week.tasksTotal}
          previous={prevWeek.tasksTotal}
          sparkline={hasTasksData ? week.tasksPerDay : null}
          sparkColor="var(--sage-deep)"
        />
        <KpiCard
          label="objectifs · atteints"
          value={hasGoalsData ? String(week.goalsDone) : '—'}
          suffix={hasGoalsData ? `/ ${week.goals.length}` : undefined}
          current={week.goalsDone}
          previous={prevWeek.goalsDone}
          sparkline={null}
          sparkColor="var(--sage)"
        />
        <KpiCard
          label="dépenses"
          value={hasSpendingData ? week.spendingTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
          suffix={hasSpendingData ? '€' : undefined}
          current={week.spendingTotal}
          previous={prevWeek.spendingTotal}
          sparkline={null}
          inverse
          sparkColor="var(--ink-2)"
        />
      </div>

      {/* Focus chart */}
      <Card style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 24 }}>
          <div>
            <span style={labelStyle}>focus · répartition jour par jour</span>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink)', marginTop: 6, lineHeight: 1.2 }}>
              Où s'est posé ton temps cette semaine.
            </h3>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, color: 'var(--ink)' }}>
              {hasFocusData ? fmtH(week.totalFocus) : '—'}
            </div>
            {hasFocusData && prevWeek.totalFocus > 0 && (
              <div style={{ marginTop: 2 }}>
                <Delta value={week.totalFocus} previous={prevWeek.totalFocus} />
              </div>
            )}
          </div>
        </div>
        {hasFocusData ? (
          <>
            <StackedDayBars
              data={week.byDomain}
              days={DAYS_SHORT_LOWER}
              domainKeys={Object.keys(week.byDomain)}
              colorByKey={colorByDomainId}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--paper-2)' }}>
              {domainRows.slice(0, 7).map((r) => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: r.color }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-2)' }}>{r.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 11, color: 'var(--ink-3)' }}>
                    {r.value.toFixed(1)} h
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <NoData />
        )}
      </Card>

      {/* Two cols : Répartition · Tâches */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <Card style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <span style={labelStyle}>répartition · par domaine</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>
                Où s'est posée ton attention.
              </h3>
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-3)', fontStyle: 'italic' }}>
              {rangeLabel}
            </span>
          </div>
          {domainRows.length > 0 ? (
            <DomainBars
              rows={domainRows}
              max={Math.max(...domainRows.map((r) => r.value), 1)}
            />
          ) : (
            <NoData />
          )}
        </Card>

        <Card style={{ padding: '22px 24px' }}>
          <span style={labelStyle}>tâches · par jour</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, color: 'var(--ink)' }}>
              {hasTasksData ? week.tasksTotal : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>
              {hasTasksData ? 'cochées' : 'aucune cochée'}
            </span>
          </div>
          {hasTasksData ? (
            <>
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14.5, color: 'var(--ink-2)', margin: '10px 0 14px', lineHeight: 1.5 }}>
                Réparti sur les sept jours.
              </p>
              <AreaLine
                values={week.tasksPerDay}
                labels={DAYS_SHORT_LOWER}
                color="var(--sage-deep)"
                height={170}
                unit="tâches"
                yTicks={3}
              />
            </>
          ) : (
            <div style={{ marginTop: 16 }}>
              <NoData />
            </div>
          )}
        </Card>
      </div>

      {/* Objectifs */}
      <Card style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <span style={labelStyle}>objectifs · actifs</span>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>
              {hasGoalsData
                ? (week.goalsDone > 0 ? `${week.goalsDone} ${week.goalsDone === 1 ? 'tenu' : 'tenus'}, ${week.goals.length - week.goalsDone} en cours.` : `${week.goals.length} en cours.`)
                : 'Aucun objectif actif.'}
            </h3>
          </div>
          {hasGoalsData && <Ring value={week.goalsDone} total={week.goals.length} size={64} stroke={5} color="var(--sage)" />}
        </div>
        {hasGoalsData ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
            {week.goals.map((g) => {
              const total = g.total || 1
              const pct = Math.min(100, (g.done / total) * 100)
              return (
                <div
                  key={g.objective.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '14px 110px 1fr 80px 70px',
                    gap: 14, alignItems: 'center', padding: '12px 0',
                    borderTop: '1px solid var(--paper-2)',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: 12, height: 12, borderRadius: 999,
                    border: '1.5px solid ' + (g.completed ? 'var(--sage-deep)' : 'var(--ink-3)'),
                    background: g.completed ? 'var(--sage-deep)' : 'transparent',
                  }} />
                  <span style={labelStyle}>{g.domain?.name ?? '—'}</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>
                    {g.objective.title}
                  </span>
                  <div style={{ height: 4, background: 'var(--paper-2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: pct + '%',
                      background: g.completed ? 'var(--sage)' : 'var(--terra)',
                      opacity: 0.8,
                      transition: 'width var(--dur-slow) var(--ease)',
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--ink-2)', textAlign: 'right' }}>
                    {g.done} / {g.total || '–'}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', margin: '12px 0 0', lineHeight: 1.5 }}>
            Crée un objectif sur la page Semaine pour les voir apparaître ici.
          </p>
        )}
      </Card>

      {/* Dépenses · Domaines négligés */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <span style={labelStyle}>dépenses · par catégorie</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>
                {hasSpendingData ? 'Vos dépenses de la semaine.' : 'Aucune dépense enregistrée.'}
              </h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500 }}>
                {hasSpendingData ? fmtEUR(week.spendingTotal) : '—'}
              </div>
              {hasSpendingData && prevWeek.spendingTotal > 0 && (
                <Delta value={week.spendingTotal} previous={prevWeek.spendingTotal} inverse />
              )}
            </div>
          </div>
          {hasSpendingData ? (
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {week.spendingByCategory.slice(0, 6).map((s) => {
                const pct = (s.amount / week.spendingTotal) * 100
                return (
                  <div key={s.category} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 84px', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)' }}>{s.category}</span>
                    <div style={{ height: 6, background: 'var(--paper-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: pct + '%', background: 'var(--ink-2)', opacity: 0.5,
                        transition: 'width var(--dur-slow) var(--ease)',
                      }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 12.5, textAlign: 'right' }}>
                      {fmtEUR(s.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ marginTop: 16 }}><NoData /></div>
          )}
        </Card>

        {neglected.length > 0 && (
          <Card style={{ padding: '22px 24px' }}>
            <span style={labelStyle}>domaines · négligés</span>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>
              {neglected.length} domaine{neglected.length > 1 ? 's' : ''} laissé{neglected.length > 1 ? 's' : ''} de côté.
            </h3>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14.5, color: 'var(--ink-2)', margin: '8px 0 16px', lineHeight: 1.5, maxWidth: '40ch' }}>
              Rien d'alarmant — on ne peut pas tout tenir chaque semaine.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {neglected.slice(0, 5).map((n) => {
                const Icon = getDomainIcon(n.domain.name) ?? Circle
                return (
                  <div key={n.domain.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                    borderTop: '1px solid var(--paper-2)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'var(--paper)', border: '1px solid var(--paper-2)',
                      display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
                    }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'var(--ink)' }}>{n.domain.name}</div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>
                        {n.lastActivityDays === null
                          ? 'jamais ouvert'
                          : `rien depuis ${n.lastActivityDays} jours`}
                      </div>
                    </div>
                    <a
                      href={`/domain/${n.domain.id}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)',
                        padding: '4px 8px',
                      }}
                    >
                      Ouvrir <ArrowRight size={12} />
                    </a>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
