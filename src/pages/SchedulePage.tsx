import { useMemo, useState, type CSSProperties } from 'react'
import { Plus, Trash2, X, GraduationCap, Briefcase, BookOpen, Circle, Repeat } from 'lucide-react'
import { useStore } from '../store'
import { expandDomains } from '../utils/standaloneDomains'
import type { ScheduleBlock, ScheduleBlockKind, Routine, RoutineCadence } from '../types'

// ─── Constantes ──────────────────────────────────────────────────────────────

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const START_HOUR = 7
const END_HOUR   = 22
const HOUR_HEIGHT = 56  // pixels par heure

const KIND_META: Record<ScheduleBlockKind, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number; style?: CSSProperties }> }> = {
  class:      { label: 'Cours',      color: 'var(--terra-deep)', bg: 'var(--terra-soft)',  icon: GraduationCap },
  work:       { label: 'Travail',    color: 'var(--ink)',        bg: 'var(--paper-3)',     icon: Briefcase },
  commitment: { label: 'Engagement', color: 'var(--sage-deep)',  bg: 'var(--sage-soft)',   icon: Circle },
  routine:    { label: 'Routine',    color: 'var(--ink-2)',      bg: 'var(--paper-2)',     icon: BookOpen },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function blockTopPx(time: string): number {
  return ((timeToMinutes(time) - START_HOUR * 60) / 60) * HOUR_HEIGHT
}

function blockHeightPx(start: string, end: string): number {
  return ((timeToMinutes(end) - timeToMinutes(start)) / 60) * HOUR_HEIGHT
}

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink-3)',
}

// ─── Modale d'édition ────────────────────────────────────────────────────────

interface FormState {
  title:      string
  kind:       ScheduleBlockKind
  daysOfWeek: number[]
  startTime:  string
  endTime:    string
  domainId:   string
  notes:      string
}

function emptyForm(): FormState {
  return {
    title: '', kind: 'class', daysOfWeek: [], startTime: '09:00', endTime: '12:00',
    domainId: '', notes: '',
  }
}

