import { supabase } from './supabase'
import type { User, AuthError } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthResult {
  user:  User | null
  error: string | null
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { user: null, error: 'Supabase non configuré' }
  const { data, error } = await supabase.auth.signUp({ email, password })
  return {
    user:  data.user ?? null,
    error: formatError(error),
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { user: null, error: 'Supabase non configuré' }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return {
    user:  data.user ?? null,
    error: formatError(error),
  }
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user ?? null
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatError(error: AuthError | null): string | null {
  if (!error) return null
  switch (error.message) {
    case 'Invalid login credentials':         return 'Email ou mot de passe incorrect'
    case 'User already registered':           return 'Cet email est déjà utilisé'
    case 'Password should be at least 6 characters': return 'Mot de passe trop court (6 caractères min)'
    case 'Unable to validate email address: invalid format': return 'Format d\'email invalide'
    default: return error.message
  }
}
