import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '../store'
import type { Task, Priority, TaskStatus } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  domainId:      string
  task?:         Task
  objectiveId?:  string
  milestoneId?:  string
  plannedDate?:  string
  onClose: () => void
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low',    label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high',   label: 'Haute' },
  { value: 'urgent', label: 'Urgent' },
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

// ─── Styles communs ───────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--ink-3)',
  display: 'block',
  marginBottom: 8,
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--r-md)',
  border: '1px solid var(--ink-4)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskFormModal({
  domainId,
  task,
  objectiveId: prefillObjectiveId,
  milestoneId: prefillMilestoneId,
  plannedDate: prefillPlannedDate,
  onClose,
}: Props) {
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
  const isEdit   = !!task

  useEffect(() => { titleRef.current?.focus() }, [])
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
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'color-mix(in srgb, var(--ink) 30%, transparent)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--paper-1)',
        borderRadius: 'var(--r-xl)',
        boxShadow: 'var(--shadow-3)',
        padding: '28px 32px',
        maxWidth: 560,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Titre */}
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          color: 'var(--ink)',
          margin: '0 0 24px',
          fontWeight: 400,
        }}>
          {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Titre — ligne éditoriale */}
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la tâche…"
            required
            style={{
              width: '100%',
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              color: 'var(--ink)',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--paper-2)',
              borderRadius: 0,
              outline: 'none',
              padding: '4px 0 8px',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.target.style.borderBottomColor = 'var(--ink-4)' }}
            onBlur={(e) => { e.target.style.borderBottomColor = 'var(--paper-2)' }}
          />

          {/* Priorité */}
          <div>
            <p style={labelStyle}>Priorité</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITIES.map((p) => {
                const active = priority === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 'var(--r-full)',
                      border: `1px solid ${active ? 'var(--ink)' : 'var(--paper-2)'}`,
                      background: active ? 'var(--ink)' : 'transparent',
                      color: active ? 'var(--paper-1)' : 'var(--ink-2)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Statut + Durée */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                style={{ ...fieldStyle, fontFamily: 'var(--font-sans)' }}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Durée estimée</label>
              <input
                type="number"
                min="1"
                value={timeEstimate}
                onChange={(e) => setTimeEstimate(e.target.value)}
                placeholder="min"
                style={{ ...fieldStyle, fontFamily: 'var(--font-mono)' }}
              />
              <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {TIME_PRESETS.map((p) => {
                  const active = timeEstimate === String(p.value)
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setTimeEstimate(String(p.value))}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--r-full)',
                        border: `1px solid ${active ? 'var(--ink-4)' : 'var(--paper-2)'}`,
                        background: active ? 'var(--paper-2)' : 'transparent',
                        color: active ? 'var(--ink-2)' : 'var(--ink-3)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Planifier pour</label>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                style={{ ...fieldStyle, fontFamily: 'var(--font-mono)', colorScheme: 'light' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Échéance dure</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ ...fieldStyle, fontFamily: 'var(--font-mono)', colorScheme: 'light' }}
              />
            </div>
          </div>

          {/* Objectif lié */}
          {objectives.length > 0 && (
            <div>
              <label style={labelStyle}>Lier à un objectif</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{
                  display: 'flex', cursor: 'pointer', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 'var(--r-md)',
                  border: '1px solid var(--paper-2)',
                  background: !objectiveId ? 'var(--paper-2)' : 'transparent',
                }}>
                  <input
                    type="radio" name="obj" checked={!objectiveId}
                    onChange={() => setObjectiveId('')}
                    style={{ accentColor: 'var(--terra)' }}
                  />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>Aucun</span>
                </label>
                {objectives.map((o) => (
                  <label key={o.id} style={{
                    display: 'flex', cursor: 'pointer', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 'var(--r-md)',
                    border: `1px solid ${objectiveId === o.id ? 'var(--ink-4)' : 'var(--paper-2)'}`,
                    background: objectiveId === o.id ? 'var(--paper-2)' : 'transparent',
                  }}>
                    <input
                      type="radio" name="obj" checked={objectiveId === o.id}
                      onChange={() => setObjectiveId(o.id)}
                      style={{ accentColor: 'var(--terra)' }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)' }}>{o.title}</span>
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 3, width: 64, overflow: 'hidden', borderRadius: 99, background: 'var(--paper-3)' }}>
                          <div style={{
                            height: '100%', width: `${o.progress}%`,
                            background: o.progress >= 80 ? 'var(--sage)' : 'var(--terra)',
                            borderRadius: 99,
                          }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>{o.progress}%</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Jalon lié */}
          {milestonesForObjective.length > 0 && (
            <div>
              <label style={labelStyle}>Jalon associé</label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                style={{ ...fieldStyle, fontFamily: 'var(--font-sans)' }}
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

          {/* Note rapide */}
          <div>
            <label style={labelStyle}>Note rapide</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter une note…"
              rows={3}
              style={{
                ...fieldStyle,
                border: '1px solid var(--paper-2)',
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
                padding: '10px 12px',
              }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                background: 'transparent',
                color: 'var(--ink-2)',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                background: 'var(--terra)',
                color: 'var(--paper-1)',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 500,
                cursor: title.trim() ? 'pointer' : 'default',
                opacity: title.trim() ? 1 : 0.4,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (title.trim()) e.currentTarget.style.background = 'var(--terra-deep)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--terra)' }}
            >
              {isEdit ? 'Enregistrer' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
