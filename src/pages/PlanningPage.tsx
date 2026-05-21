import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X, ChevronRight, Check, CalendarDays, CalendarRange, ClipboardCheck } from 'lucide-react'
import { usePlanningStore } from '../store/planningStore'
import { useStore } from '../store'
import { nanoid } from '../utils/nanoid'
import type {
  Identity, IdentityStatus,
  Okr, OkrStatus,
  Rock, RockStatus,
} from '../store/planningStore'
import type { Objective, Domain } from '../types'

// =============================================================================
// MVP brut — voir docs/planning/SPEC.md
// Cascade : Identité → OKR → KR (= Objective) → Rock
// Pas de Mois/Semaine/Jour/Revues dans ce MVP (Phase 3).
// Plafonds stricts : 3 identités, 5 OKR/an, 4 KR/OKR, 5 rocks/trimestre.
// =============================================================================

// ─── Tokens locaux (cohérents avec le reste de l'app) ────────────────────────

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10.5,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--ink-3)',
}

const sectionTitle: CSSProperties = {
  fontFamily: 'var(--font-serif, var(--font-sans))',
  fontSize: 22, fontWeight: 500, color: 'var(--fg)',
  letterSpacing: '-0.01em',
}

const card: CSSProperties = {
  background: 'var(--paper-1)',
  border: '1px solid var(--paper-2)',
  borderRadius: 12,
  padding: 18,
}

const input: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 13.5,
  fontFamily: 'var(--font-sans)',
  color: 'var(--fg)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const textareaStyle: CSSProperties = {
  ...input,
  resize: 'vertical',
  minHeight: 60,
  lineHeight: 1.5,
}

const btnPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--terra)', color: 'var(--paper)',
  border: 'none', borderRadius: 8,
  padding: '6px 12px', fontSize: 13, fontWeight: 500,
  cursor: 'pointer',
}

const btnSubtle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'transparent', color: 'var(--fg-muted)',
  border: '1px dashed var(--border)', borderRadius: 8,
  padding: '6px 12px', fontSize: 12.5,
  cursor: 'pointer',
}

const ghostBtn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', color: 'var(--fg-subtle)',
  border: 'none', cursor: 'pointer',
  padding: 4, borderRadius: 6,
}

const navBtnStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--paper-1)', color: 'var(--fg)',
  border: '1px solid var(--paper-2)', borderRadius: 8,
  padding: '8px 14px', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', textDecoration: 'none',
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string, fg: string, label: string }> = {
    en_construction: { bg: 'var(--sage-soft)', fg: 'var(--sage-deep)', label: 'En construction' },
    projection:      { bg: 'var(--terra-soft)', fg: 'var(--terra)', label: 'Projection' },
    en_cours:        { bg: 'var(--sage-soft)', fg: 'var(--sage-deep)', label: 'En cours' },
    a_faire:         { bg: 'var(--paper-2)', fg: 'var(--ink-3)', label: 'À faire' },
    termine:         { bg: 'var(--sage-soft)', fg: 'var(--sage-deep)', label: 'Terminé' },
    abandonne:       { bg: 'var(--paper-2)', fg: 'var(--ink-3)', label: 'Abandonné' },
  }
  const s = map[status] ?? { bg: 'var(--paper-2)', fg: 'var(--ink-3)', label: status }
  return (
    <span style={{
      ...labelStyle,
      background: s.bg, color: s.fg,
      padding: '2px 8px', borderRadius: 6,
      fontSize: 9.5,
    }}>
      {s.label}
    </span>
  )
}

// =============================================================================
// PlanningPage
// =============================================================================

