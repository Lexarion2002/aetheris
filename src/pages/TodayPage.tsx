import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { useDroitStore } from '../store/droitStore'
import { useWritingStore } from '../store/writingStore'
import { useSportStore } from '../store/sportStore'
import { useCareerStore } from '../store/careerStore'
import { suggestTodayTasks } from '../lib/aiService'
import { computeDailyStreak, type DailyStreak } from '../utils/streaks'
import type { Task } from '../types'
import type { Tache, SousTache } from '../store/droitStore'
import type { Story } from '../store/writingStore'
import type { WorkoutEntry } from '../store/sportStore'
import type { Mission } from '../store/careerStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayIso = () => new Date().toISOString().split('T')[0]

const DAYS_FR  = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']

function fmtToday(): string {
  const d = new Date()
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandidateItem {
  sourceType:  'task' | 'droit' | 'ecriture' | 'sport' | 'career'
  sourceId:    string
  label:       string
  sublabel?:   string
  domainGroup: string
  timeEstimate?: number
  objectiveId?: string
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

function adaptDroit(taches: Tache[], plannedTaskIds: Set<string>): CandidateItem[] {
  const items: CandidateItem[] = []
  for (const t of taches) {
    const progress = t.subtasks.length > 0
      ? Math.round((t.subtasks.filter((s: SousTache) => s.done).length / t.subtasks.length) * 100)
      : (t.manualProgress ?? 0)
    if (progress >= 100) continue
    if (t.subtasks.length > 0) {
      for (const st of t.subtasks.filter((s: SousTache) => !s.done)) {
        if (!plannedTaskIds.has(st.id)) {
          items.push({ sourceType: 'droit', sourceId: st.id, label: st.label, sublabel: t.matiere, domainGroup: 'Droit' })
        }
      }
    } else if (!plannedTaskIds.has(t.id)) {
      items.push({ sourceType: 'droit', sourceId: t.id, label: t.title, sublabel: t.matiere, domainGroup: 'Droit' })
    }
  }
  return items
}

function adaptEcriture(stories: Story[], plannedTaskIds: Set<string>): CandidateItem[] {
  return stories
    .filter((s: Story) => s.status === 'active' && !plannedTaskIds.has(s.id))
    .map((s: Story) => ({ sourceType: 'ecriture' as const, sourceId: s.id, label: `Écriture — ${s.title}`, domainGroup: 'Écriture' }))
}

function adaptSport(historique: WorkoutEntry[], plannedTaskIds: Set<string>): CandidateItem[] {
  const today = todayIso()
  const hasToday = historique.some((h: WorkoutEntry) => h.date === today)
  if (hasToday || plannedTaskIds.has('sport-today')) return []
  return [{ sourceType: 'sport' as const, sourceId: 'sport-today', label: 'Séance sport', domainGroup: 'Sport' }]
}

function adaptCareer(missions: Mission[], plannedTaskIds: Set<string>): CandidateItem[] {
  return missions
    .filter((m: Mission) => m.stade !== 'rendu' && !plannedTaskIds.has(m.id))
    .slice(0, 3)
    .map((m: Mission) => ({ sourceType: 'career' as const, sourceId: m.id, label: m.sujet, sublabel: m.commanditaire || undefined, domainGroup: 'Carrière' }))
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({ task, objective, onToggle, onUnplan }: {
  task:      Task
  objective: string | null
  onToggle:  () => void
  onUnplan:  () => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
        borderBottom: '1px solid var(--paper-2)',
        transition: 'background 120ms ease',
      }}
    >
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={task.status === 'done'}
        style={{
          width: 14, height: 14, flexShrink: 0, padding: 0,
          border: `1px solid ${task.status === 'done' ? 'var(--terra)' : 'var(--ink-4)'}`,
          background: task.status === 'done' ? 'var(--terra)' : 'transparent',
          borderRadius: 3, cursor: 'pointer', display: 'grid', placeItems: 'center',
          transition: 'background 180ms, border-color 180ms',
        }}
      >
        {task.status === 'done' && (
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none"
            stroke="var(--paper-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2,6.5 5,9 10,3" />
          </svg>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-serif)', fontSize: 16,
            color: task.status === 'done' ? 'var(--ink-3)' : 'var(--ink)',
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
            textDecorationColor: 'var(--ink-4)',
          }}>{task.title}</span>
          {objective && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', flexShrink: 0 }}>
              {objective}
            </span>
          )}
        </div>
        {task.notes && (
          <div style={{
            fontFamily: 'var(--font-sans)', fontStyle: 'italic',
            fontSize: 12, color: 'var(--ink-3)',
            marginTop: 3, lineHeight: 1.4,
          }}>
            {task.notes}
          </div>
        )}
        {task.timeEstimate && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2, display: 'inline-block' }}>
            {task.timeEstimate}m
          </span>
        )}
      </div>

      <button
        onClick={onUnplan}
        aria-label="Retirer du planning"
        style={{
          opacity: hover ? 0.6 : 0, background: 'transparent', border: 0,
          cursor: 'pointer', padding: 4, color: 'var(--ink-3)',
          fontSize: 18, lineHeight: 1, transition: 'opacity 180ms',
        }}
      >×</button>
    </div>
  )
}

