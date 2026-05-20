import { useState, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Layers, Clock3, Plus, ChevronDown, Edit3, CheckCircle2, RotateCcw, Trash2, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { getDomainIcon } from '../utils/domainColors'
import { ObjectiveFormModal } from '../components/ObjectiveFormModal'
import { TaskFormModal } from '../components/TaskFormModal'
import {
  fmtLong, daysUntil, relativeDate, urgencyBucket,
  URGENCY_ORDER, URGENCY_LABEL, type UrgencyBucket,
} from '../utils/objectiveUtils'
import { suggestMilestoneRecovery, type MilestoneRecovery } from '../lib/aiService'
import type { Objective, Milestone } from '../types'

// ─── KitRecoveryBanner — suggestion de reprise pour un objectif en retard ────

function KitRecoveryBanner({ obj }: { obj: Objective }) {
  const domains       = useStore(s => s.domains)
  const allMilestones = useStore(s => s.milestones)
  const addTaskAction = useStore(s => s.addTask)
  const today         = new Date().toISOString().split('T')[0]
  const domain        = domains.find(d => d.id === obj.domainId)

  const [loading, setLoading]    = useState(false)
  const [suggestion, setSuggestion] = useState<MilestoneRecovery | null>(null)
  const [error, setError]        = useState<string | null>(null)
  const [accepted, setAccepted]  = useState(false)

  const fetchSuggestion = async () => {
    setLoading(true); setError(null)
    try {
      const ms = allMilestones.filter(m => m.objectiveId === obj.id)
      const result = await suggestMilestoneRecovery(obj, ms, domain)
      setSuggestion(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur Kit')
    } finally {
      setLoading(false)
    }
  }

  const accept = () => {
    if (!suggestion) return
    addTaskAction({
      domainId:     obj.domainId,
      title:        suggestion.nextAction,
      status:       'todo',
      priority:     'high',
      timeEstimate: suggestion.timeEstimate,
      dueDate:      null,
      plannedDate:  today,
      objectiveId:  obj.id,
    })
    setAccepted(true)
  }

  if (accepted) {
    return (
      <div style={{
        padding: '8px 14px', borderTop: '1px solid var(--paper-2)',
        fontFamily: 'var(--font-sans)', fontSize: 12, fontStyle: 'italic',
        color: 'var(--sage-deep)', background: 'var(--sage-soft)',
      }}>
        ✓ Tâche planifiée pour aujourd'hui — bon courage.
      </div>
    )
  }

  if (!suggestion && !loading && !error) {
    return (
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--paper-2)', background: 'var(--terra-soft)' }}>
        <button
          onClick={(e) => { e.stopPropagation(); void fetchSuggestion() }}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
            color: 'var(--terra-deep)', background: 'transparent',
            border: 0, cursor: 'pointer', padding: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Sparkles size={12} />
          Demander à Kit comment reprendre
        </button>
      </div>
    )
  }

  return (
    <div style={{
      padding: '10px 14px', borderTop: '1px solid var(--paper-2)',
      background: 'var(--terra-soft)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Sparkles size={12} style={{ color: 'var(--terra-deep)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--terra-deep)' }}>
          kit suggère
        </span>
      </div>
      {loading && (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontStyle: 'italic', color: 'var(--ink-2)' }}>
          réflexion…
        </span>
      )}
      {error && (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>
          {error}
        </span>
      )}
      {suggestion && (
        <>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.35 }}>
            {suggestion.nextAction}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.4 }}>
            {suggestion.reason}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={(e) => { e.stopPropagation(); accept() }}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                background: 'var(--terra)', color: 'var(--paper-1)',
                border: 0, borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
              }}
            >
              Reprendre aujourd'hui
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
              {suggestion.timeEstimate}m
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); void fetchSuggestion() }}
              disabled={loading}
              style={{
                marginLeft: 'auto',
                fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-3)',
                background: 'transparent', border: 0, cursor: 'pointer', padding: 0,
              }}
            >
              ↻
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Primitives visuels ────────────────────────────────────────────────────────

