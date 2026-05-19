import type { Recette, Ingredient } from '../types/cuisine'
import { createPersistedStore } from '../lib/persistenceManager'

// ─── State ────────────────────────────────────────────────────────────────────

interface CuisineState {
  recettes:    Recette[]
  ingredients: Ingredient[]
  customIngredientCategories: string[]

  // Recette actions
  addRecette:    (r: Omit<Recette, 'id'>) => Recette
  updateRecette: (id: string, updates: Partial<Omit<Recette, 'id'>>) => void
  deleteRecette: (id: string) => void

  // Ingredient actions
  addIngredient:    (i: Omit<Ingredient, 'id'>) => Ingredient
  updateIngredient: (id: string, updates: Partial<Omit<Ingredient, 'id'>>) => void
  deleteIngredient: (id: string) => void
  toggleDisponible: (id: string) => void

  // Custom categories
  addIngredientCategory:    (name: string) => void
  removeIngredientCategory: (name: string) => void

  // Liste de courses (kept for backward compat)
  listeCourses:           string[]
  addToListeCourses:      (recetteId: string) => void
  removeFromListeCourses: (recetteId: string) => void
  clearListeCourses:      () => void
  generateListeCourses:   (recetteId: string) => Ingredient[]
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCuisineStore = createPersistedStore<CuisineState>(
  'aetheris-cuisine-v1',
  (set, get) => ({
      recettes:    [],
      ingredients: [],
      customIngredientCategories: [],
      listeCourses: [],

      // ── Recette ──────────────────────────────────────────────────────────────

      addRecette: (r) => {
        const newRecette: Recette = { id: crypto.randomUUID(), ...r }
        set((s) => ({ recettes: [newRecette, ...s.recettes] }))
        return newRecette
      },

      updateRecette: (id, updates) =>
        set((s) => ({
          recettes: s.recettes.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      deleteRecette: (id) =>
        set((s) => {
          const recette = s.recettes.find((r) => r.id === id)
          const linkedIds = new Set(recette?.ingredientIds ?? [])

          // Delete ingredients that become orphaned, update the rest
          const updatedIngredients = s.ingredients
            .filter((i) => {
              if (!linkedIds.has(i.id)) return true
              // Keep if still linked to other recipes
              return i.recetteIds.filter((rId) => rId !== id).length > 0
            })
            .map((i) => ({ ...i, recetteIds: i.recetteIds.filter((rId) => rId !== id) }))

          return {
            recettes:     s.recettes.filter((r) => r.id !== id),
            listeCourses: s.listeCourses.filter((rId) => rId !== id),
            ingredients:  updatedIngredients,
          }
        }),

      // ── Ingredient ───────────────────────────────────────────────────────────

      addIngredient: (i) => {
        const newIngredient: Ingredient = { id: crypto.randomUUID(), ...i }
        set((s) => ({ ingredients: [newIngredient, ...s.ingredients] }))
        return newIngredient
      },

      updateIngredient: (id, updates) =>
        set((s) => ({
          ingredients: s.ingredients.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      deleteIngredient: (id) =>
        set((s) => ({
          ingredients: s.ingredients.filter((i) => i.id !== id),
          // Nettoyer l'ingredientId dans les recettes liées
          recettes:    s.recettes.map((r) => ({
            ...r,
            ingredientIds: r.ingredientIds.filter((iId) => iId !== id),
          })),
        })),

      toggleDisponible: (id) =>
        set((s) => ({
          ingredients: s.ingredients.map((i) =>
            i.id === id ? { ...i, disponible: !i.disponible } : i,
          ),
        })),

      // ── Custom categories ─────────────────────────────────────────────────────

      addIngredientCategory: (name) =>
        set((s) => {
          if (s.customIngredientCategories.includes(name)) return s
          return { customIngredientCategories: [...s.customIngredientCategories, name] }
        }),

      removeIngredientCategory: (name) =>
        set((s) => ({
          customIngredientCategories: s.customIngredientCategories.filter((c) => c !== name),
        })),

      // ── Liste de courses ─────────────────────────────────────────────────────

      addToListeCourses: (recetteId) =>
        set((s) =>
          s.listeCourses.includes(recetteId)
            ? s
            : { listeCourses: [...s.listeCourses, recetteId] },
        ),

      removeFromListeCourses: (recetteId) =>
        set((s) => ({ listeCourses: s.listeCourses.filter((id) => id !== recetteId) })),

      clearListeCourses: () => set({ listeCourses: [] }),

      generateListeCourses: (recetteId) => {
        const { recettes, ingredients } = get()
        const recette = recettes.find((r) => r.id === recetteId)
        if (!recette) return []
        return ingredients.filter(
          (i) => recette.ingredientIds.includes(i.id) && !i.disponible,
        )
      },
  }),
)
