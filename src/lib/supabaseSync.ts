import { supabase } from './supabase'
import type { StateStorage } from 'zustand/middleware'

// ─── User scope ───────────────────────────────────────────────────────────────
// Le user_id courant est injecté par App.tsx dès que l'auth change.
// Les clés de stockage deviennent `${userId}:${storeName}` pour isoler les données.

let _currentUserId: string | null = null

export function setCurrentUserId(id: string | null): void {
  _currentUserId = id
  console.log('[Supabase] 👤 User ID:', id ?? 'non connecté')
}

function scopedKey(name: string): string {
  return _currentUserId ? `${_currentUserId}:${name}` : name
}

// ─── supabaseStorage — Zustand persist adapter (clé/valeur) ──────────────────

export const supabaseStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // localStorage est toujours synchrone et à jour → source principale
    const local = localStorage.getItem(name)
    if (local) return local

    // localStorage vide → premier chargement sur un nouvel appareil, on lit Supabase
    if (!supabase) return null

    const key = scopedKey(name)
    console.log(`[Supabase] 📥 getItem("${key}") — localStorage vide, lecture cloud`)
    try {
      // .limit(1) + order au lieu de .single() pour éviter l'erreur 406
      // quand des lignes dupliquées existent (e.g. après un bug de re-render)
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
        console.log(`[Supabase] ✅ getItem("${key}") — données récupérées du cloud`)
        localStorage.setItem(name, value)
        return value
      }

      return null
    } catch (err) {
      console.error(`[Supabase] ❌ getItem(${name}) exception :`, err)
      return null
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    localStorage.setItem(name, value)

    if (!supabase) {
      console.warn(`[Supabase] setItem(${name}) — client null, localStorage only`)
      return
    }

    const key = scopedKey(name)
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
    localStorage.removeItem(name)
    if (!supabase) return
    await supabase.from('stores').delete().eq('key', scopedKey(name))
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
        const value = localStorage.getItem(k)
        if (value) await supabaseStorage.setItem(k, value)
      }),
    )
    console.log('[Supabase] ✅ Sync blob terminée')
  }

  window.addEventListener('online', onOnline)
  return () => window.removeEventListener('online', onOnline)
}
