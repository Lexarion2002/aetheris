// Hub /droit — refonte juin 2026.
// Vue d'ensemble : countdown partiels + grille matières + section dossiers.
// Remplace l'ancien système Tache/SousTache (table rase).

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDroitStore } from '../store/droitStore'
import { DomainObjectivesSection } from '../components/DomainObjectivesSection'
import { FlashcardReviewModal } from '../components/FlashcardReviewModal'
import {
  CountdownBanner,
  SubjectCard,
  DossierRow,
  ML,
  daysUntil,
  formatShortDate,
  formatNumericDate,
  today,
} from '../components/droit'
import type { Matiere, Sujet } from '../store/droitStore'
import type { SubjectCardData } from '../components/droit'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayIso = () => new Date().toISOString().split('T')[0]

// % "couverture" d'une matière = fraction de cases F/R/S/Q cochées sur le total possible
function coverage(sujets: Sujet[]): number {
  if (sujets.length === 0) return 0
  const total = sujets.length * 4
  const done = sujets.reduce((acc, s) =>
    acc + Number(s.checks.fiche) + Number(s.checks.revu) + Number(s.checks.simule) + Number(s.checks.questions),
  0)
  return Math.round((done / total) * 100)
}

function fichedCount(sujets: Sujet[]): number {
  return sujets.filter((s) => s.checks.fiche).length
}

