import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabaseStorage } from '../lib/supabaseSync'

export type FilmSerieType   = 'film' | 'serie'
export type FilmSerieStatus = 'à voir' | 'en cours' | 'vu'
export type FilmTag =
  | 'action' | 'comédie' | 'drame' | 'horreur' | 'sci-fi'
  | 'thriller' | 'animation' | 'documentaire' | 'romance'
  | 'fantastique' | 'biopic' | 'crime'

export interface FilmSerie {
  id:             string
  title:          string
  type:           FilmSerieType
  director?:      string
  releaseYear?:   number
  imageUrl?:      string
  rating?:        number
  review?:        string
  tags:           FilmTag[]
  favoriteScenes: string[]
  watchDate?:     string
  status:         FilmSerieStatus
  createdAt:      string
}

interface FilmSerieStore {
  items:          FilmSerie[]
  addItem:        (item: Omit<FilmSerie, 'id' | 'createdAt'>) => void
  updateItem:     (id: string, updates: Partial<FilmSerie>) => void
  removeItem:     (id: string) => void
  markAsWatched:  (id: string, rating: number, review: string, watchDate: string, favoriteScenes: string[]) => void
  markInProgress: (id: string) => void
}

export const useFilmSerieStore = create<FilmSerieStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((s) => ({
          items: [
            ...s.items,
            { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),
      updateItem: (id, updates) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      markAsWatched: (id, rating, review, watchDate, favoriteScenes) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, status: 'vu', rating, review, watchDate, favoriteScenes } : i
          ),
        })),
      markInProgress: (id) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, status: 'en cours' } : i
          ),
        })),
    }),
    {
      name:    'aetheris-filmseries-v1',
      storage: createJSONStorage(() => supabaseStorage),
    }
  )
)
