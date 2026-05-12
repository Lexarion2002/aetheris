import { Plus, X, Check } from 'lucide-react'
import { Label, Num, Badge, Btn } from './primitives'
import { StatChip } from './components/StatChip'
import { SessionRow } from './components/SessionRow'
import { FragmentCard } from './components/FragmentCard'
import { CURRENT } from './data'

export function SemaineEnCours() {
  const c = CURRENT
  const pct = Math.round((c.ecrits / c.objectif) * 100)
  const totalMots = c.sessions.reduce((s, x) => s + x.mots, 0)
  const totalSessions = c.sessions.length

  return (
    <div style={{ paddingTop: 36, paddingBottom: 64 }}>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Num style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            NOUVELLE #{String(c.n).padStart(2, '0')}
          </Num>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <Label>semaine du 12 au 18 avril</Label>
          <span style={{ color: 'var(--ink-4)' }}>·</span>
          <Badge tone="terra">{c.genre}</Badge>
        </div>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 52,
          fontWeight: 500,
          color: 'var(--ink)',
          letterSpacing: '-0.015em',
          lineHeight: 1.05,
          margin: '4px 0 16px',
        }}>{c.titre}</h2>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 19,
          color: 'var(--ink-2)',
          lineHeight: 1.5,
          margin: 0,
          maxWidth: '64ch',
        }}>{c.synopsis}</p>
      </div>

      {/* ── CTA + deadline ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        <Btn variant="primary" style={{ fontSize: 14, padding: '10px 18px' }}>
          <Plus size={16} />Enregistrer une session
        </Btn>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Label>échéance</Label>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--terra)',
            letterSpacing: '0.04em',
          }}>DIM. 18 AVR · J−{c.jours_restants}</span>
        </div>
      </div>

      {/* ── Progression ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <Num style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
            <span style={{ color: 'var(--terra)' }}>4 200</span>
            <span style={{ color: 'var(--ink-3)' }}> / 6 000 mots</span>
          </Num>
          <Num style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>{pct}%</Num>
        </div>
        <div style={{ height: 4, width: '100%', borderRadius: 999, background: 'var(--paper-2)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--terra)',
            borderRadius: 999,
            transition: 'width 320ms var(--ease)',
          }} />
        </div>
      </div>

      {/* ── Stat chips ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
        <StatChip n={totalSessions} unit="sessions" />
        <StatChip n="4 h 20" unit="d'écriture" />
        <StatChip n="968" unit="mots / heure" />
      </div>

      {/* ── Journal des sessions ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <Label>Journal de la semaine</Label>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)' }}>
            {totalSessions} sessions · {totalMots.toLocaleString('fr-FR').replace(',', ' ')} mots
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {c.sessions.map((s, i) => <SessionRow key={i} {...s} />)}
        </div>
      </section>

      {/* ── Fragments ─────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <Label style={{ display: 'block', marginBottom: 12 }}>Fragments — carnet d'à-côté</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {c.fragments.idees.map((f, i)        => <FragmentCard key={`i${i}`} kind="idee" {...f} />)}
          {c.fragments.alternatives.map((f, i) => <FragmentCard key={`a${i}`} kind="alt"  {...f} />)}
        </div>
      </section>

      {/* ── Post-mortem ───────────────────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <Label>Post-mortem — à remplir dimanche soir</Label>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
            ouvert quand la nouvelle est marquée terminée
          </span>
        </div>
        <div style={{
          background: 'var(--paper-1)',
          border: '1px dashed var(--ink-4)',
          borderRadius: 12,
          padding: '20px 22px',
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 16,
          color: 'var(--ink-3)',
          lineHeight: 1.5,
          minHeight: 96,
        }}>
          Ce qui a marché. Ce qui a coincé. Ce que je garde pour la prochaine.
          <br />
          <span style={{ fontSize: 14, color: 'var(--ink-4)' }}>(3 questions, 3 réponses courtes — pas de roman.)</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)' }}>
            Reste {(c.objectif - c.ecrits).toLocaleString('fr-FR').replace(',', ' ')} mots et trois jours. Tu y es.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" style={{ padding: '10px 16px' }}>
              <X size={14} />Abandonner
            </Btn>
            <Btn variant="primary" style={{ padding: '10px 16px', background: 'var(--sage-deep)' }}>
              <Check size={14} />Marquer comme terminée
            </Btn>
          </div>
        </div>
      </section>
    </div>
  )
}
