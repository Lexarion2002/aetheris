import { NavLink } from 'react-router-dom'
import { getDomainColors } from '../utils/domainColors'
import type { Domain } from '../types'

// ─── NavItem : lien vers un domaine ──────────────────────────────────────────

interface NavItemProps {
  domain: Domain
  collapsed?: boolean
  onClick?: () => void
}

export function NavItem({ domain, collapsed = false, onClick }: NavItemProps) {
  const colors = getDomainColors(domain.color)

  return (
    <NavLink
      to={`/domain/${domain.id}`}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
          'transition-all duration-150 outline-none',
          'focus-visible:ring-2 focus-visible:ring-teal-500/50',
          isActive
            ? `${colors.bg} ${colors.text} ${colors.border} border`
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base',
              'transition-all duration-150',
              isActive ? colors.bg : 'bg-zinc-800 group-hover:bg-zinc-700',
            ].join(' ')}
          >
            {domain.icon}
          </span>

          {!collapsed && (
            <span className="truncate leading-none">{domain.name}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

// ─── NavGroup : section de navigation avec titre ─────────────────────────────

interface NavGroupProps {
  label: string
  children: React.ReactNode
  collapsed?: boolean
}

export function NavGroup({ label, children, collapsed = false }: NavGroupProps) {
  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600 select-none">
          {label}
        </p>
      )}
      {children}
    </div>
  )
}
