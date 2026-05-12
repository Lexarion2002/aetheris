import { useState, useMemo, useEffect } from 'react'
import { ChevronRight, Plus, X, Trash2 } from 'lucide-react'
import { useDroitStore } from '../store/droitStore'
import type { Tache, SousTache } from '../store/droitStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseDateFR = (s: string | null): Date | null => {
  if (!s) return null
  const parts = s.split('.').map(Number)
  if (parts.length !== 3) return null
  const [d, m, y] = parts
  return new Date(y, m - 1, d)
}

const daysBetween = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / 86400000)

const formatDeadline = (s: string | null): { label: string; diff: number } | null => {
  const d = parseDateFR(s)
  if (!d) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = daysBetween(today, d)
  const prefix = s!.slice(0, 5)
  let label: string
  if (diff < 0) label = `passée · ${prefix}`
  else if (diff === 0) label = `aujourd'hui · ${prefix}`
  else if (diff === 1) label = `demain · ${prefix}`
  else if (diff < 7) label = `dans ${diff} j · ${prefix}`
  else label = prefix
  return { label, diff }
}

const taskProgress = (task: Tache): number => {
  if (task.subtasks.length > 0) {
    const done = task.subtasks.filter((s) => s.done).length
    return Math.round((done / task.subtasks.length) * 100)
  }
  return task.manualProgress ?? 0
}

const DIST_SLOTS = ['mar. soir', 'jeu. soir', 'week-end'] as const

const buildDistribution = (task: Tache) => {
  const remaining = task.subtasks.filter((s) => !s.done)
  if (remaining.length === 0) {
    if (task.estimation) {
      return [{ slot: DIST_SLOTS[0], label: task.title, duration: task.estimation }]
    }
    return []
  }
  const n = Math.min(remaining.length, 3)
  const durMap: Record<number, string> = { 1: '2 h', 2: '1 h 30', 3: '1 h' }
  const dur = durMap[n] ?? '1 h'
  return remaining.slice(0, 3).map((st, i) => ({
    slot: DIST_SLOTS[i],
    label: st.label,
    duration: dur,
  }))
}

// ─── Local primitives ─────────────────────────────────────────────────────────

const Lbl = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span style={{
    fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--ink-3)', ...style,
  }}>{children}</span>
)

const Nm = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span style={{
    fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
    color: 'var(--ink)', letterSpacing: '0.01em', ...style,
  }}>{children}</span>
)

// ─── TypeBadge ────────────────────────────────────────────────────────────────

const TypeBadge = ({ type }: { type: string }) => (
  <span style={{
    fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4,
    background: 'var(--paper-2)', color: 'var(--ink)', fontWeight: 500,
    display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
  }}>{type}</span>
)

// ─── ProgressBar ─────────────────────────────────────────────────────────────

