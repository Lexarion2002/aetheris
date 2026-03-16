import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useLawStore } from '../store/lawStore'
import { useStore } from '../store'
import { usePomodoroStore } from '../store/pomodoroStore'
import { TaskFormModal } from '../components/TaskFormModal'
import type { GlobalStatus } from '../store/lawStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<GlobalStatus, string> = {
  recherches:   'Recherches',
  redaction:    'Rédaction',
  repetition:   'Répétition',
  finalisation: 'Finalisation',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const daysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - new Date(new Date().toDateString()).getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const urgencyColor = (days: number) => {
  if (days < 0)   return 'text-zinc-500'
  if (days <= 14) return 'text-red-400'
  if (days <= 30) return 'text-amber-400'
  if (days <= 60) return 'text-yellow-500'
  return 'text-teal-400'
}

const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const fmtDuration = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

// ─── Countdown Card ───────────────────────────────────────────────────────────

function CountdownCard({ label, date, onDateChange }: {
  label:        string
  date:         string | null
  onDateChange: (d: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const days = date ? daysUntil(date) : null

  return (
    <div className="flex-1 min-w-[200px] rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
        <button
          onClick={() => setEditing(!editing)}
          className="text-zinc-700 hover:text-zinc-400 transition-colors text-xs"
        >
          {date ? '✎' : '+ date'}
        </button>
      </div>

      {editing ? (
        <input
          type="date"
          defaultValue={date ?? ''}
          autoFocus
          onBlur={(e) => { onDateChange(e.target.value || null); setEditing(false) }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 outline-none focus:border-zinc-500 transition-colors"
        />
      ) : date && days !== null ? (
        <>
          <p className={['text-5xl font-extralight tabular-nums leading-none', urgencyColor(days)].join(' ')}>
            {days >= 0 ? days : '—'}
          </p>
          <div>
            <p className="text-sm text-zinc-500">{days >= 0 ? 'jours restants' : 'dépassé'}</p>
            <p className="mt-0.5 text-xs text-zinc-700">{fmtDateLong(date)}</p>
          </div>
        </>
      ) : (
        <p className="text-sm italic text-zinc-700">Date non définie</p>
      )}
    </div>
  )
}

// ─── LawView ──────────────────────────────────────────────────────────────────

export function LawView() {
  const navigate = useNavigate()

  // Law store
  const grandOralDate  = useLawStore((s) => s.grandOralDate)
  const rapportDate    = useLawStore((s) => s.rapportDate)
  const globalStatus   = useLawStore((s) => s.globalStatus)
  const notionUrl      = useLawStore((s) => s.notionUrl)
  const setGrandOralDate = useLawStore((s) => s.setGrandOralDate)
  const setRapportDate   = useLawStore((s) => s.setRapportDate)
  const setGlobalStatus  = useLawStore((s) => s.setGlobalStatus)
  const setNotionUrl     = useLawStore((s) => s.setNotionUrl)

  // Main store
  const allTasks       = useStore((s) => s.tasks)
  const domains        = useStore((s) => s.domains)
  const timeSessions   = useStore((s) => s.timeSessions)
  const pomSettings    = useStore((s) => s.pomodoroSettings)

  // Pomodoro
  const pomInit        = usePomodoroStore((s) => s.init)
  const pomStart       = usePomodoroStore((s) => s.startTimer)
  const pomStatus      = usePomodoroStore((s) => s.status)

  const [editNotion, setEditNotion] = useState(false)
  const [notionVal,  setNotionVal]  = useState(notionUrl)
  const [taskModal,  setTaskModal]  = useState(false)

  // ── Find the Droit domain ──────────────────────────────────────────────────

  const droitDomain = useMemo(
    () => domains.find((d) => d.name.trim().toLowerCase() === 'droit'),
    [domains],
  )

  // ── 5 next tasks (Droit, non-done, sorted by dueDate) ─────────────────────

  const nextTasks = useMemo(() => {
    if (!droitDomain) return []
    return allTasks
      .filter((t) => t.domainId === droitDomain.id && t.status !== 'done' && t.status !== 'cancelled')
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })
      .slice(0, 5)
  }, [allTasks, droitDomain])

  // ── Focus stats (Droit tasks only) ────────────────────────────────────────

  const droitTaskIds = useMemo(
    () => new Set(droitDomain ? allTasks.filter((t) => t.domainId === droitDomain.id).map((t) => t.id) : []),
    [allTasks, droitDomain],
  )

  const droitSessions = useMemo(
    () => timeSessions.filter((ts) => droitTaskIds.has(ts.taskId)),
    [timeSessions, droitTaskIds],
  )

  const thisMonth = new Date().toISOString().slice(0, 7)

  const monthSessions = useMemo(
    () => droitSessions.filter((ts) => ts.date.startsWith(thisMonth)),
    [droitSessions, thisMonth],
  )

  const monthMinutes = monthSessions.reduce((a, ts) => a + ts.duration, 0)
  const monthCount   = monthSessions.length

  const lastSessionDays = useMemo(() => {
    if (droitSessions.length === 0) return null
    const sorted = [...droitSessions].sort((a, b) => b.date.localeCompare(a.date))
    const diff = new Date(new Date().toDateString()).getTime() - new Date(sorted[0].date).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }, [droitSessions])

  // ── Weekly chart data (last 8 weeks) ──────────────────────────────────────

  const weeklyData = useMemo(() => {
    const weeks: { label: string; minutes: number }[] = []
    const now = new Date()
    for (let w = 7; w >= 0; w--) {
      const end   = new Date(now)
      end.setDate(end.getDate() - w * 7)
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      const startStr = start.toISOString().split('T')[0]
      const endStr   = end.toISOString().split('T')[0]
      const minutes  = droitSessions
        .filter((ts) => ts.date >= startStr && ts.date <= endStr)
        .reduce((a, ts) => a + ts.duration, 0)
      weeks.push({
        label: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        minutes,
      })
    }
    return weeks
  }, [droitSessions])

  const maxWeekMin = Math.max(...weeklyData.map((w) => w.minutes), 1)

  // ── Launch Pomodoro on a task ──────────────────────────────────────────────

  const launchPomodoro = (taskId: string) => {
    if (pomStatus !== 'idle') return   // already running
    pomInit(taskId, pomSettings.focusDuration * 60)
    pomStart()
    navigate('/focus')
  }

  // ── Notion URL save ───────────────────────────────────────────────────────

  const saveNotion = () => {
    setNotionUrl(notionVal.trim())
    setEditNotion(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-14">

      {/* ── 1. Comptes à rebours ──────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex gap-4 flex-wrap sm:flex-nowrap">
          <CountdownCard label="Grand Oral"         date={grandOralDate} onDateChange={setGrandOralDate} />
          <CountdownCard label="Rapport d'Alternance" date={rapportDate}   onDateChange={setRapportDate}   />
        </div>

        {/* Statut global */}
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(STATUS_LABELS) as GlobalStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setGlobalStatus(s)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                globalStatus === s
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/25'
                  : 'border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300',
              ].join(' ')}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      {/* ── 2. Focus rapide ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Tâches critiques Droit
          </h2>
          <button
            onClick={() => setTaskModal(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            + Nouvelle tâche
          </button>
        </div>

        {nextTasks.length === 0 ? (
          <p className="text-sm italic text-zinc-600">
            Aucune tâche active dans le domaine Droit.
          </p>
        ) : (
          <div className="space-y-1.5">
            {nextTasks.map((task) => {
              const days = task.dueDate ? daysUntil(task.dueDate) : null
              const canLaunch = pomStatus === 'idle'
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{task.title}</p>
                    {task.dueDate && days !== null && (
                      <p className={['mt-0.5 text-xs', urgencyColor(days)].join(' ')}>
                        {days === 0 ? "Aujourd'hui" : days < 0 ? `${Math.abs(days)}j de retard` : `dans ${days}j`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => launchPomodoro(task.id)}
                    disabled={!canLaunch}
                    title={canLaunch ? 'Lancer le Pomodoro' : 'Un Pomodoro est déjà en cours'}
                    className={[
                      'flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      canLaunch
                        ? 'bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 border border-teal-500/25'
                        : 'bg-zinc-800/60 text-zinc-600 cursor-not-allowed',
                    ].join(' ')}
                  >
                    ▶ Pomodoro
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 3. Temps investi ──────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Temps investi
        </h2>

        {/* Stats row */}
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-2xl font-light text-zinc-200 tabular-nums">
              {fmtDuration(monthMinutes)}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">ce mois</p>
          </div>
          <div>
            <p className="text-2xl font-light text-zinc-200 tabular-nums">{monthCount}</p>
            <p className="text-xs text-zinc-600 mt-0.5">sessions ce mois</p>
          </div>
          {lastSessionDays !== null && (
            <div>
              <p className={[
                'text-2xl font-light tabular-nums',
                lastSessionDays === 0 ? 'text-teal-400' : lastSessionDays <= 3 ? 'text-zinc-200' : lastSessionDays <= 7 ? 'text-amber-400' : 'text-red-400',
              ].join(' ')}>
                {lastSessionDays === 0 ? 'Aujourd\'hui' : `${lastSessionDays}j`}
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">dernière session</p>
            </div>
          )}
        </div>

        {/* Weekly bar chart */}
        {droitSessions.length > 0 && (
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barSize={16} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: '#52525b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(v: number) => [fmtDuration(v), 'Focus']}
                />
                <Bar dataKey="minutes" radius={[3, 3, 0, 0]}>
                  {weeklyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.minutes === maxWeekMin && entry.minutes > 0 ? '#2dd4bf' : '#27272a'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {droitSessions.length === 0 && (
          <p className="text-sm italic text-zinc-700">Aucune session de focus enregistrée pour Droit.</p>
        )}
      </section>

      {/* ── 4. Notion ─────────────────────────────────────────────────────── */}
      <section className="pb-8">
        {editNotion ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={notionVal}
              onChange={(e) => setNotionVal(e.target.value)}
              placeholder="https://notion.so/…"
              className="flex-1 rounded-lg border border-zinc-700/60 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
            />
            <button onClick={saveNotion} className="rounded-lg px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors">OK</button>
            <button onClick={() => { setNotionVal(notionUrl); setEditNotion(false) }} className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">×</button>
          </div>
        ) : notionUrl ? (
          <div className="flex items-center gap-3">
            <a
              href={notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 hover:text-teal-400 transition-colors"
            >
              → Voir le cours complet dans Notion
            </a>
            <button onClick={() => { setNotionVal(notionUrl); setEditNotion(true) }} className="text-zinc-700 hover:text-zinc-500 transition-colors text-xs">✎</button>
          </div>
        ) : (
          <button
            onClick={() => { setNotionVal(''); setEditNotion(true) }}
            className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
          >
            + Lien Notion
          </button>
        )}
      </section>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {taskModal && droitDomain && (
        <TaskFormModal
          domainId={droitDomain.id}
          onClose={() => setTaskModal(false)}
        />
      )}
    </div>
  )
}
