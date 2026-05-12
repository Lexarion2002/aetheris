import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Feather,
  Check,
  MessageSquare,
  Plus,
  Archive,
  ChevronRight,
  ArrowUpDown,
  MoreHorizontal,
} from 'lucide-react'
import { useEcritureStore } from '../store/ecritureStore'
import type { NouvelleEnCours, NouvelleTerminee, Idee } from '../store/ecritureStore'
import {
  getSemaineISO,
  heuresRestantes,
  formatHeures,
  repartitionSoir,
  getNouvelleActive,
  isChaud,
  ETAPE_ORDER,
} from '../lib/ecritureEngine'
import type { Etape, Genre, CreneauSoir } from '../lib/ecritureEngine'

// ─── Primitives locaux ────────────────────────────────────────────────────────

const Lbl = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
      ...style,
    }}
  >
    {children}
  </span>
)

const Nm = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span
    style={{
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--ink)',
      letterSpacing: '0.01em',
      ...style,
    }}
  >
    {children}
  </span>
)

// ─── Métadonnées genre ────────────────────────────────────────────────────────

const GENRE_META: Record<Genre, { label: string; bg: string; color: string }> = {
  noire: { label: 'noire', bg: 'var(--ink)', color: 'var(--paper-1)' },
  fantastique: { label: 'fantastique', bg: 'var(--terra-soft)', color: '#6B2F14' },
  realiste: { label: 'réaliste', bg: 'var(--sage-soft)', color: '#3F5A3C' },
}

// ─── Définition des étapes ────────────────────────────────────────────────────

const STAGES: Array<{ key: Etape; label: string; hint: string }> = [
  { key: 'idee', label: 'Idée', hint: 'à mûrir' },
  { key: 'plan', label: 'Plan', hint: 'à structurer' },
  { key: 'draft', label: 'Draft', hint: 'à écrire' },
  { key: 'revision', label: 'Révision', hint: 'à reprendre' },
  { key: 'final', label: 'Final', hint: 'à clore' },
]

// ─── Styles boutons ───────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  fontSize: 14,
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid transparent',
  cursor: 'pointer',
  background: 'var(--terra)',
  color: 'var(--paper-1)',
}

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: 'transparent',
  color: 'var(--ink)',
  border: '1px solid var(--ink-4)',
}

const btnGhost: React.CSSProperties = {
  ...btnPrimary,
  background: 'transparent',
  color: 'var(--ink-2)',
  border: 0,
  fontWeight: 400,
}

// ─── GenreBadge ───────────────────────────────────────────────────────────────

function GenreBadge({ genre }: { genre: Genre }) {
  const meta = GENRE_META[genre]
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 4,
        background: meta.bg,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  kicker,
  title,
  hint,
  action,
  children,
}: {
  kicker?: React.ReactNode
  title?: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: 48 }}>
      {(kicker || title || hint || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ flex: 1 }}>
            {kicker && <div style={{ marginBottom: 4 }}>{kicker}</div>}
            {title && (
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 22,
                  fontWeight: 400,
                  color: 'var(--ink)',
                  margin: 0,
                }}
              >
                {title}
              </h2>
            )}
            {hint && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)' }}>
                {hint}
              </span>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

// ─── FocusHeader ──────────────────────────────────────────────────────────────

function FocusHeader({ active, today }: { active: NouvelleEnCours | null; today: Date }) {
  const navigate = useNavigate()
  const semaine = getSemaineISO(today)
  const jourFR = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ marginBottom: 48 }}>
      <Lbl>Semaine {semaine} · {jourFR}</Lbl>
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 42,
          fontWeight: 400,
          color: 'var(--ink)',
          margin: '8px 0 12px',
          letterSpacing: '-0.01em',
        }}
      >
        Ce soir, on écrit.
      </h1>
      {active?.synopsis && (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            color: 'var(--ink-2)',
            margin: '0 0 20px',
            maxWidth: 560,
            lineHeight: 1.6,
          }}
        >
          {active.synopsis}
        </p>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button style={btnSecondary} onClick={() => navigate('/week')}>
          <Calendar size={15} />
          Voir la semaine
        </button>
        <button style={btnPrimary}>
          <Feather size={15} />
          Ouvrir le draft
        </button>
      </div>
    </div>
  )
}

