import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts'
import { useStore } from '../store'
import { formatAmount, formatDuration, startOfCurrentWeek } from '../utils/dateHelpers'
import { getDomainColors } from '../utils/domainColors'

// ─── Couleurs hex par DomainColor ──────────────────────────────────────────────

const DOMAIN_HEX: Record<string, string> = {
  red:    '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green:  '#22c55e',
  teal:   '#14b8a6',
  blue:   '#3b82f6',
  indigo: '#6366f1',
  purple: '#a855f7',
  pink:   '#ec4899',
  gray:   '#6b7280',
}

// ─── Tooltip custom (dark) ─────────────────────────────────────────────────────

const DarkTooltip = ({ active, payload, label, unit = '' }: {
  active?: boolean
  payload?: { name: string; value: number; fill: string; color: string }[]
  label?: string
  unit?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-zinc-400 mb-1.5 font-medium">{label}</p>}
      {payload.filter((e) => e.value > 0).map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.fill || entry.color }} />
          <span className="text-zinc-400">{entry.name}:</span>
          <span className="font-semibold text-zinc-100">{entry.value}{unit}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function monthStart(monthsAgo: number) {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() - monthsAgo, 1)
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'week' | 'month' | 'insights'

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('week')

  const domains      = useStore((s) => s.domains)
  const tasks        = useStore((s) => s.tasks)
  const objectives   = useStore((s) => s.objectives)
  const expenses     = useStore((s) => s.expenses)
  const timeSessions = useStore((s) => s.timeSessions)

  // ── Semaine courante ────────────────────────────────────────────────────────

  const weekStart = useMemo(() => startOfCurrentWeek(), [])
  const weekDays  = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return isoDate(d)
    }), [weekStart])

  // Lookup: taskId → domainId
  const taskDomainMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of tasks) m.set(t.id, t.domainId)
    return m
  }, [tasks])

  // Sessions cette semaine
  const weekSessions = useMemo(() =>
    timeSessions.filter((s) => weekDays.includes(s.date)),
  [timeSessions, weekDays])

  // Focus par domaine par jour (BarChart stacked)
  const weekFocusData = useMemo(() =>
    weekDays.map((date, i) => {
      const row: Record<string, number | string> = { name: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i] }
      for (const d of domains) {
        const mins = weekSessions
          .filter((s) => s.date === date && taskDomainMap.get(s.taskId) === d.id)
          .reduce((acc, s) => acc + s.duration, 0)
        row[d.id] = Math.round(mins / 6) / 10  // heures (1 décimale)
      }
      return row
    }), [weekDays, weekSessions, domains, taskDomainMap])

  // Focus total par domaine cette semaine
  const weekFocusByDomain = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of domains) m.set(d.id, 0)
    for (const s of weekSessions) {
      const did = taskDomainMap.get(s.taskId)
      if (did) m.set(did, (m.get(did) ?? 0) + s.duration)
    }
    return m
  }, [weekSessions, domains, taskDomainMap])

  // Stat: domaine le plus actif
  const topDomainWeek = useMemo(() => {
    let best = { id: '', mins: 0 }
    for (const [id, mins] of weekFocusByDomain) {
      if (mins > best.mins) best = { id, mins }
    }
    return best.id ? domains.find((d) => d.id === best.id) : null
  }, [weekFocusByDomain, domains])

  // Tâches complétées vs actives par domaine cette semaine
  const weekTasksData = useMemo(() => {
    const weekStartIso = weekDays[0]
    return domains
      .map((d) => {
        const completed = tasks.filter(
          (t) => t.domainId === d.id && t.status === 'done' && t.updatedAt >= weekStartIso
        ).length
        const active = tasks.filter(
          (t) => t.domainId === d.id && (t.status === 'todo' || t.status === 'in_progress')
        ).length
        return { name: d.icon + ' ' + d.name.substring(0, 5), completed, active, domainId: d.id }
      })
      .filter((r) => r.completed > 0 || r.active > 0)
  }, [domains, tasks, weekDays])

  // Stats semaine
  const weekTotalMins = useMemo(() =>
    weekSessions.reduce((s, x) => s + x.duration, 0), [weekSessions])
  const weekAvgFocus = useMemo(() => {
    if (!weekSessions.length) return 0
    return Math.round(weekSessions.reduce((s, x) => s + x.focus, 0) / weekSessions.length)
  }, [weekSessions])

  // ── Mois courant ────────────────────────────────────────────────────────────

  const monthStartDate = useMemo(() => monthStart(0), [])
  const monthStartIso  = useMemo(() => isoDate(monthStartDate), [monthStartDate])

  const monthSessions = useMemo(() =>
    timeSessions.filter((s) => s.date >= monthStartIso),
  [timeSessions, monthStartIso])

  const monthExpenses = useMemo(() =>
    expenses.filter((e) => e.date >= monthStartIso),
  [expenses, monthStartIso])

  // Focus par domaine ce mois
  const monthFocusByDomain = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of domains) m.set(d.id, 0)
    for (const s of monthSessions) {
      const did = taskDomainMap.get(s.taskId)
      if (did) m.set(did, (m.get(did) ?? 0) + s.duration)
    }
    return m
  }, [monthSessions, domains, taskDomainMap])

  // Dépenses par domaine ce mois
  const monthExpByDomain = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of domains) m.set(d.id, 0)
    for (const e of monthExpenses) {
      m.set(e.domainId, (m.get(e.domainId) ?? 0) + e.amount)
    }
    return m
  }, [monthExpenses, domains])

  // Objectifs atteints ce mois (progress=100 et updatedAt ce mois)
  const achievedObjectives = useMemo(() =>
    objectives.filter((o) => o.progress >= 100 && o.updatedAt >= monthStartIso),
  [objectives, monthStartIso])

  // Tâches terminées ce mois
  const monthTasksDone = useMemo(() =>
    tasks.filter((t) => t.status === 'done' && t.updatedAt >= monthStartIso).length,
  [tasks, monthStartIso])

  const monthTotalMins = useMemo(() =>
    monthSessions.reduce((s, x) => s + x.duration, 0), [monthSessions])

  const monthTotalExpenses = useMemo(() =>
    monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses])

  // Horizontal bar data: focus ce mois par domaine
  const monthFocusBarData = useMemo(() =>
    domains
      .map((d) => ({
        name: d.icon + ' ' + d.name,
        heures: Math.round((monthFocusByDomain.get(d.id) ?? 0) / 6) / 10,
        domainId: d.id,
        color: DOMAIN_HEX[d.color] ?? '#6b7280',
      }))
      .filter((r) => r.heures > 0)
      .sort((a, b) => b.heures - a.heures),
  [domains, monthFocusByDomain])

  const monthExpBarData = useMemo(() =>
    domains
      .map((d) => ({
        name: d.icon + ' ' + d.name,
        montant: Math.round(monthExpByDomain.get(d.id) ?? 0),
        domainId: d.id,
        color: DOMAIN_HEX[d.color] ?? '#6b7280',
      }))
      .filter((r) => r.montant > 0)
      .sort((a, b) => b.montant - a.montant),
  [domains, monthExpByDomain])

  // Radar: focus + dépenses + progression par domaine (normalisé 0-100)
  const maxMonthFocus   = Math.max(...Array.from(monthFocusByDomain.values()), 1)
  const maxMonthExp     = Math.max(...Array.from(monthExpByDomain.values()), 1)

  const radarData = useMemo(() => {
    return domains.map((d) => {
      const domainObjs = objectives.filter((o) => o.domainId === d.id && !o.archived)
      const avgProgress = domainObjs.length
        ? Math.round(domainObjs.reduce((s, o) => s + o.progress, 0) / domainObjs.length)
        : 0
      return {
        domain: d.name.length > 7 ? d.name.substring(0, 7) + '…' : d.name,
        Focus:  Math.round((monthFocusByDomain.get(d.id) ?? 0) / maxMonthFocus * 100),
        Budget: Math.round((monthExpByDomain.get(d.id) ?? 0) / maxMonthExp * 100),
        Objectifs: avgProgress,
      }
    })
  }, [domains, objectives, monthFocusByDomain, monthExpByDomain, maxMonthFocus, maxMonthExp])

  // Progrès vs déclin: compare this week vs last week focus
  const thisWeekStart  = useMemo(() => weekDays[0], [weekDays])
  const lastWeekStart  = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    return isoDate(d)
  }, [weekStart])
  const lastWeekEnd = useMemo(() => weekDays[0], [weekDays])

  const trendByDomain = useMemo(() => {
    const result: Record<string, 'up' | 'down' | 'new'> = {}
    for (const d of domains) {
      const thisW = timeSessions
        .filter((s) => s.date >= thisWeekStart && taskDomainMap.get(s.taskId) === d.id)
        .reduce((acc, s) => acc + s.duration, 0)
      const lastW = timeSessions
        .filter((s) => s.date >= lastWeekStart && s.date < lastWeekEnd && taskDomainMap.get(s.taskId) === d.id)
        .reduce((acc, s) => acc + s.duration, 0)
      if (thisW === 0 && lastW === 0) result[d.id] = 'new'
      else result[d.id] = thisW >= lastW ? 'up' : 'down'
    }
    return result
  }, [domains, timeSessions, taskDomainMap, thisWeekStart, lastWeekStart, lastWeekEnd])

  // ── Insights ────────────────────────────────────────────────────────────────

  // Dernières réalisations (objectifs à 100%, updatedAt dans les 60 derniers jours)
  const recentAchievements = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 60)
    const cutoffIso = isoDate(cutoff)
    return objectives
      .filter((o) => o.progress >= 100 && o.updatedAt >= cutoffIso)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5)
  }, [objectives])

  // Domaines négligés: des sessions existent mais aucune dans les 14 derniers jours
  const neglectedDomains = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 14)
    const cutoffIso = isoDate(cutoff)
    return domains.filter((d) => {
      const allSessions = timeSessions.filter((s) => taskDomainMap.get(s.taskId) === d.id)
      if (allSessions.length === 0) return false
      const recentSessions = allSessions.filter((s) => s.date >= cutoffIso)
      return recentSessions.length === 0
    })
  }, [domains, timeSessions, taskDomainMap])

  // Ratio effort/résultat par domaine
  const effortResultData = useMemo(() =>
    domains
      .map((d) => {
        const focusH = Math.round((monthFocusByDomain.get(d.id) ?? 0) / 6) / 10
        const domainObjs = objectives.filter((o) => o.domainId === d.id && !o.archived)
        const avgProg = domainObjs.length
          ? Math.round(domainObjs.reduce((s, o) => s + o.progress, 0) / domainObjs.length)
          : 0
        const doneTasks = tasks.filter(
          (t) => t.domainId === d.id && t.status === 'done' && t.updatedAt >= monthStartIso
        ).length
        return { domain: d, focusH, avgProg, doneTasks }
      })
      .filter((r) => r.focusH > 0 || r.avgProg > 0 || r.doneTasks > 0)
      .sort((a, b) => b.focusH - a.focusH),
  [domains, monthFocusByDomain, objectives, tasks, monthStartIso])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-500">Vue globale de tes performances</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-zinc-900 border border-zinc-800 p-1 w-fit">
        {([
          { id: 'week',     label: 'Semaine' },
          { id: 'month',    label: 'Mois'    },
          { id: 'insights', label: 'Insights'},
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── VUE SEMAINE ── */}
      {tab === 'week' && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-1">Focus total</p>
              <p className="text-xl font-bold text-zinc-100">{formatDuration(weekTotalMins)}</p>
              <p className="text-xs text-zinc-600 mt-1">cette semaine</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-1">Sessions</p>
              <p className="text-xl font-bold text-zinc-100">{weekSessions.length}</p>
              <p className="text-xs text-zinc-600 mt-1">cette semaine</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-1">Concentration moy.</p>
              <p className="text-xl font-bold text-zinc-100">{weekAvgFocus || '—'}%</p>
              <p className="text-xs text-zinc-600 mt-1">score focus</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-1">Domaine #1</p>
              {topDomainWeek ? (
                <>
                  <p className="text-lg font-bold text-zinc-100">{topDomainWeek.icon} {topDomainWeek.name}</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {formatDuration(weekFocusByDomain.get(topDomainWeek.id) ?? 0)}
                  </p>
                </>
              ) : (
                <p className="text-lg text-zinc-600">—</p>
              )}
            </div>
          </div>

          {/* Focus par domaine par jour */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-1">Heures de focus par jour</h2>
            <p className="text-xs text-zinc-600 mb-4">Répartition par domaine sur 7 jours</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekFocusData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip content={<DarkTooltip unit="h" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                {domains.map((d) => (
                  <Bar
                    key={d.id}
                    dataKey={d.id}
                    name={d.name}
                    stackId="a"
                    fill={DOMAIN_HEX[d.color] ?? '#6b7280'}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            {/* Légende */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {domains.filter((d) => (weekFocusByDomain.get(d.id) ?? 0) > 0).map((d) => (
                <div key={d.id} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: DOMAIN_HEX[d.color] }} />
                  <span className="text-[10px] text-zinc-500">{d.name}</span>
                  <span className="text-[10px] text-zinc-600">
                    {Math.round((weekFocusByDomain.get(d.id) ?? 0) / 6) / 10}h
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tâches terminées vs actives par domaine */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-1">Tâches complétées cette semaine</h2>
            <p className="text-xs text-zinc-600 mb-4">Terminées vs encore actives par domaine</p>
            {weekTasksData.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-8">Aucune tâche terminée cette semaine</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekTasksData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="completed" name="Terminées" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="active"    name="Actives"   fill="#3f3f46" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="mt-2 flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-teal-500" />
                <span className="text-[10px] text-zinc-500">Terminées</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-zinc-700" />
                <span className="text-[10px] text-zinc-500">Actives</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VUE MOIS ── */}
      {tab === 'month' && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-1">Temps investis</p>
              <p className="text-xl font-bold text-zinc-100">{formatDuration(monthTotalMins)}</p>
              <p className="text-xs text-zinc-600 mt-1">ce mois</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-1">Dépenses</p>
              <p className="text-xl font-bold text-zinc-100">{formatAmount(monthTotalExpenses)}</p>
              <p className="text-xs text-zinc-600 mt-1">ce mois</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-1">Objectifs atteints</p>
              <p className="text-xl font-bold text-zinc-100">{achievedObjectives.length}</p>
              <p className="text-xs text-zinc-600 mt-1">ce mois</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-1">Tâches terminées</p>
              <p className="text-xl font-bold text-zinc-100">{monthTasksDone}</p>
              <p className="text-xs text-zinc-600 mt-1">ce mois</p>
            </div>
          </div>

          {/* Radar chart */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-1">Vue d'ensemble par domaine</h2>
            <p className="text-xs text-zinc-600 mb-2">Focus · Dépenses · Progression objectifs (normalisés 0-100)</p>
            <div className="flex items-center gap-4 flex-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="domain" tick={{ fill: '#71717a', fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Focus"     dataKey="Focus"     stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.15} strokeWidth={1.5} />
                  <Radar name="Budget"    dataKey="Budget"    stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.10} strokeWidth={1.5} />
                  <Radar name="Objectifs" dataKey="Objectifs" stroke="#6366f1" fill="#6366f1" fillOpacity={0.10} strokeWidth={1.5} />
                  <Tooltip content={<DarkTooltip unit="%" />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-1">
              {[
                { label: 'Focus', color: '#14b8a6' },
                { label: 'Dépenses', color: '#f59e0b' },
                { label: 'Objectifs', color: '#6366f1' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-sm" style={{ backgroundColor: item.color, opacity: 0.8 }} />
                  <span className="text-[10px] text-zinc-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Focus + Dépenses horizontal bars */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Temps par domaine */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-200 mb-4">Temps investi ce mois</h2>
              {monthFocusBarData.length === 0 ? (
                <p className="text-sm text-zinc-600 text-center py-8">Aucune session ce mois</p>
              ) : (
                <ResponsiveContainer width="100%" height={monthFocusBarData.length * 40 + 20}>
                  <BarChart
                    data={monthFocusBarData}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                    barSize={14}
                  >
                    <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip content={<DarkTooltip unit="h" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="heures" name="Heures" radius={[0, 4, 4, 0]}>
                      {monthFocusBarData.map((entry) => (
                        <Cell key={entry.domainId} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Dépenses par domaine */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-200 mb-4">Argent investi ce mois</h2>
              {monthExpBarData.length === 0 ? (
                <p className="text-sm text-zinc-600 text-center py-8">Aucune dépense ce mois</p>
              ) : (
                <ResponsiveContainer width="100%" height={monthExpBarData.length * 40 + 20}>
                  <BarChart
                    data={monthExpBarData}
                    layout="vertical"
                    margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                    barSize={14}
                  >
                    <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} unit="€" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip content={<DarkTooltip unit="€" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="montant" name="Montant" radius={[0, 4, 4, 0]}>
                      {monthExpBarData.map((entry) => (
                        <Cell key={entry.domainId} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Domaines en progrès vs déclin */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-1">Tendances (semaine vs semaine précédente)</h2>
            <p className="text-xs text-zinc-600 mb-4">Basé sur les heures de focus</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {domains.map((d) => {
                const trend = trendByDomain[d.id]
                const thisW = timeSessions
                  .filter((s) => s.date >= thisWeekStart && taskDomainMap.get(s.taskId) === d.id)
                  .reduce((acc, s) => acc + s.duration, 0)
                const c = getDomainColors(d.color)
                return (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                    <span className={['flex h-8 w-8 items-center justify-center rounded-lg border text-sm', c.bg, c.border].join(' ')}>
                      {d.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-300">{d.name}</p>
                      <p className="text-xs text-zinc-600">{formatDuration(thisW)} cette semaine</p>
                    </div>
                    <span className={[
                      'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                      trend === 'up'   ? 'bg-green-500/15 text-green-400' :
                      trend === 'down' ? 'bg-red-500/15 text-red-400' :
                                        'bg-zinc-800 text-zinc-500',
                    ].join(' ')}>
                      {trend === 'up' ? '▲ Progrès' : trend === 'down' ? '▼ Déclin' : '— Nouveau'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── INSIGHTS ── */}
      {tab === 'insights' && (
        <div className="space-y-5">
          {/* Dernières réalisations */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-1">Dernières réalisations</h2>
            <p className="text-xs text-zinc-600 mb-4">Objectifs atteints (100%) dans les 60 derniers jours</p>
            {recentAchievements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">🎯</p>
                <p className="text-sm text-zinc-600">Aucune réalisation récente</p>
                <p className="text-xs text-zinc-700 mt-1">Complète des objectifs pour les voir apparaître ici</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAchievements.map((obj) => {
                  const domain = domains.find((d) => d.id === obj.domainId)
                  const c = domain ? getDomainColors(domain.color) : null
                  const daysAgo = Math.round((Date.now() - new Date(obj.updatedAt).getTime()) / 86400000)
                  return (
                    <div key={obj.id} className="flex items-center gap-3 rounded-lg bg-zinc-800/40 px-3 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/15 border border-green-500/30 text-base">
                        ✓
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{obj.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {domain && c && (
                            <span className={['text-[10px] rounded px-1.5 py-0.5 border', c.bg, c.border, c.text].join(' ')}>
                              {domain.icon} {domain.name}
                            </span>
                          )}
                          <span className="text-xs text-zinc-600">
                            {daysAgo === 0 ? "Aujourd'hui" : daysAgo === 1 ? 'Hier' : `il y a ${daysAgo} jours`}
                          </span>
                        </div>
                      </div>
                      <span className="text-green-400 text-sm font-bold shrink-0">100%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Domaines négligés */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-1">Domaines négligés</h2>
            <p className="text-xs text-zinc-600 mb-4">Aucune session de focus depuis 14 jours</p>
            {neglectedDomains.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">🌟</p>
                <p className="text-sm text-zinc-500">Tous les domaines sont actifs</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {neglectedDomains.map((d) => {
                  const c = getDomainColors(d.color)
                  const lastSession = timeSessions
                    .filter((s) => taskDomainMap.get(s.taskId) === d.id)
                    .sort((a, b) => b.date.localeCompare(a.date))[0]
                  const lastDays = lastSession
                    ? Math.round((Date.now() - new Date(lastSession.date).getTime()) / 86400000)
                    : null
                  return (
                    <div key={d.id} className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-3">
                      <span className={['flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm', c.bg, c.border].join(' ')}>
                        {d.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-300">{d.name}</p>
                        <p className="text-xs text-zinc-600">
                          {lastDays !== null ? `Dernière session il y a ${lastDays} jours` : 'Jamais utilisé'}
                        </p>
                      </div>
                      <span className="text-xs text-red-400 shrink-0">Inactif</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ratio effort / résultat */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-1">Ratio effort / résultat</h2>
            <p className="text-xs text-zinc-600 mb-4">Focus ce mois · Progression objectifs · Tâches terminées</p>
            {effortResultData.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-8">Aucune donnée ce mois</p>
            ) : (
              <div className="space-y-3">
                {effortResultData.map(({ domain, focusH, avgProg, doneTasks }) => {
                  const c = getDomainColors(domain.color)
                  return (
                    <div key={domain.id} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={['flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs', c.bg, c.border].join(' ')}>
                          {domain.icon}
                        </span>
                        <span className="text-xs font-medium text-zinc-300 flex-1">{domain.name}</span>
                        <div className="flex items-center gap-4 text-xs text-right">
                          <span className="text-zinc-500">
                            <span className="text-zinc-300 font-medium">{focusH}h</span> focus
                          </span>
                          <span className="text-zinc-500">
                            <span className="text-zinc-300 font-medium">{avgProg}%</span> progrès
                          </span>
                          <span className="text-zinc-500">
                            <span className="text-zinc-300 font-medium">{doneTasks}</span> tâches
                          </span>
                        </div>
                      </div>
                      {/* Visual: 2 bars */}
                      <div className="flex gap-1.5 h-2">
                        <div className="flex-1 rounded-full bg-zinc-800 overflow-hidden" title={`${focusH}h focus`}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, focusH / Math.max(...effortResultData.map(r => r.focusH), 1) * 100)}%`, backgroundColor: DOMAIN_HEX[domain.color] }}
                          />
                        </div>
                        <div className="flex-1 rounded-full bg-zinc-800 overflow-hidden" title={`${avgProg}% progrès`}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${avgProg}%`, backgroundColor: DOMAIN_HEX[domain.color], opacity: 0.5 }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="pt-1 flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-4 rounded-sm bg-zinc-400" />
                    <span className="text-[10px] text-zinc-600">Effort (focus)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-4 rounded-sm bg-zinc-600" />
                    <span className="text-[10px] text-zinc-600">Résultat (objectifs)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
