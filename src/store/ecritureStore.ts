import { createPersistedStore } from '../lib/persistenceManager'
import { ETAPE_ORDER } from '../lib/ecritureEngine'
import type { Etape, Genre } from '../lib/ecritureEngine'

// ─── Types exportés ───────────────────────────────────────────────────────────

export type { Etape, Genre }

export interface NouvelleEnCours {
  id: string
  stage: Etape
  title: string
  genre: Genre
  synopsis: string
  startedAt: string      // "DD.MM"
  daysInStage: number
  deadline: string       // "DD.MM.YYYY" ou ''
  motsCouches: number
  objectifMots: number
  numero: number
  active: boolean
  derniereNote?: { date: string; contenu: string }
}

export interface NouvelleTerminee {
  id: string
  title: string
  genre: Genre
  date: string
  days: number
  note: string
}

export interface Idee {
  id: string
  title: string
  pitch: string
  genre: Genre
  date: string
  age: number
}

// ─── Interface du store ───────────────────────────────────────────────────────

interface EcritureStore {
  pipeline: NouvelleEnCours[]
  history: NouvelleTerminee[]
  ideas: Idee[]
  hasHydrated: boolean

  avancerEtape: (id: string) => void
  ajouterNote: (id: string, contenu: string) => void
  updateMots: (id: string, mots: number) => void
  ajouterIdee: (idee: Omit<Idee, 'id' | 'age'>) => void
  finaliser: (id: string, note: string) => void
  setHasHydrated: (v: boolean) => void
}

// ─── Données initiales ────────────────────────────────────────────────────────

const DEFAULT_PIPELINE: NouvelleEnCours[] = []
const DEFAULT_HISTORY: NouvelleTerminee[] = []
const DEFAULT_IDEAS: Idee[] = []

// ─── Store ────────────────────────────────────────────────────────────────────

const todayDDMM = () => {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}`
}

export const useEcritureStore = createPersistedStore<EcritureStore>(
  'aetheris-ecriture-v2',
  (set, get) => ({
    pipeline: DEFAULT_PIPELINE,
    history: DEFAULT_HISTORY,
    ideas: DEFAULT_IDEAS,
    hasHydrated: false,

    avancerEtape: (id) =>
      set((s) => ({
        pipeline: s.pipeline.map((n) => {
          if (n.id !== id) return n
          const idx = ETAPE_ORDER.indexOf(n.stage)
          const nextStage = idx < ETAPE_ORDER.length - 1 ? ETAPE_ORDER[idx + 1] : n.stage
          return { ...n, stage: nextStage, daysInStage: 0, startedAt: todayDDMM() }
        }),
      })),

    ajouterNote: (id, contenu) =>
      set((s) => ({
        pipeline: s.pipeline.map((n) =>
          n.id === id ? { ...n, derniereNote: { date: todayDDMM(), contenu } } : n,
        ),
      })),

    updateMots: (id, mots) =>
      set((s) => ({
        pipeline: s.pipeline.map((n) => (n.id === id ? { ...n, motsCouches: mots } : n)),
      })),

    ajouterIdee: (idee) =>
      set((s) => ({
        ideas: [{ ...idee, id: crypto.randomUUID(), age: 0 }, ...s.ideas],
      })),

    finaliser: (id, note) => {
      const item = get().pipeline.find((n) => n.id === id)
      if (!item) return
      const dateStr = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
      const terminee: NouvelleTerminee = {
        id: crypto.randomUUID(),
        title: item.title,
        genre: item.genre,
        date: dateStr,
        days: item.daysInStage,
        note,
      }
      set((s) => ({
        pipeline: s.pipeline.filter((n) => n.id !== id),
        history: [terminee, ...s.history],
      }))
    },

    setHasHydrated: (v) => {
      const s = get()
      if (v && s.pipeline.length === 0 && s.history.length === 0 && s.ideas.length === 0) {
        set({
          hasHydrated: true,
          pipeline: DEFAULT_PIPELINE,
          history: DEFAULT_HISTORY,
          ideas: DEFAULT_IDEAS,
        })
      } else {
        set({ hasHydrated: v })
      }
    },
  }),
)
