import { createPersistedStore } from '../lib/persistenceManager'
import { nanoid } from '../utils/nanoid'

// =============================================================================
// Types — cascade de planification
// Voir docs/planning/SPEC.md §5 pour la sémantique complète.
// =============================================================================

export type IdentityStatus = 'en_construction' | 'projection'

export interface Identity {
  id:          string
  name:        string                  // ex: "Avocat fiscaliste respecté"
  description: string                  // 1 paragraphe
  horizon:     string                  // ex: "10 ans", "5-10 ans"
  status:      IdentityStatus
  imageUrl?:   string
  sortOrder:   number
  createdAt:   string
  updatedAt:   string
}

export type OkrStatus = 'en_cours' | 'termine' | 'abandonne'

export interface Okr {
  id:           string
  name:         string                 // ex: "Sécuriser ma trajectoire fiscaliste"
  description?: string
  year:         number                 // ex: 2026
  status:       OkrStatus
  identityIds:  string[]               // N-N → Identity
  sortOrder:    number
  createdAt:    string
  updatedAt:    string
}

export type RockStatus = 'a_faire' | 'en_cours' | 'termine' | 'abandonne'

export interface Rock {
  id:              string
  name:            string              // ex: "Rapport d'alternance déposé"
  expectedResult?: string
  quarter:         string              // ex: "Q3 2026"
  deadline?:       string              // ISO date
  status:          RockStatus
  krIds:           string[]            // N-N → Objective (KR)
  sortOrder:       number
  createdAt:       string
  updatedAt:       string
}

export interface Month {
  id:               string
  year:             number
  month:            number             // 1-12
  milestones:       string[]           // 1-3 jalons texte
  weeklyFocus:      { isoWeek: number, focus: string }[]
  identifiedRisk?:  string
  mitigationPlan?:  string
  createdAt:        string
  updatedAt:        string
}

export interface Week {
  id:              string
  isoYear:         number
  isoWeek:         number              // 1-53
  mit1?:           string
  mit2?:           string
  mit3?:           string
  risk?:           string
  mitigationPlan?: string
  notes?:          string
  createdAt:       string
  updatedAt:       string
}

export type DayType = 'cabinet' | 'ecole' | 'libre'
export type Energy  = 'faible'  | 'moyenne' | 'haute'

export interface DayPlan {
  id:               string
  date:             string             // ISO "YYYY-MM-DD"
  dayType?:         DayType
  priority?:        string             // LA chose absolue
  importants:       string[]           // max 3
  secondaries:      string[]           // max 5
  energyExpected?:  Energy
  pivotQuestion?:   string
  prepChecklist?:   { label: string, done: boolean }[]
  createdAt:        string
  updatedAt:        string
}

export type ReviewKind = 'weekly' | 'monthly' | 'quarterly' | 'annual'

export interface Review {
  id:                    string
  kind:                  ReviewKind
  periodStart:           string        // ISO date
  periodEnd:             string        // ISO date

  // Champs structurés (utilisés pour kind='weekly')
  mit1Status?:           'done' | 'partial' | 'missed'
  mit2Status?:           'done' | 'partial' | 'missed'
  mit3Status?:           'done' | 'partial' | 'missed'
  habitsScore?:          Record<string, { hit: number, total: number }>
  energyAvg?:            number        // 1-10
  rsHours?:              number
  victory?:              string
  difficulty?:           string
  difficultyRootCause?:  string
  learning?:             string
  nextWeekPivot?:        string

  // Texte libre Markdown (pour les autres revues)
  bodyMd?:               string

  createdAt:             string
  updatedAt:             string
}

export interface SystemNote {
  id:         string
  slug:       string                   // 'anti_abandon_rules', 'profile', 'protocole_re_entree', etc.
  title:      string
  contentMd:  string
  updatedAt:  string
}

// =============================================================================
// State + actions
// =============================================================================

export interface PlanningState {
  _hasHydrated:   boolean
  setHasHydrated: (v: boolean) => void

  identities:  Identity[]
  okrs:        Okr[]
  rocks:       Rock[]
  months:      Month[]
  weeks:       Week[]
  dayPlans:    DayPlan[]
  reviews:     Review[]
  systemNotes: SystemNote[]

