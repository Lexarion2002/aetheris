// ─── Domain ──────────────────────────────────────────────────────────────────

export type DomainColor =
  | 'red' | 'orange' | 'yellow' | 'green' | 'teal'
  | 'blue' | 'indigo' | 'purple' | 'pink' | 'gray'

export interface Domain {
  id: string
  name: string
  color: DomainColor
  icon: string
  description: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  domainId: string
  title: string
  status: TaskStatus
  priority: Priority
  timeEstimate: number | null  // minutes
  dueDate: string | null        // ISO date — échéance dure
  plannedDate?: string | null   // ISO date — jour où on prévoit de la faire
  notes?: string
  objectiveId?: string         // lien vers un objectif
  milestoneId?: string         // lien vers un jalon
  createdAt: string
  updatedAt: string
}

// ─── Milestone ────────────────────────────────────────────────────────────────

export interface Milestone {
  id:          string
  objectiveId: string
  title:       string
  targetDate:  string | null   // YYYY-MM-DD
  done:        boolean
  position:    number          // ordre d'affichage
  createdAt:   string
}

// ─── SubTask ──────────────────────────────────────────────────────────────────

export interface SubTask {
  id:           string
  parentTaskId: string
  title:        string
  completed:    boolean
  createdAt:    string
}

// ─── Objective ────────────────────────────────────────────────────────────────

export interface ProgressEntry {
  date:  string  // YYYY-MM-DD
  value: number  // 0–100
}

export type ObjectiveKind    = 'single' | 'counter'
export type ObjectiveCadence = 'daily' | 'weekly' | 'monthly' | 'free'

export interface Objective {
  id: string
  domainId: string
  title: string
  description: string
  targetDate: string | null    // ISO date string
  progress: number             // 0–100 (calculé auto pour counter)
  archived?: boolean
  progressHistory?: ProgressEntry[]
  createdAt: string
  updatedAt: string

  // Type d'objectif. Si absent → 'single' (legacy : un titre + une date cible).
  kind?: ObjectiveKind

  // Champs counter (uniquement si kind === 'counter')
  target?:  number              // ex: 52 (livres à lire)
  current?: number              // ex: 7 (déjà lus)
  cadence?: ObjectiveCadence    // rythme attendu pour rester dans les clous
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'housing' | 'food' | 'transport' | 'health' | 'education'
  | 'entertainment' | 'clothing' | 'savings' | 'other'

export interface Expense {
  id: string
  domainId: string
  amount: number
  category: ExpenseCategory
  description: string
  date: string                 // ISO date string
  createdAt: string
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface DomainBudget {
  domainId: string
  amount: number    // monthly budget in €
}

// ─── Finance (transactions, category budgets, savings goals) ─────────────────

export type FinanceCategoryType = 'expense' | 'income'

export interface FinanceCategory {
  id:    string
  name:  string
  type:  FinanceCategoryType
  color: string   // hex color, e.g. "#6366f1"
  icon:  string   // emoji
}

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id:        string
  type:      TransactionType
  amount:    number
  category:  string
  note?:     string
  date:      string        // YYYY-MM-DD
  createdAt: string
}

export interface FinanceCategoryBudget {
  category: string
  amount:   number         // monthly budget in €
}

export interface SavingsGoal {
  id:            string
  title:         string
  targetAmount:  number
  currentAmount: number
  targetDate:    string | null   // YYYY-MM-DD or null
  paused?:       boolean
  createdAt:     string
  updatedAt:     string
}

// ─── Pomodoro ─────────────────────────────────────────────────────────────────

export interface PomodoroSettings {
  focusDuration:           number   // minutes, default 25
  shortBreakDuration:      number   // minutes, default 5
  longBreakDuration:       number   // minutes, default 15
  sessionsBeforeLongBreak: number   // default 4
  soundEnabled:            boolean
}

// ─── ScheduleBlock ────────────────────────────────────────────────────────────

/**
 * Bloc récurrent d'emploi du temps. Représente les cours, l'alternance, les
 * routines hebdomadaires — toutes les plages déjà occupées dans la semaine
 * de l'utilisateur, pour que Kit puisse planifier autour.
 */
export type ScheduleBlockKind = 'class' | 'work' | 'commitment' | 'routine'

export interface ScheduleBlock {
  id:          string
  title:       string                // "Cours · Droit fiscal", "Cabinet (alternance)"
  kind:        ScheduleBlockKind
  daysOfWeek:  number[]              // 0=lun, 6=dim (style ISO)
  startTime:   string                // "09:00"
  endTime:     string                // "17:00"
  startDate?:  string | null         // optionnel : début de validité YYYY-MM-DD
  endDate?:    string | null         // optionnel : fin de validité YYYY-MM-DD
  domainId?:   string                // domaine associé (optionnel)
  notes?:      string
  createdAt:   string
}

// ─── TimeSession ──────────────────────────────────────────────────────────────

export interface TimeSession {
  id: string
  taskId: string
  duration: number             // minutes
  date: string                 // ISO date string
  focus: number                // 0–100, niveau de concentration
  createdAt: string
}

// ─── Shopping ─────────────────────────────────────────────────────────────────

export type ShoppingPriority = 'Envie' | 'Besoin' | 'Urgent'
export type ShoppingVerdict  = 'Satisfait' | 'Mitigé' | 'Déçu'

export interface ShoppingCategory {
  id:    string
  name:  string
  color: string   // hex
}

export interface ShoppingItem {
  id:         string
  name:       string
  brand?:     string
  price:      number
  imageUrl?:  string   // base64 or URL
  link?:      string
  notes?:     string
  categoryId?: string
  priority:   ShoppingPriority
  createdAt:  string
}

export interface BoughtItem extends ShoppingItem {
  boughtDate: string
  pricePaid:  number
  verdict:    ShoppingVerdict
}
