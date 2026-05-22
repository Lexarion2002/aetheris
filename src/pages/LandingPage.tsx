import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export function LandingPage() {
  const navigate   = useNavigate()
  const onboarded  = useStore((s) => s.onboarded)

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-8 text-center overflow-hidden">

      {/* Background subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-teal-500/5 blur-3xl" />

      {/* Content */}
      <div className="relative flex flex-col items-center">

        {/* Symbol */}
        <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-500/20 bg-teal-500/10">
          <span className="text-2xl text-teal-400 select-none">✦</span>
        </div>

        {/* Title */}
        <h1 className="text-6xl font-bold tracking-tight text-zinc-100 sm:text-7xl">
          Aetheris
        </h1>

        {/* Tagline */}
        <p className="mt-4 text-sm font-medium tracking-[0.3em] text-zinc-500 uppercase">
          Lucidité Personnelle
        </p>

        {/* Description */}
        <p className="mt-10 max-w-sm text-base leading-relaxed text-zinc-400">
          Un espace minimaliste pour observer et cultiver les dimensions de ta vie —
          santé, travail, relations, finances — sans friction ni surcharge.
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate(onboarded ? '/planning' : '/onboarding')}
          className="mt-12 rounded-xl bg-teal-500 px-10 py-3.5 text-sm font-semibold text-zinc-950 hover:bg-teal-400 active:scale-95 transition-all duration-150"
        >
          {onboarded ? 'Ouvrir le hub →' : 'Commencer →'}
        </button>

        {/* Sub-text */}
        <p className="mt-5 text-xs text-zinc-700">
          Gratuit · Données locales · Aucun compte requis
        </p>
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 text-xs text-zinc-800 select-none">
        © Aetheris 2026
      </p>
    </div>
  )
}
