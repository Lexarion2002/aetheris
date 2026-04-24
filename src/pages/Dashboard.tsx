import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Landmark } from 'lucide-react'
import { useStore } from '../store'
import { useLawStore } from '../store/lawStore'
import { useCareerStore } from '../store/careerStore'
import { useWritingStore } from '../store/writingStore'
import { usePomodoroStore } from '../store/pomodoroStore'
import { useMusicStore } from '../store/musicStore'
import { useSportStore } from '../store/sportStore'
import { useBookStore } from '../store/bookStore'
import { useFilmSerieStore } from '../store/filmSerieStore'
import { useShoppingStore } from '../store/shoppingStore'
import { AddDomainModal } from '../components/AddDomainModal'
import { getDomainIcon } from '../utils/domainColors'
import type { Domain, Task, Transaction, SavingsGoal } from '../types'

// ─── Locale ───────────────────────────────────────────────────────────────────

const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
const DAYS   = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
const cap    = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function getWeekNumber(d: Date): number {
  const date   = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const daysUntil = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}
const todayStr   = () => new Date().toISOString().split('T')[0]
const weekAgoStr = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] }
const fmtDate    = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

function trunc(text: string, max: number): string {
  const words = text.trim().split(/\s+/)
  return words.length <= max ? text : words.slice(0, max).join(' ') + '…'
}

// ─── Finance helpers ──────────────────────────────────────────────────────────

function computeMonthBalance(transactions: Transaction[]): number {
  const key = new Date().toISOString().slice(0, 7)
  return transactions
    .filter(t => t.date.startsWith(key))
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
}

function topSavingsGoal(goals: SavingsGoal[]): SavingsGoal | null {
  return (
    goals
      .filter(g => g.currentAmount < g.targetAmount)
      .sort((a, b) => b.currentAmount / b.targetAmount - a.currentAmount / a.targetAmount)[0] ??
    goals[0] ?? null
  )
}

// ─── Today actions ────────────────────────────────────────────────────────────

interface TodayAction {
  label:   string
  domain:  string
  taskId?: string
  daysLeft: number
  urgency:  0 | 1 | 2
}

function computeTodayActions(
  domains: Domain[],
  tasks: Task[],
  missions: Array<{ id: string; sujet: string; deadline: string | null; stade: string }>,
  law: { grandOralDate: string | null; rapportDate: string | null },
): TodayAction[] {
  const actions: TodayAction[] = []

  tasks
    .filter(t => t.dueDate && t.status !== 'done' && t.status !== 'cancelled')
    .forEach(t => {
      const days = daysUntil(t.dueDate!)
      if (days === null || days > 7) return
      const dom = domains.find(d => d.id === t.domainId)
      actions.push({ label: t.title, domain: dom?.name ?? '—', taskId: t.id, daysLeft: days, urgency: days <= 0 ? 0 : days <= 2 ? 1 : 2 })
    })

  missions
    .filter(m => m.deadline && ['redaction', 'relecture'].includes(m.stade))
    .forEach(m => {
      const days = daysUntil(m.deadline!)
      if (days === null || days > 7) return
      actions.push({ label: `Mission : ${trunc(m.sujet, 5)}`, domain: 'Carrière', daysLeft: days, urgency: days <= 0 ? 0 : days <= 2 ? 1 : 2 })
    })

  ;[
    { label: 'Grand Oral',       date: law.grandOralDate },
    { label: 'Rapport de stage', date: law.rapportDate   },
  ].forEach(({ label, date }) => {
    const days = daysUntil(date)
    if (days === null || days > 7) return
    actions.push({ label, domain: 'Droit', daysLeft: days, urgency: days <= 0 ? 0 : days <= 2 ? 1 : 2 })
  })

  return actions.sort((a, b) => a.urgency - b.urgency || a.daysLeft - b.daysLeft)
}

// ─── DashHeader ───────────────────────────────────────────────────────────────

