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

const DEFAULT_PIPELINE: NouvelleEnCours[] = [
  {
    id: 'verre',
    stage: 'draft',
    title: "Le verre d'eau",
    genre: 'realiste',
    synopsis: "Un homme commande de l'eau dans un bar et y reste jusqu'à la fermeture.",
    startedAt: '11.05',
    daysInStage: 0,
    deadline: '15.05.2026',
    motsCouches: 0,
    objectifMots: 1200,
    numero: 19,
    active: true,
    derniereNote: {
      date: '10.05',
      contenu:
        "Tenir la scène en huis clos. Pas de flash-back. La fin doit basculer en deux phrases — pas trois.",
    },
  },
  {
    id: 'marees',
    stage: 'plan',
    title: 'Marées',
    genre: 'fantastique',
    synopsis: '',
    startedAt: '07.05',
    daysInStage: 4,
    deadline: '',
    motsCouches: 0,
    objectifMots: 1200,
    numero: 20,
    active: false,
  },
  {
    id: 'rossini',
    stage: 'plan',
    title: 'Le banc de la place Rossini',
    genre: 'realiste',
    synopsis: '',
    startedAt: '09.05',
    daysInStage: 2,
    deadline: '',
    motsCouches: 0,
    objectifMots: 1200,
    numero: 21,
    active: false,
  },
  {
    id: 'lazare',
    stage: 'idee',
    title: 'Saint-Lazare, dimanche',
    genre: 'noire',
    synopsis: '',
    startedAt: '03.05',
    daysInStage: 8,
    deadline: '',
    motsCouches: 0,
    objectifMots: 1200,
    numero: 22,
    active: false,
  },
  {
    id: 'metro',
    stage: 'idee',
    title: 'Concerto pour métro',
    genre: 'realiste',
    synopsis: '',
    startedAt: '06.05',
    daysInStage: 5,
    deadline: '',
    motsCouches: 0,
    objectifMots: 1200,
    numero: 23,
    active: false,
  },
  {
    id: 'locataire',
    stage: 'idee',
    title: 'Le dernier locataire',
    genre: 'noire',
    synopsis: '',
    startedAt: '10.05',
    daysInStage: 1,
    deadline: '',
    motsCouches: 0,
    objectifMots: 1200,
    numero: 24,
    active: false,
  },
]

const DEFAULT_HISTORY: NouvelleTerminee[] = [
  { id: 'h1', title: 'Brouillard de Cantal', genre: 'noire', date: '08 mai 2026', days: 6, note: 'fin trop sèche, à revoir un jour' },
  { id: 'h2', title: 'La fenêtre du 5e', genre: 'fantastique', date: '01 mai 2026', days: 7, note: 'voix juste, je garde' },
  { id: 'h3', title: 'Le rendez-vous de mardi', genre: 'realiste', date: '24 avril 2026', days: 5, note: 'petite, mais propre' },
  { id: 'h4', title: 'Petite musique de Marseille', genre: 'realiste', date: '17 avril 2026', days: 8, note: 'à relire avec Joaquim' },
  { id: 'h5', title: 'Hivernage', genre: 'noire', date: '10 avril 2026', days: 7, note: 'trouvé la fin sur le tard' },
  { id: 'h6', title: 'Le coiffeur du dimanche', genre: 'realiste', date: '03 avril 2026', days: 6, note: '' },
  { id: 'h7', title: "Mémoire d'une rue à Naples", genre: 'fantastique', date: '27 mars 2026', days: 9, note: 'la plus longue ; je creuserai' },
]

const DEFAULT_IDEAS: Idee[] = [
  { id: 'i1', title: 'Trois sœurs, une seule lettre', pitch: "Trois femmes reçoivent la même lettre, mais l'écriture n'est celle d'aucune des trois.", genre: 'fantastique', date: '09.05', age: 2 },
  { id: 'i2', title: "L'homme qui collectionne les vendredis", pitch: "Il garde chaque vendredi dans une boîte. Un jour, il en manque un.", genre: 'realiste', date: '06.05', age: 5 },
  { id: 'i3', title: 'Le moineau de la place', pitch: 'Une vieille dame nourrit le même moineau depuis 1971.', genre: 'realiste', date: '02.05', age: 9 },
  { id: 'i4', title: "Mémoire de l'eau", pitch: "Un puits qui se souvient. Le narrateur ne se souvient plus.", genre: 'noire', date: '28.04', age: 13 },
  { id: 'i5', title: 'La voisine du dessus écoute', pitch: "Pas un thriller — juste de la tendresse à l'envers.", genre: 'noire', date: '22.04', age: 19 },
  { id: 'i6', title: "Avant l'éclipse", pitch: "Le dernier jour avant que le soleil se cache, tout le monde se met à dire la vérité.", genre: 'fantastique', date: '18.04', age: 23 },
  { id: 'i7', title: "Un quart d'heure d'avance", pitch: "Il arrive toujours quinze minutes en avance. Personne n'a jamais rien remarqué.", genre: 'realiste', date: '14.04', age: 27 },
  { id: 'i8', title: "Lettre d'une absente", pitch: "Une lettre arrive au bureau de poste d'un village sans habitants depuis dix ans.", genre: 'fantastique', date: '09.04', age: 32 },
]

// ─── Store ────────────────────────────────────────────────────────────────────

const todayDDMM = () => {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}`
}

export const useEcritureStore = createPersistedStore<EcritureStore>(
  'aetheris-ecriture-v1',
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
