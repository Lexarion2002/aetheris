import { nanoid } from '../utils/nanoid'
import { createPersistedStore } from '../lib/persistenceManager'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WritingArc {
  id:          string
  name:        string
  description: string
  philosopher?: string
  isActive:    boolean
  order:       number
}

export interface WritingCharacter {
  id:                  string
  name:                string
  deathSurvival:       string   // façon de mourir/survivre
  relationToHadrie:    string
  revealsAboutHadrie:  string
  philosophy?:         string
  createdAt:           string
}

export interface WritingFragment {
  id:        string
  text:      string
  date:      string   // YYYY-MM-DD
  createdAt: string
}

export interface DailySession {
  id:        string
  date:      string   // YYYY-MM-DD
  text:      string
  createdAt: string
}

export interface WritingCitation {
  id:          string
  type:        'citation' | 'extract' | 'reference'
  text:        string
  author?:     string
  ownExtract?: boolean
  createdAt:   string
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface WritingState {
  lastSentence:    string
  moodKeywords:    string[]
  chapterCurrent:  number
  chapterTotal:    number
  arcs:            WritingArc[]
  characters:      WritingCharacter[]
  fragments:       WritingFragment[]
  dailySessions:   DailySession[]
  citations:       WritingCitation[]

  updateLastSentence:    (sentence: string) => void
  updateMood:            (keywords: string[]) => void
  updateChapterProgress: (current: number, total: number) => void

  addArc:            (arc: Omit<WritingArc, 'id'>) => void
  updateArc:         (id: string, updates: Partial<Omit<WritingArc, 'id'>>) => void
  deleteArc:         (id: string) => void
  setActiveArc:      (id: string) => void
  addArcPhilosopher: (id: string, philosopher: string) => void

  addCharacter:    (char: Omit<WritingCharacter, 'id' | 'createdAt'>) => void
  updateCharacter: (id: string, updates: Partial<Omit<WritingCharacter, 'id' | 'createdAt'>>) => void
  deleteCharacter: (id: string) => void

  addFragment:    (text: string) => void
  deleteFragment: (id: string) => void

  recordDailySession: (text: string) => void

  addCitation:    (citation: Omit<WritingCitation, 'id' | 'createdAt'>) => void
  deleteCitation: (id: string) => void
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_ARCS: WritingArc[] = [
  { id: 'arc-1', name: 'Passivité',  description: "Hadrie subit. Le monde lui arrive dessus sans qu'il ne choisisse rien.", isActive: true,  order: 0 },
  { id: 'arc-2', name: 'Survie',     description: "Le corps continue même quand l'esprit voudrait s'arrêter.",              isActive: false, order: 1 },
  { id: 'arc-3', name: 'Conscience', description: "Hadrie commence à voir les règles du jeu. À les nommer.",               isActive: false, order: 2 },
  { id: 'arc-4', name: 'Choix',      description: "Pour la première fois, Hadrie décide. Quelle qu'en soit le prix.",      isActive: false, order: 3 },
]

// ─── Store ────────────────────────────────────────────────────────────────────

const now   = () => new Date().toISOString()
const today = () => new Date().toISOString().split('T')[0]

export const useWritingStore = createPersistedStore<WritingState>(
  'aetheris-writing-v1',
  (set) => ({
      lastSentence:   '',
      moodKeywords:   ['tension', 'absurde', 'silence', 'sang'],
      chapterCurrent: 1,
      chapterTotal:   12,
      arcs:           DEFAULT_ARCS,
      characters:     [],
      fragments:      [],
      dailySessions:  [],
      citations:      [],

      // ── Novel meta ──────────────────────────────────────────────────────────

      updateLastSentence: (sentence) => set({ lastSentence: sentence }),

      updateMood: (keywords) => set({ moodKeywords: keywords }),

      updateChapterProgress: (current, total) =>
        set({ chapterCurrent: current, chapterTotal: total }),

      // ── Arcs ────────────────────────────────────────────────────────────────

      addArc: (arc) =>
        set((s) => ({ arcs: [...s.arcs, { id: nanoid(), ...arc }] })),

      updateArc: (id, updates) =>
        set((s) => ({
          arcs: s.arcs.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteArc: (id) =>
        set((s) => ({ arcs: s.arcs.filter((a) => a.id !== id) })),

      setActiveArc: (id) =>
        set((s) => ({
          arcs: s.arcs.map((a) => ({ ...a, isActive: a.id === id })),
        })),

      addArcPhilosopher: (id, philosopher) =>
        set((s) => ({
          arcs: s.arcs.map((a) => (a.id === id ? { ...a, philosopher } : a)),
        })),

      // ── Characters ──────────────────────────────────────────────────────────

      addCharacter: (char) =>
        set((s) => ({
          characters: [...s.characters, { id: nanoid(), createdAt: now(), ...char }],
        })),

      updateCharacter: (id, updates) =>
        set((s) => ({
          characters: s.characters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteCharacter: (id) =>
        set((s) => ({ characters: s.characters.filter((c) => c.id !== id) })),

      // ── Fragments ───────────────────────────────────────────────────────────

      addFragment: (text) =>
        set((s) => ({
          fragments: [
            { id: nanoid(), text, date: today(), createdAt: now() },
            ...s.fragments,
          ],
        })),

      deleteFragment: (id) =>
        set((s) => ({ fragments: s.fragments.filter((f) => f.id !== id) })),

      // ── Daily sessions ──────────────────────────────────────────────────────

      recordDailySession: (text) =>
        set((s) => {
          const t = today()
          const exists = s.dailySessions.some((d) => d.date === t)
          if (exists) {
            return {
              dailySessions: s.dailySessions.map((d) =>
                d.date === t ? { ...d, text, createdAt: now() } : d,
              ),
            }
          }
          return {
            dailySessions: [
              { id: nanoid(), date: t, text, createdAt: now() },
              ...s.dailySessions,
            ],
          }
        }),

      // ── Citations ───────────────────────────────────────────────────────────

      addCitation: (citation) =>
        set((s) => ({
          citations: [
            { id: nanoid(), createdAt: now(), ...citation },
            ...s.citations,
          ],
        })),

      deleteCitation: (id) =>
        set((s) => ({ citations: s.citations.filter((c) => c.id !== id) })),
  }),
)
