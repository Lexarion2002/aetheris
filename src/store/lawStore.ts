import { nanoid } from '../utils/nanoid'
import { createPersistedStore } from '../lib/persistenceManager'

export type Subject = {
  id: string
  name: string
  professor?: string
  notes?: string
}

export type KeyDate = {
  id: string
  title: string
  date: string
  notes?: string
}

export type LawStore = {
  programName: string
  academicYear: string
  notionUrl?: string

  subjects: Subject[]
  keyDates: KeyDate[]

  statusNote: string

  setProgramInfo: (programName: string, academicYear: string) => void
  setNotionUrl: (url: string) => void

  addSubject: (input: Omit<Subject, 'id'>) => void
  updateSubject: (id: string, patch: Partial<Subject>) => void
  deleteSubject: (id: string) => void

  addKeyDate: (input: Omit<KeyDate, 'id'>) => void
  updateKeyDate: (id: string, patch: Partial<KeyDate>) => void
  deleteKeyDate: (id: string) => void

  setStatusNote: (value: string) => void
}

const nextMonthDate = (day: number) => {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  date.setDate(day)
  return date.toISOString().split('T')[0]
}

const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'subject-contrats',
    name: 'Droit des contrats spéciaux',
    professor: 'Pr. Lévêque',
    notes: 'Revoir délivrance conforme et garanties.',
  },
  {
    id: 'subject-suretes',
    name: 'Droit des sûretés',
    professor: 'Pr. Vidal-Naquet',
  },
  {
    id: 'subject-arbitrage',
    name: 'Arbitrage commercial international',
    professor: 'Me. Aubert',
  },
]

const DEFAULT_KEY_DATES: KeyDate[] = [
  {
    id: 'date-partiel',
    title: 'Partiel principal',
    date: nextMonthDate(12),
    notes: 'Cas pratique, 3 h.',
  },
  {
    id: 'date-rendu',
    title: 'Rendu écrit',
    date: nextMonthDate(24),
  },
]

export const useLawStore = createPersistedStore<LawStore>(
  'aetheris-law-v1',
  (set) => ({
    programName: 'Master droit des affaires',
    academicYear: '2025-2026',
    notionUrl: '',

    subjects: DEFAULT_SUBJECTS,
    keyDates: DEFAULT_KEY_DATES,

    statusNote: 'Clarifier les priorités de la semaine et garder les échéances visibles.',

    setProgramInfo: (programName, academicYear) => set({ programName, academicYear }),
    setNotionUrl: (url) => set({ notionUrl: url }),

    addSubject: (input) =>
      set((state) => ({
        subjects: [{ id: nanoid(), ...input }, ...state.subjects],
      })),
    updateSubject: (id, patch) =>
      set((state) => ({
        subjects: state.subjects.map((subject) => (subject.id === id ? { ...subject, ...patch } : subject)),
      })),
    deleteSubject: (id) =>
      set((state) => ({
        subjects: state.subjects.filter((subject) => subject.id !== id),
      })),

    addKeyDate: (input) =>
      set((state) => ({
        keyDates: [{ id: nanoid(), ...input }, ...state.keyDates],
      })),
    updateKeyDate: (id, patch) =>
      set((state) => ({
        keyDates: state.keyDates.map((keyDate) => (keyDate.id === id ? { ...keyDate, ...patch } : keyDate)),
      })),
    deleteKeyDate: (id) =>
      set((state) => ({
        keyDates: state.keyDates.filter((keyDate) => keyDate.id !== id),
      })),

    setStatusNote: (value) => set({ statusNote: value }),
  }),
)
