import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useLawStore } from '../store/lawStore'
import type { LawState } from '../store/lawStore'
import { useCareerStore } from '../store/careerStore'
import type { CareerState } from '../store/careerStore'
import { useWritingStore } from '../store/writingStore'
import type { WritingState } from '../store/writingStore'
import { usePomodoroStore } from '../store/pomodoroStore'
import { useMusicStore } from '../store/musicStore'
import type { MusicState } from '../store/musicStore'
import { AddDomainModal } from '../components/AddDomainModal'
import { useState } from 'react'
import type { Domain, Task, Transaction, SavingsGoal } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const daysUntil = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

const todayStr = () => new Date().toISOString().split('T')[0]

const fmtShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

function truncateWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= max) return text
  return words.slice(0, max).join(' ') + '…'
}

// ─── Urgency jalon ────────────────────────────────────────────────────────────

interface Jalon {
  label:   string
  date:    string
  domain?: string
}

function computeMainJalon(
  tasks: Task[],
  law: { grandOralDate: string | null; rapportDate: string | null },
  missions: Array<{ sujet: string; deadline: string | null }>,
): Jalon | null {
  const today = todayStr()
  const candidates: Jalon[] = []

  if (law.grandOralDate) candidates.push({ label: 'Grand Oral', date: law.grandOralDate, domain: 'Droit' })
  if (law.rapportDate)   candidates.push({ label: 'Rapport de stage', date: law.rapportDate, domain: 'Droit' })

  missions.filter((m) => m.deadline).forEach((m) =>
    candidates.push({ label: truncateWords(m.sujet, 5), date: m.deadline!, domain: 'Carrière' }),
  )

  tasks
    .filter((t) => t.dueDate && t.status !== 'done' && t.status !== 'cancelled')
    .forEach((t) => candidates.push({ label: truncateWords(t.title, 6), date: t.dueDate! }))

  return (
    candidates
      .filter((c) => c.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  )
}

// ─── Today actions ────────────────────────────────────────────────────────────

interface TodayAction {
  label:    string
  domain:   string
  taskId?:  string
  daysLeft: number
  urgency:  0 | 1 | 2   // 0 = overdue/today, 1 = 1-2 days, 2 = this week
}

function computeTodayActions(
  domains: Domain[],
  tasks: Task[],
  missions: Array<{ id: string; sujet: string; deadline: string | null; stade: string }>,
  law: { grandOralDate: string | null; rapportDate: string | null },
): TodayAction[] {
  const actions: TodayAction[] = []

  // All active tasks due this week
  tasks
    .filter((t) => t.dueDate && t.status !== 'done' && t.status !== 'cancelled')
    .forEach((t) => {
      const days = daysUntil(t.dueDate!)
      if (days === null || days > 7) return
      const dom = domains.find((d) => d.id === t.domainId)
      actions.push({
        label:    t.title,
        domain:   dom?.name ?? '—',
        taskId:   t.id,
        daysLeft: days,
        urgency:  days <= 0 ? 0 : days <= 2 ? 1 : 2,
      })
    })

  // Career missions: relecture or redaction with close deadline
  missions
    .filter((m) => m.deadline && ['redaction', 'relecture'].includes(m.stade))
    .forEach((m) => {
      const days = daysUntil(m.deadline!)
      if (days === null || days > 7) return
      actions.push({
        label:    `Mission : ${truncateWords(m.sujet, 5)}`,
        domain:   'Carrière',
        daysLeft: days,
        urgency:  days <= 0 ? 0 : days <= 2 ? 1 : 2,
      })
    })

  // Law jalons if close
  ;[
    { label: 'Grand Oral', date: law.grandOralDate },
    { label: 'Rapport de stage', date: law.rapportDate },
  ].forEach(({ label, date }) => {
    const days = daysUntil(date)
    if (days === null || days > 7) return
    actions.push({ label, domain: 'Droit', daysLeft: days, urgency: days <= 0 ? 0 : days <= 2 ? 1 : 2 })
  })

  return actions
    .sort((a, b) => a.urgency - b.urgency || a.daysLeft - b.daysLeft)
    .slice(0, 3)
}

// ─── Finance helpers ──────────────────────────────────────────────────────────

function computeMonthBalance(transactions: Transaction[]): number {
  const key = new Date().toISOString().slice(0, 7) // YYYY-MM
  return transactions
    .filter((t) => t.date.startsWith(key))
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
}

function topSavingsGoal(goals: SavingsGoal[]): SavingsGoal | null {
  return goals.filter((g) => g.currentAmount < g.targetAmount).sort((a, b) => b.currentAmount / b.targetAmount - a.currentAmount / a.targetAmount)[0] ?? goals[0] ?? null
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  // Stores
  const domains      = useStore((s) => s.domains)
  const tasks        = useStore((s) => s.tasks)
  const transactions = useStore((s) => s.transactions)
  const savingsGoals = useStore((s) => s.savingsGoals)
  const userContext  = useStore((s) => s.userContext)
  const setUserContext = useStore((s) => s.setUserContext)
  const pomSettings  = useStore((s) => s.pomodoroSettings)
  const law          = useLawStore()
  const career       = useCareerStore()
  const writing      = useWritingStore()
  const pom          = usePomodoroStore()
  const music        = useMusicStore()

  // Computed
  const weekType = career.statusSemaine === 'semaine_academique' ? 'cours' : 'cabinet'
  const hasCareerInfo = !!(career.cabinetInfo.nom || career.cabinetInfo.maitreStage)

  const mainJalon = useMemo(
    () => computeMainJalon(tasks, law, career.missions),
    [tasks, law.grandOralDate, law.rapportDate, career.missions],
  )

  const todayActions = useMemo(
    () => computeTodayActions(domains, tasks, career.missions, law),
    [domains, tasks, career.missions, law.grandOralDate, law.rapportDate],
  )

  const monthBalance = useMemo(() => computeMonthBalance(transactions), [transactions])
  const topGoal      = useMemo(() => topSavingsGoal(savingsGoals), [savingsGoals])

  const todayTxTotal = useMemo(() => {
    const today = todayStr()
    return transactions
      .filter((t) => t.type === 'expense' && t.date === today)
      .reduce((s, t) => s + t.amount, 0)
  }, [transactions])

  // Writing: last session date
  const lastWritingDays = useMemo(() => {
    if (writing.dailySessions.length === 0) return null
    const latest = writing.dailySessions
      .map((s) => s.date)
      .sort()
      .at(-1)
    if (!latest) return null
    const d = daysUntil(latest + 'T23:59:59')
    return d !== null ? Math.abs(d) : null
  }, [writing.dailySessions])

  const activeArc = writing.arcs.find((a) => a.isActive) ?? writing.arcs[0]

  // Pomodoro launch helper
  const launchPom = (taskId: string) => {
    if (pom.status !== 'idle') return
    pom.init(taskId, pomSettings.focusDuration * 60)
    pom.startTimer()
    navigate('/focus')
  }

  return (
    <div className="space-y-10 py-2">

      {/* ── 1. HEADER ─────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        {/* Date + week type */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--fg-subtle)] mb-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {hasCareerInfo && (
              <p className="text-sm text-[var(--fg-muted)]">
                Tu es en{' '}
                <span className={weekType === 'cabinet' ? 'text-blue-400 font-medium' : 'text-purple-400 font-medium'}>
                  semaine {weekType}
                </span>
                {weekType === 'cabinet' && career.cabinetInfo.nom ? ` — ${career.cabinetInfo.nom}` : ''}
              </p>
            )}
          </div>

          {/* User context input */}
          <input
            className="bg-transparent border border-[var(--border)] text-[var(--fg-muted)] text-xs rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-[var(--border-strong)] focus:text-[var(--fg)] placeholder-[var(--fg-subtle)] text-right"
            placeholder="Contexte (3 mots)"
            value={userContext}
            maxLength={30}
            onChange={(e) => setUserContext(e.target.value)}
          />
        </div>

        {/* Jalon urgent */}
        {mainJalon ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-6 py-5">
            <p className="text-xs text-[var(--fg-subtle)] mb-1 uppercase tracking-wide font-medium">Prochain jalon critique</p>
            <div className="flex items-end gap-4">
              <span className={`text-4xl font-bold tabular-nums leading-none ${
                (daysUntil(mainJalon.date) ?? 99) <= 7
                  ? 'text-red-400'
                  : (daysUntil(mainJalon.date) ?? 99) <= 21
                  ? 'text-amber-400'
                  : 'text-[var(--fg)]'
              }`}>
                {daysUntil(mainJalon.date) === 0
                  ? "Aujourd'hui"
                  : daysUntil(mainJalon.date) !== null && daysUntil(mainJalon.date)! < 0
                  ? 'En retard'
                  : `J−${daysUntil(mainJalon.date)}`}
              </span>
              <div className="pb-1">
                <p className="text-base font-semibold text-[var(--fg)] leading-tight">{mainJalon.label}</p>
                <p className="text-xs text-[var(--fg-subtle)] mt-0.5">
                  {mainJalon.domain && <span className="text-[var(--fg-muted)]">{mainJalon.domain} · </span>}
                  {fmtShortDate(mainJalon.date)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-6 py-4 text-sm text-[var(--fg-subtle)]">
            Aucun jalon urgent — tu es à jour.
          </div>
        )}
      </section>

      {/* ── 2. DOMAIN COCKPIT GRID ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--fg-subtle)]">Domaines</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 text-xs text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] transition-colors"
          >
            <span className="text-sm leading-none">+</span>
            Nouveau
          </button>
        </div>

        {domains.length === 0 ? (
          <EmptyState onAdd={() => setShowModal(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Finance + Musique hidden from generic loop — have dedicated cockpits */}
            {domains
              .filter((d) => !['finance', 'finances', 'musique'].includes(d.name.trim().toLowerCase()))
              .map((domain) => (
                <DomainCockpit
                  key={domain.id}
                  domain={domain}
                  tasks={tasks.filter((t) => t.domainId === domain.id)}
                  law={law}
                  career={career}
                  writing={writing}
                  lastWritingDays={lastWritingDays}
                  activeArc={activeArc}
                />
              ))}

            {/* Music cockpit — always shown */}
            <MusicCockpit music={music} />

            {/* Finance cockpit — always shown */}
            <FinanceCockpit
              balance={monthBalance}
              topGoal={topGoal}
              todayExpenses={todayTxTotal}
            />
          </div>
        )}
      </section>

      {/* ── 3. FLUX DU JOUR ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--fg-subtle)] mb-4">
          Aujourd'hui — Actions prioritaires
        </h2>

        {todayActions.length === 0 ? (
          <p className="text-sm text-[var(--fg-subtle)] py-4">
            Pas d'actions critiques pour aujourd'hui.
          </p>
        ) : (
          <div className="space-y-2">
            {todayActions.map((action, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                  action.urgency === 0
                    ? 'border-red-500/20 bg-red-500/5'
                    : action.urgency === 1
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-[var(--border)] bg-[var(--bg-elev)]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-medium uppercase tracking-wide ${
                      action.urgency === 0 ? 'text-red-500' :
                      action.urgency === 1 ? 'text-amber-500' : 'text-[var(--fg-subtle)]'
                    }`}>
                      {action.domain}
                    </span>
                    <span className={`text-[10px] ${
                      action.urgency === 0 ? 'text-red-400' :
                      action.urgency === 1 ? 'text-amber-400' : 'text-[var(--fg-subtle)]'
                    }`}>
                      {action.daysLeft <= 0
                        ? action.daysLeft === 0 ? "Aujourd'hui" : `${Math.abs(action.daysLeft)}j de retard`
                        : `J−${action.daysLeft}`}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--fg)] font-medium truncate">{action.label}</p>
                </div>

                {action.taskId && pom.status === 'idle' && (
                  <button
                    onClick={() => launchPom(action.taskId!)}
                    className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--terra-soft)] text-[var(--terra)] border border-[var(--terra-soft)] hover:opacity-80 transition-colors"
                  >
                    ▶ Focus
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && <AddDomainModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

// ─── DomainCockpit ────────────────────────────────────────────────────────────

interface DomainCockpitProps {
  domain:         Domain
  tasks:          Task[]
  law:            LawState
  career:         CareerState
  writing:        WritingState
  lastWritingDays: number | null
  activeArc:      WritingState['arcs'][number] | undefined
}

function DomainCockpit({ domain, tasks, law, career, writing, lastWritingDays, activeArc }: DomainCockpitProps) {
  const navigate = useNavigate()
  const name     = domain.name.trim().toLowerCase()

  const go = () => navigate(`/domain/${domain.id}`)

  // ── Droit ──────────────────────────────────────────────────────────────────
  if (name === 'droit') {
    const goD = daysUntil(law.grandOralDate)
    const rpD = daysUntil(law.rapportDate)
    const STATUT_LABELS: Record<string, string> = {
      recherches:    'Recherches',
      redaction:     'Rédaction',
      repetition:    'Répétition',
      finalisation:  'Finalisation',
    }

    return (
      <button onClick={go} className={cockpitCls()}>
        <CockpitHeader domain={domain} />
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--fg-muted)]">Grand Oral</span>
            <span className={goD !== null && goD <= 7 ? 'text-red-400 font-semibold' : 'text-[var(--fg)]'}>
              {goD !== null ? (goD === 0 ? "Aujourd'hui" : `J−${goD}`) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--fg-muted)]">Rapport</span>
            <span className={rpD !== null && rpD <= 7 ? 'text-amber-400 font-semibold' : 'text-[var(--fg)]'}>
              {rpD !== null ? (rpD === 0 ? "Aujourd'hui" : `J−${rpD}`) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
            <span className="text-[var(--fg-muted)]">Stade</span>
            <span className="text-[var(--fg)] font-medium">{STATUT_LABELS[law.globalStatus] ?? law.globalStatus}</span>
          </div>
          {tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--fg-muted)]">Tâches actives</span>
              <span className="text-[var(--fg)]">{tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length}</span>
            </div>
          )}
        </div>
        <CockpitFooter label="Ouvrir Droit" />
      </button>
    )
  }

  // ── Carrière ───────────────────────────────────────────────────────────────
  if (name === 'carrière') {
    const activeMissions = career.missions.filter((m) => m.stade !== 'rendu')
    const currentMission = activeMissions.sort((a, b) => {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return a.deadline.localeCompare(b.deadline)
    })[0]
    const STADE_LABELS: Record<string, string> = {
      briefing:   'Briefing',
      recherches: 'Recherches',
      redaction:  'Rédaction',
      relecture:  'En relecture',
      rendu:      'Rendu',
    }
    const monthStr = new Date().toISOString().slice(0, 7)
    const renduesCeMois = career.missionsArchives.filter((a) => a.archivedAt.startsWith(monthStr)).length
    const lastArchive = career.missionsArchives[0]

    return (
      <button onClick={go} className={cockpitCls()}>
        <CockpitHeader domain={domain} />
        <div className="space-y-1.5 text-xs">
          {currentMission ? (
            <>
              <p className="text-[var(--fg)] font-medium leading-snug truncate">{truncateWords(currentMission.sujet, 6)}</p>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--paper-3)] text-[var(--fg-muted)]">
                  {STADE_LABELS[currentMission.stade] ?? currentMission.stade}
                </span>
                {currentMission.deadline && (
                  <span className="text-[var(--fg-muted)]">
                    J−{Math.max(0, daysUntil(currentMission.deadline) ?? 0)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-[var(--fg-subtle)] italic">Aucune mission active</p>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
            <span className="text-[var(--fg-muted)]">Rendues ce mois</span>
            <span className="text-[var(--fg)]">{renduesCeMois}</span>
          </div>
          {lastArchive && (
            <p className="text-[var(--fg-subtle)] truncate">Dernière : {lastArchive.competenceDeveloppee}</p>
          )}
        </div>
        <CockpitFooter label="Ouvrir Carrière" />
      </button>
    )
  }

  // ── Écriture ───────────────────────────────────────────────────────────────
  if (name === 'écriture') {
    return (
      <button onClick={go} className={cockpitCls()}>
        <CockpitHeader domain={domain} />
        <div className="space-y-2 text-xs">
          {writing.lastSentence ? (
            <p className="text-[var(--fg-muted)] italic leading-snug">
              "{truncateWords(writing.lastSentence, 10)}"
            </p>
          ) : (
            <p className="text-[var(--fg-subtle)] italic">Aucune phrase enregistrée</p>
          )}
          {activeArc && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--fg-muted)]">Arc en cours</span>
              <span className="text-[var(--fg)] font-medium">
                {activeArc.name} — {activeArc.order}/{writing.arcs.length}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
            <span className="text-[var(--fg-muted)]">Dernière session</span>
            <span className="text-[var(--fg-muted)]">
              {lastWritingDays === null
                ? '—'
                : lastWritingDays === 0
                ? "Aujourd'hui"
                : `il y a ${lastWritingDays}j`}
            </span>
          </div>
        </div>
        <CockpitFooter label="Ouvrir Écriture" />
      </button>
    )
  }

  // ── Generic domain ─────────────────────────────────────────────────────────
  const activeTasks  = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled')
  const nextDeadline = activeTasks
    .filter((t) => t.dueDate)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0]

  return (
    <button onClick={go} className={cockpitCls()}>
      <CockpitHeader domain={domain} />
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[var(--fg-muted)]">Tâches actives</span>
          <span className="text-[var(--fg)]">{activeTasks.length}</span>
        </div>
        {nextDeadline && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--fg-muted)] truncate mr-2">{truncateWords(nextDeadline.title, 5)}</span>
            <span className={`shrink-0 ${(daysUntil(nextDeadline.dueDate!) ?? 99) <= 3 ? 'text-red-400' : 'text-[var(--fg-muted)]'}`}>
              {fmtShortDate(nextDeadline.dueDate!)}
            </span>
          </div>
        )}
      </div>
      <CockpitFooter label={`Ouvrir ${domain.name}`} />
    </button>
  )
}

// ─── FinanceCockpit ───────────────────────────────────────────────────────────

function FinanceCockpit({
  balance,
  topGoal,
  todayExpenses,
}: {
  balance:       number
  topGoal:       SavingsGoal | null
  todayExpenses: number
}) {
  const navigate = useNavigate()
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  const goalPct = topGoal && topGoal.targetAmount > 0 ? Math.round((topGoal.currentAmount / topGoal.targetAmount) * 100) : 0

  return (
    <button
      onClick={() => navigate('/finances')}
      className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 text-left transition-all duration-150 outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-focus)] hover:bg-[var(--paper-2)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm bg-[var(--paper-3)]">💶</span>
          <span className="text-sm font-semibold text-[var(--fg)]">Finances</span>
        </div>
        <span className="text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)] transition-colors text-xs">→</span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[var(--fg-muted)]">Solde du mois</span>
          <span className={`font-semibold tabular-nums ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {balance >= 0 ? '+' : ''}{fmt(balance)}
          </span>
        </div>

        {topGoal && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[var(--fg-muted)] truncate mr-2">{truncateWords(topGoal.title, 4)}</span>
              <span className="text-[var(--fg-muted)] shrink-0">{goalPct}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-[var(--paper-3)]">
              <div
                className="h-1 rounded-full bg-[var(--terra)] transition-all duration-500"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>
        )}

        {todayExpenses > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
            <span className="text-[var(--fg-muted)]">Dépenses aujourd'hui</span>
            <span className="text-[var(--fg-muted)]">{fmt(todayExpenses)}</span>
          </div>
        )}
      </div>

      <p className="mt-auto text-[10px] text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)] transition-colors">
        Ouvrir Finances →
      </p>
    </button>
  )
}

// ─── MusicCockpit ─────────────────────────────────────────────────────────────

function MusicCockpit({ music }: { music: MusicState }) {
  const navigate = useNavigate()
  const lastCritique = music.bibliotheque[0]
  const pantheonCount = music.bibliotheque.filter((a) => a.note >= 9).length

  return (
    <button
      onClick={() => navigate('/musique')}
      className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 text-left transition-all duration-150 outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-focus)] hover:bg-[var(--paper-2)]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm bg-[var(--paper-3)]">🎵</span>
          <span className="text-sm font-semibold text-[var(--fg)]">Musique</span>
        </div>
        <span className="text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)] transition-colors text-xs">→</span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[var(--fg-muted)]">Critiques</span>
          <span className="text-[var(--fg)] tabular-nums">{music.bibliotheque.length}</span>
        </div>
        {lastCritique && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--fg-muted)] truncate mr-2">Dernière</span>
            <span className="text-[var(--fg-muted)] truncate max-w-[120px]">
              {truncateWords(lastCritique.titre, 4)}
            </span>
          </div>
        )}
        {pantheonCount > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
            <span className="text-[var(--fg-muted)]">Panthéon (9-10)</span>
            <span className="text-amber-400 tabular-nums">{pantheonCount}</span>
          </div>
        )}
        {music.albumEnCours && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--fg-muted)]">En écoute</span>
            <span className="text-[var(--fg-muted)] truncate max-w-[120px]">
              {truncateWords(music.albumEnCours.titre, 4)}
            </span>
          </div>
        )}
      </div>

      <p className="mt-auto text-[10px] transition-colors text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)]">
        Ouvrir Musique →
      </p>
    </button>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function cockpitCls() {
  return [
    'group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 text-left',
    'transition-all duration-150 outline-none',
    'hover:bg-[var(--paper-2)]',
    'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
  ].join(' ')
}

function CockpitHeader({ domain }: { domain: Domain }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm bg-[var(--paper-3)]">
          {domain.icon}
        </span>
        <span className="text-sm font-semibold text-[var(--fg)]">{domain.name}</span>
      </div>
      <span className="text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)] transition-colors text-xs">→</span>
    </div>
  )
}

function CockpitFooter({ label }: { label: string }) {
  return (
    <p className="mt-auto text-[10px] transition-colors text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)]">
      {label} →
    </p>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]">
        <span className="text-xl text-[var(--fg-subtle)] select-none">✦</span>
      </div>
      <p className="text-base font-medium text-[var(--fg)]">Bienvenue dans Aetheris</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--fg-subtle)]">
        Crée ton premier domaine pour commencer à organiser ta vie.
      </p>
      <button
        onClick={onAdd}
        className="mt-8 flex items-center gap-2 rounded-xl bg-[var(--terra-soft)] border border-[var(--terra-soft)] px-6 py-3 text-sm font-medium text-[var(--terra)] hover:opacity-80 transition-colors"
      >
        <span className="text-base leading-none">+</span>
        Créer mon premier domaine
      </button>
    </div>
  )
}
