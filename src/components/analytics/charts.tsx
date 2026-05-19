import { useEffect, useRef, useState } from 'react'

// ─── Utilitaires SVG ─────────────────────────────────────────────────────────

const pathFromPts = (pts: Array<[number, number]>): string =>
  pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ')

const fmt = (n: number, d = 1): string => {
  if (n === 0) return '0'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })
}

function useContainerWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => setW(entry.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

interface SparklineProps {
  values:   number[]
  color?:   string
  width?:   number
  height?:  number
  fill?:    boolean
}

export function Sparkline({
  values, color = 'var(--terra)', width = 84, height = 22, fill = true,
}: SparklineProps) {
  if (!values || values.length === 0) return null
  const max = Math.max(...values, 0.001)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const stepX = values.length > 1 ? (width - 2) / (values.length - 1) : 0
  const pts: Array<[number, number]> = values.map((v, i) => [
    1 + i * stepX,
    height - 1 - ((v - min) / range) * (height - 3),
  ])
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <path
          d={pathFromPts(pts) + ` L ${1 + (values.length - 1) * stepX} ${height - 1} L 1 ${height - 1} Z`}
          fill={color} opacity="0.12"
        />
      )}
      <path d={pathFromPts(pts)} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── AreaLine ────────────────────────────────────────────────────────────────

interface AreaLineProps {
  values:   number[]
  labels:   string[]
  color?:   string
  height?:  number
  unit?:    string
  yTicks?:  number
}

export function AreaLine({
  values, labels, color = 'var(--terra)', height = 180, unit = 'h', yTicks = 4,
}: AreaLineProps) {
  const [ref, w] = useContainerWidth()
  const [hover, setHover] = useState<number | null>(null)

  const padL = 36, padR = 12, padT = 12, padB = 28
  const innerW = Math.max(40, w - padL - padR)
  const innerH = height - padT - padB
  const max = Math.max(...values, 0) * 1.1 || 1
  const stepX = values.length > 1 ? innerW / (values.length - 1) : 0
  const pts: Array<[number, number]> = values.map((v, i) => [
    padL + i * stepX,
    padT + innerH - (v / max) * innerH,
  ])

  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (max * i) / yTicks)

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => {
          const y = padT + innerH - (t / max) * innerH
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--paper-2)" strokeWidth="1" strokeDasharray={i === 0 ? '' : '2 3'} />
              <text x={padL - 8} y={y + 3.5} textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="0.04em">
                {fmt(t, t < 10 ? 1 : 0)}
              </text>
            </g>
          )
        })}
        <path
          d={pathFromPts(pts) + ` L ${pts[pts.length - 1][0]} ${padT + innerH} L ${pts[0][0]} ${padT + innerH} Z`}
          fill={color} opacity="0.12"
        />
        <path d={pathFromPts(pts)} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <circle cx={x} cy={y} r={hover === i ? 4 : 2.5} fill="var(--paper-1)" stroke={color} strokeWidth="1.5" style={{ transition: 'r var(--dur) var(--ease)' }} />
            <rect x={x - stepX / 2} y={padT} width={stepX || 30} height={innerH} fill="transparent" />
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={i} x={padL + i * stepX} y={height - 8} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="0.04em">
            {l}
          </text>
        ))}
        {hover !== null && (
          <g>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={padT} y2={padT + innerH} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="2 3" />
            <g transform={`translate(${Math.min(pts[hover][0] + 10, w - padR - 80)}, ${Math.max(pts[hover][1] - 30, padT)})`}>
              <rect x="0" y="0" width="76" height="34" rx="6" fill="var(--paper-1)" stroke="var(--paper-2)" strokeWidth="1" />
              <text x="8" y="14" fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--ink-3)" letterSpacing="0.08em">
                {(labels[hover] ?? '').toUpperCase()}
              </text>
              <text x="8" y="28" fontFamily="var(--font-mono)" fontSize="12.5" fill="var(--ink)" letterSpacing="0.02em">
                {fmt(values[hover])} {unit}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}

// ─── StackedDayBars ──────────────────────────────────────────────────────────

interface StackedDayBarsProps {
  data:       Record<string, number[]>
  days:       string[]
  domainKeys: string[]
  colorByKey: Record<string, string>
  height?:    number
}

