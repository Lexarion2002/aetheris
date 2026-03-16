import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from '../utils/nanoid'
import { firestoreStorage } from './firebase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlbumTag =
  | 'ambient' | 'jazz' | 'rap' | 'rock' | 'electro' | 'classical' | 'soul'
  | 'rnb' | 'folk' | 'metal' | 'pop' | 'world' | 'experimental' | 'indie'

export interface AlbumEntry {
  id:                  string
  titre:               string
  artiste:             string
  pochette:            string
  dateAjout:           string
  note:                number | null
  critique?:           string
  dateCritique?:       string
  source?:             string
  pourquoi?:           string
  dateAttendueSortie?: string
  dateOriginaleSortie?:string
  tags?:               AlbumTag[]
  tracksFavorites?:    string[]
  contexte?:           string
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
  albums:         AlbumEntry[]
  artistesSuivis: ArtisteFollowed[]

  setAlbumEnCours:       (album: Omit<AlbumEnCours, 'startedAt'>) => void
  clearAlbumEnCours:     () => void
  setPremiereImpression: (text: string) => void

  addAlbum:       (album: Omit<AlbumEntry, 'id' | 'dateAjout' | 'note'> & { note?: number | null }) => void
  updateAlbum:    (id: string, updates: Partial<Omit<AlbumEntry, 'id'>>) => void
  deleteAlbum:    (id: string) => void
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
      albums:         [],
      artistesSuivis: [],

      setAlbumEnCours: (album) =>
        set({ albumEnCours: { ...album, startedAt: new Date().toISOString() } }),

      clearAlbumEnCours: () => set({ albumEnCours: null }),

      setPremiereImpression: (text) =>
        set((s) =>
          s.albumEnCours ? { albumEnCours: { ...s.albumEnCours, premiereImpression: text } } : {}
        ),

      addAlbum: (album) => {
        const entry: AlbumEntry = {
          id: nanoid(),
          dateAjout: new Date().toISOString().split('T')[0],
          note: album.note ?? null,
          ...album,
        }
        set((s) => ({ albums: [entry, ...s.albums] }))
      },

      updateAlbum: (id, updates) =>
        set((s) => ({
          albums: s.albums.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteAlbum: (id) =>
        set((s) => ({ albums: s.albums.filter((a) => a.id !== id) })),

      startListening: (id) => {
        const album = get().albums.find((a) => a.id === id)
        if (!album) return
        set({
          albumEnCours: {
            titre:              album.titre,
            artiste:            album.artiste,
            pochette:           album.pochette || '',
            premiereImpression: '',
            startedAt:          new Date().toISOString(),
          },
        })
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
