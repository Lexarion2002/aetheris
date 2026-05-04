import { useMemo, useState } from 'react'
import { Check, PenLine, Plus, Trash2 } from 'lucide-react'
import { useWritingStore } from '../store/writingStore'
import type { Session, Story } from '../store/writingStore'

const STAGES = ['idée', 'ouverture', 'développement', 'fin', 'jet', 'révision', 'terminé']

const pageStyle: React.CSSProperties = {
  padding: '32px 48px 96px',
  maxWidth: 1080,
  margin: '0 auto',
}

const labelStyle: React.CSSProperties = {
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
  padding: '8px 11px',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  outline: 'none',
}

const buttonBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 32,
  borderRadius: 8,
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  cursor: 'pointer',
}

function Button({ children, onClick, variant = 'secondary', disabled = false }: {
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
}) {
  const primary = variant === 'primary'
  const ghost = variant === 'ghost'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...buttonBase,
        padding: '6px 11px',
        border: primary || ghost ? 'none' : '1px solid var(--border)',
        background: primary ? 'var(--terra)' : ghost ? 'transparent' : 'var(--paper-1)',
        color: primary ? 'var(--paper-1)' : ghost ? 'var(--ink-3)' : 'var(--ink)',
        fontWeight: primary ? 500 : 400,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  )
}

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 25, fontWeight: 500, color: 'var(--ink)' }}>
        {title}
      </h2>
      {action}
    </div>
  )
}

function fmtDate(iso?: string) {
  if (!iso) return 'non daté'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function sessionDuration(session: Session & { durationMinutes?: number }) {
  return session.duration ?? session.durationMinutes ?? 0
}

function WritingHeader() {
  return (
    <header style={{ marginBottom: 34, paddingBottom: 24, borderBottom: '1px solid var(--paper-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <PenLine size={15} color="var(--ink-3)" />
        <span style={labelStyle}>domaine narratif</span>
      </div>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 54, lineHeight: 1.04, fontWeight: 500, color: 'var(--ink)' }}>
        Écriture<span style={{ color: 'var(--terra)' }}>.</span>
      </h1>
      <p style={{ margin: '10px 0 0', maxWidth: 560, fontFamily: 'var(--font-serif)', fontSize: 18, fontStyle: 'italic', lineHeight: 1.45, color: 'var(--ink-2)' }}>
        Une seule nouvelle active, un point clair, une session aujourd’hui.
      </p>
    </header>
  )
}

function ActiveStoryBlock({ activeStory }: { activeStory?: Story }) {
  const setActiveStory = useWritingStore((s) => s.setActiveStory)
  const completeActiveStory = useWritingStore((s) => s.completeActiveStory)

  return (
    <section>
      <SectionTitle
        title="Nouvelle en cours"
        action={activeStory && <Button variant="ghost" onClick={completeActiveStory}><Check size={14} /> Terminer</Button>}
      />
      <div style={{ ...cardStyle, padding: 16, display: 'grid', gap: 12 }}>
        <Field label="Titre">
          <input
            value={activeStory?.title ?? ''}
            onChange={(e) => setActiveStory({ title: e.target.value })}
            placeholder="Titre de la nouvelle"
            style={inputStyle}
          />
        </Field>
        <Field label="État">
          <input
            value={activeStory?.stage ?? 'idée'}
            onChange={(e) => setActiveStory({ stage: e.target.value })}
            placeholder="idée, ouverture, développement..."
            style={inputStyle}
          />
        </Field>
        <Field label="Point actuel">
          <textarea
            value={activeStory?.currentPoint ?? ''}
            onChange={(e) => setActiveStory({ currentPoint: e.target.value })}
            rows={4}
            placeholder="Où en est la nouvelle ?"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>
        <Field label="Prochaine action">
          <textarea
            value={activeStory?.nextAction ?? ''}
            onChange={(e) => setActiveStory({ nextAction: e.target.value })}
            rows={4}
            placeholder="La prochaine phrase, scène ou décision à écrire."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.5 }}
          />
        </Field>
      </div>
    </section>
  )
}

