import { useState, Fragment } from 'react'
import {
  Plus, Archive, Users, Flame, Circle, CircleDashed,
  AtSign, Mail, MessageCircle, Check, Trash2, Edit2,
} from 'lucide-react'
import { useCabinetStore } from '../store/cabinetStore'
import type {
  CabinetDossier, CabinetTache, CabinetNote, CabinetContact,
  DossierType, DossierStatut, TachePriorite, TacheStatut, NoteType, ContactRole,
} from '../store/cabinetStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const JOURS  = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS   = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function getISOWeek(d: Date): number {
  const date = new Date(d)
  const dayNum = (d.getDay() + 6) % 7
  date.setDate(date.getDate() - dayNum + 3)
  const firstThursday = new Date(date.getFullYear(), 0, 4)
  return Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 + 1) / 7) + 1
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function fmtDateLong(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`
}

function isUrgent(iso: string): boolean {
  if (!iso) return false
  const diff = (new Date(iso).getTime() - Date.now()) / 86400000
  return diff >= 0 && diff <= 3
}

function noteTone(type: NoteType): 'terra' | 'sauge' | 'ink' {
  if (type === 'Audience') return 'ink'
  if (type === 'Séance de travail') return 'sauge'
  return 'terra'
}

function contactTone(role: ContactRole): 'terra' | 'sauge' | 'default' | 'subtle' {
  if (role === 'Associé')    return 'terra'
  if (role === 'Of counsel') return 'sauge'
  if (role === 'Stagiaire')  return 'subtle'
  return 'default'
}

function genRef(dossiers: CabinetDossier[]): string {
  const year = new Date().getFullYear()
  const existing = dossiers
    .map((d) => parseInt(d.ref.split('-')[2] ?? '0', 10))
    .filter((n) => !isNaN(n))
  const next = existing.length ? Math.max(...existing) + 1 : 1
  return `D-${year}-${String(next).padStart(3, '0')}`
}

// ─── Modal styles ─────────────────────────────────────────────────────────────

const mInput: React.CSSProperties = {
  background: 'var(--paper)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)', padding: '8px 12px',
  fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--fg)',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}
const mLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10.5,
  letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ink-3)',
}
const mRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const mOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(58,46,34,0.45)',
}
const mBox: React.CSSProperties = {
  width: '100%', maxWidth: 520,
  background: 'var(--paper-1)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-3)',
  padding: 24, display: 'flex', flexDirection: 'column',
  gap: 16, maxHeight: '90vh', overflowY: 'auto',
}

function chipOpts<T extends string>(
  opts: Array<[T, string]>,
  active: T,
  onChange: (v: T) => void,
) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {opts.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          padding: '5px 12px', borderRadius: 'var(--r-full)',
          border: `1px solid ${active === k ? 'var(--terra)' : 'var(--border)'}`,
          background: active === k ? 'var(--terra-soft)' : 'transparent',
          color: active === k ? 'var(--terra-deep)' : 'var(--ink-2)',
          fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
        }}>{l}</button>
      ))}
    </div>
  )
}

function ModalButtons({ onCancel, onSubmit, disabled }: { onCancel: () => void; onSubmit: () => void; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
      <button onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer' }}>Annuler</button>
      <button onClick={onSubmit} disabled={disabled} style={{ flex: 1, padding: 10, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--terra)', color: 'var(--paper-1)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: disabled ? 0.4 : 1 }}>Ajouter</button>
    </div>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, count, action }: {
  eyebrow: string; title: string; count: string; action?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 16, paddingBottom: 12, borderBottom: '1px solid var(--paper-2)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3)', letterSpacing: '0.04em', fontSize: 13 }}>{eyebrow}</span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 500, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.15 }}>{title}</h2>
        <span style={{ fontFamily: 'var(--font-sans)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)' }}>{count}</span>
      </div>
      {action}
    </div>
  )
}

// ─── ModalAddDossier ──────────────────────────────────────────────────────────

function ModalAddDossier({ onClose }: { onClose: () => void }) {
  const { dossiers, addDossier } = useCabinetStore()
  const [nom,      setNom]      = useState('')
  const [avocat,   setAvocat]   = useState('')
  const [domaine,  setDomaine]  = useState('')
  const [type,     setType]     = useState<DossierType>('contentieux')
  const [statut,   setStatut]   = useState<DossierStatut>('en cours')
  const [deadline, setDeadline] = useState('')
  const [urgent,   setUrgent]   = useState(false)

  function handleSubmit() {
    if (!nom.trim()) return
    addDossier({ ref: genRef(dossiers), nom: nom.trim(), avocat: avocat.trim(), domaine: domaine.trim(), type, statut, deadline, urgent })
    onClose()
  }

  return (
    <div style={mOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={mBox}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: 0 }}>Nouveau dossier</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={mRow}><span style={mLabel}>Nom du dossier *</span><input style={mInput} placeholder="Ex : Méridien Capital c/ Sofiprom" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus /></div>
        <div style={mRow}><span style={mLabel}>Avocat référent</span><input style={mInput} placeholder="Ex : M. Marchais" value={avocat} onChange={(e) => setAvocat(e.target.value)} /></div>
        <div style={mRow}><span style={mLabel}>Domaine</span><input style={mInput} placeholder="Ex : Commercial" value={domaine} onChange={(e) => setDomaine(e.target.value)} /></div>
        <div style={mRow}><span style={mLabel}>Type</span>{chipOpts<DossierType>([['contentieux', 'Contentieux'], ['rédaction', 'Rédaction'], ['conseil', 'Conseil']], type, setType)}</div>
        <div style={mRow}><span style={mLabel}>Statut</span>{chipOpts<DossierStatut>([['en cours', 'En cours'], ['en attente', 'En attente'], ['clôturé', 'Clôturé']], statut, setStatut)}</div>
        <div style={mRow}><span style={mLabel}>Échéance</span><input type="date" style={mInput} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>Marquer comme urgent</span>
        </label>
        <ModalButtons onCancel={onClose} onSubmit={handleSubmit} disabled={!nom.trim()} />
      </div>
    </div>
  )
}

// ─── ModalAddTache ────────────────────────────────────────────────────────────

function ModalAddTache({ onClose }: { onClose: () => void }) {
  const addTache = useCabinetStore((s) => s.addTache)
  const [titre,    setTitre]    = useState('')
  const [avocat,   setAvocat]   = useState('')
  const [priorite, setPriorite] = useState<TachePriorite>('normal')
  const [statut,   setStatut]   = useState<TacheStatut>('à faire')
  const [rendu,    setRendu]    = useState('')

  function handleSubmit() {
    if (!titre.trim()) return
    addTache({ titre: titre.trim(), avocat: avocat.trim(), priorite, statut, rendu })
    onClose()
  }

  return (
    <div style={mOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={mBox}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: 0 }}>Nouvelle tâche</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={mRow}><span style={mLabel}>Intitulé *</span><input style={mInput} placeholder="Ex : Note de synthèse — non-concurrence" value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus /></div>
        <div style={mRow}><span style={mLabel}>Demandé par</span><input style={mInput} placeholder="Ex : M. Marchais" value={avocat} onChange={(e) => setAvocat(e.target.value)} /></div>
        <div style={mRow}><span style={mLabel}>Priorité</span>{chipOpts<TachePriorite>([['urgent', 'Urgent'], ['normal', 'Normal'], ['quand possible', 'Quand possible']], priorite, setPriorite)}</div>
        <div style={mRow}><span style={mLabel}>Statut</span>{chipOpts<TacheStatut>([['à faire', 'À faire'], ['en cours', 'En cours'], ['rendu', 'Rendu']], statut, setStatut)}</div>
        <div style={mRow}><span style={mLabel}>À rendre le</span><input type="date" style={mInput} value={rendu} onChange={(e) => setRendu(e.target.value)} /></div>
        <ModalButtons onCancel={onClose} onSubmit={handleSubmit} disabled={!titre.trim()} />
      </div>
    </div>
  )
}

// ─── ModalAddNote ─────────────────────────────────────────────────────────────

function ModalAddNote({ onClose }: { onClose: () => void }) {
  const addNote = useCabinetStore((s) => s.addNote)
  const [date,         setDate]         = useState(new Date().toISOString().split('T')[0])
  const [heure,        setHeure]        = useState('')
  const [type,         setType]         = useState<NoteType>('Réunion')
  const [titre,        setTitre]        = useState('')
  const [participantInput, setParticipantInput] = useState('')
  const [participants, setParticipants] = useState<string[]>([])
  const [extrait,      setExtrait]      = useState('')

  function addParticipant() {
    const p = participantInput.trim()
    if (p && !participants.includes(p)) setParticipants((prev) => [...prev, p])
    setParticipantInput('')
  }

  function handleSubmit() {
    if (!titre.trim()) return
    addNote({ date, heure, type, titre: titre.trim(), participants, extrait: extrait.trim() })
    onClose()
  }

  return (
    <div style={mOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={mBox}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: 0 }}>Nouvelle note</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ ...mRow, flex: 1 }}><span style={mLabel}>Date</span><input type="date" style={mInput} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div style={{ ...mRow, width: 100 }}><span style={mLabel}>Heure</span><input type="time" style={mInput} value={heure} onChange={(e) => setHeure(e.target.value)} /></div>
        </div>
        <div style={mRow}><span style={mLabel}>Type</span>{chipOpts<NoteType>([['Réunion', 'Réunion'], ['Audience', 'Audience'], ['Séance de travail', 'Séance de travail'], ['Point hebdo', 'Point hebdo']], type, setType)}</div>
        <div style={mRow}><span style={mLabel}>Titre *</span><input style={mInput} placeholder="Ex : Stratégie d'audience — Méridien Capital" value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus /></div>
        <div style={mRow}>
          <span style={mLabel}>Participants</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {participants.map((p) => (
              <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--paper-2)', border: '1px solid var(--border)', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                {p}
                <button onClick={() => setParticipants((prev) => prev.filter((x) => x !== p))} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1, padding: 0, fontSize: 14 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...mInput, flex: 1 }} placeholder="Nom du participant..." value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addParticipant() } }} />
            <button onClick={addParticipant} style={{ padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: 'pointer' }}>+</button>
          </div>
        </div>
        <div style={mRow}><span style={mLabel}>Notes / extrait</span><textarea rows={4} style={{ ...mInput, resize: 'none' }} placeholder="Ce qui a été dit, décidé, noté..." value={extrait} onChange={(e) => setExtrait(e.target.value)} /></div>
        <ModalButtons onCancel={onClose} onSubmit={handleSubmit} disabled={!titre.trim()} />
      </div>
    </div>
  )
}

// ─── ModalAddContact ──────────────────────────────────────────────────────────

function ModalAddContact({ onClose }: { onClose: () => void }) {
  const addContact = useCabinetStore((s) => s.addContact)
  const [nom,        setNom]        = useState('')
  const [initials,   setInitials]   = useState('')
  const [role,       setRole]       = useState<ContactRole>('Collaborateur')
  const [specialite, setSpecialite] = useState('')
  const [email,      setEmail]      = useState('')

  function handleSubmit() {
    if (!nom.trim()) return
    addContact({ nom: nom.trim(), initials: initials.trim().toUpperCase() || nom.trim().slice(0, 2).toUpperCase(), role, specialite: specialite.trim(), email: email.trim() })
    onClose()
  }

  return (
    <div style={mOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={mBox}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--ink)', margin: 0 }}>Nouveau contact</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={mRow}><span style={mLabel}>Nom complet *</span><input style={mInput} placeholder="Ex : Marc Marchais" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus /></div>
        <div style={mRow}><span style={mLabel}>Initiales</span><input style={mInput} placeholder="Ex : MM" value={initials} onChange={(e) => setInitials(e.target.value)} /></div>
        <div style={mRow}><span style={mLabel}>Rôle</span>{chipOpts<ContactRole>([['Associé', 'Associé'], ['Of counsel', 'Of counsel'], ['Collaborateur', 'Collaborateur'], ['Stagiaire', 'Stagiaire']], role, setRole)}</div>
        <div style={mRow}><span style={mLabel}>Spécialité</span><input style={mInput} placeholder="Ex : Contentieux commercial" value={specialite} onChange={(e) => setSpecialite(e.target.value)} /></div>
        <div style={mRow}><span style={mLabel}>Email</span><input type="email" style={mInput} placeholder="Ex : mmarchais@cabinet.fr" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <ModalButtons onCancel={onClose} onSubmit={handleSubmit} disabled={!nom.trim()} />
      </div>
    </div>
  )
}

// ─── DossiersSection ─────────────────────────────────────────────────────────

function DossiersSection({ onAdd }: { onAdd: () => void }) {
  const dossiers      = useCabinetStore((s) => s.dossiers)
  const updateDossier = useCabinetStore((s) => s.updateDossier)
  const removeDossier = useCabinetStore((s) => s.removeDossier)
  const [filter, setFilter] = useState<'tous' | DossierStatut>('tous')

  const filtered = dossiers.filter((d) => filter === 'tous' || d.statut === filter)
  const actifs   = dossiers.filter((d) => d.statut !== 'clôturé').length

  const filterOpts: Array<['tous' | DossierStatut, string]> = [
    ['tous', 'Tous'],
    ['en cours', 'En cours'],
    ['en attente', 'En attente'],
    ['clôturé', 'Clôturés'],
  ]

  return (
    <section style={{ marginBottom: 56 }}>
      <SectionHeader
        eyebrow="01"
        title="Dossiers en cours"
        count={`${actifs} actifs · ${dossiers.length} au total`}
        action={
          <button onClick={onAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--terra)', color: 'var(--paper-1)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={14} /> Dossier
          </button>
        }
      />
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {filterOpts.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400,
            padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
            background: filter === k ? 'var(--paper-3)' : 'var(--paper-1)',
            border: `1px solid ${filter === k ? 'var(--ink-4)' : 'var(--paper-2)'}`,
            color: 'var(--ink)',
          }}>{l}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15 }}>
          Aucun dossier
        </div>
      ) : (
        <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px minmax(0,2.2fr) minmax(0,1.1fr) minmax(0,0.9fr) 110px 90px 40px', columnGap: 14, padding: '10px 18px', background: 'var(--paper)', borderBottom: '1px solid var(--paper-2)' }}>
            {['Référence', 'Dossier', 'Avocat référent', 'Type', 'Statut', 'Échéance', ''].map((h, i) => (
              <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{h}</span>
            ))}
          </div>
          {filtered.map((d, i) => (
            <DossierRow key={d.id} dossier={d} last={i === filtered.length - 1}
              onUpdateStatut={(s) => updateDossier(d.id, { statut: s })}
              onRemove={() => removeDossier(d.id)} />
          ))}
        </div>
      )}
    </section>
  )
}

function DossierRow({ dossier, last, onUpdateStatut, onRemove }: {
  dossier: CabinetDossier; last: boolean
  onUpdateStatut: (s: DossierStatut) => void; onRemove: () => void
}) {
  const [hover, setHover] = useState(false)
  const closed = dossier.statut === 'clôturé'

  const statutTone: Record<DossierStatut, { bg: string; color: string; dot: string }> = {
    'en cours':   { bg: 'var(--sage-soft)',  color: '#3F5A3C',       dot: 'var(--sage)' },
    'en attente': { bg: 'var(--paper-2)',    color: 'var(--ink-2)',  dot: 'var(--ink-3)' },
    'clôturé':    { bg: 'transparent',       color: 'var(--ink-3)', dot: 'var(--ink-4)' },
  }
  const tone = statutTone[dossier.statut]

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '90px minmax(0,2.2fr) minmax(0,1.1fr) minmax(0,0.9fr) 110px 90px 40px',
        columnGap: 14, padding: '14px 18px', alignItems: 'center',
        borderBottom: last ? 'none' : '1px solid var(--paper-2)',
        background: hover ? 'var(--paper)' : 'transparent',
        transition: 'background var(--dur) var(--ease)',
        cursor: 'pointer', opacity: closed ? 0.55 : 1,
      }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dossier.ref}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16.5, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.25, marginBottom: 2, textDecoration: closed ? 'line-through' : 'none', textDecorationColor: 'var(--ink-3)', textDecorationThickness: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {dossier.nom}
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{dossier.domaine}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dossier.avocat}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dossier.type}</span>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, background: tone.bg, border: closed ? '1px solid var(--paper-2)' : 'none', width: 'fit-content' }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: tone.dot, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: tone.color, fontWeight: 500, whiteSpace: 'nowrap' }}>{dossier.statut}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: dossier.urgent && !closed ? 'var(--terra)' : 'var(--ink-2)', fontWeight: dossier.urgent && !closed ? 600 : 400 }}>
        {fmtDate(dossier.deadline)}
      </span>
      <div style={{ display: 'flex', gap: 4, opacity: hover ? 1 : 0, transition: 'opacity var(--dur) var(--ease)' }}>
        <button onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: '1px solid var(--paper-2)', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── TachesSection ────────────────────────────────────────────────────────────

function TachesSection({ onAdd }: { onAdd: () => void }) {
  const taches      = useCabinetStore((s) => s.taches)
  const updateTache = useCabinetStore((s) => s.updateTache)
  const removeTache = useCabinetStore((s) => s.removeTache)

  const actives = taches.filter((t) => t.statut !== 'rendu').length
  const rendues = taches.filter((t) => t.statut === 'rendu').length

  return (
    <section style={{ marginBottom: 56 }}>
      <SectionHeader
        eyebrow="02"
        title="Tâches & recherches"
        count={`${actives} en cours · ${rendues} rendues`}
        action={
          <button onClick={onAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--terra)', color: 'var(--paper-1)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={14} /> Tâche
          </button>
        }
      />
      {taches.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15 }}>Aucune tâche</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {taches.map((t) => (
            <TacheRow key={t.id} tache={t}
              onToggle={() => updateTache(t.id, { statut: t.statut === 'rendu' ? 'à faire' : 'rendu' })}
              onRemove={() => removeTache(t.id)} />
          ))}
        </div>
      )}
    </section>
  )
}

function TacheRow({ tache, onToggle, onRemove }: {
  tache: CabinetTache; onToggle: () => void; onRemove: () => void
}) {
  const [hover, setHover] = useState(false)
  const done = tache.statut === 'rendu'
  const urgent = isUrgent(tache.rendu) && !done

  const prioriteStyle: Record<TachePriorite, { color: string; bg: string; icon: React.ReactNode }> = {
    'urgent':         { color: 'var(--terra-deep)', bg: 'var(--terra-soft)', icon: <Flame size={12} color="var(--terra-deep)" /> },
    'normal':         { color: 'var(--ink)',        bg: 'var(--paper-2)',    icon: <Circle size={12} color="var(--ink)" /> },
    'quand possible': { color: 'var(--ink-2)',      bg: 'transparent',       icon: <CircleDashed size={12} color="var(--ink-2)" /> },
  }
  const p = prioriteStyle[tache.priorite]

  const statutDot: Record<TacheStatut, string> = {
    'à faire':  'var(--ink-4)',
    'en cours': 'var(--terra)',
    'rendu':    'var(--sage)',
  }

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '20px 1fr 160px 130px 90px 36px',
        gap: 18, alignItems: 'center', padding: '14px 18px', borderRadius: 10,
        background: hover ? 'var(--paper-1)' : 'transparent',
        border: `1px solid ${hover ? 'var(--paper-2)' : 'transparent'}`,
        transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
        cursor: 'pointer', opacity: done ? 0.55 : 1,
      }}>
      <div onClick={onToggle} style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${done ? 'var(--sage)' : 'var(--ink-4)'}`, background: done ? 'var(--sage)' : 'transparent', display: 'grid', placeItems: 'center', transition: 'all var(--dur) var(--ease)', cursor: 'pointer', flexShrink: 0 }}>
        {done && <Check size={12} color="var(--paper-1)" />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 4, textDecoration: done ? 'line-through' : 'none', textDecorationColor: 'var(--ink-3)' }}>{tache.titre}</div>
        {tache.avocat && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>
            <AtSign size={11} /><span style={{ fontStyle: 'italic' }}>demandé par</span> {tache.avocat}
          </div>
        )}
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: p.bg, width: 'fit-content' }}>
        {p.icon}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: p.color, fontWeight: 500 }}>{tache.priorite}</span>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: statutDot[tache.statut], flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{tache.statut}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 2 }}>{done ? 'rendu le' : 'à rendre'}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: urgent ? 'var(--terra)' : 'var(--ink)', fontWeight: urgent ? 600 : 500 }}>{fmtDate(tache.rendu)}</span>
      </div>
      <button onClick={onRemove} style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: '1px solid var(--paper-2)', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center', opacity: hover ? 1 : 0, transition: 'opacity var(--dur) var(--ease)' }}>
        <Trash2 size={12} />
      </button>
    </div>
  )
}

