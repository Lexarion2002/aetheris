import { createClient } from '@supabase/supabase-js'

// ─── Client ───────────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

console.log('[Supabase] URL  :', supabaseUrl  ? `${supabaseUrl.slice(0, 30)}...`  : '❌ MANQUANTE')
console.log('[Supabase] KEY  :', supabaseKey  ? `${supabaseKey.slice(0, 20)}...`  : '❌ MANQUANTE')

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] ❌ Variables d\'env manquantes — vérifiez .env.local')
} else {
  console.log('[Supabase] ✅ Client initialisé')
}

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

export const isSupabaseReady = () => supabase !== null
