import { nanoid } from '../utils/nanoid'
import { DEFAULT_FINANCE_CATEGORIES } from './defaults'
import { createPersistedStore } from '../lib/persistenceManager'
import type { Domain, Task, SubTask, Objective, Expense, TimeSession, DomainBudget, TaskStatus, Priority, ExpenseCategory, ProgressEntry, Transaction, FinanceCategoryBudget, SavingsGoal, FinanceCategory, PomodoroSettings } from '../types'

// ─── State shape ──────────────────────────────────────────────────────────────

export type AppTheme    = 'dark' | 'light'
export type AppLanguage = 'fr' | 'en'

export interface AetherisData {
  domains:            Domain[]
  tasks:              Task[]
  subtasks?:          SubTask[]
  objectives:         Objective[]
  expenses:           Expense[]
  timeSessions:       TimeSession[]
  budgets:            DomainBudget[]
  transactions:       Transaction[]
  categoryBudgets:    FinanceCategoryBudget[]
  savingsGoals:       SavingsGoal[]
  financeCategories?: FinanceCategory[]
  pomodoroSettings?:  PomodoroSettings
}

interface AetherisState {
  seeded:     boolean
  onboarded:  boolean
  theme:      AppTheme
  language:   AppLanguage
  domains:      Domain[]
  tasks:        Task[]
  subtasks:     SubTask[]
  objectives:   Objective[]
  expenses:     Expense[]
  timeSessions: TimeSession[]
  budgets:      DomainBudget[]

  seedDemoData:        () => void
  completeOnboarding:  () => void
  setTheme:            (theme: AppTheme) => void
  setLanguage:  (lang: AppLanguage) => void
  importData:   (data: AetherisData) => void
  resetAll:     () => void