// ─── NotesSection ─────────────────────────────────────────────────────────────

function NotesSection({ onAdd }: { onAdd: () => void }) {
  const notes      = useCabinetStore((s) => s.notes)
  const removeNote = useCabinetStore((s) => s.removeNote)

  const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section style={{ marginBottom: 56 }}>
      <SectionHeader
        eyebrow="03"
        title="Notes de séances"
        count={`${notes.length} notes`}
        action={
          <button onClick={() => {}} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--ink-4)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer' }}>
            <Archive size={14} /> Archives
          </button>
        }
      />
      {notes.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15 }}>
          Aucune note de séance —{' '}
          <button onClick={onAdd} style={{ background: 'none', border: 'none', color: 'var(--terra)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, cursor: 'pointer', textDecoration: 'underline' }}>ajouter la première</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 71, top: 6, bottom: 6, width: 1, background: 'var(--paper-2)' }} />
          {sorted.map((n) => <NoteEntry key={n.id} note={n} onRemove={() => removeNote(n.id)} />)}
          <button onClick={onAdd} style={{ alignSelf: 'flex-start', marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--terra)', color: 'var(--paper-1)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={13} /> Ajouter une note
          </button>
        </div>
      )}
    </section>
  )
}

function NoteEntry({ note, onRemove }: { note: CabinetNote; onRemove: () => void }) {
  const [hover, setHover] = useState(false)
  const tone = noteTone(note.type)

  const typeColors = {
    terra: { bg: 'var(--terra-soft)', color: '#6B2F14', dot: 'var(--terra)' },
    sauge: { bg: 'var(--sage-soft)',  color: '#3F5A3C', dot: 'var(--sage)' },
    ink:   { bg: 'var(--ink)',        color: 'var(--paper-1)', dot: 'var(--ink)' },
  }[tone]

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: '60px 30px 1fr', gap: 16, padding: '18px 0', cursor: 'pointer', borderBottom: '1px solid var(--paper-2)' }}>
      <div style={{ paddingTop: 2, textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--ink)', display: 'block', fontWeight: 500 }}>{note.date.slice(8)}.{note.date.slice(5, 7)}</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>{note.heure}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
        <div style={{ width: 12, height: 12, borderRadius: 999, background: typeColors.dot, border: '3px solid var(--paper)', boxShadow: `0 0 0 1px ${typeColors.dot}` }} />
      </div>
      <div style={{ minWidth: 0, paddingLeft: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: typeColors.color, background: typeColors.bg, padding: '3px 8px', borderRadius: 4 }}>{note.type}</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>{fmtDateLong(note.date)}</span>
          <button onClick={onRemove} style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: 6, background: 'transparent', border: '1px solid var(--paper-2)', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center', opacity: hover ? 1 : 0, transition: 'opacity var(--dur) var(--ease)' }}>
            <Trash2 size={11} />
          </button>
        </div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', margin: '0 0 6px', lineHeight: 1.25, letterSpacing: '-0.005em' }}>{note.titre}</h3>
        {note.participants.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>avec</span>
            {note.participants.map((p, i) => (
              <span key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-2)', padding: '2px 8px', borderRadius: 999, background: 'var(--paper-1)', border: '1px solid var(--paper-2)' }}>{p}</span>
            ))}
          </div>
        )}
        {note.extrait && (
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0, maxWidth: '70ch' }}>{note.extrait}</p>
        )}
      </div>
    </div>
  )
}

