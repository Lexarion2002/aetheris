import { useState, useMemo, type CSSProperties } from 'react'
import { useStore } from '../store'
import { getDomainIcon } from '../utils/domainColors'
import { getDomainColor } from '../utils/analyticsUtils'
import { formatDuration, startOfCurrentWeek, startOfCurrentMonth } from '../utils/dateHelpers'
import type { Domain, Task } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'all'

interface DomainStats {
  domain:       Domain
  totalMinutes: number
  sessionCount: number
  avgFocus:     number
  tasks:        Set<string>
}

// ─── Tokens locaux ───────────────────────────────────────────────────────────

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink-3)',
}

const numStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

const focusLabel = (f: number) =>
  f >= 90 ? 'Excellent' : f >= 75 ? 'Bon' : f >= 60 ? 'Correct' : 'Distrait'

const focusColor = (f: number) =>
  f >= 90 ? 'var(--sage-deep)'
  : f >= 75 ? 'var(--sage)'
  : f >= 60 ? 'var(--terra)'
  : 'var(--ink-3)'

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: 'var(--paper-1)', border: '1px solid var(--paper-2)',
      borderRadius: 12, ...style,
    }}>
      {children}
    </div>
  )
}

function NoData({ children = "Aucune session enregistrée." }: { children?: React.ReactNode }) {
  return (
    <div style={{
      padding: '24px 8px', textAlign: 'center',
      fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14,
      color: 'var(--ink-3)',
    }}>
      {children}
    </div>
  )
}

interface KpiProps {
  label:  string
  value:  string
  suffix?: string
  accent?: string
}

function Kpi({ label, value, suffix, accent }: KpiProps) {
  return (
    <Card style={{ padding: '16px 18px 14px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 96 }}>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 32,
          color: accent ?? 'var(--ink)', letterSpacing: '-0.015em', lineHeight: 1,
        }}>{value}</span>
        {suffix && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-3)' }}>{suffix}</span>
        )}
      </div>
    </Card>
  )
}

// ─── FocusDashboard ───────────────────────────────────────────────────────────

