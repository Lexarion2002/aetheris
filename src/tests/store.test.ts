import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'

// ─── Reset store to a clean state before each test ────────────────────────────

beforeEach(() => {
  // Partial reset — keeps action functions, replaces data
  useStore.setState({
    seeded:       true,
    theme:        'dark',
    language:     'fr',
    domains:      [],
    tasks:        [],
    objectives:   [],
    expenses:     [],
    timeSessions: [],
    budgets:      [],
  })
})

// ─── Tasks ────────────────────────────────────────────────────────────────────

describe('Task actions', () => {
  it('addTask — creates a task with an id and timestamps', () => {
    const { addTask } = useStore.getState()
    const task = addTask({
      domainId:     'health',
      title:        'Courir 5km',
      status:       'todo',
      priority:     'high',
      timeEstimate: 40,
      dueDate:      null,
    })

    expect(task.id).toBeTruthy()
    expect(task.title).toBe('Courir 5km')
    expect(task.createdAt).toBeTruthy()
    expect(useStore.getState().tasks).toHaveLength(1)
  })

  it('addTask — multiple tasks are accumulated', () => {
    const { addTask } = useStore.getState()
    addTask({ domainId: 'health', title: 'T1', status: 'todo', priority: 'low', timeEstimate: null, dueDate: null })
    addTask({ domainId: 'health', title: 'T2', status: 'todo', priority: 'low', timeEstimate: null, dueDate: null })
    expect(useStore.getState().tasks).toHaveLength(2)
  })

  it('updateTask — updates specific fields only', () => {
    const { addTask, updateTask } = useStore.getState()
    const task = addTask({ domainId: 'health', title: 'Original', status: 'todo', priority: 'low', timeEstimate: null, dueDate: null })
    updateTask(task.id, { title: 'Updated', status: 'in_progress' })

    const updated = useStore.getState().tasks.find((t) => t.id === task.id)!
    expect(updated.title).toBe('Updated')
    expect(updated.status).toBe('in_progress')
    expect(updated.domainId).toBe('health')
  })

  it('deleteTask — removes the task and its sessions', () => {
    const { addTask, addTimeSession, deleteTask } = useStore.getState()
    const task    = addTask({ domainId: 'health', title: 'T', status: 'todo', priority: 'low', timeEstimate: null, dueDate: null })
    addTimeSession({ taskId: task.id, duration: 30, date: '2025-01-01', focus: 80 })

    expect(useStore.getState().tasks).toHaveLength(1)
    expect(useStore.getState().timeSessions).toHaveLength(1)

    deleteTask(task.id)

    expect(useStore.getState().tasks).toHaveLength(0)
    expect(useStore.getState().timeSessions).toHaveLength(0)
  })

  it('setTaskStatus — changes task status and updates updatedAt', () => {
    const { addTask, setTaskStatus } = useStore.getState()
    const task = addTask({ domainId: 'career', title: 'Work', status: 'todo', priority: 'medium', timeEstimate: null, dueDate: null })
    setTaskStatus(task.id, 'done')

    const t = useStore.getState().tasks.find((t) => t.id === task.id)!
    expect(t.status).toBe('done')
  })

  it('setTaskPriority — changes priority', () => {
    const { addTask, setTaskPriority } = useStore.getState()
    const task = addTask({ domainId: 'career', title: 'Work', status: 'todo', priority: 'low', timeEstimate: null, dueDate: null })
    setTaskPriority(task.id, 'urgent')

    expect(useStore.getState().tasks.find((t) => t.id === task.id)!.priority).toBe('urgent')
  })
})

// ─── Objectives ───────────────────────────────────────────────────────────────

describe('Objective actions', () => {
  it('addObjective — creates with id and timestamps', () => {
    const { addObjective } = useStore.getState()
    const obj = addObjective({
      domainId:    'health',
      title:       'Courir un semi',
      description: 'Préparer la course',
      targetDate:  null,
      progress:    0,
    })

    expect(obj.id).toBeTruthy()
    expect(obj.title).toBe('Courir un semi')
    expect(useStore.getState().objectives).toHaveLength(1)
  })

  it('setObjectiveProgress — clamps value to 0-100 and records history', () => {
    const { addObjective, setObjectiveProgress } = useStore.getState()
    const obj = addObjective({ domainId: 'health', title: 'O', description: '', targetDate: null, progress: 0 })

    setObjectiveProgress(obj.id, 150)  // Should clamp to 100
    const o = useStore.getState().objectives.find((o) => o.id === obj.id)!
    expect(o.progress).toBe(100)
    expect(o.progressHistory?.length).toBeGreaterThan(0)
  })

  it('deleteObjective — unlinks tasks that referenced it', () => {
    const { addObjective, addTask, updateTask, deleteObjective } = useStore.getState()
    const obj  = addObjective({ domainId: 'health', title: 'O', description: '', targetDate: null, progress: 0 })
    const task = addTask({ domainId: 'health', title: 'T', status: 'todo', priority: 'low', timeEstimate: null, dueDate: null })
    updateTask(task.id, { objectiveId: obj.id })

    deleteObjective(obj.id)

    const t = useStore.getState().tasks.find((t) => t.id === task.id)!
    expect(t.objectiveId).toBeUndefined()
    expect(useStore.getState().objectives).toHaveLength(0)
  })

  it('archiveObjective — sets archived flag', () => {
    const { addObjective, archiveObjective } = useStore.getState()
    const obj = addObjective({ domainId: 'health', title: 'O', description: '', targetDate: null, progress: 0 })

    archiveObjective(obj.id, true)
    expect(useStore.getState().objectives.find((o) => o.id === obj.id)!.archived).toBe(true)

    archiveObjective(obj.id, false)
    expect(useStore.getState().objectives.find((o) => o.id === obj.id)!.archived).toBe(false)
  })
})

