// WeekView — Page Semaine d'Aetheris
// Design éditorial : palette papier/encre, grille 7 colonnes, backlog, retards

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Target, ClockAlert, Plus, Sparkles, X } from 'lucide-react'
import { useStore } from '../store'
import { useTimerStore } from '../store/timerStore'
import { TaskFormModal } from '../components/TaskFormModal'
import { ObjectivesPage } from './ObjectivesPage'
import { generateWeekPlan, type WeekPlanItem } from '../lib/aiService'
import type { Domain, Task, TimeSession } from '../types'
import {
  getWeekDays, getWeekBounds, getISOWeekNumber, isCurrentWeek,
  minutesToHours, minutesToShort, DOMAIN_COLOR_TONES, type Day,
} from '../utils/weekUtils'

// ─── Helpers locaux ───────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function getDomainTone(domain: Domain | undefined) {
  if (!domain) return DOMAIN_COLOR_TONES.gray
  return DOMAIN_COLOR_TONES[domain.color] ?? DOMAIN_COLOR_TONES.gray
}

function prioLevel(priority: string): 1 | 2 | 3 {
  if (priority === 'urgent' || priority === 'high') return 1
  if (priority === 'medium') return 2
  return 3
}

function formatWeekLabel(days: Day[]): string {
  const startDate = new Date(days[0].iso + 'T00:00:00')
  const endDate   = new Date(days[6].iso + 'T00:00:00')
  const startMonth = startDate.toLocaleDateString('fr-FR', { month: 'long' })
  const endMonth   = endDate.toLocaleDateString('fr-FR', { month: 'long' })
  if (startMonth === endMonth) return `${days[0].date} → ${days[6].date} ${startMonth}`
  return `${days[0].date} ${startMonth} → ${days[6].date} ${endMonth}`
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

function Checkbox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 16, height: 16, borderRadius: 4, marginTop: 1,
        border: '1.5px solid var(--ink-4)',
        background: checked ? 'var(--sage-soft)' : 'transparent',
        cursor: 'pointer', flexShrink: 0,
        display: 'grid', placeItems: 'center', padding: 0,
        transition: 'background var(--dur) var(--ease)',
      }}
    >
      {checked && (
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none"
          stroke="var(--sage-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2,6.5 5,9.5 10,3" />
        </svg>
      )}
    </button>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function WeekTaskCard({
  task, domain, dimmed, onToggle, variant,
}: {
  task: Task
  domain: Domain | undefined
  dimmed?: boolean
  onToggle: (id: string) => void
  variant?: 'backlog'
}) {
  const [hover, setHover] = useState(false)
  const timerStore = useTimerStore()
  const tone     = getDomainTone(domain)
  const prio     = prioLevel(task.priority)
  const isDone   = task.status === 'done'
  const today    = todayIso()
  const isOverdue = !isDone && !!task.dueDate && task.dueDate < today
  const overdueDays = isOverdue && task.dueDate
    ? Math.round((new Date(today + 'T00:00:00').getTime() - new Date(task.dueDate + 'T00:00:00').getTime()) / 86400000)
    : 0
  const isBacklog  = variant === 'backlog'
  const isRunning  = timerStore.taskId === task.id && timerStore.running

  const startFocus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (timerStore.running) timerStore.pause()
    timerStore.setTask(task.id)
    timerStore.start()
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--paper-1)',
        border: '1px solid ' + (hover ? 'var(--ink-4)' : 'var(--paper-2)'),
        borderRadius: 10,
        padding: isBacklog ? '12px 12px' : '9px 10px',
        display: 'flex', flexDirection: 'column', gap: 6,
        opacity: isDone ? 0.55 : (dimmed ? 0.7 : 1),
        transition: 'border-color var(--dur) var(--ease)',
        cursor: 'default',
        position: 'relative',
      }}
    >
      {/* Ligne 1 : checkbox + trait domaine + titre */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Checkbox checked={isDone} onClick={() => onToggle(task.id)} />
        <div style={{
          width: 2, alignSelf: 'stretch', minHeight: 18, marginTop: 2,
          background: tone.color, borderRadius: 1, flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 13.5,
            color: isDone ? 'var(--ink-3)' : 'var(--ink)',
            fontWeight: prio === 1 && !isDone ? 500 : 400,
            lineHeight: 1.35, letterSpacing: '-0.005em',
            textDecoration: isDone ? 'line-through' : 'none',
            textDecorationColor: 'var(--ink-3)',
            textDecorationThickness: '1px',
            overflowWrap: 'anywhere', wordBreak: 'normal',
            textWrap: 'pretty',
          } as React.CSSProperties}>
            {task.title}
          </div>
        </div>
      </div>

      {/* Ligne 2 : dot prio + domaine + estimation + retard + focus */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingLeft: 28, flexWrap: 'wrap',
      }}>
        {prio <= 2 && !isDone && (
          <span style={{
            width: 6, height: 6, borderRadius: 999, flexShrink: 0,
            background: prio === 1 ? 'var(--terra)' : 'transparent',
            border: prio === 2 ? '1px solid var(--ink-3)' : 'none',
          }} />
        )}

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: tone.deep,
        }}>
          {domain?.name ?? '—'}
        </span>

        <span style={{ color: 'var(--ink-4)' }}>·</span>

        <span style={{
          fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
          fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.02em',
        }}>
          {minutesToShort(task.timeEstimate ?? 0)}
        </span>

        {isOverdue && (
          <>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--danger)', padding: '2px 6px',
              borderRadius: 3, background: 'var(--terra-soft)',
            }}>
              en retard · {overdueDays} j
            </span>
          </>
        )}

        {!isDone && (
          <button
            onClick={startFocus}
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-sans)', fontSize: 11.5,
              padding: '2px 8px', borderRadius: 4,
              background: isRunning || hover ? 'var(--ink)' : 'transparent',
              color: isRunning || hover ? 'var(--paper-1)' : 'var(--ink-3)',
              border: '1px solid ' + (isRunning || hover ? 'var(--ink)' : 'transparent'),
              cursor: 'pointer',
              opacity: hover || isRunning ? 1 : 0,
              transition: 'opacity var(--dur) var(--ease), background var(--dur) var(--ease), color var(--dur) var(--ease)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <Target size={11} /> Focus
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Overdue Row ──────────────────────────────────────────────────────────────

function OverdueRow({
  task, domain, onToggle,
}: {
  task: Task
  domain: Domain | undefined
  onToggle: (id: string) => void
}) {
  const [hover, setHover] = useState(false)
  const tone = getDomainTone(domain)
  const today = todayIso()
  const overdueDays = task.dueDate
    ? Math.round((new Date(today + 'T00:00:00').getTime() - new Date(task.dueDate + 'T00:00:00').getTime()) / 86400000)
    : 0

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '8px 10px', borderRadius: 8,
        background: hover ? 'var(--paper-1)' : 'transparent',
        border: '1px solid ' + (hover ? 'var(--paper-2)' : 'transparent'),
        transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
      }}
    >
      <Checkbox checked={task.status === 'done'} onClick={() => onToggle(task.id)} />
      <div style={{
        width: 2, alignSelf: 'stretch', minHeight: 14, marginTop: 2,
        background: tone.color, borderRadius: 1,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.3 }}>
          {task.title}
        </div>
        <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9.5,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: tone.deep,
          }}>
            {domain?.name ?? '—'}
          </span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
            fontSize: 10.5, color: 'var(--danger)',
          }}>
            +{overdueDays} j
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Overdue Banner ───────────────────────────────────────────────────────────

