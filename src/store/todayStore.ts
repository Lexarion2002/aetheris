import { createPersistedStore } from '../lib/persistenceManager'

export interface TodayTask {
  id: string
  sourceId: string
  sourceDomain: string
  label: string
  sublabel?: string
  done: boolean
  addedAt: string
}

interface TodayStore {
  tasks: TodayTask[]
  date: string
  addTask: (t: Omit<TodayTask, 'id' | 'addedAt' | 'done'>) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
  clearIfNewDay: () => void
}

export const useTodayStore = createPersistedStore<TodayStore>(
  'aetheris-today-v1',
  (set) => ({
    tasks: [],
    date: new Date().toISOString().split('T')[0],

    addTask: (t) =>
      set((s) => ({
        tasks: [
          ...s.tasks,
          { ...t, id: crypto.randomUUID(), addedAt: new Date().toISOString(), done: false },
        ],
      })),

    toggleTask: (id) =>
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      })),

    removeTask: (id) =>
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

    clearIfNewDay: () =>
      set((s) => {
        const today = new Date().toISOString().split('T')[0]
        if (s.date !== today) {
          return { tasks: [], date: today }
        }
        return {}
      }),
  }),
)