  // Domain actions
  addDomain: (domain: Omit<Domain, 'id'>) => void
  updateDomain: (id: string, updates: Partial<Omit<Domain, 'id'>>) => void
  deleteDomain: (id: string) => void

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) => void
  deleteTask: (id: string) => void
  setTaskStatus: (id: string, status: TaskStatus) => void
  setTaskPriority: (id: string, priority: Priority) => void

  // SubTask actions
  addSubTask:    (parentTaskId: string, title: string) => SubTask
  deleteSubTask: (id: string) => void
  toggleSubTask: (id: string) => void
  updateSubTask: (id: string, title: string) => void

  // Objective actions
  addObjective: (objective: Omit<Objective, 'id' | 'createdAt' | 'updatedAt'>) => Objective
  updateObjective: (id: string, updates: Partial<Omit<Objective, 'id' | 'createdAt' | 'updatedAt'>>) => void
  deleteObjective: (id: string) => void
  setObjectiveProgress: (id: string, progress: number) => void
  archiveObjective: (id: string, archived: boolean) => void

  // Expense actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) => void
  deleteExpense: (id: string) => void

  // TimeSession actions
  addTimeSession: (session: Omit<TimeSession, 'id' | 'createdAt'>) => TimeSession
  deleteTimeSession: (id: string) => void

  // Budget actions
  setBudget: (domainId: string, amount: number) => void
  deleteBudget: (domainId: string) => void

  // Transaction actions
  transactions:      Transaction[]
  categoryBudgets:   FinanceCategoryBudget[]
  savingsGoals:      SavingsGoal[]
  financeCategories: FinanceCategory[]
  addTransaction:        (t: Omit<Transaction, 'id' | 'createdAt'>) => Transaction
  updateTransaction:     (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => void
  deleteTransaction:     (id: string) => void
  setCategoryBudget:     (category: string, amount: number) => void
  deleteCategoryBudget:  (category: string) => void
  addSavingsGoal:        (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => SavingsGoal
  updateSavingsGoal:     (id: string, updates: Partial<Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>>) => void
  deleteSavingsGoal:     (id: string) => void
  contributeSavingsGoal: (id: string, amount: number) => void
  // FinanceCategory actions
  addFinanceCategory:                (cat: Omit<FinanceCategory, 'id'>) => void
  updateFinanceCategory:             (id: string, updates: Partial<Omit<FinanceCategory, 'id'>>) => void
  deleteFinanceCategory:             (id: string) => void
  reassignAndDeleteFinanceCategory:  (id: string, replacementId: string) => void

  // Pomodoro settings
  pomodoroSettings:     PomodoroSettings
  setPomodoroSettings:  (updates: Partial<PomodoroSettings>) => void

  // Dashboard context
  userContext:     string
  setUserContext:  (ctx: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now   = () => new Date().toISOString()
const today = () => new Date().toISOString().split('T')[0]

/** Upsert a ProgressEntry for today */
const trackProgress = (history: ProgressEntry[] | undefined, value: number): ProgressEntry[] => {
  const clamped = Math.min(100, Math.max(0, value))
  const t = today()
  const prev = history ?? []
  return prev.some((e) => e.date === t)
    ? prev.map((e) => (e.date === t ? { date: t, value: clamped } : e))
    : [...prev, { date: t, value: clamped }]
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = createPersistedStore<AetherisState>(
  'aetheris-app',
  (set) => ({
      seeded:    true,
      onboarded: false,
      theme:     'dark'  as AppTheme,
      language: 'fr'   as AppLanguage,
      domains:      [],
      tasks:        [],
      subtasks:     [],
      objectives:   [],
      expenses:     [],
      timeSessions:    [],
      budgets:         [],
      transactions:       [],
      categoryBudgets:    [],
      savingsGoals:       [],
      financeCategories:  DEFAULT_FINANCE_CATEGORIES,
      pomodoroSettings: {
        focusDuration:           25,
        shortBreakDuration:      5,
        longBreakDuration:       15,
        sessionsBeforeLongBreak: 4,
        soundEnabled:            true,
      },
      userContext: '',

      // ── Seed / Onboarding ────────────────────────────────────────────────────

      seedDemoData:       () => {},
      completeOnboarding: () => set({ onboarded: true }),

      // ── Preferences ─────────────────────────────────────────────────────────

      setTheme:    (theme)    => set({ theme }),
      setLanguage: (language) => set({ language }),

      importData: (data) =>
        set({
          seeded:             true,
          domains:            data.domains            ?? [],
          tasks:              data.tasks              ?? [],
          subtasks:           data.subtasks           ?? [],
          objectives:         data.objectives         ?? [],
          expenses:           data.expenses           ?? [],
          timeSessions:       data.timeSessions       ?? [],
          budgets:            data.budgets            ?? [],
          transactions:       data.transactions       ?? [],
          categoryBudgets:    data.categoryBudgets    ?? [],
          savingsGoals:       data.savingsGoals       ?? [],
          financeCategories:  data.financeCategories  ?? DEFAULT_FINANCE_CATEGORIES,
          pomodoroSettings:   data.pomodoroSettings   ?? {
            focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15,
            sessionsBeforeLongBreak: 4, soundEnabled: true,
          },
        }),

      resetAll: () =>
        set({
          seeded:             true,
          onboarded:          false,
          domains:            [],
          tasks:              [],
          subtasks:           [],
          objectives:         [],
          expenses:           [],
          timeSessions:       [],
          budgets:            [],
          transactions:       [],
          categoryBudgets:    [],
          savingsGoals:       [],
          financeCategories:  DEFAULT_FINANCE_CATEGORIES,
          pomodoroSettings: {
            focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15,
            sessionsBeforeLongBreak: 4, soundEnabled: true,
          },
        }),

      // ── Domain ──────────────────────────────────────────────────────────────

      addDomain: (domain) =>
        set((s) => {
          const exists = s.domains.some(
            (d) => d.name.trim().toLowerCase() === domain.name.trim().toLowerCase()
          )
          if (exists) return s
          return { domains: [...s.domains, { id: nanoid(), ...domain }] }
        }),

      updateDomain: (id, updates) =>
        set((s) => ({
          domains: s.domains.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      deleteDomain: (id) =>
        set((s) => ({
          domains:    s.domains.filter((d) => d.id !== id),
          tasks:      s.tasks.filter((t) => t.domainId !== id),
          objectives: s.objectives.filter((o) => o.domainId !== id),
          expenses:   s.expenses.filter((e) => e.domainId !== id),
        })),

      // ── Task ────────────────────────────────────────────────────────────────

      addTask: (task) => {
        const newTask: Task = { id: nanoid(), createdAt: now(), updatedAt: now(), ...task }
        set((s) => ({ tasks: [...s.tasks, newTask] }))
        return newTask
      },

      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: now() } : t,
          ),
        })),

      deleteTask: (id) =>
        set((s) => ({
          tasks:        s.tasks.filter((t) => t.id !== id),
          timeSessions: s.timeSessions.filter((ts) => ts.taskId !== id),
          subtasks:     s.subtasks.filter((sub) => sub.parentTaskId !== id),
        })),

      setTaskStatus: (id, status) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, status, updatedAt: now() } : t,
          ),
        })),

      setTaskPriority: (id, priority) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, priority, updatedAt: now() } : t,
          ),
        })),

      // ── SubTask ─────────────────────────────────────────────────────────────

      addSubTask: (parentTaskId, title) => {
        const sub: SubTask = { id: nanoid(), parentTaskId, title, completed: false, createdAt: now() }
        set((s) => ({ subtasks: [...s.subtasks, sub] }))
        return sub
      },

      deleteSubTask: (id) =>
        set((s) => ({ subtasks: s.subtasks.filter((sub) => sub.id !== id) })),

      toggleSubTask: (id) =>
        set((s) => ({
          subtasks: s.subtasks.map((sub) =>
            sub.id === id ? { ...sub, completed: !sub.completed } : sub,
          ),
        })),

      updateSubTask: (id, title) =>
        set((s) => ({
          subtasks: s.subtasks.map((sub) =>
            sub.id === id ? { ...sub, title } : sub,
          ),
        })),

      // ── Objective ───────────────────────────────────────────────────────────

      addObjective: (objective) => {
        const newObj: Objective = { id: nanoid(), createdAt: now(), updatedAt: now(), ...objective }
        // Track initial progress in history
        if (newObj.progress > 0) {
          newObj.progressHistory = trackProgress(newObj.progressHistory, newObj.progress)
        }
        set((s) => ({ objectives: [...s.objectives, newObj] }))
        return newObj
      },

      updateObjective: (id, updates) =>
        set((s) => ({
          objectives: s.objectives.map((o) => {
            if (o.id !== id) return o
            const result = { ...o, ...updates, updatedAt: now() }
            // Track progress change in history
            if (updates.progress !== undefined && updates.progress !== o.progress) {
              result.progressHistory = trackProgress(o.progressHistory, updates.progress)
            }
            return result
          }),
        })),

      deleteObjective: (id) =>
        set((s) => ({
          objectives: s.objectives.filter((o) => o.id !== id),
          // Unlink tasks that referenced this objective
          tasks: s.tasks.map((t) =>
            t.objectiveId === id ? { ...t, objectiveId: undefined, updatedAt: now() } : t,
          ),
        })),

      setObjectiveProgress: (id, progress) =>
        set((s) => ({
          objectives: s.objectives.map((o) => {
            if (o.id !== id) return o
            const clamped = Math.min(100, Math.max(0, progress))
            return {
              ...o,
              progress:        clamped,
              progressHistory: trackProgress(o.progressHistory, clamped),
              updatedAt:       now(),
            }
          }),
        })),

      archiveObjective: (id, archived) =>
        set((s) => ({
          objectives: s.objectives.map((o) =>
            o.id === id ? { ...o, archived, updatedAt: now() } : o,
          ),
        })),

      // ── Expense ─────────────────────────────────────────────────────────────

      addExpense: (expense) => {
        const newExpense: Expense = { id: nanoid(), createdAt: now(), ...expense }
        set((s) => ({ expenses: [...s.expenses, newExpense] }))
        return newExpense
      },

      updateExpense: (id, updates) =>
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      // ── TimeSession ─────────────────────────────────────────────────────────

      addTimeSession: (session) => {
        const newSession: TimeSession = { id: nanoid(), createdAt: now(), ...session }
        set((s) => ({ timeSessions: [...s.timeSessions, newSession] }))
        return newSession
      },

      deleteTimeSession: (id) =>
        set((s) => ({ timeSessions: s.timeSessions.filter((ts) => ts.id !== id) })),

      // ── Budget ──────────────────────────────────────────────────────────────

      setBudget: (domainId, amount) =>
        set((s) => {
          const exists = s.budgets.some((b) => b.domainId === domainId)
          return {
            budgets: exists
              ? s.budgets.map((b) => (b.domainId === domainId ? { domainId, amount } : b))
              : [...s.budgets, { domainId, amount }],
          }
        }),

      deleteBudget: (domainId) =>
        set((s) => ({ budgets: s.budgets.filter((b) => b.domainId !== domainId) })),

      // ── Transaction ─────────────────────────────────────────────────────────

      addTransaction: (t) => {
        const newT: Transaction = { id: nanoid(), createdAt: now(), ...t }
        set((s) => ({ transactions: [...s.transactions, newT] }))
        return newT
      },

      updateTransaction: (id, updates) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      // ── CategoryBudget ──────────────────────────────────────────────────────

      setCategoryBudget: (category, amount) =>
        set((s) => {
          const exists = s.categoryBudgets.some((b) => b.category === category)
          return {
            categoryBudgets: exists
              ? s.categoryBudgets.map((b) => (b.category === category ? { category, amount } : b))
              : [...s.categoryBudgets, { category, amount }],
          }
        }),

      deleteCategoryBudget: (category) =>
        set((s) => ({ categoryBudgets: s.categoryBudgets.filter((b) => b.category !== category) })),

      // ── SavingsGoal ─────────────────────────────────────────────────────────

      addSavingsGoal: (goal) => {
        const newGoal: SavingsGoal = { id: nanoid(), createdAt: now(), updatedAt: now(), ...goal }
        set((s) => ({ savingsGoals: [...s.savingsGoals, newGoal] }))
        return newGoal
      },

      updateSavingsGoal: (id, updates) =>
        set((s) => ({
          savingsGoals: s.savingsGoals.map((g) =>
            g.id === id ? { ...g, ...updates, updatedAt: now() } : g,
          ),
        })),

      deleteSavingsGoal: (id) =>
        set((s) => ({ savingsGoals: s.savingsGoals.filter((g) => g.id !== id) })),

      contributeSavingsGoal: (id, amount) =>
        set((s) => ({
          savingsGoals: s.savingsGoals.map((g) =>
            g.id === id ? { ...g, currentAmount: g.currentAmount + amount, updatedAt: now() } : g,
          ),
        })),

      // ── FinanceCategory ─────────────────────────────────────────────────────

      addFinanceCategory: (cat) =>
        set((s) => ({
          financeCategories: [...s.financeCategories, { id: nanoid(), ...cat }],
        })),

      updateFinanceCategory: (id, updates) =>
        set((s) => ({
          financeCategories: s.financeCategories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteFinanceCategory: (id) =>
        set((s) => ({
          financeCategories: s.financeCategories.filter((c) => c.id !== id),
        })),

      reassignAndDeleteFinanceCategory: (id, replacementId) =>
        set((s) => ({
          transactions:      s.transactions.map((t) =>
            t.category === id ? { ...t, category: replacementId } : t,
          ),
          financeCategories: s.financeCategories.filter((c) => c.id !== id),
        })),

      // ── PomodoroSettings ────────────────────────────────────────────────────

      setPomodoroSettings: (updates) =>
        set((s) => ({ pomodoroSettings: { ...s.pomodoroSettings, ...updates } })),

      // ── Dashboard context ────────────────────────────────────────────────────

      setUserContext: (ctx) => set({ userContext: ctx }),
  }),
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectDomainById = (id: string) => (s: AetherisState) =>
  s.domains.find((d) => d.id === id)

export const selectTasksByDomain = (domainId: string) => (s: AetherisState) =>
  s.tasks.filter((t) => t.domainId === domainId)

export const selectTasksByStatus = (status: TaskStatus) => (s: AetherisState) =>
  s.tasks.filter((t) => t.status === status)

export const selectObjectivesByDomain = (domainId: string) => (s: AetherisState) =>
  s.objectives.filter((o) => o.domainId === domainId)

export const selectExpensesByDomain = (domainId: string) => (s: AetherisState) =>
  s.expenses.filter((e) => e.domainId === domainId)

export const selectExpensesByCategory = (category: ExpenseCategory) => (s: AetherisState) =>
  s.expenses.filter((e) => e.category === category)

export const selectTimeSessionsByTask = (taskId: string) => (s: AetherisState) =>
  s.timeSessions.filter((ts) => ts.taskId === taskId)

export const selectTotalTimeForTask = (taskId: string) => (s: AetherisState) =>
  s.timeSessions
    .filter((ts) => ts.taskId === taskId)
    .reduce((acc, ts) => acc + ts.duration, 0)
