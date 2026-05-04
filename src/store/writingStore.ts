import { nanoid } from '../utils/nanoid'
import { createPersistedStore } from '../lib/persistenceManager'

export type WritingStage =
  | 'idea'
  | 'opening'
  | 'development'
  | 'ending-found'
  | 'draft-complete'
  | 'revision'
  | 'done'

export type StoryStatus = 'active' | 'queued' | 'done'

export type WritingSession = {
  id: string
  date: string
  durationMinutes: number
  note?: string
  wordsWritten?: number
}

export type Story = {
  id: string
  title: string
  status: StoryStatus
  stage: WritingStage
  currentPoint?: string
  nextAction?: string
  startedAt?: string
  completedAt?: string
  sessions: WritingSession[]
  note?: string
}

type StoryDraft = Omit<Story, 'id' | 'sessions'>
type StoryPatch = Partial<Omit<Story, 'id' | 'sessions' | 'status'>>
type SessionDraft = Omit<WritingSession, 'id'>

export interface WritingState {
  stories: Story[]

  addStory: (story: StoryDraft) => { ok: boolean; reason?: string }
  updateStory: (id: string, patch: StoryPatch) => void
  activateStory: (id: string) => { ok: boolean; reason?: string }
  completeStory: (id: string, patch?: Pick<Story, 'note' | 'completedAt'>) => void
  addSession: (storyId: string, session: SessionDraft) => { ok: boolean; reason?: string }
  deleteSession: (storyId: string, sessionId: string) => void
}

const today = () => new Date().toISOString().split('T')[0]

const DEFAULT_STORIES: Story[] = [
  {
    id: 'story-active-1',
    title: 'La chambre sans fenêtre',
    status: 'active',
    stage: 'development',
    currentPoint: "La narratrice comprend que le silence de l'immeuble n'est pas une absence.",
    nextAction: 'Écrire la scène où elle descend au troisième étage et trouve la porte déjà ouverte.',
    startedAt: today(),
    sessions: [
      {
        id: 'session-1',
        date: today(),
        durationMinutes: 45,
        note: 'Mise en place du motif de la cage d’escalier.',
        wordsWritten: 620,
      },
    ],
  },
  {
    id: 'story-queued-1',
    title: 'Le garçon qui gardait les clefs',
    status: 'queued',
    stage: 'idea',
    currentPoint: 'Une idée de pacte minuscule, presque administratif.',
    nextAction: 'Trouver le geste final.',
    sessions: [],
  },
]

const hasActiveStory = (stories: Story[], exceptId?: string) =>
  stories.some((story) => story.status === 'active' && story.id !== exceptId)

export const useWritingStore = createPersistedStore<WritingState>(
  'aetheris-writing-v1',
  (set, get) => ({
    stories: DEFAULT_STORIES,

    addStory: (story) => {
      if (story.status === 'active' && hasActiveStory(get().stories)) {
        return { ok: false, reason: 'Une nouvelle est déjà active.' }
      }

      set((s) => ({
        stories: [
          {
            id: nanoid(),
            ...story,
            startedAt: story.status === 'active' ? (story.startedAt || today()) : story.startedAt,
            sessions: [],
          },
          ...s.stories,
        ],
      }))

      return { ok: true }
    },

    updateStory: (id, patch) =>
      set((s) => ({
        stories: s.stories.map((story) => (story.id === id ? { ...story, ...patch } : story)),
      })),

    activateStory: (id) => {
      const stories = get().stories
      if (hasActiveStory(stories, id)) return { ok: false, reason: 'Termine la nouvelle active avant d’en activer une autre.' }

      set((s) => ({
        stories: s.stories.map((story) =>
          story.id === id
            ? {
                ...story,
                status: 'active',
                startedAt: story.startedAt || today(),
                completedAt: undefined,
              }
            : story,
        ),
      }))

      return { ok: true }
    },

    completeStory: (id, patch) =>
      set((s) => ({
        stories: s.stories.map((story) =>
          story.id === id
            ? {
                ...story,
                ...patch,
                status: 'done',
                stage: 'done',
                completedAt: patch?.completedAt || today(),
              }
            : story,
        ),
      })),

    addSession: (storyId, session) => {
      const story = get().stories.find((item) => item.id === storyId)
      if (!story || story.status !== 'active') return { ok: false, reason: 'Aucune nouvelle active.' }
      if (!story.nextAction?.trim()) return { ok: false, reason: 'Définis une prochaine action avant de lancer une session.' }

      set((s) => ({
        stories: s.stories.map((item) =>
          item.id === storyId
            ? {
                ...item,
                sessions: [{ id: nanoid(), ...session }, ...item.sessions],
              }
            : item,
        ),
      }))

      return { ok: true }
    },

    deleteSession: (storyId, sessionId) =>
      set((s) => ({
        stories: s.stories.map((story) =>
          story.id === storyId
            ? { ...story, sessions: story.sessions.filter((session) => session.id !== sessionId) }
            : story,
        ),
      })),
  }),
)
