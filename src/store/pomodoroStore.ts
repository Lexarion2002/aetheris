import { create } from 'zustand'

// ─── Pomodoro store (volatile — not persisted) ────────────────────────────────
// Holds the live timer state. Completed sessions are saved to the main store.

export type PomodoroPhase  = 'focus' | 'short_break' | 'long_break'
export type PomodoroStatus = 'idle' | 'ready' | 'running' | 'paused'

export interface PomodoroState {
  taskId:           string | null
  phase:            PomodoroPhase
  sessionNum:       number          // 1-indexed position in cycle (1..sessionsBeforeLongBreak)
  totalFocusDone:   number          // focus sessions completed in this run
  status:           PomodoroStatus
  remainingSeconds: number          // seconds left as of last pause/start
  startedAt:        number | null   // Date.now() when the current run started
  phaseDuration:    number          // total seconds for the current phase

  init:       (taskId: string, focusSec: number) => void
  startTimer: () => void
  pauseTimer: () => void
  advance:    (
    nextPhase:      PomodoroPhase,
    durationSec:    number,
    autoStart:      boolean,
    newSessionNum:  number,
    newTotalFocus:  number,
  ) => void
  abandon:    (defaultFocusSec: number) => void
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  taskId:           null,
  phase:            'focus',
  sessionNum:       1,
  totalFocusDone:   0,
  status:           'idle',
  remainingSeconds: 25 * 60,
  startedAt:        null,
  phaseDuration:    25 * 60,

  init: (taskId, focusSec) =>
    set({
      taskId,
      phase:            'focus',
      sessionNum:       1,
      totalFocusDone:   0,
      status:           'ready',
      remainingSeconds: focusSec,
      startedAt:        null,
      phaseDuration:    focusSec,
    }),

  startTimer: () => set({ status: 'running', startedAt: Date.now() }),

  pauseTimer: () => {
    const { remainingSeconds, startedAt } = get()
    const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0
    set({ status: 'paused', remainingSeconds: Math.max(0, remainingSeconds - elapsed), startedAt: null })
  },

  advance: (nextPhase, durationSec, autoStart, newSessionNum, newTotalFocus) =>
    set({
      phase:            nextPhase,
      sessionNum:       newSessionNum,
      totalFocusDone:   newTotalFocus,
      status:           autoStart ? 'running' : 'ready',
      remainingSeconds: durationSec,
      startedAt:        autoStart ? Date.now() : null,
      phaseDuration:    durationSec,
    }),

  abandon: (defaultFocusSec) =>
    set({
      taskId:           null,
      phase:            'focus',
      sessionNum:       1,
      totalFocusDone:   0,
      status:           'idle',
      remainingSeconds: defaultFocusSec,
      startedAt:        null,
      phaseDuration:    defaultFocusSec,
    }),
}))

// ─── Selector: live remaining seconds ─────────────────────────────────────────

export const selectLiveRemaining = (s: PomodoroState): number =>
  s.status === 'running' && s.startedAt
    ? Math.max(0, s.remainingSeconds - Math.floor((Date.now() - s.startedAt) / 1000))
    : s.remainingSeconds
