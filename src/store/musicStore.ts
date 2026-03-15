import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from '../utils/nanoid'
import { firestoreStorage } from './firebase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlbumTag =
  | 'ambient' | 'jazz' | 'rap' | 'rock' | 'electro' | 'classical' | 'soul'
  | 'rnb' | 'folk' | 'metal' | 'pop' | 'world' | 'experimental' | 'indie'

export interface AlbumCritique {
  id:                  string
  titre:               string
  artiste:             string
  dateOriginaleSortie: string   // ISO "YYYY-MM-DD" or empty
  pochette:            string   // base64 data URL or external URL or empty
  note:                number   // 1-10
  tags:                AlbumTag[]  // up to 3
  critique:            string
  tracksFavorites:     string[]
  contexte:            string
  dateCritique:        string   // ISO date added
}

export interface AlbumAttente {
  id:                   string
  titre:                string
  artiste:              string
  source:               string
  pourquoi:             string
  dateAjout:            string   // ISO
  dateAttendueSortie?:  string   // ISO, optional
}

export interface ArtisteFollowed {
  id:                   string
  nom:                  string
  photo:                string
  discographieEcoutee:  number
  discographieTotal:    number
  attentes:             string   // free text notes
  alerte:               boolean  // notify when new release
}

export interface AlbumEnCours {
  titre:             string
  artiste:           string
  pochette:          string
  premiereImpression: string
  startedAt:         string   // ISO
}

// ─── State ────────────────────────────────────────────────────────────────────

interface MusicState {
  albumEnCours:   AlbumEnCours | null
  bibliotheque:   AlbumCritique[]
  fileAttente:    AlbumAttente[]
  artistesSuivis: ArtisteFollowed[]

  setAlbumEnCours:       (album: Omit<AlbumEnCours, 'startedAt'>) => void
  clearAlbumEnCours:     () => void
  setPremiereImpression: (text: string) => void

  addCritique:    (critique: Omit<AlbumCritique, 'id' | 'dateCritique'>) => void
  updateCritique: (id: string, updates: Partial<Omit<AlbumCritique, 'id'>>) => void
  deleteCritique: (id: string) => void

  addAlbumFile:      (album: Omit<AlbumAttente, 'id' | 'dateAjout'>) => void
  removeFromFile:    (id: string) => void
  startListening:    (id: string) => void   // move from file to en cours

  followArtiste:        (artiste: Omit<ArtisteFollowed, 'id'>) => void
  updateArtiste:        (id: string, updates: Partial<Omit<ArtisteFollowed, 'id'>>) => void
  unfollowArtiste:      (id: string) => void
  setArtisteAlerte:     (id: string, alerte: boolean) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      albumEnCours:   null,
      bibliotheque:   [],
      fileAttente:    [],
      artistesSuivis: [],

      setAlbumEnCours: (album) =>
        set({ albumEnCours: { ...album, startedAt: new Date().toISOString() } }),

      clearAlbumEnCours: () => set({ albumEnCours: null }),

      setPremiereImpression: (text) =>
        set((s) =>
          s.albumEnCours ? { albumEnCours: { ...s.albumEnCours, premiereImpression: text } } : {}
        ),

      addCritique: (critique) => {
        const entry: AlbumCritique = {
          id: nanoid(),
          dateCritique: new Date().toISOString().split('T')[0],
          ...critique,
        }
        set((s) => ({ bibliotheque: [entry, ...s.bibliotheque] }))
      },

      updateCritique: (id, updates) =>
        set((s) => ({
          bibliotheque: s.bibliotheque.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteCritique: (id) =>
        set((s) => ({ bibliotheque: s.bibliotheque.filter((a) => a.id !== id) })),

      addAlbumFile: (album) => {
        const entry: AlbumAttente = {
          id: nanoid(),
          dateAjout: new Date().toISOString().split('T')[0],
          ...album,
        }
        set((s) => ({ fileAttente: [entry, ...s.fileAttente] }))
      },

      removeFromFile: (id) =>
        set((s) => ({ fileAttente: s.fileAttente.filter((a) => a.id !== id) })),

      startListening: (id) => {
        const album = get().fileAttente.find((a) => a.id === id)
        if (!album) return
        set((s) => ({
          fileAttente: s.fileAttente.filter((a) => a.id !== id),
          albumEnCours: {
            titre:              album.titre,
            artiste:            album.artiste,
            pochette:           '',
            premiereImpression: '',
            startedAt:          new Date().toISOString(),
          },
        }))
      },

      followArtiste: (artiste) =>
        set((s) => ({
          artistesSuivis: [...s.artistesSuivis, { id: nanoid(), ...artiste }],
        })),

      updateArtiste: (id, updates) =>
        set((s) => ({
          artistesSuivis: s.artistesSuivis.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      unfollowArtiste: (id) =>
        set((s) => ({ artistesSuivis: s.artistesSuivis.filter((a) => a.id !== id) })),

      setArtisteAlerte: (id, alerte) =>
        set((s) => ({
          artistesSuivis: s.artistesSuivis.map((a) => (a.id === id ? { ...a, alerte } : a)),
        })),
    }),
    { 
      name: 'aetheris-music-v1',
      storage: createJSONStorage(() => firestoreStorage),
    },
  ),
)