function Ring({
  value, size = 32, stroke = 2.5, color = 'var(--sage)',
}: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const filled = Math.min(100, Math.max(0, value))
  return (
    <svg width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--paper-2)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${(c * filled / 100).toFixed(2)} ${c.toFixed(2)}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray var(--dur-slow) var(--ease), stroke var(--dur) var(--ease)' }}
      />
    </svg>
  )
}

function Sparkline({ values, width = 68, height = 22 }: { values: number[]; width?: number; height?: number }) {
  if (!values || values.length < 2) return null
  const step = width / (values.length - 1)
  const py = (v: number) => (height - 2) - (v / 100) * (height - 4)
  const pts = values.map((v, i) => [i * step, py(v)] as [number, number])
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={width} height={height} style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      <path d={area} fill="var(--terra-soft)" opacity={0.55} />
      <path d={line} fill="none" stroke="var(--ink-3)" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2.2} fill="var(--terra)" />
    </svg>
  )
}

// ─── ConfirmModal ──────────────────────────────────────────────────────────────

function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(58,46,34,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--paper-1)', border: '1px solid var(--ink-4)',
          borderRadius: 12, padding: '24px 28px', maxWidth: 340, width: '100%',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)', marginBottom: 20 }}>
          Supprimer cet objectif&nbsp;?
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-2)', marginBottom: 24 }}>
          Cette action supprimera également tous les jalons associés.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={ghostBtn}>Annuler</button>
          <button onClick={onConfirm} style={dangerBtn}>Supprimer</button>
        </div>
      </div>
    </div>
  )
}

// ─── MilestoneRow ──────────────────────────────────────────────────────────────

