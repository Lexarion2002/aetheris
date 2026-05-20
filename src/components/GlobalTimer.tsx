import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react'
import { useStore } from '../store'
import { usePomodoroStore, selectLiveRemaining } from '../store/pomodoroStore'
import { getDomainIcon } from '../utils/domainColors'
import { getDomainColor } from '../utils/analyticsUtils'
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

// ─── Tokens locaux ───────────────────────────────────────────────────────────

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink-3)',
}

// ─── Phase config ─────────────────────────────────────────────────────────────

interface PhaseConfig {
  label:    string
  color:    string   // var(--…) for stroke / accents
  bgSoft:   string   // header tint
}

const PHASE_CFG: Record<PomodoroPhase, PhaseConfig> = {
  focus:       { label: 'Focus',        color: 'var(--terra)',     bgSoft: 'var(--terra-soft)' },
  short_break: { label: 'Pause courte', color: 'var(--sage)',      bgSoft: 'var(--sage-soft)'  },
  long_break:  { label: 'Pause longue', color: 'var(--sage-deep)', bgSoft: 'var(--sage-soft)'  },
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
      <circle cx={CX} cy={CX} r={R} fill="none" stroke="var(--paper-2)" strokeWidth="6" />
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
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 360 }}>
      <div style={{
        borderBottom: '1px solid var(--paper-2)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une tâche…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)',
          }}
        />
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--ink-3)', fontSize: 18, lineHeight: 1, padding: 0,
          }}
        >×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {grouped.length === 0 ? (
          <p style={{
            padding: '24px 16px', textAlign: 'center',
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 13, color: 'var(--ink-3)', margin: 0,
          }}>
            Aucune tâche active
          </p>
        ) : (
          grouped.map(({ domain, tasks: domTasks }) => {
            const color = getDomainColor(domain.color)
            const DomainIcon = getDomainIcon(domain.name)
            return (
              <div key={domain.id}>
                <p style={{
                  ...labelStyle, color,
                  padding: '8px 14px 4px',
                  display: 'flex', alignItems: 'center', gap: 6, margin: 0,
                }}>
                  {DomainIcon ? <DomainIcon size={11} /> : <span style={{ fontSize: 11 }}>{domain.icon}</span>}
                  {domain.name}
                </p>
                {domTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    style={{
                      width: '100%', padding: '8px 16px', textAlign: 'left',
                      fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      transition: 'background var(--dur) var(--ease)',
                    }}
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
        s.phase === 'focus' ? `${cfg.label} terminé !` : `${cfg.label} terminée !`,
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
  const domainColor   = domain ? getDomainColor(domain.color) : 'var(--ink-3)'
  const DomainIcon    = domain ? getDomainIcon(domain.name) : null
  const isRunning     = status === 'running'

  const today          = todayStr()
  const todaySessions  = timeSessions.filter((s) => s.date === today)
  const todayCount     = todaySessions.length
  const todayMinutes   = todaySessions.reduce((a, s) => a + s.duration, 0)
  const { phaseDuration } = usePomodoroStore.getState()

  // ── Idle state ───────────────────────────────────────────────────────────────

  if (status === 'idle') {
    return (
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 40 }}>
        <button
          onClick={() => setShowPicker(true)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--terra-deep)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--terra)' }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 999, border: 'none',
            background: 'var(--terra)', color: '#FBF6EA',
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
            boxShadow: 'var(--shadow-2)', cursor: 'pointer',
            transition: 'background var(--dur) var(--ease), transform var(--dur) var(--ease)',
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          Focus
        </button>

        {showPicker && (
          <div style={{
            position: 'absolute', bottom: '100%', marginBottom: 8, right: 0, width: 288,
            background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
            borderRadius: 16, boxShadow: 'var(--shadow-3)', overflow: 'hidden',
          }}>
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
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 40, width: 288 }}>
      <div style={{
        background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
        borderRadius: 16, boxShadow: 'var(--shadow-3)', overflow: 'hidden',
      }}>

        {/* Task picker overlay */}
        {showPicker ? (
          <TaskPicker
            onSelect={handleSelectTask}
            onClose={() => setShowPicker(false)}
          />
        ) : (
          <>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '1px solid var(--paper-2)',
              background: cfg.bgSoft,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isRunning && (
                  <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
                    <span style={{
                      position: 'absolute', inset: 0, borderRadius: 999,
                      background: cfg.color, opacity: 0.4,
                      animation: 'focus-ping 1.4s var(--ease) infinite',
                    }} />
                    <span style={{
                      position: 'relative', width: 8, height: 8, borderRadius: 999,
                      background: cfg.color,
                    }} />
                  </span>
                )}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: cfg.color, fontWeight: 600,
                }}>
                  {cfg.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {sessionNum}/{settings.sessionsBeforeLongBreak}
                </span>
                <button
                  onClick={() => setShowPicker(true)}
                  title="Changer de tâche"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)'; e.currentTarget.style.color = 'var(--ink)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)' }}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--ink-3)', padding: 4, borderRadius: 6, display: 'flex',
                    transition: 'color var(--dur) var(--ease), background var(--dur) var(--ease)',
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Ring + countdown ───────────────────────────────────────────── */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              paddingTop: 20, paddingBottom: 12,
            }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ring remaining={liveRemaining} total={phaseDuration} phase={phase} />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 30,
                    color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fmtCountdown(liveRemaining)}
                  </span>
                </div>
              </div>

              {/* Task info */}
              {task ? (
                <div style={{ marginTop: 10, textAlign: 'center', padding: '0 16px' }}>
                  <p style={{
                    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                    color: 'var(--ink)', lineHeight: 1.3, margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {task.title}
                  </p>
                  {domain && (
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: 11.5,
                      color: domainColor, marginTop: 2,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {DomainIcon ? <DomainIcon size={11} /> : <span>{domain.icon}</span>}
                      {domain.name}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{
                  marginTop: 10, fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                  fontSize: 12.5, color: 'var(--ink-3)',
                }}>
                  Aucune tâche
                </p>
              )}
            </div>

            {/* ── Live stats ─────────────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '0 16px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)',
              letterSpacing: '0.04em',
            }}>
              <span>
                Sessions <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{todayCount}</span>
              </span>
              <span style={{ color: 'var(--ink-4)' }}>·</span>
              <span>
                Focus <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.floor(todayMinutes / 60)}h{String(todayMinutes % 60).padStart(2, '0')}
                </span>
              </span>
              {phase === 'focus' && settings.sessionsBeforeLongBreak - sessionNum > 0 && (
                <>
                  <span style={{ color: 'var(--ink-4)' }}>·</span>
                  <span>
                    Longue dans <span style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                      {settings.sessionsBeforeLongBreak - sessionNum}
                    </span>
                  </span>
                </>
              )}
            </div>

            {/* ── Controls ───────────────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px',
              borderTop: '1px solid var(--paper-2)',
            }}>
              <button
                onClick={handleSkip}
                title="Passer à l'étape suivante"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                style={{
                  padding: '6px 10px', borderRadius: 8,
                  border: '1px solid var(--paper-2)',
                  background: 'transparent', color: 'var(--ink-2)',
                  fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
                }}
              >
                Passer
              </button>

              <button
                onClick={isRunning ? pauseTimer : startTimer}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isRunning ? 'var(--paper-3)' : 'var(--terra-deep)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isRunning ? 'var(--paper-2)' : 'var(--terra)'
                }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '8px 12px', borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
                  background: isRunning ? 'var(--paper-2)' : 'var(--terra)',
                  color: isRunning ? 'var(--ink)' : '#FBF6EA',
                  transition: 'background var(--dur) var(--ease)',
                }}
              >
                {isRunning ? (
                  <>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                    Pause
                  </>
                ) : (
                  <>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    {status === 'ready' ? 'Démarrer' : 'Reprendre'}
                  </>
                )}
              </button>

              <button
                onClick={handleTerminate}
                title="Terminer et enregistrer"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sage-soft)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 8, borderRadius: 8,
                  border: '1px solid var(--paper-2)',
                  background: 'transparent', color: 'var(--sage-deep)',
                  cursor: 'pointer',
                  transition: 'background var(--dur) var(--ease)',
                }}
              >
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            {/* Abandon */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 10 }}>
              <button
                onClick={() => abandon(settings.focusDuration * 60)}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-3)' }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 11,
                  color: 'var(--ink-3)',
                  transition: 'color var(--dur) var(--ease)',
                }}
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
