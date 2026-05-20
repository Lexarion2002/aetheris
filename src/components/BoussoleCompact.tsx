// BoussoleCompact — Vue lecture seule des objectifs actifs, groupée par domaine.
// Réutilisable dans WeekView, TodayPage, SchedulePage. Lien direct vers chaque domaine.

import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useStore } from '../store'
import { expandDomains, STATIC_DOMAINS } from '../utils/standaloneDomains'
import { getDomainIcon } from '../utils/domainColors'
import { urgencyBucket, relativeDate, daysUntil } from '../utils/objectiveUtils'
import type { Objective } from '../types'

interface Props {
  /** Titre affiché. Défaut : "Objectifs." */
  title?: string
  /** Sous-titre/citation. Défaut : phrase générique. */
  subtitle?: string
  /** Espace au-dessus (px). Défaut : 56. */
  marginTop?: number
  /** Limite optionnelle d'objectifs par domaine (pour vues compactes). */
  maxPerDomain?: number
}

// Routes directes pour les domaines standalone (chemins dédiés du sidebar)
const STANDALONE_ROUTE: Record<string, string> = {
  sport:    '/sport',
  droit:    '/droit',
  ecriture: '/ecriture',
  musique:  '/musique',
  cabinet:  '/cabinet',
  cuisine:  '/cuisine',
  achats:   '/achats',
  films:    '/films',
  livres:   '/livres',
  finance:  '/finances',
  carriere: '/today', // pas de page dédiée — fallback vers Today
}

function CompactObjectiveRow({ obj }: { obj: Objective }) {
  const bucket    = urgencyBucket(obj.targetDate)
  const isOverdue = bucket === 'overdue'
  const days      = obj.targetDate ? daysUntil(obj.targetDate) : null
  const isCounter = obj.kind === 'counter'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'var(--paper-1)',
      border: `1px solid ${isOverdue ? '#DEB89C' : 'var(--paper-2)'}`,
      borderRadius: 10, padding: '9px 16px',
    }}>
      {/* Anneau de progression */}
      <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
        <svg width={28} height={28} style={{ display: 'block' }}>
          <circle cx={14} cy={14} r={11} fill="none" stroke="var(--paper-2)" strokeWidth={2.5} />
          <circle cx={14} cy={14} r={11} fill="none"
            stroke={isOverdue ? 'var(--terra)' : 'var(--sage)'}
            strokeWidth={2.5}
            strokeDasharray={`${(2 * Math.PI * 11 * Math.min(100, obj.progress) / 100).toFixed(2)} ${(2 * Math.PI * 11).toFixed(2)}`}
            strokeLinecap="round"
            transform="rotate(-90 14 14)"
            style={{ transition: 'stroke-dasharray 0.4s ease' }}
          />
        </svg>
        <span style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-3)',
        }}>
          {obj.progress}
        </span>
      </div>

      {/* Titre */}
      <span style={{
        flex: 1, fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {obj.title}
      </span>

      {/* Compteur */}
      {isCounter && obj.target != null && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>
          {obj.current ?? 0}&nbsp;/&nbsp;{obj.target}
        </span>
      )}

      {/* Date relative */}
      {obj.targetDate && days !== null && (
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 12, fontStyle: 'italic', flexShrink: 0,
          color: isOverdue ? 'var(--terra)' : days <= 7 ? '#B06000' : 'var(--ink-3)',
        }}>
          {relativeDate(obj.targetDate)}
        </span>
      )}
    </div>
  )
}

export function BoussoleCompact({
  title    = 'Objectifs',
  subtitle = 'Gère et construis tes objectifs depuis chaque domaine.',
  marginTop = 56,
  maxPerDomain,
}: Props) {
  const navigate   = useNavigate()
  const domains    = useStore(s => s.domains)
  const objectives = useStore(s => s.objectives)
  const allDomains = useMemo(() => expandDomains(domains), [domains])

  const groups = useMemo(() => {
    const active = objectives.filter(o => !o.archived && o.progress < 100)

    // Matching robuste : essayer match par ID direct, sinon par nom normalisé
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
    const domainByNorm = new Map<string, typeof allDomains[number]>()
    allDomains.forEach(d => {
      domainByNorm.set(d.id, d)
      domainByNorm.set(normalize(d.name), d)
    })
    // Aussi mapper STATIC_DOMAINS par nom normalisé pour les anciens IDs
    STATIC_DOMAINS.forEach(d => {
      if (!domainByNorm.has(d.id)) domainByNorm.set(d.id, d)
    })

    const map = new Map<string, { domain: typeof allDomains[number]; objs: Objective[] }>()
    active.forEach(o => {
      const matched = domainByNorm.get(o.domainId) ?? domainByNorm.get(normalize(o.domainId))
      if (!matched) return
      const key = matched.id
      if (!map.has(key)) map.set(key, { domain: matched, objs: [] })
      map.get(key)!.objs.push(o)
    })

    // Trier les objectifs de chaque domaine : en retard d'abord, puis par date
    map.forEach(g => {
      g.objs.sort((a, b) => {
        const ao = urgencyBucket(a.targetDate) === 'overdue' ? 0 : 1
        const bo = urgencyBucket(b.targetDate) === 'overdue' ? 0 : 1
        if (ao !== bo) return ao - bo
        if (a.targetDate && b.targetDate) return daysUntil(a.targetDate) - daysUntil(b.targetDate)
        return a.progress - b.progress
      })
      if (maxPerDomain) g.objs = g.objs.slice(0, maxPerDomain)
    })

    // Respecter l'ordre des domaines
    return allDomains
      .map(d => map.get(d.id))
      .filter((g): g is { domain: typeof allDomains[number]; objs: Objective[] } => !!g && g.objs.length > 0)
  }, [objectives, allDomains, maxPerDomain])

  if (groups.length === 0) return null

  return (
    <section style={{ marginTop, maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={labelStyle}>boussole</div>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {groups.map(({ domain, objs }) => {
          const Icon  = getDomainIcon(domain.name)
          const route = STANDALONE_ROUTE[domain.id] ?? `/domain/${domain.id}`
          return (
            <section key={domain.id}>

              {/* En-tête du domaine */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {Icon && <Icon size={16} style={{ color: 'var(--ink-3)' }} />}
                  <h3 style={{
                    fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500,
                    color: 'var(--ink)', margin: 0, lineHeight: 1.2,
                  }}>
                    {domain.name}
                  </h3>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                    {String(objs.length).padStart(2, '0')}
                  </span>
                </div>
                <span style={{ flex: 1, height: 1, background: 'var(--paper-2)', alignSelf: 'center' }} />
                <button
                  onClick={() => navigate(route)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)',
                    background: 'transparent', border: 0, cursor: 'pointer', padding: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
                >
                  Gérer dans le domaine <ArrowRight size={12} />
                </button>
              </div>

              {/* Objectifs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {objs.map(o => <CompactObjectiveRow key={o.id} obj={o} />)}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4,
}