export function StackedDayBars({
  data, days, domainKeys, colorByKey, height = 200,
}: StackedDayBarsProps) {
  const [ref, w] = useContainerWidth()
  const [hover, setHover] = useState<number | null>(null)

  const padL = 36, padR = 12, padT = 12, padB = 26
  const innerW = Math.max(40, w - padL - padR)
  const innerH = height - padT - padB
  const totals = days.map((_, i) => domainKeys.reduce((s, k) => s + (data[k]?.[i] || 0), 0))
  const max = Math.max(...totals, 0) * 1.15 || 1
  const colW = innerW / days.length
  const bw = Math.min(28, colW * 0.55)
  const ticks = [0, 0.5, 1].map((t) => t * max)

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => {
          const y = padT + innerH - (t / max) * innerH
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--paper-2)" strokeWidth="1" strokeDasharray={i === 0 ? '' : '2 3'} />
              <text x={padL - 8} y={y + 3.5} textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)">
                {fmt(t, 0)}{i === ticks.length - 1 ? ' h' : ''}
              </text>
            </g>
          )
        })}
        {days.map((day, di) => {
          const cx = padL + di * colW + colW / 2
          let yCursor = padT + innerH
          return (
            <g key={di} onMouseEnter={() => setHover(di)}>
              <rect x={cx - colW / 2} y={padT} width={colW} height={innerH} fill="transparent" />
              {domainKeys.map((k, ki) => {
                const v = data[k]?.[di] || 0
                if (v <= 0) return null
                const h = (v / max) * innerH
                yCursor -= h
                return (
                  <rect
                    key={k}
                    x={cx - bw / 2} y={yCursor + (ki === 0 ? 0 : 1)}
                    width={bw} height={Math.max(h - (ki === 0 ? 0 : 1), 0)}
                    rx="2"
                    fill={colorByKey[k] ?? 'var(--terra)'}
                    opacity={hover === null || hover === di ? 0.9 : 0.45}
                    style={{ transition: 'opacity var(--dur) var(--ease)' }}
                  />
                )
              })}
              <text x={cx} y={height - 8} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="0.04em">
                {day}
              </text>
              {hover === di && totals[di] > 0 && (
                <text x={cx} y={padT + innerH - (totals[di] / max) * innerH - 7} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill="var(--ink)" letterSpacing="0.02em">
                  {fmt(totals[di])} h
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── DomainBars ──────────────────────────────────────────────────────────────

export interface DomainBarRow {
  key:    string
  label:  string
  value:  number
  color:  string
  icon?:  React.ReactNode
  unit?:  string
}

interface DomainBarsProps {
  rows: DomainBarRow[]
  max?: number
}

export function DomainBars({ rows, max }: DomainBarsProps) {
  const top = (max ?? Math.max(...rows.map((r) => r.value), 0)) || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => {
        const pct = (r.value / top) * 100
        return (
          <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 64px', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {r.icon}
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)' }}>{r.label}</span>
            </div>
            <div style={{ position: 'relative', height: 8, background: 'var(--paper-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: pct + '%', background: r.color, opacity: 0.85,
                transition: 'width var(--dur-slow) var(--ease)',
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--ink)' }}>
                {fmt(r.value)}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                {r.unit || 'h'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

interface HeatmapProps {
  weeks:      number[][]  // [weekIdx][dayIdx] = intensité 0..4
  weekLabels: string[]
  dayLabels:  string[]
  color?:     string
}

export function Heatmap({ weeks, weekLabels, dayLabels, color = 'var(--terra)' }: HeatmapProps) {
  const cell = 28, gap = 4
  const w = (cell + gap) * dayLabels.length - gap + 36
  const h = (cell + gap) * weeks.length - gap + 20
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)
  const opacityFor = (v: number) => (v === 0 ? 0 : 0.12 + (v / 4) * 0.55)
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={w} height={h} style={{ display: 'block' }}>
        {dayLabels.map((d, di) => (
          <text key={di} x={36 + di * (cell + gap) + cell / 2} y={11} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="0.04em">{d}</text>
        ))}
        {weeks.map((row, ri) => (
          <g key={ri}>
            <text x={0} y={20 + ri * (cell + gap) + cell / 2 + 3.5} fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="0.04em">
              {weekLabels[ri]}
            </text>
            {row.map((v, ci) => {
              const x = 36 + ci * (cell + gap)
              const y = 20 + ri * (cell + gap)
              const hov = hover?.r === ri && hover?.c === ci
              return (
                <g key={ci} onMouseEnter={() => setHover({ r: ri, c: ci })} onMouseLeave={() => setHover(null)}>
                  <rect
                    x={x} y={y} width={cell} height={cell} rx="4"
                    fill={v === 0 ? 'var(--paper-2)' : color}
                    opacity={v === 0 ? 0.6 : opacityFor(v)}
                    stroke={hov ? 'var(--ink)' : 'transparent'} strokeWidth="1"
                    style={{ transition: 'stroke var(--dur) var(--ease)' }}
                  />
                  {v > 0 && (
                    <text x={x + cell / 2} y={y + cell / 2 + 3.5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fill={v >= 3 ? 'var(--paper-1)' : 'var(--ink)'} opacity={v >= 3 ? 1 : 0.7}>
                      {v}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        ))}
      </svg>
    </div>
  )
}

// ─── Ring ────────────────────────────────────────────────────────────────────

interface RingProps {
  value:   number
  total:   number
  size?:   number
  stroke?: number
  color?:  string
  label?:  string
}

export function Ring({ value, total, size = 88, stroke = 6, color = 'var(--sage)', label }: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, value / total) : 0
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--paper-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray var(--dur-slow) var(--ease)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
        fontSize: 18, color: 'var(--ink)', letterSpacing: '0.02em',
      }}>
        {value}<span style={{ color: 'var(--ink-3)', fontSize: 13, marginLeft: 2 }}>/{total}</span>
      </div>
      {label && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, textAlign: 'center',
          marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--ink-3)',
        }}>{label}</div>
      )}
    </div>
  )
}

// ─── TrendChart ──────────────────────────────────────────────────────────────

export interface TrendPoint {
  label: string
  [key: string]: number | string
}

export interface TrendSeries {
  key:    string
  color:  string
  label:  string
  fill?:  boolean
  dashed?: boolean
}

interface TrendChartProps {
  points:  TrendPoint[]
  series:  TrendSeries[]
  height?: number
}

export function TrendChart({ points, series, height = 200 }: TrendChartProps) {
  const [ref, w] = useContainerWidth()
  const padL = 40, padR = 40, padT = 16, padB = 28
  const innerW = Math.max(40, w - padL - padR)
  const innerH = height - padT - padB
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padT + innerH - t * innerH
          return (
            <line key={i} x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--paper-2)" strokeWidth="1" strokeDasharray={t === 0 ? '' : '2 3'} />
          )
        })}
        {series.map((s) => {
          const max = Math.max(...points.map((p) => Number(p[s.key]) || 0), 0) * 1.15 || 1
          const pts: Array<[number, number]> = points.map((p, i) => [
            padL + i * stepX,
            padT + innerH - ((Number(p[s.key]) || 0) / max) * innerH,
          ])
          return (
            <g key={s.key}>
              {s.fill && (
                <path
                  d={pathFromPts(pts) + ` L ${pts[pts.length - 1][0]} ${padT + innerH} L ${pts[0][0]} ${padT + innerH} Z`}
                  fill={s.color} opacity="0.10"
                />
              )}
              <path
                d={pathFromPts(pts)} fill="none" stroke={s.color} strokeWidth="1.5"
                strokeLinejoin="round" strokeLinecap="round"
                strokeDasharray={s.dashed ? '4 4' : ''}
              />
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="var(--paper-1)" stroke={s.color} strokeWidth="1.5" />
              ))}
              <text x={pts[pts.length - 1][0] + 8} y={pts[pts.length - 1][1] + 4} fontFamily="var(--font-mono)" fontSize="10.5" fill={s.color} letterSpacing="0.04em">
                {s.label}
              </text>
            </g>
          )
        })}
        {points.map((p, i) => (
          <text key={i} x={padL + i * stepX} y={height - 8} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fill="var(--ink-3)" letterSpacing="0.04em">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ─── HourStrip ───────────────────────────────────────────────────────────────

interface HourStripProps {
  hours: number[]    // valeurs par heure (06h → 22h par défaut, 17 valeurs)
  max:   number
  color?: string
}

export function HourStrip({ hours, max, color = 'var(--terra)' }: HourStripProps) {
  const width = 320, height = 44
  const padL = 28, padR = 4
  const innerW = width - padL - padR
  const colW = innerW / hours.length
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <text x={0} y={14} fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--ink-3)" letterSpacing="0.08em">06H</text>
      <text x={0} y={32} fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--ink-3)" letterSpacing="0.08em">22H</text>
      {hours.map((v, i) => {
        const x = padL + i * colW
        const h = max > 0 ? (v / max) * 22 : 0
        return (
          <rect
            key={i} x={x + 1} y={10 + (22 - h)}
            width={Math.max(colW - 2, 1)} height={Math.max(h, 1)}
            rx="1" fill={color} opacity={v === 0 ? 0.15 : 0.7}
          />
        )
      })}
    </svg>
  )
}
