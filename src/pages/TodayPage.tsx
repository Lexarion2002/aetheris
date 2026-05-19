import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { useDroitStore } from '../store/droitStore'
import { useWritingStore } from '../store/writingStore'
import { useSportStore } from '../store/sportStore'
import { useCareerStore } from '../store/careerStore'
import { hasApiKey, suggestTodayTasks, type TodaySuggestion } from '../lib/aiService'
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
        {task.timeEstimate && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
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

  // ── Kit : suggestions du jour ─────────────────────────────────────────────
  const [kitItems,    setKitItems]    = useState<TodaySuggestion[]>([])
  const [kitLoading,  setKitLoading]  = useState(false)
  const [kitError,    setKitError]    = useState<string | null>(null)
  const [kitDismissed, setKitDismissed] = useState<Set<number>>(new Set())

  const kitEnabled = hasApiKey()
  const activeObjectives = useMemo(
    () => objectives.filter((o) => !o.archived && o.progress < 100),
    [objectives],
  )

  const cacheKey = `aetheris-kit-today-${today}`

  const fetchKit = async () => {
    if (!kitEnabled || activeObjectives.length === 0) return
    setKitLoading(true)
    setKitError(null)
    try {
      const recent = tasks.slice(-30)
      const items = await suggestTodayTasks({
        domains, objectives: activeObjectives, milestones, recentTasks: recent,
      }, 5)
      setKitItems(items)
      setKitDismissed(new Set())
      window.localStorage.setItem(cacheKey, JSON.stringify(items))
    } catch (err) {
      setKitError(err instanceof Error ? err.message : 'Erreur Kit')
    } finally {
      setKitLoading(false)
    }
  }

  // Auto-fetch au premier chargement de la journée
  useEffect(() => {
    if (!kitEnabled || activeObjectives.length === 0) return
    const cached = window.localStorage.getItem(cacheKey)
    if (cached) {
      try { setKitItems(JSON.parse(cached) as TodaySuggestion[]) }
      catch { /* ignore */ }
    } else {
      void fetchKit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today])

  const acceptKitSuggestion = (s: TodaySuggestion, idx: number) => {
    addTaskAction({
      domainId:     s.domainId,
      title:        s.title,
      status:       'todo',
      priority:     'medium',
      timeEstimate: s.timeEstimate,
      dueDate:      null,
      plannedDate:  today,
      objectiveId:  s.objectiveId,
      milestoneId:  s.milestoneId,
    })
    setKitDismissed((prev) => new Set(prev).add(idx))
  }

  const dismissKitSuggestion = (idx: number) => {
    setKitDismissed((prev) => new Set(prev).add(idx))
  }

  const visibleKit = kitItems.map((s, i) => ({ ...s, idx: i })).filter(s => !kitDismissed.has(s.idx))

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

      {/* ── Suggestions de Kit ──────────────────────────────────────────────── */}
      {kitEnabled && (visibleKit.length > 0 || kitLoading || kitError) && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--terra)' }}>
                ✦ kit suggère
              </span>
              {kitLoading && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  réflexion…
                </span>
              )}
            </div>
            <button
              onClick={() => void fetchKit()}
              disabled={kitLoading}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-3)',
                background: 'transparent', border: 0, cursor: kitLoading ? 'not-allowed' : 'pointer',
                padding: '4px 8px', borderRadius: 4,
              }}
            >
              {kitLoading ? '…' : '↻ regénérer'}
            </button>
          </div>

          {kitError && (
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)',
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--terra-soft)', border: '1px solid #DEB89C',
            }}>
              {kitError}
            </div>
          )}

          {!kitError && visibleKit.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {visibleKit.map((s) => {
                const dom = domains.find((d) => d.id === s.domainId)
                return (
                  <div
                    key={s.idx}
                    style={{
                      background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
                      borderRadius: 10, padding: '12px 14px',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'var(--ink-3)',
                      }}>
                        {dom?.name ?? '?'}
                      </span>
                      <span style={{ color: 'var(--ink-4)' }}>·</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10.5,
                        color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums',
                      }}>
                        {s.timeEstimate}m
                      </span>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--ink)',
                      lineHeight: 1.3, letterSpacing: '-0.005em',
                    }}>
                      {s.title}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-sans)', fontSize: 12,
                      fontStyle: 'italic', color: 'var(--ink-3)',
                      lineHeight: 1.4,
                    }}>
                      {s.reason}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button
                        onClick={() => acceptKitSuggestion(s, s.idx)}
                        style={{
                          flex: 1,
                          fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                          background: 'var(--terra)', color: 'var(--paper-1)',
                          border: 0, borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                        }}
                      >
                        + Planifier
                      </button>
                      <button
                        onClick={() => dismissKitSuggestion(s.idx)}
                        style={{
                          fontFamily: 'var(--font-sans)', fontSize: 12,
                          background: 'transparent', color: 'var(--ink-3)',
                          border: '1px solid var(--paper-2)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                        }}
                      >
                        Passer
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

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
