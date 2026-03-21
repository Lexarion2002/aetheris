import type { Domain, FinanceCategory } from '../types'

export const DEFAULT_DOMAINS: Domain[] = [
  {
    id: 'sport',
    name: 'Sport',
    color: 'green',
    icon: '🏃',
    description: 'Entraînement, progression physique et bien-être',
  },
  {
    id: 'carriere',
    name: 'Carrière',
    color: 'blue',
    icon: '💼',
    description: 'Travail, missions et évolution professionnelle',
  },
  {
    id: 'droit',
    name: 'Droit',
    color: 'indigo',
    icon: '⚖️',
    description: 'Études juridiques, Grand Oral et stage',
  },
  {
    id: 'ecriture',
    name: 'Écriture',
    color: 'purple',
    icon: '✍️',
    description: 'Création littéraire, roman et exploration narrative',
  },
  {
    id: 'musique',
    name: 'Musique',
    color: 'red',
    icon: '🎵',
    description: 'Écoute, critique musicale et collection',
  },
]

export const DEFAULT_FINANCE_CATEGORIES: FinanceCategory[] = [
  // Dépenses
  { id: 'logement',      name: 'Logement',       type: 'expense', color: '#6366f1', icon: '🏠' },
  { id: 'nourriture',    name: 'Nourriture',      type: 'expense', color: '#22c55e', icon: '🍎' },
  { id: 'transport',     name: 'Transport',       type: 'expense', color: '#3b82f6', icon: '🚌' },
  { id: 'loisirs',       name: 'Loisirs',         type: 'expense', color: '#a855f7', icon: '🎭' },
  { id: 'apprentissage', name: 'Apprentissage',   type: 'expense', color: '#f59e0b', icon: '📚' },
  { id: 'sante',         name: 'Santé',           type: 'expense', color: '#ef4444', icon: '💊' },
  { id: 'autre',         name: 'Autre',           type: 'expense', color: '#71717a', icon: '📦' },
  // Revenus
  { id: 'salaire',        name: 'Salaire',        type: 'income',  color: '#10b981', icon: '💼' },
  { id: 'freelance',      name: 'Freelance',      type: 'income',  color: '#06b6d4', icon: '💻' },
  { id: 'investissement', name: 'Investissement', type: 'income',  color: '#8b5cf6', icon: '📈' },
  { id: 'prime',          name: 'Prime',          type: 'income',  color: '#f97316', icon: '🎁' },
  { id: 'cadeau',         name: 'Cadeau',         type: 'income',  color: '#ec4899', icon: '🎀' },
  { id: 'autre_revenu',   name: 'Autre revenu',   type: 'income',  color: '#71717a', icon: '📦' },
]
