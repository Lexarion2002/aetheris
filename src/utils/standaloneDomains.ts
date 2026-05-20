import type { Domain } from '../types'

/**
 * Domaines "standalone" — pages de domaine qui existent comme routes
 * dédiées (/droit, /sport, etc.) sans entrée dans le store.domains.
 * Sont quand même référencés via Objective.domainId / Task.domainId
 * en utilisant l'id-string fixe.
 */
export const STATIC_DOMAINS: Domain[] = [
  { id: 'musique',  name: 'Musique',        color: 'purple', icon: '🎵', description: '' },
  { id: 'cuisine',  name: 'Cuisine',        color: 'orange', icon: '🍳', description: '' },
  { id: 'achats',   name: 'Achats',         color: 'teal',   icon: '🛍️', description: '' },
  { id: 'films',    name: 'Films & Séries', color: 'red',    icon: '🎬', description: '' },
  { id: 'livres',   name: 'Livres',         color: 'blue',   icon: '📚', description: '' },
  { id: 'cabinet',  name: 'Cabinet',        color: 'gray',   icon: '💼', description: '' },
  { id: 'ecriture', name: 'Écriture',       color: 'indigo', icon: '✍️', description: '' },
  { id: 'droit',    name: 'Droit',          color: 'indigo', icon: '⚖️', description: '' },
  { id: 'sport',    name: 'Sport',          color: 'green',  icon: '💪', description: '' },
]

/**
 * Union des domaines du store et des standalone non-représentés.
 * À utiliser pour le mapping `domain_name` → `domainId` quand on a affaire
 * à des objectifs/tâches qui peuvent référencer un standalone.
 */
export function expandDomains(storeDomains: Domain[]): Domain[] {
  const seenIds = new Set(storeDomains.map((d) => d.id))
  const seenNames = new Set(storeDomains.map((d) => d.name.trim().toLowerCase()))
  const extras = STATIC_DOMAINS.filter(
    (d) => !seenIds.has(d.id) && !seenNames.has(d.name.trim().toLowerCase()),
  )
  return [...storeDomains, ...extras]
}