// ─── SoirSlot ─────────────────────────────────────────────────────────────────

function SoirSlot({ creneau, last }: { creneau: CreneauSoir; last: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr auto',
        alignItems: 'start',
        gap: 16,
        paddingBottom: last ? 0 : 16,
        borderBottom: last ? 'none' : '1px solid var(--paper-2)',
        marginBottom: last ? 0 : 16,
      }}
    >
      <div>
        <Lbl>{creneau.label}</Lbl>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
          {creneau.date}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
          {creneau.tache}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '0.06em' }}>
          {creneau.intent}
        </div>
      </div>
      <Nm style={{ fontSize: 13 }}>{creneau.duree}</Nm>
    </div>
  )
}

// ─── PrioriteSoir ─────────────────────────────────────────────────────────────

function PrioriteSoir({
  active,
  today,
  avancerEtape,
  ajouterNote,
}: {
  active: NouvelleEnCours
  today: Date
  avancerEtape: (id: string) => void
  ajouterNote: (id: string, note: string) => void
}) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  const creneaux = useMemo(() => repartitionSoir(active.stage, today), [active.stage, today])
  const heures = heuresRestantes(active.stage, active.motsCouches, active.objectifMots)
  const etapeMeta = STAGES.find((s) => s.key === active.stage)

  const handleNote = () => {
    if (noteText.trim()) {
      ajouterNote(active.id, noteText.trim())
      setNoteText('')
      setNoteOpen(false)
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 48,
      }}
    >
      {/* Liseré terra */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: 'var(--terra)',
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 0,
          paddingLeft: 3,
        }}
      >
        {/* Bloc gauche */}
        <div style={{ padding: '28px 32px' }}>
          <Lbl>
            Ce soir, tu travailles sur · {formatHeures(heures)}
          </Lbl>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 8px' }}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 28,
                fontWeight: 400,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              {active.title}
            </h1>
            <GenreBadge genre={active.genre} />
          </div>

          {active.synopsis && (
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'var(--ink-2)',
                fontStyle: 'italic',
                margin: '0 0 16px',
                lineHeight: 1.6,
              }}
            >
              {active.synopsis}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {etapeMeta && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--terra-soft)',
                  color: 'var(--terra)',
                }}
              >
                {etapeMeta.label}
              </span>
            )}
            <Lbl>
              {active.objectifMots - active.motsCouches} mots restants / {active.objectifMots}
            </Lbl>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={btnPrimary} onClick={() => avancerEtape(active.id)}>
              <Check size={14} />
              Marquer étape suivante
            </button>
            <button
              style={btnSecondary}
              onClick={() => setNoteOpen((v) => !v)}
            >
              <MessageSquare size={14} />
              Ajouter une note
            </button>
          </div>

          {noteOpen && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                style={{
                  flex: 1,
                  border: '1px solid var(--ink-4)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
                placeholder="Ta note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNote()}
                autoFocus
              />
              <button style={btnPrimary} onClick={handleNote}>
                <Check size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Bloc droit */}
        <div
          style={{
            padding: '28px 28px',
            borderLeft: '1px solid var(--paper-2)',
          }}
        >
          <Lbl style={{ display: 'block', marginBottom: 16 }}>Répartition de la semaine</Lbl>
          {creneaux.map((c, i) => (
            <SoirSlot key={i} creneau={c} last={i === creneaux.length - 1} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── DaysPip ──────────────────────────────────────────────────────────────────

function DaysPip({ days, active }: { days: number; active: boolean }) {
  if (active) {
    return (
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          color: 'var(--terra)',
          background: 'var(--terra-soft)',
          padding: '1px 6px',
          borderRadius: 3,
        }}
      >
        actif
      </span>
    )
  }
  const chaud = isChaud(days)
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.06em',
        color: chaud ? 'var(--terra)' : 'var(--ink-3)',
      }}
    >
      {days}j
    </span>
  )
}

// ─── PipelineCard ─────────────────────────────────────────────────────────────