function OverdueBanner({
  tasks, domains, expanded, onExpand, onToggle,
}: {
  tasks: Task[]
  domains: Domain[]
  expanded: boolean
  onExpand: () => void
  onToggle: (id: string) => void
}) {
  const sorted   = [...tasks].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  const shown    = expanded ? sorted : sorted.slice(0, 5)
  const rest     = sorted.length - shown.length
  const total    = tasks.length

  return (
    <div style={{
      marginTop: 20,
      background: 'color-mix(in srgb, var(--terra-soft) 50%, var(--paper-1))',
      border: '1px solid #DEB89C',
      borderRadius: 12,
      padding: '14px 18px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'var(--terra-soft)', color: 'var(--terra-deep)',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <ClockAlert size={15} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 500, color: 'var(--ink)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{total}</span>
            {' '}tâche{total > 1 ? 's' : ''} en retard
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--ink-2)' }}>
            à reprogrammer ou à clore — calmement.
          </div>
        </div>
        {(rest > 0 || expanded) && (
          <button
            onClick={onExpand}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-2)',
              background: 'transparent', border: '1px solid var(--ink-4)',
              padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
            }}
          >
            {expanded ? 'Replier' : `Voir les ${rest} autres`}
          </button>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 8,
      }}>
        {shown.map(t => (
          <OverdueRow
            key={t.id}
            task={t}
            domain={domains.find(d => d.id === t.domainId)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Day Column ───────────────────────────────────────────────────────────────

type FocusSegment = { domainId: string; domain: Domain | undefined; mins: number; pct: number }

function WeekDayColumn({
  day, tasks, domains, focusSegments, focusTotal, scheduleBlocks, isToday, isPast, onToggle,
}: {
  day: Day
  tasks: Task[]
  domains: Domain[]
  focusSegments: FocusSegment[]
  focusTotal: number
  scheduleBlocks: import('../types').ScheduleBlock[]
  isToday: boolean
  isPast: boolean
  onToggle: (id: string) => void
}) {
  const sorted = [...tasks].sort((a, b) => {
    const aDone = a.status === 'done' ? 1 : 0
    const bDone = b.status === 'done' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    return prioLevel(a.priority) - prioLevel(b.priority)
  })
  const total = tasks.length
  const done  = tasks.filter(t => t.status === 'done').length

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minWidth: 0,
      borderLeft: day.i === 0 ? '1px solid var(--paper-2)' : 'none',
      borderRight: '1px solid var(--paper-2)',
      background: isToday ? 'var(--paper-1)' : 'transparent',
      transition: 'background var(--dur) var(--ease)',
    }}>
      {/* En-tête du jour */}
      <div style={{
        padding: '12px 12px 10px',
        borderBottom: '1px solid var(--paper-2)',
        background: isToday ? 'var(--paper-1)' : 'var(--paper)',
        position: 'sticky', top: 0, zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 12.5,
              color: isToday ? 'var(--terra)' : (isPast ? 'var(--ink-3)' : 'var(--ink-2)'),
              fontWeight: isToday ? 500 : 400,
              textTransform: 'lowercase',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {day.long}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
              fontSize: 14, fontWeight: isToday ? 600 : 500,
              color: isToday ? 'var(--terra)' : (isPast ? 'var(--ink-3)' : 'var(--ink)'),
            }}>
              {day.date}
            </span>
            {isToday && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9.5,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--terra)', marginLeft: 2,
              }}>
                auj.
              </span>
            )}
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
            fontSize: 11, letterSpacing: '0.04em',
            color: total === 0 ? 'var(--ink-4)'
                 : done === total ? 'var(--sage-deep)'
                 : 'var(--ink-2)',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {done}/{total}
          </span>
        </div>

        {/* Barre de focus proportionnelle par domaine */}
        <div style={{
          marginTop: 8, height: 3, borderRadius: 2, overflow: 'hidden',
          background: 'var(--paper-2)', display: 'flex',
        }}>
          {focusSegments.map((s, idx) => (
            <div
              key={s.domainId}
              title={`${s.domain?.name ?? s.domainId} · ${minutesToShort(s.mins)}`}
              style={{
                width: s.pct + '%',
                background: getDomainTone(s.domain).color,
                borderRight: idx < focusSegments.length - 1 ? '1px solid var(--paper)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Total focus du jour */}
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.08em', color: 'var(--ink-3)', textTransform: 'uppercase',
          }}>
            focus
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
            fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.02em',
          }}>
            {focusTotal ? minutesToShort(focusTotal) : '—'}
          </span>
        </div>

        {/* Plages bloquées (emploi du temps récurrent) */}
        {scheduleBlocks.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {scheduleBlocks
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((b) => (
                <div
                  key={b.id}
                  title={`${b.title} · ${b.startTime}–${b.endTime}`}
                  style={{
                    fontFamily: 'var(--font-sans)', fontSize: 10.5,
                    padding: '3px 6px', borderRadius: 4,
                    background: 'var(--paper-2)', color: 'var(--ink-2)',
                    borderLeft: '2px solid ' + (
                      b.kind === 'class' ? 'var(--terra)'
                      : b.kind === 'work' ? 'var(--ink-3)'
                      : b.kind === 'commitment' ? 'var(--sage)'
                      : 'var(--ink-4)'
                    ),
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-3)' }}>{b.startTime}</span>
                  {' '}{b.title}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Tâches du jour */}
      <div style={{
        padding: '10px 8px 24px',
        display: 'flex', flexDirection: 'column', gap: 6,
        flex: 1,
        background: isToday
          ? 'color-mix(in srgb, var(--paper-1) 70%, var(--paper))'
          : 'transparent',
      }}>
        {sorted.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            color: 'var(--ink-3)', fontSize: 13, padding: '12px 4px',
            textAlign: 'center', lineHeight: 1.4,
          }}>
            {isPast ? '— jour libre —' : 'rien de prévu'}
          </div>
        ) : (
          sorted.map(t => (
            <WeekTaskCard
              key={t.id}
              task={t}
              domain={domains.find(d => d.id === t.domainId)}
              dimmed={isPast && t.status !== 'done'}
              onToggle={onToggle}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Backlog ──────────────────────────────────────────────────────────────────

function Backlog({
  tasks, domains, onToggle,
}: {
  tasks: Task[]
  domains: Domain[]
  onToggle: (id: string) => void
}) {
  return (
    <section style={{ marginTop: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ink-3)', marginBottom: 4,
          }}>
            plus tard
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 500,
            color: 'var(--ink)', letterSpacing: '-0.005em', margin: '2px 0 0', lineHeight: 1.2,
          }}>
            En réserve.
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-sans)', fontStyle: 'italic',
            fontSize: 13.5, color: 'var(--ink-2)',
          }}>
            {tasks.length === 0
              ? 'Aucune tâche sans deadline.'
              : 'Sans deadline — pioche quand tu veux.'}
          </span>
          {tasks.length > 0 && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
              fontSize: 12, color: 'var(--ink-3)',
            }}>
              {tasks.length}/20
            </span>
          )}
        </div>
      </div>

      {tasks.length === 0 ? null : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 10,
        }}>
          {tasks.map(t => (
            <WeekTaskCard
              key={t.id}
              task={t}
              domain={domains.find(d => d.id === t.domainId)}
              variant="backlog"
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── KitWeekPlanModal — modale du plan de semaine généré ─────────────────────

function KitWeekPlanModal({
  items, weekStart, domains, onAccept, onClose,
}: {
  items: WeekPlanItem[]
  weekStart: string
  domains: Domain[]
  onAccept: (selected: WeekPlanItem[]) => void
  onClose: () => void
}) {
  const [skipped, setSkipped] = useState<Set<number>>(new Set())

  const toggle = (idx: number) => {
    setSkipped(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const grouped = useMemo(() => {
    const map = new Map<number, Array<WeekPlanItem & { idx: number }>>()
    items.forEach((item, idx) => {
      if (!map.has(item.dayOffset)) map.set(item.dayOffset, [])
      map.get(item.dayOffset)!.push({ ...item, idx })
    })
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [items])

  const DAYS_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  const dayDate = (offset: number) => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    return d.getDate()
  }

  const accepted = items.filter((_, idx) => !skipped.has(idx))

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(58,46,34,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 50, padding: '60px 20px 20px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--paper-1)', border: '1px solid var(--ink-4)',
          borderRadius: 14, maxWidth: 720, width: '100%',
          boxShadow: 'var(--shadow-2)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--paper-2)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Sparkles size={14} style={{ color: 'var(--terra)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--terra)' }}>
                plan de semaine
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink)', margin: 0, lineHeight: 1.2 }}>
              Kit te propose {items.length} tâches.
            </h2>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)', margin: '4px 0 0' }}>
              Décoche celles que tu veux écarter, puis valide.
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Liste par jour */}
        <div style={{ padding: '12px 24px 8px', maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
          {grouped.map(([offset, dayItems]) => (
            <div key={offset} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                  {DAYS_LONG[offset]}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                  {dayDate(offset)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dayItems.map(item => {
                  const dom = domains.find(d => d.id === item.domainId)
                  const isSkipped = skipped.has(item.idx)
                  return (
                    <label
                      key={item.idx}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '8px 10px', borderRadius: 8,
                        background: isSkipped ? 'transparent' : 'var(--paper)',
                        border: '1px solid ' + (isSkipped ? 'transparent' : 'var(--paper-2)'),
                        opacity: isSkipped ? 0.5 : 1, cursor: 'pointer',
                        transition: 'opacity var(--dur) var(--ease)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!isSkipped}
                        onChange={() => toggle(item.idx)}
                        style={{ marginTop: 2, accentColor: 'var(--terra)' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                            {dom?.name ?? '?'}
                          </span>
                          <span style={{ color: 'var(--ink-4)' }}>·</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                            {item.timeEstimate}m
                          </span>
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)',
                          textDecoration: isSkipped ? 'line-through' : 'none',
                          lineHeight: 1.3,
                        }}>
                          {item.title}
                        </div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontStyle: 'italic', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.35 }}>
                          {item.reason}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--paper-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            {accepted.length} sur {items.length} retenues
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 13, padding: '7px 14px',
                background: 'transparent', color: 'var(--ink-2)',
                border: '1px solid var(--ink-4)', borderRadius: 8, cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={() => onAccept(accepted)}
              disabled={accepted.length === 0}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                padding: '7px 16px', background: 'var(--terra)', color: 'var(--paper-1)',
                border: '1px solid transparent', borderRadius: 8,
                cursor: accepted.length === 0 ? 'not-allowed' : 'pointer',
                opacity: accepted.length === 0 ? 0.5 : 1,
              }}
            >
              Planifier {accepted.length} tâche{accepted.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// expose helper inside the file
function dayDateIsoFromOffset(weekStart: string, offset: number): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function WeekView() {
  const tasks        = useStore(s => s.tasks)
  const timeSessions = useStore(s => s.timeSessions)
  const domains      = useStore(s => s.domains)
  const objectives   = useStore(s => s.objectives)
  const milestones   = useStore(s => s.milestones)
  const scheduleBlocks = useStore(s => s.scheduleBlocks)
  const setTaskStatus = useStore(s => s.setTaskStatus)
  const addTaskAction = useStore(s => s.addTask)
  const kitEnabled   = useStore(s => !!s.anthropicApiKey)

  const [weekOffset, setWeekOffset]       = useState(0)
  const [showAllOverdue, setShowAllOverdue] = useState(false)
  const [taskModalOpen, setTaskModalOpen]   = useState(false)
  const [taskModalPlannedDate, setTaskModalPlannedDate] = useState<string | undefined>(undefined)

  // ── Kit : plan de semaine ──────────────────────────────────────────────────
  const [kitPlanItems,   setKitPlanItems]   = useState<WeekPlanItem[] | null>(null)
  const [kitPlanLoading, setKitPlanLoading] = useState(false)
  const [kitPlanError,   setKitPlanError]   = useState<string | null>(null)

  // ── Calcul des jours de la semaine ──────────────────────────────────────────
  const days      = useMemo(() => getWeekDays(weekOffset), [weekOffset])
  const bounds    = useMemo(() => getWeekBounds(weekOffset), [weekOffset])
  const today     = todayIso()
  const todayIndex = useMemo(() => {
    const idx = days.findIndex(d => d.iso === today)
    return idx >= 0 ? idx : null
  }, [days, today])
  const weekNum  = useMemo(() => getISOWeekNumber(new Date(days[0].iso + 'T00:00:00')), [days])
  const weekYear = days[0].iso.slice(0, 4)
  const weekLabel = useMemo(() => formatWeekLabel(days), [days])

  // ── Tâches planifiées cette semaine ─────────────────────────────────────────
  const weekTasks = useMemo(
    () => tasks.filter(t => t.dueDate && t.dueDate >= bounds.start && t.dueDate <= bounds.end),
    [tasks, bounds],
  )

  // ── Tâches en retard (avant weekStart) ──────────────────────────────────────
  const overdueTasks = useMemo(
    () => tasks.filter(t =>
      t.dueDate && t.dueDate < bounds.start &&
      t.status !== 'done' && t.status !== 'cancelled'
    ),
    [tasks, bounds],
  )

  // ── Backlog (sans dueDate, pas terminées) ────────────────────────────────────
  const backlogTasks = useMemo(
    () => tasks.filter(t =>
      !t.dueDate &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
    ).slice(0, 20),
    [tasks],
  )

  // ── Métriques ───────────────────────────────────────────────────────────────
  const planned      = weekTasks.length
  const completed    = weekTasks.filter(t => t.status === 'done').length
  const focusMinutes = weekTasks.reduce((acc, t) => acc + (t.timeEstimate ?? 0), 0)
  const focusDone    = useMemo(
    () => timeSessions
      .filter(s => s.date >= bounds.start && s.date <= bounds.end)
      .reduce((acc, s) => acc + s.duration, 0),
    [timeSessions, bounds],
  )

  // ── Données par jour pour les colonnes ─────────────────────────────────────
  const dayData = useMemo(() => {
    return days.map(day => {
      const dayTasks = weekTasks.filter(t => t.dueDate === day.iso)
      const daySessions: TimeSession[] = timeSessions.filter(s => s.date === day.iso)

      // Barre focus : sessions réelles si dispo, sinon estimations
      const focusByDomainId: Record<string, number> = {}
      if (daySessions.length > 0) {
        daySessions.forEach(s => {
          const task = tasks.find(t => t.id === s.taskId)
          if (task) {
            focusByDomainId[task.domainId] = (focusByDomainId[task.domainId] ?? 0) + s.duration
          }
        })
      } else {
        dayTasks.forEach(t => {
          const est = t.timeEstimate ?? 0
          if (est > 0) {
            focusByDomainId[t.domainId] = (focusByDomainId[t.domainId] ?? 0) + est
          }
        })
      }

      const focusTotal = Object.values(focusByDomainId).reduce((a, b) => a + b, 0)
      const focusSegments: FocusSegment[] = Object.entries(focusByDomainId)
        .sort(([, a], [, b]) => b - a)
        .map(([domainId, mins]) => ({
          domainId,
          domain: domains.find(d => d.id === domainId),
          mins,
          pct: focusTotal ? (mins / focusTotal) * 100 : 0,
        }))

      return { day, dayTasks, focusSegments, focusTotal }
    })
  }, [days, weekTasks, timeSessions, tasks, domains])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggle = (id: string) => {
    const t = tasks.find(t => t.id === id)
    if (!t) return
    setTaskStatus(id, t.status === 'done' ? 'todo' : 'done')
  }

  const openNewTask = (plannedDate?: string) => {
    setTaskModalPlannedDate(plannedDate)
    setTaskModalOpen(true)
  }

  const generatePlan = async () => {
    if (kitPlanLoading) return
    setKitPlanLoading(true); setKitPlanError(null)
    try {
      const active = objectives.filter(o => !o.archived && o.progress < 100)
      const items = await generateWeekPlan({
        domains, objectives: active, milestones,
        recentTasks: tasks.slice(-30),
        scheduleBlocks,
      }, bounds.start)
      setKitPlanItems(items)
    } catch (err) {
      setKitPlanError(err instanceof Error ? err.message : 'Erreur Kit')
    } finally {
      setKitPlanLoading(false)
    }
  }

  const acceptPlan = (selected: WeekPlanItem[]) => {
    selected.forEach(item => {
      addTaskAction({
        domainId:     item.domainId,
        title:        item.title,
        status:       'todo',
        priority:     'medium',
        timeEstimate: item.timeEstimate,
        dueDate:      null,
        plannedDate:  dayDateIsoFromOffset(bounds.start, item.dayOffset),
        objectiveId:  item.objectiveId,
        milestoneId:  item.milestoneId,
      })
    })
    setKitPlanItems(null)
  }

  const firstDomainId = domains[0]?.id ?? ''
  const pctDone = planned ? Math.round((completed / planned) * 100) : 0

  return (
    <div style={{
      padding: '24px 32px 64px',
      maxWidth: 1640, margin: '0 auto',
      background: 'var(--paper)',
      minHeight: '100%',
    }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        {/* Titre + navigation */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 24, marginBottom: 20,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--ink-3)', marginBottom: 4,
            }}>
              semaine · S{weekNum} · {weekYear}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 500,
              color: 'var(--ink)', letterSpacing: '-0.01em',
              margin: '4px 0 2px', lineHeight: 1.15, whiteSpace: 'nowrap',
            }}>
              Semaine du{' '}
              <span style={{
                fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                fontSize: 32, fontWeight: 500, letterSpacing: '-0.005em',
              }}>
                {weekLabel}
              </span>
            </h1>
            <span style={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: 15, color: 'var(--ink-2)',
            }}>
              sept jours, à tenir comme une page de carnet.
            </span>
          </div>

          {/* Navigation */}
          <WeekNav
            weekOffset={weekOffset}
            onPrev={() => setWeekOffset(o => o - 1)}
            onNext={() => setWeekOffset(o => o + 1)}
            onToday={() => setWeekOffset(0)}
            onNewTask={() => openNewTask()}
            onGeneratePlan={kitEnabled ? generatePlan : undefined}
            kitLoading={kitPlanLoading}
            hasNoDomains={domains.length === 0}
          />
        </div>

        {/* Métriques */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <Metric
            label="planifiées"
            value={planned}
            suffix="tâches"
            detail={`${completed} déjà faite${completed > 1 ? 's' : ''}`}
          />
          <Metric
            label="terminées"
            value={completed}
            suffix={`sur ${planned}`}
            detail={`${pctDone} % de la semaine`}
            bar={pctDone}
            barColor="var(--sage)"
          />
          <Metric
            label="heures de focus"
            value={minutesToHours(focusMinutes)}
            suffix="estimées"
            detail={`${minutesToHours(focusDone)} déjà passées`}
            last
          />
        </div>
      </div>

      {/* ── Bandeau retards ───────────────────────────────────────────────── */}
      {overdueTasks.length > 0 && (
        <OverdueBanner
          tasks={overdueTasks}
          domains={domains}
          expanded={showAllOverdue}
          onExpand={() => setShowAllOverdue(v => !v)}
          onToggle={handleToggle}
        />
      )}

      {/* ── Grille 7 colonnes ─────────────────────────────────────────────── */}
      <div style={{
        marginTop: 20,
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(195px, 1fr))',
            minWidth: 1365,
            minHeight: 540,
          }}>
            {dayData.map(({ day, dayTasks, focusSegments, focusTotal }) => (
              <WeekDayColumn
                key={day.i}
                day={day}
                tasks={dayTasks}
                domains={domains}
                focusSegments={focusSegments}
                focusTotal={focusTotal}
                scheduleBlocks={scheduleBlocks.filter((b) => b.daysOfWeek.includes(day.i))}
                isToday={todayIndex === day.i}
                isPast={day.iso < today}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Backlog ───────────────────────────────────────────────────────── */}
      <Backlog tasks={backlogTasks} domains={domains} onToggle={handleToggle} />

      {/* ── Objectifs ─────────────────────────────────────────────────────── */}
      <ObjectivesPage />

      {/* ── TaskFormModal ─────────────────────────────────────────────────── */}
      {taskModalOpen && firstDomainId && (
        <TaskFormModal
          domainId={firstDomainId}
          plannedDate={taskModalPlannedDate}
          onClose={() => setTaskModalOpen(false)}
        />
      )}

      {/* ── Erreur Kit (plan) ─────────────────────────────────────────────── */}
      {kitPlanError && (
        <div
          onClick={() => setKitPlanError(null)}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 60,
            background: 'var(--terra-soft)', border: '1px solid #DEB89C',
            padding: '10px 14px', borderRadius: 8, maxWidth: 320,
            fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)',
            cursor: 'pointer', boxShadow: 'var(--shadow-1)',
          }}
        >
          <strong>Kit :</strong> {kitPlanError}
        </div>
      )}

      {/* ── Modale plan de semaine ────────────────────────────────────────── */}
      {kitPlanItems && (
        <KitWeekPlanModal
          items={kitPlanItems}
          weekStart={bounds.start}
          domains={domains}
          onAccept={acceptPlan}
          onClose={() => setKitPlanItems(null)}
        />
      )}
    </div>
  )
}

// ─── WeekNav ──────────────────────────────────────────────────────────────────

function WeekNav({
  weekOffset, onPrev, onNext, onToday, onNewTask, onGeneratePlan, kitLoading, hasNoDomains,
}: {
  weekOffset: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onNewTask: () => void
  onGeneratePlan?: () => void
  kitLoading?: boolean
  hasNoDomains: boolean
}) {
  const [hoverIdx, setHoverIdx] = useState(-1)

  const navBtn = (i: number, primary = false) => ({
    fontFamily: 'var(--font-sans)' as const, fontSize: 13,
    padding: '7px 12px',
    background: hoverIdx === i ? 'var(--paper-2)' : 'transparent',
    color: 'var(--ink)',
    border: '1px solid ' + (primary && hoverIdx !== i ? 'var(--ink-4)' : hoverIdx === i ? 'var(--ink-4)' : 'transparent'),
    borderRadius: 8, cursor: 'pointer' as const,
    display: 'inline-flex' as const, alignItems: 'center' as const, gap: 6,
    transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
      <button style={navBtn(0)} onMouseEnter={() => setHoverIdx(0)} onMouseLeave={() => setHoverIdx(-1)} onClick={onPrev}>
        <ChevronLeft size={14} /> Préc.
      </button>

      {!isCurrentWeek(weekOffset) && (
        <button style={navBtn(1, true)} onMouseEnter={() => setHoverIdx(1)} onMouseLeave={() => setHoverIdx(-1)} onClick={onToday}>
          Auj.
        </button>
      )}

      <button style={navBtn(2)} onMouseEnter={() => setHoverIdx(2)} onMouseLeave={() => setHoverIdx(-1)} onClick={onNext}>
        Suiv. <ChevronRight size={14} />
      </button>

      <div style={{ width: 1, height: 22, background: 'var(--paper-2)', margin: '0 6px' }} />

      {onGeneratePlan && (
        <button
          onClick={onGeneratePlan}
          disabled={hasNoDomains || kitLoading}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: 13,
            padding: '7px 12px',
            background: hoverIdx === 4 ? 'var(--paper-3)' : 'transparent',
            color: 'var(--terra-deep)',
            border: '1px solid var(--terra-soft)',
            borderRadius: 8, cursor: (hasNoDomains || kitLoading) ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'background var(--dur) var(--ease)',
            opacity: (hasNoDomains || kitLoading) ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={() => setHoverIdx(4)}
          onMouseLeave={() => setHoverIdx(-1)}
        >
          <Sparkles size={14} /> {kitLoading ? 'Kit réfléchit…' : 'Plan Kit'}
        </button>
      )}

      <button
        onClick={onNewTask}
        disabled={hasNoDomains}
        style={{
          fontFamily: 'var(--font-sans)', fontSize: 13,
          padding: '7px 12px',
          background: hoverIdx === 3 ? 'var(--terra-deep)' : 'var(--terra)',
          color: 'var(--paper-1)',
          border: '1px solid transparent',
          borderRadius: 8, cursor: hasNoDomains ? 'not-allowed' : 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: 'background var(--dur) var(--ease)',
          opacity: hasNoDomains ? 0.5 : 1,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={() => setHoverIdx(3)}
        onMouseLeave={() => setHoverIdx(-1)}
      >
        <Plus size={14} /> Nouvelle tâche
      </button>
    </div>
  )
}

// ─── Metric ───────────────────────────────────────────────────────────────────

function Metric({
  label, value, suffix, detail, bar, barColor, last,
}: {
  label: string
  value: string | number
  suffix: string
  detail: string
  bar?: number
  barColor?: string
  last?: boolean
}) {
  return (
    <div style={{
      padding: '18px 22px',
      borderRight: last ? 'none' : '1px solid var(--paper-2)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--ink-3)',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
          fontSize: 36, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em',
          fontFamilySerif: 'var(--font-serif)',
        } as React.CSSProperties}>
          {value}
        </span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)' }}>
          {suffix}
        </span>
      </div>
      {bar !== undefined && (
        <div style={{
          height: 3, borderRadius: 2, background: 'var(--paper-2)',
          marginTop: 6, marginBottom: 4, overflow: 'hidden',
        }}>
          <div style={{
            width: bar + '%', height: '100%',
            background: barColor, transition: 'width var(--dur-slow) var(--ease)',
          }} />
        </div>
      )}
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-2)' }}>
        {detail}
      </span>
    </div>
  )
}
