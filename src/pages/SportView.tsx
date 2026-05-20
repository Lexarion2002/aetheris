import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Plus, Dumbbell, Footprints, X, Check, ChevronRight } from 'lucide-react'
import { DomainObjectivesSection } from '../components/DomainObjectivesSection'
import type { MuscuSession, Run, SportGoal, Exercise, Split } from '../types/sport'

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_MUSCU = 'aetheris-sport-muscu-v1'
const LS_RUNS  = 'aetheris-sport-runs-v1'
const LS_GOALS = 'aetheris-sport-goals-v1'

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

// ─── Date / week helpers ──────────────────────────────────────────────────────

function fmtDateFr(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function fmtDateShort(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function currentMonthStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function isoWeek(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const diff = d.getTime() - startOfWeek1.getTime()
  const week = Math.floor(diff / 604800000) + 1
  return `S${week}`
}

function getLast6Months(): { key: string; label: string }[] {
  const MONTHS = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.']
  const result: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MONTHS[d.getMonth()],
    })
  }
  return result
}

// ─── Chart computation helpers ────────────────────────────────────────────────

function computeMuscuVolume(sessions: MuscuSession[]): Record<string, { m: string; v: number }[]> {
  const months = getLast6Months()
  const exNames = Array.from(new Set(sessions.flatMap((s) => s.exercises.map((e) => e.name))))
  const result: Record<string, { m: string; v: number }[]> = {}
  for (const name of exNames) {
    result[name] = months.map(({ key, label }) => {
      const monthSessions = sessions.filter((s) => s.date.startsWith(key))
      const v = monthSessions.reduce((sum, s) => {
        const ex = s.exercises.find((e) => e.name === name)
        if (!ex) return sum
        const m = ex.sets.match(/(\d+)\s*[×x]\s*(\d+)/)
        return sum + (m ? parseInt(m[1]) * parseInt(m[2]) : 1)
      }, 0)
      return { m: label, v }
    })
  }
  return result
}

function paceToDecimal(p: string): number {
  const parts = p.split(':').map(Number)
  return (parts[0] ?? 0) + (parts[1] ?? 0) / 60
}

function paceToSec(p: string): number {
  const parts = p.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}

function computeCourseWeekly(runs: Run[]): { w: string; km: number; pace: number }[] {
  const weeks: string[] = []
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i * 7)
    weeks.push(isoWeek(d.toISOString().split('T')[0]))
  }
  const uniqueWeeks = [...new Set(weeks)]
  return uniqueWeeks
    .map((w) => {
      const weekRuns = runs.filter((r) => isoWeek(r.date) === w)
      const km = weekRuns.reduce((s, r) => s + r.distance, 0)
      const avgPace =
        weekRuns.length > 0
          ? weekRuns.reduce((s, r) => s + paceToDecimal(r.pace), 0) / weekRuns.length
          : 0
      return { w, km: Math.round(km * 10) / 10, pace: Math.round(avgPace * 100) / 100 }
    })
    .filter((d) => d.km > 0 || d.pace > 0)
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const primaryBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  fontSize: 14,
  padding: '8px 16px',
  borderRadius: 8,
  border: 0,
  background: 'var(--terra)',
  color: 'var(--paper-1)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
}

const secondaryBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 400,
  fontSize: 14,
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid var(--ink-4)',
  background: 'transparent',
  color: 'var(--ink)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: '1px solid var(--ink-4)',
  borderRadius: 8,
  padding: '8px 12px',
  outline: 'none',
}

// ─── Label component ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
      }}
    >
      {children}
    </span>
  )
}

// ─── SportSwitch ──────────────────────────────────────────────────────────────

function SportSwitch({
  value,
  onChange,
}: {
  value: 'muscu' | 'course'
  onChange: (v: 'muscu' | 'course') => void
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
        borderRadius: 999,
        padding: 3,
        gap: 2,
      }}
    >
      {(['muscu', 'course'] as const).map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 999,
            border: 0,
            background: value === s ? 'var(--paper-3)' : 'transparent',
            color: value === s ? 'var(--ink)' : 'var(--ink-3)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: value === s ? 500 : 400,
            cursor: 'pointer',
            transition: 'background 150ms, color 150ms',
          }}
        >
          {s === 'muscu' ? <Dumbbell size={13} /> : <Footprints size={13} />}
          {s === 'muscu' ? 'Musculation' : 'Course'}
        </button>
      ))}
    </div>
  )
}

// ─── BandeauStat ──────────────────────────────────────────────────────────────

function BandeauStat({
  label,
  value,
  sub,
  last,
}: {
  label: string
  value: string
  sub: string
  last?: boolean
}) {
  return (
    <div
      style={{
        padding: '18px 22px',
        borderRight: last ? 'none' : '1px solid var(--paper-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </span>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 500,
          color: 'var(--ink)',
          lineHeight: 1.15,
          letterSpacing: '-0.005em',
        }}
      >
        {value}
      </div>
      {sub && (
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--ink-2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </span>
      )}
    </div>
  )
}

// ─── MuscuCard ────────────────────────────────────────────────────────────────

