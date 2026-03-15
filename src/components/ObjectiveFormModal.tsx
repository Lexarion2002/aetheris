import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '../store'
import { getDomainColors } from '../utils/domainColors'
import type { Objective } from '../types'

interface Props {
  domainId?: string
  objective?: Objective
  onClose: () => void
}

const progressColor = (p: number) =>
  p >= 80 ? 'bg-green-500' : p >= 50 ? 'bg-teal-500' : p >= 25 ? 'bg-blue-500' : 'bg-zinc-500'

export function ObjectiveFormModal({ domainId: propDomainId, objective, onClose }: Props) {
  const domains         = useStore((s) => s.domains)
  const tasks           = useStore((s) => s.tasks)
  const addObjective    = useStore((s) => s.addObjective)
  const updateObjective = useStore((s) => s.updateObjective)
  const updateTask      = useStore((s) => s.updateTask)

  const [title,        setTitle]        = useState(objective?.title ?? '')
  const [description,  setDescription]  = useState(objective?.description ?? '')
  const [targetDate,   setTargetDate]   = useState(objective?.targetDate?.slice(0, 10) ?? '')
  const [progress,     setProgress]     = useState(objective?.progress ?? 0)
  const [domainId,     setDomainId]     = useState(propDomainId ?? objective?.domainId ?? '')
  const [showTaskLink, setShowTaskLink] = useState(false)

  const [linkedTaskIds, setLinkedTaskIds] = useState<Set<string>>(() =>
    new Set(objective ? tasks.filter((t) => t.objectiveId === objective.id).map((t) => t.id) : [])
  )

  const titleRef = useRef<HTMLInputElement>(null)
  const isEdit   = !!objective

  useEffect(() => { titleRef.current?.focus() }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const linkableTasks = useMemo(() =>
    tasks.filter((t) =>
      t.domainId === domainId &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
    ), [tasks, domainId])

  const toggleTask = (taskId: string) => {
    setLinkedTaskIds((prev) => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !domainId) return

    const payload = {
      domainId,
      title:       title.trim(),
      description: description.trim(),
      targetDate:  targetDate || null,
      progress,
    }

    if (isEdit) {
      updateObjective(objective.id, payload)
      for (const t of tasks.filter((t) => t.domainId === domainId)) {
        const wasLinked = t.objectiveId === objective.id
        const nowLinked = linkedTaskIds.has(t.id)
        if (!wasLinked && nowLinked) updateTask(t.id, { objectiveId: objective.id })
        if (wasLinked && !nowLinked)  updateTask(t.id, { objectiveId: undefined })
      }
    } else {
      const newObj = addObjective(payload)
      for (const taskId of linkedTaskIds) {
        updateTask(taskId, { objectiveId: newObj.id })
      }
    }
    onClose()
  }

  const pColor         = progressColor(progress)
  const selectedDomain = domains.find((d) => d.id === domainId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            {isEdit ? "Modifier l'objectif" : 'Nouvel objectif'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {!propDomainId && (
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500">Domaine</label>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {domains.map((d) => {
                  const c = getDomainColors(d.color)
                  return (
                    <button key={d.id} type="button"
                      onClick={() => { setDomainId(d.id); setLinkedTaskIds(new Set()) }}
                      className={[
                        'flex flex-col items-center gap-1 rounded-lg border py-2 px-1 text-center transition-all',
                        domainId === d.id ? [c.bg, c.border, c.text].join(' ') : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300',
                      ].join(' ')}>
                      <span className="text-lg leading-none">{d.icon}</span>
                      <span className="text-[9px] leading-tight">{d.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de l'objectif…"
            className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-colors"
            required />

          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Description, critères de succès, sous-objectifs…" rows={2}
            className="w-full resize-none rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors" />

          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Date cible</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500 transition-colors [color-scheme:dark]" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500">Progression actuelle</label>
              <span className="text-xs font-semibold tabular-nums text-zinc-300">{progress}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={progress}
              onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-teal-500" />
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className={['h-full rounded-full transition-all duration-200', pColor].join(' ')} style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {[0, 25, 50, 75, 100].map((v) => (
                <button key={v} type="button" onClick={() => setProgress(v)}
                  className={['flex-1 rounded py-1 text-xs transition-colors', progress === v ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'].join(' ')}>
                  {v}%
                </button>
              ))}
            </div>
          </div>

          {domainId && linkableTasks.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowTaskLink(!showTaskLink)}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors">
                <span className="flex items-center gap-2">
                  <span>☑</span> Lier des tâches
                  {linkedTaskIds.size > 0 && (
                    <span className="rounded-full bg-teal-500/20 border border-teal-500/30 px-1.5 py-0.5 text-teal-400 tabular-nums">{linkedTaskIds.size}</span>
                  )}
                </span>
                <span className="text-zinc-600">{showTaskLink ? '▲' : '▼'}</span>
              </button>
              {showTaskLink && (
                <div className="mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/60 max-h-40 overflow-y-auto">
                  {linkableTasks.map((t) => {
                    const checked = linkedTaskIds.has(t.id)
                    return (
                      <label key={t.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-zinc-800/40 transition-colors">
                        <div className={['flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors', checked ? 'border-teal-500 bg-teal-500/20' : 'border-zinc-600'].join(' ')}>
                          {checked && <svg className="h-2.5 w-2.5 text-teal-400" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>}
                        </div>
                        <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleTask(t.id)} />
                        <span className="text-xs text-zinc-300">{t.title}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {selectedDomain && (
            <div className="flex items-center gap-2 rounded-lg bg-zinc-800/40 px-3 py-2">
              <span>{selectedDomain.icon}</span>
              <span className="text-xs text-zinc-400">{selectedDomain.name}</span>
              {linkedTaskIds.size > 0 && (
                <span className="ml-auto text-xs text-zinc-600">{linkedTaskIds.size} tâche{linkedTaskIds.size > 1 ? 's' : ''} liée{linkedTaskIds.size > 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors">Annuler</button>
            <button type="submit" disabled={!title.trim() || !domainId}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-40">
              {isEdit ? 'Enregistrer' : "Créer l'objectif"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