function BlockEditorModal({
  block, onClose,
}: {
  block: ScheduleBlock | null  // null = création
  onClose: () => void
}) {
  const storeDomains = useStore((s) => s.domains)
  const domains = useMemo(() => expandDomains(storeDomains), [storeDomains])
  const addBlock    = useStore((s) => s.addScheduleBlock)
  const updateBlock = useStore((s) => s.updateScheduleBlock)
  const deleteBlock = useStore((s) => s.deleteScheduleBlock)

  const [form, setForm] = useState<FormState>(() =>
    block ? {
      title: block.title, kind: block.kind, daysOfWeek: [...block.daysOfWeek],
      startTime: block.startTime, endTime: block.endTime,
      domainId: block.domainId ?? '', notes: block.notes ?? '',
    } : emptyForm()
  )

  const toggleDay = (d: number) => {
    setForm((s) => ({
      ...s,
      daysOfWeek: s.daysOfWeek.includes(d) ? s.daysOfWeek.filter((x) => x !== d) : [...s.daysOfWeek, d].sort(),
    }))
  }

  const canSave =
    form.title.trim().length > 0 &&
    form.daysOfWeek.length > 0 &&
    timeToMinutes(form.endTime) > timeToMinutes(form.startTime)

  const save = () => {
    if (!canSave) return
    const payload = {
      title:      form.title.trim(),
      kind:       form.kind,
      daysOfWeek: form.daysOfWeek,
      startTime:  form.startTime,
      endTime:    form.endTime,
      domainId:   form.domainId || undefined,
      notes:      form.notes.trim() || undefined,
    }
    if (block) updateBlock(block.id, payload)
    else addBlock(payload)
    onClose()
  }

  const input: CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--ink-4)', background: 'var(--paper-1)',
    fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', outline: 'none',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(58,46,34,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 50, padding: '40px 20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper-1)', border: '1px solid var(--ink-4)',
          borderRadius: 14, maxWidth: 520, width: '100%',
          boxShadow: 'var(--shadow-2)', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--paper-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>
            {block ? 'Modifier ce bloc' : 'Nouveau bloc'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type */}
          <div>
            <label style={labelStyle}>Type</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {(Object.entries(KIND_META) as Array<[ScheduleBlockKind, typeof KIND_META[ScheduleBlockKind]]>).map(([k, meta]) => {
                const Icon = meta.icon
                const active = form.kind === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, kind: k }))}
                    style={{
                      padding: '6px 12px', borderRadius: 999,
                      border: '1px solid ' + (active ? meta.color : 'var(--paper-2)'),
                      background: active ? meta.bg : 'transparent',
                      color: active ? meta.color : 'var(--ink-2)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: active ? 500 : 400,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Icon size={12} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label style={labelStyle}>Titre</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="Cours · Droit fiscal"
              style={{ ...input, marginTop: 6 }}
            />
          </div>

          {/* Jours */}
          <div>
            <label style={labelStyle}>Jours</label>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {DAYS_SHORT.map((d, i) => {
                const active = form.daysOfWeek.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: '1px solid ' + (active ? 'var(--terra)' : 'var(--paper-2)'),
                      background: active ? 'var(--terra)' : 'transparent',
                      color: active ? 'var(--paper-1)' : 'var(--ink-2)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: active ? 500 : 400,
                    }}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Horaires */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Début</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((s) => ({ ...s, startTime: e.target.value }))}
                style={{ ...input, marginTop: 6, fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Fin</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((s) => ({ ...s, endTime: e.target.value }))}
                style={{ ...input, marginTop: 6, fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          {/* Domaine (optionnel) */}
          {domains.length > 0 && (
            <div>
              <label style={labelStyle}>Domaine (optionnel)</label>
              <select
                value={form.domainId}
                onChange={(e) => setForm((s) => ({ ...s, domainId: e.target.value }))}
                style={{ ...input, marginTop: 6 }}
              >
                <option value="">—</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes (optionnel)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              rows={2}
              placeholder="Salle, prof, infos pratiques…"
              style={{ ...input, marginTop: 6, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--paper-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {block ? (
            <button
              onClick={() => { deleteBlock(block.id); onClose() }}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--danger)',
                background: 'transparent', border: 0, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <Trash2 size={12} /> Supprimer
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 13,
                background: 'transparent', color: 'var(--ink-2)',
                border: '1px solid var(--ink-4)', borderRadius: 8,
                padding: '7px 14px', cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={save}
              disabled={!canSave}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                background: 'var(--terra)', color: 'var(--paper-1)',
                border: 0, borderRadius: 8, padding: '7px 16px',
                cursor: canSave ? 'pointer' : 'not-allowed',
                opacity: canSave ? 1 : 0.5,
              }}
            >
              {block ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modale d'édition Routine ────────────────────────────────────────────────

interface RoutineFormState {
  title:         string
  cadence:       RoutineCadence
  daysOfWeek:    number[]
  dayOfMonth:    number
  preferredTime: string
  timeEstimate:  number
  domainId:      string
  notes:         string
}

function emptyRoutineForm(): RoutineFormState {
  return {
    title: '', cadence: 'weekly', daysOfWeek: [], dayOfMonth: 1,
    preferredTime: '', timeEstimate: 30, domainId: '', notes: '',
  }
}

function RoutineEditorModal({
  routine, onClose,
}: {
  routine: Routine | null
  onClose: () => void
}) {
  const storeDomains = useStore((s) => s.domains)
  const domains = useMemo(() => expandDomains(storeDomains), [storeDomains])
  const addRoutine    = useStore((s) => s.addRoutine)
  const updateRoutine = useStore((s) => s.updateRoutine)
  const deleteRoutine = useStore((s) => s.deleteRoutine)

  const [form, setForm] = useState<RoutineFormState>(() =>
    routine ? {
      title:         routine.title,
      cadence:       routine.cadence,
      daysOfWeek:    routine.daysOfWeek ? [...routine.daysOfWeek] : [],
      dayOfMonth:    routine.dayOfMonth ?? 1,
      preferredTime: routine.preferredTime ?? '',
      timeEstimate:  routine.timeEstimate ?? 30,
      domainId:      routine.domainId ?? '',
      notes:         routine.notes ?? '',
    } : emptyRoutineForm()
  )

  const toggleDay = (d: number) => {
    setForm((s) => ({
      ...s,
      daysOfWeek: s.daysOfWeek.includes(d) ? s.daysOfWeek.filter((x) => x !== d) : [...s.daysOfWeek, d].sort(),
    }))
  }

  const canSave =
    form.title.trim().length > 0 &&
    (form.cadence !== 'weekly' || form.daysOfWeek.length > 0) &&
    (form.cadence !== 'monthly' || (form.dayOfMonth >= 1 && form.dayOfMonth <= 31))

  const save = () => {
    if (!canSave) return
    const payload = {
      title:         form.title.trim(),
      cadence:       form.cadence,
      daysOfWeek:    form.cadence === 'weekly' ? form.daysOfWeek : undefined,
      dayOfMonth:    form.cadence === 'monthly' ? form.dayOfMonth : undefined,
      preferredTime: form.preferredTime.trim() || undefined,
      timeEstimate:  form.timeEstimate > 0 ? form.timeEstimate : undefined,
      domainId:      form.domainId || undefined,
      notes:         form.notes.trim() || undefined,
    }
    if (routine) updateRoutine(routine.id, payload)
    else addRoutine(payload)
    onClose()
  }

  const input: CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--ink-4)', background: 'var(--paper-1)',
    fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', outline: 'none',
  }

  const CADENCE_OPTIONS: Array<{ value: RoutineCadence; label: string }> = [
    { value: 'daily',   label: 'Tous les jours' },
    { value: 'weekly',  label: 'Certains jours' },
    { value: 'monthly', label: '1×/mois' },
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(58,46,34,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 50, padding: '40px 20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper-1)', border: '1px solid var(--ink-4)',
          borderRadius: 14, maxWidth: 520, width: '100%',
          boxShadow: 'var(--shadow-2)', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--paper-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>
            {routine ? 'Modifier la routine' : 'Nouvelle routine'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Titre */}
          <div>
            <label style={labelStyle}>Intitulé</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="Faire la lessive"
              style={{ ...input, marginTop: 6 }}
            />
          </div>

          {/* Cadence */}
          <div>
            <label style={labelStyle}>Rythme</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {CADENCE_OPTIONS.map((opt) => {
                const active = form.cadence === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, cadence: opt.value }))}
                    style={{
                      padding: '6px 12px', borderRadius: 999,
                      border: '1px solid ' + (active ? 'var(--terra)' : 'var(--paper-2)'),
                      background: active ? 'var(--terra)' : 'transparent',
                      color: active ? 'var(--paper-1)' : 'var(--ink-2)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: active ? 500 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Jours (weekly) */}
          {form.cadence === 'weekly' && (
            <div>
              <label style={labelStyle}>Jours</label>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                {DAYS_SHORT.map((d, i) => {
                  const active = form.daysOfWeek.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8,
                        border: '1px solid ' + (active ? 'var(--terra)' : 'var(--paper-2)'),
                        background: active ? 'var(--terra)' : 'transparent',
                        color: active ? 'var(--paper-1)' : 'var(--ink-2)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: active ? 500 : 400,
                      }}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Jour du mois (monthly) */}
          {form.cadence === 'monthly' && (
            <div>
              <label style={labelStyle}>Jour du mois</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.dayOfMonth}
                onChange={(e) => setForm((s) => ({ ...s, dayOfMonth: Math.max(1, Math.min(31, parseInt(e.target.value || '1', 10))) }))}
                style={{ ...input, marginTop: 6, fontFamily: 'var(--font-mono)', width: 100 }}
              />
            </div>
          )}

          {/* Heure préférée + durée */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Heure préférée (optionnel)</label>
              <input
                type="time"
                value={form.preferredTime}
                onChange={(e) => setForm((s) => ({ ...s, preferredTime: e.target.value }))}
                style={{ ...input, marginTop: 6, fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Durée (min)</label>
              <input
                type="number"
                min={5}
                max={240}
                step={5}
                value={form.timeEstimate}
                onChange={(e) => setForm((s) => ({ ...s, timeEstimate: Math.max(0, parseInt(e.target.value || '0', 10)) }))}
                style={{ ...input, marginTop: 6, fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          {/* Domaine optionnel */}
          {domains.length > 0 && (
            <div>
              <label style={labelStyle}>Domaine (optionnel)</label>
              <select
                value={form.domainId}
                onChange={(e) => setForm((s) => ({ ...s, domainId: e.target.value }))}
                style={{ ...input, marginTop: 6 }}
              >
                <option value="">—</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes (optionnel)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              rows={2}
              placeholder="Détail, contraintes…"
              style={{ ...input, marginTop: 6, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--paper-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {routine ? (
            <button
              onClick={() => { deleteRoutine(routine.id); onClose() }}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--danger)',
                background: 'transparent', border: 0, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <Trash2 size={12} /> Supprimer
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 13,
                background: 'transparent', color: 'var(--ink-2)',
                border: '1px solid var(--ink-4)', borderRadius: 8,
                padding: '7px 14px', cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={save}
              disabled={!canSave}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                background: 'var(--terra)', color: 'var(--paper-1)',
                border: 0, borderRadius: 8, padding: '7px 16px',
                cursor: canSave ? 'pointer' : 'not-allowed',
                opacity: canSave ? 1 : 0.5,
              }}
            >
              {routine ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export function SchedulePage() {
  const blocks = useStore((s) => s.scheduleBlocks)
  const routines = useStore((s) => s.routines ?? [])
  const [editing, setEditing] = useState<{ open: boolean; block: ScheduleBlock | null }>({ open: false, block: null })
  const [editingRoutine, setEditingRoutine] = useState<{ open: boolean; routine: Routine | null }>({ open: false, routine: null })

  // Couvrir le rendu : on regroupe les blocks par jour
  const blocksByDay = useMemo(() => {
    const out: Record<number, ScheduleBlock[]> = {}
    for (let i = 0; i < 7; i++) out[i] = []
    for (const b of blocks) {
      for (const d of b.daysOfWeek) {
        if (out[d]) out[d].push(b)
      }
    }
    return out
  }, [blocks])

  const hours: number[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h)

  return (
    <div style={{ padding: '32px 48px 64px', maxWidth: 1240, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <span style={labelStyle}>emploi du temps · récurrent</span>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 500,
            color: 'var(--ink)', letterSpacing: '-0.01em',
            margin: '6px 0 10px', lineHeight: 1.1,
          }}>
            Tes plages bloquées<span style={{ color: 'var(--terra)' }}>.</span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16,
            color: 'var(--ink-2)', margin: 0, maxWidth: '56ch', lineHeight: 1.4,
          }}>
            « Pose ici tes cours, ton alternance, tes rendez-vous récurrents — Kit s'en sert pour planifier autour. »
          </p>
        </div>
        <button
          onClick={() => setEditing({ open: true, block: null })}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
            background: 'var(--terra)', color: 'var(--paper-1)',
            border: 0, borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Plus size={14} /> Nouveau bloc
        </button>
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
        {(Object.entries(KIND_META) as Array<[ScheduleBlockKind, typeof KIND_META[ScheduleBlockKind]]>).map(([k, meta]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: meta.bg, border: `1px solid ${meta.color}` }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)' }}>{meta.label}</span>
          </div>
        ))}
      </div>

      {/* Grille hebdo */}
      <div style={{
        background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {/* En-têtes des jours */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(7, 1fr)',
          borderBottom: '1px solid var(--paper-2)',
        }}>
          <div />
          {DAYS.map((d) => (
            <div key={d} style={{
              padding: '12px 8px', textAlign: 'center',
              fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)',
              borderLeft: '1px solid var(--paper-2)',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Lignes horaires + colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', position: 'relative' }}>
          {/* Colonne des heures */}
          <div style={{ position: 'relative' }}>
            {hours.map((h) => (
              <div key={h} style={{
                height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: 4, paddingRight: 8,
                fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)',
                borderTop: '1px solid var(--paper-2)',
                boxSizing: 'border-box',
              }}>
                {String(h).padStart(2, '0')}h
              </div>
            ))}
          </div>

          {/* Colonnes des jours */}
          {DAYS.map((_, di) => (
            <div key={di} style={{
              position: 'relative',
              borderLeft: '1px solid var(--paper-2)',
              height: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT,
            }}>
              {/* Lignes horaires en fond */}
              {hours.map((_, hi) => (
                <div key={hi} style={{
                  position: 'absolute', left: 0, right: 0,
                  top: hi * HOUR_HEIGHT, height: HOUR_HEIGHT,
                  borderTop: '1px solid var(--paper-2)',
                }} />
              ))}
              {/* Blocs */}
              {blocksByDay[di].map((b) => {
                const meta = KIND_META[b.kind]
                const top = blockTopPx(b.startTime)
                const height = blockHeightPx(b.startTime, b.endTime)
                const Icon = meta.icon
                return (
                  <button
                    key={b.id + '-' + di}
                    onClick={() => setEditing({ open: true, block: b })}
                    style={{
                      position: 'absolute', left: 4, right: 4,
                      top, height: Math.max(height - 2, 24),
                      background: meta.bg,
                      borderLeft: `3px solid ${meta.color}`,
                      borderRight: 0, borderTop: 0, borderBottom: 0,
                      borderRadius: 6,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      textAlign: 'left',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, color: meta.color }}>
                      <Icon size={10} />
                      {b.startTime}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink)',
                      fontWeight: 500, marginTop: 2, lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: height < 50 ? 1 : 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {b.title}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {blocks.length === 0 && (
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)', maxWidth: '52ch', margin: '0 auto', lineHeight: 1.5 }}>
            Aucun bloc encore. Ajoute tes cours, ton alternance, tes routines — Kit utilisera ces créneaux pour ne pas planifier de tâches par-dessus.
          </p>
        </div>
      )}

      {/* ─── Routines personnelles ─────────────────────────────────────────── */}
      <div style={{ marginTop: 48 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <span style={labelStyle}>routines · récurrentes</span>
            <h2 style={{
              fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500,
              color: 'var(--ink)', letterSpacing: '-0.01em',
              margin: '6px 0 8px', lineHeight: 1.15,
            }}>
              Tes corvées qui reviennent<span style={{ color: 'var(--terra)' }}>.</span>
            </h2>
            <p style={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14.5,
              color: 'var(--ink-2)', margin: 0, maxWidth: '62ch', lineHeight: 1.45,
            }}>
              « Lessive du dimanche, courses du samedi, sortir les poubelles le mardi… Kit les ajoute au plan de semaine au bon jour. »
            </p>
          </div>
          <button
            onClick={() => setEditingRoutine({ open: true, routine: null })}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
              background: 'transparent', color: 'var(--terra)',
              border: '1px solid var(--terra)', borderRadius: 8,
              padding: '7px 14px', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Plus size={13} /> Nouvelle routine
          </button>
        </div>

        {routines.length === 0 ? (
          <div style={{
            padding: '24px 20px', textAlign: 'center',
            background: 'var(--paper-1)', border: '1px dashed var(--paper-2)', borderRadius: 12,
          }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>
              Aucune routine encore. Ajoute par exemple « Faire la lessive » tous les dimanches.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {routines.map((r) => {
              const when = r.cadence === 'daily'
                ? 'Tous les jours'
                : r.cadence === 'weekly'
                  ? (r.daysOfWeek && r.daysOfWeek.length > 0 ? r.daysOfWeek.map((d) => DAYS[d]).join(' · ') : '1×/semaine')
                  : `Le ${r.dayOfMonth ?? 1} du mois`
              return (
                <button
                  key={r.id}
                  onClick={() => setEditingRoutine({ open: true, routine: r })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px',
                    background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
                    borderRadius: 10, cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--paper-2)', color: 'var(--ink-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Repeat size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                      {r.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                      {when}
                      {r.preferredTime ? ` · ${r.preferredTime}` : ''}
                      {r.timeEstimate ? ` · ${r.timeEstimate} min` : ''}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal bloc */}
      {editing.open && (
        <BlockEditorModal
          block={editing.block}
          onClose={() => setEditing({ open: false, block: null })}
        />
      )}

      {/* Modal routine */}
      {editingRoutine.open && (
        <RoutineEditorModal
          routine={editingRoutine.routine}
          onClose={() => setEditingRoutine({ open: false, routine: null })}
        />
      )}
    </div>
  )
}