function DashHeader({
  date, doneCount, totalCount, weekType, hasCareerInfo, cabinetNom,
}: {
  date:          Date
  doneCount:     number
  totalCount:    number
  weekType:      string
  hasCareerInfo: boolean
  cabinetNom:    string
}) {
  const pct = totalCount > 0 ? doneCount / totalCount : 0

  return (
    <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, marginBottom: 48 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          <span>Aujourd'hui</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span>semaine {getWeekNumber(date)}</span>
        </div>

        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 'clamp(40px, 5vw, 60px)', lineHeight: 1.05, letterSpacing: '-0.015em', color: 'var(--ink)' }}>
          {cap(DAYS[date.getDay()])}{' '}
          <span style={{ color: 'var(--ink-2)' }}>{date.getDate()}</span>{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--ink-2)' }}>{MONTHS[date.getMonth()]}</span>
        </div>

        {hasCareerInfo && (
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 14, maxWidth: '48ch' }}>
            {weekType === 'cabinet'
              ? `Semaine cabinet${cabinetNom ? ` · ${cabinetNom}` : ''}.`
              : 'Semaine académique.'}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, paddingBottom: 8, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          Avancement du jour
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 36, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{doneCount}</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink-3)', fontStyle: 'italic' }}>sur</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 36, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{totalCount}</span>
        </div>
        <div style={{ width: 180, height: 3, background: 'var(--paper-2)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--sage)', transition: 'width 320ms ease' }} />
        </div>
      </div>
    </header>
  )
}

// ─── OngoingCard ──────────────────────────────────────────────────────────────

function OngoingCard({
  label, title, meta, kicker, progress, progressLabel,
  icon: IconComp, onClick,
}: {
  label:         string
  title:         string
  meta:          string
  kicker:        string
  progress:      number
  progressLabel: string
  icon:          React.ComponentType<{ size: number }> | null
  onClick:       () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--paper-1)',
        border: `1px solid ${hover ? 'var(--ink-4)' : 'var(--paper-2)'}`,
        borderRadius: 12, padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 14, minHeight: 168,
        cursor: 'pointer', transition: 'border-color var(--dur) var(--ease)',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {IconComp && <IconComp size={15} />}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            {label}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontStyle: 'italic', color: 'var(--ink-3)' }}>
          {kicker}
        </span>
      </div>

      <div>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, lineHeight: 1.15, color: 'var(--ink)', letterSpacing: '-0.005em', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>
          {meta}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ height: 2, background: 'var(--paper-2)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, height: '100%', background: 'var(--terra)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
            {progressLabel}
          </span>
          <ArrowUpRight size={14} style={{ color: hover ? 'var(--terra)' : 'var(--ink-3)', transition: 'color var(--dur) var(--ease)' }} />
        </div>
      </div>
    </div>
  )
}

// ─── TodaySection ─────────────────────────────────────────────────────────────

function TodayGroup({
  groupLabel, actions, pomIdle, launchPom,
}: {
  groupLabel: string
  actions:    TodayAction[]
  pomIdle:    boolean
  launchPom:  (taskId: string) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px 8px', background: 'var(--paper)', borderBottom: '1px solid var(--paper-2)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          {groupLabel}
        </span>
        <div style={{ height: 1, background: 'var(--paper-2)', flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{actions.length}</span>
      </div>
      {actions.map((action, i) => (
        <TodayRow key={i} action={action} pomIdle={pomIdle} launchPom={launchPom} />
      ))}
    </div>
  )
}

function TodayRow({
  action, pomIdle, launchPom,
}: {
  action:    TodayAction
  pomIdle:   boolean
  launchPom: (id: string) => void
}) {
  const [hover, setHover] = useState(false)
  const overdue = action.daysLeft < 0
  const today   = action.daysLeft === 0
  const urgencyLabel = overdue
    ? `${Math.abs(action.daysLeft)}j retard`
    : today ? "Aujourd'hui"
    : `J−${action.daysLeft}`

  const dotBg = action.urgency === 0
    ? (overdue ? 'var(--danger)' : 'var(--terra)')
    : action.urgency === 1 ? 'var(--warn)' : 'transparent'
  const dotBorder = action.urgency === 2 ? '1.5px solid var(--ink-4)' : 'none'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '80px 14px 1fr auto',
        alignItems: 'center', gap: 16, padding: '12px 18px',
        borderBottom: '1px solid var(--paper-2)',
        background: hover ? 'var(--paper-1)' : 'transparent',
        transition: 'background var(--dur) var(--ease)',
      }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: action.urgency === 0 ? 'var(--danger)' : 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
        {urgencyLabel}
      </span>

      <span style={{ width: 8, height: 8, borderRadius: 999, background: dotBg, border: dotBorder, display: 'inline-block', flexShrink: 0 }} />

      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 450, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {action.label}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
          {action.domain}
        </div>
      </div>

      {action.taskId && pomIdle && (
        <button
          onClick={() => launchPom(action.taskId!)}
          style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 6, border: 0, background: 'var(--terra-soft)', color: 'var(--terra)', cursor: 'pointer' }}>
          Focus
        </button>
      )}
    </div>
  )
}

