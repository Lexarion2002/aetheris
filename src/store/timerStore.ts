import { create } from 'zustand'

// ─── Timer store (non persisté — état volatile) ───────────────────────────────
// Le timer tourne en mémoire ; les sessions sauvegardées vont dans le store principal.

export interface TimerState {
  taskId:    string | null
  running:   boolean
  elapsed:   number        // secondes accumulées (hors segment courant)
  startedAt: number | null // Date.now() au dernier start/resume

  setTask:    (taskId: string) => void
  start:      () => void
  pause:      () => void
  resume:     () => void
  stopAndReset: () => void
}

export const useTimerStore = create<TimerState>((set, get) => ({
  taskId:    null,
  running:   false,
  elapsed:   0,
  startedAt: null,

  setTask: (taskId) => set({ taskId }),

  start: () => set({ running: true, startedAt: Date.now() }),

  pause: () => {
    const { elapsed, startedAt } = get()
    const added = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0
    set({ running: false, elapsed: elapsed + added, startedAt: null })
  },

  resume: () => set({ running: true, startedAt: Date.now() }),

  stopAndReset: () => set({ taskId: null, running: false, elapsed: 0, startedAt: null }),
}))

// ─── Sélecteur : secondes totales courantes ───────────────────────────────────

export const selectTotalSeconds = (s: TimerState): number =>
  s.elapsed + (s.running && s.startedAt ? Math.floor((Date.now() - s.startedAt) / 1000) : 0)
