import { NavLink, useNavigate } from 'react-router-dom'
import { Landmark, ShoppingBag, BookOpen, Film, Circle, Briefcase, PenLine, Scale, Music } from 'lucide-react'
import { useStore } from '../store'
import { useLawStore } from '../store/lawStore'
import { useCareerStore } from '../store/careerStore'
import { getDomainIcon } from '../utils/domainColors'
import type { Domain, Task } from '../types'

// ─── Urgency helpers ──────────────────────────────────────────────────────────

type UrgencyLevel = 'critical' | 'important' | 'normal'

const daysUntil = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function computeDomainUrgency(
  domain: Domain,
  tasks: Task[],
  law: { keyDates: Array<{ date: string }> },
  career: { missions: Array<{ deadline: string | null }> },
): UrgencyLevel {
  const domainTasks = tasks.filter(
    (t) => t.domainId === domain.id && t.status !== 'done' && t.status !== 'cancelled',
  )
  const today = new Date().toISOString().split('T')[0]

  if (domainTasks.some((t) => t.dueDate && t.dueDate <= today)) return 'critical'

  const name = domain.name.trim().toLowerCase()

  if (name === 'droit') {
    const lawDays = law.keyDates
      .map((keyDate) => daysUntil(keyDate.date))
      .filter((d): d is number => d !== null && d >= 0)
    if (lawDays.some((d) => d <= 7)) return 'critical'
    if (lawDays.some((d) => d <= 21)) return 'important'
  }

  if (name === 'carrière') {
    const mDays = career.missions
      .filter((m) => m.deadline)
      .map((m) => daysUntil(m.deadline))
      .filter((d): d is number => d !== null && d >= 0)
    if (mDays.some((d) => d <= 2)) return 'critical'
    if (mDays.some((d) => d <= 7)) return 'important'
  }

  if (
    domainTasks.some((t) => {
      const d = daysUntil(t.dueDate)
      return d !== null && d >= 0 && d <= 7
    })
  )
    return 'important'

  return 'normal'
}