function SessionRow({ storyId, session }: { storyId: string; session: Session }) {
  const deleteSession = useWritingStore((s) => s.deleteSession)

  return (
    <div style={{ ...cardStyle, padding: 14, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <div>
          <span style={labelStyle}>{fmtDate(session.date)}</span>
          <p style={{ margin: '5px 0 0', color: 'var(--ink)', fontSize: 14 }}>{sessionDuration(session)} min</p>
        </div>
        <button onClick={() => deleteSession(storyId, session.id)} aria-label="Supprimer la session" style={{ ...buttonBase, width: 34, border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-3)' }}>
          <Trash2 size={13} />
        </button>
      </div>
      {session.note && <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.45 }}>{session.note}</p>}
    </div>
  )
}

function SessionBlock({ activeStory }: { activeStory?: Story }) {
  const addSessionToActive = useWritingStore((s) => s.addSessionToActive)
  const [duration, setDuration] = useState('30')
  const [note, setNote] = useState('')

  function addSession() {
    const minutes = Math.max(1, Number.parseInt(duration, 10) || 0)
    const result = addSessionToActive({ duration: minutes, note: note.trim() })
    if (!result.ok) return
    setDuration('30')
    setNote('')
  }

  return (
    <section>
      <SectionTitle title="Session du jour" />
      <div style={{ ...cardStyle, padding: 16, display: 'grid', gap: 12, marginBottom: 12 }}>
        <Field label="Durée">
          <input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Note rapide">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ce qui a avancé, ce qui bloque."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>
        <div>
          <Button variant="primary" disabled={!activeStory} onClick={addSession}>
            <Plus size={14} /> Ajouter session
          </Button>
        </div>
      </div>
      {!activeStory || activeStory.sessions.length === 0 ? (
        <div style={{ ...cardStyle, padding: 22, color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucune session enregistrée.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {activeStory.sessions.map((session) => (
            <SessionRow key={session.id} storyId={activeStory.id} session={session} />
          ))}
        </div>
      )}
    </section>
  )
}

function ProgressBlock({ activeStory }: { activeStory?: Story }) {
  const setActiveStory = useWritingStore((s) => s.setActiveStory)

  return (
    <section style={{ ...cardStyle, padding: 18 }}>
      <span style={labelStyle}>Progression</span>
      <div style={{ marginTop: 10 }}>
        <Field label="Stade narratif">
          <select value={activeStory?.stage ?? 'idée'} onChange={(e) => setActiveStory({ stage: e.target.value })} style={inputStyle}>
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
        </Field>
      </div>
    </section>
  )
}

function PipelineBlock({ ideas }: { ideas: Story[] }) {
  const addIdea = useWritingStore((s) => s.addIdea)
  const activateIdea = useWritingStore((s) => s.activateIdea)
  const [ideaTitle, setIdeaTitle] = useState('')

  function submitIdea() {
    addIdea(ideaTitle)
    setIdeaTitle('')
  }

  return (
    <section>
      <SectionTitle title="À venir" />
      <div style={{ ...cardStyle, padding: 16, display: 'grid', gap: 12 }}>
        <Field label="Ajouter une idée">
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={ideaTitle} onChange={(e) => setIdeaTitle(e.target.value)} placeholder="Titre ou germe de nouvelle" style={inputStyle} />
            <Button variant="ghost" disabled={!ideaTitle.trim()} onClick={submitIdea}><Plus size={14} /> Idée</Button>
          </div>
        </Field>
        {ideas.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucune idée en attente.</p>
        ) : (
          <div style={{ display: 'grid', gap: 9 }}>
            {ideas.map((idea, index) => (
              <div key={idea.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderTop: index === 0 ? '1px solid var(--paper-2)' : undefined, paddingTop: index === 0 ? 12 : 0 }}>
                <div>
                  <span style={labelStyle}>{index === 0 ? 'prochaine nouvelle' : 'idée'}</span>
                  <p style={{ margin: '4px 0 0', color: 'var(--ink)', fontSize: 14 }}>{idea.title}</p>
                </div>
                {index === 0 && <Button variant="ghost" onClick={() => activateIdea(idea.id)}>Activer</Button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ArchiveBlock({ doneStories }: { doneStories: Story[] }) {
  return (
    <section>
      <SectionTitle title="Nouvelles terminées" />
      {doneStories.length === 0 ? (
        <div style={{ ...cardStyle, padding: 22, color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucune nouvelle terminée.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {doneStories.map((story) => (
            <div key={story.id} style={{ ...cardStyle, padding: 14 }}>
              <p style={{ margin: 0, color: 'var(--ink)', fontSize: 14 }}>{story.title}</p>
              <span style={{ ...labelStyle, display: 'block', marginTop: 6 }}>{fmtDate(story.completedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function WritingView() {
  const stories = useWritingStore((s) => s.stories)

  const activeStory = useMemo(() => stories.find((story) => story.status === 'active'), [stories])
  const ideas = useMemo(() => stories.filter((story) => story.status === 'idea' || (story.status as string) === 'queued'), [stories])
  const doneStories = useMemo(() => stories.filter((story) => story.status === 'done'), [stories])

  return (
    <div style={pageStyle}>
      <WritingHeader />
      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 22, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 28 }}>
          <ActiveStoryBlock activeStory={activeStory} />
          <ProgressBlock activeStory={activeStory} />
          <ArchiveBlock doneStories={doneStories} />
        </div>
        <div style={{ display: 'grid', gap: 28 }}>
          <SessionBlock activeStory={activeStory} />
          <PipelineBlock ideas={ideas} />
        </div>
      </main>
    </div>
  )
}