// ─── ExternalRow ──────────────────────────────────────────────────────────────

function ExternalRow({ label, sublabel, done, onToggle, onRemove, last }: {
  label: string; sublabel?: string; done: boolean
  onToggle: () => void; onRemove: () => void; last: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
        borderBottom: last ? 'none' : '1px solid var(--paper-2)',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 14, height: 14, flexShrink: 0, padding: 0,
          border: `1px solid ${done ? 'var(--terra)' : 'var(--ink-4)'}`,
          background: done ? 'var(--terra)' : 'transparent',
          borderRadius: 3, cursor: 'pointer', display: 'grid', placeItems: 'center',
          transition: 'background 180ms, border-color 180ms',
        }}
      >
        {done && (
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none"
            stroke="var(--paper-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2,6.5 5,9 10,3" />
          </svg>
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: 16,
          color: done ? 'var(--ink-3)' : 'var(--ink)',
          textDecoration: done ? 'line-through' : 'none',
          textDecorationColor: 'var(--ink-4)',
        }}>{label}</span>
        {sublabel && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 2 }}>{sublabel}</div>
        )}
      </div>
      <button
        onClick={onRemove}
        style={{
          opacity: hover ? 0.6 : 0, background: 'transparent', border: 0,
          cursor: 'pointer', padding: 4, color: 'var(--ink-3)',
          fontSize: 18, lineHeight: 1, transition: 'opacity 180ms',
        }}
      >×</button>
    </div>
  )
}

// ─── QuickAddPanel ────────────────────────────────────────────────────────────

interface ExternalEntry {
  sourceType: CandidateItem['sourceType']
  sourceId:   string
  label:      string
  sublabel?:  string
  done:       boolean
}

// ─── StreakLine ───────────────────────────────────────────────────────────────

function StreakLine({ streak }: { streak: DailyStreak }) {
  const { current, best, activeToday } = streak

  const eyebrow = (text: string) => (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10.5,
      letterSpacing: '0.06em', color: 'var(--ink-3)',
    }}>
      {text}
    </div>
  )

  // Streak en cours
  if (current > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--font-serif)', fontVariantNumeric: 'tabular-nums',
            fontSize: 22, color: 'var(--terra)', fontWeight: 500,
          }}>
            {current}
          </span>
          <span style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 15, color: 'var(--ink-2)',
          }}>
            jour{current > 1 ? 's' : ''} d'affilée
          </span>
        </div>
        {eyebrow(
          activeToday
            ? (best > current ? `record · ${best} j` : 'record en cours')
            : `à maintenir · record ${best} j`,
        )}
      </div>
    )
  }

  // Pas de streak en cours mais historique → ton doux
  if (best > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
          une autre fois.
        </span>
        {eyebrow(`record · ${best} j`)}
      </div>
    )
  }

  // Aucun historique → invite à démarrer la série
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
        première séance.
      </span>
      {eyebrow('coche une tâche pour commencer')}
    </div>
  )
}

