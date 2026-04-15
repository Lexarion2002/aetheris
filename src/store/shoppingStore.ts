import type { ShoppingItem, BoughtItem, ShoppingCategory, ShoppingVerdict } from '../types'
import { createPersistedStore } from '../lib/persistenceManager'

// ─── State ────────────────────────────────────────────────────────────────────

interface ShoppingState {
  wishlist:   ShoppingItem[]
  bought:     BoughtItem[]
  categories: ShoppingCategory[]

  addWishlistItem:    (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => ShoppingItem
  updateWishlistItem: (id: string, updates: Partial<Omit<ShoppingItem, 'id' | 'createdAt'>>) => void
  removeWishlistItem: (id: string) => void
  buyItem:            (id: string, pricePaid: number, boughtDate: string, verdict: ShoppingVerdict) => void

  updateBoughtItem:   (id: string, updates: Partial<Pick<BoughtItem, 'verdict' | 'pricePaid' | 'boughtDate' | 'notes'>>) => void
  removeBoughtItem:   (id: string) => void

  addCategory:    (name: string, color: string) => ShoppingCategory
  updateCategory: (id: string, updates: Partial<Omit<ShoppingCategory, 'id'>>) => void
  deleteCategory: (id: string) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useShoppingStore = createPersistedStore<ShoppingState>(
  'aetheris-shopping-v1',
  (set, get) => ({
      wishlist:   [],
      bought:     [],
      categories: [],

      addWishlistItem: (item) => {
        const newItem: ShoppingItem = {
          id:        crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...item,
        }
        set((s) => ({ wishlist: [newItem, ...s.wishlist] }))
        return newItem
      },

      updateWishlistItem: (id, updates) =>
        set((s) => ({
          wishlist: s.wishlist.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      removeWishlistItem: (id) =>
        set((s) => ({ wishlist: s.wishlist.filter((i) => i.id !== id) })),

      buyItem: (id, pricePaid, boughtDate, verdict) => {
        const item = get().wishlist.find((i) => i.id === id)
        if (!item) return
        const boughtItem: BoughtItem = { ...item, pricePaid, boughtDate, verdict }
        set((s) => ({
          wishlist: s.wishlist.filter((i) => i.id !== id),
          bought:   [boughtItem, ...s.bought],
        }))
      },

      updateBoughtItem: (id, updates) =>
        set((s) => ({
          bought: s.bought.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      removeBoughtItem: (id) =>
        set((s) => ({ bought: s.bought.filter((i) => i.id !== id) })),

      addCategory: (name, color) => {
        const cat: ShoppingCategory = { id: crypto.randomUUID(), name, color }
        set((s) => ({ categories: [...s.categories, cat] }))
        return cat
      },

      updateCategory: (id, updates) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          wishlist:   s.wishlist.map((i) => i.categoryId === id ? { ...i, categoryId: undefined } : i),
          bought:     s.bought.map((i)   => i.categoryId === id ? { ...i, categoryId: undefined } : i),
        })),
  }),
)
