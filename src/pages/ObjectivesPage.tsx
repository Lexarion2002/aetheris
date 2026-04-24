import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { getDomainColors, getDomainIcon } from '../utils/domainColors'
import { ObjectiveFormModal } from '../components/ObjectiveFormModal'
import type { Objective, ProgressEntry } from '../types'

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

// ─── FullObjectiveCard ────────────────────────────────────────────────────────

function FullObjectiveCard({ obj, onEdit }: { obj: Objective; onEdit: (o: Objective) => void }) {
  const domains         = useStore((s) => s.domains)
  const tasks           = useStore((s) => s.tasks)
  const archiveObjective = useStore((s) => s.archiveObjective)
  const deleteObjective  = useStore((s) => s.deleteObjective)
  const setObjectiveProgress = useStore((s) => s.setObjectiveProgress)

  const [showSlider,  setShowSlider]  = useState(false)
  const [localProg,   setLocalProg]   = useState(obj.progress)
  const [showHistory, setShowHistory] = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)

  const domain      = domains.find((d) => d.id === obj.domainId)
  const colors      = domain ? getDomainColors(domain.color) : null
  const DomainIcon  = domain ? getDomainIcon(domain.name) : null
  const linkedTasks = tasks.filter((t) => t.objectiveId === obj.id)
  const doneTasks   = linkedTasks.filter((t) => t.status === 'done').length

  const days  = obj.targetDate ? daysUntil(obj.targetDate) : null
  const pColor = progressColor(obj.progress)
  const pText  = progressText(obj.progress)

  const saveProgress = () => {
    setObjectiveProgress(obj.id, localProg)
    setShowSlider(false)
  }

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

        {/* Progress bar + sparkline */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => { setLocalProg(obj.progress); setShowSlider(!showSlider) }}
                className={['text-sm font-bold tabular-nums transition-colors', pText, 'hover:opacity-80'].join(' ')}>
                {obj.progress}%
              </button>
              {sortedHistory.length >= 2 && (
                <button onClick={() => setShowHistory(!showHistory)}
                  className={['transition-colors', showHistory ? 'text-teal-400' : 'text-zinc-700 hover:text-teal-500'].join(' ')}>
                  <Sparkline data={sortedHistory} />
                </button>
              )}
            </div>
            {linkedTasks.length > 0 && (
              <span className="text-xs text-zinc-600 tabular-nums">
                {doneTasks}/{linkedTasks.length} tâches
              </span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className={['h-full rounded-full transition-all duration-500', pColor].join(' ')} style={{ width: `${obj.progress}%` }} />
          </div>

          {/* Inline slider */}
          {showSlider && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="100" step="5" value={localProg}
                  onChange={(e) => setLocalProg(Number(e.target.value))} className="flex-1 accent-teal-500" />
                <span className="w-9 text-right text-xs font-medium tabular-nums text-zinc-300">{localProg}%</span>
              </div>
              <div className="flex gap-2">
                <button onClick={saveProgress} className="rounded px-2.5 py-1 text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-colors">Mettre à jour</button>
                <button onClick={() => setShowSlider(false)} className="rounded px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</button>
              </div>
            </div>
          )}
        </div>

        {/* Progress history */}
        {showHistory && sortedHistory.length > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Historique d'avancement</p>
            {sortedHistory.map((entry, i) => {
              const prev    = i > 0 ? sortedHistory[i - 1].value : 0
              const delta   = entry.value - prev
              const deltaEl = delta > 0
                ? <span className="text-green-400">+{delta}%</span>
                : delta < 0
                ? <span className="text-red-400">{delta}%</span>
                : null
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
                    {i > 0 && <span className="w-10 text-right text-[10px] tabular-nums">{deltaEl}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Linked tasks */}
        {linkedTasks.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">Tâches liées</p>
            {linkedTasks.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <div className={['h-1.5 w-1.5 rounded-full flex-shrink-0',
                  t.status === 'done'        ? 'bg-green-400' :
                  t.status === 'in_progress' ? 'bg-blue-400' : 'bg-zinc-500'
                ].join(' ')} />
                <span className={t.status === 'done' ? 'line-through text-zinc-600' : 'text-zinc-400'}>
                  {t.title}
                </span>
              </div>
            ))}
            {linkedTasks.length > 3 && (
              <p className="text-[10px] text-zinc-600">+{linkedTasks.length - 3} autre{linkedTasks.length - 3 > 1 ? 's' : ''}</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-zinc-800/60 px-4 py-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => archiveObjective(obj.id, !obj.archived)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
          {obj.archived ? (
            <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 10l4-4M3 10l4 4M21 14H3m18 0l-4-4m4 4l-4 4" /></svg> Restaurer</>
          ) : (
            <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v0a2 2 0 01-2 2M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" /></svg> Archiver</>
          )}
        </button>
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
    const avgProg  = active.length > 0
      ? Math.round(active.reduce((a, o) => a + o.progress, 0) / active.length)
      : 0
    return { total: active.length, achieved: achieved.length, overdue: overdue.length, avgProg }
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Actifs',     value: stats.total,   accent: 'text-zinc-200' },
          { label: 'Atteints',   value: stats.achieved, accent: 'text-green-400' },
          { label: 'En retard',  value: stats.overdue,  accent: stats.overdue > 0 ? 'text-red-400' : 'text-zinc-600' },
          { label: 'Progression moy.', value: `${stats.avgProg}%`, accent: progressText(stats.avgProg) },
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