function MilestoneRow({
  ms, objectiveId, domainId, onToggle,
}: { ms: Milestone; objectiveId: string; domainId: string; onToggle: () => void }) {
  const [hover, setHover] = useState(false)
  const [taskModal, setTaskModal] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 8px 7px 4px', borderRadius: 6,
        background: hover ? 'var(--paper)' : 'transparent',
        transition: 'background var(--dur) var(--ease)',
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          border: `1.5px solid ${ms.done ? 'var(--sage)' : 'var(--ink-3)'}`,
          background: ms.done ? 'var(--sage)' : 'transparent',
          display: 'grid', placeItems: 'center',
          cursor: 'pointer', padding: 0,
          transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
        }}
      >
        {ms.done && (
          <svg width={10} height={10} viewBox="0 0 10 10">
            <path d="M1.6 5.2 L4 7.4 L8.4 2.6" fill="none" stroke="var(--paper-1)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span style={{
        flex: 1, fontFamily: 'var(--font-sans)', fontSize: 14,
        color: ms.done ? 'var(--ink-3)' : 'var(--ink)',
        textDecoration: ms.done ? 'line-through' : 'none',
        textDecorationColor: 'var(--ink-4)',
        transition: 'color var(--dur) var(--ease)',
        lineHeight: 1.4,
      }}>
        {ms.title}
      </span>

      {ms.targetDate && (
        <span style={{ fontSize: 12, color: 'var(--ink-3)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
          {new Date(ms.targetDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </span>
      )}

      <button
        onClick={e => { e.stopPropagation(); setTaskModal(true) }}
        style={{
          opacity: hover ? 1 : 0,
          fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)',
          background: 'var(--paper-2)', border: 0, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          transition: 'opacity var(--dur) var(--ease)',
          padding: '3px 8px', borderRadius: 4, lineHeight: 1.1, flexShrink: 0,
        }}
      >
        <Plus size={10} />tâche
      </button>

      {taskModal && (
        <TaskFormModal
          domainId={domainId}
          objectiveId={objectiveId}
          milestoneId={ms.id}
          onClose={() => setTaskModal(false)}
        />
      )}
    </div>
  )
}

// ─── MilestonesSection ────────────────────────────────────────────────────────

function MilestonesSection({
  obj, onEdit, onArchive, isArchived,
}: { obj: Objective; onEdit: () => void; onArchive: () => void; isArchived: boolean }) {
  const allMilestones  = useStore(s => s.milestones)
  const addMilestone   = useStore(s => s.addMilestone)
  const toggleMilestone = useStore(s => s.toggleMilestone)
  const deleteMilestone = useStore(s => s.deleteMilestone)

  const milestones = useMemo(
    () => allMilestones.filter(m => m.objectiveId === obj.id).sort((a, b) => a.position - b.position),
    [allMilestones, obj.id],
  )

  const [adding, setAdding]   = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const doneMs = milestones.filter(m => m.done).length

  const submitNew = () => {
    if (!newTitle.trim()) return
    const position = milestones.length > 0 ? Math.max(...milestones.map(m => m.position)) + 1 : 0
    addMilestone({ objectiveId: obj.id, title: newTitle.trim(), targetDate: newDate || null, done: false, position })
    setNewTitle('')
    setNewDate('')
    setAdding(false)
  }

  return (
    <div style={{ borderTop: '1px solid var(--paper-2)', padding: '12px 18px 14px' }}>
      {/* Header jalons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={labelStyle}>Jalons</span>
        <span style={{ flex: 1 }} />
        {milestones.length > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            {doneMs} / {milestones.length} atteints
          </span>
        )}
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {milestones.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ flex: 1 }}>
              <MilestoneRow
                ms={m}
                objectiveId={obj.id}
                domainId={obj.domainId}
                onToggle={() => toggleMilestone(m.id)}
              />
            </div>
            <button
              onClick={e => { e.stopPropagation(); deleteMilestone(m.id) }}
              style={{
                background: 'transparent', border: 0, cursor: 'pointer',
                color: 'var(--ink-4)', padding: 4, borderRadius: 4,
                display: 'flex', alignItems: 'center',
                transition: 'color var(--dur) var(--ease)',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-4)')}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {milestones.length === 0 && !adding && (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic', padding: '4px 0' }}>
            Aucun jalon — découpe cet objectif en étapes concrètes.
          </p>
        )}
      </div>

      {/* Formulaire ajout jalon */}
      {adding && (
        <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--paper)', borderRadius: 8, border: '1px solid var(--ink-4)' }}>
          <input
            ref={inputRef}
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitNew(); if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
            placeholder="Titre du jalon…"
            style={{
              width: '100%', background: 'transparent', border: 0,
              fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)',
              outline: 'none', borderBottom: '1px solid var(--ink-4)',
              padding: '4px 0 8px', marginBottom: 8, boxSizing: 'border-box',
            }}
          />
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 8px',
              background: 'var(--paper-1)', border: '1px solid var(--ink-4)',
              borderRadius: 6, color: 'var(--ink)', marginBottom: 8, display: 'block',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={submitNew} style={primaryBtnSm}>Ajouter</button>
            <button onClick={() => { setAdding(false); setNewTitle(''); setNewDate('') }} style={ghostBtn}>Annuler</button>
          </div>
        </div>
      )}

      {/* Actions bas de carte */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--paper-2)' }}>
        {!adding && (
          <button
            onClick={e => { e.stopPropagation(); setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
            style={ghostBtn}
          >
            <Plus size={13} /> Ajouter un jalon
          </button>
        )}
        {adding && <span />}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={e => { e.stopPropagation(); onEdit() }} style={ghostBtn}>
            <Edit3 size={13} /> Modifier
          </button>
          <button onClick={e => { e.stopPropagation(); onArchive() }} style={ghostBtn}>
            {isArchived ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
            {isArchived ? 'Réactiver' : 'Marquer atteint'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CounterMeta ───────────────────────────────────────────────────────────────

function CounterMeta({ obj }: { obj: Objective }) {
  const incrementCounter = useStore((s) => s.incrementCounter)
  const decrementCounter = useStore((s) => s.decrementCounter)
  const logDailyValue    = useStore((s) => s.logDailyValue)
  const target = obj.target ?? 0
  const current = obj.current ?? 0
  const isComplete = current >= target

  const isHabit = obj.cadence === 'daily' && !!obj.dailyTarget
  const cadenceLabel = obj.cadence === 'daily' ? '/ jour'
    : obj.cadence === 'weekly' ? '/ semaine'
    : obj.cadence === 'monthly' ? '/ mois'
    : ''

  const today = new Date().toISOString().split('T')[0]
  const todayLog = obj.dailyLog?.find((e) => e.date === today)
  const todayValue = todayLog?.value ?? 0
  const dailyTarget = obj.dailyTarget ?? 1

  // Pour les habitudes : bouton "+target aujourd'hui"
  if (isHabit) {
    const isDoneToday = todayValue >= dailyTarget
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={(e) => { e.stopPropagation(); logDailyValue(obj.id, todayValue + dailyTarget) }}
          disabled={isComplete}
          style={{
            padding: '4px 12px', borderRadius: 6,
            border: '1px solid ' + (isDoneToday ? 'var(--sage)' : 'var(--terra)'),
            background: isDoneToday ? 'var(--sage-soft)' : 'var(--terra)',
            color: isDoneToday ? 'var(--sage-deep)' : 'var(--paper-1)',
            cursor: isComplete ? 'default' : 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
          }}
        >
          {isDoneToday ? `✓ ${todayValue} aujourd'hui` : `+ ${dailyTarget} aujourd'hui`}
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
          objectif {dailyTarget}/jour
        </span>
      </div>
    )
  }

  // Counter classique
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={(e) => { e.stopPropagation(); decrementCounter(obj.id) }}
        disabled={current === 0}
        style={{
          width: 24, height: 24, borderRadius: 6,
          border: '1px solid var(--ink-4)',
          background: 'transparent', color: 'var(--ink-2)',
          cursor: current === 0 ? 'not-allowed' : 'pointer',
          opacity: current === 0 ? 0.4 : 1,
          fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="Décrémenter"
      >
        −
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); incrementCounter(obj.id) }}
        disabled={isComplete}
        style={{
          padding: '4px 12px', borderRadius: 6,
          border: '1px solid ' + (isComplete ? 'var(--paper-2)' : 'var(--terra)'),
          background: isComplete ? 'transparent' : 'var(--terra)',
          color: isComplete ? 'var(--ink-3)' : 'var(--paper-1)',
          cursor: isComplete ? 'default' : 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}
      >
        {isComplete ? '✓ Atteint' : '+ Ajouter'}
      </button>
      {cadenceLabel && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
          {cadenceLabel}
        </span>
      )}
    </div>
  )
}

// ─── HabitHeatmap ──────────────────────────────────────────────────────────────
// Mini heatmap des 30 derniers jours pour les habitudes

function HabitHeatmap({ obj }: { obj: Objective }) {
  if (!obj.dailyTarget) return null
  const dailyTarget = obj.dailyTarget
  const log = obj.dailyLog ?? []
  const logMap = new Map(log.map((e) => [e.date, e.value]))

  const days: Array<{ date: string; value: number; intensity: number }> = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    const value = logMap.get(iso) ?? 0
    const intensity = value >= dailyTarget ? 4
      : value > dailyTarget * 0.66 ? 3
      : value > dailyTarget * 0.33 ? 2
      : value > 0 ? 1
      : 0
    days.push({ date: iso, value, intensity })
  }

  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap' }}>
      {days.map((d) => (
        <div
          key={d.date}
          title={`${d.date} · ${d.value} ${d.value > 0 ? '/ ' + dailyTarget : ''}`}
          style={{
            width: 12, height: 12, borderRadius: 2,
            background: d.intensity === 0 ? 'var(--paper-2)' : 'var(--sage)',
            opacity: d.intensity === 0 ? 0.6 : 0.2 + d.intensity * 0.2,
          }}
        />
      ))}
    </div>
  )
}

