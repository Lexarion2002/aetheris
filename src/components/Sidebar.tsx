import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useLawStore } from '../store/lawStore'
import { useCareerStore } from '../store/careerStore'
import { getDomainColors } from '../utils/domainColors'
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
  law: { grandOralDate: string | null; rapportDate: string | null },
  career: { missions: Array<{ deadline: string | null }> },
): UrgencyLevel {
  const domainTasks = tasks.filter(
    (t) => t.domainId === domain.id && t.status !== 'done' && t.status !== 'cancelled',
  )
  const today = new Date().toISOString().split('T')[0]

  if (domainTasks.some((t) => t.dueDate && t.dueDate <= today)) return 'critical'

  const name = domain.name.trim().toLowerCase()

  if (name === 'droit') {
    const go = daysUntil(law.grandOralDate)
    const rp = daysUntil(law.rapportDate)
    if ((go !== null && go <= 7) || (rp !== null && rp <= 7)) return 'critical'
    if ((go !== null && go <= 21) || (rp !== null && rp <= 21)) return 'important'
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

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  onNavigate?: () => void
  onSearch?:   () => void
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
    'focus-visible:ring-1 focus-visible:ring-teal-500/50',
    isActive
      ? 'bg-zinc-800 text-zinc-100 font-medium'
      : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300',
  ].join(' ')

const sectionLabel = (text: string) => (
  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-700">
    {text}
  </p>
)

export function Sidebar({ onNavigate, onSearch }: SidebarProps) {
  const navigate = useNavigate()
  const domains  = useStore((s) => s.domains)
  const tasks    = useStore((s) => s.tasks)
  const law      = useLawStore()
  const career   = useCareerStore()

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col bg-zinc-950 border-r border-zinc-800/40 py-4 px-3 gap-0.5 overflow-y-auto">

      {/* ── Brand ──────────────────────────────────────────────────────────────── */}
      <button
        onClick={() => { navigate('/dashboard'); onNavigate?.() }}
        className="mb-3 flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-zinc-800/60 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-teal-500/25 bg-teal-500/12 text-xs text-teal-400 select-none">
          ✦
        </span>
        <span className="text-sm font-semibold text-zinc-200 tracking-tight">Aetheris</span>
      </button>

      {/* ── Search ─────────────────────────────────────────────────────────────── */}
      <button
        onClick={onSearch}
        className="mb-3 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 transition-all duration-150 outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50"
      >
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Rechercher</span>
        <span className="ml-auto text-[10px] text-zinc-700 font-mono">⌘K</span>
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
          const colors  = getDomainColors(domain.color)
          const urgency = computeDomainUrgency(domain, tasks, law, career)
          return (
            <NavLink
              key={domain.id}
              to={`/domain/${domain.id}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
                  'focus-visible:ring-1 focus-visible:ring-teal-500/50',
                  isActive
                    ? `${colors.bgMuted} ${colors.text} font-medium`
                    : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300',
                ].join(' ')
              }
            >
              <span className="text-sm w-4 text-center shrink-0">{domain.icon}</span>
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
              'focus-visible:ring-1 focus-visible:ring-teal-500/50',
              isActive
                ? 'bg-yellow-500/15 text-yellow-400 font-medium'
                : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300',
            ].join(' ')
          }
        >
          <span className="text-sm w-4 text-center shrink-0">💶</span>
          <span className="truncate">Finances</span>
        </NavLink>
        {/* Musique — page standalone */}
        <NavLink to="/musique" onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150 outline-none',
              'focus-visible:ring-1 focus-visible:ring-teal-500/50',
              isActive
                ? 'bg-purple-500/15 text-purple-400 font-medium'
                : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300',
            ].join(' ')
          }
        >
          <span className="text-sm w-4 text-center shrink-0">🎵</span>
          <span className="truncate">Musique</span>
        </NavLink>
      </div>

      {/* ── Spacer ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Autres ─────────────────────────────────────────────────────────────── */}
      <div className="mt-4 border-t border-zinc-800/40 pt-4 space-y-0.5">
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
