export const RECIPE_TYPES = ['Toutes', 'Entrée', 'Plat', 'Dessert', 'Snack', 'Boisson', 'Sauce', 'Autre'] as const
export type RecipeTypeDisplay = typeof RECIPE_TYPES[number]

export const RAYONS = ['Fruits & légumes', 'Épicerie', 'Boucherie', 'Produits frais', 'Autre'] as const
export type RayonType = typeof RAYONS[number]

export const CATEGORIE_TO_DISPLAY: Record<string, string> = {
  entree: 'Entrée', plat: 'Plat', dessert: 'Dessert',
  snack: 'Snack', boisson: 'Boisson', sauce: 'Sauce', autre: 'Autre',
}

export const DISPLAY_TO_CATEGORIE: Record<string, string> = {
  'Entrée': 'entree', 'Plat': 'plat', 'Dessert': 'dessert',
  'Snack': 'snack', 'Boisson': 'boisson', 'Sauce': 'sauce', 'Autre': 'autre',
}

export const INGREDIENT_TO_RAYON: Record<string, string> = {
  legume: 'Fruits & légumes', fruit: 'Fruits & légumes', herbe: 'Fruits & légumes',
  cereale: 'Épicerie', legumineuse: 'Épicerie', conserve: 'Épicerie',
  condiment: 'Épicerie', epice: 'Épicerie', huile: 'Épicerie',
  viande: 'Boucherie', poisson: 'Boucherie',
  produit_laitier: 'Produits frais', oeuf: 'Produits frais',
  boisson: 'Épicerie', autre: 'Autre',
}

export const DEFAULT_INGREDIENT_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'legume',          label: 'Légume' },
  { value: 'fruit',           label: 'Fruit' },
  { value: 'viande',          label: 'Viande' },
  { value: 'poisson',         label: 'Poisson' },
  { value: 'produit_laitier', label: 'Produit laitier' },
  { value: 'oeuf',            label: 'Œuf' },
  { value: 'cereale',         label: 'Céréale' },
  { value: 'legumineuse',     label: 'Légumineuse' },
  { value: 'herbe',           label: 'Herbe aromatique' },
  { value: 'epice',           label: 'Épice' },
  { value: 'huile',           label: 'Huile' },
  { value: 'condiment',       label: 'Condiment' },
  { value: 'conserve',        label: 'Conserve' },
  { value: 'boisson',         label: 'Boisson' },
  { value: 'autre',           label: 'Autre' },
]

export function getCategorieLabel(value: string): string {
  return DEFAULT_INGREDIENT_CATEGORIES.find(c => c.value === value)?.label ?? value
}

export function getRayonForCategorie(categorie: string): string {
  return INGREDIENT_TO_RAYON[categorie] ?? 'Autre'
}

export const PLACEHOLDER_TINTS = [
  { bg: 'var(--terra-soft)', ink: '#8E3D1C' },
  { bg: 'var(--sage-soft)',  ink: '#3F5A3C' },
  { bg: 'var(--paper-3)',    ink: 'var(--ink-2)' },
  { bg: '#E5D2B8',           ink: '#6B5B48' },
]