// ─── ContactsSection ──────────────────────────────────────────────────────────

function ContactsSection({ onAdd }: { onAdd: () => void }) {
  const contacts      = useCabinetStore((s) => s.contacts)
  const removeContact = useCabinetStore((s) => s.removeContact)

  return (
    <section>
      <SectionHeader
        eyebrow="04"
        title="Contacts cabinet"
        count={`${contacts.length} personnes`}
        action={
          <button onClick={onAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--ink-4)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer' }}>
            <Users size={14} /> Annuaire
          </button>
        }
      />
      {contacts.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15 }}>
          Aucun contact —{' '}
          <button onClick={onAdd} style={{ background: 'none', border: 'none', color: 'var(--terra)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, cursor: 'pointer', textDecoration: 'underline' }}>ajouter le premier</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {contacts.map((c) => <ContactCard key={c.id} contact={c} onRemove={() => removeContact(c.id)} />)}
          <button onClick={onAdd} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 16px', borderRadius: 10, background: 'transparent', border: '1px dashed var(--paper-3)', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer' }}>
            <Plus size={14} /> Ajouter un contact
          </button>
        </div>
      )}
    </section>
  )
}

const iconBtnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8,
  background: 'var(--paper)', border: '1px solid var(--paper-2)',
  color: 'var(--ink-2)', cursor: 'pointer', display: 'grid', placeItems: 'center',
}

