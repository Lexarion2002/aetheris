import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function ResetPasswordPage() {
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [ready,     setReady]     = useState(false)

  // Supabase envoie le token dans le hash (#access_token=...&type=recovery)
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 6)  { setError('6 caractères minimum'); return }
    if (!supabase) return
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/30 via-zinc-950 to-zinc-950" />
      <div className="relative w-full max-w-sm px-4">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-500/25 bg-teal-500/12 text-lg text-teal-400">✦</div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Aetheris</h1>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/15 text-2xl">✓</div>
              <p className="text-sm font-medium text-zinc-100">Mot de passe mis à jour</p>
              <a href="/dashboard" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                Accéder à l'app →
              </a>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex gap-2">
                {[0,1,2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
              <p className="text-xs text-zinc-500">Vérification du lien…</p>
            </div>
          ) : (
            <>
              <h2 className="mb-4 text-sm font-semibold text-zinc-100">Nouveau mot de passe</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-teal-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">Confirmer</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-teal-500/60 transition-colors"
                  />
                </div>
                {error && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">{error}</p>
                )}
                <button type="submit" disabled={loading} className="mt-1 w-full rounded-lg bg-teal-500 py-2.5 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {loading ? '…' : 'Enregistrer'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