function PipelineCard({ item }: { item: NouvelleEnCours }) {
  return (
    <div
      style={{
        background: 'var(--paper-1)',
        border: `1px solid ${item.active ? 'var(--terra)' : 'var(--paper-2)'}`,
        borderLeft: item.active ? '3px solid var(--terra)' : '1px solid var(--paper-2)',
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          color: 'var(--ink)',
          marginBottom: 6,
          lineHeight: 1.3,
        }}
      >
        {item.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-3)' }}>
          {GENRE_META[item.genre].label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
            {item.startedAt}
          </span>
          <DaysPip days={item.daysInStage} active={item.active} />
        </div>
      </div>
    </div>
  )
}

// ─── PipelineSection ──────────────────────────────────────────────────────────

function PipelineSection({ pipeline }: { pipeline: NouvelleEnCours[] }) {
  return (
    <Section
      kicker={<Lbl>Pipeline · {pipeline.length} nouvelles</Lbl>}
      title="En cours"
      hint="Toutes tes nouvelles en mouvement"
      action={
        <button style={btnGhost}>
          <ArrowUpDown size={14} />
          Réordonner
        </button>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
        }}
      >
        {STAGES.map((stage) => {
          const items = pipeline.filter((n) => n.stage === stage.key)
          return (
            <div key={stage.key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--paper-2)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--ink)',
                    fontWeight: 500,
                  }}
                >
                  {stage.label}
                </span>
                <Lbl style={{ fontSize: 10 }}>{stage.hint}</Lbl>
                <Nm style={{ fontSize: 11, marginLeft: 'auto', color: 'var(--ink-3)' }}>
                  {items.length}
                </Nm>
              </div>
              {items.map((item) => (
                <PipelineCard key={item.id} item={item} />
              ))}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─── StageBar ─────────────────────────────────────────────────────────────────

function StageBar({ currentStage }: { currentStage: Etape }) {
  const currentIdx = ETAPE_ORDER.indexOf(currentStage)
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
      {STAGES.map((stage, i) => {
        const isDone = i < currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={stage.key} style={{ flex: 1 }}>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: isDone
                  ? 'var(--sage)'
                  : isCurrent
                  ? 'var(--terra)'
                  : 'var(--paper-2)',
                marginBottom: 4,
              }}
            />
            <Lbl style={{ fontSize: 9.5 }}>{stage.label}</Lbl>
          </div>
        )
      })}
    </div>
  )
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

function Meta({
  label,
  value,
  suffix,
  tone,
  emphasize,
}: {
  label: string
  value: string
  suffix?: string
  tone?: 'terra'
  emphasize?: boolean
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: 8,
        alignItems: 'baseline',
        padding: '6px 0',
        borderBottom: '1px solid var(--paper-2)',
      }}
    >
      <Lbl>{label}</Lbl>
      <Nm
        style={{
          fontSize: emphasize ? 15 : 13,
          color: tone === 'terra' ? 'var(--terra)' : undefined,
          fontWeight: emphasize ? 500 : undefined,
        }}
      >
        {value}
        {suffix && (
          <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 4 }}>{suffix}</span>
        )}
      </Nm>
    </div>
  )
}

// ─── FicheDetaillee ───────────────────────────────────────────────────────────