function TodaySection({ actions, pomIdle, launchPom }: { actions: TodayAction[]; pomIdle: boolean; launchPom: (id: string) => void }) {
  const urgent = actions.filter(a => a.urgency === 0)
  const week   = actions.filter(a => a.urgency > 0)

  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 28, color: 'var(--ink)', margin: 0 }}>
          Aujourd'hui
        </h2>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
          {actions.length > 0 ? `${actions.length} action${actions.length > 1 ? 's' : ''}` : "Rien d'urgent · tu es à jour"}
        </span>
      </div>

      {actions.length === 0 ? (
        <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, padding: '24px 22px', fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Pas d'actions critiques cette semaine.
        </div>
      ) : (
        <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, overflow: 'hidden' }}>
          {urgent.length > 0 && <TodayGroup groupLabel="Urgent" actions={urgent} pomIdle={pomIdle} launchPom={launchPom} />}
          {week.length > 0  && <TodayGroup groupLabel="Cette semaine" actions={week} pomIdle={pomIdle} launchPom={launchPom} />}
        </div>
      )}
    </section>
  )
}

// ─── DomainCard ───────────────────────────────────────────────────────────────

function DomainCard({ domain, primary, unit, secondary, onClick }: {
  domain:    Domain
  primary:   string
  unit:      string
  secondary: string
  onClick:   () => void
}) {
  const Icon  = getDomainIcon(domain.name)
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left', fontFamily: 'inherit',
        background: 'var(--paper-1)',
        border: `1px solid ${hover ? 'var(--ink-4)' : 'var(--paper-2)'}`,
        borderRadius: 12, padding: '18px 20px 20px',
        display: 'flex', flexDirection: 'column', gap: 14,
        cursor: 'pointer', minHeight: 148,
        transition: 'border-color var(--dur) var(--ease)',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: hover ? 'var(--terra-soft)' : 'var(--paper-2)', color: hover ? 'var(--terra-deep)' : 'var(--ink-2)', display: 'grid', placeItems: 'center', transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)' }}>
          {Icon ? <Icon size={18} /> : <span style={{ fontSize: 16 }}>{domain.icon}</span>}
        </div>
        <ArrowUpRight size={14} style={{ color: hover ? 'var(--terra)' : 'var(--ink-4)', transition: 'color var(--dur) var(--ease)' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.005em' }}>
          {domain.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>{primary}</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>{unit}</span>
        </div>
      </div>

      {secondary && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-2)', fontStyle: 'italic', paddingTop: 10, borderTop: '1px solid var(--paper-2)' }}>
          {secondary}
        </div>
      )}
    </button>
  )
}

