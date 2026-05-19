import { supabase } from './supabase'
import type { StateStorage } from 'zustand/middleware'

// ─── User scope ───────────────────────────────────────────────────────────────
// Le user_id courant est injecté par App.tsx dès que l'auth change.
// Les clés de stockage deviennent `${userId}:${storeName}` pour isoler les données.

let _currentUserId: string | null = null

// Promise résolue au premier appel de setCurrentUserId (qu'il soit connecté ou anonyme).
// getItem attend cette résolution pour calculer la clé scopée correcte.
let _resolveUserId!: () => void
const _userIdReady = new Promise<void>((resolve) => {
  _resolveUserId = resolve
})

export function setCurrentUserId(id: string | null): void {
  _currentUserId = id
  _resolveUserId()   // résout la promise (no-op si déjà résolue)
  console.log('[Supabase] 👤 User ID:', id ?? 'non connecté')
}

export async function waitForUserId(): Promise<void> {
  return _userIdReady
}

function scopedKey(name: string): string {
  return _currentUserId ? `${_currentUserId}:${name}` : name
}

// ─── supabaseStorage — Zustand persist adapter (clé/valeur) ──────────────────

// ─── localStorage quota check ─────────────────────────────────────────────────
// Returns true if localStorage is currently full (can't write new data).
function isLocalStorageFull(): boolean {
  try {
    const testKey = '__aetheris_quota_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return false
  } catch {
    return true
  }
}

export const supabaseStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // Attend que l'auth soit résolue pour calculer la clé scopée correcte.
    await waitForUserId()
    const key = scopedKey(name)

    const local = localStorage.getItem(key)

    if (local) {
      // If localStorage is full, the stale key may be outdated (recent writes failed).
      // Remove it and fall back to Supabase which has the authoritative data.
      if (isLocalStorageFull()) {
        console.warn(`[Supabase] ⚠️ getItem("${key}") — localStorage plein, clé stale supprimée → lecture Supabase`)
        try { localStorage.removeItem(key) } catch {}
        // fall through to Supabase fetch below
      } else {
        console.log(`[Debug] getItem("${key}") — localStorage ✅ ${Math.round(local.length / 1024)}kb`)
        return local
      }
    }

    // localStorage vide (ou vidé ci-dessus) → on lit Supabase
    if (!supabase) return null

    console.log(`[Supabase] 📥 getItem("${key}") — lecture cloud`)
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('value')
        .eq('key', key)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error(`[Supabase] ❌ getItem(${key}) :`, error.code, error.message)
        return null
      }

      const value = Array.isArray(data) ? data[0]?.value : (data as { value?: string } | null)?.value
      if (value) {
        console.log(`[Supabase] ✅ getItem("${key}") — données récupérées (${Math.round(value.length / 1024)}kb)`)
        // Try to cache locally, but don't fail if quota is still full
        try { localStorage.setItem(key, value) } catch {}
        return value
      }

      return null
    } catch (err) {
      console.error(`[Supabase] ❌ getItem(${key}) exception :`, err)
      return null
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const key = scopedKey(name)
    try {
      localStorage.setItem(key, value)
    } catch {
      // Quota exceeded: remove the stale entry so the next getItem falls back to Supabase
      // (which will receive the fresh data below). Without this, stale localStorage
      // would shadow the authoritative Supabase data on the next page load.
      console.warn(`[Supabase] ⚠️ setItem("${key}") — quota localStorage dépassé, clé stale supprimée`)
      try { localStorage.removeItem(key) } catch {}
    }

    if (!supabase) {
      console.warn(`[Supabase] setItem(${name}) — client null, localStorage only`)
      return
    }
    console.log(`[Supabase] 📤 setItem("${key}") — ${Math.round(value.length / 1024)}kb`)
    try {
      const { error } = await supabase
        .from('stores')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        )
      if (error) {
        console.error(`[Supabase] ❌ setItem(${key}) :`, error.code, error.message)
      } else {
        console.log(`[Supabase] ✅ setItem("${key}") — cloud OK`)
      }
    } catch (err) {
      console.error(`[Supabase] ❌ setItem(${key}) exception :`, err)
    }
  },

  removeItem: async (name: string): Promise<void> => {
    const key = scopedKey(name)
    localStorage.removeItem(key)
    if (!supabase) return
    await supabase.from('stores').delete().eq('key', key)
  },
}

// ─── supabaseOnlyStorage — Zustand persist adapter sans localStorage ─────────
// Utilisé pour les stores dont les données peuvent dépasser le quota localStorage
// (ex: images base64). Les lectures et écritures passent uniquement par Supabase.

export const supabaseOnlyStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    await waitForUserId()
    const key = scopedKey(name)
    if (!supabase) return null
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('value')
        .eq('key', key)
        .order('updated_at', { ascending: false })
        .limit(1)
      if (error) {
        console.error(`[Supabase/cloud-only] ❌ getItem(${key}):`, error.message)
        return null
      }
      const value = Array.isArray(data) ? (data[0] as { value?: string })?.value : null
      console.log(`[Supabase/cloud-only] 📥 getItem("${key}") — ${value ? `✅ ${Math.round(value.length / 1024)}kb` : '❌ absent'}`)
      return value ?? null
    } catch (err) {
      console.error(`[Supabase/cloud-only] ❌ getItem(${key}) exception:`, err)
      return null
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const key = scopedKey(name)
    if (!supabase) {
      console.warn(`[Supabase/cloud-only] setItem(${name}) — client null, données perdues`)
      return
    }
    console.log(`[Supabase/cloud-only] 📤 setItem("${key}") — ${Math.round(value.length / 1024)}kb`)
    try {
      const { error } = await supabase
        .from('stores')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) console.error(`[Supabase/cloud-only] ❌ setItem(${key}):`, error.message)
      else console.log(`[Supabase/cloud-only] ✅ setItem("${key}") — cloud OK`)
    } catch (err) {
      console.error(`[Supabase/cloud-only] ❌ setItem(${key}) exception:`, err)
    }
  },

  removeItem: async (name: string): Promise<void> => {
    const key = scopedKey(name)
    if (!supabase) return
    await supabase.from('stores').delete().eq('key', key)
  },
}

// ─── Store registry ───────────────────────────────────────────────────────────
// Chaque store créé via createPersistedStore s'enregistre ici automatiquement.
// Le main store (aetheris-app) est pré-enregistré car il n'utilise pas la factory.

const _storeRegistry = new Set<string>(['aetheris-app'])

export function registerStoreKey(name: string): void {
  _storeRegistry.add(name)
}

// ─── Online/offline watcher ───────────────────────────────────────────────────

export function watchOnlineStatus(): () => void {
  const onOnline = async () => {
    console.log('[Supabase] 🌐 Connexion rétablie — sync en cours...')
    await Promise.all(
      Array.from(_storeRegistry).map(async (k) => {
        const value = localStorage.getItem(scopedKey(k))
        if (value) await supabaseStorage.setItem(k, value)
      }),
    )
    console.log('[Supabase] ✅ Sync blob terminée')
  }

  window.addEventListener('online', onOnline)
  return () => window.removeEventListener('online', onOnline)
}
