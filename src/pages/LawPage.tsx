import { useMemo } from 'react'
import { ExternalLink, Plus, Scale, Trash2 } from 'lucide-react'
import { useLawStore } from '../store/lawStore'
import type { KeyDate, Subject } from '../store/lawStore'

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

function fmtDate(iso: string) {
  if (!iso) return 'Date non définie'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function daysUntil(iso: string) {
  if (!iso) return null
  const today = new Date(new Date().toDateString()).getTime()
  const target = new Date(`${iso}T00:00:00`).getTime()
  return Math.ceil((target - today) / 86400000)
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

export function LawHeader() {
  const programName = useLawStore((s) => s.programName)
  const academicYear = useLawStore((s) => s.academicYear)
  const notionUrl = useLawStore((s) => s.notionUrl)
  const setProgramInfo = useLawStore((s) => s.setProgramInfo)
  const setNotionUrl = useLawStore((s) => s.setNotionUrl)

  return (
    <header style={{ marginBottom: 34, paddingBottom: 24, borderBottom: '1px solid var(--paper-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Scale size={15} color="var(--ink-3)" />
        <span style={labelStyle}>domaine académique</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22, alignItems: 'end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 54, lineHeight: 1.04, fontWeight: 500, color: 'var(--ink)' }}>
            Droit<span style={{ color: 'var(--terra)' }}>.</span>
          </h1>
          <p style={{ margin: '10px 0 0', maxWidth: 560, fontFamily: 'var(--font-serif)', fontSize: 18, fontStyle: 'italic', lineHeight: 1.45, color: 'var(--ink-2)' }}>
            Un suivi simple des matières, des dates et de l’état général.
          </p>
        </div>
        <div style={{ ...cardStyle, padding: 16, display: 'grid', gap: 10 }}>
          <Field label="Programme">
            <input value={programName} onChange={(e) => setProgramInfo(e.target.value, academicYear)} style={inputStyle} />
          </Field>
          <Field label="Année">
            <input value={academicYear} onChange={(e) => setProgramInfo(programName, e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Lien externe">
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={notionUrl ?? ''} onChange={(e) => setNotionUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
              {notionUrl && (
                <a href={notionUrl} target="_blank" rel="noreferrer" style={{ ...buttonBase, padding: '0 10px', border: '1px solid var(--border)', color: 'var(--ink-2)', textDecoration: 'none' }}>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </Field>
        </div>
      </div>
    </header>
  )
}

function SubjectRow({ subject }: { subject: Subject }) {
  const updateSubject = useLawStore((s) => s.updateSubject)
  const deleteSubject = useLawStore((s) => s.deleteSubject)

  return (
    <div style={{ ...cardStyle, padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'start' }}>
        <input value={subject.name} onChange={(e) => updateSubject(subject.id, { name: e.target.value })} style={inputStyle} />
        <input value={subject.professor ?? ''} onChange={(e) => updateSubject(subject.id, { professor: e.target.value })} placeholder="Professeur" style={inputStyle} />
        <button onClick={() => deleteSubject(subject.id)} aria-label="Supprimer la matière" style={{ ...buttonBase, width: 34, border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-3)' }}>
          <Trash2 size={13} />
        </button>
      </div>
      <textarea value={subject.notes ?? ''} onChange={(e) => updateSubject(subject.id, { notes: e.target.value })} placeholder="Note courte" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
    </div>
  )
}

export function SubjectList() {
  const subjects = useLawStore((s) => s.subjects)
  const addSubject = useLawStore((s) => s.addSubject)

  return (
    <section>
      <SectionTitle
        title="Matières"
        action={<Button variant="ghost" onClick={() => addSubject({ name: 'Nouvelle matière', professor: '', notes: '' })}><Plus size={14} /> Matière</Button>}
      />
      {subjects.length === 0 ? (
        <div style={{ ...cardStyle, padding: 22, color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucune matière enregistrée.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {subjects.map((subject) => <SubjectRow key={subject.id} subject={subject} />)}
        </div>
      )}
    </section>
  )
}

function KeyDateRow({ keyDate }: { keyDate: KeyDate }) {
  const updateKeyDate = useLawStore((s) => s.updateKeyDate)
  const deleteKeyDate = useLawStore((s) => s.deleteKeyDate)
  const days = daysUntil(keyDate.date)

  return (
    <div style={{ ...cardStyle, padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'start' }}>
        <input value={keyDate.title} onChange={(e) => updateKeyDate(keyDate.id, { title: e.target.value })} style={inputStyle} />
        <input type="date" value={keyDate.date} onChange={(e) => updateKeyDate(keyDate.id, { date: e.target.value })} style={inputStyle} />
        <button onClick={() => deleteKeyDate(keyDate.id)} aria-label="Supprimer la date" style={{ ...buttonBase, width: 34, border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-3)' }}>
          <Trash2 size={13} />
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{fmtDate(keyDate.date)}</span>
        {days !== null && (
          <span style={{ ...labelStyle, color: days <= 14 ? 'var(--terra)' : 'var(--ink-3)' }}>
            {days < 0 ? `${Math.abs(days)} j passés` : days === 0 ? "aujourd'hui" : `J-${days}`}
          </span>
        )}
      </div>
      <textarea value={keyDate.notes ?? ''} onChange={(e) => updateKeyDate(keyDate.id, { notes: e.target.value })} placeholder="Note courte" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
    </div>
  )
}

export function KeyDatesList() {
  const keyDates = useLawStore((s) => s.keyDates)
  const addKeyDate = useLawStore((s) => s.addKeyDate)

  const sortedDates = useMemo(
    () => [...keyDates].sort((a, b) => a.date.localeCompare(b.date)),
    [keyDates],
  )

  return (
    <section>
      <SectionTitle
        title="Dates clés"
        action={<Button variant="ghost" onClick={() => addKeyDate({ title: 'Nouvelle date', date: new Date().toISOString().split('T')[0], notes: '' })}><Plus size={14} /> Date</Button>}
      />
      {sortedDates.length === 0 ? (
        <div style={{ ...cardStyle, padding: 22, color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucune date clé enregistrée.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {sortedDates.map((keyDate) => <KeyDateRow key={keyDate.id} keyDate={keyDate} />)}
        </div>
      )}
    </section>
  )
}

export function StatusNote() {
  const statusNote = useLawStore((s) => s.statusNote)
  const setStatusNote = useLawStore((s) => s.setStatusNote)

  return (
    <section style={{ ...cardStyle, padding: 18 }}>
      <span style={labelStyle}>Note globale</span>
      <textarea
        value={statusNote}
        onChange={(e) => setStatusNote(e.target.value)}
        rows={5}
        placeholder="Où en est le semestre ?"
        style={{ ...inputStyle, marginTop: 10, resize: 'vertical', fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.5 }}
      />
    </section>
  )
}

export function LawPage() {
  return (
    <div style={pageStyle}>
      <LawHeader />
      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 22, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 28 }}>
          <SubjectList />
          <StatusNote />
        </div>
        <KeyDatesList />
      </main>
    </div>
  )
}
