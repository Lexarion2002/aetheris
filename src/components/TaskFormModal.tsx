import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '../store'
import type { Task, Priority, TaskStatus } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  domainId:       string
  task?:          Task
  objectiveId?:   string   // pré-rempli depuis ObjectivesPage
  milestoneId?:   string   // pré-rempli depuis un jalon
  plannedDate?:   string   // pré-rempli depuis TodayPage
  onClose: () => void
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITIES: { value: Priority; label: string; cls: string }[] = [
  { value: 'low',    label: 'Basse',   cls: 'border-zinc-700 text-zinc-400 data-[sel=true]:bg-zinc-700/50 data-[sel=true]:border-zinc-500 data-[sel=true]:text-zinc-200' },
  { value: 'medium', label: 'Moyenne', cls: 'border-zinc-700 text-zinc-400 data-[sel=true]:bg-blue-500/20 data-[sel=true]:border-blue-500/50 data-[sel=true]:text-blue-300' },
  { value: 'high',   label: 'Haute',   cls: 'border-zinc-700 text-zinc-400 data-[sel=true]:bg-orange-500/20 data-[sel=true]:border-orange-500/50 data-[sel=true]:text-orange-300' },
  { value: 'urgent', label: 'Urgent',  cls: 'border-zinc-700 text-zinc-400 data-[sel=true]:bg-red-500/20 data-[sel=true]:border-red-500/50 data-[sel=true]:text-red-300' },
]

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo',        label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done',        label: 'Terminée' },
  { value: 'cancelled',   label: 'Annulée' },
]

const TIME_PRESETS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h',  value: 60 },
  { label: '2h',  value: 120 },
  { label: '4h',  value: 240 },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskFormModal({ domainId, task, objectiveId: prefillObjectiveId, milestoneId: prefillMilestoneId, plannedDate: prefillPlannedDate, onClose }: Props) {
  const addTask       = useStore((s) => s.addTask)
  const updateTask    = useStore((s) => s.updateTask)
  const allObjectives = useStore((s) => s.objectives)
  const allMilestones = useStore((s) => s.milestones)
  const objectives    = useMemo(
    () => allObjectives.filter((o) => o.domainId === domainId && !o.archived),
    [allObjectives, domainId],
  )

  const [title,        setTitle]        = useState(task?.title ?? '')
  const [priority,     setPriority]     = useState<Priority>(task?.priority ?? 'medium')
  const [status,       setStatus]       = useState<TaskStatus>(task?.status ?? 'todo')
  const [timeEstimate, setTimeEstimate] = useState<string>(task?.timeEstimate != null ? String(task.timeEstimate) : '')
  const [dueDate,      setDueDate]      = useState(task?.dueDate?.slice(0, 10) ?? '')
  const [plannedDate,  setPlannedDate]  = useState(task?.plannedDate?.slice(0, 10) ?? prefillPlannedDate ?? '')
  const [notes,        setNotes]        = useState(task?.notes ?? '')
  const [objectiveId,  setObjectiveId]  = useState<string>(task?.objectiveId ?? prefillObjectiveId ?? '')
  const [milestoneId,  setMilestoneId]  = useState<string>(task?.milestoneId ?? prefillMilestoneId ?? '')

  const milestonesForObjective = useMemo(
    () => objectiveId ? allMilestones.filter((m) => m.objectiveId === objectiveId && !m.done) : [],
    [allMilestones, objectiveId],
  )

  const titleRef = useRef<HTMLInputElement>(null)
  const isEdit = !!task

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const payload = {
      domainId,
      title:        title.trim(),
      priority,
      status,
      timeEstimate: timeEstimate ? parseInt(timeEstimate, 10) : null,
      dueDate:      dueDate || null,
      plannedDate:  plannedDate || null,
      notes:        notes || undefined,
      objectiveId:  objectiveId || undefined,
      milestoneId:  milestoneId || undefined,
    }

    if (isEdit) updateTask(task.id, payload)
    else        addTask(payload)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Title */}
          <div>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la tâche…"
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-colors"
              required
            />
          </div>

          {/* Priority */}
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Priorité</p>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  data-sel={priority === p.value ? 'true' : 'false'}
                  onClick={() => setPriority(p.value)}
                  className={[
                    'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all',
                    p.cls,
                  ].join(' ')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status + Time estimate row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500 transition-colors"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500">Durée estimée (min)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={timeEstimate}
                  onChange={(e) => setTimeEstimate(e.target.value)}
                  placeholder="ex: 45"
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setTimeEstimate(String(p.value))}
                    className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500">Planifier pour</label>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500">Échéance dure</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Objectif lié */}
          {objectives.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500">Lier à un objectif</label>
              <div className="space-y-1">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 hover:bg-zinc-800/40 transition-colors">
                  <input type="radio" className="accent-teal-500" name="obj" checked={!objectiveId} onChange={() => setObjectiveId('')} />
                  <span className="text-xs text-zinc-500">Aucun</span>
                </label>
                {objectives.map((o) => {
                  const pCol = o.progress >= 80 ? 'bg-green-500' : o.progress >= 50 ? 'bg-teal-500' : o.progress >= 25 ? 'bg-blue-500' : 'bg-zinc-600'
                  return (
                    <label key={o.id} className={['flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors', objectiveId === o.id ? 'border-teal-500/40 bg-teal-500/10' : 'border-zinc-800 hover:bg-zinc-800/40'].join(' ')}>
                      <input type="radio" className="accent-teal-500" name="obj" checked={objectiveId === o.id} onChange={() => setObjectiveId(o.id)} />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-zinc-200">{o.title}</span>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
                            <div className={['h-full rounded-full', pCol].join(' ')} style={{ width: `${o.progress}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums text-zinc-600">{o.progress}%</span>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Jalon lié */}
          {milestonesForObjective.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500">Jalon associé</label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500 transition-colors"
              >
                <option value="">Aucun</option>
                {milestonesForObjective.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}{m.targetDate ? ` · ${new Date(m.targetDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Note rapide</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter une note…"
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-40"
              disabled={!title.trim()}
            >
              {isEdit ? 'Enregistrer' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
