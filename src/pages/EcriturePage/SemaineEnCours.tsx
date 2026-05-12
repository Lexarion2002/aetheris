import { Plus } from 'lucide-react'
import { Label, Btn } from './primitives'
import { CURRENT } from './data'
import { StatChip } from './components/StatChip'
import { SessionRow } from './components/SessionRow'
import { FragmentCard } from './components/FragmentCard'

export function SemaineEnCours() {
  const c = CURRENT

  if (!c) {
    return (
      <div style={{
        paddingTop: 64,
        paddingBottom: 64,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 20,
          color: 'var(--ink-2)',
          margin: 0,
          lineHeight: 1.5,
        }}>Aucune nouvelle en cours cette semaine.</p>
        <Btn variant="primary" style={{ fontSize: 14, padding: '10px 20px' }}>
          <Plus size={16} />Commencer la semaine #01
        </Btn>
      </div>
    )
  }

  const pct = Math.round((c.ecrits / c.objectif) * 100)
  const totalMots = c.sessions.reduce((s, x) => s + x.mots, 0)
  const totalSessions = c.sessions.length

  return (
    <div style={{ paddingTop: 36, paddingBottom: 64 }}>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Label>semaine du 12 au 18 avril</Label>
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
          }}>J−{c.jours_restants}</span>
        </div>
      </div>

      {/* ── Progression ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
            <span style={{ color: 'var(--terra)' }}>{c.ecrits.toLocaleString('fr-FR')}</span>
            <span style={{ color: 'var(--ink-3)' }}> / {c.objectif.toLocaleString('fr-FR')} mots</span>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{pct}%</span>
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
      </div>

      {/* ── Journal des sessions ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <Label>Journal de la semaine</Label>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)' }}>
            {totalSessions} sessions · {totalMots.toLocaleString('fr-FR')} mots
          </span>
        </div>
        {c.sessions.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)', margin: 0 }}>
            Aucune session enregistrée pour l'instant.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {c.sessions.map((s, i) => <SessionRow key={i} {...s} />)}
          </div>
        )}
      </section>

      {/* ── Fragments ─────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <Label style={{ display: 'block', marginBottom: 12 }}>Fragments — carnet d'à-côté</Label>
        {c.fragments.idees.length === 0 && c.fragments.alternatives.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)', margin: 0 }}>
            Aucun fragment pour l'instant.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {c.fragments.idees.map((f, i)        => <FragmentCard key={`i${i}`} kind="idee" {...f} />)}
            {c.fragments.alternatives.map((f, i) => <FragmentCard key={`a${i}`} kind="alt"  {...f} />)}
          </div>
        )}
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
      </section>
    </div>
  )
}
