import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useStore } from '../store'
import { usePomodoroStore, selectLiveRemaining } from '../store/pomodoroStore'
import { getDomainColors } from '../utils/domainColors'
import type { PomodoroPhase } from '../store/pomodoroStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCountdown = (s: number) => {
  const m  = Math.floor(s / 60)
  const sc = s % 60
  return `${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`
}

const todayStr = () => new Date().toISOString().split('T')[0]

function playDing() {
  try {
    const ctx  = new (window.AudioContext ?? (window as any).webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5)
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.5)
  } catch { /* AudioContext unavailable */ }
}

// ─── Phase config ─────────────────────────────────────────────────────────────

interface PhaseConfig {
  label:   string
  color:   string   // hex for SVG stroke
  header:  string   // bg class for header
  ring:    string   // text-color class
  ping:    string   // bg class for ping dot
}

const PHASE_CFG: Record<PomodoroPhase, PhaseConfig> = {
  focus:       { label: 'Focus',        color: '#14b8a6', header: 'bg-teal-950/20',   ring: 'text-teal-400',   ping: 'bg-teal-400'   },
  short_break: { label: 'Pause courte', color: '#3b82f6', header: 'bg-blue-950/20',   ring: 'text-blue-400',   ping: 'bg-blue-400'   },
  long_break:  { label: 'Pause longue', color: '#a855f7', header: 'bg-purple-950/20', ring: 'text-purple-400', ping: 'bg-purple-400' },
}

// ─── SVG Ring ─────────────────────────────────────────────────────────────────

const R      = 52
const CX     = 64
const CIRCUM = 2 * Math.PI * R

