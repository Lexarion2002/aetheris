import { nanoid } from '../utils/nanoid'
import { createPersistedStore } from '../lib/persistenceManager'

export type StoryStatus = 'active' | 'idea' | 'done'

export type Session = {
  id: string
  date: string
  duration: number
  note?: string
}

export type Story = {
  id: string
  title: string
  status: StoryStatus
  stage: string
  currentPoint?: string
  nextAction?: string
  sessions: Session[]
  completedAt?: string
}

type StoryInput = Omit<Story, 'id' | 'sessions'>
type StoryPatch = Partial<Omit<Story, 'id' | 'sessions' | 'status'>>
type SessionInput = Omit<Session, 'id' | 'date'>

export type WritingStore = {
  stories: Story[]

  setActiveStory: (patch: StoryPatch) => void
  addIdea: (title: string) => void
  activateIdea: (id: string) => { ok: boolean; reason?: string }
  completeActiveStory: () => void
  addSessionToActive: (input: SessionInput) => { ok: boolean; reason?: string }
  deleteSession: (storyId: string, sessionId: string) => void
}

const today = () => new Date().toISOString().split('T')[0]

const DEFAULT_STORIES: Story[] = [
  {
    id: 'story-active-1',
    title: 'La chambre sans fenêtre',
    status: 'active',
    stage: 'développement',
    currentPoint: "La narratrice comprend que le silence de l'immeuble n'est pas une absence.",
    nextAction: 'Écrire la scène où elle descend au troisième étage et trouve la porte déjà ouverte.',
    sessions: [
      {
        id: 'session-1',
        date: today(),
        duration: 45,
        note: 'Cage d’escalier et motif de la porte.',
      },
    ],
  },
  {
    id: 'story-idea-1',
    title: 'Le garçon qui gardait les clefs',
    status: 'idea',
    stage: 'idée',
    sessions: [],
  },
]

const hasActiveStory = (stories: Story[]) => stories.some((story) => story.status === 'active')

export const useWritingStore = createPersistedStore<WritingStore>(
  'aetheris-writing-v1',
  (set, get) => ({
    stories: DEFAULT_STORIES,

    setActiveStory: (patch) =>
      set((state) => {
        const active = state.stories.find((story) => story.status === 'active')
        if (!active) {
          const input: StoryInput = {
            title: patch.title?.trim() || 'Nouvelle sans titre',
            status: 'active',
            stage: patch.stage || 'idée',
            currentPoint: patch.currentPoint,
            nextAction: patch.nextAction,
            completedAt: patch.completedAt,
          }
          return {
            stories: [{ id: nanoid(), ...input, sessions: [] }, ...state.stories],
          }
        }

        return {
          stories: state.stories.map((story) =>
            story.id === active.id ? { ...story, ...patch, status: 'active' } : story,
          ),
        }
      }),

    addIdea: (title) => {
      const cleanTitle = title.trim()
      if (!cleanTitle) return
      set((state) => ({
        stories: [
          { id: nanoid(), title: cleanTitle, status: 'idea', stage: 'idée', sessions: [] },
          ...state.stories,
        ],
      }))
    },

    activateIdea: (id) => {
      const stories = get().stories
      if (hasActiveStory(stories)) return { ok: false, reason: 'Une nouvelle est déjà active.' }

      set((state) => ({
        stories: state.stories.map((story) =>
          story.id === id ? { ...story, status: 'active' } : story,
        ),
      }))
      return { ok: true }
    },

    completeActiveStory: () =>
      set((state) => ({
        stories: state.stories.map((story) =>
          story.status === 'active'
            ? { ...story, status: 'done', stage: 'terminé', completedAt: today() }
            : story,
        ),
      })),

    addSessionToActive: (input) => {
      const active = get().stories.find((story) => story.status === 'active')
      if (!active) return { ok: false, reason: 'Aucune nouvelle active.' }

      set((state) => ({
        stories: state.stories.map((story) =>
          story.id === active.id
            ? {
                ...story,
                sessions: [{ id: nanoid(), date: today(), ...input }, ...story.sessions],
              }
            : story,
        ),
      }))
      return { ok: true }
    },

    deleteSession: (storyId, sessionId) =>
      set((state) => ({
        stories: state.stories.map((story) =>
          story.id === storyId
            ? { ...story, sessions: story.sessions.filter((session) => session.id !== sessionId) }
            : story,
        ),
      })),
  }),
)
