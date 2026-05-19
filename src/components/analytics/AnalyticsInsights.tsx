import { useMemo, type CSSProperties } from 'react'
import { Feather } from 'lucide-react'
import { useStore } from '../../store'
import {
  getDomainColor, getWeekBounds, deltaPct, mondayBasedDayIndex,
  fmtH,
} from '../../utils/analyticsUtils'
import { HourStrip, Sparkline } from './charts'
import type { Domain, Task, TimeSession, Transaction } from '../../types'

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink-3)',
}

const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// ─── Types ───────────────────────────────────────────────────────────────────

interface Insight {
  label: string
  body:  string
  chart?: 'busiestDay' | 'trendSpark' | null
  chartData?: { hours?: number[]; hoursMax?: number; sparkValues?: number[]; sparkColor?: string }
}

// ─── Calcul des insights ─────────────────────────────────────────────────────

function buildInsights(
  bounds: { start: Date; end: Date },
  prevBounds: { start: Date; end: Date },
  domains: Domain[],
  tasks: Task[],
  timeSessions: TimeSession[],
  transactions: Transaction[],
): Insight[] {
  const insights: Insight[] = []

  // ── Sessions de la semaine + précédente
  const sessionsInWeek = timeSessions.filter((s) => {
    const d = new Date(s.date + 'T12:00:00')
    return d >= bounds.start && d <= bounds.end
  })
  const sessionsInPrev = timeSessions.filter((s) => {
    const d = new Date(s.date + 'T12:00:00')
    return d >= prevBounds.start && d <= prevBounds.end
  })

  // ── Insight 1 : rythme — jour le plus dense + histogramme horaire ────────
  if (sessionsInWeek.length > 0) {
    const focusByDay = [0, 0, 0, 0, 0, 0, 0]
    for (const s of sessionsInWeek) {
      const d = new Date(s.date + 'T12:00:00')
      focusByDay[mondayBasedDayIndex(d)] += (s.duration ?? 0) / 60
    }
    const peakDayIdx = focusByDay.indexOf(Math.max(...focusByDay))
    const peakHours = focusByDay[peakDayIdx]
    if (peakHours > 0.5) {
      // Histogramme horaire pour ce jour (06h-22h, 17 buckets)
      const hourHistogram = new Array(17).fill(0)
      let hourMax = 0
      for (const s of sessionsInWeek) {
        if (!s.createdAt) continue
        const dt = new Date(s.createdAt)
        if (mondayBasedDayIndex(dt) !== peakDayIdx) continue
        const h = dt.getHours()
        if (h < 6 || h > 22) continue
        const idx = h - 6
        hourHistogram[idx] += (s.duration ?? 0) / 60
        if (hourHistogram[idx] > hourMax) hourMax = hourHistogram[idx]
      }
      insights.push({
        label: 'rythme',
        body: `${capitalize(DAY_NAMES[peakDayIdx])} a été ta journée la plus dense — ${fmtH(peakHours)} de focus${hourMax > 0 ? ', réparties surtout dans les heures du matin' : ''}.`,
        chart: hourMax > 0 ? 'busiestDay' : null,
        chartData: { hours: hourHistogram, hoursMax: hourMax },
      })
    }
  }

  // ── Insight 2 : oubli — domaine sans session depuis > 7 jours ────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const neglected: Array<{ domain: Domain; days: number | null }> = []
  for (const d of domains) {
    const taskIds = new Set(tasks.filter((t) => t.domainId === d.id).map((t) => t.id))
    let lastDate: Date | null = null
    for (const s of timeSessions) {
      if (!taskIds.has(s.taskId)) continue
      const sd = new Date(s.date + 'T12:00:00')
      if (!lastDate || sd > lastDate) lastDate = sd
    }
    const days = lastDate ? Math.round((today.getTime() - lastDate.getTime()) / 86400000) : null
    if (days === null || days > 7) neglected.push({ domain: d, days })
  }
  if (neglected.length > 0) {
    const first = neglected[0]
    const text = first.days === null
      ? `Tu n'as encore rien posé sur ${first.domain.name}. Si l'envie revient, c'est là.`
      : `Tu n'as pas ouvert ${first.domain.name} depuis ${first.days} jours. Pas grave en soi.`
    insights.push({ label: 'oubli doux', body: text, chart: null })
  }

  // ── Insight 3 : tendance — domaine avec la plus forte progression ────────
  if (sessionsInWeek.length > 0 && sessionsInPrev.length > 0) {
    const focusCurrent: Record<string, number> = {}
    const focusPrev: Record<string, number> = {}
    for (const s of sessionsInWeek) {
      const t = tasks.find((t) => t.id === s.taskId)
      if (!t) continue
      focusCurrent[t.domainId] = (focusCurrent[t.domainId] ?? 0) + (s.duration ?? 0) / 60
    }
    for (const s of sessionsInPrev) {
      const t = tasks.find((t) => t.id === s.taskId)
      if (!t) continue
      focusPrev[t.domainId] = (focusPrev[t.domainId] ?? 0) + (s.duration ?? 0) / 60
    }
    let bestDomainId: string | null = null
    let bestDelta = 0
    for (const [domainId, current] of Object.entries(focusCurrent)) {
      const prev = focusPrev[domainId] ?? 0
      if (prev === 0 && current > 1) {
        if (current > bestDelta) {
          bestDelta = current
          bestDomainId = domainId
        }
      } else if (prev > 0) {
        const d = deltaPct(current, prev) ?? 0
        if (d > 30 && d > bestDelta) {
          bestDelta = d
          bestDomainId = domainId
        }
      }
    }
    if (bestDomainId) {
      const domain = domains.find((d) => d.id === bestDomainId)
      if (domain) {
        const prev = focusPrev[bestDomainId] ?? 0
        const text = prev === 0
          ? `${domain.name} revient. Première session de la semaine — c'est un nouveau départ.`
          : `${domain.name} reprend du terrain. ${fmtH(focusCurrent[bestDomainId])} cette semaine, ${fmtH(prev)} la semaine dernière.`
        insights.push({ label: 'tendance', body: text, chart: null })
      }
    }
  }

  // ── Insight 4 : finances — variation des dépenses ────────────────────────
  const spendCurrent = transactions
    .filter((t) => t.type === 'expense')
    .filter((t) => {
      const d = new Date(t.date + 'T12:00:00')
      return d >= bounds.start && d <= bounds.end
    })
    .reduce((s, t) => s + t.amount, 0)
  const spendPrev = transactions
    .filter((t) => t.type === 'expense')
    .filter((t) => {
      const d = new Date(t.date + 'T12:00:00')
      return d >= prevBounds.start && d <= prevBounds.end
    })
    .reduce((s, t) => s + t.amount, 0)
  if (spendCurrent > 0 && spendPrev > 0) {
    const delta = spendCurrent - spendPrev
    if (Math.abs(delta) > 20) {
      const direction = delta < 0 ? 'en baisse' : 'en hausse'
      const text = `Dépenses ${direction} — ${Math.abs(delta).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} € ${delta < 0 ? 'de moins' : 'de plus'} que la semaine passée.`
      // Construire un sparkline sur les 5 dernières semaines
      const weekTotals: number[] = []
      for (let i = 4; i >= 0; i--) {
        const w = getWeekBounds(-i)
        const total = transactions
          .filter((t) => t.type === 'expense')
          .filter((t) => {
            const d = new Date(t.date + 'T12:00:00')
            return d >= w.start && d <= w.end
          })
          .reduce((s, t) => s + t.amount, 0)
        weekTotals.push(total)
      }
      insights.push({
        label: 'finances',
        body: text,
        chart: 'trendSpark',
        chartData: { sparkValues: weekTotals, sparkColor: 'var(--ink-2)' },
      })
    }
  }

  // ── Insight 5 : créneau de lecture (domaine "Livres") ────────────────────
  const booksDomain = domains.find((d) => d.name.toLowerCase().includes('livre'))
  if (booksDomain) {
    const bookTaskIds = new Set(tasks.filter((t) => t.domainId === booksDomain.id).map((t) => t.id))
    const bookSessions = timeSessions.filter((s) => bookTaskIds.has(s.taskId))
    if (bookSessions.length >= 3) {
      // Compte par jour de la semaine
      const dayCounts = [0, 0, 0, 0, 0, 0, 0]
      for (const s of bookSessions) {
        if (!s.createdAt) continue
        dayCounts[mondayBasedDayIndex(new Date(s.createdAt))] += 1
      }
      const bestDay = dayCounts.indexOf(Math.max(...dayCounts))
      insights.push({
        label: 'lecture',
        body: `Tu lis surtout le ${DAY_NAMES[bestDay]}. ${bookSessions.length} sessions enregistrées au total.`,
        chart: null,
      })
    }
  }

  return insights
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Composants UI ───────────────────────────────────────────────────────────

function InsightChart({ insight }: { insight: Insight }) {
  if (insight.chart === 'busiestDay' && insight.chartData?.hours) {
    return (
      <div style={{ marginTop: 14 }}>
        <span style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>06 h → 22 h</span>
        <HourStrip
          hours={insight.chartData.hours}
          max={insight.chartData.hoursMax || 1}
          color="var(--terra)"
        />
      </div>
    )
  }
  if (insight.chart === 'trendSpark' && insight.chartData?.sparkValues) {
    return (
      <div style={{ marginTop: 14, maxWidth: 360 }}>
        <span style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>
          cinq dernières semaines
        </span>
        <Sparkline
          values={insight.chartData.sparkValues}
          color={insight.chartData.sparkColor ?? 'var(--ink-2)'}
          width={360}
          height={48}
        />
      </div>
    )
  }
  return null
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  return (
    <article style={{
      background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
      borderRadius: 12, padding: '24px 26px',
      display: 'flex', gap: 24, alignItems: 'flex-start',
    }}>
      <div style={{ flexShrink: 0, paddingTop: 4, minWidth: 56 }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: 28, fontWeight: 500, color: 'var(--terra)', letterSpacing: '-0.01em',
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ ...labelStyle, color: 'var(--ink-3)' }}>{insight.label}</span>
        <p style={{
          fontFamily: 'var(--font-serif)', fontSize: 19, lineHeight: 1.45,
          color: 'var(--ink)', margin: '8px 0 0', maxWidth: '52ch',
          letterSpacing: '-0.005em',
        }}>
          {insight.body}
        </p>
        <InsightChart insight={insight} />
      </div>
    </article>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

interface Props {
  weekOffset: number
}

export function AnalyticsInsights({ weekOffset }: Props) {
  const domains      = useStore((s) => s.domains)
  const tasks        = useStore((s) => s.tasks)
  const timeSessions = useStore((s) => s.timeSessions)
  const transactions = useStore((s) => s.transactions)

  const bounds     = useMemo(() => getWeekBounds(weekOffset), [weekOffset])
  const prevBounds = useMemo(() => getWeekBounds(weekOffset - 1), [weekOffset])

  const insights = useMemo(
    () => buildInsights(bounds, prevBounds, domains, tasks, timeSessions, transactions),
    [bounds, prevBounds, domains, tasks, timeSessions, transactions],
  )

  // Mémoiser : récupère la première session du domaine livres pour la couleur
  void getDomainColor

  if (insights.length < 3) {
    return (
      <div style={{ padding: '60px 0', maxWidth: 540, margin: '40px auto', textAlign: 'center' }}>
        <Feather size={28} style={{ color: 'var(--ink-3)', marginBottom: 14 }} />
        <p style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 20,
          color: 'var(--ink-2)', lineHeight: 1.5, margin: 0, maxWidth: '40ch', marginInline: 'auto',
        }}>
          Pas encore assez à observer. Reviens dans quelques jours — les premières remarques arrivent quand tu as tenu une semaine pleine.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{
        padding: '22px 28px', background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)', borderRadius: 12,
      }}>
        <span style={labelStyle}>relevé · de la semaine</span>
        <h3 style={{
          fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, color: 'var(--ink)',
          marginTop: 6, letterSpacing: '-0.01em', lineHeight: 1.25,
        }}>
          {insights.length} observation{insights.length > 1 ? 's' : ''}, prise{insights.length > 1 ? 's' : ''} au calme.
        </h3>
        <p style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15.5,
          color: 'var(--ink-2)', margin: '8px 0 0', maxWidth: '60ch', lineHeight: 1.5,
        }}>
          Rien à corriger d'urgence — juste des choses que les chiffres révèlent et qu'on n'aurait pas remarquées sans eux.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {insights.map((ins, i) => (
          <InsightCard key={ins.label + i} insight={ins} index={i} />
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
        <p style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14.5,
          color: 'var(--ink-3)', margin: 0, lineHeight: 1.5,
        }}>
          Ces relevés ne sont jamais partagés sans toi. — Aetheris
        </p>
      </div>
    </div>
  )
}
