import { createPersistedStore } from '../lib/persistenceManager'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SousTache {
  id: string
  label: string
  done: boolean
}

export interface Tache {
  id: string
  title: string
  type: 'Partiel' | 'Exposé' | 'Rendu' | 'Mémoire' | 'Autre'
  matiere: string
  deadline: string | null   // format "DD.MM.YYYY"
  estimation: string
  note: string
  subtasks: SousTache[]
  manualProgress: number | null  // utilisé seulement si subtasks.length === 0
  createdAt: string
}

// ─── Spaced repetition (flashcards) ──────────────────────────────────────────

export type ReviewQuality = 'again' | 'hard' | 'good' | 'easy'

export interface Flashcard {
  id:            string
  matiere:       string
  question:      string
  answer:        string
  // SM-2 state
  easeFactor:    number   // démarre à 2.5
  interval:      number   // jours jusqu'à la prochaine révision
  repetitions:   number   // nb de succès consécutifs
  nextReview:    string   // YYYY-MM-DD
  lastReviewed:  string | null
  createdAt:     string
}

export interface DroitStore {
  taches: Tache[]
  addTache: (t: Omit<Tache, 'id' | 'createdAt'>) => void
  deleteTache: (id: string) => void
  updateNote: (id: string, note: string) => void
  toggleSousTache: (tacheId: string, sousTacheId: string) => void
  addSousTache: (tacheId: string, label: string) => void
  removeSousTache: (tacheId: string, sousTacheId: string) => void
  setProgressionManuelle: (tacheId: string, value: number) => void

  // Flashcards
  flashcards: Flashcard[]
  addFlashcard:    (input: { matiere: string; question: string; answer: string }) => void
  updateFlashcard: (id: string, updates: Partial<Pick<Flashcard, 'matiere' | 'question' | 'answer'>>) => void
  deleteFlashcard: (id: string) => void
  reviewFlashcard: (id: string, quality: ReviewQuality) => void

  setHasHydrated: (v: boolean) => void
}

// ─── SM-2 helpers ────────────────────────────────────────────────────────────

const QUALITY_SCORE: Record<ReviewQuality, number> = {
  again: 0,  // raté
  hard:  3,  // dur mais OK
  good:  4,  // bien
  easy:  5,  // facile
}

const todayIsoDate = (): string => new Date().toISOString().split('T')[0]

const addDays = (iso: string, days: number): string => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function applySM2(card: Flashcard, quality: ReviewQuality): Flashcard {
  const q = QUALITY_SCORE[quality]
  let { easeFactor, interval, repetitions } = card

  if (q < 3) {
    // Échec — on repart de zéro mais on garde l'easeFactor
    repetitions = 0
    interval = 1
  } else {
    repetitions += 1
    if (repetitions === 1)      interval = 1
    else if (repetitions === 2) interval = 6
    else                        interval = Math.round(interval * easeFactor)
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    nextReview:   addDays(todayIsoDate(), interval),
    lastReviewed: todayIsoDate(),
  }
}

// ─── Données initiales ────────────────────────────────────────────────────────

