import { createPersistedStore } from '../lib/persistenceManager'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatutNouvelle = 'terminée' | 'abandonnée' | 'en cours'

export interface EcritureSession {
  date: string
  note: string
  mots: number
  duree: string
}

export interface Fragment {
  titre: string
  corps: string
}

export interface NouvelleActuelle {
  n: number
  titre: string
  genre: string
  jours_restants: number
  synopsis: string
  objectif: number
  ecrits: number
  sessions: EcritureSession[]
  fragments: {
    idees: Fragment[]
    alternatives: Fragment[]
  }
}

export interface NouvellePassee {
  n: number
  titre: string
  genre: string
  mots: number
  etoiles: number
  statut: 'terminée' | 'abandonnée'
}

export interface SemaineStats {
  n: number
  mots: number
  etat: StatutNouvelle
}

export interface GenreStats {
  nom: string
  n: number
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface EcritureHebdoStore {
  current: NouvelleActuelle | null
  past:    NouvellePassee[]
  weeks:   SemaineStats[]
  genres:  GenreStats[]

  commencer: (data: { titre: string; genre: string; synopsis: string; objectif: number }) => void
}

export const useEcritureHebdoStore = createPersistedStore<EcritureHebdoStore>(
  'aetheris-ecriture-hebdo-v1',
  (set, get) => ({
    current: null,
    past:    [],
    weeks:   [],
    genres:  [],

    commencer: ({ titre, genre, synopsis, objectif }) => {
      const { past, weeks, genres } = get()
      const n = past.length + 1

      const nouvelle: NouvelleActuelle = {
        n,
        titre,
        genre,
        synopsis,
        jours_restants: 7,
        objectif,
        ecrits: 0,
        sessions: [],
        fragments: { idees: [], alternatives: [] },
      }

      const newWeeks: SemaineStats[] = [...weeks, { n, mots: 0, etat: 'en cours' }]

      const existing = genres.find(g => g.nom === genre)
      const newGenres: GenreStats[] = existing
        ? genres.map(g => g.nom === genre ? { ...g, n: g.n + 1 } : g)
        : [...genres, { nom: genre, n: 1 }]

      set({ current: nouvelle, weeks: newWeeks, genres: newGenres })
    },
  }),
)