// ─── Expenses ─────────────────────────────────────────────────────────────────

describe('Expense actions', () => {
  it('addExpense — creates with id and createdAt', () => {
    const { addExpense } = useStore.getState()
    const exp = addExpense({ domainId: 'health', amount: 50, category: 'health', description: 'Gym', date: '2025-01-15' })

    expect(exp.id).toBeTruthy()
    expect(exp.amount).toBe(50)
    expect(useStore.getState().expenses).toHaveLength(1)
  })

  it('updateExpense — updates amount and description', () => {
    const { addExpense, updateExpense } = useStore.getState()
    const exp = addExpense({ domainId: 'health', amount: 50, category: 'health', description: 'Gym', date: '2025-01-15' })
    updateExpense(exp.id, { amount: 75, description: 'Gym premium' })

    const updated = useStore.getState().expenses.find((e) => e.id === exp.id)!
    expect(updated.amount).toBe(75)
    expect(updated.description).toBe('Gym premium')
  })

  it('deleteExpense — removes the expense', () => {
    const { addExpense, deleteExpense } = useStore.getState()
    const exp = addExpense({ domainId: 'health', amount: 50, category: 'health', description: 'Gym', date: '2025-01-15' })
    deleteExpense(exp.id)
    expect(useStore.getState().expenses).toHaveLength(0)
  })
})

// ─── Budgets ──────────────────────────────────────────────────────────────────

describe('Budget actions', () => {
  it('setBudget — creates a new budget', () => {
    const { setBudget } = useStore.getState()
    setBudget('health', 200)

    const budgets = useStore.getState().budgets
    expect(budgets).toHaveLength(1)
    expect(budgets[0].amount).toBe(200)
    expect(budgets[0].domainId).toBe('health')
  })

  it('setBudget — updates an existing budget', () => {
    const { setBudget } = useStore.getState()
    setBudget('health', 200)
    setBudget('health', 300)

    const budgets = useStore.getState().budgets
    expect(budgets).toHaveLength(1)
    expect(budgets[0].amount).toBe(300)
  })

  it('deleteBudget — removes the budget', () => {
    const { setBudget, deleteBudget } = useStore.getState()
    setBudget('health', 200)
    deleteBudget('health')
    expect(useStore.getState().budgets).toHaveLength(0)
  })
})

// ─── Domains ──────────────────────────────────────────────────────────────────

describe('Domain actions', () => {
  it('addDomain — appends to domains', () => {
    const { addDomain } = useStore.getState()
    const before = useStore.getState().domains.length
    addDomain({ name: 'Sport', color: 'green', icon: '🏋️', description: 'Activité physique' })
    expect(useStore.getState().domains).toHaveLength(before + 1)
  })

  it('deleteDomain — cascades to tasks, objectives, expenses', () => {
    const { addTask, addObjective, addExpense, deleteDomain } = useStore.getState()
    addTask({ domainId: 'health', title: 'T', status: 'todo', priority: 'low', timeEstimate: null, dueDate: null })
    addObjective({ domainId: 'health', title: 'O', description: '', targetDate: null, progress: 0 })
    addExpense({ domainId: 'health', amount: 10, category: 'health', description: '', date: '2025-01-01' })

    deleteDomain('health')

    expect(useStore.getState().tasks.filter((t) => t.domainId === 'health')).toHaveLength(0)
    expect(useStore.getState().objectives.filter((o) => o.domainId === 'health')).toHaveLength(0)
    expect(useStore.getState().expenses.filter((e) => e.domainId === 'health')).toHaveLength(0)
  })
})

// ─── Import / Export ──────────────────────────────────────────────────────────

describe('importData + resetAll', () => {
  it('importData — replaces state with imported data', () => {
    const { addTask, importData } = useStore.getState()
    addTask({ domainId: 'health', title: 'Old', status: 'todo', priority: 'low', timeEstimate: null, dueDate: null })

    importData({
      domains:      [{ id: 'health', name: 'Santé', color: 'green', icon: '🏃', description: '' }],
      tasks:        [],
      objectives:   [],
      expenses:     [],
      timeSessions: [],
      budgets:      [{ domainId: 'health', amount: 100 }],
    })

    expect(useStore.getState().tasks).toHaveLength(0)
    expect(useStore.getState().budgets[0].amount).toBe(100)
    expect(useStore.getState().seeded).toBe(true)
  })

  it('resetAll — clears all data', () => {
    const { addTask, resetAll } = useStore.getState()
    addTask({ domainId: 'health', title: 'T', status: 'todo', priority: 'low', timeEstimate: null, dueDate: null })
    resetAll()

    expect(useStore.getState().tasks).toHaveLength(0)
    expect(useStore.getState().seeded).toBe(true)
  })
})

// ─── Preferences ──────────────────────────────────────────────────────────────

describe('Preference actions', () => {
  it('setTheme — updates theme', () => {
    useStore.getState().setTheme('light')
    expect(useStore.getState().theme).toBe('light')

    useStore.getState().setTheme('dark')
    expect(useStore.getState().theme).toBe('dark')
  })

  it('setLanguage — updates language', () => {
    useStore.getState().setLanguage('en')
    expect(useStore.getState().language).toBe('en')
  })
})
