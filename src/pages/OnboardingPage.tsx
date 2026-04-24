import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { DEFAULT_DOMAINS } from '../store/defaults'
import { getDomainColors, getDomainIcon } from '../utils/domainColors'

export function OnboardingPage() {
  const navigate              = useNavigate()
  const addDomain             = useStore((s) => s.addDomain)
  const completeOnboarding    = useStore((s) => s.completeOnboarding)

  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_DOMAINS.map((d) => d.id)))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })

  const handleStart = () => {
    DEFAULT_DOMAINS
      .filter((d) => selected.has(d.id))
      .forEach(({ id: _id, ...rest }) => addDomain(rest))
    completeOnboarding()
    navigate('/dashboard')
  }

  const handleSkip = () => {
    completeOnboarding()
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 px-6 py-16">

      {/* Header */}
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="mb-3 text-lg text-teal-400 select-none">✦</div>
        <h1 className="text-2xl font-semibold text-zinc-100">
          Quels domaines de vie veux-tu suivre ?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          Sélectionne au moins un domaine. Tu pourras en ajouter ou supprimer à tout moment depuis les paramètres.
        </p>
      </div>

      {/* Domain grid */}
      <div className="mx-auto mt-10 w-full max-w-xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {DEFAULT_DOMAINS.map((domain) => {
            const isSelected = selected.has(domain.id)
            const colors     = getDomainColors(domain.color)
            const DomainIcon = getDomainIcon(domain.name)

            return (
              <button
                key={domain.id}
                onClick={() => toggle(domain.id)}
                className={[
                  'flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-150 outline-none',
                  'focus-visible:ring-2 focus-visible:ring-teal-500/50',
                  isSelected
                    ? `${colors.border} ${colors.bgMuted}`
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900',
                ].join(' ')}
              >
                <span className={[
                  'flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all',
                  isSelected ? colors.bg : 'bg-zinc-800',
                ].join(' ')}>
                  {DomainIcon ? <DomainIcon size={24} /> : domain.icon}
                </span>

                <div>
                  <p className={[
                    'text-sm font-medium leading-tight',
                    isSelected ? colors.text : 'text-zinc-300',
                  ].join(' ')}>
                    {domain.name}
                  </p>
                  <p className="mt-1 text-[10px] leading-tight text-zinc-600 line-clamp-2">
                    {domain.description}
                  </p>
                </div>

                {/* Checkmark */}
                {isSelected && (
                  <div className={['absolute top-2.5 right-2.5 h-4 w-4 rounded-full flex items-center justify-center text-[9px]', colors.bg, colors.text].join(' ')}>
                    ✓
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="mx-auto mt-10 flex w-full max-w-xl flex-col items-center gap-4">
        <button
          onClick={handleStart}
          disabled={selected.size === 0}
          className="w-full rounded-xl bg-teal-500 py-3.5 text-sm font-semibold text-zinc-950 hover:bg-teal-400 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[.99] transition-all duration-150"
        >
          {selected.size === 0
            ? 'Sélectionne au moins un domaine'
            : `Créer ${selected.size} espace${selected.size > 1 ? 's' : ''} →`}
        </button>

        <button
          onClick={handleSkip}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
        >
          Commencer sans domaine
        </button>
      </div>
    </div>
  )
}
