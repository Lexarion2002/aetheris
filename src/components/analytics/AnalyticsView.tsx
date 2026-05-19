import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  getWeekBounds, getMonthBounds,
  formatWeekRangeLong, formatWeekRangeShort,
  formatMonthLong, formatMonthShort,
} from '../../utils/analyticsUtils'
import { AnalyticsWeek } from './AnalyticsWeek'
import { AnalyticsMonth } from './AnalyticsMonth'
import { AnalyticsInsights } from './AnalyticsInsights'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'semaine' | 'mois' | 'insights'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'semaine',  label: 'Semaine' },
  { id: 'mois',     label: 'Mois' },
  { id: 'insights', label: 'Insights' },
]

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink-3)',
}

// ─── PeriodSelector ──────────────────────────────────────────────────────────

interface PeriodSelectorProps {
  tab:       Tab
  weekOffset:  number
  monthOffset: number
  onWeekChange:  (offset: number) => void
  onMonthChange: (offset: number) => void
}

function PeriodSelector({ tab, weekOffset, monthOffset, onWeekChange, onMonthChange }: PeriodSelectorProps) {
  // Limites
  const MIN_WEEK_OFFSET = -12
  const MIN_MONTH_OFFSET = -6

  if (tab === 'mois') {
    const bounds = getMonthBounds(monthOffset)
    const canPrev = monthOffset > MIN_MONTH_OFFSET
    const canNext = monthOffset < 0
    return (
      <SelectorShell
        kind="Mois"
        rangeLong={formatMonthLong(bounds)}
        rangeShort={formatMonthShort(bounds)}
        onPrev={() => canPrev && onMonthChange(monthOffset - 1)}
        onNext={() => canNext && onMonthChange(monthOffset + 1)}
        canPrev={canPrev}
        canNext={canNext}
      />
    )
  }

  // semaine et insights → semaine
  const bounds = getWeekBounds(weekOffset)
  const canPrev = weekOffset > MIN_WEEK_OFFSET
  const canNext = weekOffset < 0
  const kind = tab === 'insights' ? 'Semaine' : 'Semaine'
  return (
    <SelectorShell
      kind={kind}
      rangeLong={formatWeekRangeLong(bounds)}
      rangeShort={formatWeekRangeShort(bounds)}
      onPrev={() => canPrev && onWeekChange(weekOffset - 1)}
      onNext={() => canNext && onWeekChange(weekOffset + 1)}
      canPrev={canPrev}
      canNext={canNext}
    />
  )
}

function SelectorShell({
  kind, rangeLong, rangeShort, onPrev, onNext, canPrev, canNext,
}: {
  kind: string; rangeLong: string; rangeShort: string
  onPrev: () => void; onNext: () => void
  canPrev: boolean; canNext: boolean
}) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      border: '1px solid var(--paper-2)', borderRadius: 8,
      background: 'var(--paper-1)', overflow: 'hidden',
    }}>
      <button
        onClick={onPrev}
        disabled={!canPrev}
        style={{
          background: 'transparent', border: 0, padding: '7px 10px',
          cursor: canPrev ? 'pointer' : 'not-allowed',
          color: canPrev ? 'var(--ink)' : 'var(--ink-4)',
          display: 'inline-flex', alignItems: 'center',
        }}
      >
        <ChevronLeft size={14} />
      </button>
      <div style={{ padding: '6px 14px', borderInline: '1px solid var(--paper-2)', minWidth: 220, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.2 }}>
          {kind} <span style={{ color: 'var(--ink-2)' }}>{rangeLong}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', marginTop: 1 }}>
          {rangeShort}
        </div>
      </div>
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          background: 'transparent', border: 0, padding: '7px 10px',
          cursor: canNext ? 'pointer' : 'not-allowed',
          color: canNext ? 'var(--ink)' : 'var(--ink-4)',
          display: 'inline-flex', alignItems: 'center',
        }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function Tabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [bar, setBar] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const el = refs.current[value]
    if (!el || !el.parentElement) return
    const pr = el.parentElement.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    setBar({ left: r.left - pr.left, width: r.width })
  }, [value])

  return (
    <div style={{ position: 'relative', display: 'inline-flex', gap: 4, borderBottom: '1px solid var(--paper-2)' }}>
      {TABS.map((t) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[t.id] = el }}
          onClick={() => onChange(t.id)}
          style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            padding: '12px 16px',
            fontFamily: 'var(--font-sans)', fontSize: 14.5,
            fontWeight: value === t.id ? 500 : 400,
            color: value === t.id ? 'var(--ink)' : 'var(--ink-2)',
            transition: 'color var(--dur) var(--ease)',
            position: 'relative',
          }}
        >
          {t.label}
        </button>
      ))}
      <span style={{
        position: 'absolute', bottom: -1, height: 2,
        background: 'var(--terra)',
        left: bar.left, width: bar.width,
        transition: 'left var(--dur-slow) var(--ease), width var(--dur-slow) var(--ease)',
        borderRadius: 2,
      }} />
    </div>
  )
}

// ─── FadeIn ──────────────────────────────────────────────────────────────────

function FadeIn({ children, deps }: { children: React.ReactNode; deps: unknown[] }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(6px)',
      transition: 'opacity var(--dur-slow) var(--ease), transform var(--dur-slow) var(--ease)',
    }}>
      {children}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function AnalyticsView() {
  const [tab, setTab] = useState<Tab>('semaine')
  const [weekOffset,  setWeekOffset]  = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)

  return (
    <div style={{ padding: '32px 48px 64px', maxWidth: 1180, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={labelStyle}>analyse · ta vie en chiffres, doucement</span>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 500,
            color: 'var(--ink)', letterSpacing: '-0.015em',
            margin: '6px 0 12px', lineHeight: 1.05,
          }}>
            Ce que disent les chiffres<span style={{ color: 'var(--terra)' }}>.</span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 18,
            color: 'var(--ink-2)', margin: 0, maxWidth: '60ch', lineHeight: 1.45,
          }}>
            « Tout ce que tu as posé ici, mis bout à bout — pour mieux voir où tu en es, et où tu vas. »
          </p>
        </div>
        <div style={{ flexShrink: 0 }}>
          <PeriodSelector
            tab={tab}
            weekOffset={weekOffset}
            monthOffset={monthOffset}
            onWeekChange={setWeekOffset}
            onMonthChange={setMonthOffset}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Tabs value={tab} onChange={setTab} />
      </div>

      {/* Content */}
      <FadeIn deps={[tab, tab === 'mois' ? monthOffset : weekOffset]}>
        {tab === 'semaine'  && <AnalyticsWeek weekOffset={weekOffset} />}
        {tab === 'mois'     && <AnalyticsMonth monthOffset={monthOffset} />}
        {tab === 'insights' && <AnalyticsInsights weekOffset={weekOffset} />}
      </FadeIn>
    </div>
  )
}
