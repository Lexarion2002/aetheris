import { useStore } from '../store'
import { useSportStore } from '../store/sportStore'
import { useBookStore } from '../store/bookStore'

/**
 * Migration one-shot des objectifs spécifiques au domaine Sport vers le store
 * principal. Les SportObjectif deviennent des Objective avec kind='single'.
 * Une fois migrés, on vide sportStore.objectifs.
 */
export function migrateSportObjectives(): { migrated: number; skipped: number } {
  const state = useStore.getState()
  if (state._migratedSportObjectives) return { migrated: 0, skipped: 0 }

  const sportState = useSportStore.getState()
  const sportObjs = sportState.objectifs

  // Si aucun objectif sport → marquer comme migré sans rien faire
  if (sportObjs.length === 0) {
    state.setMigrationFlag('_migratedSportObjectives', true)
    return { migrated: 0, skipped: 0 }
  }

  // Chercher le domaine Sport. Si introuvable → on saute (pas casser)
  const sportDomain = state.domains.find((d) => d.name.trim().toLowerCase() === 'sport')
  if (!sportDomain) return { migrated: 0, skipped: sportObjs.length }

  // Création des Objective
  let migrated = 0
  for (const obj of sportObjs) {
    state.addObjective({
      domainId:    sportDomain.id,
      title:       obj.titre,
      description: obj.type === 'regularite' ? 'Objectif de régularité' : 'Objectif de performance',
      targetDate:  obj.dateCible,
      progress:    obj.atteint ? 100 : 0,
      archived:    obj.atteint,
      kind:        'single',
    })
    migrated += 1
  }

  // Vider les objectifs Sport pour éviter double-affichage
  useSportStore.setState({ objectifs: [] })
  state.setMigrationFlag('_migratedSportObjectives', true)

  return { migrated, skipped: 0 }
}

/**
 * Migration one-shot du bookStore.objectifAnnuel vers un Objective counter
 * "Lire X livres dans l'année" rattaché au domaine Livres.
 */
export function migrateBookAnnualGoal(): { migrated: boolean } {
  const state = useStore.getState()
  if (state._migratedBookAnnualGoal) return { migrated: false }

  const bookState = useBookStore.getState()
  const target = bookState.objectifAnnuel

  // Si aucun objectif annuel défini ou 0 → marquer comme migré, ne rien faire
  if (!target || target <= 0) {
    state.setMigrationFlag('_migratedBookAnnualGoal', true)
    return { migrated: false }
  }

  // Chercher un domaine "Livres" ou "Lectures"
  const booksDomain = state.domains.find((d) => {
    const name = d.name.trim().toLowerCase()
    return name === 'livres' || name === 'lectures' || name === 'lecture'
  })
  if (!booksDomain) {
    // Pas de domaine → on ne marque pas comme migré, on retentera quand un domaine sera créé
    return { migrated: false }
  }

  // Vérifier qu'on n'a pas déjà un objectif lecture annuel
  const year = new Date().getFullYear()
  const existing = state.objectives.find((o) =>
    o.domainId === booksDomain.id &&
    o.kind === 'counter' &&
    o.title.toLowerCase().includes('livre'),
  )
  if (existing) {
    state.setMigrationFlag('_migratedBookAnnualGoal', true)
    return { migrated: false }
  }

  // Compter les livres déjà critiqués cette année (= lus)
  let current = 0
  const livres = bookState.bibliotheque ?? []
  for (const l of livres) {
    if (!l.dateLecture) continue
    const d = new Date(l.dateLecture)
    if (!isNaN(d.getTime()) && d.getFullYear() === year) current += 1
  }

  state.addObjective({
    domainId:    booksDomain.id,
    title:       `Lire ${target} livres en ${year}`,
    description: 'Objectif annuel de lecture',
    targetDate:  `${year}-12-31`,
    progress:    0,
    kind:        'counter',
    target,
    current,
    cadence:     'free',
  })

  state.setMigrationFlag('_migratedBookAnnualGoal', true)
  return { migrated: true }
}

/** Lance toutes les migrations one-shot. À appeler au boot de l'app. */
export function runAllMigrations(): void {
  try {
    migrateSportObjectives()
  } catch (e) {
    console.warn('[Migration] migrateSportObjectives a échoué :', e)
  }
  try {
    migrateBookAnnualGoal()
  } catch (e) {
    console.warn('[Migration] migrateBookAnnualGoal a échoué :', e)
  }
}
