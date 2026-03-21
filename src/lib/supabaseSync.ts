import { supabase } from './supabase'
import type { StateStorage } from 'zustand/middleware'
import type { Domain, Task, Transaction } from '../types'
import type { ShoppingItem, BoughtItem } from '../types'

// ─── supabaseStorage — Zustand persist adapter (clé/valeur) ──────────────────

export const supabaseStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!supabase) {
      console.warn(`[Supabase] getItem(${name}) — client null, fallback localStorage`)
      return localStorage.getItem(name)
    }

    console.log(`[Supabase] 📥 getItem("${name}")`)
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('value')
        .eq('key', name)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`[Supabase] "${name}" absent du cloud — lecture localStorage`)
        } else {
          console.error(`[Supabase] ❌ getItem(${name}) :`, error.code, error.message)
        }
        // Migration : si données locales, les pousser vers Supabase
        const local = localStorage.getItem(name)
        if (local) {
          console.log(`[Supabase] 🔄 Migration localStorage → cloud pour "${name}"`)
          await supabaseStorage.setItem(name, local)
        }
        return local
      }

      if (data?.value) {
        console.log(`[Supabase] ✅ getItem("${name}") — données récupérées du cloud`)
        localStorage.setItem(name, data.value)
        return data.value
      }

      return localStorage.getItem(name)
    } catch (err) {
      console.error(`[Supabase] ❌ getItem(${name}) exception :`, err)
      return localStorage.getItem(name)
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    localStorage.setItem(name, value)

    if (!supabase) {
      console.warn(`[Supabase] setItem(${name}) — client null, localStorage only`)
      return
    }

    console.log(`[Supabase] 📤 setItem("${name}") — ${Math.round(value.length / 1024)}kb`)
    try {
      const { error } = await supabase
        .from('stores')
        .upsert(
          { key: name, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        )
      if (error) {
        console.error(`[Supabase] ❌ setItem(${name}) :`, error.code, error.message)
      } else {
        console.log(`[Supabase] ✅ setItem("${name}") — cloud OK`)
      }
    } catch (err) {
      console.error(`[Supabase] ❌ setItem(${name}) exception :`, err)
    }
  },

  removeItem: async (name: string): Promise<void> => {
    localStorage.removeItem(name)
    if (!supabase) return
    await supabase.from('stores').delete().eq('key', name)
  },
}

// ─── Sync row-per-row vers tables structurées ─────────────────────────────────

async function syncTable<T extends { id: string }>(
  tableName: string,
  rows: T[],
  serialize: (item: T) => Record<string, unknown>,
) {
  if (!supabase) return

  console.log(`[Supabase] 📤 syncTable("${tableName}") — ${rows.length} lignes`)

  try {
    if (rows.length > 0) {
      const { error } = await supabase
        .from(tableName)
        .upsert(rows.map(serialize), { onConflict: 'id' })
      if (error) {
        console.error(`[Supabase] ❌ sync ${tableName} :`, error.code, error.message)
        return
      }
      console.log(`[Supabase] ✅ ${tableName} — ${rows.length} lignes upsertées`)
    }

    // Supprime les lignes qui n'existent plus localement
    const ids = rows.map((r) => r.id)
    if (ids.length > 0) {
      await supabase
        .from(tableName)
        .delete()
        .filter('id', 'not.in', `(${ids.join(',')})`)
    } else {
      // Table vide : tout supprimer
      await supabase.from(tableName).delete().gte('created_at', '1970-01-01')
    }
  } catch (err) {
    console.error(`[Supabase] ❌ syncTable(${tableName}) exception :`, err)
  }
}

export interface SyncPayload {
  domains:      Domain[]
  tasks:        Task[]
  transactions: Transaction[]
  wishlist:     ShoppingItem[]
  bought:       BoughtItem[]
}

export async function syncRowsToSupabase(payload: SyncPayload): Promise<void> {
  if (!supabase) {
    console.warn('[Supabase] syncRowsToSupabase — client null, skipping')
    return
  }

  console.log('[Supabase] 🔄 Sync row-per-row démarrée...')

  await Promise.all([
    syncTable('domains', payload.domains, (d) => ({
      id:    d.id,
      name:  d.name,
      color: d.color,
      icon:  d.icon,
    })),

    syncTable('tasks', payload.tasks, (t) => ({
      id:         t.id,
      domain_id:  t.domainId,
      title:      t.title,
      status:     t.status,
      priority:   t.priority,
      due_date:   t.dueDate ?? null,
      created_at: t.createdAt,
    })),

    syncTable('transactions', payload.transactions, (tx) => ({
      id:          tx.id,
      type:        tx.type,
      amount:      tx.amount,
      category_id: tx.category ?? null,
      date:        tx.date,
      notes:       tx.notes ?? null,
      created_at:  tx.createdAt,
    })),

    syncTable('shopping_items', [
      ...payload.wishlist.map((i) => ({ ...i, _status: 'wishlist' as const })),
      ...payload.bought.map((i)   => ({ ...i, _status: 'bought'   as const })),
    ], (i) => ({
      id:          i.id,
      name:        i.name,
      brand:       i.brand       ?? null,
      price:       i.price,
      link:        i.link        ?? null,
      category_id: i.categoryId  ?? null,
      priority:    i.priority,
      notes:       i.notes       ?? null,
      status:      i._status,
      bought_date: ('boughtDate' in i) ? (i as BoughtItem).boughtDate : null,
      price_paid:  ('pricePaid'  in i) ? (i as BoughtItem).pricePaid  : null,
      verdict:     ('verdict'    in i) ? (i as BoughtItem).verdict     : null,
      created_at:  i.createdAt,
    })),
  ])

  console.log('[Supabase] ✅ Sync row-per-row terminée')
}

// ─── Online/offline watcher ───────────────────────────────────────────────────

const STORE_KEYS = ['aetheris-app', 'aetheris-music-v1', 'aetheris-shopping-v1', 'aetheris-cuisine-v1']

export function watchOnlineStatus(): () => void {
  const onOnline = async () => {
    console.log('[Supabase] 🌐 Connexion rétablie — sync en cours...')
    await Promise.all(
      STORE_KEYS.map(async (k) => {
        const value = localStorage.getItem(k)
        if (value) await supabaseStorage.setItem(k, value)
      }),
    )
    console.log('[Supabase] ✅ Sync blob terminée')
  }

  window.addEventListener('online', onOnline)
  return () => window.removeEventListener('online', onOnline)
}