function FicheDetaillee({
  active,
  today,
  avancerEtape,
  ajouterNote,
}: {
  active: NouvelleEnCours
  today: Date
  avancerEtape: (id: string) => void
  ajouterNote: (id: string, note: string) => void
}) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  const etapeMeta = STAGES.find((s) => s.key === active.stage)
  const heures = heuresRestantes(active.stage, active.motsCouches, active.objectifMots)

  // Deadline formatting
  const deadlineDisplay = useMemo(() => {
    if (!active.deadline) return '—'
    const parts = active.deadline.split('.')
    if (parts.length !== 3) return active.deadline
    const [dd, mm, yyyy] = parts.map(Number)
    const d = new Date(yyyy, mm - 1, dd)
    d.setHours(0, 0, 0, 0)
    const t = new Date(today)
    t.setHours(0, 0, 0, 0)
    const diff = Math.round((d.getTime() - t.getTime()) / 86400000)
    return `${active.deadline} · dans ${diff} jours`
  }, [active.deadline, today])

  const handleNote = () => {
    if (noteText.trim()) {
      ajouterNote(active.id, noteText.trim())
      setNoteText('')
      setNoteOpen(false)
    }
  }

  return (
    <Section
      kicker={<Lbl>Fiche détaillée · N°{active.numero}</Lbl>}
      title={active.title}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 32,
          background: 'var(--paper-1)',
          border: '1px solid var(--paper-2)',
          borderRadius: 16,
          padding: '28px 32px',
        }}
      >
        {/* Gauche */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <GenreBadge genre={active.genre} />
            <Nm style={{ fontSize: 12, color: 'var(--ink-3)' }}>N°{active.numero}</Nm>
          </div>

          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 36,
              fontWeight: 400,
              color: 'var(--ink)',
              margin: '0 0 12px',
              lineHeight: 1.15,
            }}
          >
            {active.title}
          </h3>

          {active.synopsis && (
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'var(--ink-2)',
                fontStyle: 'italic',
                margin: '0 0 24px',
                lineHeight: 1.65,
              }}
            >
              {active.synopsis}
            </p>
          )}

          <StageBar currentStage={active.stage} />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={btnPrimary} onClick={() => avancerEtape(active.id)}>
              <Check size={14} />
              Marquer étape suivante
            </button>
            <button style={btnSecondary} onClick={() => setNoteOpen((v) => !v)}>
              <MessageSquare size={14} />
              Ajouter une note
            </button>
            <button style={btnGhost}>
              <MoreHorizontal size={14} />
            </button>
          </div>

          {noteOpen && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                style={{
                  flex: 1,
                  border: '1px solid var(--ink-4)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
                placeholder="Ta note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNote()}
                autoFocus
              />
              <button style={btnPrimary} onClick={handleNote}>
                <Check size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Droite */}
        <div style={{ borderLeft: '1px solid var(--paper-2)', paddingLeft: 32 }}>
          <Meta label="Étape" value={etapeMeta?.label ?? active.stage} tone="terra" emphasize />
          <Meta label="Début" value={active.startedAt} />
          <Meta label="Deadline" value={deadlineDisplay} />
          <Meta
            label="Heures rest."
            value={formatHeures(heures)}
            tone={heures < 1 ? 'terra' : undefined}
          />
          <Meta
            label="Mots couchés"
            value={String(active.motsCouches)}
            suffix={`/ ${active.objectifMots}`}
          />

          {active.derniereNote && (
            <div
              style={{
                marginTop: 20,
                padding: '14px 16px',
                background: 'var(--paper)',
                borderRadius: 8,
                border: '1px solid var(--paper-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Lbl>Dernière note</Lbl>
                <Lbl style={{ color: 'var(--ink-4)' }}>{active.derniereNote.date}</Lbl>
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  fontStyle: 'italic',
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {active.derniereNote.contenu}
              </p>
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

// ─── HistoryRow ───────────────────────────────────────────────────────────────

function HistoryRow({ item, last }: { item: NouvelleTerminee; last: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 100px 120px 60px 1fr 32px',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        borderBottom: last ? 'none' : '1px solid var(--paper-2)',
        transition: 'background 0.12s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.background = 'var(--paper)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.background = ''
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          color: 'var(--ink)',
        }}
      >
        {item.title}
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>
        {GENRE_META[item.genre].label}
      </span>
      <Nm style={{ fontSize: 12, color: 'var(--ink-3)' }}>{item.date}</Nm>
      <Nm style={{ fontSize: 12 }}>
        {item.days}
        <span style={{ color: 'var(--ink-3)' }}>j</span>
      </Nm>
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--ink-2)',
          fontStyle: 'italic',
        }}
      >
        {item.note ? `« ${item.note} »` : ''}
      </span>
      <ChevronRight size={14} color="var(--ink-4)" />
    </div>
  )
}

// ─── Historique ───────────────────────────────────────────────────────────────

function Historique({ history }: { history: NouvelleTerminee[] }) {
  return (
    <Section
      kicker={<Lbl>Historique · {history.length} nouvelles terminées</Lbl>}
      title="Terminées"
      action={
        <button style={btnGhost}>
          <Archive size={14} />
          Tout voir
        </button>
      }
    >
      <div
        style={{
          background: 'var(--paper-1)',
          border: '1px solid var(--paper-2)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {history.map((item, i) => (
          <HistoryRow key={item.id} item={item} last={i === history.length - 1} />
        ))}
      </div>
    </Section>
  )
}

