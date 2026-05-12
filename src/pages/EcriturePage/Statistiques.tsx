import { Label } from './primitives'
import { SummaryCard } from './components/SummaryCard'
import { BarChart, LegendDot } from './components/BarChart'
import { WEEKS, GENRES, PAST, OBJECTIF_MOTS } from './data'

export function Statistiques() {
  const total = WEEKS.length
  const term  = WEEKS.filter(w => w.etat === 'terminée').length
  const aban  = WEEKS.filter(w => w.etat === 'abandonnée').length
  const totalMots = WEEKS.filter(w => w.etat !== 'en cours').reduce((s, w) => s + w.mots, 0)
  const finis = total > 1 ? total - 1 : 1
  const moyenne = finis > 0 ? Math.round(totalMots / finis) : 0

  if (total === 0) {
    return (
      <div style={{ paddingTop: 64, paddingBottom: 64, textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 20,
          color: 'var(--ink-2)',
          margin: 0,
        }}>Les statistiques apparaîtront au fil des semaines.</p>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 36, paddingBottom: 64 }}>

      {/* ── 4 cartes résumé ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 40 }}>
        <SummaryCard
          label="défis lancés"
          n={total}
          legend="depuis le 1ᵉʳ mars"
        />
        <SummaryCard
          label="nouvelles livrées"
          n={term}
          accent
          legend={`${Math.round(term / (total - 1) * 100)} % de tenue`}
        />
        <SummaryCard
          label="abandons"
          n={aban}
          legend="sans punition"
        />
        <SummaryCard
          label="moyenne / semaine"
          n={moyenne.toLocaleString('fr-FR').replace(',', ' ')}
          unit="mots"
          legend="hors semaine en cours"
        />
      </div>

      {/* ── Graphique barres ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <Label>Mots livrés par semaine</Label>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <LegendDot color="var(--terra)" label="terminée" />
            <LegendDot color="var(--ink-4)" label="abandonnée" />
            <LegendDot color="var(--terra)" label="en cours" dashed />
          </div>
        </div>
        <div style={{
          background: 'var(--paper-1)',
          border: '1px solid var(--paper-2)',
          borderRadius: 12,
          padding: '28px 28px 18px',
        }}>
          <BarChart weeks={WEEKS} target={OBJECTIF_MOTS} />
        </div>
      </section>

      {/* ── Répartition par genre ─────────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <Label>Répartition par genre</Label>
          <span style={{ fontFamily: 'var(--font-sans)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)' }}>
            sur {PAST.length} nouvelles passées
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GENRES.map(g => (
            <div key={g.nom} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px 8px 8px',
              borderRadius: 999,
              background: 'var(--paper-1)',
              border: '1px solid var(--paper-2)',
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 26,
                height: 26,
                borderRadius: 999,
                background: 'var(--terra-soft)',
                color: '#6B2F14',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 500,
              }}>{g.n}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>
                {g.nom}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