const ProgressBar = ({ value, style }: { value: number; style?: React.CSSProperties }) => {
  const color = value >= 100 ? 'var(--sage)' : value < 50 ? 'var(--terra)' : 'var(--ink-2)'
  return (
    <div style={{
      width: '100%', height: 4, background: 'var(--paper-2)',
      borderRadius: 999, overflow: 'hidden', ...style,
    }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, value))}%`, height: '100%',
        background: color,
        transition: 'width 180ms cubic-bezier(0.2,0.8,0.2,1), background 180ms cubic-bezier(0.2,0.8,0.2,1)',
      }} />
    </div>
  )
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    role="checkbox"
    aria-checked={checked}
    style={{
      width: 14, height: 14, padding: 0, flexShrink: 0,
      border: `1px solid ${checked ? 'var(--terra)' : 'var(--ink-4)'}`,
      background: checked ? 'var(--terra)' : 'transparent',
      borderRadius: 3, cursor: 'pointer',
      display: 'grid', placeItems: 'center',
      transition: 'background 180ms ease, border-color 180ms ease',
    }}
  >
    {checked && (
      <svg viewBox="0 0 12 12" width="10" height="10" fill="none"
        stroke="var(--paper-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,6.5 5,9 10,3" />
      </svg>
    )}
  </button>
)

// ─── EveningPriority ─────────────────────────────────────────────────────────

const EveningPriority = ({ task }: { task: Tache }) => {
  const dl = formatDeadline(task.deadline)
  const urgent = dl && dl.diff < 3
  const progress = taskProgress(task)
  const dist = buildDistribution(task)

  return (
    <section style={{ marginBottom: 40 }}>
      <Lbl style={{ display: 'block', marginBottom: 12 }}>Priorité du soir</Lbl>
      <div style={{
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
        borderLeft: '3px solid var(--terra)',
        borderRadius: 12,
        padding: '22px 26px',
        display: 'grid',
        gridTemplateColumns: dist.length > 0 ? 'minmax(0, 1.3fr) minmax(0, 1fr)' : '1fr',
        gap: 32,
      }}>
        {/* Left */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <TypeBadge type={task.type} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)',
              letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}>{task.matiere.toLowerCase()}</span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500,
            color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.2,
            margin: '0 0 14px',
          }}>{task.title}</h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap' }}>
            {dl && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: urgent ? 'var(--terra)' : 'var(--ink-2)',
                fontWeight: urgent ? 500 : 400, letterSpacing: '0.02em',
              }}>{dl.label}</span>
            )}
            {task.estimation && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--ink-3)', letterSpacing: '0.02em',
              }}>{task.estimation}</span>
            )}
          </div>
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
            <ProgressBar value={progress} style={{ flex: 1, maxWidth: 220, minWidth: 80 }} />
            <Nm style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {progress} %
            </Nm>
          </div>
        </div>

        {/* Right: distribution dynamique */}
        {dist.length > 0 && (
          <div style={{ borderLeft: '1px solid var(--paper-2)', paddingLeft: 24, minWidth: 0 }}>
            <Lbl style={{ display: 'block', marginBottom: 12, color: 'var(--ink-3)' }}>
              Répartition suggérée
            </Lbl>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dist.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', minWidth: 0 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap', flexShrink: 0, width: 76,
                  }}>{d.slot}</span>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)',
                    flex: 1, minWidth: 0, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{d.label}</span>
                  <Nm style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {d.duration}
                  </Nm>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── SubtaskRow ───────────────────────────────────────────────────────────────

const SubtaskRow = ({
  subtask, onToggle, onRemove,
}: { subtask: SousTache; onToggle: () => void; onRemove: () => void }) => {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}
    >
      <Checkbox checked={subtask.done} onChange={onToggle} />
      <span style={{
        flex: 1,
        fontFamily: 'var(--font-sans)', fontSize: 14,
        color: subtask.done ? 'var(--ink-3)' : 'var(--ink)',
        textDecoration: subtask.done ? 'line-through' : 'none',
        textDecorationColor: 'var(--ink-4)',
      }}>{subtask.label}</span>
      <button
        onClick={onRemove}
        style={{
          opacity: hover ? 0.6 : 0,
          background: 'transparent', border: 0, cursor: 'pointer',
          padding: 4, color: 'var(--ink-3)',
          transition: 'opacity 180ms ease',
          display: 'flex', alignItems: 'center',
        }}
        aria-label="Supprimer la sous-tâche"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── ProgressSlider ───────────────────────────────────────────────────────────

const ProgressSlider = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
    <Lbl>Progression</Lbl>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 18 }}>
      <input
        type="range" min={0} max={100} step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--terra)' }}
      />
    </div>
    <Nm style={{ fontSize: 13, color: 'var(--ink)', minWidth: 38, textAlign: 'right' }}>
      {value} %
    </Nm>
  </div>
)

// ─── TaskCard ─────────────────────────────────────────────────────────────────

const TaskCard = ({
  task, expanded, onToggleExpand,
  onSubtaskToggle, onAddSubtask, onRemoveSubtask,
  onProgressChange, onNoteChange, onDelete,
}: {
  task: Tache
  expanded: boolean
  onToggleExpand: () => void
  onSubtaskToggle: (id: string) => void
  onAddSubtask: (label: string) => void
  onRemoveSubtask: (id: string) => void
  onProgressChange: (v: number) => void
  onNoteChange: (note: string) => void
  onDelete: () => void
}) => {
  const progress = taskProgress(task)
  const completed = progress >= 100
  const dl = formatDeadline(task.deadline)
  const urgent = dl && dl.diff < 3 && !completed
  const overdue = dl && dl.diff < 0 && !completed

  const [noteEditing, setNoteEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState(task.note)
  const [addingSub, setAddingSub] = useState(false)
  const [subDraft, setSubDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!noteEditing) setNoteDraft(task.note)
  }, [task.note, noteEditing])

  const commitSub = () => {
    if (subDraft.trim()) onAddSubtask(subDraft.trim())
    setSubDraft('')
    setAddingSub(false)
  }

  return (
    <div style={{
      background: 'var(--paper-1)',
      border: '1px solid var(--paper-2)',
      borderRadius: 12,
      opacity: completed ? 0.55 : 1,
      transition: 'opacity 180ms ease',
    }}>
      {/* Header */}
      <button
        onClick={onToggleExpand}
        style={{
          width: '100%', display: 'flex', gap: 14, alignItems: 'flex-start',
          padding: '14px 18px',
          background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          color: 'var(--ink-3)', display: 'inline-flex', flexShrink: 0, marginTop: 3,
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 180ms ease',
        }}>
          <ChevronRight size={16} />
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{
              fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500,
              color: 'var(--ink)', lineHeight: 1.3,
              textDecoration: completed ? 'line-through' : 'none',
              textDecorationColor: 'var(--ink-4)',
              letterSpacing: '-0.005em',
            }}>{task.title}</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)',
              letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2,
            }}>{task.matiere.toLowerCase()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {completed
              ? (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em',
                  textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4,
                  background: 'var(--sage-soft)', color: 'var(--sage-deep)', fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}>Terminé</span>
              )
              : <TypeBadge type={task.type} />
            }
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.02em',
              color: overdue ? 'var(--ink-3)' : urgent ? 'var(--terra)' : 'var(--ink-2)',
              fontWeight: urgent ? 500 : 400, whiteSpace: 'nowrap',
            }}>{dl ? dl.label : '—'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ProgressBar value={progress} style={{ width: 100 }} />
              <Nm style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                {progress} %
              </Nm>
            </div>
          </div>
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '4px 18px 16px 52px', borderTop: '1px solid var(--paper-2)' }}>

          {/* Sous-tâches existantes */}
          {task.subtasks.length > 0 && (
            <div style={{ paddingTop: 10 }}>
              {task.subtasks.map((s) => (
                <SubtaskRow
                  key={s.id}
                  subtask={s}
                  onToggle={() => onSubtaskToggle(s.id)}
                  onRemove={() => onRemoveSubtask(s.id)}
                />
              ))}
            </div>
          )}

          {/* Slider (tâches sans sous-tâches, hors mode ajout) */}
          {task.subtasks.length === 0 && !addingSub && (
            <ProgressSlider
              value={task.manualProgress ?? 0}
              onChange={onProgressChange}
            />
          )}

          {/* Input inline ajout sous-tâche */}
          {addingSub && (
            <input
              autoFocus
              value={subDraft}
              onChange={(e) => setSubDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSub()
                if (e.key === 'Escape') { setSubDraft(''); setAddingSub(false) }
              }}
              onBlur={() => { if (!subDraft.trim()) setAddingSub(false) }}
              placeholder="Nouvelle sous-tâche…"
              style={{
                display: 'block', width: '100%', marginTop: 6,
                background: 'transparent', border: 0, outline: 'none',
                borderBottom: '1px solid var(--ink-4)',
                fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)',
                padding: '4px 2px',
              }}
            />
          )}

          {/* Bouton + Sous-tâche (toujours visible quand non en cours d'ajout) */}
          {!addingSub && (
            <button
              onClick={() => setAddingSub(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 0, cursor: 'pointer',
                padding: '8px 0 4px', marginTop: task.subtasks.length > 0 ? 4 : 0,
                fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)',
              }}
            >
              <Plus size={13} />
              <span>Sous-tâche</span>
            </button>
          )}

          {/* Note */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--paper-2)' }}>
            {noteEditing ? (
              <input
                autoFocus
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={() => { onNoteChange(noteDraft); setNoteEditing(false) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { onNoteChange(noteDraft); setNoteEditing(false) }
                  if (e.key === 'Escape') { setNoteDraft(task.note); setNoteEditing(false) }
                }}
                placeholder="une note pour t'en souvenir…"
                style={{
                  width: '100%', border: 0, outline: 'none', background: 'transparent',
                  fontFamily: 'var(--font-serif)', fontSize: 14, fontStyle: 'italic',
                  color: 'var(--ink)', padding: 2,
                }}
              />
            ) : (
              <button
                onClick={() => setNoteEditing(true)}
                style={{
                  background: 'transparent', border: 0, cursor: 'text',
                  padding: 2, textAlign: 'left',
                  fontFamily: 'var(--font-serif)', fontSize: 14, fontStyle: 'italic',
                  color: task.note ? 'var(--ink-3)' : 'var(--ink-4)',
                }}
              >
                {task.note || 'note…'}
              </button>
            )}
          </div>

          {/* Delete */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            gap: 8, marginTop: 10,
          }}>
            {confirmDelete ? (
              <>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)',
                }}>Supprimer ?</span>
                <button
                  onClick={onDelete}
                  style={{
                    background: 'var(--danger)', color: 'var(--paper-1)', border: 0,
                    borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                  }}
                >Oui</button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    background: 'transparent', border: '1px solid var(--paper-2)',
                    borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)',
                  }}
                >Annuler</button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-3)')}
                style={{
                  background: 'transparent', border: 0, cursor: 'pointer',
                  padding: '4px 8px', borderRadius: 6,
                  fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'color 180ms ease',
                }}
              >
                <Trash2 size={12} />
                <span>Supprimer la tâche</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AddTaskForm ──────────────────────────────────────────────────────────────

const AddTaskForm = ({
  onSubmit, onCancel,
}: {
  onSubmit: (t: Omit<Tache, 'id' | 'createdAt' | 'subtasks' | 'estimation' | 'manualProgress'> & { deadline: string | null }) => void
  onCancel: () => void
}) => {
  const [title, setTitle] = useState('')
  const [matiere, setMatiere] = useState('')
  const [type, setType] = useState<Tache['type']>('Partiel')
  const [deadline, setDeadline] = useState('')
  const [note, setNote] = useState('')

  const field: React.CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)',
    background: 'var(--paper)', border: '1px solid var(--paper-2)',
    borderRadius: 8, padding: '8px 12px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
    transition: 'border-color 180ms ease',
  }
  const lbl: React.CSSProperties = {
    display: 'block', marginBottom: 6,
    fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--ink-3)',
  }

  const handleSubmit = () => {
    if (!title.trim()) return
    const fmt = deadline ? deadline.split('-').reverse().join('.') : null
    onSubmit({
      title: title.trim(),
      matiere: matiere.trim() || '—',
      type,
      deadline: fmt,
      note: note.trim(),
    })
  }

  return (
    <div style={{
      background: 'var(--paper-1)',
      border: '1px dashed var(--ink-4)',
      borderRadius: 12,
      padding: '20px 22px',
    }}>
      <Lbl style={{ display: 'block', marginBottom: 14 }}>Nouvelle tâche</Lbl>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr 0.9fr 0.9fr',
        gap: 12, marginBottom: 12,
      }}>
        <div>
          <label style={lbl}>Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex. Droit des sociétés"
            style={field}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--ink)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--paper-2)')}
          />
        </div>
        <div>
          <label style={lbl}>Matière</label>
          <input
            value={matiere}
            onChange={(e) => setMatiere(e.target.value)}
            placeholder="ex. Droit fiscal"
            style={field}
            onFocus={(e) => (e.target.style.borderColor = 'var(--ink)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--paper-2)')}
          />
        </div>
        <div>
          <label style={lbl}>Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Tache['type'])}
            style={{ ...field, cursor: 'pointer', appearance: 'none' }}
          >
            <option>Partiel</option>
            <option>Exposé</option>
            <option>Rendu</option>
            <option>Mémoire</option>
            <option>Autre</option>
          </select>
        </div>
        <div>
          <label style={lbl}>
            Deadline{' '}
            <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-4)' }}>opt.</span>
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ ...field, fontFamily: 'var(--font-mono)', fontSize: 13 }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>
          Note{' '}
          <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-4)' }}>opt.</span>
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="un repère pour s'y retrouver…"
          style={{ ...field, fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--ink)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--paper-2)')}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            padding: '6px 12px',
            fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)', borderRadius: 8,
          }}
        >Annuler</button>
        <button
          onClick={handleSubmit}
          style={{
            background: 'var(--terra)', color: 'var(--paper-1)', border: 0,
            borderRadius: 8, padding: '6px 14px',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >Ajouter la tâche</button>
      </div>
    </div>
  )
}

// ─── DroitPage ────────────────────────────────────────────────────────────────

export function DroitPage() {
  const taches               = useDroitStore((s) => s.taches)
  const addTache             = useDroitStore((s) => s.addTache)
  const deleteTache          = useDroitStore((s) => s.deleteTache)
  const updateNote           = useDroitStore((s) => s.updateNote)
  const toggleSousTache      = useDroitStore((s) => s.toggleSousTache)
  const addSousTache         = useDroitStore((s) => s.addSousTache)
  const removeSousTache      = useDroitStore((s) => s.removeSousTache)
  const setProgressionManuelle = useDroitStore((s) => s.setProgressionManuelle)

  const [expandedId, setExpandedId] = useState<string | null>('t1')
  const [addOpen, setAddOpen] = useState(false)

  const priorityTask = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const candidates = taches
      .filter((t) => taskProgress(t) < 100 && t.deadline)
      .map((t) => ({ t, diff: daysBetween(today, parseDateFR(t.deadline)!) }))
      .filter(({ diff }) => diff >= 0)
    candidates.sort((a, b) => a.diff - b.diff)
    return candidates[0]?.t ?? null
  }, [taches])

  const handleAdd = (data: Omit<Tache, 'id' | 'createdAt' | 'subtasks' | 'estimation' | 'manualProgress'> & { deadline: string | null }) => {
    addTache({ ...data, estimation: '', subtasks: [], manualProgress: 0 })
    setAddOpen(false)
  }

  const activeCount = taches.filter((t) => taskProgress(t) < 100).length

  const weekLabel = (() => {
    const d = new Date()
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  return (
    <div style={{ padding: '32px 48px 64px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <Lbl>droit · master 2 · {weekLabel}</Lbl>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 500,
          color: 'var(--ink)', letterSpacing: '-0.01em',
          margin: '6px 0 10px', lineHeight: 1.1,
        }}>Tâches.</h1>
        <p style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17,
          color: 'var(--ink-2)', margin: 0, maxWidth: '60ch', lineHeight: 1.4,
        }}>« Ce qui est urgent rarement, ce qui compte presque toujours. »</p>
      </div>

      {/* Priorité du soir */}
      {priorityTask && <EveningPriority task={priorityTask} />}

      {/* Liste */}
      <section>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500,
              color: 'var(--ink)', letterSpacing: '-0.01em', margin: 0,
            }}>Tâches</h2>
            <Nm style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              {activeCount} en cours · {taches.length} au total
            </Nm>
          </div>
          {!addOpen && (
            <button
              onClick={() => setAddOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--terra)', color: 'var(--paper-1)', border: 0,
                borderRadius: 8, padding: '6px 12px',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Plus size={14} />Tâche
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {taches.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              expanded={expandedId === t.id}
              onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
              onSubtaskToggle={(sid) => toggleSousTache(t.id, sid)}
              onAddSubtask={(label) => addSousTache(t.id, label)}
              onRemoveSubtask={(sid) => removeSousTache(t.id, sid)}
              onProgressChange={(v) => setProgressionManuelle(t.id, v)}
              onNoteChange={(n) => updateNote(t.id, n)}
              onDelete={() => deleteTache(t.id)}
            />
          ))}

          {addOpen && (
            <div style={{ marginTop: 8 }}>
              <AddTaskForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
