import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { firestoreStorage, db } from './firebase'
import { collection, getDocs } from 'firebase/firestore'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlbumTag =
  | 'ambient' | 'jazz' | 'rap' | 'rock' | 'electro' | 'classical' | 'soul'
  | 'rnb' | 'folk' | 'metal' | 'pop' | 'world' | 'experimental' | 'indie'

export interface AlbumCritique {
  id:                  string
  titre:               string
  artiste:             string
  dateOriginaleSortie: string
  pochette:            string
  note:                number
  tags:                AlbumTag[]
  critique:            string
  tracksFavorites:     string[]
  contexte:            string
  dateCritique:        string
}

export interface AlbumAttente {
  id:                  string
  titre:               string
  artiste:             string
  source:              string
  pourquoi:            string
  dateAjout:           string
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
  _hasHydrated:   boolean
  setHasHydrated: (state: boolean) => void

  fetchLibrary:   () => Promise<void>

  albumEnCours:   AlbumEnCours | null
  bibliotheque:   AlbumCritique[]
  fileAttente:    AlbumAttente[]
  artistesSuivis: ArtisteFollowed[]

  setAlbumEnCours:       (album: Omit<AlbumEnCours, 'startedAt'>) => void
  clearAlbumEnCours:     () => void
  setPremiereImpression: (text: string) => void

  addCritique:    (critique: Omit<AlbumCritique, 'id' | 'dateCritique'> & { id?: string }) => void
  updateCritique: (id: string, data: Partial<Omit<AlbumCritique, 'id'>>) => void
  deleteCritique: (id: string) => void

  addAlbumFile:   (album: Omit<AlbumAttente, 'id' | 'dateAjout'>) => void
  removeFromFile: (id: string) => void
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
      _hasHydrated:   false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      fetchLibrary: async () => {
        try {
          const snapshot = await getDocs(collection(db, 'aetheris_stores'))
          
          snapshot.forEach((document) => {
            if (document.id === 'aetheris-music-v1') {
              const rawData = document.data()?.value || document.data()
              const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
              
              if (parsed.state) {
                set(parsed.state)
              } else {
                set({ bibliotheque: parsed })
              }
            }
          })
        } catch (error) {
          console.error('[MusicStore] Erreur fetchLibrary:', error)
        }
      },

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
        set((s) => {
          const id = critique.id || crypto.randomUUID()
          // Sécurité absolue : si l'ID existe déjà, on le met à jour au lieu de le dupliquer
          if (s.bibliotheque.some((a) => a.id === id)) {
            return { bibliotheque: s.bibliotheque.map((a) => (a.id === id ? { ...a, ...critique } : a)) }
          }
          const entry: AlbumCritique = {
            id,
            dateCritique: new Date().toISOString().split('T')[0],
            ...(critique as Omit<AlbumCritique, 'id' | 'dateCritique'>),
          }
          return { bibliotheque: [entry, ...s.bibliotheque] }
        })
      },

      updateCritique: (id, data) =>
        set((s) => ({
          bibliotheque: s.bibliotheque.map((a) => (a.id === id ? { ...a, ...data } : a)),
        })),

      deleteCritique: (id) => {
        if (!id) return
        set((s) => {
          const exists = s.bibliotheque.some((a) => a.id === id)
          if (!exists) return s // Stoppe la mise à jour si l'ID est introuvable
          
          const filtered = s.bibliotheque.filter((a) => a.id !== id)
          
          // Protection anti-vide : si on passe de plusieurs albums à zéro, c'est une anomalie
          if (filtered.length === 0 && s.bibliotheque.length > 1) {
            return s
          }
          
          return { bibliotheque: filtered }
        })
      },

      addAlbumFile: (album) => {
        const entry: AlbumAttente = {
          id: crypto.randomUUID(),
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
          artistesSuivis: [...s.artistesSuivis, { id: crypto.randomUUID(), ...artiste }],
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
      onRehydrateStorage: () => (state) => {
        console.log('[MusicStore] 🔄 Hydratation terminée avec :', state?.bibliotheque)
        state?.setHasHydrated(true)
      },
    },
  ),
)
