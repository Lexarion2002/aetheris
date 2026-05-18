import { useState, useMemo, useRef } from 'react'
import { useStore } from '../store'
import { getDomainColors, getDomainIcon } from '../utils/domainColors'
import { ObjectiveFormModal } from '../components/ObjectiveFormModal'
import { TaskFormModal } from '../components/TaskFormModal'
import type { Objective, Milestone, ProgressEntry } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toDateString()

const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - new Date(today()).getTime()) / (1000 * 60 * 60 * 24))

const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const progressColor = (p: number) =>
  p >= 80 ? 'bg-green-500' : p >= 50 ? 'bg-teal-500' : p >= 25 ? 'bg-blue-500' : 'bg-zinc-600'

const progressText = (p: number) =>
  p >= 80 ? 'text-green-400' : p >= 50 ? 'text-teal-400' : p >= 25 ? 'text-blue-400' : 'text-zinc-500'

type ViewMode = 'domains' | 'timeline'
type FilterMode = 'active' | 'archived'

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: ProgressEntry[] }) {
  if (data.length < 2) return null
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const W = 72, H = 24
  const points = sorted.map((e, i) =>
    `${(i / (sorted.length - 1)) * W},${H - (e.value / 100) * H}`
  ).join(' ')
  const last = sorted[sorted.length - 1]
  const lx   = W
  const ly   = H - (last.value / 100) * H

  return (
    <svg width={W} height={H} className="overflow-visible text-teal-500">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.5" fill="currentColor" />
    </svg>
  )
}

// ─── MilestonePanel ───────────────────────────────────────────────────────────