export function PlanningPage() {
  const identities      = usePlanningStore((s) => s.identities)
  const okrs            = usePlanningStore((s) => s.okrs)
  const rocks           = usePlanningStore((s) => s.rocks)
  const addIdentity     = usePlanningStore((s) => s.addIdentity)
  const updateIdentity  = usePlanningStore((s) => s.updateIdentity)
  const deleteIdentity  = usePlanningStore((s) => s.deleteIdentity)
  const addOkr          = usePlanningStore((s) => s.addOkr)
  const updateOkr       = usePlanningStore((s) => s.updateOkr)
  const deleteOkr       = usePlanningStore((s) => s.deleteOkr)
  const addRock         = usePlanningStore((s) => s.addRock)
  const updateRock      = usePlanningStore((s) => s.updateRock)
  const deleteRock      = usePlanningStore((s) => s.deleteRock)

  const objectives      = useStore((s) => s.objectives)
  const addObjective    = useStore((s) => s.addObjective)
  const updateObjective = useStore((s) => s.updateObjective)
  const deleteObjective = useStore((s) => s.deleteObjective)
  const domains         = useStore((s) => s.domains)

  // KR = Objective avec parentOkrId défini
  const krsByOkr = (okrId: string): Objective[] =>
    objectives.filter((o) => o.parentOkrId === okrId)

  const currentYear = new Date().getFullYear()
  const okrsThisYear = okrs.filter((o) => o.year === currentYear)
  // Trimestre courant (Q1-Q4)
  const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${currentYear}`
  const rocksThisQ = rocks.filter((r) => r.quarter === currentQuarter)

  return (
    <div style={{
      maxWidth: 980,
      margin: '0 auto',
      padding: '36px 24px 80px',
      display: 'flex', flexDirection: 'column', gap: 40,
    }}>
      {/* Header */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>Planification</span>
          <h1 style={sectionTitle}>Cascade</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: 13.5, lineHeight: 1.55, maxWidth: 640 }}>
            Vision long terme → Objectifs annuels (OKR) → Résultats clés (KR) → Rocks trimestriels.
          </p>
        </div>
        <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/planning/day" style={navBtnStyle}>
            <CalendarDays size={14} /> Aujourd'hui
          </Link>
          <Link to="/planning/week" style={navBtnStyle}>
            <CalendarRange size={14} /> Cette semaine
          </Link>
          <Link to="/planning/review/new?kind=weekly" style={navBtnStyle}>
            <ClipboardCheck size={14} /> Revue hebdo
          </Link>
        </nav>
      </header>

      {/* ── 1. Identités ──────────────────────────────────────────────────── */}
      <IdentitiesSection
        identities={identities}
        onAdd={addIdentity}
        onUpdate={updateIdentity}
        onDelete={deleteIdentity}
      />

      {/* ── 2. OKR ────────────────────────────────────────────────────────── */}
      <OkrsSection
        okrs={okrsThisYear}
        identities={identities}
        domains={domains}
        currentYear={currentYear}
        onAddOkr={addOkr}
        onUpdateOkr={updateOkr}
        onDeleteOkr={deleteOkr}
        onAddKr={(okrId, title, description, dueDate, targetValue, domainId) => {
          addObjective({
            domainId,
            title,
            description,
            targetDate: dueDate || null,
            progress: 0,
            parentOkrId: okrId,
            targetValue,
            kind: 'single',
          })
        }}
        onUpdateKr={updateObjective}
        onDeleteKr={deleteObjective}
        getKrs={krsByOkr}
      />

      {/* ── 3. Rocks ─────────────────────────────────────────────────────── */}
      <RocksSection
        rocks={rocksThisQ}
        objectives={objectives}
        currentQuarter={currentQuarter}
        onAdd={addRock}
        onUpdate={updateRock}
        onDelete={deleteRock}
      />
    </div>
  )
}

// =============================================================================
// Section: Identités (plafond 3)
// =============================================================================

interface IdentitiesSectionProps {
  identities: Identity[]
  onAdd:    (data: Omit<Identity, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Identity
  onUpdate: (id: string, patch: Partial<Omit<Identity, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onDelete: (id: string) => void
}

function IdentitiesSection({ identities, onAdd, onUpdate, onDelete }: IdentitiesSectionProps) {
  const [adding, setAdding] = useState(false)
  const atCap = identities.length >= 3

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader title="Identités" subtitle="Vision long terme (~10 ans). Maximum 3." count={`${identities.length}/3`} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {identities.length === 0 && !adding && (
          <p style={{ color: 'var(--fg-subtle)', fontSize: 13, fontStyle: 'italic' }}>
            Aucune identité posée. Démarre avec ce que tu veux incarner à 35 ans.
          </p>
        )}

        {identities.map((id) => (
          <IdentityRow
            key={id.id}
            identity={id}
            onUpdate={(patch) => onUpdate(id.id, patch)}
            onDelete={() => onDelete(id.id)}
          />
        ))}

        {adding ? (
          <IdentityEditForm
            onSave={(data) => { onAdd(data); setAdding(false) }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            disabled={atCap}
            onClick={() => setAdding(true)}
            style={{ ...btnSubtle, opacity: atCap ? 0.4 : 1, cursor: atCap ? 'not-allowed' : 'pointer' }}
            title={atCap ? 'Maximum 3 identités atteint' : 'Ajouter une identité'}
          >
            <Plus size={14} /> {atCap ? 'Maximum atteint' : 'Ajouter une identité'}
          </button>
        )}
      </div>
    </section>
  )
}

function IdentityRow({ identity, onUpdate, onDelete }: {
  identity: Identity
  onUpdate: (patch: Partial<Omit<Identity, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <IdentityEditForm
        initial={identity}
        onSave={(data) => { onUpdate(data); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 500, color: 'var(--fg)', margin: 0 }}>
          {identity.name}
        </h3>
        <StatusBadge status={identity.status} />
        <span style={{ ...labelStyle, fontSize: 10 }}>{identity.horizon}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button style={ghostBtn} onClick={() => setEditing(true)} title="Modifier">
            <ChevronRight size={14} />
          </button>
          <button style={ghostBtn} onClick={onDelete} title="Supprimer">
            <X size={14} />
          </button>
        </div>
      </div>
      {identity.description && (
        <p style={{ color: 'var(--fg-muted)', fontSize: 13, lineHeight: 1.55, margin: 0 }}>
          {identity.description}
        </p>
      )}
    </div>
  )
}

function IdentityEditForm({ initial, onSave, onCancel }: {
  initial?: Partial<Identity>
  onSave: (data: Omit<Identity, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [horizon, setHorizon] = useState(initial?.horizon ?? '10 ans')
  const [status, setStatus] = useState<IdentityStatus>(initial?.status ?? 'en_construction')

  const canSave = name.trim().length > 0

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        autoFocus
        style={input}
        placeholder="Ex. Avocat fiscaliste respecté"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        style={textareaStyle}
        placeholder="Description en 1-2 phrases"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
          <span style={labelStyle}>Horizon</span>
          <input style={input} value={horizon} onChange={(e) => setHorizon(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
          <span style={labelStyle}>Statut</span>
          <select
            style={input}
            value={status}
            onChange={(e) => setStatus(e.target.value as IdentityStatus)}
          >
            <option value="en_construction">En construction</option>
            <option value="projection">Projection</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={{ ...btnSubtle, border: 'none' }} onClick={onCancel}>Annuler</button>
        <button
          style={{ ...btnPrimary, opacity: canSave ? 1 : 0.4, cursor: canSave ? 'pointer' : 'not-allowed' }}
          disabled={!canSave}
          onClick={() => onSave({ name: name.trim(), description: description.trim(), horizon: horizon.trim(), status })}
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// Section: OKR (plafond 5 par année, 4 KR par OKR)
// =============================================================================

interface OkrsSectionProps {
  okrs:           Okr[]
  identities:     Identity[]
  domains:        { id: string, name: string }[]
  currentYear:    number
  onAddOkr:       (data: Omit<Okr, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Okr
  onUpdateOkr:    (id: string, patch: Partial<Omit<Okr, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onDeleteOkr:    (id: string) => void
  onAddKr:        (okrId: string, title: string, description: string, dueDate: string, targetValue: string, domainId: string) => void
  onUpdateKr:     (id: string, patch: Partial<Omit<Objective, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onDeleteKr:     (id: string) => void
  getKrs:         (okrId: string) => Objective[]
}

function OkrsSection({
  okrs, identities, domains, currentYear,
  onAddOkr, onUpdateOkr, onDeleteOkr,
  onAddKr, onUpdateKr, onDeleteKr, getKrs,
}: OkrsSectionProps) {
  const [adding, setAdding] = useState(false)
  const atCap = okrs.length >= 5

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader
        title={`OKR ${currentYear}`}
        subtitle="Objectifs annuels avec résultats clés mesurables. Max 5 par année."
        count={`${okrs.length}/5`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {okrs.length === 0 && !adding && (
          <p style={{ color: 'var(--fg-subtle)', fontSize: 13, fontStyle: 'italic' }}>
            Aucun OKR pour {currentYear}. Démarre avec ton objectif annuel le plus structurant.
          </p>
        )}

        {okrs.map((okr) => (
          <OkrCard
            key={okr.id}
            okr={okr}
            identities={identities}
            krs={getKrs(okr.id)}
            domains={domains}
            onUpdate={(patch) => onUpdateOkr(okr.id, patch)}
            onDelete={() => onDeleteOkr(okr.id)}
            onAddKr={(title, desc, due, target, domainId) => onAddKr(okr.id, title, desc, due, target, domainId)}
            onUpdateKr={onUpdateKr}
            onDeleteKr={onDeleteKr}
          />
        ))}

        {adding ? (
          <OkrEditForm
            currentYear={currentYear}
            identities={identities}
            onSave={(data) => { onAddOkr(data); setAdding(false) }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            disabled={atCap}
            onClick={() => setAdding(true)}
            style={{ ...btnSubtle, opacity: atCap ? 0.4 : 1, cursor: atCap ? 'not-allowed' : 'pointer' }}
          >
            <Plus size={14} /> {atCap ? 'Maximum atteint' : 'Ajouter un OKR'}
          </button>
        )}
      </div>
    </section>
  )
}

function OkrCard({ okr, identities, krs, domains, onUpdate, onDelete, onAddKr, onUpdateKr, onDeleteKr }: {
  okr: Okr
  identities: Identity[]
  krs: Objective[]
  domains: { id: string, name: string }[]
  onUpdate: (patch: Partial<Omit<Okr, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onDelete: () => void
  onAddKr: (title: string, desc: string, due: string, target: string, domainId: string) => void
  onUpdateKr: (id: string, patch: Partial<Omit<Objective, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onDeleteKr: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [addingKr, setAddingKr] = useState(false)
  const linkedIdentities = identities.filter((i) => okr.identityIds.includes(i.id))
  const krAtCap = krs.length >= 4

  if (editing) {
    return (
      <OkrEditForm
        currentYear={okr.year}
        identities={identities}
        initial={okr}
        onSave={(data) => { onUpdate(data); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 500, color: 'var(--fg)', margin: 0, flex: 1 }}>
          {okr.name}
        </h3>
        <StatusBadge status={okr.status} />
        <div style={{ display: 'flex', gap: 2 }}>
          <button style={ghostBtn} onClick={() => setEditing(true)}><ChevronRight size={14} /></button>
          <button style={ghostBtn} onClick={onDelete}><X size={14} /></button>
        </div>
      </div>

      {okr.description && (
        <p style={{ color: 'var(--fg-muted)', fontSize: 13, lineHeight: 1.5, margin: '6px 0 0' }}>
          {okr.description}
        </p>
      )}

      {linkedIdentities.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {linkedIdentities.map((i) => (
            <span key={i.id} style={{
              ...labelStyle,
              background: 'var(--paper-2)', padding: '2px 8px',
              borderRadius: 6, fontSize: 10,
            }}>
              ◇ {i.name}
            </span>
          ))}
        </div>
      )}

      {/* KR list */}
      <div style={{
        marginTop: 14, paddingTop: 14,
        borderTop: '1px solid var(--paper-2)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={labelStyle}>Résultats clés · {krs.length}/4</span>
        </div>

        {krs.length === 0 && !addingKr && (
          <p style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', margin: 0 }}>
            Aucun KR. Ajoute des résultats mesurables qui prouvent que l'OKR avance.
          </p>
        )}

        {krs.map((kr) => (
          <KrRow
            key={kr.id}
            kr={kr}
            domains={domains}
            onUpdate={(patch) => onUpdateKr(kr.id, patch)}
            onDelete={() => onDeleteKr(kr.id)}
          />
        ))}

        {addingKr ? (
          <KrEditForm
            domains={domains}
            onSave={(d) => { onAddKr(d.title, d.description, d.dueDate, d.targetValue, d.domainId); setAddingKr(false) }}
            onCancel={() => setAddingKr(false)}
          />
        ) : (
          <button
            disabled={krAtCap}
            onClick={() => setAddingKr(true)}
            style={{
              ...btnSubtle, opacity: krAtCap ? 0.4 : 1,
              cursor: krAtCap ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-start', fontSize: 11.5,
            }}
          >
            <Plus size={12} /> {krAtCap ? 'Maximum 4 KR' : 'Ajouter un KR'}
          </button>
        )}
      </div>
    </div>
  )
}

function OkrEditForm({ currentYear, identities, initial, onSave, onCancel }: {
  currentYear: number
  identities: Identity[]
  initial?: Partial<Okr>
  onSave: (data: Omit<Okr, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [year, setYear] = useState(initial?.year ?? currentYear)
  const [status, setStatus] = useState<OkrStatus>(initial?.status ?? 'en_cours')
  const [identityIds, setIdentityIds] = useState<string[]>(initial?.identityIds ?? [])

  const toggleIdentity = (id: string) => {
    setIdentityIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const canSave = name.trim().length > 0

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        autoFocus
        style={input}
        placeholder="Ex. Sécuriser ma trajectoire fiscaliste"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        style={textareaStyle}
        placeholder="Contexte / pourquoi (optionnel)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 100 }}>
          <span style={labelStyle}>Année</span>
          <input style={input} type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
          <span style={labelStyle}>Statut</span>
          <select style={input} value={status} onChange={(e) => setStatus(e.target.value as OkrStatus)}>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
            <option value="abandonne">Abandonné</option>
          </select>
        </div>
      </div>

      {identities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>Identités liées</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {identities.map((id) => {
              const sel = identityIds.includes(id.id)
              return (
                <button
                  key={id.id}
                  onClick={() => toggleIdentity(id.id)}
                  style={{
                    ...labelStyle,
                    background: sel ? 'var(--terra-soft)' : 'transparent',
                    color:  sel ? 'var(--terra)' : 'var(--fg-muted)',
                    border: `1px solid ${sel ? 'var(--terra)' : 'var(--border)'}`,
                    padding: '4px 10px', borderRadius: 6, fontSize: 10,
                    cursor: 'pointer',
                  }}
                >
                  {sel ? '✓ ' : ''}{id.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={{ ...btnSubtle, border: 'none' }} onClick={onCancel}>Annuler</button>
        <button
          style={{ ...btnPrimary, opacity: canSave ? 1 : 0.4, cursor: canSave ? 'pointer' : 'not-allowed' }}
          disabled={!canSave}
          onClick={() => onSave({
            name: name.trim(), description: description.trim(), year, status, identityIds,
          })}
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// KR rows (Objective avec parentOkrId)
// =============================================================================

function KrRow({ kr, domains, onUpdate, onDelete }: {
  kr: Objective
  domains: { id: string, name: string }[]
  onUpdate: (patch: Partial<Omit<Objective, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const domain = domains.find((d) => d.id === kr.domainId)

  if (editing) {
    return (
      <KrEditForm
        domains={domains}
        initial={{
          title:       kr.title,
          description: kr.description,
          dueDate:     kr.targetDate ?? '',
          targetValue: kr.targetValue ?? '',
          domainId:    kr.domainId,
        }}
        onSave={(d) => {
          onUpdate({
            title: d.title, description: d.description,
            targetDate: d.dueDate || null,
            targetValue: d.targetValue,
            domainId: d.domainId,
          })
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '8px 10px',
      background: 'var(--paper)', border: '1px solid var(--paper-2)',
      borderRadius: 8,
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, color: 'var(--fg)', fontWeight: 500 }}>{kr.title}</span>
          {kr.targetValue && (
            <span style={{ ...labelStyle, color: 'var(--terra)', fontSize: 10 }}>
              → {kr.targetValue}
            </span>
          )}
          {kr.targetDate && (
            <span style={{ ...labelStyle, fontSize: 10 }}>
              ⏵ {kr.targetDate}
            </span>
          )}
        </div>
        {(domain || kr.description) && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11.5, color: 'var(--fg-subtle)' }}>
            {domain && <span style={labelStyle}>{domain.name}</span>}
            {kr.description && <span style={{ fontStyle: 'italic' }}>{kr.description}</span>}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        <button style={ghostBtn} onClick={() => setEditing(true)}><ChevronRight size={12} /></button>
        <button style={ghostBtn} onClick={onDelete}><X size={12} /></button>
      </div>
    </div>
  )
}

function KrEditForm({ domains, initial, onSave, onCancel }: {
  domains: { id: string, name: string }[]
  initial?: { title: string, description: string, dueDate: string, targetValue: string, domainId: string }
  onSave: (d: { title: string, description: string, dueDate: string, targetValue: string, domainId: string }) => void
  onCancel: () => void
}) {
  const addDomain = useStore((s) => s.addDomain)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [targetValue, setTargetValue] = useState(initial?.targetValue ?? '')
  const [domainId, setDomainId] = useState(initial?.domainId ?? domains[0]?.id ?? '')

  // Création de domaine inline
  const [creatingDomain, setCreatingDomain]  = useState(false)
  const [newDomainName, setNewDomainName]    = useState('')

  const handleCreateDomain = () => {
    const name = newDomainName.trim()
    if (!name) return
    const newId = nanoid()
    // addDomain accepte un id optionnel via cast (cf. store/index.ts)
    addDomain({ id: newId, name, color: 'gray', icon: '◇', description: '' } as Omit<Domain, 'id'>)
    setDomainId(newId)
    setNewDomainName('')
    setCreatingDomain(false)
  }

  const canSave = title.trim().length > 0 && domainId

  return (
    <div style={{ ...card, padding: 12, gap: 8, display: 'flex', flexDirection: 'column' }}>
      <input
        autoFocus
        style={input}
        placeholder="Ex. 31 nouvelles finalisées au 31 décembre"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        style={input}
        placeholder="Description courte (optionnel)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 }}>
          <span style={labelStyle}>Cible</span>
          <input
            style={input}
            placeholder="≥80%, 31 nouvelles…"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 }}>
          <span style={labelStyle}>Échéance</span>
          <input
            style={input}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
          <span style={labelStyle}>Domaine</span>
          {creatingDomain ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                autoFocus
                style={{ ...input, flex: 1 }}
                placeholder="Ex. Écriture"
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleCreateDomain() }
                  if (e.key === 'Escape') { setCreatingDomain(false); setNewDomainName('') }
                }}
              />
              <button
                onClick={handleCreateDomain}
                style={{ ...ghostBtn, color: 'var(--terra)' }}
                title="Créer (Entrée)"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => { setCreatingDomain(false); setNewDomainName('') }}
                style={ghostBtn}
                title="Annuler (Échap)"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <select
                style={{ ...input, flex: 1 }}
                value={domainId}
                onChange={(e) => setDomainId(e.target.value)}
              >
                {domains.length === 0 && <option value="">— aucun —</option>}
                {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button
                onClick={() => setCreatingDomain(true)}
                style={{ ...ghostBtn, border: '1px solid var(--border)', borderRadius: 8 }}
                title="Créer un nouveau domaine"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={{ ...btnSubtle, border: 'none' }} onClick={onCancel}>Annuler</button>
        <button
          style={{ ...btnPrimary, opacity: canSave ? 1 : 0.4, cursor: canSave ? 'pointer' : 'not-allowed' }}
          disabled={!canSave}
          onClick={() => onSave({
            title: title.trim(), description: description.trim(),
            dueDate, targetValue: targetValue.trim(), domainId,
          })}
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// Section: Rocks (plafond 5 par trimestre)
// =============================================================================

interface RocksSectionProps {
  rocks:          Rock[]
  objectives:     Objective[]
  currentQuarter: string
  onAdd:    (data: Omit<Rock, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Rock
  onUpdate: (id: string, patch: Partial<Omit<Rock, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onDelete: (id: string) => void
}

function RocksSection({ rocks, objectives, currentQuarter, onAdd, onUpdate, onDelete }: RocksSectionProps) {
  const [adding, setAdding] = useState(false)
  const atCap = rocks.length >= 5

  // Liste des Objectives qui sont des KR (avec parentOkrId)
  const krs = objectives.filter((o) => o.parentOkrId)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader
        title={`Rocks · ${currentQuarter}`}
        subtitle="Livrables concrets et datés sur 90 jours. Max 5 par trimestre."
        count={`${rocks.length}/5`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rocks.length === 0 && !adding && (
          <p style={{ color: 'var(--fg-subtle)', fontSize: 13, fontStyle: 'italic' }}>
            Aucun Rock pour {currentQuarter}.
          </p>
        )}

        {rocks.map((rock) => (
          <RockRow
            key={rock.id}
            rock={rock}
            krs={krs}
            onUpdate={(patch) => onUpdate(rock.id, patch)}
            onDelete={() => onDelete(rock.id)}
          />
        ))}

        {adding ? (
          <RockEditForm
            currentQuarter={currentQuarter}
            krs={krs}
            onSave={(data) => { onAdd(data); setAdding(false) }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            disabled={atCap}
            onClick={() => setAdding(true)}
            style={{ ...btnSubtle, opacity: atCap ? 0.4 : 1, cursor: atCap ? 'not-allowed' : 'pointer' }}
          >
            <Plus size={14} /> {atCap ? 'Maximum atteint' : 'Ajouter un Rock'}
          </button>
        )}
      </div>
    </section>
  )
}

function RockRow({ rock, krs, onUpdate, onDelete }: {
  rock: Rock
  krs: Objective[]
  onUpdate: (patch: Partial<Omit<Rock, 'id' | 'createdAt' | 'updatedAt'>>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const linkedKrs = krs.filter((k) => rock.krIds.includes(k.id))

  if (editing) {
    return (
      <RockEditForm
        currentQuarter={rock.quarter}
        krs={krs}
        initial={rock}
        onSave={(data) => { onUpdate(data); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--fg)', margin: 0, flex: 1 }}>
          {rock.name}
        </h3>
        {rock.deadline && (
          <span style={{ ...labelStyle, fontSize: 10 }}>⏵ {rock.deadline}</span>
        )}
        <StatusBadge status={rock.status} />
        <div style={{ display: 'flex', gap: 2 }}>
          <button style={ghostBtn} onClick={() => setEditing(true)}><ChevronRight size={14} /></button>
          <button style={ghostBtn} onClick={onDelete}><X size={14} /></button>
        </div>
      </div>
      {rock.expectedResult && (
        <p style={{ color: 'var(--fg-muted)', fontSize: 12.5, lineHeight: 1.5, margin: '6px 0 0' }}>
          {rock.expectedResult}
        </p>
      )}
      {linkedKrs.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {linkedKrs.map((kr) => (
            <span key={kr.id} style={{
              ...labelStyle,
              background: 'var(--paper-2)', padding: '2px 8px',
              borderRadius: 6, fontSize: 10,
            }}>
              ◇ {kr.title}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function RockEditForm({ currentQuarter, krs, initial, onSave, onCancel }: {
  currentQuarter: string
  krs: Objective[]
  initial?: Partial<Rock>
  onSave: (data: Omit<Rock, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [expectedResult, setExpectedResult] = useState(initial?.expectedResult ?? '')
  const [quarter, setQuarter] = useState(initial?.quarter ?? currentQuarter)
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [status, setStatus] = useState<RockStatus>(initial?.status ?? 'a_faire')
  const [krIds, setKrIds] = useState<string[]>(initial?.krIds ?? [])

  const toggleKr = (id: string) =>
    setKrIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const canSave = name.trim().length > 0

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        autoFocus
        style={input}
        placeholder="Ex. Rapport d'alternance déposé"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        style={textareaStyle}
        placeholder="Résultat attendu (optionnel)"
        value={expectedResult}
        onChange={(e) => setExpectedResult(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 110 }}>
          <span style={labelStyle}>Trimestre</span>
          <input style={input} value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="Q3 2026" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 130 }}>
          <span style={labelStyle}>Deadline</span>
          <input style={input} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 130 }}>
          <span style={labelStyle}>Statut</span>
          <select style={input} value={status} onChange={(e) => setStatus(e.target.value as RockStatus)}>
            <option value="a_faire">À faire</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
            <option value="abandonne">Abandonné</option>
          </select>
        </div>
      </div>

      {krs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>KR servis par ce Rock</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {krs.map((kr) => {
              const sel = krIds.includes(kr.id)
              return (
                <button
                  key={kr.id}
                  onClick={() => toggleKr(kr.id)}
                  style={{
                    ...labelStyle,
                    background: sel ? 'var(--terra-soft)' : 'transparent',
                    color:  sel ? 'var(--terra)' : 'var(--fg-muted)',
                    border: `1px solid ${sel ? 'var(--terra)' : 'var(--border)'}`,
                    padding: '4px 10px', borderRadius: 6, fontSize: 10,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {sel ? '✓ ' : ''}{kr.title}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={{ ...btnSubtle, border: 'none' }} onClick={onCancel}>Annuler</button>
        <button
          style={{ ...btnPrimary, opacity: canSave ? 1 : 0.4, cursor: canSave ? 'pointer' : 'not-allowed' }}
          disabled={!canSave}
          onClick={() => onSave({
            name: name.trim(),
            expectedResult: expectedResult.trim() || undefined,
            quarter: quarter.trim(),
            deadline: deadline || undefined,
            status,
            krIds,
          })}
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// Shared bits
// =============================================================================

function SectionHeader({ title, subtitle, count }: { title: string, subtitle: string, count?: string }) {
  return (
    <header style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <h2 style={{ ...sectionTitle, fontSize: 18, margin: 0 }}>{title}</h2>
      {count && <span style={{ ...labelStyle, fontSize: 10 }}>{count}</span>}
      <span style={{ color: 'var(--fg-subtle)', fontSize: 12.5, fontStyle: 'italic', flex: 1, textAlign: 'right' }}>
        {subtitle}
      </span>
    </header>
  )
}
