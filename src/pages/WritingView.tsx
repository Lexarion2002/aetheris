import { useMemo, useState } from 'react'
import { Archive, Check, Clock, PenLine, Plus, Trash2, X } from 'lucide-react'
import { useWritingStore } from '../store/writingStore'
import type { Story, StoryStatus, WritingSession, WritingStage } from '../store/writingStore'

const STAGE_LABELS: Record<WritingStage, string> = {
  idea: 'idée',
  opening: 'ouverture',
  development: 'développement',
  'ending-found': 'fin trouvée',
  'draft-complete': 'premier jet',
  revision: 'relecture',
  done: 'terminée',
}

const STAGE_OPTIONS: Array<[WritingStage, string]> = [
  ['idea', 'Idée'],
  ['opening', 'Ouverture'],
  ['development', 'Développement'],
  ['ending-found', 'Fin trouvée'],
  ['draft-complete', 'Premier jet'],
  ['revision', 'Relecture'],
  ['done', 'Terminée'],
]

const today = () => new Date().toISOString().split('T')[0]

const fmtDate = (iso?: string) => {
  if (!iso) return 'non daté'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const fmtShortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

const fmtDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m}` : `${h} h`
}

const totalMinutes = (sessions: WritingSession[]) =>
  sessions.reduce((total, session) => total + session.durationMinutes, 0)

const totalWords = (sessions: WritingSession[]) =>
  sessions.reduce((total, session) => total + (session.wordsWritten || 0), 0)

const pageStyle: React.CSSProperties = {
  padding: '34px 48px 96px',
  maxWidth: 1080,
  margin: '0 auto',
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--paper-1)',
  border: '1px solid var(--paper-2)',
  borderRadius: 12,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  background: 'var(--paper)',
  color: 'var(--fg)',
  padding: '9px 12px',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  outline: 'none',
}

function Button({ children, onClick, variant = 'secondary', disabled = false, stopPropagation = false }: {
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  stopPropagation?: boolean
}) {
  const primary = variant === 'primary'
  const ghost = variant === 'ghost'
  return (
    <button
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        minHeight: 34,
        padding: '7px 12px',
        borderRadius: 8,
        border: ghost || primary ? 'none' : '1px solid var(--border)',
        background: primary ? 'var(--terra)' : ghost ? 'transparent' : 'var(--paper-1)',
        color: primary ? 'var(--paper-1)' : ghost ? 'var(--ink-3)' : 'var(--ink)',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: primary ? 500 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  )
}

function StagePill({ stage }: { stage: WritingStage }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      width: 'fit-content',
      borderRadius: 999,
      background: stage === 'done' ? 'var(--sage-soft)' : 'var(--terra-soft)',
      color: stage === 'done' ? '#3F5A3C' : 'var(--terra-deep)',
      padding: '3px 9px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    }}>
      {STAGE_LABELS[stage]}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={eyebrowStyle}>{label}</span>
      {children}
    </label>
  )
}

function ModalFrame({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(58,46,34,0.42)',
      }}
    >
      <div style={{ ...cardStyle, width: '100%', maxWidth: 600, padding: 22, boxShadow: 'var(--shadow-3)', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function StoryModal({ story, defaultStatus, activeExists, onClose }: {
  story?: Story
  defaultStatus: StoryStatus
  activeExists: boolean
  onClose: () => void
}) {
  const addStory = useWritingStore((s) => s.addStory)
  const updateStory = useWritingStore((s) => s.updateStory)
  const activateStory = useWritingStore((s) => s.activateStory)
  const completeStory = useWritingStore((s) => s.completeStory)

  const [title, setTitle] = useState(story?.title ?? '')
  const [status, setStatus] = useState<StoryStatus>(story?.status ?? defaultStatus)
  const [stage, setStage] = useState<WritingStage>(story?.stage ?? (defaultStatus === 'active' ? 'opening' : 'idea'))
  const [currentPoint, setCurrentPoint] = useState(story?.currentPoint ?? '')
  const [nextAction, setNextAction] = useState(story?.nextAction ?? '')
  const [date, setDate] = useState(story?.startedAt ?? story?.completedAt ?? today())
  const [note, setNote] = useState(story?.note ?? '')
  const [error, setError] = useState('')

  const canChooseActive = !activeExists || story?.status === 'active'

  function save() {
    if (!title.trim()) return

    if (story) {
      updateStory(story.id, {
        title: title.trim(),
        stage,
        currentPoint: currentPoint.trim(),
        nextAction: nextAction.trim(),
        startedAt: story.status === 'done' ? story.startedAt : date,
        note: note.trim(),
      })
      if (status === 'active' && story.status !== 'active') {
        const result = activateStory(story.id)
        if (!result.ok) {
          setError(result.reason || 'Activation impossible.')
          return
        }
      }
      if (status === 'done' && story.status !== 'done') {
        completeStory(story.id, { note: note.trim(), completedAt: date })
      }
      onClose()
      return
    }

    const result = addStory({
      title: title.trim(),
      status,
      stage: status === 'done' ? 'done' : stage,
      currentPoint: currentPoint.trim(),
      nextAction: nextAction.trim(),
      startedAt: status === 'active' ? date : undefined,
      completedAt: status === 'done' ? date : undefined,
      note: note.trim(),
    })

    if (!result.ok) {
      setError(result.reason || 'Création impossible.')
      return
    }
    onClose()
  }

  return (
    <ModalFrame onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 25, fontWeight: 500, color: 'var(--ink)' }}>
          {story ? 'Modifier la nouvelle' : 'Nouvelle idée'}
        </h2>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Titre">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="Titre de la nouvelle" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Field label="État narratif">
            <select value={stage} onChange={(e) => setStage(e.target.value as WritingStage)} style={inputStyle}>
              {STAGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label={status === 'done' ? 'Date de fin' : 'Date de début'}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        {!story && (
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value as StoryStatus)} style={inputStyle}>
              <option value="queued">Idée en attente</option>
              <option value="active" disabled={!canChooseActive}>Nouvelle active</option>
            </select>
          </Field>
        )}

        {story && story.status !== 'done' && (
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value as StoryStatus)} style={inputStyle}>
              {story.status === 'queued' && <option value="queued">Idée en attente</option>}
              <option value="active" disabled={!canChooseActive}>Nouvelle active</option>
              <option value="done">Terminée</option>
            </select>
          </Field>
        )}

        <Field label="Point actuel">
          <textarea value={currentPoint} onChange={(e) => setCurrentPoint(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        <Field label="Prochaine action">
          <textarea value={nextAction} onChange={(e) => setNextAction(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        <Field label="Note">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        {error && <p style={{ margin: 0, color: 'var(--terra)', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}><Check size={14} /> Enregistrer</Button>
        </div>
      </div>
    </ModalFrame>
  )
}

function SessionModal({ story, onClose }: { story: Story; onClose: () => void }) {
  const addSession = useWritingStore((s) => s.addSession)
  const [date, setDate] = useState(today())
  const [duration, setDuration] = useState('45')
  const [words, setWords] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function save() {
    const durationMinutes = Math.max(1, Number.parseInt(duration, 10) || 0)
    const wordsWritten = words.trim() ? Math.max(0, Number.parseInt(words, 10) || 0) : undefined
    const result = addSession(story.id, {
      date,
      durationMinutes,
      wordsWritten,
      note: note.trim(),
    })
    if (!result.ok) {
      setError(result.reason || 'Session impossible.')
      return
    }
    onClose()
  }

  return (
    <ModalFrame onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 25, fontWeight: 500, color: 'var(--ink)' }}>
          Session d’écriture
        </h2>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--terra-soft)', color: 'var(--terra-deep)' }}>
          <p style={{ margin: 0, ...eyebrowStyle, color: 'var(--terra-deep)' }}>Prochaine action</p>
          <p style={{ margin: '5px 0 0', fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.35 }}>{story.nextAction}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Durée">
            <input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Mots écrits, optionnel">
          <input type="number" min="0" value={words} onChange={(e) => setWords(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Note courte">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        {error && <p style={{ margin: 0, color: 'var(--terra)', fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={save}><Clock size={14} /> Ajouter</Button>
        </div>
      </div>
    </ModalFrame>
  )
}

function ActiveStoryBlock({ story, onEdit, onSession }: { story?: Story; onEdit: () => void; onSession: () => void }) {
  if (!story) {
    return (
      <section style={{ ...cardStyle, padding: 28, display: 'grid', gap: 18 }}>
        <span style={eyebrowStyle}>Nouvelle en cours</span>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 500, color: 'var(--ink)' }}>Aucune nouvelle active</h2>
          <p style={{ maxWidth: 560, margin: '10px 0 0', color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Active une idée du pipeline, ou crée une nouvelle en cours si l’espace est libre.
          </p>
        </div>
        <Button variant="primary" onClick={onEdit}><Plus size={14} /> Créer une nouvelle active</Button>
      </section>
    )
  }

  const words = totalWords(story.sessions)

  return (
    <section
      onClick={onEdit}
      style={{
        ...cardStyle,
        padding: 30,
        cursor: 'pointer',
        display: 'grid',
        gap: 22,
        boxShadow: '0 18px 55px rgba(72, 53, 34, 0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}>
        <div>
          <span style={eyebrowStyle}>Nouvelle en cours</span>
          <h2 style={{ margin: '8px 0 10px', fontFamily: 'var(--font-serif)', fontSize: 42, lineHeight: 1.05, fontWeight: 500, color: 'var(--ink)' }}>
            {story.title}
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <StagePill stage={story.stage} />
            <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>depuis {fmtDate(story.startedAt)}</span>
          </div>
        </div>
        <Button variant="ghost" stopPropagation onClick={onEdit}><PenLine size={14} /> Éditer</Button>
      </div>

      <div style={{ borderLeft: '3px solid var(--terra)', paddingLeft: 18 }}>
        <p style={{ ...eyebrowStyle, color: 'var(--terra)' }}>Prochaine action</p>
        <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-serif)', fontSize: 24, lineHeight: 1.35, color: 'var(--ink)' }}>
          {story.nextAction || 'Définir la prochaine scène à écrire.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18, alignItems: 'end' }}>
        <div>
          <p style={eyebrowStyle}>Point actuel</p>
          <p style={{ margin: '6px 0 0', color: 'var(--ink-2)', lineHeight: 1.55, fontSize: 15 }}>
            {story.currentPoint || 'Le point narratif reste à préciser.'}
          </p>
        </div>
        <Button variant="primary" stopPropagation disabled={!story.nextAction?.trim()} onClick={onSession}>
          <Clock size={14} /> Session
        </Button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, paddingTop: 4, borderTop: '1px solid var(--paper-2)' }}>
        <span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{story.sessions.length} session{story.sessions.length > 1 ? 's' : ''}</span>
        <span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{fmtDuration(totalMinutes(story.sessions))}</span>
        {words > 0 && <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{words.toLocaleString('fr-FR')} mots notés</span>}
      </div>
    </section>
  )
}

function ProgressNarrative({ activeStory }: { activeStory?: Story }) {
  return (
    <section style={{ ...cardStyle, padding: 22 }}>
      <span style={eyebrowStyle}>Progression narrative</span>
      {activeStory ? (
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {STAGE_OPTIONS.filter(([stage]) => stage !== 'done').map(([stage, label]) => {
            const reached = STAGE_OPTIONS.findIndex(([value]) => value === activeStory.stage) >= STAGE_OPTIONS.findIndex(([value]) => value === stage)
            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 10, color: reached ? 'var(--ink)' : 'var(--ink-3)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: reached ? 'var(--terra)' : 'var(--paper-3)' }} />
                <span style={{ fontSize: 14 }}>{label}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <p style={{ margin: '14px 0 0', color: 'var(--ink-3)', fontStyle: 'italic' }}>La progression apparaîtra dès qu’une nouvelle sera active.</p>
      )}
    </section>
  )
}

function SessionsList({ story }: { story?: Story }) {
  const deleteSession = useWritingStore((s) => s.deleteSession)
  const sessions = story?.sessions.slice(0, 4) ?? []

  return (
    <section style={{ ...cardStyle, padding: 22 }}>
      <span style={eyebrowStyle}>Sessions récentes</span>
      {sessions.length === 0 ? (
        <p style={{ margin: '14px 0 0', color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucune session enregistrée.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {sessions.map((session) => (
            <div key={session.id} style={{ display: 'grid', gridTemplateColumns: '72px minmax(0,1fr) 28px', gap: 12, alignItems: 'start' }}>
              <span style={{ ...eyebrowStyle, fontVariantNumeric: 'tabular-nums' }}>{fmtShortDate(session.date)}</span>
              <div>
                <p style={{ margin: 0, color: 'var(--ink)', fontSize: 14 }}>{fmtDuration(session.durationMinutes)}</p>
                {session.note && <p style={{ margin: '3px 0 0', color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.45 }}>{session.note}</p>}
                {!!session.wordsWritten && <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: 12 }}>{session.wordsWritten} mots</p>}
              </div>
              {story && (
                <button onClick={() => deleteSession(story.id, session.id)} style={{ border: 'none', background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Pipeline({ queued, activeExists, onAdd, onEdit }: {
  queued: Story[]
  activeExists: boolean
  onAdd: () => void
  onEdit: (story: Story) => void
}) {
  const activateStory = useWritingStore((s) => s.activateStory)
  const next = queued[0]
  const ideas = queued.slice(1, 5)

  return (
    <section style={{ ...cardStyle, padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={eyebrowStyle}>Pipeline contrôlé</span>
        <Button variant="ghost" onClick={onAdd}><Plus size={14} /> Idée</Button>
      </div>

      {next ? (
        <div style={{ marginTop: 16, padding: '14px 0', borderBottom: ideas.length ? '1px solid var(--paper-2)' : 'none' }}>
          <p style={{ ...eyebrowStyle, color: 'var(--terra)' }}>Prochaine nouvelle</p>
          <button onClick={() => onEdit(next)} style={{ display: 'block', margin: '6px 0 8px', padding: 0, border: 'none', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-serif)', fontSize: 21, textAlign: 'left', cursor: 'pointer' }}>
            {next.title}
          </button>
          <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.45 }}>{next.currentPoint || next.nextAction || 'Idée à préciser.'}</p>
          <Button variant="secondary" disabled={activeExists} onClick={() => activateStory(next.id)}>
            Activer
          </Button>
        </div>
      ) : (
        <p style={{ margin: '16px 0 0', color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucune idée en attente.</p>
      )}

      {ideas.length > 0 && (
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          <p style={eyebrowStyle}>Idées en attente</p>
          {ideas.map((story) => (
            <button key={story.id} onClick={() => onEdit(story)} style={{ border: 'none', background: 'transparent', padding: 0, color: 'var(--ink-2)', textAlign: 'left', cursor: 'pointer', fontSize: 14 }}>
              {story.title}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ArchiveList({ stories, onEdit }: { stories: Story[]; onEdit: (story: Story) => void }) {
  return (
    <section style={{ marginTop: 42 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Archive size={15} color="var(--ink-3)" />
        <span style={eyebrowStyle}>Archive des nouvelles terminées</span>
      </div>

      {stories.length === 0 ? (
        <div style={{ ...cardStyle, padding: 24, color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucune nouvelle terminée pour le moment.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {stories.map((story) => (
            <button key={story.id} onClick={() => onEdit(story)} style={{ ...cardStyle, padding: '15px 18px', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 16, alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>{story.title}</h3>
                  {story.note && <p style={{ margin: '5px 0 0', color: 'var(--ink-2)', fontSize: 13 }}>{story.note}</p>}
                </div>
                <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 12, textAlign: 'right' }}>
                  {fmtDate(story.completedAt)}<br />
                  {story.sessions.length} session{story.sessions.length > 1 ? 's' : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export function WritingView() {
  const stories = useWritingStore((s) => s.stories)
  const [storyModal, setStoryModal] = useState<{ story?: Story; defaultStatus: StoryStatus } | null>(null)
  const [sessionModal, setSessionModal] = useState(false)

  const activeStory = useMemo(() => stories.find((story) => story.status === 'active'), [stories])
  const queuedStories = useMemo(() => stories.filter((story) => story.status === 'queued'), [stories])
  const doneStories = useMemo(() => stories.filter((story) => story.status === 'done'), [stories])

  return (
    <div style={pageStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', marginBottom: 38, paddingBottom: 24, borderBottom: '1px solid var(--paper-2)' }}>
        <div>
          <span style={eyebrowStyle}>domaine narratif</span>
          <h1 style={{ margin: '7px 0 10px', fontFamily: 'var(--font-serif)', fontSize: 54, lineHeight: 1.04, fontWeight: 500, color: 'var(--ink)' }}>
            Écriture<span style={{ color: 'var(--terra)' }}>.</span>
          </h1>
          <p style={{ margin: 0, maxWidth: 560, color: 'var(--ink-2)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 19, lineHeight: 1.45 }}>
            Une nouvelle à la fois. Une action claire. Une session qui suffit.
          </p>
        </div>
        <Button variant="primary" disabled={!!activeStory} onClick={() => setStoryModal({ defaultStatus: 'active' })}>
          <Plus size={14} /> Nouvelle
        </Button>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 22, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 22 }}>
          <ActiveStoryBlock
            story={activeStory}
            onEdit={() => setStoryModal({ story: activeStory, defaultStatus: 'active' })}
            onSession={() => { if (activeStory?.nextAction?.trim()) setSessionModal(true) }}
          />
          <SessionsList story={activeStory} />
        </div>

        <div style={{ display: 'grid', gap: 22 }}>
          <ProgressNarrative activeStory={activeStory} />
          <Pipeline
            queued={queuedStories}
            activeExists={!!activeStory}
            onAdd={() => setStoryModal({ defaultStatus: 'queued' })}
            onEdit={(story) => setStoryModal({ story, defaultStatus: story.status })}
          />
        </div>
      </main>

      <ArchiveList stories={doneStories} onEdit={(story) => setStoryModal({ story, defaultStatus: 'done' })} />

      {storyModal && (
        <StoryModal
          story={storyModal.story}
          defaultStatus={storyModal.defaultStatus}
          activeExists={!!activeStory}
          onClose={() => setStoryModal(null)}
        />
      )}
      {sessionModal && activeStory && <SessionModal story={activeStory} onClose={() => setSessionModal(false)} />}
    </div>
  )
}
