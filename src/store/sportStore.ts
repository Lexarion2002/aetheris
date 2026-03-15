import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from '../utils/nanoid'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SportStatus  = 'reprise' | 'en_rythme' | 'pause_assumee'
export type SessionType  = 'course' | 'streetworkout'
export type Ressenti     = 'facile' | 'correct' | 'dur'
export type ObjectifType = 'regularite' | 'performance'
export type MouvUnit     = 'reps' | 'seconds'

export interface CourseStade {
  id:        string
  label:     string
  completed: boolean
  custom:    boolean
}

export interface MouvHistEntry {
  date:   string
  value:  number
  note?:  string
}

export interface Mouvement {
  id:          string
  nom:         string
  unit:        MouvUnit
  meilleurPerf: number | null
  objectifCT:  number
  historique:  MouvHistEntry[]
}

export interface WorkoutEntry {
  id:        string
  date:      string      // YYYY-MM-DD
  type:      SessionType
  duration:  number      // minutes
  distance?: number      // km (course only)
  ressenti?: Ressenti
  notes?:    string
  createdAt: string
}

export interface SportObjectif {
  id:         string
  titre:      string
  type:       ObjectifType
  dateCible:  string | null
  atteint:    boolean
  createdAt:  string
}

// ─── State ────────────────────────────────────────────────────────────────────

interface SportState {
  currentStatus:  SportStatus
  parcoursFavori: string
  parcFavori:     string
  courseStades:   CourseStade[]
  mouvements:     Mouvement[]
  historique:     WorkoutEntry[]
  objectifs:      SportObjectif[]

  setStatus:           (status: SportStatus) => void
  recordSession:       (entry: Omit<WorkoutEntry, 'id' | 'createdAt'>) => void
  updateSession:       (id: string, updates: Partial<Omit<WorkoutEntry, 'id' | 'createdAt'>>) => void
  deleteSession:       (id: string) => void
  toggleCourseStade:   (id: string) => void
  addCourseStade:      (label: string) => void
  deleteCourseStade:   (id: string) => void
  setParcoursFavori:   (parcours: string) => void
  setParcFavori:       (parc: string) => void
  recordMovementPerf:  (mouvementId: string, value: number, note?: string) => void
  updateObjectifCT:    (mouvementId: string, value: number) => void
  addObjectif:         (titre: string, type: ObjectifType, dateCible: string | null) => void
  markObjectifComplete:(id: string) => void
  deleteObjectif:      (id: string) => void
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STADES: CourseStade[] = [
  { id: 'walk_run',  label: 'Marche/Course 20min',    completed: false, custom: false },
  { id: 'run_30',    label: 'Course 30min continue',  completed: false, custom: false },
  { id: 'run_5k',    label: '5km',                    completed: false, custom: false },
  { id: 'run_10k',   label: '10km',                   completed: false, custom: false },
]

const DEFAULT_MOUVEMENTS: Mouvement[] = [
  { id: 'tractions', nom: 'Tractions', unit: 'reps',    meilleurPerf: null, objectifCT: 10,  historique: [] },
  { id: 'dips',      nom: 'Dips',      unit: 'reps',    meilleurPerf: null, objectifCT: 8,   historique: [] },
  { id: 'pompes',    nom: 'Pompes',    unit: 'reps',    meilleurPerf: null, objectifCT: 25,  historique: [] },
  { id: 'gainage',   nom: 'Gainage',   unit: 'seconds', meilleurPerf: null, objectifCT: 120, historique: [] },
]

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSportStore = create<SportState>()(
  persist(
    (set) => ({
      currentStatus:  'reprise',
      parcoursFavori: '',
      parcFavori:     '',
      courseStades:   DEFAULT_STADES,
      mouvements:     DEFAULT_MOUVEMENTS,
      historique:     [],
      objectifs:      [],

      setStatus: (status) => set({ currentStatus: status }),

      recordSession: (entry) => {
        const newEntry: WorkoutEntry = { id: nanoid(), createdAt: new Date().toISOString(), ...entry }
        set((s) => ({ historique: [newEntry, ...s.historique] }))
      },

      updateSession: (id, updates) =>
        set((s) => ({
          historique: s.historique.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      deleteSession: (id) =>
        set((s) => ({ historique: s.historique.filter((e) => e.id !== id) })),

      toggleCourseStade: (id) =>
        set((s) => ({
          courseStades: s.courseStades.map((st) =>
            st.id === id ? { ...st, completed: !st.completed } : st,
          ),
        })),

      addCourseStade: (label) =>
        set((s) => ({
          courseStades: [...s.courseStades, { id: nanoid(), label, completed: false, custom: true }],
        })),

      deleteCourseStade: (id) =>
        set((s) => ({ courseStades: s.courseStades.filter((st) => st.id !== id) })),

      setParcoursFavori: (parcoursFavori) => set({ parcoursFavori }),
      setParcFavori:     (parcFavori)     => set({ parcFavori }),

      recordMovementPerf: (mouvementId, value, note) =>
        set((s) => ({
          mouvements: s.mouvements.map((m) => {
            if (m.id !== mouvementId) return m
            const entry: MouvHistEntry = { date: new Date().toISOString().split('T')[0], value, note }
            const meilleurPerf = m.meilleurPerf === null ? value : Math.max(m.meilleurPerf, value)
            return { ...m, meilleurPerf, historique: [entry, ...m.historique] }
          }),
        })),

      updateObjectifCT: (mouvementId, value) =>
        set((s) => ({
          mouvements: s.mouvements.map((m) =>
            m.id === mouvementId ? { ...m, objectifCT: value } : m,
          ),
        })),

      addObjectif: (titre, type, dateCible) => {
        const obj: SportObjectif = { id: nanoid(), titre, type, dateCible, atteint: false, createdAt: new Date().toISOString() }
        set((s) => ({ objectifs: [...s.objectifs, obj] }))
      },

      markObjectifComplete: (id) =>
        set((s) => ({
          objectifs: s.objectifs.map((o) => (o.id === id ? { ...o, atteint: true } : o)),
        })),

      deleteObjectif: (id) =>
        set((s) => ({ objectifs: s.objectifs.filter((o) => o.id !== id) })),
    }),
    { name: 'aetheris-sport-v1' },
  ),
)