function MilestonePanel({ obj }: { obj: Objective }) {
  const milestones       = useStore((s) => s.milestones.filter((m) => m.objectiveId === obj.id))
  const domains          = useStore((s) => s.domains)
  const addMilestone     = useStore((s) => s.addMilestone)
  const toggleMilestone  = useStore((s) => s.toggleMilestone)
  const deleteMilestone  = useStore((s) => s.deleteMilestone)

  const [newTitle,    setNewTitle]    = useState('')
  const [newDate,     setNewDate]     = useState('')
  const [adding,      setAdding]      = useState(false)
  const [taskModal,   setTaskModal]   = useState<{ milestoneId: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const domain = domains.find((d) => d.id === obj.domainId)
  const sorted = [...milestones].sort((a, b) => a.position - b.position)

  const submitNew = () => {
    if (!newTitle.trim()) return
    const position = milestones.length > 0 ? Math.max(...milestones.map((m) => m.position)) + 1 : 0
    addMilestone({ objectiveId: obj.id, title: newTitle.trim(), targetDate: newDate || null, done: false, position })
    setNewTitle('')
    setNewDate('')
    setAdding(false)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">Jalons</p>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
            className="text-[10px] text-zinc-600 hover:text-teal-400 transition-colors"
          >
            + ajouter
          </button>
        )}
      </div>

      {sorted.map((m) => (
        <div key={m.id} className="group/ms flex items-center gap-2">
          <button
            onClick={() => toggleMilestone(m.id)}
            className={[
              'h-3.5 w-3.5 shrink-0 rounded border transition-colors flex items-center justify-center',
              m.done ? 'border-teal-500 bg-teal-500/30' : 'border-zinc-600 hover:border-teal-500',
            ].join(' ')}
          >
            {m.done && (
              <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <polyline points="1.5,5.5 4,8 8.5,2" />
              </svg>
            )}
          </button>
          <span className={['flex-1 text-xs leading-snug', m.done ? 'line-through text-zinc-600' : 'text-zinc-300'].join(' ')}>
            {m.title}
          </span>
          {m.targetDate && (
            <span className="text-[10px] text-zinc-600 shrink-0 tabular-nums">
              {new Date(m.targetDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover/ms:opacity-100 transition-opacity">
            {!m.done && domain && (
              <button
                onClick={() => setTaskModal({ milestoneId: m.id })}
                className="rounded p-0.5 text-zinc-600 hover:text-teal-400 transition-colors"
                title="Créer une tâche pour ce jalon"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <button
              onClick={() => deleteMilestone(m.id)}
              className="rounded p-0.5 text-zinc-700 hover:text-red-400 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {sorted.length === 0 && !adding && (
        <p className="text-[10px] text-zinc-700 italic">Aucun jalon · découpe cet objectif en étapes concrètes</p>
      )}

      {adding && (
        <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
          <input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitNew(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Titre du jalon…"
            className="w-full rounded border border-zinc-700/60 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full rounded border border-zinc-700/60 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-500 transition-colors [color-scheme:dark]"
          />
          <div className="flex gap-1.5">
            <button onClick={submitNew} className="rounded px-2 py-1 text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-colors">
              Ajouter
            </button>
            <button onClick={() => { setAdding(false); setNewTitle(''); setNewDate('') }} className="rounded px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {taskModal && domain && (
        <TaskFormModal
          domainId={domain.id}
          objectiveId={obj.id}
          milestoneId={taskModal.milestoneId}
          onClose={() => setTaskModal(null)}
        />
      )}
    </div>
  )
}

// ─── FullObjectiveCard ────────────────────────────────────────────────────────

function FullObjectiveCard({ obj, onEdit }: { obj: Objective; onEdit: (o: Objective) => void }) {
  const domains          = useStore((s) => s.domains)
  const tasks            = useStore((s) => s.tasks)
  const milestones       = useStore((s) => s.milestones.filter((m) => m.objectiveId === obj.id))
  const archiveObjective = useStore((s) => s.archiveObjective)
  const deleteObjective  = useStore((s) => s.deleteObjective)

  const [showHistory, setShowHistory] = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)

  const domain      = domains.find((d) => d.id === obj.domainId)
  const colors      = domain ? getDomainColors(domain.color) : null
  const DomainIcon  = domain ? getDomainIcon(domain.name) : null
  const linkedTasks = tasks.filter((t) => t.objectiveId === obj.id)
  const doneTasks   = linkedTasks.filter((t) => t.status === 'done').length

  const days  = obj.targetDate ? daysUntil(obj.targetDate) : null
  const pColor = progressColor(obj.progress)
  const pText  = progressText(obj.progress)

  // Progress : calculé depuis les jalons si présents, sinon depuis les tâches
  const doneMs = milestones.filter((m) => m.done).length
  const progressLabel = milestones.length > 0
    ? `${doneMs}/${milestones.length} jalons`
    : linkedTasks.length > 0
    ? `${doneTasks}/${linkedTasks.length} tâches`
    : null

  const sortedHistory = [...(obj.progressHistory ?? [])].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className={[
      'group rounded-xl border transition-colors flex flex-col',
      obj.archived
        ? 'border-zinc-800/30 bg-zinc-900/20 opacity-60'
        : 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60',
    ].join(' ')}>
      <div className="p-4 flex-1 space-y-3">
        {/* Domain badge */}
        {domain && colors && (
          <div className={['inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', colors.bg, colors.text].join(' ')}>
            <span>{DomainIcon ? <DomainIcon size={12} /> : domain.icon}</span>
            <span>{domain.name}</span>
          </div>
        )}

        {/* Title + status */}
        <div>
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className={['font-semibold leading-tight', obj.archived || obj.progress >= 100 ? 'text-zinc-500' : 'text-zinc-100'].join(' ')}>
              {obj.title}
            </h3>
            {obj.progress >= 100 && !obj.archived && (
              <span className="rounded-full bg-green-500/15 border border-green-500/25 px-2 py-0.5 text-xs text-green-400 flex-shrink-0">
                ✓ Atteint
              </span>
            )}
            {obj.archived && (
              <span className="rounded-full bg-zinc-700/40 border border-zinc-600/30 px-2 py-0.5 text-xs text-zinc-500 flex-shrink-0">
                Archivé
              </span>
            )}
          </div>
          {obj.description && (
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed line-clamp-2">{obj.description}</p>
          )}
        </div>

        {/* Deadline */}
        {obj.targetDate && (
          <div className={[
            'flex items-center gap-1.5 text-xs',
            days !== null && days < 0 ? 'text-red-400' :
            days !== null && days <= 7 ? 'text-orange-400' : 'text-zinc-500',
          ].join(' ')}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
            </svg>
            {days !== null && days < 0  ? `Dépassé de ${Math.abs(days)} j` :
             days !== null && days === 0 ? "Aujourd'hui" :
             fmtDateLong(obj.targetDate)}
            {days !== null && days > 0 && (
              <span className="text-zinc-600 ml-1">· {days}j restants</span>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={['text-sm font-bold tabular-nums', pText].join(' ')}>
                {obj.progress}%
              </span>
              {sortedHistory.length >= 2 && (
                <button onClick={() => setShowHistory(!showHistory)}
                  className={['transition-colors', showHistory ? 'text-teal-400' : 'text-zinc-700 hover:text-teal-500'].join(' ')}>
                  <Sparkline data={sortedHistory} />
                </button>
              )}
            </div>
            {progressLabel && (
              <span className="text-xs text-zinc-600 tabular-nums">{progressLabel}</span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className={['h-full rounded-full transition-all duration-500', pColor].join(' ')} style={{ width: `${obj.progress}%` }} />
          </div>
        </div>

        {/* Progress history */}
        {showHistory && sortedHistory.length > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Historique</p>
            {sortedHistory.map((entry, i) => {
              const prev  = i > 0 ? sortedHistory[i - 1].value : 0
              const delta = entry.value - prev
              return (
                <div key={entry.date} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-zinc-800">
                      <div className={['h-full rounded-full', progressColor(entry.value)].join(' ')} style={{ width: `${entry.value}%` }} />
                    </div>
                    <span className="w-8 text-right tabular-nums font-medium text-zinc-300">{entry.value}%</span>
                    {i > 0 && delta !== 0 && (
                      <span className={['w-10 text-right text-[10px] tabular-nums', delta > 0 ? 'text-green-400' : 'text-red-400'].join(' ')}>
                        {delta > 0 ? '+' : ''}{delta}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Milestones panel */}
        {!obj.archived && <MilestonePanel obj={obj} />}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-zinc-800/60 px-4 py-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <button onClick={() => archiveObjective(obj.id, !obj.archived)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
            {obj.archived ? 'Restaurer' : 'Archiver'}
          </button>
          {!obj.archived && domain && (
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-teal-500/10 hover:text-teal-400 transition-colors"
            >
              + tâche
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(obj)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {confirmDel ? (
            <div className="flex items-center gap-1">
              <button onClick={() => deleteObjective(obj.id)} className="rounded-lg px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Confirmer</button>
              <button onClick={() => setConfirmDel(false)} className="text-zinc-500 hover:text-zinc-300 px-1 transition-colors">×</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {showTaskModal && domain && (
        <TaskFormModal
          domainId={domain.id}
          objectiveId={obj.id}
          onClose={() => setShowTaskModal(false)}
        />
      )}
    </div>
  )
}

// ─── TimelineItem ─────────────────────────────────────────────────────────────

function TimelineItem({ obj, onEdit }: { obj: Objective; onEdit: (o: Objective) => void }) {
  const domains         = useStore((s) => s.domains)
  const archiveObjective = useStore((s) => s.archiveObjective)

  const domain = domains.find((d) => d.id === obj.domainId)
  const colors = domain ? getDomainColors(domain.color) : null
  const DomainIcon = domain ? getDomainIcon(domain.name) : null
  const days   = obj.targetDate ? daysUntil(obj.targetDate) : null
  const pColor = progressColor(obj.progress)

  return (
    <div className="group flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className={['h-3 w-3 rounded-full flex-shrink-0 mt-1.5', colors?.dot ?? 'bg-zinc-600'].join(' ')} />
        <div className="w-px flex-1 bg-zinc-800 mt-1" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-5">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3.5 hover:border-zinc-700/60 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {domain && colors && (
                <span className={['text-xs font-medium', colors.text].join(' ')}>
                {DomainIcon ? <DomainIcon size={12} className="inline mr-1" /> : domain.icon} {domain.name}
                </span>
              )}
              <h4 className="mt-0.5 text-sm font-semibold text-zinc-200 leading-tight">{obj.title}</h4>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(obj)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => archiveObjective(obj.id, true)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors" title="Archiver">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v0a2 2 0 01-2 2M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-2.5 flex items-center gap-3">
            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className={['h-full rounded-full transition-all', pColor].join(' ')} style={{ width: `${obj.progress}%` }} />
            </div>
            <span className={['text-xs font-semibold tabular-nums flex-shrink-0', progressText(obj.progress)].join(' ')}>
              {obj.progress}%
            </span>
          </div>

          {/* Date */}
          {obj.targetDate && (
            <p className={[
              'mt-1.5 text-xs',
              days !== null && days < 0 ? 'text-red-400' :
              days !== null && days <= 7 ? 'text-orange-400' : 'text-zinc-600',
            ].join(' ')}>
              {days !== null && days < 0  ? `⚠ Dépassé de ${Math.abs(days)} j` :
               days !== null && days === 0 ? "Aujourd'hui" :
               days !== null ? `${days} j restants — ` : ''}
              {obj.targetDate && fmtDateLong(obj.targetDate)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ObjectivesPage ───────────────────────────────────────────────────────────

export function ObjectivesPage() {
  const domains    = useStore((s) => s.domains)
  const objectives = useStore((s) => s.objectives)
  const tasks      = useStore((s) => s.tasks)

  const [view,       setView]       = useState<ViewMode>('domains')
  const [filter,     setFilter]     = useState<FilterMode>('active')
  const [showModal,  setShowModal]  = useState(false)
  const [editObj,    setEditObj]    = useState<Objective | undefined>()

  const shown = objectives.filter((o) =>
    filter === 'archived' ? o.archived : !o.archived
  )

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active   = objectives.filter((o) => !o.archived)
    const achieved = active.filter((o) => o.progress >= 100)
    const overdue  = active.filter((o) =>
      o.targetDate && daysUntil(o.targetDate) < 0 && o.progress < 100
    )
    return { total: active.length, achieved: achieved.length, overdue: overdue.length }
  }, [objectives])

  // ── Domains view groups ────────────────────────────────────────────────────

  const domainGroups = useMemo(() =>
    domains
      .map((d) => ({ domain: d, objectives: shown.filter((o) => o.domainId === d.id) }))
      .filter((g) => g.objectives.length > 0),
    [domains, shown]
  )

  // ── Timeline groups ────────────────────────────────────────────────────────

  const timelineGroups = useMemo(() => {
    const overdue   = shown.filter((o) => o.targetDate && daysUntil(o.targetDate) < 0 && o.progress < 100)
    const thisWeek  = shown.filter((o) => o.targetDate && daysUntil(o.targetDate) >= 0 && daysUntil(o.targetDate) <= 7)
    const thisMonth = shown.filter((o) => o.targetDate && daysUntil(o.targetDate) > 7  && daysUntil(o.targetDate) <= 30)
    const later     = shown.filter((o) => o.targetDate && daysUntil(o.targetDate) > 30)
    const noDate    = shown.filter((o) => !o.targetDate)

    const sort = (arr: Objective[]) => [...arr].sort((a, b) =>
      (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999')
    )

    return [
      { label: '⚠ En retard',       color: 'text-red-400',    items: sort(overdue),   show: overdue.length > 0 },
      { label: '🔥 Cette semaine',   color: 'text-orange-400', items: sort(thisWeek),  show: thisWeek.length > 0 },
      { label: '📅 Ce mois',         color: 'text-blue-400',   items: sort(thisMonth), show: thisMonth.length > 0 },
      { label: '🗓 Plus tard',        color: 'text-zinc-400',   items: sort(later),     show: later.length > 0 },
      { label: '∞ Sans date cible',  color: 'text-zinc-600',   items: noDate,          show: noDate.length > 0 },
    ].filter((g) => g.show)
  }, [shown])

  // ── Linked tasks count ─────────────────────────────────────────────────────
  const linkedCount = tasks.filter((t) => t.objectiveId).length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Objectifs</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {stats.total} actif{stats.total !== 1 ? 's' : ''} · {stats.achieved} atteint{stats.achieved !== 1 ? 's' : ''}
            {linkedCount > 0 && ` · ${linkedCount} tâche${linkedCount > 1 ? 's' : ''} liée${linkedCount > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => { setEditObj(undefined); setShowModal(true) }}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-teal-500/15 border border-teal-500/25 px-3 py-2 text-xs font-medium text-teal-400 hover:bg-teal-500/25 transition-colors"
        >
          <span className="text-base leading-none">+</span> Nouvel objectif
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Actifs',    value: stats.total,    accent: 'text-zinc-200' },
          { label: 'Atteints',  value: stats.achieved, accent: 'text-green-400' },
          { label: 'En retard', value: stats.overdue,  accent: stats.overdue > 0 ? 'text-red-400' : 'text-zinc-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
            <p className={['text-2xl font-bold tabular-nums leading-none', s.accent].join(' ')}>{s.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        {/* Filter tabs */}
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
          {(['active', 'archived'] as FilterMode[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={['rounded-md px-3 py-1.5 text-xs font-medium transition-colors', filter === f ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'].join(' ')}>
              {f === 'active' ? 'Actifs' : 'Archivés'}
              <span className="ml-1.5 tabular-nums text-zinc-600">
                ({objectives.filter((o) => (f === 'archived' ? o.archived : !o.archived)).length})
              </span>
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
          {[
            { key: 'domains',  label: 'Domaines', icon: '⊟' },
            { key: 'timeline', label: 'Timeline',  icon: '↕' },
          ].map((v) => (
            <button key={v.key} onClick={() => setView(v.key as ViewMode)}
              className={['rounded-md px-3 py-1.5 text-xs font-medium transition-colors', view === v.key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'].join(' ')}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {shown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-sm text-zinc-500">
            {filter === 'archived' ? 'Aucun objectif archivé' : 'Aucun objectif actif'}
          </p>
          {filter === 'active' && (
            <button onClick={() => { setEditObj(undefined); setShowModal(true) }}
              className="mt-4 text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-300 transition-colors">
              Créer le premier objectif
            </button>
          )}
        </div>
      )}

      {/* ── Domains view ────────────────────────────────────────────────────── */}
      {view === 'domains' && shown.length > 0 && (
        <div className="space-y-6">
          {domainGroups.map(({ domain, objectives: objs }) => {
            const colors = getDomainColors(domain.color)
            const DomainIcon = getDomainIcon(domain.name)
            return (
              <div key={domain.id}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={['h-2 w-2 rounded-full', colors.dot].join(' ')} />
                  <span className={['flex items-center gap-1.5 text-sm font-semibold', colors.text].join(' ')}>
                    {DomainIcon ? <DomainIcon size={16} /> : domain.icon} {domain.name}
                  </span>
                  <span className="text-xs text-zinc-600 tabular-nums">({objs.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {objs
                    .sort((a, b) => a.progress - b.progress)
                    .map((obj) => (
                      <FullObjectiveCard key={obj.id} obj={obj} onEdit={(o) => { setEditObj(o); setShowModal(true) }} />
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Timeline view ────────────────────────────────────────────────────── */}
      {view === 'timeline' && shown.length > 0 && (
        <div className="space-y-6">
          {timelineGroups.map((group) => (
            <div key={group.label}>
              <h3 className={['mb-3 text-sm font-semibold', group.color].join(' ')}>
                {group.label}
                <span className="ml-2 text-xs text-zinc-600 tabular-nums font-normal">({group.items.length})</span>
              </h3>
              <div>
                {group.items.map((obj) => (
                  <TimelineItem key={obj.id} obj={obj} onEdit={(o) => { setEditObj(o); setShowModal(true) }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      {showModal && (
        <ObjectiveFormModal
          objective={editObj}
          domainId={editObj?.domainId}
          onClose={() => { setShowModal(false); setEditObj(undefined) }}
        />
      )}
    </div>
  )
}
