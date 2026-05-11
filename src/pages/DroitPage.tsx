import { useState } from 'react'
import { Scale, BookOpen, Library, ExternalLink } from 'lucide-react'
import { useDroitStore } from '../store/droitStore'
import type { Matiere, NotesDroit, BiblioDroit, Memoire as MemoireType, Jalon as JalonType } from '../store/droitStore'
import type { Echeance } from '../lib/droitEngine'
import { daysUntil, urgencyScore, isOnFire, heuresRestantes, parseDate } from '../lib/droitEngine'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'] as const

// ─── Local helpers ────────────────────────────────────────────────────────────

const dayLabel = (d: Date): string => {
  const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${MONTH_SHORT[d.getMonth()]}`
}

const weekNum = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayN = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayN)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// ─── Local primitives ─────────────────────────────────────────────────────────

const Lbl = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span style={{
    fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--ink-3)', ...style,
  }}>{children}</span>
)

const Num = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <span style={{
    fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
    color: 'var(--ink)', letterSpacing: '0.01em', ...style,
  }}>{children}</span>
)

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: 'transparent', border: '1px solid var(--paper-2)',
  borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
  fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--ink-2)',
  whiteSpace: 'nowrap',
}

const Chip = ({
  active, onClick, children,
}: { active?: boolean; onClick?: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={{
    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400,
    padding: '4px 10px', borderRadius: 999,
    background: active ? 'var(--paper-3)' : 'var(--paper-1)',
    border: `1px solid ${active ? 'var(--ink-4)' : 'var(--paper-2)'}`,
    color: 'var(--ink)', cursor: 'pointer',
  }}>{children}</button>
)

const Badge = ({
  tone = 'default', children,
}: { tone?: 'default' | 'terra' | 'sauge'; children: React.ReactNode }) => {
  const tones = {
    default: { bg: 'var(--paper-2)', color: 'var(--ink-2)' },
    terra:   { bg: 'var(--terra-soft)', color: '#6B2F14' },
    sauge:   { bg: 'var(--sage-soft)', color: '#3F5A3C' },
  }
  const t = tones[tone]
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4,
      background: t.bg, color: t.color,
    }}>{children}</span>
  )
}

// ─── TypeBadge (local) ────────────────────────────────────────────────────────

const TypeBadge = ({ type }: { type: string }) => {
  const tones: Record<string, { bg: string; color: string }> = {
    Partiel: { bg: 'var(--ink)',        color: 'var(--paper-1)' },
    Exposé:  { bg: 'var(--terra-soft)', color: '#6B2F14' },
    Rendu:   { bg: 'var(--paper-2)',    color: 'var(--ink-2)' },
    Mémoire: { bg: 'var(--sage-soft)',  color: '#3F5A3C' },
  }
  const t = tones[type] ?? tones.Rendu
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
      textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4,
      background: t.bg, color: t.color, whiteSpace: 'nowrap',
    }}>{type}</span>
  )
}

// ─── SectionHead ──────────────────────────────────────────────────────────────

const SectionHead = ({
  label, hint, children,
}: { label: string; hint?: string; children?: React.ReactNode }) => (
  <div style={{
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    marginBottom: 12, gap: 16, flexWrap: 'wrap',
  }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexShrink: 0, minWidth: 0 }}>
      <h2 style={{
        fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)',
        letterSpacing: '-0.01em', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap',
      }}>{label}</h2>
      {hint && (
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)',
          fontStyle: 'italic', whiteSpace: 'nowrap',
        }}>{hint}</span>
      )}
    </div>
    {children}
  </div>
)

// ─── PrepBar ─────────────────────────────────────────────────────────────────

const PrepBar = ({ value, accent }: { value: number; accent: string }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
      <Lbl style={{ fontSize: 9 }}>préparation</Lbl>
      <Num style={{ fontSize: 11.5, fontWeight: 500 }}>{value} %</Num>
    </div>
    <div style={{ height: 3, background: 'var(--paper-2)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: accent, borderRadius: 999 }} />
    </div>
  </div>
)

// ─── Section 1 : PrioritesSuggerees ──────────────────────────────────────────

const DistRow = ({ jour, h }: { jour: string; h: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{jour}</span>
    <Num style={{ fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{h}</Num>
  </div>
)

const Distribution = ({
  surLeFeu, heuresTotal,
}: { surLeFeu: Echeance[]; heuresTotal: number }) => {
  const semaineCount = surLeFeu.filter((e) => daysUntil(parseDate(e.date)) <= 7).length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <Lbl>répartition suggérée</Lbl>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <DistRow jour="mar. soir" h="3–4 h" />
        <DistRow jour="jeu. soir" h="3–4 h" />
        <DistRow jour="sam. matin" h="5–6 h" />
      </div>
      <div style={{
        marginTop: 6, paddingTop: 10, borderTop: '1px dashed var(--paper-2)',
        fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)',
        fontStyle: 'italic', lineHeight: 1.4,
      }}>
        ~<Num style={{ fontStyle: 'normal', fontWeight: 500, color: 'var(--ink)' }}>{heuresTotal} h</Num>
        {' à placer · '}{semaineCount} échéance{semaineCount > 1 ? 's' : ''} sous 7 j
      </div>
    </div>
  )
}

const PrioBloc = ({
  rang, e, dominant, matieres, notes, prep,
}: {
  rang: string
  e: Echeance
  dominant?: boolean
  matieres: Matiere[]
  notes: NotesDroit[]
  prep: Record<string, number>
}) => {
  const m = matieres.find((mat) => mat.code === e.matiereCode)
  const d = daysUntil(parseDate(e.date))
  const prepVal = prep[e.id] ?? 0
  const restant = 100 - prepVal
  const heures = heuresRestantes(e, prep)
  const notesCount = notes.filter((n) => n.matiere === e.matiereCode).length

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      paddingRight: 20, borderRight: '1px solid var(--paper-2)',
      opacity: dominant ? 1 : 0.78,
    }}>
      <Lbl style={{ color: dominant ? 'var(--terra)' : 'var(--ink-3)' }}>{rang}</Lbl>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: dominant ? 22 : 18, fontWeight: 500,
          color: 'var(--ink)', lineHeight: 1.2, letterSpacing: '-0.005em',
        }}>{m?.court} · {e.type.toLowerCase()}</span>
      </div>
      <p style={{
        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
        fontSize: dominant ? 15 : 14, color: 'var(--ink-2)', margin: 0, lineHeight: 1.55, maxWidth: '40ch',
      }}>
        Il te reste{' '}
        <span style={{ fontStyle: 'normal', fontWeight: 600, color: dominant ? 'var(--terra)' : 'var(--ink)' }}>
          {restant} %
        </span>{' '}
        à finir en{' '}
        <span style={{ fontStyle: 'normal', fontWeight: 600, color: dominant ? 'var(--terra)' : 'var(--ink)' }}>
          {d} j
        </span>{' '}
        — environ{' '}
        <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--ink)' }}>
          {heures} h
        </span>{' '}
        de travail.
      </p>
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <button style={ghostBtn}>
          <BookOpen size={12} />notes ({notesCount})
        </button>
        <button style={ghostBtn}>
          <Library size={12} />biblio
        </button>
      </div>
    </div>
  )
}

const PrioritesSuggerees = ({
  surLeFeu, matieres, notes, prep,
}: {
  surLeFeu: Echeance[]
  matieres: Matiere[]
  notes: NotesDroit[]
  prep: Record<string, number>
}) => {
  const p1 = surLeFeu[0]
  const p2 = surLeFeu[1]
  const heuresTotal = surLeFeu.slice(0, 3).reduce((n, e) => n + heuresRestantes(e, prep), 0)
  const today = new Date()

  return (
    <header style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Scale size={13} style={{ color: 'var(--ink-3)' }} />
        <Lbl style={{ whiteSpace: 'nowrap' }}>
          {`droit · ${dayLabel(today)} · semaine ${weekNum(today)}`}
        </Lbl>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20,
        background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 16,
        padding: '20px 24px', alignItems: 'stretch',
      }}>
        {p1 && (
          <PrioBloc rang="priorité" e={p1} dominant matieres={matieres} notes={notes} prep={prep} />
        )}
        {p2 && (
          <PrioBloc rang="puis" e={p2} matieres={matieres} notes={notes} prep={prep} />
        )}
        <Distribution surLeFeu={surLeFeu} heuresTotal={heuresTotal} />
      </div>
    </header>
  )
}

// ─── Section 2 : SurLeFeu ────────────────────────────────────────────────────

const FireRow = ({
  e, matieres, prep,
}: { e: Echeance; matieres: Matiere[]; prep: Record<string, number> }) => {
  const [hover, setHover] = useState(false)
  const m = matieres.find((mat) => mat.code === e.matiereCode)
  const d = daysUntil(parseDate(e.date))
  const prepVal = prep[e.id] ?? 0
  const heures = heuresRestantes(e, prep)
  const date = parseDate(e.date)
  const day = String(date.getDate()).padStart(2, '0')
  const mo = MONTH_SHORT[date.getMonth()]
  const isCritical = d <= 7 && prepVal < 70

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '56px 90px minmax(0, 1fr) 160px 84px',
        gap: 14, alignItems: 'center', padding: '14px 16px',
        background: 'var(--paper-1)', borderRadius: 10,
        border: `1px solid ${hover ? 'var(--ink-4)' : isCritical ? '#DEB89C' : 'var(--paper-2)'}`,
        cursor: 'pointer', transition: 'border-color var(--dur) var(--ease)',
      }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <Num style={{ fontSize: 20, fontWeight: 500, color: isCritical ? 'var(--terra)' : 'var(--ink)', lineHeight: 1 }}>
          {day}
        </Num>
        <Num style={{ fontSize: 11, color: isCritical ? 'var(--terra)' : 'var(--ink-2)', textTransform: 'uppercase' }}>
          {mo}
        </Num>
      </div>
      <TypeBadge type={e.type} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{e.titre}</span>
        <Lbl style={{ fontSize: 9.5 }}>{m?.court}</Lbl>
      </div>
      <PrepBar value={prepVal} accent={isCritical ? 'var(--terra)' : 'var(--ink-2)'} />
      <div style={{ justifySelf: 'end', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <Num style={{ fontSize: 13, fontWeight: 500, color: isCritical ? 'var(--terra)' : 'var(--ink)' }}>
          J-{d}
        </Num>
        <Num style={{ fontSize: 11, color: 'var(--ink-3)' }}>~{heures} h</Num>
      </div>
    </div>
  )
}

const SurLeFeu = ({
  items, matieres, prep,
}: { items: Echeance[]; matieres: Matiere[]; prep: Record<string, number> }) => {
  if (items.length === 0) return null
  return (
    <section style={{ marginBottom: 32 }}>
      <SectionHead
        label="Sur le feu"
        hint={`${items.length} échéance${items.length > 1 ? 's' : ''} active${items.length > 1 ? 's' : ''}`}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((e) => (
          <FireRow key={e.id} e={e} matieres={matieres} prep={prep} />
        ))}
      </div>
    </section>
  )
}

// ─── Section 3 : SuiviGlobal ─────────────────────────────────────────────────

const MatiereDot = ({ m }: { m: Matiere }) => {
  const [hover, setHover] = useState(false)
  const status = m.prep >= 70 ? 'ok' : m.prep >= 45 ? 'mid' : 'low'
  const color = status === 'ok' ? 'var(--sage)' : status === 'mid' ? 'var(--ink-3)' : 'var(--terra)'
  const symbol = status === 'ok' ? '✓' : status === 'low' ? '!' : '·'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        padding: '2px 6px', borderRadius: 6,
        background: hover ? 'var(--paper-2)' : 'transparent',
        transition: 'background var(--dur) var(--ease)',
      }}>
      <span style={{
        width: 14, height: 14, borderRadius: 999, background: color,
        color: 'var(--paper-1)', display: 'inline-grid', placeItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
      }}>{symbol}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)' }}>{m.court}</span>
      <Num style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.prep}%</Num>
    </div>
  )
}

const SuiviGlobal = ({ matieres }: { matieres: Matiere[] }) => {
  const sorted = [...matieres].sort((a, b) => a.prep - b.prep)
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
        background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
        borderRadius: 10, flexWrap: 'wrap',
      }}>
        <Lbl style={{ flexShrink: 0 }}>suivi global</Lbl>
        <span style={{ width: 1, height: 18, background: 'var(--paper-2)' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, flex: 1 }}>
          {sorted.map((m) => <MatiereDot key={m.code} m={m} />)}
        </div>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
          glisser pour ajuster
        </span>
      </div>
    </section>
  )
}

// ─── Section 4 : Memoire ─────────────────────────────────────────────────────

const JalonItem = ({ j }: { j: JalonType }) => {
  const colors = {
    fait:       { dot: 'var(--sage)',    text: 'var(--ink)' },
    'en cours': { dot: 'var(--terra)',   text: 'var(--ink)' },
    'à faire':  { dot: 'var(--paper-3)', text: 'var(--ink-3)' },
  }
  const c = colors[j.etat]
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      position: 'relative', zIndex: 1,
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: 999, background: c.dot,
        border: '3px solid var(--paper-1)',
      }} />
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: 11.5, color: c.text,
        textAlign: 'center', lineHeight: 1.3,
        fontWeight: j.etat === 'en cours' ? 500 : 400,
      }}>{j.label}</span>
      <Num style={{ fontSize: 10, color: 'var(--ink-3)' }}>{j.date}</Num>
    </div>
  )
}

const Memoire = ({ memoire }: { memoire: MemoireType }) => {
  const [showAll, setShowAll] = useState(false)
  const j = memoire.jalonCourant
  const d = daysUntil(parseDate(j.date))
  const pct = Math.round((memoire.pagesEcrites / memoire.pagesTotal) * 100)

  return (
    <section style={{ marginBottom: 32 }}>
      <SectionHead label="Mémoire" hint="suivi propre" />
      <div style={{
        background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
        borderRadius: 12, padding: '20px 24px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 28, alignItems: 'center' }}>
          <div>
            <Lbl style={{ marginBottom: 4, display: 'block' }}>
              prochain jalon · directeur {memoire.directeur}
            </Lbl>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500,
              color: 'var(--ink)', lineHeight: 1.2, letterSpacing: '-0.005em', marginBottom: 8,
            }}>{j.label}</div>
            <p style={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15,
              color: 'var(--ink-2)', margin: 0, lineHeight: 1.4,
            }}>
              J-<Num style={{ fontStyle: 'normal', fontWeight: 500, color: 'var(--ink)' }}>{d}</Num>
              {' · '}
              <Num style={{ fontStyle: 'normal', fontWeight: 500, color: 'var(--ink)' }}>
                {memoire.pagesEcrites}/{memoire.pagesTotal}
              </Num>
              {' pages écrites · prochain RDV '}{memoire.prochaineReunion}.
            </p>
          </div>
          <div style={{
            background: 'var(--paper-2)', borderRadius: 10, padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <Lbl style={{ fontSize: 9.5 }}>rédaction</Lbl>
            <Num style={{
              fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 500,
              color: 'var(--ink)', lineHeight: 1,
            }}>
              {pct} <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>%</span>
            </Num>
            <div style={{ height: 3, background: 'var(--paper-3)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ink)' }} />
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            marginTop: 16, background: 'transparent', border: 0, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-3)',
            padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
          {showAll ? '▾' : '▸'} {showAll ? 'masquer' : 'voir'} les {memoire.jalonsTous.length} jalons
        </button>

        {showAll && (
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--paper-2)',
            display: 'grid',
            gridTemplateColumns: `repeat(${memoire.jalonsTous.length}, 1fr)`,
            gap: 8, position: 'relative',
          }}>
            <div style={{
              position: 'absolute', left: 8, right: 8, top: 14 + 7,
              height: 1, background: 'var(--paper-2)', zIndex: 0,
            }} />
            {memoire.jalonsTous.map((jl, i) => <JalonItem key={i} j={jl} />)}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Section 5 : ApresUrgent ─────────────────────────────────────────────────

const CompactRow = ({
  e, last, matieres,
}: { e: Echeance; last: boolean; matieres: Matiere[] }) => {
  const m = matieres.find((mat) => mat.code === e.matiereCode)
  const d = daysUntil(parseDate(e.date))
  const date = parseDate(e.date)
  const day = String(date.getDate()).padStart(2, '0')
  const mo = MONTH_SHORT[date.getMonth()]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '60px 90px 1fr 80px',
      gap: 16, alignItems: 'center', padding: '10px 4px',
      borderBottom: last ? 'none' : '1px solid var(--paper-2)',
      opacity: 0.85,
    }}>
      <Num style={{ fontSize: 12, color: 'var(--ink-2)' }}>{day} {mo}</Num>
      <TypeBadge type={e.type} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{e.titre}</span>
        <Lbl style={{ fontSize: 9.5 }}>{m?.court}</Lbl>
      </div>
      <Num style={{ fontSize: 12, color: 'var(--ink-3)', justifySelf: 'end' }}>J-{d}</Num>
    </div>
  )
}

const ApresUrgent = ({
  items, matieres, prep,
}: { items: Echeance[]; matieres: Matiere[]; prep: Record<string, number> }) => {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <section style={{ marginBottom: 32 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 0, cursor: 'pointer', padding: '8px 0',
          borderTop: '1px solid var(--paper-2)',
          borderBottom: open ? '1px solid var(--paper-2)' : undefined,
          marginBottom: open ? 14 : 0,
        }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>
            {open ? '▾' : '▸'} Au-delà
          </span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
            {items.length} échéance{items.length > 1 ? 's' : ''} sans alerte immédiate
          </span>
        </div>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((e, i) => (
            <CompactRow
              key={e.id} e={e} last={i === items.length - 1}
              matieres={matieres}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Section 6 : Referentiel ─────────────────────────────────────────────────

const TAG_TONES: Record<string, 'terra' | 'sauge' | 'default'> = {
  Important:    'terra',
  'À réviser':  'default',
  Jurisprudence: 'sauge',
  Doctrine:     'default',
}

const NoteRow = ({
  n, last, matieres,
}: { n: NotesDroit; last: boolean; matieres: Matiere[] }) => {
  const m = matieres.find((mat) => mat.code === n.matiere)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '90px 1fr 180px',
      gap: 16, padding: '12px 16px', alignItems: 'center',
      borderBottom: last ? 'none' : '1px solid var(--paper-2)', cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Num style={{ fontSize: 11.5 }}>{n.date}</Num>
        <Lbl style={{ fontSize: 9 }}>{m?.court}</Lbl>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{n.titre}</span>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{n.extrait}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {n.tags.map((tag) => (
          <Badge key={tag} tone={TAG_TONES[tag] ?? 'default'}>{tag}</Badge>
        ))}
      </div>
    </div>
  )
}

const NotesList = ({
  notes, matieres,
}: { notes: NotesDroit[]; matieres: Matiere[] }) => {
  const [filter, setFilter] = useState('toutes')
  const codes = ['toutes', ...Array.from(new Set(notes.map((n) => n.matiere)))]
  const filtered = filter === 'toutes' ? notes : notes.filter((n) => n.matiere === filter)

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {codes.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {c === 'toutes' ? 'Toutes' : matieres.find((m) => m.code === c)?.court ?? c}
          </Chip>
        ))}
      </div>
      <div style={{
        background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
        borderRadius: 10, overflow: 'hidden',
      }}>
        {filtered.map((n, i, a) => (
          <NoteRow key={i} n={n} last={i === a.length - 1} matieres={matieres} />
        ))}
      </div>
    </div>
  )
}

const BiblioRow = ({ it, last }: { it: { type: string; auteur: string; titre: string; meta: string }; last: boolean }) => {
  const tones: Record<string, { bg: string; color: string }> = {
    Manuel:  { bg: 'var(--paper-2)',    color: 'var(--ink-2)' },
    Article: { bg: 'var(--paper-2)',    color: 'var(--ink-2)' },
    Arrêt:   { bg: 'var(--sage-soft)', color: '#3F5A3C' },
    Code:    { bg: 'var(--terra-soft)', color: '#6B2F14' },
  }
  const tt = tones[it.type] ?? tones.Manuel

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '80px 1fr auto',
      gap: 16, padding: '12px 16px', alignItems: 'center',
      borderBottom: last ? 'none' : '1px solid var(--paper-2)', cursor: 'pointer',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
        textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4,
        background: tt.bg, color: tt.color, justifySelf: 'start',
      }}>{it.type}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: 14.5, fontWeight: 500, color: 'var(--ink)',
        }}>{it.titre}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12 }}>
          <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-2)' }}>{it.auteur}</span>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{it.meta}</span>
        </div>
      </div>
      <ExternalLink size={13} style={{ color: 'var(--ink-3)' }} />
    </div>
  )
}

const BiblioList = ({
  biblio, matieres,
}: { biblio: BiblioDroit[]; matieres: Matiere[] }) => {
  const [active, setActive] = useState(biblio[0]?.matiere ?? '')
  const cur = biblio.find((g) => g.matiere === active) ?? biblio[0]

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {biblio.map((g) => (
          <Chip key={g.matiere} active={active === g.matiere} onClick={() => setActive(g.matiere)}>
            {matieres.find((m) => m.code === g.matiere)?.court ?? g.matiere} · {g.items.length}
          </Chip>
        ))}
      </div>
      {cur && (
        <div style={{
          background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          {cur.items.map((it, i, a) => (
            <BiblioRow key={i} it={it} last={i === a.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}

const TabBtn = ({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={{
    background: active ? 'var(--paper-1)' : 'transparent',
    color: active ? 'var(--ink)' : 'var(--ink-2)',
    border: 0, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
    fontFamily: 'var(--font-sans)', fontSize: 13,
    fontWeight: active ? 500 : 400,
  }}>{children}</button>
)

const Referentiel = ({
  notes, biblio, matieres,
}: { notes: NotesDroit[]; biblio: BiblioDroit[]; matieres: Matiere[] }) => {
  const [tab, setTab] = useState<'notes' | 'biblio'>('notes')
  const totalBiblio = biblio.reduce((n, m) => n + m.items.length, 0)

  return (
    <section>
      <SectionHead label="Référentiel" hint="consulté à la demande">
        <div style={{
          display: 'inline-flex', borderRadius: 8, padding: 2,
          background: 'var(--paper-2)', gap: 2,
        }}>
          <TabBtn active={tab === 'notes'} onClick={() => setTab('notes')}>
            Notes · {notes.length}
          </TabBtn>
          <TabBtn active={tab === 'biblio'} onClick={() => setTab('biblio')}>
            Bibliographie · {totalBiblio}
          </TabBtn>
        </div>
      </SectionHead>
      {tab === 'notes'
        ? <NotesList notes={notes} matieres={matieres} />
        : <BiblioList biblio={biblio} matieres={matieres} />
      }
    </section>
  )
}

// ─── DroitPage ────────────────────────────────────────────────────────────────

export function DroitPage() {
  const matieres  = useDroitStore((s) => s.matieres)
  const echeances = useDroitStore((s) => s.echeances)
  const prep      = useDroitStore((s) => s.prep)
  const notes     = useDroitStore((s) => s.notes)
  const biblio    = useDroitStore((s) => s.biblio)
  const memoire   = useDroitStore((s) => s.memoire)

  const upcoming = [...echeances]
    .filter((e) => daysUntil(parseDate(e.date)) >= 0)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())

  const surLeFeu = upcoming
    .filter((e) => isOnFire(e, prep))
    .sort((a, b) => urgencyScore(b, prep) - urgencyScore(a, prep))

  const apresUrgent = upcoming.filter((e) => !isOnFire(e, prep))

  return (
    <div style={{ padding: '24px 48px 80px', maxWidth: 1100, margin: '0 auto' }}>
      {/* 1 — Priorités suggérées */}
      <PrioritesSuggerees
        surLeFeu={surLeFeu}
        matieres={matieres}
        notes={notes}
        prep={prep}
      />
      {/* 2 — Sur le feu */}
      <SurLeFeu items={surLeFeu} matieres={matieres} prep={prep} />
      {/* 3 — Suivi global */}
      <SuiviGlobal matieres={matieres} />
      {/* 4 — Mémoire */}
      <Memoire memoire={memoire} />
      {/* 5 — Après l'urgent */}
      <ApresUrgent items={apresUrgent} matieres={matieres} prep={prep} />
      {/* 6 — Référentiel */}
      <Referentiel notes={notes} biblio={biblio} matieres={matieres} />
    </div>
  )
}