// ─── ObjectiveCard ─────────────────────────────────────────────────────────────

function ObjectiveCard({
  obj, expanded, onExpand, onEdit, onArchive, onDelete,
}: {
  obj: Objective
  expanded: boolean
  onExpand: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [hover, setHover]       = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const domains      = useStore(s => s.domains)
  const allMilestones = useStore(s => s.milestones)
  const kitEnabled   = useStore(s => !!s.anthropicApiKey)

  const milestones = useMemo(
    () => allMilestones.filter(m => m.objectiveId === obj.id),
    [allMilestones, obj.id],
  )

  const domain  = domains.find(d => d.id === obj.domainId)
  const DomainIcon = domain ? getDomainIcon(domain.name) : null

  const bucket   = urgencyBucket(obj.targetDate)
  const isOverdue = bucket === 'overdue' && !obj.archived
  const isArchived = !!obj.archived
  const ringColor = isOverdue ? 'var(--terra)' : 'var(--sage)'

  const sparkValues = (obj.progressHistory ?? [])
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => e.value)

  const doneMs    = milestones.filter(m => m.done).length
  const totalMs   = milestones.length

  return (
    <>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: 'var(--paper-1)',
          border: `1px solid ${expanded ? 'var(--ink-4)' : hover ? 'var(--ink-4)' : 'var(--paper-2)'}`,
          borderRadius: 12,
          transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
          boxShadow: expanded ? 'var(--shadow-1)' : 'none',
          overflow: 'hidden',
          opacity: isArchived ? 0.88 : 1,
        }}
      >
        {/* ── Header cliquable ── */}
        <button
          onClick={onExpand}
          style={{
            display: 'block', width: '100%', padding: '14px 18px 12px',
            background: 'transparent', border: 0, cursor: 'pointer',
            textAlign: 'left', color: 'inherit', fontFamily: 'inherit',
          }}
        >
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Gauche */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                {DomainIcon && <DomainIcon size={12} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />}
                {domain && (
                  <span style={labelStyle}>{domain.name}</span>
                )}
                {isOverdue && (
                  <span style={{ ...badgeStyle, background: 'var(--terra-soft)', color: '#6B2F14', borderColor: '#DEB89C' }}>
                    en retard
                  </span>
                )}
                {isArchived && (
                  <span style={{ ...badgeStyle, background: 'var(--sage-soft)', color: '#3F5A3C', borderColor: '#B9C8B4' }}>
                    atteint
                  </span>
                )}
              </div>
              <div style={{
                fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 500,
                color: 'var(--ink)', letterSpacing: '-0.005em',
                margin: '2px 0 4px', lineHeight: 1.2,
              }}>
                {obj.title}
              </div>
              {obj.description && (
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-2)',
                  lineHeight: 1.45, maxWidth: '62ch',
                }}>
                  {obj.description}
                </div>
              )}
            </div>

            {/* Droite : sparkline ou heatmap (habitude) + anneau */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, paddingTop: 2 }}>
              {obj.kind === 'counter' && obj.cadence === 'daily' && obj.dailyTarget
                ? <HabitHeatmap obj={obj} />
                : <Sparkline values={sparkValues} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ring value={obj.progress} color={ringColor} />
                {obj.kind === 'counter' && obj.target ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--ink)', minWidth: 56, textAlign: 'right' }}>
                    {obj.current ?? 0}&nbsp;/&nbsp;{obj.target}
                  </span>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--ink)', minWidth: 38, textAlign: 'right' }}>
                    {obj.progress}&nbsp;%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Méta bas */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--ink-2)' }}>
              {obj.kind === 'counter' ? (
                <CounterMeta obj={obj} />
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{doneMs}/{totalMs}</span>
                  <span style={{ fontSize: 13 }}>jalons</span>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {obj.targetDate ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                    {fmtLong(obj.targetDate)}
                  </span>
                  <span style={{ color: 'var(--ink-4)' }}>·</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontStyle: 'italic', color: isOverdue ? 'var(--terra)' : 'var(--ink-2)' }}>
                    {relativeDate(obj.targetDate)}
                  </span>
                </span>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>sans date</span>
              )}
              {/* Supprimer */}
              <button
                onClick={e => { e.stopPropagation(); setConfirmDel(true) }}
                style={{
                  background: 'transparent', border: 0, cursor: 'pointer',
                  color: 'var(--ink-4)', padding: 4, borderRadius: 4,
                  display: 'inline-flex', alignItems: 'center',
                  opacity: hover ? 1 : 0,
                  transition: 'opacity var(--dur) var(--ease), color var(--dur) var(--ease)',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-4)')}
              >
                <Trash2 size={14} />
              </button>
              {/* Chevron */}
              <span style={{
                color: 'var(--ink-3)', display: 'inline-flex',
                transition: 'transform var(--dur) var(--ease)',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
              }}>
                <ChevronDown size={16} />
              </span>
            </div>
          </div>
        </button>

        {/* ── Bandeau Kit pour objectifs en retard ── */}
        {isOverdue && kitEnabled && <KitRecoveryBanner obj={obj} />}

        {/* ── Corps déplié — jalons ── */}
        <div style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows var(--dur-slow) var(--ease)',
        }}>
          <div style={{ overflow: 'hidden' }}>
            <MilestonesSection
              obj={obj}
              onEdit={onEdit}
              onArchive={onArchive}
              isArchived={isArchived}
            />
          </div>
        </div>
      </div>

      {confirmDel && (
        <ConfirmModal
          onConfirm={() => { onDelete(); setConfirmDel(false) }}
          onCancel={() => setConfirmDel(false)}
        />
      )}
    </>
  )
}

