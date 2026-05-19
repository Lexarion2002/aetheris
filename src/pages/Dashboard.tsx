import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Landmark, ShoppingBag, BookOpen, Film, Briefcase, PenLine, Scale, Music, Dumbbell, ChefHat } from 'lucide-react'
import { useStore } from '../store'
import { useLawStore } from '../store/lawStore'
import { useCareerStore } from '../store/careerStore'
import { useWritingStore } from '../store/writingStore'
import { useTodayStore } from '../store/todayStore'
import type { TodayTask } from '../store/todayStore'
import { useDroitStore } from '../store/droitStore'
import { useMusicStore } from '../store/musicStore'
import { useSportStore } from '../store/sportStore'
import { useBookStore } from '../store/bookStore'
import { useFilmSerieStore } from '../store/filmSerieStore'
import { useShoppingStore } from '../store/shoppingStore'
import { useCuisineStore } from '../store/cuisineStore'
import { AddDomainModal } from '../components/AddDomainModal'
import { getDomainIcon } from '../utils/domainColors'
import { computeMonthBalance } from '../utils/financeUtils'
import type { Domain, SavingsGoal } from '../types'

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

const WRITING_STAGE_ORDER = ['idée', 'ouverture', 'développement', 'fin', 'jet', 'révision', 'terminé']

function trunc(text: string, max: number): string {
  const words = text.trim().split(/\s+/)
  return words.length <= max ? text : words.slice(0, max).join(' ') + '…'
}

// ─── Finance helpers ──────────────────────────────────────────────────────────