function buildCardData(m: Matiere, sujets: Sujet[]): SubjectCardData {
  const own = sujets.filter((s) => s.matiereId === m.id)
  const counters = own.reduce(
    (acc, s) => { acc[s.confidence]++; return acc },
    { red: 0, amber: 0, green: 0 },
  )

  // QCM → métrique "couverture" (% cases cochées) ; Oral → "sujets fichés"
  const isOral = m.format === 'Oral'
  const progress      = isOral
    ? Math.round((fichedCount(own) / Math.max(1, own.length)) * 100)
    : coverage(own)
  const progressLabel = isOral ? 'Sujets fichés' : 'Couverture'
  const fichesLine    = isOral ? `${fichedCount(own)} / ${own.length} sujets fichés` : undefined

  return {
    id:           m.id,
    title:        m.title,
    subtitle:     m.subtitle,
    format:       m.format,
    date:         m.examLabel || formatShortDate(m.examDate),
    daysLeft:     Math.max(0, daysUntil(m.examDate)),
    progress,
    progressLabel,
    fichesLine,
    counters,
    priorities:   m.priorities.length,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DroitPage() {
  const navigate    = useNavigate()
  const matieres    = useDroitStore((s) => s.matieres)
  const sujets      = useDroitStore((s) => s.sujets)
  const dossiers    = useDroitStore((s) => s.dossiers)
  const flashcards  = useDroitStore((s) => s.flashcards)

  const [reviewOpen, setReviewOpen] = useState(false)

  // Trie matières par urgence d'examen (date la plus proche d'abord)
  const sortedMatieres = useMemo(() => {
    return [...matieres].sort((a, b) => a.examDate.localeCompare(b.examDate))
  }, [matieres])

  // Trie dossiers par deadline croissante
  const sortedDossiers = useMemo(() => {
    return [...dossiers].sort((a, b) => a.deadline.localeCompare(b.deadline))
  }, [dossiers])

  // Stats globales pour le bandeau countdown
  const totalSujets   = sujets.length
  const fichedTotal   = sujets.filter((s) => s.checks.fiche).length
  const dueFlashcards = flashcards.filter((c) => c.nextReview <= todayIso()).length

  // Partiels : premier examen oral (date de début 1er juin pour le plage)
  const partiels      = sortedMatieres.find((m) => m.format === 'Oral') ?? sortedMatieres[0]
  const partielsJ     = partiels ? Math.max(0, daysUntil(partiels.examDate)) : 0
  const partielsRange = (() => {
    // Détecte l'oral du 1er au 4 juin → "1er au 4 juin 2026"
    const orals = sortedMatieres.filter((m) => m.format === 'Oral')
    if (orals.length === 0) return ''
    const first = orals[0]
    // Si tous les oraux ont le même examLabel, on l'utilise
    const sameLabel = orals.every((m) => m.examLabel === first.examLabel)
    if (sameLabel && first.examLabel) {
      const year = first.examDate.slice(0, 4)
      return `${first.examLabel} ${year}`
    }
    return formatNumericDate(first.examDate)
  })()

  // Date display in header
  const headerDate = (() => {
    const d = today()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = d.getFullYear()
    return `${dd}.${mm}.${yy}`
  })()

  const handleOpenMatiere = (id: string) => navigate(`/droit/${id}`)

  return (
    <div style={{ padding: '48px 56px 72px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ─── Header ─── */}
      <header style={{ marginBottom: 36 }}>
        <ML style={{ display: 'block', marginBottom: 12, color: 'var(--terra)' }}>
          droit · master 2 · {headerDate}
        </ML>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 500,
          letterSpacing: '-0.01em', color: 'var(--ink)',
          margin: '0 0 10px', lineHeight: 1.05,
        }}>
          Révisions.
        </h1>
        <p style={{
          fontFamily: 'var(--font-serif)', fontSize: 18, fontStyle: 'italic',
          color: 'var(--ink-2)', margin: 0, maxWidth: '56ch',
        }}>
          La méthode est plus importante que la mémoire.
        </p>
      </header>

      {/* ─── Countdown ─── */}
      {partiels && (
        <div style={{ marginBottom: 44 }}>
          <CountdownBanner
            daysLeft={partielsJ}
            range={partielsRange}
            filed={fichedTotal}
            total={totalSujets}
            due={dueFlashcards}
            onReview={() => setReviewOpen(true)}
          />
        </div>
      )}

      {/* ─── Grille matières ─── */}
      <section style={{ marginBottom: 52 }}>
        <SecHead label={`Matières · ${sortedMatieres.length} examens`} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
        }}>
          {sortedMatieres.map((m) => (
            <SubjectCard
              key={m.id}
              data={buildCardData(m, sujets)}
              onOpen={() => handleOpenMatiere(m.id)}
            />
          ))}
        </div>
      </section>

      {/* ─── Dossiers & rendus ─── */}
      <section style={{ marginBottom: 52 }}>
        <SecHead label={`Dossiers & rendus · ${sortedDossiers.length} échéances`} />
        <div style={{
          background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <DossierTableHeader />
          {sortedDossiers.map((d, i) => (
            <DossierRow
              key={d.id}
              kind={d.kind}
              title={d.title}
              sub={d.sub}
              date={formatNumericDate(d.deadline)}
              daysLeft={Math.max(0, daysUntil(d.deadline))}
              isLast={i === sortedDossiers.length - 1}
            />
          ))}
        </div>
      </section>

      {/* ─── Objectifs du domaine — branchés sur le store global ─── */}
      <DomainObjectivesSection
        domainId="droit"
        subtitle="« Bâtir l'année, semaine après semaine. »"
      />

      {/* ─── Modal révision flashcards globale ─── */}
      {reviewOpen && (
        <FlashcardReviewModal
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  )
}

// ─── SecHead ──────────────────────────────────────────────────────────────────

function SecHead({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', marginBottom: 16,
    }}>
      <ML>{label}</ML>
    </div>
  )
}

// ─── DossierTableHeader ───────────────────────────────────────────────────────

function DossierTableHeader() {
  const headers: { label: string; align?: 'right' }[] = [
    { label: 'Type' },
    { label: 'Intitulé' },
    { label: 'Date limite' },
    { label: 'J−', align: 'right' },
    { label: '' },
  ]
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '92px 1fr 110px 60px 24px',
      gap: 16, padding: '8px 18px',
      borderBottom: '1px solid var(--paper-2)',
      background: 'var(--paper-2)',
    }}>
      {headers.map((h, i) => (
        <span key={i} style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--ink-3)',
          textAlign: h.align ?? 'left',
        }}>
          {h.label}
        </span>
      ))}
    </div>
  )
}

