import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { getDomainIcon } from '../utils/domainColors'
import { signOut } from '../lib/supabaseAuth'
import { isSupabaseReady } from '../lib/supabase'

const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Dashboard',   subtitle: "Vue d'ensemble de tous vos domaines" },
  '/focus':      { title: 'Focus',       subtitle: 'Analytique des sessions de concentration' },
  '/finances':   { title: 'Finances',    subtitle: 'Budgets, dépenses et statistiques' },
  '/analytics':  { title: 'Analytics',   subtitle: 'Performances hebdomadaires et mensuelles' },
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

  const domainMatch      = location.pathname.match(/^\/domain\/(.+)$/)
  const activeDomain     = domainMatch ? domains.find((d) => d.id === domainMatch[1]) : null
  const ActiveDomainIcon = activeDomain ? getDomainIcon(activeDomain.name) : null
  const meta             = ROUTE_META[location.pathname]

  const title    = activeDomain?.name         ?? meta?.title    ?? 'Aetheris'
  const subtitle = activeDomain?.description  ?? meta?.subtitle ?? ''

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[var(--bg-elev)] px-4 backdrop-blur-sm">
      {/* Mobile menu */}
      <button
        onClick={onMenuToggle}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--paper-2)] transition-colors lg:hidden"
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
        {activeDomain && ActiveDomainIcon && (
          <span className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--paper-3)] text-[var(--fg-muted)]">
            <ActiveDomainIcon size={16} />
          </span>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="min-w-0 text-left hover:opacity-70 transition-opacity"
        >
          <h1 className="text-sm font-semibold truncate text-[var(--fg)]">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-xs text-[var(--fg-muted)] truncate leading-none mt-0.5">{subtitle}</p>
          )}
        </button>
      </div>

      {/* Search button */}
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1.5 text-xs text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)] transition-colors"
        aria-label="Rechercher (Cmd+K)"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-[var(--border-strong)] px-1 text-[9px] text-[var(--fg-subtle)]">⌘K</kbd>
      </button>

      {/* Logout button (Supabase only) */}
      {isSupabaseReady() && (
        <button
          onClick={() => signOut()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:bg-[var(--paper-2)] transition-colors"
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
