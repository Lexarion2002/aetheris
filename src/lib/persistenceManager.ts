import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StateCreator } from 'zustand'
import { supabaseStorage, registerStoreKey } from './supabaseSync'

// ─── createPersistedStore ─────────────────────────────────────────────────────
//
// Factory qui remplace le pattern répétitif :
//   create<T>()(persist(creator, { name, storage: createJSONStorage(() => supabaseStorage) }))
//
// Usage :
//   export const useXxxStore = createPersistedStore<XxxState>('aetheris-xxx-v1', (set, get) => ({ ... }))
//
// Fonctionnalités automatiques :
//   • localStorage (source primaire, synchrone)
//   • Supabase (backup cloud asynchrone)
//   • Enregistrement dans le registre de sync offline→online
//   • onRehydrateStorage : appelle state.setHasHydrated(true) si présent dans le state

type PersistCreator<T> = StateCreator<T, [], [['zustand/persist', unknown]]>

export function createPersistedStore<T>(name: string, creator: PersistCreator<T>) {
  registerStoreKey(name)

  return create<T>()(
    persist(creator, {
      name,
      storage: createJSONStorage(() => supabaseStorage),
      onRehydrateStorage: () => (state) => {
        const s = state as Record<string, unknown> | null | undefined
        if (s && typeof s.setHasHydrated === 'function') {
          ;(s.setHasHydrated as (v: boolean) => void)(true)
        }
      },
    }),
  )
}
