import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useTimerStore } from '../store/timerStore'
import { getDomainColors } from '../utils/domainColors'
import type { Task } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfWeek(offset = 0): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  return d
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-orange-400',
  medium: 'bg-yellow-400',
  low:    'bg-zinc-500',
}

const STATUS_STYLE: Record<string, string> = {
  done:        'line-through text-zinc-600 opacity-60',
  cancelled:   'line-through text-zinc-700 opacity-40',
  in_progress: '',
  todo:        '',
}

// ─── Task card in a day column ────────────────────────────────────────────────

function TaskCard({ task, onStatusToggle }: {
  task: Task
  onStatusToggle: (id: string) => void
}) {
  const domains    = useStore((s) => s.domains)
  const timerStore = useTimerStore()
  const domain     = domains.find((d) => d.id === task.domainId)
  const c          = domain ? getDomainColors(domain.color) : null
  const isRunning  = timerStore.taskId === task.id && timerStore.running

  const today = isoDate(new Date())
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done' && task.status !== 'cancelled'

  const startFocus = () => {
    if (timerStore.running) timerStore.pause()
    timerStore.setTask(task.id)
    timerStore.start()
  }

  return (
    <div className={[
      'group rounded-lg border px-2.5 py-2 text-xs transition-all cursor-default select-none',
      isOverdue ? 'border-red-500/40 bg-red-500/5' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
    ].join(' ')}>
      <div className="flex items-start gap-1.5">
        {/* Checkbox */}
        <button
          onClick={() => onStatusToggle(task.id)}
          className={[
            'mt-0.5 h-3.5 w-3.5 shrink-0 rounded border transition-colors',
            task.status === 'done'
              ? 'border-teal-500 bg-teal-500/30'
              : 'border-zinc-600 hover:border-zinc-400',
          ].join(' ')}
        >
          {task.status === 'done' && (
            <svg className="h-full w-full text-teal-400" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
            </svg>
          )}
        </button>

        {/* Title */}
        <span className={['flex-1 leading-snug min-w-0 break-words', STATUS_STYLE[task.status]].join(' ')}>
          {task.title}
        </span>
      </div>

      {/* Meta row */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className={['h-1.5 w-1.5 rounded-full shrink-0', PRIORITY_DOT[task.priority]].join(' ')} />
        {domain && c && (
          <span className={['text-[9px] rounded px-1 py-0.5 border leading-none', c.bg, c.border, c.text].join(' ')}>
            {domain.icon}
          </span>
        )}
        {task.timeEstimate && (
          <span className="text-[9px] text-zinc-600">{task.timeEstimate}m</span>
        )}
        {isOverdue && <span className="text-[9px] text-red-400 ml-auto">En retard</span>}

        {/* Focus button - visible on hover or if running */}
        {task.status !== 'done' && task.status !== 'cancelled' && (
          <button
            onClick={startFocus}
            className={[
              'ml-auto flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] transition-colors',
              isRunning
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-teal-400 hover:bg-teal-500/10',
            ].join(' ')}
            title="Démarrer le timer"
          >
            {isRunning ? '◉' : '▶'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function WeekView() {
  const tasks         = useStore((s) => s.tasks)
  const timeSessions  = useStore((s) => s.timeSessions)
  const domains       = useStore((s) => s.domains)
  const setTaskStatus = useStore((s) => s.setTaskStatus)

  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = useMemo(() => startOfWeek(weekOffset), [weekOffset])
  const weekDays  = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      return { date: isoDate(d), label: DAY_NAMES[i], day: d.getDate(), d }
    }), [weekStart])

  const todayIso = isoDate(new Date())

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const { date } of weekDays) map.set(date, [])
    for (const t of tasks) {
      if (t.dueDate && map.has(t.dueDate)) {
        map.get(t.dueDate)!.push(t)
      }
    }
    return map
  }, [tasks, weekDays])

  // Focus minutes per domain per day (from timeSessions)
  const focusByDay = useMemo(() => {
    const taskDomainMap = new Map(tasks.map((t) => [t.id, t.domainId]))
    const map = new Map<string, Map<string, number>>() // date → domainId → minutes
    for (const { date } of weekDays) map.set(date, new Map())
    for (const s of timeSessions) {
      if (!map.has(s.date)) continue
      const did = taskDomainMap.get(s.taskId)
      if (!did) continue
      const dayMap = map.get(s.date)!
      dayMap.set(did, (dayMap.get(did) ?? 0) + s.duration)
    }
    return map
  }, [timeSessions, tasks, weekDays])

  // Tasks without dueDate (backlog)
  const backlogTasks = useMemo(() =>
    tasks.filter((t) =>
      !t.dueDate &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
    ).slice(0, 20),
  [tasks])

  // Overdue tasks (dueDate < weekStart and not done)
  const overdueTasks = useMemo(() =>
    tasks.filter((t) =>
      t.dueDate &&
      t.dueDate < weekDays[0].date &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
    ).sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
  [tasks, weekDays])

  const handleStatusToggle = (id: string) => {
    const t = tasks.find((t) => t.id === id)
    if (!t) return
    setTaskStatus(id, t.status === 'done' ? 'todo' : 'done')
  }

  const weekLabel = () => {
    const start = weekDays[0]
    const end   = weekDays[6]
    const s = start.d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    const e = end.d.toLocaleDateString('fr-FR',   { day: 'numeric', month: 'short', year: 'numeric' })
    return `${s} – ${e}`
  }

  const totalTasksThisWeek  = Array.from(tasksByDay.values()).flat().length
  const doneTasksThisWeek   = Array.from(tasksByDay.values()).flat().filter((t) => t.status === 'done').length
  const focusMinsThisWeek   = Array.from(focusByDay.values()).flatMap((m) => [...m.values()]).reduce((a, b) => a + b, 0)
  const focusHours          = Math.round(focusMinsThisWeek / 6) / 10

  return (
    <div className="space-y-5 px-4 py-6 md:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Semaine</h1>
          <p className="text-sm text-zinc-500">{weekLabel()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            ‹ Préc.
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Auj.
            </button>
          )}
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            Suiv. ›
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
          <p className="text-lg font-bold text-zinc-100">{totalTasksThisWeek}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">tâches planifiées</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
          <p className="text-lg font-bold text-teal-400">{doneTasksThisWeek}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">terminées</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
          <p className="text-lg font-bold text-zinc-100">{focusHours}h</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">focus cette semaine</p>
        </div>
      </div>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
          <p className="text-xs font-semibold text-red-400 mb-2">⚠ {overdueTasks.length} tâche{overdueTasks.length > 1 ? 's' : ''} en retard</p>
          <div className="space-y-1.5">
            {overdueTasks.slice(0, 5).map((t) => (
              <TaskCard key={t.id} task={t} onStatusToggle={handleStatusToggle} />
            ))}
            {overdueTasks.length > 5 && (
              <p className="text-[10px] text-zinc-600 text-center">+{overdueTasks.length - 5} de plus…</p>
            )}
          </div>
        </div>
      )}

      {/* 7-day grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="grid min-w-[700px] grid-cols-7 gap-2">
          {weekDays.map(({ date, label, day }) => {
            const dayTasks   = tasksByDay.get(date) ?? []
            const isToday    = date === todayIso
            const isPast     = date < todayIso
            const focusMap   = focusByDay.get(date) ?? new Map()
            const totalMins  = [...focusMap.values()].reduce((a, b) => a + b, 0)

            return (
              <div key={date} className={[
                'flex flex-col rounded-xl border min-h-[200px]',
                isToday  ? 'border-teal-500/40 bg-teal-500/5' :
                isPast   ? 'border-zinc-800/60 bg-zinc-900/40' :
                           'border-zinc-800 bg-zinc-900',
              ].join(' ')}>
                {/* Day header */}
                <div className={[
                  'flex items-center justify-between rounded-t-xl px-2.5 py-2 border-b',
                  isToday ? 'border-teal-500/30' : 'border-zinc-800',
                ].join(' ')}>
                  <div>
                    <span className={['text-[10px] font-semibold uppercase tracking-wide', isToday ? 'text-teal-400' : 'text-zinc-500'].join(' ')}>
                      {label}
                    </span>
                    <span className={['ml-1.5 text-xs font-bold tabular-nums', isToday ? 'text-teal-300' : isPast ? 'text-zinc-600' : 'text-zinc-200'].join(' ')}>
                      {day}
                    </span>
                  </div>
                  {dayTasks.length > 0 && (
                    <span className="text-[9px] tabular-nums text-zinc-600">
                      {dayTasks.filter((t) => t.status === 'done').length}/{dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Focus bar (domains) */}
                {totalMins > 0 && (
                  <div className="flex h-1 overflow-hidden mx-2 mt-1.5 rounded-full gap-px" title={`${Math.round(totalMins / 6) / 10}h focus`}>
                    {domains.filter((d) => (focusMap.get(d.id) ?? 0) > 0).map((d) => {
                      const c = getDomainColors(d.color)
                      return (
                        <div
                          key={d.id}
                          className={['h-full', c.dot].join(' ')}
                          style={{ width: `${(focusMap.get(d.id)! / totalMins) * 100}%` }}
                        />
                      )
                    })}
                  </div>
                )}

                {/* Tasks */}
                <div className="flex flex-col gap-1.5 p-2 flex-1">
                  {dayTasks.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[10px] text-zinc-700">—</span>
                    </div>
                  ) : (
                    dayTasks
                      .sort((a, b) => {
                        const PRI = { urgent: 0, high: 1, medium: 2, low: 3 }
                        return PRI[a.priority] - PRI[b.priority]
                      })
                      .map((t) => (
                        <TaskCard key={t.id} task={t} onStatusToggle={handleStatusToggle} />
                      ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Backlog: tasks without a due date */}
      {backlogTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">
            Sans deadline <span className="text-zinc-600 font-normal">({backlogTasks.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {backlogTasks.map((t) => (
              <TaskCard key={t.id} task={t} onStatusToggle={handleStatusToggle} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
