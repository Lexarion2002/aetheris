import { useState } from 'react'
import { signInWithEmail, signUpWithEmail, resetPassword } from '../lib/supabaseAuth'

// ─── AuthModal ────────────────────────────────────────────────────────────────

interface AuthModalProps {
  onSuccess: () => void
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [mode,     setMode]     = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signin') {
      const { user, error } = await signInWithEmail(email, password)
      if (error) { setError(error); setLoading(false); return }
      if (user)  { onSuccess() }
    } else if (mode === 'signup') {
      const { error } = await signUpWithEmail(email, password)
      if (error) { setError(error); setLoading(false); return }
      setDone(true)
    } else {
      const { error } = await resetPassword(email)
      if (error) { setError(error); setLoading(false); return }
      setDone(true)
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/30 via-zinc-950 to-zinc-950" />

      <div className="relative w-full max-w-sm px-4">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-500/25 bg-teal-500/12 text-lg text-teal-400">
            ✦
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Aetheris</h1>
          <p className="text-xs text-zinc-500">Votre espace personnel</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/15 text-2xl">
                ✉️
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  {mode === 'reset' ? 'Email envoyé' : 'Vérifiez votre email'}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {mode === 'reset'
                    ? <>Un lien de réinitialisation a été envoyé à <span className="text-zinc-300">{email}</span></>
                    : <>Un lien de confirmation a été envoyé à <span className="text-zinc-300">{email}</span></>
                  }
                </p>
              </div>
              <button
                onClick={() => { setDone(false); setMode('signin') }}
                className="mt-2 text-xs text-teal-400 hover:text-teal-300 transition-colors"
              >
                ← Retour à la connexion
              </button>
            </div>
          ) : mode === 'reset' ? (
            <>
              <button onClick={() => { setMode('signin'); setError(null) }} className="mb-4 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                ← Retour
              </button>
              <p className="mb-4 text-sm text-zinc-300">Entrez votre email pour recevoir un lien de réinitialisation.</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="vous@exemple.com"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-teal-500/60 transition-colors"
                  />
                </div>
                {error && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">{error}</p>
                )}
                <button type="submit" disabled={loading} className="mt-1 w-full rounded-lg bg-teal-500 py-2.5 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {loading ? '...' : 'Envoyer le lien'}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Tabs */}
              <div className="mb-5 flex rounded-lg bg-zinc-800 p-1">
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(null) }}
                    className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                      mode === m ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {m === 'signin' ? 'Se connecter' : 'S\'inscrire'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="vous@exemple.com"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-teal-500/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-teal-500/60 transition-colors"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">{error}</p>
                )}

                <button type="submit" disabled={loading} className="mt-1 w-full rounded-lg bg-teal-500 py-2.5 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {loading ? '...' : mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
                </button>

                {mode === 'signin' && (
                  <button type="button" onClick={() => { setMode('reset'); setError(null) }} className="text-xs text-zinc-500 hover:text-teal-400 transition-colors text-center">
                    Mot de passe oublié ?
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
