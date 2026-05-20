import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useStore } from '../store'
import { usePomodoroStore } from '../store/pomodoroStore'
import { getDomainColors, getDomainIcon } from '../utils/domainColors'
import { TaskFormModal }      from '../components/TaskFormModal'
import { ObjectiveFormModal } from '../components/ObjectiveFormModal'
import { WritingView }        from './WritingView'
import { LawPage }            from './LawPage'
import { CareerView }        from './CareerView'
import { SportView }         from './SportView'
import { MusicPage }         from './MusicPage'
import { suggestMilestoneRecovery } from '../lib/aiService'
import type { Task, SubTask, Objective, Milestone, Priority, TaskStatus, TimeSession } from '../types'
import type { PomodoroPhase } from '../store/pomodoroStore'

// ─── Priority / Status config ─────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; badge: string; order: number }> = {
  urgent: { label: 'Urgent',  badge: 'bg-red-500/15 text-red-400 border border-red-500/25',          order: 0 },
  high:   { label: 'Haute',   badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/25', order: 1 },
  medium: { label: 'Moyenne', badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',       order: 2 },
  low:    { label: 'Basse',   badge: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30',       order: 3 },
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string }> = {
  todo:        { label: 'À faire',  dot: 'bg-zinc-500' },
  in_progress: { label: 'En cours', dot: 'bg-blue-400'  },
  done:        { label: 'Terminée', dot: 'bg-green-400' },
  cancelled:   { label: 'Annulée',  dot: 'bg-zinc-700'  },
}

type FilterTab = 'all' | 'active' | 'overdue' | 'done'
type SortKey   = 'priority' | 'dueDate' | 'timeEstimate'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isOverdue = (t: Task) =>
  !!t.dueDate &&
  t.status !== 'done' &&
  t.status !== 'cancelled' &&
  new Date(t.dueDate) < new Date(new Date().toDateString())

const fmt = (min: number) => {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h${m}m` : `${h}h`
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low']

const sortTasks = (tasks: Task[], key: SortKey): Task[] =>
  [...tasks].sort((a, b) => {
    if (key === 'priority')
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
    if (key === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    }
    if (a.timeEstimate == null && b.timeEstimate == null) return 0
    if (a.timeEstimate == null) return 1
    if (b.timeEstimate == null) return -1
    return b.timeEstimate - a.timeEstimate
  })

const progressColor = (p: number) =>
  p >= 80 ? 'bg-green-500' : p >= 50 ? 'bg-teal-500' : p >= 25 ? 'bg-blue-500' : 'bg-zinc-600'

const daysUntil = (iso: string) => {
  const diff = new Date(iso).getTime() - new Date(new Date().toDateString()).getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── Pomodoro phase display ───────────────────────────────────────────────────

const POMODORO_PHASE: Record<PomodoroPhase, { label: string; cls: string }> = {
  focus:       { label: 'Focus',        cls: 'text-teal-400'   },
  short_break: { label: 'Pause courte', cls: 'text-blue-400'   },
  long_break:  { label: 'Pause longue', cls: 'text-purple-400' },
}

// ─── Focus Timer Hook ─────────────────────────────────────────────────────────

function useFocusTimer(taskId: string) {
  const addTimeSession = useStore((s) => s.addTimeSession)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef    = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    startRef.current = Date.now() - elapsed * 1000
    intervalRef.current = setInterval(() =>
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    setRunning(true)
  }, [elapsed])

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    const minutes = Math.floor(elapsed / 60)
    if (minutes >= 1) {
      addTimeSession({ taskId, duration: minutes, date: new Date().toISOString().split('T')[0], focus: 80 })
    }
    setElapsed(0)
  }, [elapsed, taskId, addTimeSession])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const display = (() => {
    const h = Math.floor(elapsed / 3600)
    const m = Math.floor((elapsed % 3600) / 60)
    const s = elapsed % 60
    const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0')
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
  })()

  return { running, display, elapsed, start, stop }
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onEdit, sessions, subTasks }: {
  task:     Task
  onEdit:   (t: Task) => void
  sessions: TimeSession[]
  subTasks: SubTask[]
}) {
  const setTaskStatus  = useStore((s) => s.setTaskStatus)
  const deleteTask     = useStore((s) => s.deleteTask)
  const updateTask     = useStore((s) => s.updateTask)
  const addSubTask     = useStore((s) => s.addSubTask)
  const toggleSubTask  = useStore((s) => s.toggleSubTask)
  const deleteSubTask  = useStore((s) => s.deleteSubTask)
  const updateSubTask  = useStore((s) => s.updateSubTask)
  const timer          = useFocusTimer(task.id)

  // ── Pomodoro global state ────────────────────────────────────────────────
  const pomStatus  = usePomodoroStore((s) => s.status)
  const pomTaskId  = usePomodoroStore((s) => s.taskId)
  const pomPhase   = usePomodoroStore((s) => s.phase)
  const pomActive  = pomStatus !== 'idle'
  const pomHere    = pomActive && pomTaskId === task.id    // Pomodoro on THIS task
  const pomElsewhere = pomActive && pomTaskId !== task.id  // Pomodoro on another task

  // Title of the task currently in Pomodoro (if it's a different task)
  // Selector uses only pomTaskId (store value) — returns a primitive, stable across renders
  const pomElsewhereTitle = useStore((s) =>
    pomTaskId ? (s.tasks.find((t) => t.id === pomTaskId)?.title ?? null) : null
  )

  // If Pomodoro becomes active, auto-stop the local mini-timer
  const timerStopRef = useRef(timer.stop)
  useEffect(() => { timerStopRef.current = timer.stop }, [timer.stop])
  useEffect(() => {
    if (pomActive) timerStopRef.current()
  }, [pomActive])

  const [showNote,        setShowNote]        = useState(false)
  const [noteValue,       setNoteValue]       = useState(task.notes ?? '')
  const [showLog,         setShowLog]         = useState(false)
  const [confirmDel,      setConfirmDel]      = useState(false)
  const [showSubTasks,    setShowSubTasks]    = useState(false)
  const [newSubTitle,     setNewSubTitle]     = useState('')
  const [editingSubId,    setEditingSubId]    = useState<string | null>(null)
  const [editingSubTitle, setEditingSubTitle] = useState('')

  const doneSubCount = subTasks.filter((s) => s.completed).length

  const submitNewSub = () => {
    const t = newSubTitle.trim()
    if (!t) return
    addSubTask(task.id, t)
    setNewSubTitle('')
  }

  const startEditSub = (sub: SubTask) => {
    setEditingSubId(sub.id)
    setEditingSubTitle(sub.title)
  }

  const confirmEditSub = (id: string) => {
    const t = editingSubTitle.trim()
    if (t) updateSubTask(id, t)
    setEditingSubId(null)
  }

  const isDone      = task.status === 'done'
  const isCancelled = task.status === 'cancelled'
  const overdue     = isOverdue(task)
  const pCfg        = PRIORITY_CONFIG[task.priority]
  const totalTime   = sessions.reduce((acc, s) => acc + s.duration, 0)

  const toggleDone = () => setTaskStatus(task.id, isDone ? 'todo' : 'done')

  const saveNote = () => {
    updateTask(task.id, { notes: noteValue || undefined })
    setShowNote(false)
  }

  return (
    <div className={[
      'group rounded-xl border transition-colors',
      isDone || isCancelled
        ? 'border-zinc-800/40 bg-zinc-900/20 opacity-55'
        : overdue
        ? 'border-red-900/40 bg-red-950/10 hover:border-red-800/50'
        : 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60',
    ].join(' ')}>
      <div className="flex items-start gap-3 px-4 py-3">

        {/* Checkbox */}
        <button
          onClick={toggleDone}
          className={[
            'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
            isDone ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-zinc-600 hover:border-zinc-400',
          ].join(' ')}
        >
          {isDone && (
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={[
              'text-sm font-medium',
              isDone || isCancelled ? 'line-through text-zinc-500' : 'text-zinc-200',
            ].join(' ')}>
              {task.title}
            </span>
            <span className={['rounded-full px-2 py-0.5 text-xs font-medium', pCfg.badge].join(' ')}>
              {pCfg.label}
            </span>
            {!isDone && !isCancelled && (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <span className={['h-1.5 w-1.5 rounded-full', STATUS_CONFIG[task.status].dot].join(' ')} />
                {STATUS_CONFIG[task.status].label}
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {task.timeEstimate != null && (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <ClockIcon className="h-3 w-3" />
                {fmt(task.timeEstimate)}
              </span>
            )}
            {task.dueDate && (
              <span className={['flex items-center gap-1 text-xs', overdue ? 'text-red-400' : 'text-zinc-500'].join(' ')}>
                <CalendarIcon className="h-3 w-3" />
                {overdue && '⚠ '}{fmtDate(task.dueDate)}
              </span>
            )}
            {totalTime > 0 && (
              <button
                onClick={() => setShowLog(!showLog)}
                className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-400 transition-colors"
              >
                <PlayIcon className="h-3 w-3" />
                {fmt(totalTime)} logué
              </button>
            )}
            {subTasks.length > 0 && (
              <button
                onClick={() => setShowSubTasks(!showSubTasks)}
                className={[
                  'flex items-center gap-1 text-xs transition-colors',
                  doneSubCount === subTasks.length
                    ? 'text-green-500 hover:text-green-400'
                    : 'text-zinc-500 hover:text-zinc-300',
                ].join(' ')}
              >
                <ChecklistIcon className="h-3 w-3" />
                {doneSubCount}/{subTasks.length}
              </button>
            )}
            {/* Local mini-timer tick (only when no Pomodoro is active) */}
            {timer.running && !pomActive && (
              <span className="animate-pulse text-xs font-mono font-medium text-teal-400">
                ● {timer.display}
              </span>
            )}
            {/* Pomodoro on THIS task */}
            {pomHere && (
              <span className={['flex items-center gap-1 text-xs font-medium', POMODORO_PHASE[pomPhase].cls].join(' ')}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className={['absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', POMODORO_PHASE[pomPhase].cls.replace('text-', 'bg-')].join(' ')} />
                  <span className={['relative inline-flex h-1.5 w-1.5 rounded-full', POMODORO_PHASE[pomPhase].cls.replace('text-', 'bg-')].join(' ')} />
                </span>
                Pomodoro — {POMODORO_PHASE[pomPhase].label}
              </span>
            )}
            {/* Pomodoro on another task */}
            {pomElsewhere && (
              <span className="text-xs text-zinc-600" title={pomElsewhereTitle ?? undefined}>
                Pomodoro en cours{pomElsewhereTitle ? ` sur "${pomElsewhereTitle}"` : ''}
              </span>
            )}
          </div>

          {/* Session log */}
          {showLog && sessions.length > 0 && (
            <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Historique focus</p>
              {[...sessions].sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{fmtDate(s.date)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-teal-400 tabular-nums font-medium">{fmt(s.duration)}</span>
                    <div className="flex items-center gap-1">
                      <div className="h-1 w-12 rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-teal-500/60"
                          style={{ width: `${s.focus}%` }}
                        />
                      </div>
                      <span className="text-zinc-600 tabular-nums">{s.focus}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Note */}
          {task.notes && !showNote && (
            <p className="mt-2 border-l-2 border-zinc-700 pl-2 text-xs italic text-zinc-500 leading-relaxed">
              {task.notes}
            </p>
          )}
          {showNote && (
            <div className="mt-2 space-y-1.5">
              <textarea
                autoFocus
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Ajouter une note…"
                rows={2}
                className="w-full resize-none rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
              />
              <div className="flex gap-2">
                <button onClick={saveNote} className="rounded px-2.5 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">Enregistrer</button>
                <button onClick={() => { setNoteValue(task.notes ?? ''); setShowNote(false) }} className="rounded px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</button>
              </div>
            </div>
          )}

          {/* SubTask panel */}
          {showSubTasks && (
            <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">Sous-tâches</p>
              {subTasks.map((sub) => (
                <div key={sub.id} className="group/sub flex items-center gap-2">
                  <button
                    onClick={() => toggleSubTask(sub.id)}
                    className={[
                      'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all',
                      sub.completed
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-zinc-600 hover:border-zinc-400',
                    ].join(' ')}
                  >
                    {sub.completed && (
                      <svg className="h-2 w-2" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </button>
                  {editingSubId === sub.id ? (
                    <input
                      autoFocus
                      value={editingSubTitle}
                      onChange={(e) => setEditingSubTitle(e.target.value)}
                      onBlur={() => confirmEditSub(sub.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmEditSub(sub.id)
                        if (e.key === 'Escape') setEditingSubId(null)
                      }}
                      className="min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startEditSub(sub)}
                      className={['min-w-0 flex-1 truncate text-xs', sub.completed ? 'line-through text-zinc-600' : 'text-zinc-300'].join(' ')}
                    >
                      {sub.title}
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditSub(sub)}
                      className="text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      <EditIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteSubTask(sub.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Add new subtask */}
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  value={newSubTitle}
                  onChange={(e) => setNewSubTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitNewSub() }}
                  placeholder="Ajouter une sous-tâche…"
                  className="min-w-0 flex-1 rounded border border-zinc-700/60 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                />
                <button
                  onClick={submitNewSub}
                  disabled={!newSubTitle.trim()}
                  className="rounded px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isDone && !isCancelled && (
            pomHere ? (
              /* Pomodoro active on this task — show phase badge, no mini-timer */
              <span
                className={['rounded-lg px-2 py-1 text-[10px] font-medium border', {
                  focus:       'bg-teal-500/10   text-teal-400   border-teal-500/25',
                  short_break: 'bg-blue-500/10   text-blue-400   border-blue-500/25',
                  long_break:  'bg-purple-500/10 text-purple-400 border-purple-500/25',
                }[pomPhase]].join(' ')}
              >
                {POMODORO_PHASE[pomPhase].label}
              </span>
            ) : pomElsewhere ? (
              /* Pomodoro active on another task — disable with tooltip */
              <span
                className="rounded-lg p-1.5 text-zinc-700 cursor-not-allowed"
                title={`Pomodoro en cours${pomElsewhereTitle ? ` sur "${pomElsewhereTitle}"` : ''}`}
              >
                <PlayIcon className="h-3.5 w-3.5" />
              </span>
            ) : (
              /* Normal mini-timer button */
              <button
                onClick={timer.running ? timer.stop : timer.start}
                title={timer.running ? `Arrêter (${timer.display})` : 'Lancer le focus'}
                className={[
                  'rounded-lg p-1.5 transition-colors',
                  timer.running
                    ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'
                    : 'text-zinc-500 hover:bg-zinc-800 hover:text-teal-400',
                ].join(' ')}
              >
                {timer.running
                  ? <PauseIcon className="h-3.5 w-3.5" />
                  : <PlayIcon  className="h-3.5 w-3.5" />}
              </button>
            )
          )}
          <button
            onClick={() => setShowSubTasks(!showSubTasks)}
            title="Sous-tâches"
            className={[
              'rounded-lg p-1.5 transition-colors',
              showSubTasks || subTasks.length > 0 ? 'text-indigo-400' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300',
            ].join(' ')}
          >
            <ChecklistIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowNote(!showNote)}
            className={[
              'rounded-lg p-1.5 transition-colors',
              showNote || task.notes ? 'text-yellow-400' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300',
            ].join(' ')}
          >
            <PenIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onEdit(task)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
            <EditIcon className="h-3.5 w-3.5" />
          </button>
          {confirmDel ? (
            <div className="flex items-center gap-1">
              <button onClick={() => deleteTask(task.id)} className="rounded-lg px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                Confirmer
              </button>
              <button onClick={() => setConfirmDel(false)} className="text-zinc-500 hover:text-zinc-300 px-1 transition-colors">×</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── HabitHeatmap (DomainView) ───────────────────────────────────────────────

function HabitHeatmap({ obj }: { obj: Objective }) {
  if (!obj.dailyTarget) return null
  const dailyTarget = obj.dailyTarget
  const logMap = new Map((obj.dailyLog ?? []).map((e) => [e.date, e.value]))
  const days: Array<{ date: string; intensity: number }> = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    const v = logMap.get(iso) ?? 0
    const intensity = v >= dailyTarget ? 4 : v > dailyTarget * 0.66 ? 3 : v > dailyTarget * 0.33 ? 2 : v > 0 ? 1 : 0
    days.push({ date: iso, intensity })
  }
  return (
    <div className="flex gap-0.5 flex-nowrap">
      {days.map((d) => (
        <div
          key={d.date}
          title={d.date}
          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
          style={{
            background: d.intensity === 0 ? 'rgb(39 39 42)' : '#4ade80',
            opacity: d.intensity === 0 ? 1 : 0.2 + d.intensity * 0.2,
          }}
        />
      ))}
    </div>
  )
}

// ─── ObjectiveCard ────────────────────────────────────────────────────────────

function ObjectiveCard({ obj, onEdit }: { obj: Objective; onEdit: (o: Objective) => void }) {
  const domains              = useStore((s) => s.domains)
  const deleteObjective      = useStore((s) => s.deleteObjective)
  const setObjectiveProgress = useStore((s) => s.setObjectiveProgress)
  const incrementCounter     = useStore((s) => s.incrementCounter)
  const decrementCounter     = useStore((s) => s.decrementCounter)
  const logDailyValue        = useStore((s) => s.logDailyValue)
  const allMilestones        = useStore((s) => s.milestones)
  const addMilestone         = useStore((s) => s.addMilestone)
  const toggleMilestone      = useStore((s) => s.toggleMilestone)
  const deleteMilestone      = useStore((s) => s.deleteMilestone)
  const addTask              = useStore((s) => s.addTask)
  const kitEnabled           = useStore((s) => !!s.anthropicApiKey)

  const milestones = useMemo(
    () => allMilestones.filter(m => m.objectiveId === obj.id).sort((a, b) => a.position - b.position),
    [allMilestones, obj.id],
  )

  const [showSlider,  setShowSlider]  = useState(false)
  const [localProg,   setLocalProg]   = useState(obj.progress)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [expanded,    setExpanded]    = useState(false)
  const [addingMs,    setAddingMs]    = useState(false)
  const [newMsTitle,  setNewMsTitle]  = useState('')
  const [newMsDate,   setNewMsDate]   = useState('')
  const [kitLoading,  setKitLoading]  = useState(false)
  const [kitSug,      setKitSug]      = useState<{ nextAction: string; reason: string; timeEstimate: number } | null>(null)
  const [kitAccepted, setKitAccepted] = useState(false)
  const msInputRef = useRef<HTMLInputElement>(null)

  const done        = obj.progress >= 100
  const days        = obj.targetDate ? daysUntil(obj.targetDate) : null
  const isOverdue   = days !== null && days < 0 && !done
  const pColor      = progressColor(obj.progress)
  const isCounter   = obj.kind === 'counter'
  const isHabit     = isCounter && !!obj.dailyTarget
  const today       = new Date().toISOString().split('T')[0]
  const todayVal    = obj.dailyLog?.find(e => e.date === today)?.value ?? 0
  const dailyTarget = obj.dailyTarget ?? 1
  const isDoneToday = isHabit && todayVal >= dailyTarget
  const doneMs      = milestones.filter(m => m.done).length

  const saveProgress = () => { setObjectiveProgress(obj.id, localProg); setShowSlider(false) }

  const submitMs = () => {
    if (!newMsTitle.trim()) return
    const pos = milestones.length > 0 ? Math.max(...milestones.map(m => m.position)) + 1 : 0
    addMilestone({ objectiveId: obj.id, title: newMsTitle.trim(), targetDate: newMsDate || null, done: false, position: pos })
    setNewMsTitle(''); setNewMsDate(''); setAddingMs(false)
  }

  const fetchKit = async () => {
    setKitLoading(true)
    try {
      const domain = domains.find(d => d.id === obj.domainId)
      const result = await suggestMilestoneRecovery(obj, milestones, domain)
      setKitSug(result)
    } catch { /* ignore */ } finally { setKitLoading(false) }
  }

  const acceptKit = () => {
    if (!kitSug) return
    addTask({ domainId: obj.domainId, title: kitSug.nextAction, status: 'todo', priority: 'high', timeEstimate: kitSug.timeEstimate, dueDate: null, plannedDate: today, objectiveId: obj.id })
    setKitAccepted(true)
  }

  return (
    <div className={[
      'group rounded-xl border transition-colors',
      done      ? 'border-green-900/30 bg-green-950/10 opacity-70'
      : isOverdue ? 'border-orange-800/40 bg-zinc-900/40'
      : 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60',
    ].join(' ')}>
      <div className="px-4 py-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isOverdue && (
                <span className="rounded-full bg-orange-500/15 border border-orange-500/25 px-2 py-0.5 text-xs text-orange-400">
                  en retard
                </span>
              )}
              <span className={['text-sm font-medium', done ? 'text-zinc-500 line-through' : 'text-zinc-200'].join(' ')}>
                {obj.title}
              </span>
              {done && (
                <span className="rounded-full bg-green-500/15 border border-green-500/25 px-2 py-0.5 text-xs text-green-400">
                  Atteint
                </span>
              )}
            </div>
            {obj.description && (
              <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed line-clamp-2">{obj.description}</p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(obj)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
              <EditIcon className="h-3.5 w-3.5" />
            </button>
            {confirmDel ? (
              <div className="flex items-center gap-1">
                <button onClick={() => deleteObjective(obj.id)} className="rounded-lg px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Confirmer</button>
                <button onClick={() => setConfirmDel(false)} className="text-zinc-500 hover:text-zinc-300 px-1 transition-colors">×</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Date */}
        {obj.targetDate && (
          <div className="mt-2 flex items-center gap-1.5">
            <CalendarIcon className="h-3 w-3 text-zinc-600" />
            <span className={['text-xs', days !== null && days < 0 ? 'text-orange-400' : days !== null && days <= 7 ? 'text-orange-400' : 'text-zinc-500'].join(' ')}>
              {days !== null && days < 0 ? `Dépassé de ${Math.abs(days)}j` : days !== null && days === 0 ? "Aujourd'hui" : fmtDateLong(obj.targetDate)}
              {days !== null && days > 0 && <span className="ml-1.5 text-zinc-600">({days}j restants)</span>}
            </span>
          </div>
        )}

        {/* Counter / Habitude */}
        {isCounter && !done && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {isHabit ? (
              <>
                <button
                  onClick={() => logDailyValue(obj.id, todayVal + dailyTarget)}
                  className={['rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                    isDoneToday ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
                  ].join(' ')}
                >
                  {isDoneToday ? `✓ ${todayVal} aujourd'hui` : `+ ${dailyTarget} aujourd'hui`}
                </button>
                <HabitHeatmap obj={obj} />
              </>
            ) : (
              <>
                <button onClick={() => decrementCounter(obj.id)} disabled={(obj.current ?? 0) === 0}
                  className="rounded-lg w-7 h-7 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-30 transition-colors flex items-center justify-center text-base">
                  −
                </button>
                <span className="text-sm text-zinc-300 tabular-nums font-medium">{obj.current ?? 0} / {obj.target ?? 0}</span>
                <button onClick={() => incrementCounter(obj.id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
                  + Ajouter
                </button>
              </>
            )}
          </div>
        )}

        {/* Barre de progression (objectifs simples) */}
        {!isCounter && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600">Progression</span>
              <button onClick={() => { setLocalProg(obj.progress); setShowSlider(!showSlider) }}
                className="text-xs font-semibold tabular-nums text-zinc-400 hover:text-zinc-200 transition-colors">
                {obj.progress}%
              </button>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className={['h-full rounded-full transition-all duration-500', pColor].join(' ')} style={{ width: `${obj.progress}%` }} />
            </div>
            {showSlider && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="range" min="0" max="100" step="5" value={localProg}
                    onChange={(e) => setLocalProg(Number(e.target.value))} className="flex-1 accent-teal-500" />
                  <span className="w-9 text-right text-xs font-medium tabular-nums text-zinc-300">{localProg}%</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveProgress} className="rounded px-2.5 py-1 text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-colors">Mettre à jour</button>
                  <button onClick={() => setShowSlider(false)} className="rounded px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Barre compteur */}
        {isCounter && obj.target != null && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className={['h-full rounded-full transition-all duration-500', pColor].join(' ')} style={{ width: `${obj.progress}%` }} />
          </div>
        )}

        {/* Footer : jalons + Kit */}
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <ChevronDownIcon className={['h-3.5 w-3.5 transition-transform', expanded ? 'rotate-180' : ''].join(' ')} />
            Jalons
            {milestones.length > 0 && <span className="ml-0.5 text-zinc-600">({doneMs}/{milestones.length})</span>}
          </button>
          {isOverdue && kitEnabled && !kitAccepted && (
            <button onClick={() => void fetchKit()} disabled={kitLoading}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border border-orange-800/40 text-orange-400 hover:bg-orange-500/10 transition-colors">
              <SparklesIcon className="h-3 w-3" />
              {kitLoading ? 'Kit réfléchit…' : 'Demander à Kit'}
            </button>
          )}
          {kitAccepted && <span className="ml-auto text-xs text-green-400 italic">✓ tâche planifiée</span>}
        </div>

        {/* Suggestion Kit */}
        {kitSug && !kitAccepted && (
          <div className="mt-2 rounded-lg border border-orange-800/30 bg-orange-950/20 p-3 space-y-2">
            <p className="text-sm text-zinc-200">{kitSug.nextAction}</p>
            <p className="text-xs text-zinc-500 italic">{kitSug.reason}</p>
            <div className="flex gap-2">
              <button onClick={acceptKit} className="rounded px-2.5 py-1 text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition-colors">
                Planifier aujourd'hui
              </button>
              <button onClick={() => void fetchKit()} disabled={kitLoading} className="text-xs text-zinc-500 hover:text-zinc-300">↻ Autre</button>
            </div>
          </div>
        )}
      </div>

      {/* Jalons (repliables) */}
      {expanded && (
        <div className="border-t border-zinc-800/60 px-4 py-3 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-600">Jalons</span>
            {milestones.length > 0 && <span className="text-[10px] text-zinc-600">{doneMs}/{milestones.length} atteints</span>}
          </div>
          {milestones.length === 0 && !addingMs && (
            <p className="text-xs text-zinc-600 italic py-1">Aucun jalon — découpe en étapes concrètes.</p>
          )}
          {milestones.map((m: Milestone) => (
            <div key={m.id} className="flex items-center gap-2 py-1 group/ms">
              <button onClick={() => toggleMilestone(m.id)}
                className={['w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors',
                  m.done ? 'border-green-500 bg-green-500/20' : 'border-zinc-600 hover:border-zinc-400',
                ].join(' ')}>
                {m.done && <svg width={8} height={8} viewBox="0 0 10 10"><path d="M1.6 5.2L4 7.4 8.4 2.6" fill="none" stroke="#4ade80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
              <span className={['flex-1 text-sm', m.done ? 'line-through text-zinc-600' : 'text-zinc-300'].join(' ')}>{m.title}</span>
              {m.targetDate && <span className="text-xs text-zinc-600">{fmtDate(m.targetDate)}</span>}
              <button onClick={() => deleteMilestone(m.id)}
                className="opacity-0 group-hover/ms:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity">
                <TrashIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
          {addingMs ? (
            <div className="mt-1 space-y-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-2.5">
              <input ref={msInputRef} autoFocus value={newMsTitle} onChange={e => setNewMsTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitMs(); if (e.key === 'Escape') { setAddingMs(false); setNewMsTitle('') } }}
                placeholder="Titre du jalon…"
                className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none border-b border-zinc-700 pb-1" />
              <input type="date" value={newMsDate} onChange={e => setNewMsDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-400 outline-none" />
              <div className="flex gap-2">
                <button onClick={submitMs} className="rounded px-2.5 py-1 text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-colors">Ajouter</button>
                <button onClick={() => { setAddingMs(false); setNewMsTitle('') }} className="text-xs text-zinc-500 hover:text-zinc-300">Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setAddingMs(true); setTimeout(() => msInputRef.current?.focus(), 50) }}
              className="mt-1 flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              <PlusSmIcon className="h-3 w-3" />Ajouter un jalon
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── DomainView ───────────────────────────────────────────────────────────────

export function DomainView() {
  const { id } = useParams<{ id: string }>()

  const domains          = useStore((s) => s.domains)
  const allStoreTasks    = useStore((s) => s.tasks)
  const allObjectives    = useStore((s) => s.objectives)
  const timeSessions     = useStore((s) => s.timeSessions)
  const allSubTasks      = useStore((s) => s.subtasks)

  const domain     = useMemo(() => domains.find((d) => d.id === id),                           [domains, id])
  const allTasks   = useMemo(() => allStoreTasks.filter((t) => t.domainId === id),             [allStoreTasks, id])
  const objectives = useMemo(() => allObjectives.filter((o) => o.domainId === id),             [allObjectives, id])

  const [filter,    setFilter]    = useState<FilterTab>('all')
  const [sortKey,   setSortKey]   = useState<SortKey>('priority')

  const [taskModal,  setTaskModal]  = useState(false)
  const [editTask,   setEditTask]   = useState<Task | undefined>()
  const [objModal,   setObjModal]   = useState(false)
  const [editObj,    setEditObj]    = useState<Objective | undefined>()

  if (!domain) return <Navigate to="/dashboard" replace />

  // Dispatch to WritingView for the Écriture domain
  if (domain.name.trim().toLowerCase() === 'écriture') return <WritingView />

  // Dispatch to LawPage for the Droit domain
  if (domain.name.trim().toLowerCase() === 'droit') return <LawPage />

  // Dispatch to CareerView for the Carrière domain
  if (domain.name.trim().toLowerCase() === 'carrière') return <CareerView />

  // Dispatch to SportView for the Sport domain
  if (domain.name.trim().toLowerCase() === 'sport') return <SportView />

  // Dispatch to MusicPage for the Musique domain
  if (domain.name.trim().toLowerCase() === 'musique') return <MusicPage />

  const colors = getDomainColors(domain.color)
  const DomainIcon = getDomainIcon(domain.name)

  // ── Computed ──────────────────────────────────────────────────────────────

  const activeTasks  = allTasks.filter((t) => t.status === 'todo' || t.status === 'in_progress')
  const doneTasks    = allTasks.filter((t) => t.status === 'done')
  const overdueTasks = allTasks.filter(isOverdue)
  const nonCancelled = allTasks.filter((t) => t.status !== 'cancelled')

  const filteredTasks = (() => {
    switch (filter) {
      case 'active':  return activeTasks
      case 'done':    return doneTasks
      case 'overdue': return overdueTasks
      default:        return nonCancelled
    }
  })()

  const sortedTasks = sortTasks(filteredTasks, sortKey)

  // Domain task progress
  const taskProgress = nonCancelled.length > 0
    ? Math.round((doneTasks.length / nonCancelled.length) * 100)
    : 0

  // Objective average progress
  const objAvg = objectives.length > 0
    ? Math.round(objectives.reduce((a, o) => a + o.progress, 0) / objectives.length)
    : null

  // Global domain progress (blend task + objective progress)
  const scores    = [taskProgress, objAvg].filter((s): s is number => s !== null)
  const progress  = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  // Weekly time
  const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekTime = timeSessions
    .filter((ts) => allTasks.some((t) => t.id === ts.taskId) && new Date(ts.date) >= weekAgo)
    .reduce((acc, ts) => acc + ts.duration, 0)

  // Sessions indexed by taskId
  const sessionsByTask: Record<string, TimeSession[]> = {}
  for (const ts of timeSessions) {
    if (allTasks.some((t) => t.id === ts.taskId)) {
      ;(sessionsByTask[ts.taskId] ??= []).push(ts)
    }
  }

  // SubTasks indexed by taskId
  const subTasksByTask: Record<string, SubTask[]> = {}
  for (const sub of allSubTasks) {
    if (allTasks.some((t) => t.id === sub.parentTaskId)) {
      ;(subTasksByTask[sub.parentTaskId] ??= []).push(sub)
    }
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',     label: 'Toutes',    count: nonCancelled.length },
    { key: 'active',  label: 'Actives',   count: activeTasks.length  },
    { key: 'overdue', label: 'En retard', count: overdueTasks.length },
    { key: 'done',    label: 'Terminées', count: doneTasks.length    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Domain header ──────────────────────────────────────────────────── */}
      <div className={['rounded-2xl border p-5', colors.bgMuted, colors.border].join(' ')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center text-3xl leading-none">{DomainIcon ? <DomainIcon size={32} /> : domain.icon}</span>
            <div>
              <h1 className={['text-xl font-bold', colors.text].join(' ')}>{domain.name}</h1>
              {domain.description && (
                <p className="mt-0.5 text-sm text-zinc-500">{domain.description}</p>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-5 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums text-zinc-200">{activeTasks.length}</p>
              <p className="text-xs text-zinc-500">actives</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-zinc-200">{objectives.length}</p>
              <p className="text-xs text-zinc-500">objectifs</p>
            </div>
            {weekTime > 0 && (
              <div>
                <p className={['text-lg font-bold tabular-nums', colors.text].join(' ')}>{fmt(weekTime)}</p>
                <p className="text-xs text-zinc-500">cette semaine</p>
              </div>
            )}
          </div>
        </div>

        {/* Global progress bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Progression globale</span>
            <span className={['text-xs font-semibold tabular-nums', colors.text].join(' ')}>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={['h-full rounded-full transition-all duration-500', colors.dot].join(' ')}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 flex gap-4 text-xs text-zinc-600">
            <span>Tâches : {taskProgress}%</span>
            {objAvg !== null && <span>Objectifs : {objAvg}%</span>}
          </div>
        </div>
      </div>

      {/* ── Tasks ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">☑</span>
            <h3 className="text-sm font-semibold text-zinc-200">Tâches</h3>
          </div>
          <button
            onClick={() => { setEditTask(undefined); setTaskModal(true) }}
            className={['flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', colors.text, colors.bg, 'hover:opacity-80'].join(' ')}
          >
            <span className="text-base leading-none">+</span> Nouvelle tâche
          </button>
        </div>

        {/* Filter + Sort */}
        <div className="flex flex-col gap-2 border-b border-zinc-800/40 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={[
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  filter === tab.key
                    ? 'bg-zinc-700 text-zinc-100'
                    : tab.key === 'overdue' && tab.count > 0
                    ? 'text-red-400 hover:bg-zinc-800/60'
                    : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300',
                ].join(' ')}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={[
                    'ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                    filter === tab.key ? 'bg-zinc-600 text-zinc-200' : 'bg-zinc-800 text-zinc-500',
                  ].join(' ')}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600">Trier par</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-zinc-700/40 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-zinc-600 transition-colors"
            >
              <option value="priority">Priorité</option>
              <option value="dueDate">Échéance</option>
              <option value="timeEstimate">Durée</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 p-3">
          {sortedTasks.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-zinc-600">
                {filter === 'overdue' ? 'Aucune tâche en retard. Bien joué !' :
                 filter === 'all'     ? 'Aucune tâche pour ce domaine.' :
                 'Aucune tâche dans cette catégorie.'}
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => { setEditTask(undefined); setTaskModal(true) }}
                  className="mt-3 text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-300 transition-colors"
                >
                  Créer la première tâche
                </button>
              )}
            </div>
          ) : (
            sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => { setEditTask(t); setTaskModal(true) }}
                sessions={sessionsByTask[task.id] ?? []}
                subTasks={subTasksByTask[task.id] ?? []}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Objectives ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">◎</span>
            <h3 className="text-sm font-semibold text-zinc-200">Objectifs</h3>
            {objectives.length > 0 && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs tabular-nums text-zinc-400">
                {objectives.filter((o) => o.progress < 100).length}/{objectives.length}
              </span>
            )}
          </div>
          <button
            onClick={() => { setEditObj(undefined); setObjModal(true) }}
            className={['flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', colors.text, colors.bg, 'hover:opacity-80'].join(' ')}
          >
            <span className="text-base leading-none">+</span> Nouvel objectif
          </button>
        </div>

        <div className="space-y-2 p-3">
          {objectives.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-zinc-600">Aucun objectif défini pour ce domaine.</p>
              <button
                onClick={() => { setEditObj(undefined); setObjModal(true) }}
                className="mt-3 text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-300 transition-colors"
              >
                Créer le premier objectif
              </button>
            </div>
          ) : (
            [...objectives]
              .sort((a, b) => a.progress - b.progress) // non terminés en premier
              .map((obj) => (
                <ObjectiveCard
                  key={obj.id}
                  obj={obj}
                  onEdit={(o) => { setEditObj(o); setObjModal(true) }}
                />
              ))
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {taskModal && (
        <TaskFormModal
          domainId={domain.id}
          task={editTask}
          onClose={() => { setTaskModal(false); setEditTask(undefined) }}
        />
      )}
      {objModal && (
        <ObjectiveFormModal
          domainId={domain.id}
          objective={editObj}
          onClose={() => { setObjModal(false); setEditObj(undefined) }}
        />
      )}
    </div>
  )
}

// ─── Micro icons ──────────────────────────────────────────────────────────────

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
    </svg>
  )
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function ChecklistIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}

function PlusSmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
