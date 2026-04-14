import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabaseStorage } from '../lib/supabaseSync'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookType   = 'fiction' | 'non-fiction'
export type BookSource = 'recommandation' | 'prix-litteraire' | 'recherche' | 'reference-roman'

export interface BookCritique {
  id:               string
  titre:            string
  auteur:           string
  anneePublication: string
  couverture:       string
  note:             number        // entier 1-10
  genres:           string[]
  troismots:        string[]      // max 3
  critique:         string
  citationFavorite: string
  type:             BookType
  dateLecture:      string        // YYYY-MM-DD
  referenceRoman:   boolean       // alimente la bibliothèque de l'Absurde (Écriture)
}

export interface BookAttente {
  id:        string
  titre:     string
  auteur:    string
  source:    BookSource
  pourquoi:  string
  dateAjout: string
}

export interface BookEnCours {
  titre:        string
  auteur:       string
  couverture:   string
  pageActuelle: number | null
  pagesTotal:   number | null
  impressions:  string
  dateDebut:    string   // ISO
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface BookState {
  _hasHydrated:   boolean
  setHasHydrated: (v: boolean) => void

  objectifAnnuel:    number          // 52 par défaut
  livreEnCours:      BookEnCours | null
  bibliotheque:      BookCritique[]
  fileAttente:       BookAttente[]
  genresPerso:       string[]        // genres créés par l'utilisateur

  setObjectifAnnuel: (n: number) => void

  setLivreEnCours:    (livre: Omit<BookEnCours, 'dateDebut'>) => void
  updateLivreEnCours: (data: Partial<Omit<BookEnCours, 'dateDebut'>>) => void
  clearLivreEnCours:  () => void

  addCritique:    (critique: Omit<BookCritique, 'id'> & { id?: string }) => void
  updateCritique: (id: string, data: Partial<Omit<BookCritique, 'id'>>) => void
  deleteCritique: (id: string) => void

  addFileAttente:   (livre: Omit<BookAttente, 'id' | 'dateAjout'>) => void
  removeFromFile:   (id: string) => void
  startReading:     (id: string) => void   // déplace de la file vers en cours

  addGenrePerso:    (genre: string) => void
  removeGenrePerso: (genre: string) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      _hasHydrated:   false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      objectifAnnuel: 52,
      livreEnCours:   null,
      bibliotheque:   [],
      fileAttente:    [],
      genresPerso:    [],

      setObjectifAnnuel: (n) => set({ objectifAnnuel: n }),

      setLivreEnCours: (livre) =>
        set({ livreEnCours: { ...livre, dateDebut: new Date().toISOString() } }),

      updateLivreEnCours: (data) =>
        set((s) =>
          s.livreEnCours ? { livreEnCours: { ...s.livreEnCours, ...data } } : {},
        ),

      clearLivreEnCours: () => set({ livreEnCours: null }),

      addCritique: (critique) => {
        set((s) => {
          const id = critique.id || crypto.randomUUID()
          if (s.bibliotheque.some((b) => b.id === id)) {
            return { bibliotheque: s.bibliotheque.map((b) => (b.id === id ? { ...b, ...critique } : b)) }
          }
          const entry: BookCritique = {
            id,
            ...(critique as Omit<BookCritique, 'id'>),
          }
          return { bibliotheque: [entry, ...s.bibliotheque] }
        })
      },

      updateCritique: (id, data) =>
        set((s) => ({
          bibliotheque: s.bibliotheque.map((b) => (b.id === id ? { ...b, ...data } : b)),
        })),

      deleteCritique: (id) => {
        if (!id) return
        set((s) => ({
          bibliotheque: s.bibliotheque.filter((b) => b.id !== id),
        }))
      },

      addFileAttente: (livre) => {
        const entry: BookAttente = {
          id:        crypto.randomUUID(),
          dateAjout: new Date().toISOString().split('T')[0],
          ...livre,
        }
        set((s) => ({ fileAttente: [entry, ...s.fileAttente] }))
      },

      removeFromFile: (id) =>
        set((s) => ({ fileAttente: s.fileAttente.filter((b) => b.id !== id) })),

      startReading: (id) => {
        const livre = get().fileAttente.find((b) => b.id === id)
        if (!livre) return
        set((s) => ({
          fileAttente: s.fileAttente.filter((b) => b.id !== id),
          livreEnCours: {
            titre:        livre.titre,
            auteur:       livre.auteur,
            couverture:   '',
            pageActuelle: null,
            pagesTotal:   null,
            impressions:  '',
            dateDebut:    new Date().toISOString(),
          },
        }))
      },

      addGenrePerso: (genre) => {
        const g = genre.trim()
        if (!g) return
        set((s) => {
          if (s.genresPerso.includes(g)) return s
          return { genresPerso: [...s.genresPerso, g] }
        })
      },

      removeGenrePerso: (genre) =>
        set((s) => ({ genresPerso: s.genresPerso.filter((g) => g !== genre) })),
    }),
    {
      name: 'aetheris-books-v1',
      storage: createJSONStorage(() => supabaseStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