function MuscuCard({
  session,
  idx,
  onClick,
}: {
  session: MuscuSession
  idx: number
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
        borderRadius: 12,
        padding: '18px 20px',
        cursor: 'pointer',
        animation: `sportCardEnter 300ms var(--ease) both`,
        animationDelay: `${idx * 35}ms`,
        transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--ink-4)'
        el.style.boxShadow = 'var(--shadow-2)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--paper-2)'
        el.style.boxShadow = 'none'
        el.style.transform = 'none'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
          }}
        >
          {fmtDateShort(session.date)} · {session.duration}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--ink-3)',
          }}
        >
          {fmtDateFr(session.date)}
        </span>
      </div>
      {/* Title */}
      <h3
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 20,
          fontWeight: 500,
          color: 'var(--ink)',
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}
      >
        {session.title}
      </h3>
      {/* Exercises */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {session.exercises.slice(0, 4).map((ex, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-sans)',
              fontSize: 13.5,
              color: 'var(--ink-2)',
            }}
          >
            <span style={{ color: 'var(--terra)', fontSize: 10 }}>●</span>
            <span style={{ flex: 1 }}>{ex.name}</span>
            {ex.iso && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--sage-deep)',
                  background: 'var(--sage-soft)',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                iso
              </span>
            )}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--ink-3)',
              }}
            >
              {ex.sets}
            </span>
          </li>
        ))}
        {session.exercises.length > 4 && (
          <li
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--ink-3)',
              marginTop: 2,
            }}
          >
            +{session.exercises.length - 4} exercices
          </li>
        )}
      </ul>
      {/* Note */}
      {session.note && (
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--ink-3)',
            margin: '10px 0 0',
            lineHeight: 1.4,
          }}
        >
          {session.note}
        </p>
      )}
      {/* Chevron */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          right: 16,
          color: 'var(--ink-4)',
        }}
      >
        <ChevronRight size={15} />
      </div>
    </div>
  )
}

// ─── RunStat ──────────────────────────────────────────────────────────────────

function RunStat({ label, num, unit }: { label: string; num: string; unit?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
        }}
      >
        {num}
        {unit && (
          <span
            style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 3 }}
          >
            {unit}
          </span>
        )}
      </span>
    </div>
  )
}

// ─── RunCard ─────────────────────────────────────────────────────────────────

function RunCard({ run, idx, onClick }: { run: Run; idx: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'var(--paper-1)',
        border: '1px solid var(--paper-2)',
        borderRadius: 12,
        padding: '18px 20px',
        cursor: 'pointer',
        animation: `sportCardEnter 300ms var(--ease) both`,
        animationDelay: `${idx * 35}ms`,
        transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--ink-4)'
        el.style.boxShadow = 'var(--shadow-2)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--paper-2)'
        el.style.boxShadow = 'none'
        el.style.transform = 'none'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
          }}
        >
          {fmtDateShort(run.date)} · {run.duration}
        </span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>
          {fmtDateFr(run.date)}
        </span>
      </div>
      {/* Title */}
      <h3
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 20,
          fontWeight: 500,
          color: 'var(--ink)',
          margin: '0 0 14px',
          lineHeight: 1.2,
        }}
      >
        {run.title}
      </h3>
      {/* Metrics row */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
        <RunStat label="Distance" num={run.distance.toString()} unit="km" />
        <div style={{ width: 1, height: 28, background: 'var(--paper-2)', alignSelf: 'center' }} />
        <RunStat label="Allure" num={run.pace} unit="/km" />
        {run.elevation != null && (
          <>
            <div style={{ width: 1, height: 28, background: 'var(--paper-2)', alignSelf: 'center' }} />
            <RunStat label="Dénivelé" num={`+${run.elevation}`} unit="m" />
          </>
        )}
      </div>
      {/* Note */}
      {run.note && (
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--ink-3)',
            margin: '10px 0 0',
            lineHeight: 1.4,
          }}
        >
          {run.note}
        </p>
      )}
      {/* Chevron */}
      <div style={{ position: 'absolute', top: 18, right: 16, color: 'var(--ink-4)' }}>
        <ChevronRight size={15} />
      </div>
    </div>
  )
}

// ─── LineChart ────────────────────────────────────────────────────────────────

