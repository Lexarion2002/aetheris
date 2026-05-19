// ─── Recette ──────────────────────────────────────────────────────────────────

export type RecetteCategorie =
  | 'entree' | 'plat' | 'dessert' | 'snack' | 'boisson' | 'sauce' | 'autre'

export interface Recette {
  id:               string
  nom:              string
  categorie:        RecetteCategorie
  tempsPreparation: number    // minutes
  favori:           boolean
  lien?:            string
  image?:           string    // data URL (base64)
  ingredientIds:    string[]
}

// ─── Ingredient ───────────────────────────────────────────────────────────────

export type IngredientCategorie = string  // predefined or custom

export interface Ingredient {
  id:         string
  nom:        string
  categorie:  IngredientCategorie
  quantite?:  string
  disponible: boolean
  recetteIds: string[]
}
