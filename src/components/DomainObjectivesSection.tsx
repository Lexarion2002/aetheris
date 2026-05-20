// DomainObjectivesSection — Section "Objectifs" éditoriale réutilisable
// Branchée sur le store global `objectives` et filtrée par `domainId`.
// À insérer dans chaque page de domaine (DroitPage, MusicPage, SportView…).

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store'
import { ObjectiveFormModal } from './ObjectiveFormModal'
import { ObjectiveCard } from '../pages/ObjectivesPage'
import { urgencyBucket, daysUntil } from '../utils/objectiveUtils'
import type { Objective } from '../types'

interface Props {
  /** ID du domaine (UUID du store ou ID standalone : 'droit', 'sport', 'livres'…) */
  domainId: string
  /** Titre affiché en haut de la section. Défaut : "Objectifs." */
  title?: string
  /** Citation/sous-titre. Défaut : phrase générique. */
  subtitle?: string
  /** Espace au-dessus de la section (défaut : 56). */
  marginTop?: number
}

export function DomainObjectivesSection({
  domainId,
  title    = 'Objectifs',
  subtitle = '« Construire ici, planifier ailleurs. »',
  marginTop = 56,
}: Props) {
  const allObjectives    = useStore((s) => s.objectives)
  const archiveObjective = useStore((s) => s.archiveObjective)
  const deleteObjective  = useStore((s) => s.deleteObjective)
  const updateObjective  = useStore((s) => s.updateObjective)

  const [tab,        setTab]        = useState<'active' | 'archived'>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modal,      setModal]      = useState<{ mode: 'create' } | { mode: 'edit'; obj: Objective } | null>(null)

  // Objectifs du domaine (matching robuste : id direct ou nom normalisé)
  const domainObjectives = useMemo(() => {
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
    const target = normalize(domainId)
    return allObjectives.filter(
      (o) => o.domainId === domainId || normalize(o.domainId) === target,
    )
  }, [allObjectives, domainId])

  const visible = useMemo(
    () => domainObjectives
      .filter((o) => (tab === 'archived' ? !!o.archived : !o.archived))
      .sort((a, b) => {
        // En retard d'abord, puis par date cible, puis par progression
        const ao = urgencyBucket(a.targetDate) === 'overdue' ? 0 : 1
        const bo = urgencyBucket(b.targetDate) === 'overdue' ? 0 : 1
        if (ao !== bo) return ao - bo
        if (a.targetDate && b.targetDate) return daysUntil(a.targetDate) - daysUntil(b.targetDate)
        if (a.targetDate) return -1
        if (b.targetDate) return 1
        return a.progress - b.progress
      }),
    [domainObjectives, tab],
  )

  const stats = useMemo(() => {
    const active   = domainObjectives.filter((o) => !o.archived)
    const atteints = domainObjectives.filter((o) => !!o.archived).length
    const enRetard = active.filter((o) => o.targetDate && daysUntil(o.targetDate) < 0).length
    return { actifs: active.length, atteints, enRetard }
  }, [domainObjectives])

  const handleArchive = (obj: Objective) => {
    if (obj.archived) archiveObjective(obj.id, false)
    else {
      archiveObjective(obj.id, true)
      updateObjective(obj.id, { progress: 100 } as Parameters<typeof updateObjective>[1])
    }
    setExpandedId(null)
  }

  return (
    <section style={{ marginTop, maxWidth: 1100 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 22, gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={labelStyle}>boussole · domaine</div>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 500,
            color: 'var(--ink)', letterSpacing: '-0.005em',
            margin: '2px 0 4px', lineHeight: 1.2,
          }}>
            {title}<span style={{ color: 'var(--terra)' }}>.</span>
          </h2>
          <span style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 14, color: 'var(--ink-2)',
          }}>
            {subtitle}
          </span>
        </div>
        <button onClick={() => setModal({ mode: 'create' })} style={primaryBtn}>
          <Plus size={15} />
          Nouvel objectif
        </button>
      </div>

      {/* Métriques */}
      {stats.actifs + stats.atteints > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
          borderRadius: 12, marginBottom: 22, overflow: 'hidden',
        }}>
          {[
            { label: 'Actifs',    value: stats.actifs,    sub: 'en cours',          tone: '' },
            { label: 'Atteints',  value: stats.atteints,  sub: 'depuis le début',   tone: 'sage' },
            { label: 'En retard', value: stats.enRetard,  sub: 'à reprendre',       tone: 'terra' },
          ].map((m, i) => (
            <div key={m.label} style={{
              padding: '14px 20px',
              borderLeft: i > 0 ? '1px solid var(--paper-2)' : 0,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <span style={labelStyle}>{m.label}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 500,
                  letterSpacing: '0.01em', lineHeight: 1,
                  color: m.tone === 'sage' ? 'var(--sage-deep)'
                       : m.tone === 'terra' ? 'var(--terra)'
                       : 'var(--ink)',
                }}>
                  {String(m.value).padStart(2, '0')}
                </span>
                <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)' }}>
                  {m.sub}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        marginBottom: 18, borderBottom: '1px solid var(--paper-2)', gap: 0,
      }}>
        {(['active', 'archived'] as const).map((t) => {
          const count = domainObjectives.filter((o) => (t === 'archived' ? !!o.archived : !o.archived)).length
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              fontFamily: 'var(--font-sans)', fontSize: 14,
              fontWeight: tab === t ? 500 : 400,
              color: tab === t ? 'var(--ink)' : 'var(--ink-2)',
              background: 'transparent', border: 0, cursor: 'pointer',
              padding: '8px 0', marginRight: 24, marginBottom: -1,
              borderBottom: `2px solid ${tab === t ? 'var(--terra)' : 'transparent'}`,
              transition: 'border-color var(--dur) var(--ease), color var(--dur) var(--ease)',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              {t === 'active' ? 'Actifs' : 'Archivés'}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: tab === t ? 'var(--ink-2)' : 'var(--ink-3)',
                background: 'var(--paper-2)', padding: '2px 6px', borderRadius: 4,
              }}>
                {String(count).padStart(2, '0')}
              </span>
            </button>
          )
        })}
      </div>

      {/* Liste / état vide */}
      {visible.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          color: 'var(--ink-3)', fontFamily: 'var(--font-serif)',
          fontStyle: 'italic', fontSize: 16,
        }}>
          {tab === 'archived' ? (
            "Aucun objectif archivé pour l'instant."
          ) : (
            <>
              <p style={{ margin: '0 0 14px' }}>Aucun objectif en cours pour ce domaine.</p>
              <button onClick={() => setModal({ mode: 'create' })} style={primaryBtn}>
                <Plus size={14} /> Premier objectif
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map((o) => (
            <ObjectiveCard
              key={o.id}
              obj={o}
              expanded={expandedId === o.id}
              onExpand={() => setExpandedId(expandedId === o.id ? null : o.id)}
              onEdit={() => setModal({ mode: 'edit', obj: o })}
              onArchive={() => handleArchive(o)}
              onDelete={() => deleteObjective(o.id)}
            />
          ))}
        </div>
      )}

      {/* Modale */}
      {modal?.mode === 'create' && (
        <ObjectiveFormModal domainId={domainId} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <ObjectiveFormModal objective={modal.obj} domainId={modal.obj.domainId} onClose={() => setModal(null)} />
      )}
    </section>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4,
}

const primaryBtn: CSSProperties = {
  fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14,
  padding: '8px 16px', borderRadius: 8, border: '1px solid transparent',
  cursor: 'pointer', background: 'var(--terra)', color: 'var(--paper-1)',
  display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1.2,
  flexShrink: 0,
}