const DEFAULT_TACHES: Tache[] = [
  {
    id: 't1',
    title: 'Droit fiscal des entreprises',
    type: 'Partiel',
    matiere: 'Droit fiscal',
    deadline: '12.05.2026',
    estimation: '~3 h restantes',
    note: '',
    subtasks: [
      { id: 's1', label: 'Lire le cours — restructurations', done: true },
      { id: 's2', label: 'Faire les annales 2023', done: true },
      { id: 's3', label: 'Réviser régime mère-fille', done: false },
      { id: 's4', label: 'Faire un cas pratique type', done: false },
    ],
    manualProgress: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 't2',
    title: "Note d'arrêt — CJUE Solvay",
    type: 'Rendu',
    matiere: 'Droit européen',
    deadline: '18.05.2026',
    estimation: '~5 h estimées',
    note: 'commencer par la portée, pas les faits',
    subtasks: [],
    manualProgress: 10,
    createdAt: new Date().toISOString(),
  },
  {
    id: 't3',
    title: 'Exposé clause compromissoire',
    type: 'Exposé',
    matiere: 'Arbitrage',
    deadline: '06.05.2026',
    estimation: '',
    note: '',
    subtasks: [
      { id: 's1', label: 'Trouver les arrêts de référence', done: true },
      { id: 's2', label: 'Rédiger les slides', done: true },
      { id: 's3', label: 'Répéter à voix haute', done: true },
    ],
    manualProgress: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 't4',
    title: 'Mémoire — plan + bibliographie',
    type: 'Mémoire',
    matiere: 'Droit de la régulation',
    deadline: '03.06.2026',
    estimation: '~12 h estimées',
    note: '',
    subtasks: [
      { id: 's1', label: 'Définir la problématique', done: true },
      { id: 's2', label: 'Constituer la bibliographie', done: false },
      { id: 's3', label: 'Rédiger le plan détaillé', done: false },
    ],
    manualProgress: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 't5',
    title: 'Droit de la concurrence',
    type: 'Partiel',
    matiere: 'Concurrence',
    deadline: null,
    estimation: '',
    note: '',
    subtasks: [],
    manualProgress: 60,
    createdAt: new Date().toISOString(),
  },
]

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDroitStore = createPersistedStore<DroitStore>(
  'aetheris-droit-v2',
  (set) => ({
    taches: DEFAULT_TACHES,
    flashcards: [],

    addTache: (t) =>
      set((s) => ({
        taches: [
          ...s.taches,
          { ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ],
      })),

    deleteTache: (id) =>
      set((s) => ({ taches: s.taches.filter((t) => t.id !== id) })),

    updateNote: (id, note) =>
      set((s) => ({
        taches: s.taches.map((t) => (t.id === id ? { ...t, note } : t)),
      })),

    toggleSousTache: (tacheId, sousTacheId) =>
      set((s) => ({
        taches: s.taches.map((t) =>
          t.id === tacheId
            ? {
                ...t,
                subtasks: t.subtasks.map((st) =>
                  st.id === sousTacheId ? { ...st, done: !st.done } : st,
                ),
              }
            : t,
        ),
      })),

    addSousTache: (tacheId, label) =>
      set((s) => ({
        taches: s.taches.map((t) =>
          t.id === tacheId
            ? {
                ...t,
                subtasks: [
                  ...t.subtasks,
                  { id: crypto.randomUUID(), label, done: false },
                ],
              }
            : t,
        ),
      })),

    removeSousTache: (tacheId, sousTacheId) =>
      set((s) => ({
        taches: s.taches.map((t) =>
          t.id === tacheId
            ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== sousTacheId) }
            : t,
        ),
      })),

    setProgressionManuelle: (tacheId, value) =>
      set((s) => ({
        taches: s.taches.map((t) =>
          t.id === tacheId
            ? { ...t, manualProgress: Math.min(100, Math.max(0, value)) }
            : t,
        ),
      })),

    // ── Flashcards ────────────────────────────────────────────────────────

    addFlashcard: ({ matiere, question, answer }) =>
      set((s) => ({
        flashcards: [
          ...s.flashcards,
          {
            id:           crypto.randomUUID(),
            matiere,
            question,
            answer,
            easeFactor:   2.5,
            interval:     0,
            repetitions:  0,
            nextReview:   todayIsoDate(),  // due dès aujourd'hui
            lastReviewed: null,
            createdAt:    new Date().toISOString(),
          },
        ],
      })),

    updateFlashcard: (id, updates) =>
      set((s) => ({
        flashcards: s.flashcards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      })),

    deleteFlashcard: (id) =>
      set((s) => ({ flashcards: s.flashcards.filter((c) => c.id !== id) })),

    reviewFlashcard: (id, quality) =>
      set((s) => ({
        flashcards: s.flashcards.map((c) => (c.id === id ? applySM2(c, quality) : c)),
      })),

    // Appelé par persistenceManager après rehydratation.
    // Si Supabase/localStorage ne contient aucune donnée, on amorce avec les defaults.
    setHasHydrated: (v) =>
      set((s) => {
        if (v && s.taches.length === 0) {
          return { taches: DEFAULT_TACHES }
        }
        return {}
      }),
  }),
)