function topSavingsGoal(goals: SavingsGoal[]): SavingsGoal | null {
  return (
    goals
      .filter(g => g.currentAmount < g.targetAmount)
      .sort((a, b) => b.currentAmount / b.targetAmount - a.currentAmount / a.targetAmount)[0] ??
    goals[0] ?? null
  )
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

interface SelectableItem {
  sourceId:     string
  sourceDomain: string
  label:        string
  sublabel?:    string
  domainGroup:  string
}

function TodayTaskRow({ task, last, onToggle, onRemove }: {
  task:     TodayTask
  last:     boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
        borderBottom: last ? 'none' : '1px solid var(--paper-2)',
        transition: 'background 120ms ease',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={task.done}
        style={{
          width: 14, height: 14, padding: 0, flexShrink: 0,
          border: `1px solid ${task.done ? 'var(--terra)' : 'var(--ink-4)'}`,
          background: task.done ? 'var(--terra)' : 'transparent',
          borderRadius: 3, cursor: 'pointer',
          display: 'grid', placeItems: 'center',
          transition: 'background 180ms ease, border-color 180ms ease',
        }}
      >
        {task.done && (
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none"
            stroke="var(--paper-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2,6.5 5,9 10,3" />
          </svg>
        )}
      </button>

      {/* Label + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-serif)', fontSize: 16,
            color: task.done ? 'var(--ink-3)' : 'var(--ink)',
            textDecoration: task.done ? 'line-through' : 'none',
            textDecorationColor: 'var(--ink-4)',
          }}>{task.label}</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--ink-3)', flexShrink: 0,
          }}>{task.sourceDomain}</span>
        </div>
        {task.sublabel && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 2 }}>
            {task.sublabel}
          </div>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        aria-label="Retirer"
        style={{
          opacity: hover ? 0.6 : 0, background: 'transparent', border: 0,
          cursor: 'pointer', padding: 4, color: 'var(--ink-3)',
          fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center',
          transition: 'opacity 180ms ease',
        }}
      >×</button>
    </div>
  )
}

function TodaySection() {
  const tasks      = useTodayStore((s) => s.tasks)
  const addTask    = useTodayStore((s) => s.addTask)
  const toggleTask = useTodayStore((s) => s.toggleTask)
  const removeTask = useTodayStore((s) => s.removeTask)

  const droitTaches    = useDroitStore((s) => s.taches)
  const writingStories = useWritingStore((s) => s.stories)

  const [panelOpen, setPanelOpen] = useState(false)

  const existingSourceIds = useMemo(() => new Set(tasks.map((t) => t.sourceId)), [tasks])

  const availableItems = useMemo((): SelectableItem[] => {
    const items: SelectableItem[] = []

    for (const tache of droitTaches) {
      const progress = tache.subtasks.length > 0
        ? Math.round((tache.subtasks.filter((s) => s.done).length / tache.subtasks.length) * 100)
        : (tache.manualProgress ?? 0)
      if (progress >= 100) continue

      if (tache.subtasks.length > 0) {
        for (const st of tache.subtasks.filter((s) => !s.done)) {
          if (!existingSourceIds.has(st.id)) {
            items.push({ sourceId: st.id, sourceDomain: 'droit', label: st.label, sublabel: tache.matiere, domainGroup: 'Droit' })
          }
        }
      } else {
        if (!existingSourceIds.has(tache.id)) {
          items.push({ sourceId: tache.id, sourceDomain: 'droit', label: tache.title, sublabel: tache.matiere, domainGroup: 'Droit' })
        }
      }
    }

    for (const story of writingStories.filter((s) => s.status === 'active')) {
      if (!existingSourceIds.has(story.id)) {
        items.push({ sourceId: story.id, sourceDomain: 'ecriture', label: `Écriture — ${story.title}`, domainGroup: 'Écriture' })
      }
    }

    return items
  }, [droitTaches, writingStories, existingSourceIds])

  const groupedItems = useMemo(() => {
    const groups: Record<string, SelectableItem[]> = {}
    for (const item of availableItems) {
      if (!groups[item.domainGroup]) groups[item.domainGroup] = []
      groups[item.domainGroup].push(item)
    }
    return groups
  }, [availableItems])

  const doneCount = tasks.filter((t) => t.done).length

  return (
    <section style={{ marginBottom: 56 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 28, color: 'var(--ink)', margin: 0 }}>
          Aujourd'hui
        </h2>
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
            background: panelOpen ? 'var(--paper-2)' : 'var(--terra)',
            color: panelOpen ? 'var(--ink-2)' : 'var(--paper-1)',
            border: 0, borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
            transition: 'background 180ms ease, color 180ms ease',
          }}
        >
          + Planifier
        </button>
      </div>

      {/* Panel de sélection */}
      {panelOpen && (
        <div style={{
          background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 16,
        }}>
          {availableItems.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 14, margin: 0 }}>
              Toutes les tâches sont planifiées.
            </p>
          ) : (
            Object.entries(groupedItems).map(([group, items]) => (
              <div key={group} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                    {group}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
                    {items.length}
                  </span>
                </div>
                {items.map((item) => (
                  <button
                    key={item.sourceId}
                    onClick={() => addTask({ sourceId: item.sourceId, sourceDomain: item.sourceDomain, label: item.label, sublabel: item.sublabel })}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 2,
                      width: '100%', textAlign: 'left',
                      background: 'transparent', border: 0, cursor: 'pointer',
                      padding: '6px 8px', borderRadius: 6,
                      transition: 'background 120ms ease',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>{item.label}</span>
                    {item.sublabel && (
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontStyle: 'italic', color: 'var(--ink-3)' }}>{item.sublabel}</span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
          <div style={{ marginTop: 12, borderTop: '1px solid var(--paper-2)', paddingTop: 12 }}>
            <button
              onClick={() => setPanelOpen(false)}
              style={{
                background: 'transparent', border: '1px solid var(--paper-2)',
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)',
              }}
            >Fermer</button>
          </div>
        </div>
      )}

      {/* Liste ou placeholder */}
      {tasks.length === 0 ? (
        <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, padding: '24px 22px', fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Rien de planifié · commence par ajouter une tâche
        </div>
      ) : (
        <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, overflow: 'hidden' }}>
          {tasks.map((task, i) => (
            <TodayTaskRow
              key={task.id}
              task={task}
              last={i === tasks.length - 1}
              onToggle={() => toggleTask(task.id)}
              onRemove={() => removeTask(task.id)}
            />
          ))}
          <div style={{ padding: '10px 18px', borderTop: '1px solid var(--paper-2)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
              {doneCount} sur {tasks.length} tâche{tasks.length > 1 ? 's' : ''} faite{doneCount > 1 ? 's' : ''}
            </span>
          </div>
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

// ─── StandalonePageCard — pour les pages domaine sans entrée store ─────────────

function StandalonePageCard({
  name, icon: Icon, primary, unit, secondary, onClick,
}: {
  name:      string
  icon:      React.ComponentType<{ size?: number }>
  primary:   string
  unit:      string
  secondary: string
  onClick:   () => void
}) {
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: hover ? 'var(--terra-soft)' : 'var(--paper-2)',
          color: hover ? 'var(--terra-deep)' : 'var(--ink-2)',
          display: 'grid', placeItems: 'center',
          transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
        }}>
          <Icon size={18} />
        </div>
        <ArrowUpRight size={14} style={{ color: hover ? 'var(--terra)' : 'var(--ink-4)' }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.005em' }}>
          {name}
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
  const law          = useLawStore()
  const career       = useCareerStore()
  const writing      = useWritingStore()
  const music        = useMusicStore()
  const sport        = useSportStore()
  const books        = useBookStore()
  const films        = useFilmSerieStore()
  const shopping     = useShoppingStore()
  const cuisine      = useCuisineStore()
  const droit        = useDroitStore()
  void law  // utilisé via useLawStore() pour la rehydratation, pas directement ici

  const clearIfNewDay = useTodayStore((s) => s.clearIfNewDay)
  const todayTasks    = useTodayStore((s) => s.tasks)

  useEffect(() => { clearIfNewDay() }, [clearIfNewDay])

  const today    = new Date()
  const monthStr = today.toISOString().slice(0, 7)
  const waStr    = weekAgoStr()

  // ── Computed ──────────────────────────────────────────────────────────────
  const weekType      = career.statusSemaine === 'semaine_academique' ? 'académique' : 'cabinet'
  const hasCareerInfo = !!(career.cabinetInfo.nom || career.cabinetInfo.maitreStage)
  const cabinetNom    = career.cabinetInfo.nom ?? ''

  const doneCount  = todayTasks.filter(t => t.done).length
  const totalCount = todayTasks.length

  const monthBalance = useMemo(() => computeMonthBalance(transactions, monthStr), [transactions, monthStr])
  const topGoal      = useMemo(() => topSavingsGoal(savingsGoals), [savingsGoals])
  const todayTxTotal = useMemo(() => {
    const d = todayStr()
    return transactions.filter(t => t.type === 'expense' && t.date === d).reduce((s, t) => s + t.amount, 0)
  }, [transactions])

  // Writing
  const activeWritingStory = useMemo(
    () => writing.stories.find((s) => s.status === 'active'),
    [writing.stories],
  )
  const activeWritingSessions = useMemo(
    () => activeWritingStory?.sessions ?? [],
    [activeWritingStory],
  )
  const lastWritingDays = useMemo(() => {
    const latest = activeWritingSessions.map((s) => s.date).sort().at(-1)
    if (!latest) return null
    const d = daysUntil(latest + 'T23:59:59')
    return d !== null ? Math.abs(d) : null
  }, [activeWritingSessions])
  const writingSessionsWeek  = activeWritingSessions.filter((s) => s.date >= waStr).length
  const writingSessionsTotal = activeWritingSessions.length
  const writingProgressIndex = activeWritingStory ? WRITING_STAGE_ORDER.indexOf(activeWritingStory.stage) : -1
  const writingProgress = writingProgressIndex >= 0 ? (writingProgressIndex + 1) / WRITING_STAGE_ORDER.length : 0
  const writingDomain        = domains.find(d => d.name.trim().toLowerCase() === 'écriture')

  // Books: lus cette année (BookCritique.dateLecture = YYYY-MM-DD)
  const booksThisYear = useMemo(() => {
    const year = new Date().getFullYear().toString()
    return books.bibliotheque.filter(b => b.dateLecture.startsWith(year)).length
  }, [books.bibliotheque])

  // Finance: revenus et dépenses du mois courant
  const monthIncome = useMemo(
    () => transactions.filter(t => t.date.startsWith(monthStr) && t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [transactions, monthStr],
  )
  const monthExpense = useMemo(
    () => transactions.filter(t => t.date.startsWith(monthStr) && t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [transactions, monthStr],
  )

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
        const currentStory = writing.stories.find((story) => story.status === 'active')
        const sessions = currentStory?.sessions.filter((session) => session.date >= waStr).length ?? 0
        primary   = currentStory ? String(currentStory.sessions.length) : String(active.length)
        unit      = currentStory ? 'sessions' : (active.length === 1 ? 'tâche active' : 'tâches actives')
        secondary = currentStory ? `${currentStory.title} · ${sessions} sessions/7j` : ''
      }
      else if (n === 'droit') {
        const nextDate = law.keyDates
          .filter((keyDate) => keyDate.date)
          .sort((a, b) => a.date.localeCompare(b.date))[0]
        const nextDays = nextDate ? daysUntil(nextDate.date) : null
        primary = String(law.subjects.length)
        unit = law.subjects.length === 1 ? 'matière' : 'matières'
        secondary = nextDate
          ? `${nextDate.title} : ${nextDays === 0 ? "aujourd'hui" : nextDays !== null && nextDays > 0 ? `J−${nextDays}` : 'passé'}`
          : law.statusNote ? trunc(law.statusNote, 6) : ''
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
  }, [domains, tasks, writing, law, career, sport, music, films, books, shopping, monthStr, waStr, sportSessionsWeek])

  // Finance excluded from domain grid (always rendered as fixed card)
  const domainGridItems = domains.filter(d => !['finance', 'finances'].includes(d.name.trim().toLowerCase()))

  // Pages standalone — affichées comme cards dans la grille, sauf si déjà
  // représentées par un domaine du store (déduplication par nom).
  const existingDomainNames = new Set(domains.map((d) => d.name.trim().toLowerCase()))
  const startWeek = new Date()
  startWeek.setHours(0, 0, 0, 0)
  startWeek.setDate(startWeek.getDate() - ((startWeek.getDay() + 6) % 7))
  const startWeekIso = startWeek.toISOString().split('T')[0]

  const droitActiveCount = droit.taches.filter((t) => {
    const totalSt = t.subtasks?.length ?? 0
    const doneSt = t.subtasks?.filter((s) => s.done).length ?? 0
    return totalSt === 0 || doneSt < totalSt
  }).length
  const sportSessionsWeekCount = sport.historique.filter((h) => h.date >= startWeekIso).length
  const careerActiveCount = career.missions.filter((m) => m.stade !== 'rendu').length
  const writingActiveStoriesCount = writing.stories.filter((s) => s.status === 'active').length
  const booksReadCount = books.bibliotheque.length
  const booksTarget = books.objectifAnnuel || 0
  const filmsViewedCount = films.items.filter((it) => it.status === 'vu').length
  const musicCritiquesCount = music.bibliotheque.length
  const cuisineRecettesCount = cuisine.recettes.length
  const shoppingWishCount = shopping.wishlist.length

  type Stand = {
    name: string; icon: React.ComponentType<{ size?: number }>; path: string
    primary: string; unit: string; secondary: string
    showCondition?: boolean
  }

  const standaloneCards: Stand[] = [
    {
      name: 'Droit', icon: Scale, path: '/droit',
      primary: String(droitActiveCount), unit: droitActiveCount > 1 ? 'tâches' : 'tâche',
      secondary: droit.taches.length === 0 ? 'rien encore noté' : `${droit.taches.length} au total`,
      showCondition: !existingDomainNames.has('droit'),
    },
    {
      name: 'Sport', icon: Dumbbell, path: '/sport',
      primary: String(sportSessionsWeekCount), unit: sportSessionsWeekCount > 1 ? 'séances cette sem.' : 'séance cette sem.',
      secondary: sport.historique.length > 0 ? `${sport.historique.length} séances au total` : 'aucune séance enregistrée',
      showCondition: !existingDomainNames.has('sport'),
    },
    {
      name: 'Écriture', icon: PenLine, path: '/ecriture',
      primary: String(writingActiveStoriesCount), unit: writingActiveStoriesCount > 1 ? 'récits actifs' : 'récit actif',
      secondary: writing.stories.length > 0 ? `${writing.stories.length} récits au total` : 'aucun récit',
      showCondition: !existingDomainNames.has('écriture') && !existingDomainNames.has('ecriture'),
    },
    {
      name: 'Musique', icon: Music, path: '/musique',
      primary: String(musicCritiquesCount), unit: musicCritiquesCount > 1 ? 'critiques' : 'critique',
      secondary: music.fileAttente.length > 0 ? `${music.fileAttente.length} en attente` : '',
      showCondition: !existingDomainNames.has('musique'),
    },
    {
      name: 'Livres', icon: BookOpen, path: '/livres',
      primary: booksTarget > 0 ? `${booksReadCount}/${booksTarget}` : String(booksReadCount),
      unit: 'livres lus',
      secondary: books.livreEnCours ? `en cours : ${books.livreEnCours.titre}` : (books.fileAttente.length > 0 ? `${books.fileAttente.length} en attente` : ''),
    },
    {
      name: 'Films & Séries', icon: Film, path: '/films',
      primary: String(filmsViewedCount), unit: filmsViewedCount > 1 ? 'titres vus' : 'titre vu',
      secondary: films.items.length > filmsViewedCount ? `${films.items.length - filmsViewedCount} à voir` : '',
    },
    {
      name: 'Cabinet', icon: Briefcase, path: '/cabinet',
      primary: String(careerActiveCount), unit: careerActiveCount > 1 ? 'missions actives' : 'mission active',
      secondary: career.missionsArchives.length > 0 ? `${career.missionsArchives.length} archivées` : '',
    },
    {
      name: 'Cuisine', icon: ChefHat, path: '/cuisine',
      primary: String(cuisineRecettesCount), unit: cuisineRecettesCount > 1 ? 'recettes' : 'recette',
      secondary: cuisine.ingredients.length > 0 ? `${cuisine.ingredients.length} ingrédients suivis` : '',
    },
    {
      name: 'Achats', icon: ShoppingBag, path: '/achats',
      primary: String(shoppingWishCount), unit: shoppingWishCount > 1 ? 'envies' : 'envie',
      secondary: shopping.bought.length > 0 ? `${shopping.bought.length} achetés` : '',
    },
  ]
  const visibleStandalone = standaloneCards.filter((c) => c.showCondition !== false)

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
            label={activeWritingStory ? 'Nouvelle en cours' : 'Écriture'}
            title={activeWritingStory
              ? activeWritingStory.title
              : writingSessionsTotal > 0
              ? `${writingSessionsTotal} session${writingSessionsTotal > 1 ? 's' : ''} enregistrée${writingSessionsTotal > 1 ? 's' : ''}`
              : 'Pas encore démarré'}
            meta={activeWritingStory?.nextAction
              ? trunc(activeWritingStory.nextAction, 10)
              : writingSessionsWeek > 0
              ? `${writingSessionsWeek} session${writingSessionsWeek > 1 ? 's' : ''} cette semaine`
              : 'Aucune session cette semaine'}
            kicker={lastWritingDays === null ? 'Pas encore' : lastWritingDays === 0 ? "Aujourd'hui" : `il y a ${lastWritingDays}j`}
            progress={writingProgress}
            progressLabel={activeWritingStory ? 'progression narrative' : 'aucune nouvelle active'}
            icon={writingIcon}
            onClick={() => navigate(writingDomain ? `/domain/${writingDomain.id}` : '/ecriture')}
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
              label={`Lectures ${new Date().getFullYear()}`}
              title={booksThisYear > 0
                ? `${booksThisYear} livre${booksThisYear > 1 ? 's' : ''} lu${booksThisYear > 1 ? 's' : ''}`
                : 'Aucune lecture'}
              meta={books.objectifAnnuel > 0
                ? `Objectif ${books.objectifAnnuel}/an · ${books.bibliotheque.length} au total`
                : books.bibliotheque.length > 0
                ? `${books.bibliotheque.length} livre${books.bibliotheque.length > 1 ? 's' : ''} dans la bibliothèque`
                : 'Aucun livre enregistré'}
              kicker={`En ${new Date().getFullYear()}`}
              progress={books.objectifAnnuel > 0 ? Math.min(1, booksThisYear / books.objectifAnnuel) : 0}
              progressLabel={books.objectifAnnuel > 0
                ? `${Math.round(Math.min(100, (booksThisYear / books.objectifAnnuel) * 100))}% de l'objectif annuel`
                : 'Objectif non défini'}
              icon={bookIcon}
              onClick={() => navigate('/livres')}
            />
          )}

          {/* Finance */}
          <OngoingCard
            label="Solde du mois"
            title={monthIncome === 0 && monthExpense === 0 ? 'Aucune transaction' : fmtEur(monthBalance)}
            meta={monthIncome > 0 || monthExpense > 0
              ? `${fmtEur(monthIncome)} entrés · ${fmtEur(monthExpense)} sortis`
              : 'Aucune donnée ce mois'}
            kicker={todayTxTotal > 0 ? `${fmtEur(todayTxTotal)} aujourd'hui` : 'Rien aujourd\'hui'}
            progress={topGoal && topGoal.targetAmount > 0
              ? topGoal.currentAmount / topGoal.targetAmount
              : monthIncome > 0 ? Math.min(1, Math.max(0, monthBalance / monthIncome)) : 0}
            progressLabel={topGoal && topGoal.targetAmount > 0
              ? `${Math.round((topGoal.currentAmount / topGoal.targetAmount) * 100)}% de l'objectif`
              : monthIncome > 0
              ? `${Math.round(Math.max(0, (monthBalance / monthIncome)) * 100)}% épargné`
              : new Date().toLocaleDateString('fr-FR', { month: 'long' })}
            icon={financeIcon}
            onClick={() => navigate('/finances')}
          />
        </div>
      </section>

      {/* ── 3. Aujourd'hui ─────────────────────────────────────────────────── */}
      <TodaySection />

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

        {domains.length === 0 && visibleStandalone.length === 0 ? (
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
            {visibleStandalone.map((c) => (
              <StandalonePageCard
                key={c.name}
                name={c.name}
                icon={c.icon}
                primary={c.primary}
                unit={c.unit}
                secondary={c.secondary}
                onClick={() => navigate(c.path)}
              />
            ))}
          </div>
        )}
      </section>

      {showModal && <AddDomainModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