function ContactCard({ contact, onRemove }: { contact: CabinetContact; onRemove: () => void }) {
  const [hover, setHover] = useState(false)
  const tone = contactTone(contact.role)
  const isAssocie = contact.role === 'Associé'

  const avatarStyle: Record<string, { bg: string; color: string }> = {
    terra:   { bg: 'var(--terra-soft)', color: 'var(--terra-deep)' },
    sauge:   { bg: 'var(--sage-soft)',  color: 'var(--sage-deep)' },
    default: { bg: 'var(--paper-2)',    color: 'var(--ink)' },
    subtle:  { bg: 'var(--paper)',      color: 'var(--ink-2)' },
  }
  const av = avatarStyle[tone]

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, background: 'var(--paper-1)', border: `1px solid ${hover ? 'var(--ink-4)' : 'var(--paper-2)'}`, transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)', boxShadow: hover ? 'var(--shadow-1)' : 'none', cursor: 'pointer' }}>
      <div style={{ width: 44, height: 44, borderRadius: 999, background: av.bg, color: av.color, display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', border: tone === 'subtle' ? '1px dashed var(--ink-4)' : 'none' }}>
        {contact.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.005em' }}>{contact.nom}</span>
          {isAssocie
            ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--terra-deep)', fontWeight: 600 }}>· associé</span>
            : <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic' }}>· {contact.role.toLowerCase()}</span>
          }
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)', marginBottom: 3 }}>{contact.specialite}</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 11.5, color: 'var(--ink-3)', letterSpacing: '0.01em' }}>{contact.email}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, opacity: hover ? 1 : 0, transition: 'opacity var(--dur) var(--ease)' }}>
        {contact.email && <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} style={{ ...iconBtnStyle, textDecoration: 'none', color: 'var(--ink-2)' }}><Mail size={14} /></a>}
        <button onClick={onRemove} style={{ ...iconBtnStyle, color: 'var(--ink-3)' }}><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function CabinetPage() {
  const today    = new Date()
  const weekNum  = getISOWeek(today)
  const dateShort = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`
  const dateLong  = `${JOURS[today.getDay()]} ${today.getDate()} ${MOIS[today.getMonth()]} ${today.getFullYear()}`

  const [showAddDossier, setShowAddDossier] = useState(false)
  const [showAddTache,   setShowAddTache]   = useState(false)
  const [showAddNote,    setShowAddNote]    = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)

  return (
    <div style={{ padding: '32px 48px 96px', maxWidth: 1180, margin: '0 auto' }}>

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 48, gap: 32, paddingBottom: 28, borderBottom: '1px solid var(--paper-2)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>droit · alternance · 2ᵉ année</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 52, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.015em', margin: '8px 0 14px', lineHeight: 1.05 }}>
            Cabinet<span style={{ color: 'var(--terra)' }}>.</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 19, color: 'var(--ink-2)', margin: 0, maxWidth: '54ch', lineHeight: 1.45 }}>
            Ce qu'on m'a confié, ce que je rends, ce que je note.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, paddingTop: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--ink)', letterSpacing: '0.04em' }}>{dateShort}</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>{dateLong}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--paper-1)', border: '1px solid var(--paper-2)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>semaine</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--ink)' }}>S{weekNum}</span>
          </div>
        </div>
      </div>

      {/* ── Sections ────────────────────────────────────────────────────────── */}
      <DossiersSection onAdd={() => setShowAddDossier(true)} />
      <TachesSection   onAdd={() => setShowAddTache(true)} />
      <NotesSection    onAdd={() => setShowAddNote(true)} />
      <ContactsSection onAdd={() => setShowAddContact(true)} />

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showAddDossier && <ModalAddDossier onClose={() => setShowAddDossier(false)} />}
      {showAddTache   && <ModalAddTache   onClose={() => setShowAddTache(false)} />}
      {showAddNote    && <ModalAddNote    onClose={() => setShowAddNote(false)} />}
      {showAddContact && <ModalAddContact onClose={() => setShowAddContact(false)} />}
    </div>
  )
}