function FinanceDomainCard({ balance, topGoal, onNavigate }: { balance: number; topGoal: SavingsGoal | null; onNavigate: () => void }) {
  const [hover, setHover] = useState(false)
  const goalPct = topGoal && topGoal.targetAmount > 0 ? Math.round((topGoal.currentAmount / topGoal.targetAmount) * 100) : 0

  return (
    <button
      onClick={onNavigate}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left', fontFamily: 'inherit',
        background: 'var(--paper-1)',
        border: `1px solid ${hover ? 'var(--ink-4)' : 'var(--paper-2)'}`,
        borderRadius: 12, padding: '18px 20px 20px',
        display: 'flex', flexDirection: 'column', gap: 14,
        cursor: 'pointer', minHeight: 148,
        transition: 'border-color var(--dur) var(--ease)',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: hover ? 'var(--terra-soft)' : 'var(--paper-2)', color: hover ? 'var(--terra-deep)' : 'var(--ink-2)', display: 'grid', placeItems: 'center', transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)' }}>
          <Landmark size={18} />
        </div>
        <ArrowUpRight size={14} style={{ color: hover ? 'var(--terra)' : 'var(--ink-4)', transition: 'color var(--dur) var(--ease)' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.005em' }}>
          Finances
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: balance >= 0 ? 'var(--sage-deep)' : 'var(--danger)' }}>
            {balance >= 0 ? '+' : ''}{fmtEur(balance)}
          </span>
        </div>
        {topGoal && (
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>{trunc(topGoal.title, 4)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{goalPct}%</span>
            </div>
            <div style={{ height: 2, background: 'var(--paper-2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${goalPct}%`, height: '100%', background: 'var(--terra)' }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-2)', fontStyle: 'italic', paddingTop: 10, borderTop: '1px solid var(--paper-2)' }}>
        {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
      </div>
    </button>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', textAlign: 'center' }}>
      <div style={{ marginBottom: 24, width: 56, height: 56, borderRadius: 16, border: '1px solid var(--paper-2)', background: 'var(--paper-1)', display: 'grid', placeItems: 'center', fontSize: 22, color: 'var(--ink-3)' }}>
        ✦
      </div>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)', margin: 0 }}>Bienvenue dans Aetheris</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-3)', marginTop: 8, marginBottom: 0, maxWidth: '36ch' }}>
        Crée ton premier domaine pour commencer à organiser ta vie.
      </p>
      <button
        onClick={onAdd}
        style={{ marginTop: 32, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, padding: '10px 24px', borderRadius: 10, background: 'var(--terra-soft)', border: '1px solid var(--terra-soft)', color: 'var(--terra)', cursor: 'pointer' }}>
        + Créer mon premier domaine
      </button>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  // ── Stores ────────────────────────────────────────────────────────────────
  const domains      = useStore(s => s.domains)
  const tasks        = useStore(s => s.tasks)
  const transactions = useStore(s => s.transactions)
  const savingsGoals = useStore(s => s.savingsGoals)
  const pomSettings  = useStore(s => s.pomodoroSettings)
  const law          = useLawStore()
  const career       = useCareerStore()
  const writing      = useWritingStore()
  const pom          = usePomodoroStore()
  const music        = useMusicStore()
  const sport        = useSportStore()
  const books        = useBookStore()
  const films        = useFilmSerieStore()
  const shopping     = useShoppingStore()

  const today    = new Date()
  const monthStr = today.toISOString().slice(0, 7)
  const waStr    = weekAgoStr()

  // ── Computed ──────────────────────────────────────────────────────────────
  const weekType      = career.statusSemaine === 'semaine_academique' ? 'académique' : 'cabinet'
  const hasCareerInfo = !!(career.cabinetInfo.nom || career.cabinetInfo.maitreStage)
  const cabinetNom    = career.cabinetInfo.nom ?? ''

  const doneCount  = useMemo(() => tasks.filter(t => t.status === 'done').length, [tasks])
  const totalCount = useMemo(() => tasks.filter(t => t.status !== 'cancelled').length, [tasks])

  const monthBalance = useMemo(() => computeMonthBalance(transactions), [transactions])
  const topGoal      = useMemo(() => topSavingsGoal(savingsGoals), [savingsGoals])
  const todayTxTotal = useMemo(() => {
    const d = todayStr()
    return transactions.filter(t => t.type === 'expense' && t.date === d).reduce((s, t) => s + t.amount, 0)
  }, [transactions])

  const todayActions = useMemo(
    () => computeTodayActions(domains, tasks, career.missions, law),
    [domains, tasks, career.missions, law.grandOralDate, law.rapportDate],
  )

  // Writing
  const activeArc = writing.arcs.find(a => a.isActive) ?? writing.arcs[0]
  const lastWritingDays = useMemo(() => {
    const latest = writing.dailySessions.map(s => s.date).sort().at(-1)
    if (!latest) return null
    const d = daysUntil(latest + 'T23:59:59')
    return d !== null ? Math.abs(d) : null
  }, [writing.dailySessions])
  const writingSessionsWeek = writing.dailySessions.filter(s => s.date >= waStr).length
  const writingDomain       = domains.find(d => d.name.trim().toLowerCase() === 'écriture')

  // Sport
  const sportSessionsWeek = sport.historique.filter(s => s.date >= waStr).length

  // ── Domain stats lookup ───────────────────────────────────────────────────
  const domainStatMap = useMemo(() => {
    const map: Record<string, { primary: string; unit: string; secondary: string }> = {}

    for (const d of domains) {
      const n        = d.name.trim().toLowerCase()
      const domTasks = tasks.filter(t => t.domainId === d.id && t.status !== 'cancelled')
      const active   = domTasks.filter(t => t.status !== 'done')
      const nextTask = active.filter(t => t.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0]

      let primary   = String(active.length)
      let unit      = active.length === 1 ? 'tâche active' : 'tâches actives'
      let secondary = nextTask ? `Prochain : ${fmtDate(nextTask.dueDate!)}` : ''

      if (n === 'écriture') {
        const sessions = writing.dailySessions.filter(s => s.date >= waStr).length
        primary   = writing.chapterTotal > 0 ? `${writing.chapterCurrent}` : String(active.length)
        unit      = writing.chapterTotal > 0 ? `sur ${writing.chapterTotal} chapitres` : (active.length === 1 ? 'tâche active' : 'tâches actives')
        secondary = activeArc ? `Arc : ${activeArc.name} · ${sessions} sessions/7j` : ''
      }
      else if (n === 'droit') {
        const goD = daysUntil(law.grandOralDate)
        secondary = goD !== null
          ? (goD === 0 ? "Grand Oral : aujourd'hui !" : goD > 0 ? `Grand Oral : J−${goD}` : 'Grand Oral passé')
          : law.globalStatus ? `Stade : ${law.globalStatus}` : ''
      }
      else if (n === 'carrière') {
        const actMissions = career.missions.filter(m => m.stade !== 'rendu').length
        const rendues     = career.missionsArchives.filter(a => a.archivedAt.startsWith(monthStr)).length
        primary   = String(actMissions)
        unit      = actMissions === 1 ? 'mission active' : 'missions actives'
        secondary = `${rendues} rendue${rendues > 1 ? 's' : ''} ce mois`
      }
      else if (n === 'sport') {
        primary   = String(sportSessionsWeek)
        unit      = 'séances · 7 jours'
        secondary = sport.currentStatus === 'en_rythme' ? 'En rythme' : sport.currentStatus === 'reprise' ? 'En reprise' : 'Pause assumée'
      }
      else if (n === 'musique') {
        primary   = String(music.bibliotheque.length)
        unit      = 'critiques'
        secondary = music.albumEnCours
          ? `En écoute : ${trunc(music.albumEnCours.titre, 4)}`
          : `File : ${music.fileAttente.length} album${music.fileAttente.length > 1 ? 's' : ''}`
      }
      else if (n.includes('film')) {
        const vus   = films.items.filter(f => f.status === 'vu').length
        const aVoir = films.items.filter(f => f.status === 'à voir').length
        const ec    = films.items.find(f => f.status === 'en cours')
        primary   = `${vus} · ${aVoir}`
        unit      = 'vus · à voir'
        secondary = ec ? `En cours : ${trunc(ec.title, 4)}` : ''
      }
      else if (n === 'livres') {
        const lus = books.bibliotheque.length
        primary   = `${lus} · ${books.livreEnCours ? '1' : '0'}`
        unit      = 'lus · en cours'
        secondary = books.livreEnCours ? trunc(books.livreEnCours.titre, 5) : `Objectif : ${books.objectifAnnuel}/an`
      }
      else if (n === 'achats') {
        primary   = String(shopping.wishlist.length)
        unit      = shopping.wishlist.length === 1 ? 'article wishlist' : 'articles wishlist'
        secondary = `${shopping.bought.filter(b => b.boughtDate?.startsWith(monthStr)).length} acheté${shopping.bought.filter(b => b.boughtDate?.startsWith(monthStr)).length > 1 ? 's' : ''} ce mois`
      }

      map[d.id] = { primary, unit, secondary }
    }
    return map
  }, [domains, tasks, writing, law, career, sport, music, films, books, shopping, monthStr, waStr, activeArc, sportSessionsWeek])

  // Pomodoro
  const launchPom = (taskId: string) => {
    if (pom.status !== 'idle') return
    pom.init(taskId, pomSettings.focusDuration * 60)
    pom.startTimer()
    navigate('/focus')
  }

  // Finance excluded from domain grid (always rendered as fixed card)
  const domainGridItems = domains.filter(d => !['finance', 'finances'].includes(d.name.trim().toLowerCase()))

  // Icons for ongoing cards
  const writingIcon = getDomainIcon('Écriture')
  const bookIcon    = getDomainIcon('Livres')
  const musicIcon   = getDomainIcon('Musique')
  const financeIcon = getDomainIcon('Finance')

  // Book ongoing card data
  const bookProgress = books.livreEnCours?.pageActuelle && books.livreEnCours?.pagesTotal
    ? books.livreEnCours.pageActuelle / books.livreEnCours.pagesTotal : 0

  return (
    <div style={{ padding: '8px 0 80px' }}>

      {/* ── 1. Header ──────────────────────────────────────────────────────── */}
      <DashHeader
        date={today}
        doneCount={doneCount}
        totalCount={totalCount}
        weekType={weekType}
        hasCareerInfo={hasCareerInfo}
        cabinetNom={cabinetNom}
      />

      {/* ── 2. En cours ────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: 0 }}>
            En cours
          </h2>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
            Tes fils actifs du moment
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {/* Writing */}
          <OngoingCard
            label="Arc en cours"
            title={activeArc?.name ?? 'Écriture'}
            meta={writing.chapterTotal > 0
              ? `Chapitre ${writing.chapterCurrent} · ${writingSessionsWeek} session${writingSessionsWeek > 1 ? 's' : ''} cette semaine`
              : writing.lastSentence
              ? trunc(writing.lastSentence, 12)
              : 'Aucune session enregistrée'}
            kicker={lastWritingDays === null ? 'Pas encore' : lastWritingDays === 0 ? "Aujourd'hui" : `il y a ${lastWritingDays}j`}
            progress={writing.chapterTotal > 0 ? writing.chapterCurrent / writing.chapterTotal : 0}
            progressLabel={writing.chapterTotal > 0
              ? `${Math.round((writing.chapterCurrent / writing.chapterTotal) * 100)}% du premier jet`
              : 'Pas de jalons définis'}
            icon={writingIcon}
            onClick={() => writingDomain ? navigate(`/domain/${writingDomain.id}`) : undefined}
          />

          {/* Books ou Music */}
          {books.livreEnCours ? (
            <OngoingCard
              label="Lecture en cours"
              title={books.livreEnCours.titre}
              meta={`${books.livreEnCours.auteur}${books.livreEnCours.pageActuelle && books.livreEnCours.pagesTotal ? ` · p. ${books.livreEnCours.pageActuelle}/${books.livreEnCours.pagesTotal}` : ''}`}
              kicker={`Depuis le ${fmtDate(books.livreEnCours.dateDebut)}`}
              progress={bookProgress}
              progressLabel={bookProgress > 0 ? `${Math.round(bookProgress * 100)}% lu` : 'En cours'}
              icon={bookIcon}
              onClick={() => navigate('/livres')}
            />
          ) : music.albumEnCours ? (
            <OngoingCard
              label="En écoute"
              title={music.albumEnCours.titre}
              meta={`${music.albumEnCours.artiste} · ${music.bibliotheque.length} critique${music.bibliotheque.length > 1 ? 's' : ''}`}
              kicker={`Depuis le ${fmtDate(music.albumEnCours.startedAt)}`}
              progress={Math.min(1, music.bibliotheque.length / 50)}
              progressLabel={`${music.bibliotheque.length} albums critiqués`}
              icon={musicIcon}
              onClick={() => navigate('/musique')}
            />
          ) : (
            <OngoingCard
              label="Bibliothèque"
              title={`${books.bibliotheque.length} livre${books.bibliotheque.length > 1 ? 's' : ''} lus`}
              meta={`Objectif ${books.objectifAnnuel}/an · ${music.bibliotheque.length} critiques musicales`}
              kicker="Cette année"
              progress={books.objectifAnnuel > 0 ? Math.min(1, books.bibliotheque.length / books.objectifAnnuel) : 0}
              progressLabel={`${books.objectifAnnuel > 0 ? Math.round((books.bibliotheque.length / books.objectifAnnuel) * 100) : 0}% de l'objectif annuel`}
              icon={bookIcon}
              onClick={() => navigate('/livres')}
            />
          )}

          {/* Finance */}
          <OngoingCard
            label="Solde du mois"
            title={fmtEur(monthBalance)}
            meta={topGoal
              ? `${trunc(topGoal.title, 4)} · ${Math.round((topGoal.currentAmount / topGoal.targetAmount) * 100)}%`
              : 'Aucun objectif d\'épargne'}
            kicker={todayTxTotal > 0 ? `${fmtEur(todayTxTotal)} aujourd'hui` : 'Aucune dépense aujourd\'hui'}
            progress={topGoal && topGoal.targetAmount > 0 ? topGoal.currentAmount / topGoal.targetAmount : Math.min(1, Math.max(0, monthBalance / 2000))}
            progressLabel={topGoal ? `${Math.round((topGoal.currentAmount / topGoal.targetAmount) * 100)}% de l'objectif` : new Date().toLocaleDateString('fr-FR', { month: 'long' })}
            icon={financeIcon}
            onClick={() => navigate('/finances')}
          />
        </div>
      </section>

      {/* ── 3. Aujourd'hui ─────────────────────────────────────────────────── */}
      <TodaySection
        actions={todayActions}
        pomIdle={pom.status === 'idle'}
        launchPom={launchPom}
      />

      {/* ── 4. Domaines ────────────────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 28, color: 'var(--ink)', margin: 0 }}>
            Tes domaines
          </h2>
          <button
            onClick={() => setShowModal(true)}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Nouveau
          </button>
        </div>

        {domains.length === 0 ? (
          <div style={{ display: 'grid' }}>
            <EmptyState onAdd={() => setShowModal(true)} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {domainGridItems.map(d => {
              const stats = domainStatMap[d.id] ?? { primary: '0', unit: 'tâches', secondary: '' }
              return (
                <DomainCard
                  key={d.id}
                  domain={d}
                  primary={stats.primary}
                  unit={stats.unit}
                  secondary={stats.secondary}
                  onClick={() => navigate(`/domain/${d.id}`)}
                />
              )
            })}
            <FinanceDomainCard
              balance={monthBalance}
              topGoal={topGoal}
              onNavigate={() => navigate('/finances')}
            />
          </div>
        )}
      </section>

      {showModal && <AddDomainModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