// ─── IdeaCard ─────────────────────────────────────────────────────────────────

function IdeaCard({ idea }: { idea: Idee }) {
  return (
    <div
      style={{
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
        borderRadius: 12,
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--ink-4)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--paper-2)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <GenreBadge genre={idea.genre} />
        <Lbl style={{ fontSize: 10 }}>{idea.age}j</Lbl>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          color: 'var(--ink)',
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        {idea.title}
      </div>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--ink-2)',
          fontStyle: 'italic',
          margin: '0 0 12px',
          lineHeight: 1.55,
        }}
      >
        {idea.pitch}
      </p>
      <Lbl style={{ fontSize: 10 }}>Capturé le {idea.date}</Lbl>
    </div>
  )
}

// ─── Carnet ───────────────────────────────────────────────────────────────────

function Carnet({
  ideas,
  ajouterIdee,
}: {
  ideas: Idee[]
  ajouterIdee: (i: Omit<Idee, 'id' | 'age'>) => void
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formPitch, setFormPitch] = useState('')
  const [formGenre, setFormGenre] = useState<Genre>('realiste')

  const handleSubmit = () => {
    if (!formTitle.trim()) return
    ajouterIdee({ title: formTitle.trim(), pitch: formPitch.trim(), genre: formGenre, date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }).replace('/', '.') })
    setFormTitle('')
    setFormPitch('')
    setFormGenre('realiste')
    setFormOpen(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid var(--ink-4)',
    borderRadius: 8,
    padding: '8px 12px',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    background: 'var(--paper)',
    color: 'var(--ink)',
    outline: 'none',
  }

  return (
    <Section
      kicker={<Lbl>Carnet · {ideas.length} idées</Lbl>}
      title="Idées"
      hint="Tout ce qui attend de devenir une nouvelle"
      action={
        <button style={btnPrimary} onClick={() => setFormOpen((v) => !v)}>
          <Plus size={14} />
          Idée
        </button>
      }
    >
      {formOpen && (
        <div
          style={{
            background: 'var(--paper-1)',
            border: '1px solid var(--paper-2)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <input
            style={inputStyle}
            placeholder="Titre de l'idée"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            autoFocus
          />
          <input
            style={inputStyle}
            placeholder="Pitch en une phrase"
            value={formPitch}
            onChange={(e) => setFormPitch(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              style={{ ...inputStyle, width: 'auto', flex: 1 }}
              value={formGenre}
              onChange={(e) => setFormGenre(e.target.value as Genre)}
            >
              <option value="realiste">Réaliste</option>
              <option value="noire">Noire</option>
              <option value="fantastique">Fantastique</option>
            </select>
            <button style={btnPrimary} onClick={handleSubmit}>
              <Check size={14} />
              Ajouter
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}
      </div>
    </Section>
  )
}

// ─── EcriturePage ─────────────────────────────────────────────────────────────

export function EcriturePage() {
  const pipeline = useEcritureStore((s) => s.pipeline)
  const history = useEcritureStore((s) => s.history)
  const ideas = useEcritureStore((s) => s.ideas)
  const avancerEtape = useEcritureStore((s) => s.avancerEtape)
  const ajouterNote = useEcritureStore((s) => s.ajouterNote)
  const ajouterIdee = useEcritureStore((s) => s.ajouterIdee)

  const today = useMemo(() => new Date(), [])
  const active = useMemo(() => getNouvelleActive(pipeline), [pipeline])

  return (
    <div
      style={{
        padding: '32px 48px 80px',
        maxWidth: 1240,
        margin: '0 auto',
      }}
    >
      <FocusHeader active={active} today={today} />

      {active && (
        <PrioriteSoir
          active={active}
          today={today}
          avancerEtape={avancerEtape}
          ajouterNote={ajouterNote}
        />
      )}

      <PipelineSection pipeline={pipeline} />

      {active && (
        <FicheDetaillee
          active={active}
          today={today}
          avancerEtape={avancerEtape}
          ajouterNote={ajouterNote}
        />
      )}

      <Historique history={history} />

      <Carnet ideas={ideas} ajouterIdee={ajouterIdee} />
    </div>
  )
}
