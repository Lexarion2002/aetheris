import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { getDomainColors, getDomainIcon } from '../utils/domainColors'
import { formatDuration, startOfCurrentWeek, startOfCurrentMonth } from '../utils/dateHelpers'
import type { Domain, Task } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'all'

interface DomainStats {
  domain:       Domain
  totalMinutes: number
  sessionCount: number
  avgFocus:     number
  tasks:        Set<string>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

const focusLabel = (f: number) =>
  f >= 90 ? 'Excellent' : f >= 75 ? 'Bon' : f >= 60 ? 'Correct' : 'Distrait'

const focusColor = (f: number) =>
  f >= 90 ? 'text-green-400' : f >= 75 ? 'text-teal-400' : f >= 60 ? 'text-blue-400' : 'text-zinc-500'

const focusBg = (f: number) =>
  f >= 90 ? 'bg-green-500' : f >= 75 ? 'bg-teal-500' : f >= 60 ? 'bg-blue-500' : 'bg-zinc-600'

// ─── FocusDashboard ───────────────────────────────────────────────────────────

export function FocusDashboard() {
  const domains      = useStore((s) => s.domains)
  const tasks        = useStore((s) => s.tasks)
  const timeSessions = useStore((s) => s.timeSessions)

  const [period, setPeriod] = useState<Period>('week')

  // ── Period filter ────────────────────────────────────────────────────────

  const cutoff = useMemo<Date | null>(() => {
    if (period === 'week')  return startOfCurrentWeek()
    if (period === 'month') return startOfCurrentMonth()
    return null
  }, [period])

  const filteredSessions = useMemo(() =>
    cutoff
      ? timeSessions.filter((s) => new Date(s.date) >= cutoff)
      : timeSessions,
    [timeSessions, cutoff])

  // ── Task index ───────────────────────────────────────────────────────────

  const taskById = useMemo(() => {
    const map = new Map<string, Task>()
    for (const t of tasks) map.set(t.id, t)
    return map
  }, [tasks])

  // ── Domain stats ─────────────────────────────────────────────────────────

  const domainStats = useMemo<DomainStats[]>(() => {
    const map = new Map<string, DomainStats>()

    for (const domain of domains) {
      map.set(domain.id, {
        domain,
        totalMinutes: 0,
        sessionCount: 0,
        avgFocus:     0,
        tasks:        new Set(),
      })
    }

    let focusSums: Record<string, number>  = {}
    let focusCnts: Record<string, number>  = {}

    for (const session of filteredSessions) {
      const task = taskById.get(session.taskId)
      if (!task) continue
      const stat = map.get(task.domainId)
      if (!stat) continue

      stat.totalMinutes += session.duration
      stat.sessionCount += 1
      stat.tasks.add(task.id)
      focusSums[task.domainId] = (focusSums[task.domainId] ?? 0) + session.focus
      focusCnts[task.domainId] = (focusCnts[task.domainId] ?? 0) + 1
    }

    for (const [domainId, stat] of map) {
      const cnt = focusCnts[domainId] ?? 0
      stat.avgFocus = cnt > 0 ? Math.round((focusSums[domainId] ?? 0) / cnt) : 0
    }

    return [...map.values()]
      .filter((s) => s.totalMinutes > 0)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
  }, [domains, filteredSessions, taskById])

  const maxMinutes = domainStats[0]?.totalMinutes ?? 1

  const totalMinutes  = filteredSessions.reduce((a, s) => a + s.duration, 0)
  const totalSessions = filteredSessions.length
  const globalAvgFocus = totalSessions > 0
    ? Math.round(filteredSessions.reduce((a, s) => a + s.focus, 0) / totalSessions)
    : 0

  // ── Recent sessions (last 20, newest first) ──────────────────────────────

  const recentSessions = useMemo(() => {
    return [...filteredSessions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
      .map((s) => {
        const task   = taskById.get(s.taskId)
        const domain = task ? domains.find((d) => d.id === task.domainId) : null
        return { session: s, task, domain }
      })
  }, [filteredSessions, taskById, domains])

  // ── Daily distribution (7 derniers jours si week, 30 si month) ───────────

  const dailyData = useMemo(() => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 7
    const result: { label: string; date: string; minutes: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().split('T')[0]
      const minutes = timeSessions
        .filter((s) => s.date === iso)
        .reduce((a, s) => a + s.duration, 0)
      result.push({
        label: i === 0 ? 'Auj.' : d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        date: iso,
        minutes,
      })
    }
    return result
  }, [timeSessions, period])

  const maxDayMinutes = Math.max(...dailyData.map((d) => d.minutes), 1)

  // ─── Render ───────────────────────────────────────────────────────────────

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'week',  label: 'Cette semaine' },
    { key: 'month', label: 'Ce mois' },
    { key: 'all',   label: 'Tout' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Suivi du focus</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Analyse de tes sessions de concentration</p>
        </div>
        {/* Period selector */}
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                period === p.key
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Global stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Temps total',     value: formatDuration(totalMinutes),    accent: 'text-teal-400' },
          { label: 'Sessions',        value: String(totalSessions),           accent: 'text-blue-400' },
          { label: 'Focus moyen',     value: globalAvgFocus > 0 ? `${globalAvgFocus}%` : '—', accent: focusColor(globalAvgFocus) },
          { label: 'Domaines actifs', value: String(domainStats.length),      accent: 'text-indigo-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
            <p className={['text-2xl font-bold tabular-nums leading-none', s.accent].join(' ')}>{s.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Layout : graphe journalier + répartition par domaine ───────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Daily bar chart */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Activité journalière</h3>
          {totalMinutes === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-600">Aucune session enregistrée</p>
          ) : (
            <div className="flex items-end gap-1.5 h-32">
              {dailyData.map((day) => {
                const height = day.minutes > 0 ? Math.max(4, Math.round((day.minutes / maxDayMinutes) * 100)) : 0
                const isToday = day.date === new Date().toISOString().split('T')[0]
                return (
                  <div key={day.date} className="group relative flex flex-1 flex-col items-center gap-1">
                    {/* Tooltip */}
                    {day.minutes > 0 && (
                      <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                        <div className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 whitespace-nowrap shadow-lg">
                          {formatDuration(day.minutes)}
                        </div>
                      </div>
                    )}
                    {/* Bar */}
                    <div className="flex w-full items-end justify-center" style={{ height: '100%' }}>
                      <div
                        className={[
                          'w-full rounded-t transition-all',
                          day.minutes > 0
                            ? isToday ? 'bg-teal-500' : 'bg-zinc-600 group-hover:bg-zinc-500'
                            : 'bg-zinc-800/40',
                        ].join(' ')}
                        style={{ height: day.minutes > 0 ? `${height}%` : '4px' }}
                      />
                    </div>
                    {/* Label */}
                    <span className={['text-[10px]', isToday ? 'text-teal-400 font-medium' : 'text-zinc-600'].join(' ')}>
                      {day.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Domain distribution */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Répartition par domaine</h3>
          {domainStats.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-600">Aucune session enregistrée</p>
          ) : (
            <div className="space-y-3">
              {domainStats.map(({ domain, totalMinutes: mins, sessionCount, avgFocus }) => {
                const colors = getDomainColors(domain.color)
                const DomainIcon = getDomainIcon(domain.name)
                const pct    = Math.round((mins / maxMinutes) * 100)
                return (
                  <div key={domain.id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm flex items-center">
                          {DomainIcon ? <DomainIcon size={14} /> : domain.icon}
                        </span>
                        <span className="text-xs font-medium text-zinc-300 truncate">{domain.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                        <span className={[colors.text, 'font-semibold tabular-nums'].join(' ')}>
                          {formatDuration(mins)}
                        </span>
                        <span className="text-zinc-600 tabular-nums">·</span>
                        <span className="text-zinc-500 tabular-nums">{sessionCount} sess.</span>
                        {avgFocus > 0 && (
                          <>
                            <span className="text-zinc-600">·</span>
                            <span className={[focusColor(avgFocus), 'tabular-nums'].join(' ')}>{avgFocus}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={['h-full rounded-full transition-all duration-500', colors.dot].join(' ')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Domain stats table ──────────────────────────────────────────────── */}
      {domainStats.length > 0 && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
          <div className="border-b border-zinc-800/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-200">Statistiques par domaine</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  {['Domaine', 'Temps', 'Sessions', 'Tâches', 'Focus moyen', 'Niveau'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domainStats.map(({ domain, totalMinutes: mins, sessionCount, tasks: taskSet, avgFocus }) => {
                  const colors = getDomainColors(domain.color)
                  const DomainIcon = getDomainIcon(domain.name)
                  return (
                    <tr key={domain.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center">
                            {DomainIcon ? <DomainIcon size={16} /> : domain.icon}
                          </span>
                          <span className={['font-medium', colors.text].join(' ')}>{domain.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-200 font-medium">{formatDuration(mins)}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-400">{sessionCount}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-400">{taskSet.size}</td>
                      <td className="px-4 py-3">
                        {avgFocus > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className={['h-full rounded-full', focusBg(avgFocus)].join(' ')}
                                style={{ width: `${avgFocus}%` }}
                              />
                            </div>
                            <span className={['tabular-nums text-xs', focusColor(avgFocus)].join(' ')}>{avgFocus}%</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={['text-xs', focusColor(avgFocus)].join(' ')}>{avgFocus > 0 ? focusLabel(avgFocus) : '—'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent sessions ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
        <div className="border-b border-zinc-800/60 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">Dernières sessions</h3>
          {recentSessions.length > 0 && (
            <span className="text-xs text-zinc-600 tabular-nums">{recentSessions.length} affiché{recentSessions.length > 1 ? 's' : ''}</span>
          )}
        </div>

        {recentSessions.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-zinc-600">Aucune session enregistrée pour cette période.</p>
            <p className="mt-1 text-xs text-zinc-700">Lance le timer Focus pour commencer à tracker ton temps.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {recentSessions.map(({ session, task, domain }) => {
              const colors = domain ? getDomainColors(domain.color) : null
                const DomainIcon = domain ? getDomainIcon(domain.name) : null
              return (
                <div key={session.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors">
                  {/* Domain icon */}
                  <div className={[
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-base',
                    colors?.bg ?? 'bg-zinc-800',
                  ].join(' ')}>
                      {DomainIcon ? <DomainIcon size={16} /> : (domain?.icon ?? '⋯')}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 leading-tight truncate">
                      {task?.title ?? <span className="italic text-zinc-500">Tâche supprimée</span>}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {domain && colors && (
                        <span className={['text-xs', colors.text].join(' ')}>{domain.name}</span>
                      )}
                      <span className="text-xs text-zinc-600">·</span>
                      <span className="text-xs text-zinc-500">{fmtDate(session.date)}</span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-teal-400">
                      {formatDuration(session.duration)}
                    </p>
                    {/* Focus bar */}
                    <div className="mt-1 flex items-center gap-1.5 justify-end">
                      <div className="h-1 w-12 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={['h-full rounded-full', focusBg(session.focus)].join(' ')}
                          style={{ width: `${session.focus}%` }}
                        />
                      </div>
                      <span className={['text-[10px] tabular-nums', focusColor(session.focus)].join(' ')}>
                        {session.focus}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