function Ring({ remaining, total, phase }: { remaining: number; total: number; phase: PomodoroPhase }) {
  const cfg      = PHASE_CFG[phase]
  const progress = total > 0 ? remaining / total : 1
  const offset   = CIRCUM * (1 - progress)

  return (
    <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx={CX} cy={CX} r={R} fill="none" stroke="#27272a" strokeWidth="6" />
      {/* Progress */}
      <circle
        cx={CX} cy={CX} r={R}
        fill="none"
        stroke={cfg.color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={CIRCUM}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  )
}

// ─── TaskPicker ───────────────────────────────────────────────────────────────

function TaskPicker({ onSelect, onClose }: {
  onSelect: (taskId: string) => void
  onClose:  () => void
}) {
  const domains  = useStore((s) => s.domains)
  const allTasks = useStore((s) => s.tasks)
  const tasks    = useMemo(
    () => allTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled'),
    [allTasks],
  )
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = tasks.filter((t) =>
    !query || t.title.toLowerCase().includes(query.toLowerCase())
  )

  const grouped = domains
    .map((d) => ({ domain: d, tasks: filtered.filter((t) => t.domainId === d.id) }))
    .filter((g) => g.tasks.length > 0)

  return (
    <div className="flex flex-col" style={{ maxHeight: '360px' }}>
      <div className="border-b border-zinc-800 px-3 py-2.5 flex items-center justify-between gap-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une tâche…"
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
        />
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-lg leading-none transition-colors">×</button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {grouped.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-600">Aucune tâche active</p>
        ) : (
          grouped.map(({ domain, tasks: domTasks }) => {
            const colors = getDomainColors(domain.color)
            return (
              <div key={domain.id}>
                <p className={['px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider', colors.text].join(' ')}>
                  {domain.icon} {domain.name}
                </p>
                {domTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── GlobalTimer ──────────────────────────────────────────────────────────────

export function GlobalTimer() {
  const tasks          = useStore((s) => s.tasks)
  const domains        = useStore((s) => s.domains)
  const timeSessions   = useStore((s) => s.timeSessions)
  const addTimeSession = useStore((s) => s.addTimeSession)
  const settings       = useStore((s) => s.pomodoroSettings)

  const { taskId, phase, sessionNum, status, init, startTimer, pauseTimer, advance, abandon } =
    usePomodoroStore()

  // Force re-render every second while running
  const [, forceRender] = useState(0)
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef    = useRef(false)

  // Always-fresh ref for phase completion handler (avoids stale closures in interval)
  const handlePhaseCompleteRef = useRef<() => void>(() => {})

  const handlePhaseComplete = useCallback(() => {
    const s         = usePomodoroStore.getState()
    const remaining = selectLiveRemaining(s)
    const cfg       = PHASE_CFG[s.phase]

    if (settings.soundEnabled) playDing()

    if (Notification.permission === 'granted') {
      new Notification(
        s.phase === 'focus' ? `${cfg.label} terminé ! 🎉` : `${cfg.label} terminée !`,
        { body: s.phase === 'focus' ? 'Bien joué, prends une pause.' : "C'est reparti !" },
      )
    }

    if (s.phase === 'focus') {
      const elapsed = Math.max(0, s.phaseDuration - remaining)
      const minutes = Math.max(1, Math.round(elapsed / 60))
      if (s.taskId) {
        addTimeSession({ taskId: s.taskId, duration: minutes, date: todayStr(), focus: 90 })
      }
      const newTotal = s.totalFocusDone + 1
      if (s.sessionNum >= settings.sessionsBeforeLongBreak) {
        advance('long_break', settings.longBreakDuration * 60, true, s.sessionNum, newTotal)
      } else {
        advance('short_break', settings.shortBreakDuration * 60, true, s.sessionNum, newTotal)
      }
    } else if (s.phase === 'short_break') {
      advance('focus', settings.focusDuration * 60, false, s.sessionNum + 1, s.totalFocusDone)
    } else {
      advance('focus', settings.focusDuration * 60, false, 1, s.totalFocusDone)
    }
  }, [settings, addTimeSession, advance])

  // Keep ref in sync so the interval callback is always current
  useEffect(() => { handlePhaseCompleteRef.current = handlePhaseComplete }, [handlePhaseComplete])

  // Tick interval — only depends on status
  useEffect(() => {
    if (status === 'running') {
      completedRef.current = false
      intervalRef.current = setInterval(() => {
        forceRender((n) => n + 1)
        const remaining = selectLiveRemaining(usePomodoroStore.getState())
        if (remaining > 0) {
          completedRef.current = false
        } else if (!completedRef.current) {
          completedRef.current = true
          handlePhaseCompleteRef.current()
        }
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [status])

  // ── Skip ────────────────────────────────────────────────────────────────────

  const handleSkip = useCallback(() => {
    const s         = usePomodoroStore.getState()
    const remaining = selectLiveRemaining(s)

    if (s.phase === 'focus') {
      const elapsed = Math.max(0, s.phaseDuration - remaining)
      const minutes = Math.floor(elapsed / 60)
      if (s.taskId && minutes >= 1) {
        addTimeSession({ taskId: s.taskId, duration: minutes, date: todayStr(), focus: 90 })
      }
      if (s.sessionNum >= settings.sessionsBeforeLongBreak) {
        advance('long_break', settings.longBreakDuration * 60, true, s.sessionNum, s.totalFocusDone)
      } else {
        advance('short_break', settings.shortBreakDuration * 60, true, s.sessionNum, s.totalFocusDone)
      }
    } else if (s.phase === 'short_break') {
      advance('focus', settings.focusDuration * 60, false, s.sessionNum + 1, s.totalFocusDone)
    } else {
      advance('focus', settings.focusDuration * 60, false, 1, s.totalFocusDone)
    }
  }, [settings, addTimeSession, advance])

  // ── Terminate (save + close) ─────────────────────────────────────────────────

  const handleTerminate = useCallback(() => {
    const s         = usePomodoroStore.getState()
    const remaining = selectLiveRemaining(s)
    if (s.phase === 'focus') {
      const elapsed = Math.max(0, s.phaseDuration - remaining)
      const minutes = Math.floor(elapsed / 60)
      if (s.taskId && minutes >= 1) {
        addTimeSession({ taskId: s.taskId, duration: minutes, date: todayStr(), focus: 90 })
      }
    }
    abandon(settings.focusDuration * 60)
    setShowPicker(false)
  }, [settings, addTimeSession, abandon])

  // ── Task picker ──────────────────────────────────────────────────────────────

  const [showPicker, setShowPicker] = useState(false)

  const handleSelectTask = useCallback((id: string) => {
    init(id, settings.focusDuration * 60)
    setShowPicker(false)
  }, [init, settings.focusDuration])

  // ── Derived render values ────────────────────────────────────────────────────

  const liveRemaining = selectLiveRemaining(usePomodoroStore.getState())
  const cfg           = PHASE_CFG[phase]
  const task          = tasks.find((t) => t.id === taskId)
  const domain        = task ? domains.find((d) => d.id === task.domainId) : null
  const colors        = domain ? getDomainColors(domain.color) : null
  const isRunning     = status === 'running'

  const today          = todayStr()
  const todaySessions  = timeSessions.filter((s) => s.date === today)
  const todayCount     = todaySessions.length
  const todayMinutes   = todaySessions.reduce((a, s) => a + s.duration, 0)
  const { phaseDuration } = usePomodoroStore.getState()

  // ── Idle state ───────────────────────────────────────────────────────────────

  if (status === 'idle') {
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setShowPicker(true)}
          className="group flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-400 shadow-lg shadow-black/40 hover:border-teal-500/40 hover:text-teal-400 transition-all hover:shadow-teal-500/10"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          Focus
        </button>

        {showPicker && (
          <div className="absolute bottom-full mb-2 right-0 w-72 rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/50 overflow-hidden">
            <TaskPicker
              onSelect={handleSelectTask}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
      </div>
    )
  }

  // ── Active Pomodoro widget ────────────────────────────────────────────────────

  return (
    <div className="fixed bottom-5 right-5 z-40 w-72">
      <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/50 overflow-hidden">

        {/* Task picker overlay */}
        {showPicker ? (
          <TaskPicker
            onSelect={handleSelectTask}
            onClose={() => setShowPicker(false)}
          />
        ) : (
          <>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className={['flex items-center justify-between px-4 py-3 border-b border-zinc-800/60', cfg.header].join(' ')}>
              <div className="flex items-center gap-2">
                {isRunning && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className={['absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', cfg.ping].join(' ')} />
                    <span className={['relative inline-flex h-2 w-2 rounded-full', cfg.ping].join(' ')} />
                  </span>
                )}
                <span className={['text-sm font-semibold', cfg.ring].join(' ')}>{cfg.label}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 tabular-nums">
                  Session {sessionNum}/{settings.sessionsBeforeLongBreak}
                </span>
                {/* Change task */}
                <button
                  onClick={() => setShowPicker(true)}
                  title="Changer de tâche"
                  className="rounded-md p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Ring + countdown ───────────────────────────────────────────── */}
            <div className="flex flex-col items-center pt-5 pb-3">
              <div className="relative flex items-center justify-center">
                <Ring remaining={liveRemaining} total={phaseDuration} phase={phase} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl font-semibold tabular-nums text-zinc-100 leading-none">
                    {fmtCountdown(liveRemaining)}
                  </span>
                </div>
              </div>

              {/* Task info */}
              {task ? (
                <div className="mt-2 text-center px-4">
                  <p className="text-sm font-medium text-zinc-200 leading-tight line-clamp-1">{task.title}</p>
                  {domain && colors && (
                    <p className={['text-xs mt-0.5', colors.text].join(' ')}>{domain.icon} {domain.name}</p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-600">Aucune tâche</p>
              )}
            </div>

            {/* ── Live stats ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-3 px-4 pb-3 text-[10px] text-zinc-600">
              <span>Sessions : <span className="text-zinc-400 tabular-nums">{todayCount}</span></span>
              <span className="text-zinc-700">·</span>
              <span>Focus : <span className="text-zinc-400 tabular-nums">{Math.floor(todayMinutes / 60)}h{String(todayMinutes % 60).padStart(2, '0')}m</span></span>
              {phase === 'focus' && settings.sessionsBeforeLongBreak - sessionNum > 0 && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span>Longue : <span className="text-zinc-400 tabular-nums">dans {settings.sessionsBeforeLongBreak - sessionNum}</span></span>
                </>
              )}
            </div>

            {/* ── Controls ───────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 border-t border-zinc-800/60 px-3 py-3">
              {/* Skip */}
              <button
                onClick={handleSkip}
                title="Passer à l'étape suivante"
                className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors whitespace-nowrap"
              >
                Passer ⏭
              </button>

              {/* Start / Pause / Resume */}
              <button
                onClick={isRunning ? pauseTimer : startTimer}
                className={[
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
                  isRunning
                    ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                    : 'border border-teal-500/30 bg-teal-500/15 text-teal-300 hover:bg-teal-500/25',
                ].join(' ')}
              >
                {isRunning ? (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    {status === 'ready' ? 'Démarrer' : 'Reprendre'}
                  </>
                )}
              </button>

              {/* Terminate */}
              <button
                onClick={handleTerminate}
                title="Terminer et enregistrer"
                className="rounded-lg border border-teal-500/20 bg-teal-500/10 p-2 text-teal-400 hover:bg-teal-500/20 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            {/* Abandon */}
            <div className="flex justify-center pb-2.5">
              <button
                onClick={() => abandon(settings.focusDuration * 60)}
                className="text-[10px] text-zinc-700 hover:text-red-400 transition-colors"
              >
                Abandonner
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
