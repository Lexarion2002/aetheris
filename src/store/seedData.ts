import type { Task, Objective, Expense, DomainBudget, ProgressEntry } from '../types'

const ph = (dates: number[], values: number[]): ProgressEntry[] =>
  dates.map((daysAgo, i) => ({ date: d(daysAgo), value: values[i] }))

const d = (daysAgo: number) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0]
}

const due = (daysFromNow: number) => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

const ts = (daysAgo = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

// ─── Tâches ───────────────────────────────────────────────────────────────────

export const SEED_TASKS: Omit<Task, 'id'>[] = [
  // Santé
  { domainId: 'health', title: 'Courir 5km au parc',            status: 'in_progress', priority: 'high',   timeEstimate: 40,  dueDate: due(2),  createdAt: ts(5), updatedAt: ts(1) },
  { domainId: 'health', title: 'Préparer les repas de la semaine', status: 'todo',     priority: 'medium', timeEstimate: 90,  dueDate: due(3),  createdAt: ts(4), updatedAt: ts(4) },
  { domainId: 'health', title: 'Se coucher avant 23h',           status: 'done',       priority: 'medium', timeEstimate: null, dueDate: null,   createdAt: ts(7), updatedAt: ts(0) },
  { domainId: 'health', title: 'Boire 2L d\'eau par jour',       status: 'in_progress', priority: 'low',  timeEstimate: null, dueDate: null,   createdAt: ts(3), updatedAt: ts(0) },

  // Carrière
  { domainId: 'career', title: 'Préparer la présentation client', status: 'in_progress', priority: 'urgent', timeEstimate: 120, dueDate: due(1), createdAt: ts(3), updatedAt: ts(1) },
  { domainId: 'career', title: 'Mettre à jour le CV',            status: 'todo',         priority: 'medium', timeEstimate: 60,  dueDate: due(7), createdAt: ts(6), updatedAt: ts(6) },
  { domainId: 'career', title: 'Finir le rapport trimestriel',   status: 'done',         priority: 'high',   timeEstimate: 180, dueDate: d(1),   createdAt: ts(10), updatedAt: ts(2) },
  { domainId: 'career', title: 'Répondre aux emails en attente', status: 'todo',         priority: 'low',    timeEstimate: 30,  dueDate: due(1), createdAt: ts(1), updatedAt: ts(1) },

  // Apprentissage
  { domainId: 'learning', title: 'Lire 30 pages d\'Atomic Habits', status: 'in_progress', priority: 'medium', timeEstimate: 45, dueDate: due(1), createdAt: ts(2), updatedAt: ts(0) },
  { domainId: 'learning', title: 'Finir le cours TypeScript avancé', status: 'todo',      priority: 'high',   timeEstimate: 120, dueDate: due(10), createdAt: ts(5), updatedAt: ts(5) },
  { domainId: 'learning', title: 'Pratiquer l\'espagnol 20min',   status: 'done',          priority: 'low',   timeEstimate: 20,  dueDate: null,   createdAt: ts(4), updatedAt: ts(1) },
  { domainId: 'learning', title: 'Résumer le chapitre sur les habitudes', status: 'todo', priority: 'low',   timeEstimate: 30,  dueDate: due(4), createdAt: ts(1), updatedAt: ts(1) },

  // Relations
  { domainId: 'relationships', title: 'Appeler maman',           status: 'todo',         priority: 'high',   timeEstimate: 30,  dueDate: due(1),  createdAt: ts(3), updatedAt: ts(3) },
  { domainId: 'relationships', title: 'Organiser un dîner entre amis', status: 'in_progress', priority: 'medium', timeEstimate: 60, dueDate: due(10), createdAt: ts(7), updatedAt: ts(2) },
  { domainId: 'relationships', title: 'Envoyer un message à Lucas', status: 'done',        priority: 'low',   timeEstimate: 10,  dueDate: null,    createdAt: ts(5), updatedAt: ts(1) },

  // Créativité
  { domainId: 'creativity', title: 'Écrire 500 mots pour le roman', status: 'in_progress', priority: 'medium', timeEstimate: 60,  dueDate: due(2),  createdAt: ts(4), updatedAt: ts(0) },
  { domainId: 'creativity', title: 'Dessiner un croquis de personnage', status: 'todo',    priority: 'low',   timeEstimate: 45,  dueDate: due(7),  createdAt: ts(3), updatedAt: ts(3) },
  { domainId: 'creativity', title: 'Composer une mélodie au piano',  status: 'done',        priority: 'medium', timeEstimate: 90, dueDate: null,    createdAt: ts(9), updatedAt: ts(4) },

  // Bien-être
  { domainId: 'wellbeing', title: 'Méditer 10 minutes',           status: 'done',         priority: 'high',   timeEstimate: 10,  dueDate: null,    createdAt: ts(2), updatedAt: ts(0) },
  { domainId: 'wellbeing', title: 'Journaling du soir',           status: 'in_progress',  priority: 'medium', timeEstimate: 15,  dueDate: null,    createdAt: ts(3), updatedAt: ts(0) },
  { domainId: 'wellbeing', title: 'Déconnecter des réseaux 1h',   status: 'todo',          priority: 'low',   timeEstimate: 60,  dueDate: due(3),  createdAt: ts(1), updatedAt: ts(1) },
]

// ─── Objectifs ────────────────────────────────────────────────────────────────

export const SEED_OBJECTIVES: Omit<Objective, 'id'>[] = [
  { domainId: 'health',        title: 'Courir un semi-marathon',      description: 'Préparer et courir un semi-marathon de 21km', targetDate: due(120), progress: 35, progressHistory: ph([28,21,14,7,3], [5,10,20,28,35]),  createdAt: ts(30), updatedAt: ts(3) },
  { domainId: 'health',        title: 'Adopter une alimentation équilibrée', description: 'Suivre un régime varié et nutritif pendant 90 jours', targetDate: due(60), progress: 55, progressHistory: ph([18,12,7,3,0], [20,30,40,50,55]), createdAt: ts(20), updatedAt: ts(2) },
  { domainId: 'career',        title: 'Maîtriser TypeScript avancé',  description: 'Compléter les modules avancés et créer 2 projets', targetDate: due(60), progress: 60, progressHistory: ph([22,15,10,5,0], [15,30,45,55,60]),  createdAt: ts(25), updatedAt: ts(5) },
  { domainId: 'career',        title: 'Obtenir une promotion',        description: 'Atteindre les objectifs annuels et postuler', targetDate: due(180), progress: 30, progressHistory: ph([40,28,14,7,0], [5,10,15,25,30]),    createdAt: ts(45), updatedAt: ts(7) },
  { domainId: 'learning',      title: 'Lire 12 livres cette année',   description: 'Un livre par mois minimum', targetDate: due(200), progress: 42, progressHistory: ph([80,60,40,20,5], [8,17,25,33,42]),         createdAt: ts(90), updatedAt: ts(5) },
  { domainId: 'learning',      title: 'Atteindre B2 en espagnol',     description: 'Pratiquer quotidiennement via Duolingo + cours', targetDate: due(270), progress: 25, progressHistory: ph([45,30,15,7,0], [5,10,15,20,25]), createdAt: ts(50), updatedAt: ts(3) },
  { domainId: 'relationships', title: 'Renforcer les liens familiaux', description: 'Appeler les proches chaque semaine', targetDate: due(90), progress: 50, progressHistory: ph([18,12,7,3,0], [15,25,35,43,50]),            createdAt: ts(20), updatedAt: ts(2) },
  { domainId: 'creativity',    title: 'Finir le premier chapitre du roman', description: 'Écrire au moins 10 000 mots', targetDate: due(45), progress: 40, progressHistory: ph([25,18,10,4,1], [5,15,25,35,40]),        createdAt: ts(30), updatedAt: ts(1) },
  { domainId: 'wellbeing',     title: 'Méditer 30 jours de suite',    description: 'Créer une routine de méditation quotidienne', targetDate: due(20), progress: 65, progressHistory: ph([9,6,4,2,0], [20,35,45,55,65]),    createdAt: ts(10), updatedAt: ts(0) },
]

// helpers pour dates relatives en mois
const dm = (monthsAgo: number, day: number) => {
  const date = new Date()
  date.setMonth(date.getMonth() - monthsAgo)
  date.setDate(day)
  return date.toISOString().split('T')[0]
}

// ─── Dépenses (3 mois d'historique) ──────────────────────────────────────────

export const SEED_EXPENSES: Omit<Expense, 'id' | 'createdAt'>[] = [
  // ── Mois courant ──
  { domainId: 'health',        amount: 50,  category: 'health',        description: 'Abonnement salle de sport',    date: d(5) },
  { domainId: 'health',        amount: 35,  category: 'food',          description: 'Compléments alimentaires',     date: d(3) },
  { domainId: 'health',        amount: 22,  category: 'health',        description: 'Pharmacie',                    date: d(8) },
  { domainId: 'career',        amount: 29,  category: 'education',     description: 'Udemy — cours TypeScript',     date: d(8) },
  { domainId: 'career',        amount: 14,  category: 'other',         description: 'Fournitures bureau',           date: d(4) },
  { domainId: 'learning',      amount: 18,  category: 'entertainment', description: 'Livre Atomic Habits',          date: d(6) },
  { domainId: 'learning',      amount: 12,  category: 'education',     description: 'Abonnement Duolingo Plus',     date: d(4) },
  { domainId: 'wellbeing',     amount: 9,   category: 'health',        description: 'App de méditation guidée',     date: d(7) },
  { domainId: 'creativity',    amount: 15,  category: 'entertainment', description: 'Abonnement Spotify',           date: d(3) },
  { domainId: 'relationships', amount: 65,  category: 'entertainment', description: 'Restaurant avec des amis',     date: d(9) },

  // ── Mois -1 ──
  { domainId: 'health',        amount: 50,  category: 'health',        description: 'Abonnement salle de sport',   date: dm(1, 5)  },
  { domainId: 'health',        amount: 48,  category: 'food',          description: 'Courses bio',                 date: dm(1, 12) },
  { domainId: 'health',        amount: 30,  category: 'health',        description: 'Séance kiné',                 date: dm(1, 20) },
  { domainId: 'career',        amount: 49,  category: 'education',     description: 'Coursera — certification',    date: dm(1, 3)  },
  { domainId: 'career',        amount: 20,  category: 'other',         description: 'LinkedIn Premium',            date: dm(1, 8)  },
  { domainId: 'learning',      amount: 24,  category: 'entertainment', description: 'Livres (×2)',                 date: dm(1, 7)  },
  { domainId: 'learning',      amount: 12,  category: 'education',     description: 'Abonnement Duolingo Plus',    date: dm(1, 5)  },
  { domainId: 'wellbeing',     amount: 9,   category: 'health',        description: 'App de méditation guidée',    date: dm(1, 4)  },
  { domainId: 'wellbeing',     amount: 40,  category: 'health',        description: 'Yoga en plein air',           date: dm(1, 22) },
  { domainId: 'creativity',    amount: 15,  category: 'entertainment', description: 'Abonnement Spotify',          date: dm(1, 3)  },
  { domainId: 'creativity',    amount: 35,  category: 'entertainment', description: 'Matériel dessin',             date: dm(1, 18) },
  { domainId: 'relationships', amount: 80,  category: 'entertainment', description: 'Soirée anniversaire',         date: dm(1, 14) },
  { domainId: 'relationships', amount: 30,  category: 'other',         description: 'Cadeau',                      date: dm(1, 25) },

  // ── Mois -2 ──
  { domainId: 'health',        amount: 50,  category: 'health',        description: 'Abonnement salle de sport',   date: dm(2, 5)  },
  { domainId: 'health',        amount: 60,  category: 'food',          description: 'Compléments + courses',       date: dm(2, 10) },
  { domainId: 'career',        amount: 29,  category: 'education',     description: 'Udemy — autre cours',         date: dm(2, 6)  },
  { domainId: 'career',        amount: 55,  category: 'other',         description: 'Conférence en ligne',         date: dm(2, 15) },
  { domainId: 'learning',      amount: 12,  category: 'education',     description: 'Abonnement Duolingo Plus',    date: dm(2, 5)  },
  { domainId: 'learning',      amount: 35,  category: 'entertainment', description: 'Livres (×3)',                 date: dm(2, 9)  },
  { domainId: 'wellbeing',     amount: 9,   category: 'health',        description: 'App de méditation guidée',    date: dm(2, 4)  },
  { domainId: 'creativity',    amount: 15,  category: 'entertainment', description: 'Abonnement Spotify',          date: dm(2, 3)  },
  { domainId: 'creativity',    amount: 60,  category: 'entertainment', description: 'Cours de piano',              date: dm(2, 12) },
  { domainId: 'relationships', amount: 45,  category: 'entertainment', description: 'Restaurant',                  date: dm(2, 17) },
]

// ─── Budgets mensuels ─────────────────────────────────────────────────────────

export const SEED_BUDGETS: DomainBudget[] = [
  { domainId: 'health',        amount: 150  },
  { domainId: 'career',        amount: 100  },
  { domainId: 'learning',      amount: 50   },
  { domainId: 'wellbeing',     amount: 80   },
  { domainId: 'creativity',    amount: 60   },
  { domainId: 'relationships', amount: 100  },
]

// ─── Sessions de temps (cette semaine) ───────────────────────────────────────
// Les taskIds seront remplacés après création des tâches

export type SeedTimeSession = {
  taskIndex: number   // index dans SEED_TASKS
  duration: number
  date: string
  focus: number
}

export const SEED_TIME_SESSIONS: SeedTimeSession[] = [
  { taskIndex: 0,  duration: 35,  date: d(1), focus: 85 },  // Santé: courir
  { taskIndex: 0,  duration: 40,  date: d(3), focus: 90 },
  { taskIndex: 4,  duration: 90,  date: d(0), focus: 80 },  // Carrière: présentation
  { taskIndex: 4,  duration: 60,  date: d(1), focus: 75 },
  { taskIndex: 12, duration: 45,  date: d(0), focus: 70 },  // Apprentissage: lecture
  { taskIndex: 12, duration: 40,  date: d(2), focus: 80 },
  { taskIndex: 19, duration: 55,  date: d(1), focus: 90 },  // Créativité: roman
  { taskIndex: 21, duration: 10,  date: d(0), focus: 95 },  // Bien-être: méditation
  { taskIndex: 22, duration: 15,  date: d(0), focus: 80 },  // Bien-être: journaling
]