export function FocusDashboard() {
  const domains      = useStore((s) => s.domains)
  const tasks        = useStore((s) => s.tasks)
  const timeSessions = useStore((s) => s.timeSessions)

  const [period, setPeriod] = useState<Period>('week')

  // ── Period filter ────────────────────────────────────────────────────────

  const cutoff = useMemo<Date | null>(() => {
    if (period === 'week')  return startOfCurrentWeek()
    if (period === 'month') return startOfCurrentMonth()
    return null
  }, [period])

  const filteredSessions = useMemo(() =>
    cutoff
      ? timeSessions.filter((s) => new Date(s.date) >= cutoff)
      : timeSessions,
    [timeSessions, cutoff])

  // ── Task index ───────────────────────────────────────────────────────────

  const taskById = useMemo(() => {
    const map = new Map<string, Task>()
    for (const t of tasks) map.set(t.id, t)
    return map
  }, [tasks])

  // ── Domain stats ─────────────────────────────────────────────────────────

  const domainStats = useMemo<DomainStats[]>(() => {
    const map = new Map<string, DomainStats>()

    for (const domain of domains) {
      map.set(domain.id, {
        domain,
        totalMinutes: 0,
        sessionCount: 0,
        avgFocus:     0,
        tasks:        new Set(),
      })
    }

    const focusSums: Record<string, number> = {}
    const focusCnts: Record<string, number> = {}

    for (const session of filteredSessions) {
      const task = taskById.get(session.taskId)
      if (!task) continue
      const stat = map.get(task.domainId)
      if (!stat) continue

      stat.totalMinutes += session.duration
      stat.sessionCount += 1
      stat.tasks.add(task.id)
      focusSums[task.domainId] = (focusSums[task.domainId] ?? 0) + session.focus
      focusCnts[task.domainId] = (focusCnts[task.domainId] ?? 0) + 1
    }

    for (const [domainId, stat] of map) {
      const cnt = focusCnts[domainId] ?? 0
      stat.avgFocus = cnt > 0 ? Math.round((focusSums[domainId] ?? 0) / cnt) : 0
    }

    return [...map.values()]
      .filter((s) => s.totalMinutes > 0)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
  }, [domains, filteredSessions, taskById])

  const maxMinutes = domainStats[0]?.totalMinutes ?? 1

  const totalMinutes  = filteredSessions.reduce((a, s) => a + s.duration, 0)
  const totalSessions = filteredSessions.length
  const globalAvgFocus = totalSessions > 0
    ? Math.round(filteredSessions.reduce((a, s) => a + s.focus, 0) / totalSessions)
    : 0

  // ── Recent sessions (last 20, newest first) ──────────────────────────────

  const recentSessions = useMemo(() => {
    return [...filteredSessions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
      .map((s) => {
        const task   = taskById.get(s.taskId)
        const domain = task ? domains.find((d) => d.id === task.domainId) : null
        return { session: s, task, domain }
      })
  }, [filteredSessions, taskById, domains])

  // ── Daily distribution (7 derniers jours si week, 30 si month) ───────────

  const dailyData = useMemo(() => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 7
    const result: { label: string; date: string; minutes: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().split('T')[0]
      const minutes = timeSessions
        .filter((s) => s.date === iso)
        .reduce((a, s) => a + s.duration, 0)
      result.push({
        label: i === 0 ? 'Auj.' : d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        date: iso,
        minutes,
      })
    }
    return result
  }, [timeSessions, period])

  const maxDayMinutes = Math.max(...dailyData.map((d) => d.minutes), 1)

  // ─── Render ───────────────────────────────────────────────────────────────

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'week',  label: 'Cette semaine' },
    { key: 'month', label: 'Ce mois' },
    { key: 'all',   label: 'Tout' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <span style={labelStyle}>focus</span>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 'clamp(28px, 3vw, 36px)',
            lineHeight: 1.1, letterSpacing: '-0.015em', color: 'var(--ink)', marginTop: 6,
          }}>
            Suivi du focus
          </h2>
          <p style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15,
            color: 'var(--ink-3)', marginTop: 6,
          }}>
            Analyse de tes sessions de concentration.
          </p>
        </div>

        {/* Period selector */}
        <div style={{
          display: 'inline-flex', background: 'var(--paper-1)',
          border: '1px solid var(--paper-2)', borderRadius: 999, padding: 3,
        }}>
          {PERIODS.map((p) => {
            const active = period === p.key
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 12.5,
                  padding: '6px 14px', borderRadius: 999, border: 'none',
                  cursor: 'pointer',
                  background: active ? 'var(--paper-3)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  fontWeight: active ? 600 : 400,
                  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* ── Global stats ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <Kpi
          label="temps · total"
          value={totalMinutes > 0 ? formatDuration(totalMinutes) : '—'}
        />
        <Kpi
          label="sessions"
          value={totalSessions > 0 ? String(totalSessions) : '—'}
        />
        <Kpi
          label="focus moyen"
          value={globalAvgFocus > 0 ? String(globalAvgFocus) : '—'}
          suffix={globalAvgFocus > 0 ? '%' : undefined}
          accent={globalAvgFocus > 0 ? focusColor(globalAvgFocus) : undefined}
        />
        <Kpi
          label="domaines actifs"
          value={domainStats.length > 0 ? String(domainStats.length) : '—'}
        />
      </div>

      {/* ── Layout : graphe journalier + répartition par domaine ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Daily bar chart */}
        <Card style={{ padding: '22px 24px' }}>
          <span style={labelStyle}>activité · jour par jour</span>
          <h3 style={{
            fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500,
            color: 'var(--ink)', marginTop: 4,
          }}>
            Le rythme de ta semaine.
          </h3>

          {totalMinutes === 0 ? (
            <NoData />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 128, marginTop: 18 }}>
              {dailyData.map((day) => {
                const height = day.minutes > 0
                  ? Math.max(4, Math.round((day.minutes / maxDayMinutes) * 100))
                  : 0
                const isToday = day.date === new Date().toISOString().split('T')[0]
                return (
                  <div key={day.date} style={{
                    position: 'relative', flex: 1,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}
                  className="focus-day"
                  title={day.minutes > 0 ? formatDuration(day.minutes) : ''}
                  >
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{
                        width: '100%',
                        borderRadius: '4px 4px 0 0',
                        height: day.minutes > 0 ? `${height}%` : 4,
                        background: day.minutes > 0
                          ? isToday ? 'var(--terra)' : 'var(--ink-4)'
                          : 'var(--paper-2)',
                        transition: 'background var(--dur) var(--ease)',
                      }} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10.5,
                      letterSpacing: '0.04em',
                      color: isToday ? 'var(--terra)' : 'var(--ink-3)',
                      fontWeight: isToday ? 600 : 400,
                    }}>
                      {day.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Domain distribution */}
        <Card style={{ padding: '22px 24px' }}>
          <span style={labelStyle}>répartition · par domaine</span>
          <h3 style={{
            fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500,
            color: 'var(--ink)', marginTop: 4,
          }}>
            Où s'est posée ton attention.
          </h3>

          {domainStats.length === 0 ? (
            <NoData />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
              {domainStats.map(({ domain, totalMinutes: mins, sessionCount, avgFocus }) => {
                const color = getDomainColor(domain.color)
                const DomainIcon = getDomainIcon(domain.name)
                const pct = Math.round((mins / maxMinutes) * 100)
                return (
                  <div key={domain.id}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 8, marginBottom: 5,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {DomainIcon
                          ? <DomainIcon size={13} style={{ color }} />
                          : <span style={{ fontSize: 12 }}>{domain.icon}</span>}
                        <span style={{
                          fontFamily: 'var(--font-sans)', fontSize: 13,
                          color: 'var(--ink)', fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{domain.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0, fontSize: 12 }}>
                        <span style={{ ...numStyle, color, fontWeight: 600 }}>{formatDuration(mins)}</span>
                        <span style={{ color: 'var(--ink-4)' }}>·</span>
                        <span style={{ ...numStyle, color: 'var(--ink-3)' }}>{sessionCount} sess.</span>
                        {avgFocus > 0 && (
                          <>
                            <span style={{ color: 'var(--ink-4)' }}>·</span>
                            <span style={{ ...numStyle, color: focusColor(avgFocus) }}>{avgFocus}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{
                      height: 6, width: '100%', borderRadius: 999,
                      background: 'var(--paper-2)', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, background: color,
                        borderRadius: 999, transition: 'width 500ms var(--ease)',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Domain stats table ──────────────────────────────────────────── */}
      {domainStats.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{
            borderBottom: '1px solid var(--paper-2)',
            padding: '16px 22px',
          }}>
            <span style={labelStyle}>statistiques · par domaine</span>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500,
              color: 'var(--ink)', marginTop: 4,
            }}>
              Le détail, ligne à ligne.
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--paper-2)' }}>
                  {['Domaine', 'Temps', 'Sessions', 'Tâches', 'Focus moyen', 'Niveau'].map((h) => (
                    <th key={h} style={{
                      ...labelStyle, padding: '10px 18px', textAlign: 'left', fontWeight: 400,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domainStats.map(({ domain, totalMinutes: mins, sessionCount, tasks: taskSet, avgFocus }) => {
                  const color = getDomainColor(domain.color)
                  const DomainIcon = getDomainIcon(domain.name)
                  return (
                    <tr key={domain.id} style={{ borderBottom: '1px solid var(--paper-2)' }}>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {DomainIcon
                            ? <DomainIcon size={15} style={{ color }} />
                            : <span style={{ fontSize: 14 }}>{domain.icon}</span>}
                          <span style={{ fontWeight: 500, color }}>{domain.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', ...numStyle, color: 'var(--ink)', fontWeight: 500 }}>
                        {formatDuration(mins)}
                      </td>
                      <td style={{ padding: '12px 18px', ...numStyle, color: 'var(--ink-2)' }}>{sessionCount}</td>
                      <td style={{ padding: '12px 18px', ...numStyle, color: 'var(--ink-2)' }}>{taskSet.size}</td>
                      <td style={{ padding: '12px 18px' }}>
                        {avgFocus > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              height: 6, width: 72, borderRadius: 999,
                              background: 'var(--paper-2)', overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%', width: `${avgFocus}%`,
                                background: focusColor(avgFocus), borderRadius: 999,
                              }} />
                            </div>
                            <span style={{ ...numStyle, fontSize: 12, color: focusColor(avgFocus) }}>
                              {avgFocus}%
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ink-3)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{
                          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                          fontSize: 13, color: focusColor(avgFocus),
                        }}>
                          {avgFocus > 0 ? focusLabel(avgFocus) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Recent sessions ─────────────────────────────────────────────── */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{
          borderBottom: '1px solid var(--paper-2)',
          padding: '16px 22px',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <span style={labelStyle}>dernières sessions</span>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500,
              color: 'var(--ink)', marginTop: 4,
            }}>
              Ce que tu viens de poser.
            </h3>
          </div>
          {recentSessions.length > 0 && (
            <span style={{
              ...numStyle, fontSize: 11, color: 'var(--ink-3)',
              letterSpacing: '0.04em',
            }}>
              {recentSessions.length} affichée{recentSessions.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {recentSessions.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15,
              color: 'var(--ink-3)', margin: 0,
            }}>
              Aucune session enregistrée pour cette période.
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 12.5,
              color: 'var(--ink-3)', marginTop: 6,
            }}>
              Lance le timer Focus pour commencer à tracker ton temps.
            </p>
          </div>
        ) : (
          <div>
            {recentSessions.map(({ session, task, domain }, idx) => {
              const color = domain ? getDomainColor(domain.color) : 'var(--ink-3)'
              const DomainIcon = domain ? getDomainIcon(domain.name) : null
              return (
                <div key={session.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 22px',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--paper-2)',
                }}>
                  {/* Domain icon */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 34, height: 34, borderRadius: 8,
                    background: 'var(--paper-2)', flexShrink: 0,
                  }}>
                    {DomainIcon
                      ? <DomainIcon size={16} style={{ color }} />
                      : <span style={{ fontSize: 15 }}>{domain?.icon ?? '·'}</span>}
                  </div>

                  {/* Info */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                      color: 'var(--ink)', lineHeight: 1.3, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task?.title ?? (
                        <span style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>Tâche supprimée</span>
                      )}
                    </p>
                    <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      {domain && (
                        <span style={{ color }}>{domain.name}</span>
                      )}
                      {domain && <span style={{ color: 'var(--ink-4)' }}>·</span>}
                      <span style={{ color: 'var(--ink-3)' }}>{fmtDate(session.date)}</span>
                    </div>
                  </div>

                  {/* Duration + focus */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p style={{
                      fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500,
                      color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em',
                    }}>
                      {formatDuration(session.duration)}
                    </p>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <div style={{
                        height: 4, width: 52, borderRadius: 999,
                        background: 'var(--paper-2)', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${session.focus}%`,
                          background: focusColor(session.focus), borderRadius: 999,
                        }} />
                      </div>
                      <span style={{ ...numStyle, fontSize: 10.5, color: focusColor(session.focus) }}>
                        {session.focus}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