function LineChart({ data, label }: { data: { m: string; v: number }[]; label: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; d: { m: string; v: number } } | null>(null)

  const width = 560
  const height = 180
  const padL = 44
  const padR = 20
  const padT = 16
  const padB = 28

  const maxV = Math.max(...data.map((d) => d.v), 1)

  const pts = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * (width - padL - padR),
    y: padT + (1 - d.v / maxV) * (height - padT - padB),
    d,
  }))

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const polyArea = [
    `${pts[0].x},${height - padB}`,
    ...pts.map((p) => `${p.x},${p.y}`),
    `${pts[pts.length - 1].x},${height - padB}`,
  ].join(' ')

  const yGrids = [0.25, 0.5, 0.75, 1].map((f) => ({
    y: padT + (1 - f) * (height - padT - padB),
    v: Math.round(maxV * f),
  }))

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * width
      let closest = pts[0]
      let minDist = Infinity
      for (const p of pts) {
        const d = Math.abs(p.x - mx)
        if (d < minDist) { minDist = d; closest = p }
      }
      setHover({ x: closest.x, y: closest.y, d: closest.d })
    },
    [pts],
  )

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid */}
        {yGrids.map((g) => (
          <g key={g.y}>
            <line
              x1={padL}
              y1={g.y}
              x2={width - padR}
              y2={g.y}
              stroke="var(--paper-2)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={padL - 6}
              y={g.y + 4}
              textAnchor="end"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fill: 'var(--ink-3)',
              }}
            >
              {g.v}
            </text>
          </g>
        ))}
        {/* Base line */}
        <line
          x1={padL}
          y1={height - padB}
          x2={width - padR}
          y2={height - padB}
          stroke="var(--paper-2)"
          strokeWidth={1}
        />

        {/* Area */}
        <polygon
          points={polyArea}
          fill="var(--terra)"
          opacity={0.13}
        />
        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--terra)"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Points */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hover?.d === p.d ? 5 : i === pts.length - 1 ? 4 : 2.75}
            fill={hover?.d === p.d ? 'var(--terra-deep)' : 'var(--terra)'}
            stroke="var(--paper-1)"
            strokeWidth={1.5}
          />
        ))}
        {/* X labels */}
        {pts.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 6}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--ink-3)' }}
          >
            {p.d.m}
          </text>
        ))}
        {/* Tooltip */}
        {hover && (
          <g>
            <rect
              x={hover.x - 38}
              y={hover.y - 32}
              width={76}
              height={24}
              rx={5}
              fill="var(--ink)"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }}
            />
            <text
              x={hover.x}
              y={hover.y - 15}
              textAnchor="middle"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--paper-1)' }}
            >
              {label}: {hover.d.v}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

// ─── DualChart ────────────────────────────────────────────────────────────────

