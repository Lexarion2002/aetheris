import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { getDomainColors } from '../utils/domainColors'
import { signOut } from '../lib/supabaseAuth'
import { isSupabaseReady } from '../lib/supabase'

const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Dashboard',   subtitle: "Vue d'ensemble de tous vos domaines" },
  '/focus':      { title: 'Focus',       subtitle: 'Analytique des sessions de concentration' },
  '/objectives': { title: 'Objectifs',   subtitle: 'Suivi de vos objectifs par domaine' },
  '/finances':   { title: 'Finances',    subtitle: 'Budgets, dépenses et statistiques' },
  '/analytics':  { title: 'Analytics',   subtitle: 'Performances hebdomadaires et mensuelles' },
  '/week':       { title: 'Semaine',     subtitle: 'Calendrier hebdomadaire des tâches' },
  '/settings':   { title: 'Paramètres', subtitle: "Configuration de l'application" },
}

interface HeaderProps {
  onMenuToggle: () => void
  onSearchOpen: () => void
}

export function Header({ onMenuToggle, onSearchOpen }: HeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const domains  = useStore((s) => s.domains)

  const domainMatch  = location.pathname.match(/^\/domain\/(.+)$/)
  const activeDomain = domainMatch ? domains.find((d) => d.id === domainMatch[1]) : null
  const colors       = activeDomain ? getDomainColors(activeDomain.color) : null
  const meta         = ROUTE_META[location.pathname]

  const title    = activeDomain?.name         ?? meta?.title    ?? 'Aetheris'
  const subtitle = activeDomain?.description  ?? meta?.subtitle ?? ''

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-zinc-800/60 bg-zinc-950/80 px-4 backdrop-blur-sm">
      {/* Mobile menu */}
      <button
        onClick={onMenuToggle}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect y="2"    width="16" height="1.5" rx="0.75" />
          <rect y="7.25" width="16" height="1.5" rx="0.75" />
          <rect y="12.5" width="16" height="1.5" rx="0.75" />
        </svg>
      </button>

      {/* Title / Logo — cliquable → accueil */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {activeDomain && (
          <span className={['hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base', colors!.bg].join(' ')}>
            {activeDomain.icon}
          </span>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="min-w-0 text-left hover:opacity-70 transition-opacity"
        >
          <h1 className={['text-sm font-semibold truncate', colors ? colors.text : 'text-zinc-100'].join(' ')}>
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-xs text-zinc-500 truncate leading-none mt-0.5">{subtitle}</p>
          )}
        </button>
      </div>

      {/* Search button */}
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
        aria-label="Rechercher (Cmd+K)"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-zinc-700 px-1 text-[9px] text-zinc-600">⌘K</kbd>
      </button>

      {/* Logout button (Supabase only) */}
      {isSupabaseReady() && (
        <button
          onClick={() => signOut()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Se déconnecter"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      )}
    </header>
  )
}