  // ── Identity CRUD ──────────────────────────────────────────────────────────
  addIdentity:    (data: Omit<Identity, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Identity
  updateIdentity: (id: string, patch: Partial<Omit<Identity, 'id' | 'createdAt' | 'updatedAt'>>) => void
  deleteIdentity: (id: string) => void

  // ── OKR CRUD ───────────────────────────────────────────────────────────────
  addOkr:    (data: Omit<Okr, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Okr
  updateOkr: (id: string, patch: Partial<Omit<Okr, 'id' | 'createdAt' | 'updatedAt'>>) => void
  deleteOkr: (id: string) => void

  // ── Rock CRUD ──────────────────────────────────────────────────────────────
  addRock:    (data: Omit<Rock, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Rock
  updateRock: (id: string, patch: Partial<Omit<Rock, 'id' | 'createdAt' | 'updatedAt'>>) => void
  deleteRock: (id: string) => void

  // ── Month CRUD ─────────────────────────────────────────────────────────────
  addMonth:    (data: Omit<Month, 'id' | 'createdAt' | 'updatedAt'>) => Month
  updateMonth: (id: string, patch: Partial<Omit<Month, 'id' | 'createdAt' | 'updatedAt'>>) => void
  deleteMonth: (id: string) => void

  // ── Week CRUD ──────────────────────────────────────────────────────────────
  addWeek:    (data: Omit<Week, 'id' | 'createdAt' | 'updatedAt'>) => Week
  updateWeek: (id: string, patch: Partial<Omit<Week, 'id' | 'createdAt' | 'updatedAt'>>) => void
  deleteWeek: (id: string) => void

  // ── DayPlan CRUD ───────────────────────────────────────────────────────────
  upsertDayPlan: (date: string, patch: Partial<Omit<DayPlan, 'id' | 'date' | 'createdAt' | 'updatedAt'>>) => DayPlan
  deleteDayPlan: (id: string) => void

  // ── Review CRUD ────────────────────────────────────────────────────────────
  addReview:    (data: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => Review
  updateReview: (id: string, patch: Partial<Omit<Review, 'id' | 'createdAt' | 'updatedAt'>>) => void
  deleteReview: (id: string) => void

  // ── SystemNote CRUD ────────────────────────────────────────────────────────
  upsertSystemNote: (slug: string, data: Omit<SystemNote, 'id' | 'slug' | 'updatedAt'>) => SystemNote
  deleteSystemNote: (id: string) => void
}

// =============================================================================
// Store
// =============================================================================

const now = (): string => new Date().toISOString()

export const usePlanningStore = createPersistedStore<PlanningState>(
  'aetheris-planning-v1',
  (set, get) => ({
    _hasHydrated:   false,
    setHasHydrated: (v) => set({ _hasHydrated: v }),

    identities:  [],
    okrs:        [],
    rocks:       [],
    months:      [],
    weeks:       [],
    dayPlans:    [],
    reviews:     [],
    systemNotes: [],

    // ── Identity ─────────────────────────────────────────────────────────────
    addIdentity: (data) => {
      const ts = now()
      const entity: Identity = {
        id:        nanoid(),
        sortOrder: get().identities.length,
        createdAt: ts,
        updatedAt: ts,
        ...data,
      }
      set({ identities: [...get().identities, entity] })
      return entity
    },
    updateIdentity: (id, patch) => {
      set({
        identities: get().identities.map((i) =>
          i.id === id ? { ...i, ...patch, updatedAt: now() } : i,
        ),
      })
    },
    deleteIdentity: (id) => {
      set({ identities: get().identities.filter((i) => i.id !== id) })
      // Nettoie aussi les liens dans les OKR
      set({
        okrs: get().okrs.map((o) => ({
          ...o,
          identityIds: o.identityIds.filter((iid) => iid !== id),
          updatedAt:   now(),
        })),
      })
    },

    // ── OKR ──────────────────────────────────────────────────────────────────
    addOkr: (data) => {
      const ts = now()
      const entity: Okr = {
        id:        nanoid(),
        sortOrder: get().okrs.length,
        createdAt: ts,
        updatedAt: ts,
        ...data,
      }
      set({ okrs: [...get().okrs, entity] })
      return entity
    },
    updateOkr: (id, patch) => {
      set({
        okrs: get().okrs.map((o) =>
          o.id === id ? { ...o, ...patch, updatedAt: now() } : o,
        ),
      })
    },
    deleteOkr: (id) => {
      set({ okrs: get().okrs.filter((o) => o.id !== id) })
    },

    // ── Rock ─────────────────────────────────────────────────────────────────
    addRock: (data) => {
      const ts = now()
      const entity: Rock = {
        id:        nanoid(),
        sortOrder: get().rocks.length,
        createdAt: ts,
        updatedAt: ts,
        ...data,
      }
      set({ rocks: [...get().rocks, entity] })
      return entity
    },
    updateRock: (id, patch) => {
      set({
        rocks: get().rocks.map((r) =>
          r.id === id ? { ...r, ...patch, updatedAt: now() } : r,
        ),
      })
    },
    deleteRock: (id) => {
      set({ rocks: get().rocks.filter((r) => r.id !== id) })
    },

    // ── Month ────────────────────────────────────────────────────────────────
    addMonth: (data) => {
      const ts = now()
      const entity: Month = { id: nanoid(), createdAt: ts, updatedAt: ts, ...data }
      set({ months: [...get().months, entity] })
      return entity
    },
    updateMonth: (id, patch) => {
      set({
        months: get().months.map((m) =>
          m.id === id ? { ...m, ...patch, updatedAt: now() } : m,
        ),
      })
    },
    deleteMonth: (id) => {
      set({ months: get().months.filter((m) => m.id !== id) })
    },

    // ── Week ─────────────────────────────────────────────────────────────────
    addWeek: (data) => {
      const ts = now()
      const entity: Week = { id: nanoid(), createdAt: ts, updatedAt: ts, ...data }
      set({ weeks: [...get().weeks, entity] })
      return entity
    },
    updateWeek: (id, patch) => {
      set({
        weeks: get().weeks.map((w) =>
          w.id === id ? { ...w, ...patch, updatedAt: now() } : w,
        ),
      })
    },
    deleteWeek: (id) => {
      set({ weeks: get().weeks.filter((w) => w.id !== id) })
    },

    // ── DayPlan ──────────────────────────────────────────────────────────────
    upsertDayPlan: (date, patch) => {
      const existing = get().dayPlans.find((d) => d.date === date)
      const ts = now()
      if (existing) {
        const updated: DayPlan = { ...existing, ...patch, updatedAt: ts }
        set({ dayPlans: get().dayPlans.map((d) => (d.id === existing.id ? updated : d)) })
        return updated
      }
      const created: DayPlan = {
        id:          nanoid(),
        date,
        importants:  [],
        secondaries: [],
        createdAt:   ts,
        updatedAt:   ts,
        ...patch,
      }
      set({ dayPlans: [...get().dayPlans, created] })
      return created
    },
    deleteDayPlan: (id) => {
      set({ dayPlans: get().dayPlans.filter((d) => d.id !== id) })
    },

    // ── Review ───────────────────────────────────────────────────────────────
    addReview: (data) => {
      const ts = now()
      const entity: Review = { id: nanoid(), createdAt: ts, updatedAt: ts, ...data }
      set({ reviews: [...get().reviews, entity] })
      return entity
    },
    updateReview: (id, patch) => {
      set({
        reviews: get().reviews.map((r) =>
          r.id === id ? { ...r, ...patch, updatedAt: now() } : r,
        ),
      })
    },
    deleteReview: (id) => {
      set({ reviews: get().reviews.filter((r) => r.id !== id) })
    },

    // ── SystemNote ───────────────────────────────────────────────────────────
    upsertSystemNote: (slug, data) => {
      const existing = get().systemNotes.find((n) => n.slug === slug)
      const ts = now()
      if (existing) {
        const updated: SystemNote = { ...existing, ...data, updatedAt: ts }
        set({ systemNotes: get().systemNotes.map((n) => (n.id === existing.id ? updated : n)) })
        return updated
      }
      const created: SystemNote = { id: nanoid(), slug, updatedAt: ts, ...data }
      set({ systemNotes: [...get().systemNotes, created] })
      return created
    },
    deleteSystemNote: (id) => {
      set({ systemNotes: get().systemNotes.filter((n) => n.id !== id) })
    },
  }),
)