// ─── GroupHeader ───────────────────────────────────────────────────────────────

function GroupHeader({ label, count, icon }: { label: string; count: number; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12, paddingLeft: 2 }}>
      <h2 style={{
        fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500,
        color: 'var(--ink)', letterSpacing: '-0.005em',
        margin: 0, display: 'inline-flex', alignItems: 'center', gap: 10, lineHeight: 1.2,
      }}>
        {icon}
        {label}
      </h2>
      <span style={{ flex: 1, height: 1, background: 'var(--paper-2)', alignSelf: 'center' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
        {String(count).padStart(2, '0')}
      </span>
    </div>
  )
}

// ─── ObjectivesPage ────────────────────────────────────────────────────────────

type TabMode    = 'active' | 'archived'
type GroupMode  = 'domain' | 'urgency'

export function ObjectivesPage() {
  const domains          = useStore(s => s.domains)
  const objectives       = useStore(s => s.objectives)
  const archiveObjective = useStore(s => s.archiveObjective)
  const deleteObjective  = useStore(s => s.deleteObjective)
  const updateObjective  = useStore(s => s.updateObjective)

  const [tab,        setTab]        = useState<TabMode>('active')
  const [groupBy,    setGroupBy]    = useState<GroupMode>('domain')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modal,      setModal]      = useState<{ mode: 'create' } | { mode: 'edit'; obj: Objective } | null>(null)

  // ── Visible ────────────────────────────────────────────────────────────────

  const visible = useMemo(
    () => objectives.filter(o => tab === 'archived' ? !!o.archived : !o.archived),
    [objectives, tab],
  )

  // ── Métriques ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active   = objectives.filter(o => !o.archived)
    const atteints = objectives.filter(o => !!o.archived).length
    const enRetard = active.filter(o => o.targetDate && daysUntil(o.targetDate) < 0).length
    return { actifs: active.length, atteints, enRetard }
  }, [objectives])

  // ── Groupes ────────────────────────────────────────────────────────────────

  const groups = useMemo(() => {
    if (groupBy === 'domain') {
      // Partir des objectifs visibles → grouper par domainId, puis enrichir avec les détails du domaine
      const byDomainId = new Map<string, Objective[]>()
      visible.forEach(o => {
        if (!byDomainId.has(o.domainId)) byDomainId.set(o.domainId, [])
        byDomainId.get(o.domainId)!.push(o)
      })

      // Respecter l'ordre des domaines du store pour les domaines connus
      const result: { key: string; label: string; icon: React.ReactNode; items: Objective[] }[] = []
      for (const d of domains) {
        const items = byDomainId.get(d.id)
        if (!items) continue
        const I = getDomainIcon(d.name)
        result.push({
          key: d.id,
          label: d.name,
          icon: I ? <I size={15} style={{ color: 'var(--ink-3)' }} /> : <span>{d.icon}</span>,
          items,
        })
        byDomainId.delete(d.id)
      }
      // Fallback : essayer de matcher par nom normalisé (ex: domainId 'droit' → domaine "Droit")
      // Nécessaire quand des objectifs anciens ont l'ID DEFAULT_DOMAINS ('droit', 'sport'...)
      // alors que l'onboarding a recréé les domaines avec des UUID.
      const normalize = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
      const domainByNorm = new Map(domains.map(d => [normalize(d.name), d]))

      for (const [domainId, items] of byDomainId) {
        const matched = domainByNorm.get(normalize(domainId))
        if (matched) {
          const I = getDomainIcon(matched.name)
          result.push({
            key: matched.id,
            label: matched.name,
            icon: I ? <I size={15} style={{ color: 'var(--ink-3)' }} /> : <span>{matched.icon}</span>,
            items,
          })
        } else {
          result.push({ key: domainId, label: domainId, icon: null, items })
        }
      }
      return result
    }
    const map = new Map<UrgencyBucket, Objective[]>()
    URGENCY_ORDER.forEach(u => map.set(u, []))
    visible.forEach(o => {
      const b = urgencyBucket(o.targetDate)
      map.get(b)!.push(o)
    })
    return URGENCY_ORDER
      .filter(u => (map.get(u)?.length ?? 0) > 0)
      .map(u => ({
        key: u,
        label: URGENCY_LABEL[u],
        icon: null as React.ReactNode,
        items: map.get(u)!,
      }))
  }, [visible, groupBy, domains])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleArchive = (obj: Objective) => {
    if (obj.archived) {
      archiveObjective(obj.id, false)
    } else {
      archiveObjective(obj.id, true)
      // Track achievedOn via updateObjective
      updateObjective(obj.id, { progress: 100 } as Parameters<typeof updateObjective>[1])
    }
    setExpandedId(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section style={{ marginTop: 56, maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ink-3)', marginBottom: 4,
          }}>
            boussole
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 500,
            color: 'var(--ink)', letterSpacing: '-0.005em',
            margin: '2px 0 4px', lineHeight: 1.2,
          }}>
            Tes objectifs<span style={{ color: 'var(--terra)' }}>.</span>
          </h2>
          <span style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 14, color: 'var(--ink-2)',
          }}>
            « Avancer doucement, mais avancer. Cocher peu, mais cocher juste. »
          </span>
        </div>
        <button onClick={() => setModal({ mode: 'create' })} style={primaryBtn}>
          <Plus size={15} />
          Nouvel objectif
        </button>
      </div>

      {/* ── Métriques ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
        borderRadius: 12, marginBottom: 28, overflow: 'hidden',
      }}>
        {[
          { label: 'Actifs',    value: stats.actifs,    sub: 'en cours',          tone: '' },
          { label: 'Atteints',  value: stats.atteints,  sub: 'depuis le début',   tone: 'sage' },
          { label: 'En retard', value: stats.enRetard,  sub: 'à reprendre en main', tone: 'terra' },
        ].map((m, i) => (
          <div key={m.label} style={{
            padding: '18px 24px',
            borderLeft: i > 0 ? '1px solid var(--paper-2)' : 0,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <span style={labelStyle}>{m.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 500,
                letterSpacing: '0.01em', lineHeight: 1,
                color: m.tone === 'sage' ? 'var(--sage-deep)'
                     : m.tone === 'terra' ? 'var(--terra)'
                     : 'var(--ink)',
              }}>
                {String(m.value).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)' }}>
                {m.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs + toggle ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: 22, gap: 16, borderBottom: '1px solid var(--paper-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
          {(['active', 'archived'] as TabMode[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontFamily: 'var(--font-sans)', fontSize: 14,
              fontWeight: tab === t ? 500 : 400,
              color: tab === t ? 'var(--ink)' : 'var(--ink-2)',
              background: 'transparent', border: 0, cursor: 'pointer',
              padding: '10px 0', marginRight: 28, marginBottom: -1,
              borderBottom: `2px solid ${tab === t ? 'var(--terra)' : 'transparent'}`,
              transition: 'border-color var(--dur) var(--ease), color var(--dur) var(--ease)',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              {t === 'active' ? 'Actifs' : 'Archivés'}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: tab === t ? 'var(--ink-2)' : 'var(--ink-3)',
                background: 'var(--paper-2)', padding: '2px 6px', borderRadius: 4,
              }}>
                {String(objectives.filter(o => t === 'archived' ? !!o.archived : !o.archived).length).padStart(2, '0')}
              </span>
            </button>
          ))}
        </div>
        <div style={{ paddingBottom: 6 }}>
          <div style={{
            display: 'inline-flex', background: 'var(--paper-1)',
            border: '1px solid var(--paper-2)', borderRadius: 8, padding: 3, gap: 2,
          }}>
            {[
              { value: 'domain',  label: 'Par domaine', Icon: Layers },
              { value: 'urgency', label: 'Par urgence', Icon: Clock3 },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setGroupBy(opt.value as GroupMode)}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 13,
                  padding: '5px 12px', borderRadius: 5, border: 0, cursor: 'pointer',
                  background: groupBy === opt.value ? 'var(--paper-3)' : 'transparent',
                  color:      groupBy === opt.value ? 'var(--ink)'     : 'var(--ink-2)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
                }}
              >
                <opt.Icon size={13} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── État vide ── */}
      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 18 }}>
          {tab === 'archived'
            ? "Aucun objectif archivé pour l'instant."
            : (
              <>
                <p style={{ margin: '0 0 16px' }}>Aucun objectif en cours.</p>
                <button onClick={() => setModal({ mode: 'create' })} style={primaryBtn}>
                  <Plus size={14} /> Nouvel objectif
                </button>
              </>
            )}
        </div>
      )}

      {/* ── Groupes + cartes ── */}
      {visible.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {groups.map(g => (
            <section key={g.key}>
              <GroupHeader label={g.label} count={g.items.length} icon={g.icon} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {g.items.map(o => (
                  <ObjectiveCard
                    key={o.id}
                    obj={o}
                    expanded={expandedId === o.id}
                    onExpand={() => setExpandedId(expandedId === o.id ? null : o.id)}
                    onEdit={() => setModal({ mode: 'edit', obj: o })}
                    onArchive={() => handleArchive(o)}
                    onDelete={() => deleteObjective(o.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Modale ── */}
      {modal?.mode === 'create' && (
        <ObjectiveFormModal onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <ObjectiveFormModal objective={modal.obj} domainId={modal.obj.domainId} onClose={() => setModal(null)} />
      )}
    </section>
  )
}

// ─── Styles partagés ───────────────────────────────────────────────────────────

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink-3)',
}

const badgeStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
  textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4,
  border: '1px solid transparent',
}

const primaryBtn: CSSProperties = {
  fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14,
  padding: '8px 16px', borderRadius: 8, border: '1px solid transparent',
  cursor: 'pointer', background: 'var(--terra)', color: 'var(--paper-1)',
  display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1.2,
  flexShrink: 0,
}

const primaryBtnSm: CSSProperties = {
  ...primaryBtn, fontSize: 13, padding: '6px 12px',
}

const ghostBtn: CSSProperties = {
  fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 13,
  padding: '6px 12px', borderRadius: 8,
  border: '1px solid var(--ink-4)', cursor: 'pointer',
  background: 'transparent', color: 'var(--ink-2)',
  display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1.2,
  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
}

const dangerBtn: CSSProperties = {
  fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13,
  padding: '6px 14px', borderRadius: 8,
  border: '1px solid var(--danger)', cursor: 'pointer',
  background: 'transparent', color: 'var(--danger)',
  display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1.2,
}