// ─── TodayPage ────────────────────────────────────────────────────────────────

export function TodayPage() {
  const tasks        = useStore((s) => s.tasks)
  const objectives   = useStore((s) => s.objectives)
  const milestones   = useStore((s) => s.milestones)
  const domains      = useStore((s) => s.domains)
  const timeSessions = useStore((s) => s.timeSessions)
  const setTaskStatus = useStore((s) => s.setTaskStatus)
  const updateTask   = useStore((s) => s.updateTask)
  const addTaskAction = useStore((s) => s.addTask)
  const deleteTaskAction = useStore((s) => s.deleteTask)

  const droitTaches    = useDroitStore((s) => s.taches)
  const writingStories = useWritingStore((s) => s.stories)
  const sportHistorique = useSportStore((s) => s.historique)
  const careerMissions = useCareerStore((s) => s.missions)

  const today = todayIso()

  // Streak quotidien — agrège l'activité de tous les stores qui ont des dates ISO exploitables
  const extraActivityDates = useMemo(() => {
    const dates: string[] = []
    for (const w of sportHistorique) if (w.date) dates.push(w.date)
    for (const story of writingStories) {
      for (const session of story.sessions) if (session.date) dates.push(session.date)
    }
    return dates
  }, [sportHistorique, writingStories])

  const streak = useMemo(
    () => computeDailyStreak(tasks, timeSessions, extraActivityDates),
    [tasks, timeSessions, extraActivityDates],
  )

  // Tasks du store principal planifiées pour aujourd'hui
  const plannedTasks = useMemo(
    () => tasks.filter((t) => t.plannedDate === today && t.status !== 'cancelled'),
    [tasks, today],
  )

  // Entrées externes (stores domaine) — état local de session
  const [externalItems, setExternalItems] = useState<ExternalEntry[]>([])
  const [panelOpen, setPanelOpen] = useState(false)

  const plannedTaskIds = useMemo(
    () => new Set([...plannedTasks.map((t) => t.id), ...externalItems.map((e) => e.sourceId)]),
    [plannedTasks, externalItems],
  )

  // Candidats multi-sources
  const candidates = useMemo((): CandidateItem[] => [
    ...adaptDroit(droitTaches, plannedTaskIds),
    ...adaptEcriture(writingStories, plannedTaskIds),
    ...adaptSport(sportHistorique, plannedTaskIds),
    ...adaptCareer(careerMissions, plannedTaskIds),
  ], [droitTaches, writingStories, sportHistorique, careerMissions, plannedTaskIds])

  // Tâches du store principal non encore planifiées pour aujourd'hui
  const taskCandidates = useMemo(
    () => tasks.filter((t) =>
      !t.plannedDate &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
    ).slice(0, 30),
    [tasks],
  )

  const groupedCandidates = useMemo(() => {
    const groups: Record<string, CandidateItem[]> = {}
    for (const item of candidates) {
      if (!groups[item.domainGroup]) groups[item.domainGroup] = []
      groups[item.domainGroup].push(item)
    }
    return groups
  }, [candidates])

  const addExternal = (item: CandidateItem) => {
    setExternalItems((prev) => [...prev, { ...item, done: false }])
  }

  const addTask = (t: Task) => {
    updateTask(t.id, { plannedDate: today })
  }

  const unplanTask = (id: string) => {
    updateTask(id, { plannedDate: null })
  }

  const toggleExternal = (sourceId: string) => {
    setExternalItems((prev) => prev.map((e) => e.sourceId === sourceId ? { ...e, done: !e.done } : e))
  }

  const removeExternal = (sourceId: string) => {
    setExternalItems((prev) => prev.filter((e) => e.sourceId !== sourceId))
  }

  const allItems = [...plannedTasks, ...externalItems]
  const doneCount = plannedTasks.filter((t) => t.status === 'done').length + externalItems.filter((e) => e.done).length
  const totalCount = allItems.length

  // ── Kit : auto-plan du jour ───────────────────────────────────────────────
  // Au premier ouverture du jour, Kit crée 3-5 tâches dans Planning du jour
  // sans rien demander. La raison de chaque tâche est stockée dans task.notes.

  const anthropicApiKey = useStore((s) => s.anthropicApiKey)
  const kitEnabled = !!anthropicApiKey
  const activeObjectives = useMemo(
    () => objectives.filter((o) => !o.archived && o.progress < 100),
    [objectives],
  )

  const AUTOPLAN_KEY = `aetheris-kit-autoplan-${today}`

  // Détecter si un Plan Kit semaine couvre la semaine en cours.
  // Si oui, l'auto-plan today s'efface : le plan semaine est la source unique.
  const weekStartIso = useMemo(() => {
    const d = new Date(today + 'T00:00:00')
    const daysSinceMonday = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - daysSinceMonday)
    return d.toISOString().split('T')[0]
  }, [today])
  const WEEKPLAN_KEY = `aetheris-kit-weekplan-${weekStartIso}`

  interface WeekPlanRecord {
    ranAt:     string
    weekStart: string
    taskIds:   string[]
  }

  const [weekPlanRecord] = useState<WeekPlanRecord | null>(() => {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(WEEKPLAN_KEY)
    if (!raw) return null
    try { return JSON.parse(raw) as WeekPlanRecord } catch { return null }
  })

  // Le plan semaine est considéré actif s'il existe ET qu'au moins une de ses
  // tâches survit encore parmi les plannedTasks d'aujourd'hui (sinon l'user a
  // tout supprimé → on revient à l'auto-plan today).
  const weekPlanActive = useMemo(() => {
    if (!weekPlanRecord) return false
    return weekPlanRecord.taskIds.some((id) => tasks.some((t) => t.id === id && t.plannedDate === today))
  }, [weekPlanRecord, tasks, today])

  interface AutoplanRecord {
    ranAt:   string    // ISO timestamp
    taskIds: string[]  // IDs des tâches créées par Kit
  }

  const [autoplan, setAutoplan] = useState<AutoplanRecord | null>(() => {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(AUTOPLAN_KEY)
    if (!raw) return null
    try { return JSON.parse(raw) as AutoplanRecord } catch { return null }
  })
  const [autoplanLoading, setAutoplanLoading] = useState(false)
  const [autoplanError,   setAutoplanError]   = useState<string | null>(null)

  const runAutoplan = async (regenerate = false) => {
    if (autoplanLoading || !kitEnabled || activeObjectives.length === 0) return
    setAutoplanLoading(true)
    setAutoplanError(null)
    try {
      // Si on regénère, on supprime d'abord les tâches Kit précédentes
      if (regenerate && autoplan) {
        for (const id of autoplan.taskIds) deleteTaskAction(id)
      }

      const scheduleBlocks = useStore.getState().scheduleBlocks
      const items = await suggestTodayTasks({
        domains, objectives: activeObjectives, milestones,
        recentTasks: tasks.slice(-30),
        scheduleBlocks,
      }, 5)

      const newIds: string[] = []
      for (const item of items) {
        const created = addTaskAction({
          domainId:     item.domainId,
          title:        item.title,
          notes:        item.reason,
          status:       'todo',
          priority:     'medium',
          timeEstimate: item.timeEstimate,
          dueDate:      null,
          plannedDate:  today,
          objectiveId:  item.objectiveId,
          milestoneId:  item.milestoneId,
        })
        newIds.push(created.id)
      }

      const record: AutoplanRecord = { ranAt: new Date().toISOString(), taskIds: newIds }
      window.localStorage.setItem(AUTOPLAN_KEY, JSON.stringify(record))
      setAutoplan(record)
    } catch (err) {
      setAutoplanError(err instanceof Error ? err.message : 'Erreur Kit')
    } finally {
      setAutoplanLoading(false)
    }
  }

  // Auto-déclenchement au premier ouverture du jour
  useEffect(() => {
    if (!kitEnabled || activeObjectives.length === 0) return
    if (weekPlanActive) return            // le plan semaine fait le travail
    if (autoplan) return                  // déjà tourné aujourd'hui
    if (plannedTasks.length >= 3) return  // utilisateur déjà bien planifié
    void runAutoplan(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, kitEnabled, activeObjectives.length, weekPlanActive])

  // Compte de tâches Kit encore présentes (pour l'affichage du bandeau)
  const kitTasksRemaining = useMemo(() => {
    if (!autoplan) return 0
    return autoplan.taskIds.filter(id => plannedTasks.some(t => t.id === id)).length
  }, [autoplan, plannedTasks])

  return (
    <div style={{ padding: '8px 0 80px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 14 }}>
          Aujourd'hui
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.015em', color: 'var(--ink)' }}>
            {fmtToday()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, paddingBottom: 4, flexShrink: 0 }}>
            <StreakLine streak={streak} />
            {totalCount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{doneCount}</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink-3)', fontStyle: 'italic' }}>sur</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{totalCount}</span>
                </div>
                <div style={{ width: 140, height: 2, background: 'var(--paper-2)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`, height: '100%', background: 'var(--sage)', transition: 'width 320ms ease' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Bandeau Kit (auto-plan) — toujours visible quand Kit est activé ── */}
      {kitEnabled && (() => {
        const state =
          weekPlanActive                        ? 'weekplan'
          : autoplanLoading                     ? 'loading'
          : autoplanError                       ? 'error'
          : autoplan                            ? 'ran'
          : activeObjectives.length === 0       ? 'no-objectives'
          : plannedTasks.length >= 3            ? 'already-busy'
          : 'idle'

        const isError = state === 'error'
        const isInfo = state === 'no-objectives' || state === 'already-busy'

        return (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, marginBottom: 24, padding: '10px 16px',
            background: isError ? 'var(--terra-soft)' : 'var(--paper-1)',
            border: '1px solid ' + (isError ? '#DEB89C' : 'var(--paper-2)'),
            borderRadius: 10, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, flex: 1 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--terra)' }}>
                ✦ kit
              </span>
              {state === 'weekplan' && weekPlanRecord && (
                <>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink-2)' }}>
                    issu du plan de semaine généré le{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                      {new Date(weekPlanRecord.ranAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </span>
                </>
              )}
              {state === 'loading' && (
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontStyle: 'italic', color: 'var(--ink-2)' }}>
                  organise ta journée…
                </span>
              )}
              {state === 'error' && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)' }}>
                  {autoplanError}
                </span>
              )}
              {state === 'ran' && autoplan && (
                <>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink-2)' }}>
                    a planifié à <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                      {new Date(autoplan.ranAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <span style={{ color: 'var(--ink-4)' }}>·</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                    {kitTasksRemaining}/{autoplan.taskIds.length} restantes
                  </span>
                </>
              )}
              {state === 'no-objectives' && (
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontStyle: 'italic', color: 'var(--ink-2)' }}>
                  attend un objectif actif pour proposer un plan.{' '}
                  <a href="/week" style={{ color: 'var(--terra)', textDecoration: 'underline', fontStyle: 'normal' }}>
                    Créer un objectif →
                  </a>
                </span>
              )}
              {state === 'already-busy' && (
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontStyle: 'italic', color: 'var(--ink-2)' }}>
                  ta journée est déjà bien remplie — Kit ne planifie pas par-dessus.
                </span>
              )}
              {state === 'idle' && (
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontStyle: 'italic', color: 'var(--ink-2)' }}>
                  prêt à planifier ta journée.
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {state === 'weekplan' && (
                <a
                  href="/week"
                  style={{
                    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)',
                    background: 'transparent', border: '1px solid var(--paper-2)',
                    borderRadius: 6, padding: '4px 10px',
                    textDecoration: 'none',
                  }}
                >
                  Voir Semaine →
                </a>
              )}
              {(state === 'ran' || state === 'error') && (
                <button
                  onClick={() => void runAutoplan(true)}
                  disabled={autoplanLoading}
                  style={{
                    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)',
                    background: 'transparent', border: '1px solid var(--paper-2)',
                    borderRadius: 6, padding: '4px 10px',
                    cursor: autoplanLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  ↻ Regénérer
                </button>
              )}
              {(state === 'already-busy' || state === 'idle') && (
                <button
                  onClick={() => void runAutoplan(false)}
                  disabled={autoplanLoading || (state === 'already-busy' && activeObjectives.length === 0)}
                  style={{
                    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                    color: 'var(--paper-1)', background: 'var(--terra)',
                    border: 0, borderRadius: 6, padding: '4px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {isInfo ? 'Forcer' : 'Planifier'}
                </button>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Liste des items ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 24, color: 'var(--ink)', margin: 0 }}>
            Planning du jour
          </h2>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
              background: panelOpen ? 'var(--paper-2)' : 'var(--terra)',
              color: panelOpen ? 'var(--ink-2)' : 'var(--paper-1)',
              border: 0, borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
              transition: 'background 180ms, color 180ms',
            }}
          >
            + Planifier
          </button>
        </div>

        {/* Panel de sélection */}
        {panelOpen && (
          <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>

            {/* Tâches génériques */}
            {taskCandidates.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
                  Tâches
                </div>
                {taskCandidates.map((t) => {
                  const obj = objectives.find((o) => o.id === t.objectiveId)
                  return (
                    <button
                      key={t.id}
                      onClick={() => addTask(t)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 2,
                        width: '100%', textAlign: 'left', background: 'transparent',
                        border: 0, cursor: 'pointer', padding: '6px 8px', borderRadius: 6,
                        transition: 'background 120ms',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>{t.title}</span>
                      {obj && (
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontStyle: 'italic', color: 'var(--ink-3)' }}>{obj.title}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Sources domaine */}
            {Object.entries(groupedCandidates).map(([group, items]) => (
              <div key={group} style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
                  {group}
                </div>
                {items.map((item) => (
                  <button
                    key={item.sourceId}
                    onClick={() => addExternal(item)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 2,
                      width: '100%', textAlign: 'left', background: 'transparent',
                      border: 0, cursor: 'pointer', padding: '6px 8px', borderRadius: 6,
                      transition: 'background 120ms',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>{item.label}</span>
                    {item.sublabel && (
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontStyle: 'italic', color: 'var(--ink-3)' }}>{item.sublabel}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}

            {taskCandidates.length === 0 && Object.keys(groupedCandidates).length === 0 && (
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 14, margin: 0 }}>
                Tout est planifié.
              </p>
            )}

            <div style={{ marginTop: 12, borderTop: '1px solid var(--paper-2)', paddingTop: 12 }}>
              <button
                onClick={() => setPanelOpen(false)}
                style={{ background: 'transparent', border: '1px solid var(--paper-2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)' }}
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Liste */}
        {totalCount === 0 ? (
          <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, padding: '24px 22px', fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>
            Rien de planifié · commence par ajouter une tâche
          </div>
        ) : (
          <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, overflow: 'hidden' }}>
            {plannedTasks.map((task) => {
              const obj = objectives.find((o) => o.id === task.objectiveId)
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  objective={obj?.title ?? null}
                  onToggle={() => setTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                  onUnplan={() => unplanTask(task.id)}
                />
              )
            })}
            {externalItems.map((item, i) => (
              <ExternalRow
                key={item.sourceId}
                label={item.label}
                sublabel={item.sublabel}
                done={item.done}
                onToggle={() => toggleExternal(item.sourceId)}
                onRemove={() => removeExternal(item.sourceId)}
                last={i === externalItems.length - 1 && plannedTasks.length === 0}
              />
            ))}
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--paper-2)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                {doneCount} sur {totalCount} fait{doneCount > 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        )}
      </section>

    </div>
  )
}