function DualChart({ data }: { data: { w: string; km: number; pace: number }[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const width = 560
  const height = 200
  const padL = 44
  const padR = 44
  const padT = 24
  const padB = 28

  const maxKm = Math.max(...data.map((d) => d.km), 1)
  const paces = data.filter((d) => d.pace > 0).map((d) => d.pace)
  const minPace = paces.length ? Math.min(...paces) : 4
  const maxPace = paces.length ? Math.max(...paces) : 6

  const xOf = (i: number) =>
    padL + (i / Math.max(data.length - 1, 1)) * (width - padL - padR)
  const yKm = (km: number) =>
    padT + (1 - km / maxKm) * (height - padT - padB)
  const yPace = (pace: number) => {
    if (maxPace === minPace) return padT + (height - padT - padB) / 2
    return padT + ((pace - minPace) / (maxPace - minPace)) * (height - padT - padB)
  }

  const kmPts = data.map((d, i) => ({ x: xOf(i), y: yKm(d.km), d }))
  const pacePts = data.filter((d) => d.pace > 0).map((d, idx) => {
    const i = data.indexOf(d)
    return { x: xOf(i), y: yPace(d.pace), d, idx }
  })

  const kmPolyline = kmPts.map((p) => `${p.x},${p.y}`).join(' ')
  const kmArea = [
    `${kmPts[0].x},${height - padB}`,
    ...kmPts.map((p) => `${p.x},${p.y}`),
    `${kmPts[kmPts.length - 1].x},${height - padB}`,
  ].join(' ')
  const pacePolyline = pacePts.map((p) => `${p.x},${p.y}`).join(' ')

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * width
      let closest = 0
      let minDist = Infinity
      kmPts.forEach((p, i) => {
        const dist = Math.abs(p.x - mx)
        if (dist < minDist) { minDist = dist; closest = i }
      })
      setHover(closest)
    },
    [kmPts],
  )

  const formatPaceDecimal = (p: number): string => {
    const min = Math.floor(p)
    const sec = Math.round((p - min) * 60)
    return `${min}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Axis labels */}
        <text
          x={padL}
          y={14}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--terra)' }}
        >
          km
        </text>
        <text
          x={width - padR}
          y={14}
          textAnchor="end"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--sage-deep)' }}
        >
          min/km
        </text>
        {/* Base line */}
        <line
          x1={padL}
          y1={height - padB}
          x2={width - padR}
          y2={height - padB}
          stroke="var(--paper-2)"
          strokeWidth={1}
        />
        {/* Gridlines */}
        {[0.25, 0.5, 0.75].map((f) => {
          const y = padT + f * (height - padT - padB)
          return (
            <line
              key={f}
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke="var(--paper-2)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )
        })}
        {/* km area */}
        <polygon points={kmArea} fill="var(--terra)" opacity={0.12} />
        {/* km line */}
        <polyline
          points={kmPolyline}
          fill="none"
          stroke="var(--terra)"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* pace line */}
        {pacePts.length > 1 && (
          <polyline
            points={pacePolyline}
            fill="none"
            stroke="var(--sage-deep)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {/* km points */}
        {kmPts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hover === i ? 5 : i === kmPts.length - 1 ? 4 : 2.75}
            fill={hover === i ? 'var(--terra-deep)' : 'var(--terra)'}
            stroke="var(--paper-1)"
            strokeWidth={1.5}
          />
        ))}
        {/* pace points */}
        {pacePts.map((p) => (
          <circle
            key={p.idx}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill="var(--sage-deep)"
            stroke="var(--paper-1)"
            strokeWidth={1.5}
          />
        ))}
        {/* X labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={xOf(i)}
            y={height - 6}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--ink-3)' }}
          >
            {d.w}
          </text>
        ))}
        {/* Tooltip */}
        {hover !== null && (
          <g>
            <rect
              x={kmPts[hover].x - 44}
              y={kmPts[hover].y - 40}
              width={88}
              height={32}
              rx={5}
              fill="var(--ink)"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }}
            />
            <text
              x={kmPts[hover].x}
              y={kmPts[hover].y - 22}
              textAnchor="middle"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--paper-1)' }}
            >
              {data[hover].km} km
            </text>
            <text
              x={kmPts[hover].x}
              y={kmPts[hover].y - 10}
              textAnchor="middle"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--sage-soft)' }}
            >
              {data[hover].pace > 0 ? formatPaceDecimal(data[hover].pace) + '/km' : '—'}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

// ─── MuscuProgress ────────────────────────────────────────────────────────────

function MuscuProgress({ sessions }: { sessions: MuscuSession[] }) {
  const muscuVolumeData = useMemo(() => computeMuscuVolume(sessions), [sessions])
  const exerciseNames = Object.keys(muscuVolumeData)
  const [activeEx, setActiveEx] = useState<string>('')

  const currentEx = activeEx && exerciseNames.includes(activeEx) ? activeEx : exerciseNames[0] ?? ''
  const chartData = currentEx ? muscuVolumeData[currentEx] : []

  const hasData =
    chartData.length >= 2 && chartData.some((d) => d.v > 0)

  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Label>Progression</Label>
      </div>
      {exerciseNames.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--ink-3)',
            padding: '24px 0',
            textAlign: 'center',
          }}
        >
          Pas encore assez de données pour afficher la progression.
        </p>
      ) : (
        <>
          {/* Exercise filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {exerciseNames.map((name) => (
              <button
                key={name}
                onClick={() => setActiveEx(name)}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: currentEx === name ? 'var(--terra)' : 'var(--paper-2)',
                  background: currentEx === name ? 'var(--terra-soft)' : 'transparent',
                  color: currentEx === name ? 'var(--terra-deep)' : 'var(--ink-3)',
                  cursor: 'pointer',
                  transition: 'all 120ms',
                }}
              >
                {name}
              </button>
            ))}
          </div>
          {hasData ? (
            <LineChart data={chartData} label="reps" />
          ) : (
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--ink-3)',
                padding: '24px 0',
                textAlign: 'center',
              }}
            >
              Pas encore assez de données pour afficher la progression.
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ─── CourseProgress ───────────────────────────────────────────────────────────

function CourseProgress({ runs }: { runs: Run[] }) {
  const courseWeeklyData = useMemo(() => computeCourseWeekly(runs), [runs])

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Label>Progression hebdomadaire</Label>
      </div>
      {courseWeeklyData.length < 2 ? (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--ink-3)',
            padding: '24px 0',
            textAlign: 'center',
          }}
        >
          Pas encore assez de données pour afficher la progression.
        </p>
      ) : (
        <>
          <DualChart data={courseWeeklyData} />
          <div style={{ display: 'flex', gap: 18, marginTop: 10, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 2, background: 'var(--terra)', borderRadius: 1 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>km</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 20,
                  height: 2,
                  background: 'var(--sage-deep)',
                  borderRadius: 1,
                  borderTop: '2px dashed var(--sage-deep)',
                }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>allure</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── GoalRow ──────────────────────────────────────────────────────────────────

function GoalRow({
  goal,
  last,
  onDelete,
}: {
  goal: SportGoal
  last: boolean
  onDelete: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '11px 0',
        borderBottom: last ? 'none' : '1px solid var(--paper-2)',
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--terra)',
          marginTop: 5,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14.5,
            fontWeight: 500,
            color: 'var(--ink)',
            lineHeight: 1.3,
          }}
        >
          {goal.title}
        </div>
        {goal.note && (
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13.5,
              color: 'var(--ink-2)',
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {goal.note}
          </div>
        )}
      </div>
      <button
        onClick={onDelete}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink-4)',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
        title="Supprimer"
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ─── Splits ───────────────────────────────────────────────────────────────────

function SplitsView({ splits }: { splits: Split[] }) {
  const secs = splits.map((s) => paceToSec(s.pace))
  const fastest = Math.min(...secs)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {splits.map((s, i) => {
        const sec = paceToSec(s.pace)
        const isFastest = sec === fastest
        const pct = Math.max(30, (fastest / sec) * 100)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
                width: 28,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {s.km}km
            </span>
            <div
              style={{
                flex: 1,
                height: 6,
                background: 'var(--paper-2)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: isFastest ? 'var(--sage)' : 'rgba(181,83,42,0.7)',
                  borderRadius: 3,
                  transition: 'width 400ms var(--ease)',
                }}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: isFastest ? 'var(--sage-deep)' : 'var(--ink-2)',
                width: 36,
                flexShrink: 0,
              }}
            >
              {s.pace}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── DetailMetric ─────────────────────────────────────────────────────────────

function DetailMetric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Label>{label}</Label>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            fontWeight: 500,
            color: 'var(--ink)',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--ink-3)',
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── MuscuDetail ─────────────────────────────────────────────────────────────

function MuscuDetail({ session }: { session: MuscuSession }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
          {fmtDateShort(session.date)} · {session.duration}
        </span>
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 32,
          fontWeight: 500,
          color: 'var(--ink)',
          lineHeight: 1.1,
          margin: '0 0 4px',
        }}
      >
        {session.title}
      </h2>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)', margin: '0 0 20px' }}>
        {fmtDateFr(session.date)}
      </p>
      <hr style={{ border: 0, borderTop: '1px solid var(--paper-2)', margin: '0 0 20px' }} />
      <div style={{ marginBottom: 12 }}>
        <Label>Exercices</Label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {session.exercises.map((ex, i) => (
          <div
            key={i}
            style={{
              background: 'var(--paper-1)',
              border: '1px solid var(--paper-2)',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: 'var(--ink)',
                }}
              >
                {ex.name}
              </span>
              {ex.iso && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--sage-deep)',
                    background: 'var(--sage-soft)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  iso
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--ink-2)',
              }}
            >
              {ex.sets}
            </span>
          </div>
        ))}
      </div>
      {session.note && (
        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <Label>Note</Label>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 16,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {session.note}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── RunDetail ────────────────────────────────────────────────────────────────

function RunDetail({ run }: { run: Run }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
          {fmtDateShort(run.date)} · {run.duration}
        </span>
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 32,
          fontWeight: 500,
          color: 'var(--ink)',
          lineHeight: 1.1,
          margin: '0 0 4px',
        }}
      >
        {run.title}
      </h2>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)', margin: '0 0 20px' }}>
        {fmtDateFr(run.date)}
      </p>
      <hr style={{ border: 0, borderTop: '1px solid var(--paper-2)', margin: '0 0 20px' }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <DetailMetric label="Distance" value={`${run.distance}`} unit="km" />
        <DetailMetric label="Allure" value={run.pace} unit="/km" />
        <DetailMetric label="Durée" value={run.duration} />
        {run.elevation != null ? (
          <DetailMetric label="Dénivelé" value={`+${run.elevation}`} unit="m" />
        ) : (
          <DetailMetric label="Dénivelé" value="—" />
        )}
      </div>
      {run.splits && run.splits.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <Label>Splits</Label>
          </div>
          <SplitsView splits={run.splits} />
        </div>
      )}
      {run.note && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <Label>Note</Label>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 16,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {run.note}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── DetailOverlay ────────────────────────────────────────────────────────────

function DetailOverlay({
  sport,
  muscuSessions,
  runs,
  detailId,
  onClose,
}: {
  sport: 'muscu' | 'course'
  muscuSessions: MuscuSession[]
  runs: Run[]
  detailId: string
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const muscuSession = sport === 'muscu' ? muscuSessions.find((s) => s.id === detailId) : null
  const run = sport === 'course' ? runs.find((r) => r.id === detailId) : null

  if (!muscuSession && !run) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'color-mix(in srgb, var(--ink) 22%, transparent)',
          animation: 'sportOverlayIn 200ms var(--ease)',
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: 'min(560px, 92%)',
          background: 'var(--paper-1)',
          boxShadow: 'var(--shadow-3)',
          animation: 'sportPanelIn 280ms var(--ease)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 28px 16px',
            borderBottom: '1px solid var(--paper-2)',
            position: 'sticky',
            top: 0,
            background: 'var(--paper-1)',
            zIndex: 1,
          }}
        >
          <Label>détail</Label>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-3)',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>
        {/* Content */}
        <div style={{ padding: '24px 28px 40px', flex: 1 }}>
          {muscuSession && <MuscuDetail session={muscuSession} />}
          {run && <RunDetail run={run} />}
        </div>
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--ink)',
        color: 'var(--paper-1)',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        padding: '10px 18px',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: 'var(--shadow-3)',
        zIndex: 200,
        whiteSpace: 'nowrap',
        animation: 'sportFade 200ms var(--ease)',
      }}
    >
      <Check size={14} color="var(--sage)" />
      {message}
    </div>
  )
}

// ─── NewMuscuSessionModal ─────────────────────────────────────────────────────

function NewMuscuSessionModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (session: MuscuSession) => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayStr())
  const [duration, setDuration] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([{ name: '', sets: '', iso: false }])
  const [note, setNote] = useState('')

  const addExercise = () =>
    setExercises((prev) => [...prev, { name: '', sets: '', iso: false }])
  const removeExercise = (i: number) =>
    setExercises((prev) => prev.filter((_, idx) => idx !== i))
  const updateExercise = (i: number, field: keyof Exercise, value: string | boolean) =>
    setExercises((prev) =>
      prev.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex)),
    )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanExercises = exercises.filter((ex) => ex.name.trim())
    if (!title.trim() || cleanExercises.length === 0) return
    const session: MuscuSession = {
      id: crypto.randomUUID(),
      date,
      title: title.trim(),
      duration: duration.trim() || '?',
      exercises: cleanExercises,
      note: note.trim() || undefined,
    }
    onSave(session)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--ink) 28%, transparent)',
        animation: 'sportOverlayIn 200ms var(--ease)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--paper-1)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-3)',
          animation: 'sportFade 250ms var(--ease)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px 14px',
            borderBottom: '1px solid var(--paper-2)',
          }}
        >
          <span
            style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}
          >
            Nouvelle séance
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title + date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
                Titre *
              </label>
              <input
                required
                autoFocus
                style={inputStyle}
                placeholder="ex: Push Day, Full Body…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
                Date
              </label>
              <input
                type="date"
                style={{ ...inputStyle, colorScheme: 'light' }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          {/* Duration */}
          <div style={{ maxWidth: 200 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
              Durée
            </label>
            <input
              style={inputStyle}
              placeholder="ex: 1 h 12"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          {/* Exercises */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
              Exercices *
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exercises.map((ex, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto auto', gap: 8, alignItems: 'center' }}>
                  <input
                    style={inputStyle}
                    placeholder="Nom de l'exercice"
                    value={ex.name}
                    onChange={(e) => updateExercise(i, 'name', e.target.value)}
                  />
                  <input
                    style={inputStyle}
                    placeholder="4 × 8"
                    value={ex.sets}
                    onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={ex.iso ?? false}
                      onChange={(e) => updateExercise(i, 'iso', e.target.checked)}
                    />
                    iso
                  </label>
                  <button
                    type="button"
                    onClick={() => removeExercise(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', display: 'flex', alignItems: 'center' }}
                    disabled={exercises.length === 1}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addExercise}
              style={{
                marginTop: 8,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--terra)',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={13} /> Ajouter un exercice
            </button>
          </div>
          {/* Note */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
              Note (optionnel)
            </label>
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
              placeholder="Ressentis, contexte…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>
              Annuler
            </button>
            <button type="submit" style={primaryBtnStyle}>
              <Check size={14} /> Créer la séance
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── NewRunModal ──────────────────────────────────────────────────────────────

function NewRunModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (run: Run) => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayStr())
  const [distance, setDistance] = useState('')
  const [pace, setPace] = useState('')
  const [duration, setDuration] = useState('')
  const [elevation, setElevation] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !distance || !pace.trim() || !duration.trim()) return
    const run: Run = {
      id: crypto.randomUUID(),
      date,
      title: title.trim(),
      distance: parseFloat(distance),
      pace: pace.trim(),
      duration: duration.trim(),
      elevation: elevation ? parseFloat(elevation) : undefined,
      note: note.trim() || undefined,
    }
    onSave(run)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--ink) 28%, transparent)',
        animation: 'sportOverlayIn 200ms var(--ease)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--paper-1)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-3)',
          animation: 'sportFade 250ms var(--ease)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px 14px',
            borderBottom: '1px solid var(--paper-2)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>
            Nouvelle sortie
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
                Titre *
              </label>
              <input required autoFocus style={inputStyle} placeholder="ex: Sortie Bois de Vincennes" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
                Date
              </label>
              <input type="date" style={{ ...inputStyle, colorScheme: 'light' }} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          {/* Distance + Allure + Durée */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
                Distance (km) *
              </label>
              <input required type="number" step="0.1" min="0" style={inputStyle} placeholder="10.5" value={distance} onChange={(e) => setDistance(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
                Allure *
              </label>
              <input required style={inputStyle} placeholder="4:58" value={pace} onChange={(e) => setPace(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
                Durée *
              </label>
              <input required style={inputStyle} placeholder="50:39" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>
          {/* Elevation */}
          <div style={{ maxWidth: 180 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
              Dénivelé (m, optionnel)
            </label>
            <input type="number" min="0" style={inputStyle} placeholder="120" value={elevation} onChange={(e) => setElevation(e.target.value)} />
          </div>
          {/* Note */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
              Note (optionnel)
            </label>
            <textarea rows={2} style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} placeholder="Conditions, ressentis…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>Annuler</button>
            <button type="submit" style={primaryBtnStyle}><Check size={14} /> Créer la sortie</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── GoalModal ────────────────────────────────────────────────────────────────

function GoalModal({
  sport,
  onClose,
  onSave,
}: {
  sport: 'muscu' | 'course'
  onClose: () => void
  onSave: (goal: SportGoal) => void
}) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      id: crypto.randomUUID(),
      sport,
      title: title.trim(),
      note: note.trim() || undefined,
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--ink) 28%, transparent)',
        animation: 'sportOverlayIn 200ms var(--ease)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--paper-1)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 420,
          boxShadow: 'var(--shadow-3)',
          animation: 'sportFade 250ms var(--ease)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px', borderBottom: '1px solid var(--paper-2)' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>
            Nouvel objectif
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
              Objectif *
            </label>
            <input required autoFocus style={inputStyle} placeholder="ex: 3 séances / semaine" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
              Note (optionnel)
            </label>
            <input style={inputStyle} placeholder="Contexte, détails…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>Annuler</button>
            <button type="submit" style={primaryBtnStyle}><Plus size={14} /> Ajouter</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── SportView ────────────────────────────────────────────────────────────────

export function SportView() {
  const [sport, setSport] = useState<'muscu' | 'course'>('muscu')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [muscuSessions, setMuscuSessions] = useState<MuscuSession[]>(() =>
    load<MuscuSession[]>(LS_MUSCU, []),
  )
  const [runs, setRuns] = useState<Run[]>(() => load<Run[]>(LS_RUNS, []))
  const [goals, setGoals] = useState<SportGoal[]>(() => load<SportGoal[]>(LS_GOALS, []))

  // Sync to localStorage
  useEffect(() => { localStorage.setItem(LS_MUSCU, JSON.stringify(muscuSessions)) }, [muscuSessions])
  useEffect(() => { localStorage.setItem(LS_RUNS, JSON.stringify(runs)) }, [runs])
  useEffect(() => { localStorage.setItem(LS_GOALS, JSON.stringify(goals)) }, [goals])

  // ── Computed metrics ──────────────────────────────────────────────────────

  const muscuMonthSessions = muscuSessions.filter((s) => s.date.startsWith(currentMonthStr()))
  const muscuGoals = goals.filter((g) => g.sport === 'muscu' && g.title)
  const lastMuscu = muscuSessions.slice().sort((a, b) => b.date.localeCompare(a.date))[0]
  const sortedMuscuSessions = useMemo(
    () => [...muscuSessions].sort((a, b) => b.date.localeCompare(a.date)),
    [muscuSessions],
  )
  const sortedRuns = useMemo(
    () => [...runs].sort((a, b) => b.date.localeCompare(a.date)),
    [runs],
  )

  const muscuBandeau = [
    {
      label: 'Dernière séance',
      value: lastMuscu ? fmtDateFr(lastMuscu.date) : '—',
      sub: lastMuscu?.title ?? '',
    },
    {
      label: 'Volume du mois',
      value:
        muscuMonthSessions.length > 0
          ? `${muscuMonthSessions.length} séance${muscuMonthSessions.length > 1 ? 's' : ''}`
          : '—',
      sub:
        muscuMonthSessions.length > 0
          ? muscuMonthSessions.map((s) => s.duration).join(', ')
          : '',
    },
    {
      label: 'En cours',
      value: muscuGoals[0]?.title ?? '—',
      sub: muscuGoals[0]?.note?.slice(0, 60) ?? '',
    },
  ]

  const runMonthRuns = runs.filter((r) => r.date.startsWith(currentMonthStr()))
  const courseGoals = goals.filter((g) => g.sport === 'course' && g.title)
  const lastRun = sortedRuns[0]
  const totalKmMonth = runMonthRuns.reduce((s, r) => s + r.distance, 0)

  const courseBandeau = [
    {
      label: 'Dernière sortie',
      value: lastRun ? fmtDateFr(lastRun.date) : '—',
      sub: lastRun ? `${lastRun.distance} km · ${lastRun.title}` : '',
    },
    {
      label: 'Volume du mois',
      value: totalKmMonth > 0 ? `${totalKmMonth.toFixed(1)} km` : '—',
      sub:
        runMonthRuns.length > 0
          ? `${runMonthRuns.length} sortie${runMonthRuns.length > 1 ? 's' : ''}`
          : '',
    },
    {
      label: 'En cours',
      value: courseGoals[0]?.title ?? '—',
      sub: courseGoals[0]?.note?.slice(0, 60) ?? '',
    },
  ]

  const bandeau = sport === 'muscu' ? muscuBandeau : courseBandeau
  const filteredGoals = goals.filter((g) => g.sport === sport)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const addMuscuSession = (session: MuscuSession) => {
    setMuscuSessions((prev) => [session, ...prev])
    setShowNewModal(false)
    setDetailId(session.id)
    setToast('Séance enregistrée')
  }

  const addRun = (run: Run) => {
    setRuns((prev) => [run, ...prev])
    setShowNewModal(false)
    setDetailId(run.id)
    setToast('Sortie enregistrée')
  }

  const addGoal = (goal: SportGoal) => {
    setGoals((prev) => [...prev, goal])
    setShowGoalModal(false)
    setToast('Objectif ajouté')
  }

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div
        key={sport}
        style={{
          padding: '32px 48px 80px',
          maxWidth: 1100,
          margin: '0 auto',
          animation: 'sportFade 320ms var(--ease)',
        }}
      >
        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <Label>sport · {sport === 'muscu' ? 'street workout · musculation' : 'course à pied'}</Label>
          <SportSwitch value={sport} onChange={setSport} />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 32,
            marginBottom: 16,
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 48,
              fontWeight: 500,
              color: 'var(--ink)',
              letterSpacing: '-0.015em',
              lineHeight: 1.05,
              margin: 0,
              maxWidth: '14ch',
            }}
          >
            {sport === 'muscu' ? "Carnet d'entraînement." : 'Carnet de course.'}
          </h1>
          <button onClick={() => setShowNewModal(true)} style={primaryBtnStyle}>
            <Plus size={16} />
            {sport === 'muscu' ? 'Nouvelle séance' : 'Nouvelle sortie'}
          </button>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--ink-2)',
            margin: '0 0 32px',
            maxWidth: '58ch',
            lineHeight: 1.4,
          }}
        >
          «
          {sport === 'muscu'
            ? ' Ce que le corps a fait cette saison — séances, séries, sensations.'
            : " Les kilomètres avalés, l'allure qui se cherche, les sorties qui restent."}
          »
        </p>

        {/* ── BANDEAU 3 MÉTRIQUES ───────────────────────────────────────────── */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            background: 'var(--paper-1)',
            border: '1px solid var(--paper-2)',
            borderRadius: 12,
            padding: '4px 0',
            marginBottom: 40,
          }}
        >
          {bandeau.map((b, i) => (
            <BandeauStat key={i} {...b} last={i === 2} />
          ))}
        </section>

        {/* ── GRILLE PRINCIPALE ─────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
            gap: 32,
          }}
        >
          {/* Journal */}
          <section>
            <div style={{ marginBottom: 20 }}>
              <Label>{sport === 'muscu' ? 'Journal des séances' : 'Journal des sorties'}</Label>
            </div>
            {sport === 'muscu' ? (
              sortedMuscuSessions.length === 0 ? (
                <div style={{ padding: '64px 0', textAlign: 'center' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 18,
                      color: 'var(--ink-2)',
                      marginBottom: 20,
                    }}
                  >
                    Aucune séance enregistrée.
                  </p>
                  <button onClick={() => setShowNewModal(true)} style={primaryBtnStyle}>
                    <Plus size={14} /> Nouvelle séance
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sortedMuscuSessions.map((session, idx) => (
                    <MuscuCard
                      key={session.id}
                      session={session}
                      idx={idx}
                      onClick={() => setDetailId(session.id)}
                    />
                  ))}
                </div>
              )
            ) : sortedRuns.length === 0 ? (
              <div style={{ padding: '64px 0', textAlign: 'center' }}>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: 'var(--ink-2)',
                    marginBottom: 20,
                  }}
                >
                  Aucune sortie enregistrée.
                </p>
                <button onClick={() => setShowNewModal(true)} style={primaryBtnStyle}>
                  <Plus size={14} /> Nouvelle sortie
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sortedRuns.map((run, idx) => (
                  <RunCard
                    key={run.id}
                    run={run}
                    idx={idx}
                    onClick={() => setDetailId(run.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Aside: progression + objectifs */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {/* Progression */}
            <section
              style={{
                background: 'var(--paper-1)',
                border: '1px solid var(--paper-2)',
                borderRadius: 12,
                padding: '20px 20px 16px',
              }}
            >
              {sport === 'muscu' ? (
                <MuscuProgress sessions={muscuSessions} />
              ) : (
                <CourseProgress runs={runs} />
              )}
            </section>

            {/* Objectifs */}
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <Label>Objectifs</Label>
              </div>
              {filteredGoals.length > 0 && (
                <div
                  style={{
                    background: 'var(--paper-1)',
                    border: '1px solid var(--paper-2)',
                    borderRadius: 12,
                    padding: '4px 16px',
                    marginBottom: 12,
                  }}
                >
                  {filteredGoals.map((goal, i) => (
                    <GoalRow
                      key={goal.id}
                      goal={goal}
                      last={i === filteredGoals.length - 1}
                      onDelete={() => deleteGoal(goal.id)}
                    />
                  ))}
                </div>
              )}
              {/* + Ajouter un objectif */}
              <button
                onClick={() => setShowGoalModal(true)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1.5px dashed var(--ink-4)',
                  background: 'transparent',
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'border-color 150ms, color 150ms',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--terra)'
                  el.style.color = 'var(--terra)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--ink-4)'
                  el.style.color = 'var(--ink-3)'
                }}
              >
                <Plus size={13} /> Ajouter un objectif
              </button>
            </section>
          </aside>
        </div>
      </div>

      {/* ── DetailOverlay ──────────────────────────────────────────────────── */}
      {detailId && (
        <DetailOverlay
          sport={sport}
          muscuSessions={muscuSessions}
          runs={runs}
          detailId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      {/* ── Objectifs ───────────────────────────────────────────────────────── */}
      <DomainObjectivesSection
        domainId="sport"
        subtitle="« Bâtir un corps qui dure, pas une silhouette qui plaît. »"
      />

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showNewModal &&
        (sport === 'muscu' ? (
          <NewMuscuSessionModal onClose={() => setShowNewModal(false)} onSave={addMuscuSession} />
        ) : (
          <NewRunModal onClose={() => setShowNewModal(false)} onSave={addRun} />
        ))}

      {showGoalModal && (
        <GoalModal
          sport={sport}
          onClose={() => setShowGoalModal(false)}
          onSave={addGoal}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