function UrgencyDot({ level }: { level: UrgencyLevel }) {
  if (level === 'normal') return null
  return (
    <span
      className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${
        level === 'critical' ? 'bg-red-400' : 'bg-amber-400'
      }`}
    />
  )
}

function DomainNavIcon({ domain }: { domain: Domain }) {
  const Icon = getDomainIcon(domain.name) ?? Circle
  return <Icon size={14} className="shrink-0" />
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  onNavigate?: () => void
  onSearch?:   () => void
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
    'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
    isActive
      ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
      : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
  ].join(' ')

const sectionLabel = (text: string) => (
  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-subtle)]">
    {text}
  </p>
)

export function Sidebar({ onNavigate, onSearch }: SidebarProps) {
  const navigate = useNavigate()
  const domains  = useStore((s) => s.domains)
  const tasks    = useStore((s) => s.tasks)
  const law      = useLawStore()
  const career   = useCareerStore()
  const hasWritingDomain = domains.some((domain) => domain.name.trim().toLowerCase() === 'écriture')
  const hasLawDomain = domains.some((domain) => domain.name.trim().toLowerCase() === 'droit')
  const hasMusicDomain = domains.some((domain) => domain.name.trim().toLowerCase() === 'musique')

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col bg-[var(--bg-elev)] border-r border-[var(--border)] py-4 px-3 gap-0.5 overflow-y-auto">

      {/* ── Brand ──────────────────────────────────────────────────────────────── */}
      <button
        onClick={() => { navigate('/dashboard'); onNavigate?.() }}
        className="mb-3 flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-[var(--paper-2)] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--terra-soft)] bg-[var(--terra-soft)] text-xs text-[var(--terra)] select-none">
          ✦
        </span>
        <span className="text-sm font-semibold text-[var(--fg)] tracking-tight">Aetheris</span>
      </button>

      {/* ── Search ─────────────────────────────────────────────────────────────── */}
      <button
        onClick={onSearch}
        className="mb-3 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)] transition-all duration-150 outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]"
      >
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Rechercher</span>
        <span className="ml-auto text-[10px] text-[var(--fg-subtle)] font-mono">⌘K</span>
      </button>

      {/* ── Navigation principale ───────────────────────────────────────────────── */}
      <div className="space-y-0.5">
        {sectionLabel('Navigation')}
        <NavLink to="/dashboard" end onClick={onNavigate} className={linkCls}>
          <span className="text-xs w-4 text-center">⊹</span>
          Dashboard
        </NavLink>
      </div>

      {/* ── Domaines ────────────────────────────────────────────────────────────── */}
      <div className="mt-4 space-y-0.5">
        {sectionLabel('Domaines')}
        {domains.map((domain) => {
          const urgency = computeDomainUrgency(domain, tasks, law, career)
          return (
            <NavLink
              key={domain.id}
              to={`/domain/${domain.id}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
                  'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
                  isActive
                    ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
                    : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
                ].join(' ')
              }
            >
              <DomainNavIcon domain={domain} />
              <span className="truncate">{domain.name}</span>
              <UrgencyDot level={urgency} />
            </NavLink>
          )
        })}
        {/* Finances — page standalone, listée avec les domaines */}
        <NavLink to="/finances" onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
              'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
              isActive
                ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
                : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
            ].join(' ')
          }
        >
          <Landmark size={14} className="shrink-0" />
          <span className="truncate">Finances</span>
        </NavLink>
        {/* Achats — page standalone */}
        <NavLink to="/achats" onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
              'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
              isActive
                ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
                : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
            ].join(' ')
          }
        >
          <ShoppingBag size={14} className="shrink-0" />
          <span className="truncate">Achats</span>
        </NavLink>
        {/* Cuisine — page standalone */}
        <NavLink to="/cuisine" onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
              'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
              isActive
                ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
                : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
            ].join(' ')
          }
        >
          <span className="text-sm w-4 text-center shrink-0">🍳</span>
          <span className="truncate">Cuisine</span>
        </NavLink>
        {!hasMusicDomain && (
          <NavLink to="/musique" onClick={onNavigate}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
                'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
                isActive
                  ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
              ].join(' ')
            }
          >
            <Music size={14} className="shrink-0" />
            <span className="truncate">Musique</span>
          </NavLink>
        )}
        {/* Livres — page standalone */}
        <NavLink to="/livres" onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
              'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
              isActive
                ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
                : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
            ].join(' ')
          }
        >
          <BookOpen size={14} className="shrink-0" />
          <span className="truncate">Livres</span>
        </NavLink>
        {/* Films & Séries — page standalone */}
        <NavLink to="/films" onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
              'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
              isActive
                ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
                : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
            ].join(' ')
          }
        >
          <Film size={14} className="shrink-0" />
          <span className="truncate">Films & Séries</span>
        </NavLink>
        {/* Cabinet — page standalone */}
        <NavLink to="/cabinet" onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
              'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
              isActive
                ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
                : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
            ].join(' ')
          }
        >
          <Briefcase size={14} className="shrink-0" />
          <span className="truncate">Cabinet</span>
        </NavLink>
        {!hasWritingDomain && (
          <NavLink to="/ecriture" onClick={onNavigate}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
                'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
                isActive
                  ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
              ].join(' ')
            }
          >
            <PenLine size={14} className="shrink-0" />
            <span className="truncate">Écriture</span>
          </NavLink>
        )}
        {!hasLawDomain && (
          <NavLink to="/droit" onClick={onNavigate}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
                'focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]',
                isActive
                  ? 'bg-[var(--paper-3)] text-[var(--fg)] font-medium'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--fg)]',
              ].join(' ')
            }
          >
            <Scale size={14} className="shrink-0" />
            <span className="truncate">Droit</span>
          </NavLink>
        )}
      </div>

      {/* ── Spacer ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Autres ─────────────────────────────────────────────────────────────── */}
      <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-0.5">
        {sectionLabel('Autres')}
        <NavLink to="/week" onClick={onNavigate} className={linkCls}>
          <span className="text-xs w-4 text-center">▦</span>
          Semaine
        </NavLink>
        <NavLink to="/analytics" onClick={onNavigate} className={linkCls}>
          <span className="text-xs w-4 text-center">◈</span>
          Analytics
        </NavLink>
      </div>

      {/* ── Paramètres ─────────────────────────────────────────────────────────── */}
      <div className="mt-1 mb-1">
        <NavLink to="/settings" onClick={onNavigate} className={linkCls}>
          <span className="text-xs w-4 text-center">⚙</span>
          Paramètres
        </NavLink>
      </div>

    </aside>
  )
}
