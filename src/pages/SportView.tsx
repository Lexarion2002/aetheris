import { useState, useMemo } from 'react'
import { useSportStore } from '../store/sportStore'
import type { WorkoutEntry, SportObjectif, Mouvement, SessionType, Ressenti, ObjectifType } from '../store/sportStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0]

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000)
}

function currentWeekSessions(historique: WorkoutEntry[]): number {
  const now  = new Date()
  const dow  = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon = 0
  const mon  = new Date(now); mon.setDate(now.getDate() - dow); mon.setHours(0, 0, 0, 0)
  const sun  = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999)
  return historique.filter((e) => {
    const d = new Date(e.date + 'T00:00:00')
    return d >= mon && d <= sun
  }).length
}

function last30days(historique: WorkoutEntry[]): WorkoutEntry[] {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
  return historique
    .filter((e) => new Date(e.date + 'T00:00:00') >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date))
}

function fmtPerf(value: number, unit: 'reps' | 'seconds'): string {
  if (unit === 'seconds') {
    if (value >= 60) return `${Math.floor(value / 60)}min${value % 60 > 0 ? ` ${value % 60}s` : ''}`
    return `${value}s`
  }
  return `${value} reps`
}

// ─── SportView ────────────────────────────────────────────────────────────────

export function SportView() {
  const store = useSportStore()

  const [sessionModal, setSessionModal] = useState<WorkoutEntry | 'new' | null>(null)
  const [perfModal,    setPerfModal]    = useState<Mouvement | null>(null)
  const [objectifModal, setObjectifModal] = useState(false)

  const lastSession = useMemo(
    () => store.historique.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null,
    [store.historique],
  )
  const weekCount = useMemo(() => currentWeekSessions(store.historique), [store.historique])
  const recent    = useMemo(() => last30days(store.historique), [store.historique])

  const STATUS_LABELS: Record<string, string> = {
    reprise:        'Reprise',
    en_rythme:      'En rythme',
    pause_assumee:  'Pause assumée',
  }
  const TYPE_LABELS: Record<SessionType, string> = { course: 'Course', streetworkout: 'Streetworkout' }
  const RESSENTI_LABELS: Record<Ressenti, string> = { facile: 'Facile', correct: 'Correct', dur: 'Dur' }

  return (
    <div className="space-y-10 py-2">

      {/* ── 1. HEADER ─────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Dernière séance */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Dernière séance</p>
            {lastSession ? (
              <p className="text-sm text-zinc-300">
                {fmtDate(lastSession.date)}
                <span className="ml-2 text-zinc-500">· {TYPE_LABELS[lastSession.type]}</span>
                {lastSession.duration > 0 && <span className="ml-2 text-zinc-600">{lastSession.duration}min</span>}
              </p>
            ) : (
              <p className="text-sm text-zinc-600">Aucune séance enregistrée</p>
            )}
          </div>

          {/* Rythme semaine */}
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Cette semaine</p>
            <p className="text-sm text-zinc-300">
              {weekCount === 0 ? '0 séance' : weekCount === 1 ? '1 séance' : `${weekCount} séances`}
            </p>
          </div>
        </div>

        {/* Statut */}
        <div className="flex items-center gap-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Statut</p>
          <div className="flex gap-1.5">
            {(['reprise', 'en_rythme', 'pause_assumee'] as const).map((s) => (
              <button
                key={s}
                onClick={() => store.setStatus(s)}
                className={`rounded-lg px-3 py-1 text-xs transition-all ${
                  store.currentStatus === s
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'border border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. REPRISE COURSE ─────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Reprise Course</h2>

        {/* Stades */}
        <div className="space-y-2">
          {store.courseStades.map((stade) => (
            <div key={stade.id} className="flex items-center justify-between gap-3 group">
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={stade.completed}
                  onChange={() => store.toggleCourseStade(stade.id)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 accent-teal-500"
                />
                <span className={`text-sm ${stade.completed ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                  {stade.label}
                </span>
              </label>
              {stade.custom && (
                <button
                  onClick={() => store.deleteCourseStade(stade.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all text-xs"
                >✕</button>
              )}
            </div>
          ))}
          <AddStadeInput onAdd={store.addCourseStade} />
        </div>

        {/* Dernière sortie + Parcours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Parcours favori */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">Parcours favori</p>
            <input
              className="w-full bg-transparent text-sm text-zinc-300 placeholder-zinc-700 border-0 outline-none"
              placeholder="ex: Bois de Vincennes, 5km"
              value={store.parcoursFavori}
              onChange={(e) => store.setParcoursFavori(e.target.value)}
            />
          </div>

          {/* Bouton enregistrer */}
          <button
            onClick={() => setSessionModal('new')}
            className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-4 text-left hover:bg-teal-500/15 transition-colors"
          >
            <p className="text-xs font-medium text-teal-400">+ Enregistrer une sortie</p>
            <p className="text-[10px] text-zinc-600 mt-1">Course ou Streetworkout</p>
          </button>
        </div>
      </section>

      {/* ── 3. STREETWORKOUT ──────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Streetworkout — Parc</h2>

        {/* Tableau mouvements */}
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wider text-zinc-600">
                <th className="px-4 py-3 text-left">Mouvement</th>
                <th className="px-4 py-3 text-center">Meilleure perf</th>
                <th className="px-4 py-3 text-center">Objectif</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {store.mouvements.map((m) => (
                <MouvRow
                  key={m.id}
                  mouvement={m}
                  onRecord={() => setPerfModal(m)}
                  onUpdateCT={(val) => store.updateObjectifCT(m.id, val)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Parc favori */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2 max-w-xs">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Parc préféré</p>
          <input
            className="w-full bg-transparent text-sm text-zinc-300 placeholder-zinc-700 border-0 outline-none"
            placeholder="ex: Parc Montsouris"
            value={store.parcFavori}
            onChange={(e) => store.setParcFavori(e.target.value)}
          />
        </div>
      </section>

      {/* ── 4. HISTORIQUE ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Dernières séances (30 jours)
          </h2>
          <button
            onClick={() => setSessionModal('new')}
            className="text-xs text-teal-500 hover:text-teal-400 transition-colors"
          >
            + Ajouter une séance
          </button>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-zinc-600 py-4">Aucune séance sur les 30 derniers jours.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                onEdit={() => setSessionModal(entry)}
                onDelete={() => store.deleteSession(entry.id)}
                TYPE_LABELS={TYPE_LABELS}
                RESSENTI_LABELS={RESSENTI_LABELS}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 5. OBJECTIFS ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Mes objectifs</h2>
          {store.objectifs.filter((o) => !o.atteint).length < 3 && (
            <button
              onClick={() => setObjectifModal(true)}
              className="text-xs text-teal-500 hover:text-teal-400 transition-colors"
            >
              + Nouvel objectif
            </button>
          )}
        </div>

        {store.objectifs.length === 0 ? (
          <p className="text-sm text-zinc-600 py-2">Aucun objectif défini.</p>
        ) : (
          <div className="space-y-2">
            {store.objectifs.map((obj) => (
              <ObjectifRow
                key={obj.id}
                obj={obj}
                onComplete={() => store.markObjectifComplete(obj.id)}
                onDelete={() => store.deleteObjectif(obj.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {sessionModal !== null && (
        <SessionModal
          entry={sessionModal === 'new' ? undefined : sessionModal}
          onClose={() => setSessionModal(null)}
          onSave={(data) => {
            if (sessionModal === 'new') store.recordSession(data)
            else store.updateSession(sessionModal.id, data)
            setSessionModal(null)
          }}
        />
      )}
      {perfModal && (
        <PerfModal
          mouvement={perfModal}
          onClose={() => setPerfModal(null)}
          onSave={(val, note) => { store.recordMovementPerf(perfModal.id, val, note); setPerfModal(null) }}
        />
      )}
      {objectifModal && (
        <ObjectifModal
          onClose={() => setObjectifModal(false)}
          onSave={(titre, type, dateCible) => { store.addObjectif(titre, type, dateCible); setObjectifModal(false) }}
        />
      )}
    </div>
  )
}

// ─── MouvRow ──────────────────────────────────────────────────────────────────

function MouvRow({
  mouvement, onRecord, onUpdateCT,
}: { mouvement: Mouvement; onRecord: () => void; onUpdateCT: (v: number) => void }) {
  const [editCT, setEditCT] = useState(false)
  const [ctVal,  setCtVal]  = useState(mouvement.objectifCT.toString())

  const handleCTBlur = () => {
    const v = parseInt(ctVal, 10)
    if (!isNaN(v) && v > 0) onUpdateCT(v)
    else setCtVal(mouvement.objectifCT.toString())
    setEditCT(false)
  }

  return (
    <tr className="group hover:bg-zinc-900/40 transition-colors">
      <td className="px-4 py-3 font-medium text-zinc-200">{mouvement.nom}</td>
      <td className="px-4 py-3 text-center">
        {mouvement.meilleurPerf !== null
          ? <span className="text-teal-400 font-semibold tabular-nums">{fmtPerf(mouvement.meilleurPerf, mouvement.unit)}</span>
          : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-4 py-3 text-center">
        {editCT ? (
          <input
            autoFocus
            type="number"
            min={1}
            value={ctVal}
            onChange={(e) => setCtVal(e.target.value)}
            onBlur={handleCTBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCTBlur(); if (e.key === 'Escape') { setEditCT(false); setCtVal(mouvement.objectifCT.toString()) } }}
            className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-200 text-center outline-none"
          />
        ) : (
          <button onClick={() => setEditCT(true)} className="text-zinc-400 hover:text-zinc-200 transition-colors tabular-nums text-xs">
            {fmtPerf(mouvement.objectifCT, mouvement.unit)} <span className="text-zinc-700">✎</span>
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onRecord}
          className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/20 hover:bg-teal-500/25 transition-all"
        >
          + Perf
        </button>
      </td>
    </tr>
  )
}

// ─── HistoryRow ───────────────────────────────────────────────────────────────

function HistoryRow({
  entry, onEdit, onDelete, TYPE_LABELS, RESSENTI_LABELS,
}: {
  entry: WorkoutEntry
  onEdit: () => void
  onDelete: () => void
  TYPE_LABELS: Record<SessionType, string>
  RESSENTI_LABELS: Record<Ressenti, string>
}) {
  const [confirm, setConfirm] = useState(false)
  const da = daysAgo(entry.date)

  return (
    <div className="flex items-center justify-between gap-3 group rounded-xl border border-zinc-800/60 px-4 py-3 hover:border-zinc-700 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-zinc-500">{fmtDate(entry.date)}{da === 0 ? ' · Aujourd\'hui' : da === 1 ? ' · Hier' : ''}</span>
          <span className="text-xs font-medium text-zinc-300">{TYPE_LABELS[entry.type]}</span>
          {entry.duration > 0 && <span className="text-xs text-zinc-500">{entry.duration}min</span>}
          {entry.distance && <span className="text-xs text-zinc-500">{entry.distance}km</span>}
          {entry.ressenti && <span className="text-xs text-zinc-600">{RESSENTI_LABELS[entry.ressenti]}</span>}
        </div>
        {entry.notes && <p className="mt-0.5 text-xs text-zinc-600 truncate">{entry.notes}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="text-zinc-600 hover:text-zinc-300 transition-colors text-xs p-1">✎</button>
        {confirm
          ? <button onClick={onDelete} className="text-red-400 text-xs px-1.5 py-0.5 rounded border border-red-500/30">Confirmer</button>
          : <button onClick={() => setConfirm(true)} className="text-zinc-700 hover:text-red-400 transition-colors text-xs p-1">✕</button>
        }
      </div>
    </div>
  )
}

// ─── ObjectifRow ──────────────────────────────────────────────────────────────

function ObjectifRow({
  obj, onComplete, onDelete,
}: { obj: SportObjectif; onComplete: () => void; onDelete: () => void }) {
  const TYPE_LABELS: Record<ObjectifType, string> = { regularite: 'Régularité', performance: 'Performance' }
  const daysLeft = obj.dateCible
    ? Math.ceil((new Date(obj.dateCible + 'T00:00:00').getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${obj.atteint ? 'border-zinc-800/40 opacity-50' : 'border-zinc-800'}`}>
      <span className="text-base shrink-0">{obj.atteint ? '☑' : '⏳'}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${obj.atteint ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>{obj.titre}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-600">
          <span>{TYPE_LABELS[obj.type]}</span>
          {obj.dateCible && (
            <span>{daysLeft !== null && daysLeft >= 0 ? `${daysLeft}j restants` : 'Dépassé'}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!obj.atteint && (
          <button
            onClick={onComplete}
            className="text-xs px-2 py-1 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/20 hover:bg-teal-500/25 transition-colors"
          >
            ☑ Atteint
          </button>
        )}
        <button onClick={onDelete} className="text-zinc-700 hover:text-red-400 transition-colors text-xs p-1">✕</button>
      </div>
    </div>
  )
}

// ─── AddStadeInput ────────────────────────────────────────────────────────────

function AddStadeInput({ onAdd }: { onAdd: (label: string) => void }) {
  const [show,  setShow]  = useState(false)
  const [label, setLabel] = useState('')

  const submit = () => {
    const t = label.trim()
    if (t) { onAdd(t); setLabel(''); setShow(false) }
  }

  if (!show) return (
    <button onClick={() => setShow(true)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-1">
      + Ajouter un stade
    </button>
  )

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        autoFocus
        className="flex-1 bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600"
        placeholder="Nom du stade…"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setShow(false); setLabel('') } }}
      />
      <button onClick={submit} className="text-xs px-3 py-1.5 bg-teal-500/15 text-teal-400 rounded-lg border border-teal-500/20 hover:bg-teal-500/25 transition-colors">
        Ajouter
      </button>
      <button onClick={() => { setShow(false); setLabel('') }} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
    </div>
  )
}

// ─── Modal primitives ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── SessionModal ─────────────────────────────────────────────────────────────

function SessionModal({
  entry, onClose, onSave,
}: {
  entry?:   WorkoutEntry
  onClose:  () => void
  onSave:   (data: Omit<WorkoutEntry, 'id' | 'createdAt'>) => void
}) {
  const [type,     setType]     = useState<SessionType>(entry?.type     ?? 'course')
  const [date,     setDate]     = useState(entry?.date     ?? todayStr())
  const [duration, setDuration] = useState(entry?.duration.toString() ?? '')
  const [distance, setDistance] = useState(entry?.distance?.toString() ?? '')
  const [ressenti, setRessenti] = useState<Ressenti | ''>(entry?.ressenti ?? '')
  const [notes,    setNotes]    = useState(entry?.notes ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dur = parseInt(duration, 10)
    if (isNaN(dur) || dur <= 0) return
    onSave({
      type, date, duration: dur,
      distance: distance ? parseFloat(distance) : undefined,
      ressenti:  ressenti || undefined,
      notes:     notes.trim() || undefined,
    })
  }

  return (
    <Modal title={entry ? 'Modifier la séance' : 'Enregistrer une séance'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Type */}
        <div className="grid grid-cols-2 gap-2">
          {(['course', 'streetworkout'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                type === t ? 'border-teal-500/40 bg-teal-500/15 text-teal-400' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
              }`}>
              {t === 'course' ? 'Course' : 'Streetworkout'}
            </button>
          ))}
        </div>

        {/* Date + Durée */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 [color-scheme:dark]" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Durée (min)</label>
            <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} required autoFocus
              className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600" placeholder="30" />
          </div>
        </div>

        {/* Distance (course only) */}
        {type === 'course' && (
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Distance (km, optionnel)</label>
            <input type="number" min={0} step={0.1} value={distance} onChange={(e) => setDistance(e.target.value)}
              className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600" placeholder="5.0" />
          </div>
        )}

        {/* Ressenti */}
        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Ressenti</label>
          <div className="flex gap-2">
            {(['facile', 'correct', 'dur'] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRessenti(ressenti === r ? '' : r)}
                className={`flex-1 py-1.5 rounded-lg border text-xs transition-all capitalize ${
                  ressenti === r ? 'border-teal-500/40 bg-teal-500/15 text-teal-400' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Note libre (optionnel)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observations, contexte…"
            className="w-full resize-none rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-xl transition-colors">Annuler</button>
          <button type="submit" disabled={!duration} className="px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-xl hover:bg-white transition-colors disabled:opacity-40">
            {entry ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── PerfModal ────────────────────────────────────────────────────────────────

function PerfModal({
  mouvement, onClose, onSave,
}: { mouvement: Mouvement; onClose: () => void; onSave: (val: number, note?: string) => void }) {
  const [val,  setVal]  = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = mouvement.unit === 'seconds' ? parseFloat(val) : parseInt(val, 10)
    if (isNaN(v) || v <= 0) return
    onSave(v, note.trim() || undefined)
  }

  const placeholder = mouvement.unit === 'reps' ? 'Nombre de reps' : 'Durée en secondes (ex: 90)'

  return (
    <Modal title={`Enregistrer — ${mouvement.nom}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">
            {mouvement.unit === 'reps' ? 'Répétitions' : 'Durée (secondes)'}
          </label>
          <input type="number" min={1} value={val} onChange={(e) => setVal(e.target.value)} required autoFocus
            className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600" placeholder={placeholder} />
          {mouvement.meilleurPerf !== null && (
            <p className="text-[10px] text-zinc-600 mt-1">Record actuel : {fmtPerf(mouvement.meilleurPerf, mouvement.unit)}</p>
          )}
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Note (optionnel)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600" placeholder="ex: après échauffement" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-xl transition-colors">Annuler</button>
          <button type="submit" disabled={!val} className="px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-xl hover:bg-white transition-colors disabled:opacity-40">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── ObjectifModal ────────────────────────────────────────────────────────────

function ObjectifModal({
  onClose, onSave,
}: { onClose: () => void; onSave: (titre: string, type: ObjectifType, dateCible: string | null) => void }) {
  const [titre,     setTitre]     = useState('')
  const [type,      setType]      = useState<ObjectifType>('regularite')
  const [dateCible, setDateCible] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre.trim()) return
    onSave(titre.trim(), type, dateCible || null)
  }

  return (
    <Modal title="Nouvel objectif" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Objectif</label>
          <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} required autoFocus
            className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600"
            placeholder="ex: 3 séances cette semaine" />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(['regularite', 'performance'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                  type === t ? 'border-teal-500/40 bg-teal-500/15 text-teal-400' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}>
                {t === 'regularite' ? 'Régularité' : 'Performance'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Date cible (optionnel)</label>
          <input type="date" value={dateCible} onChange={(e) => setDateCible(e.target.value)}
            className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 [color-scheme:dark]" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 rounded-xl transition-colors">Annuler</button>
          <button type="submit" disabled={!titre.trim()} className="px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-xl hover:bg-white transition-colors disabled:opacity-40">Créer</button>
        </div>
      </form>
    </Modal>
  )
}
