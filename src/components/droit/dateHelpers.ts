// Helpers de date partagés par les composants Droit.
//
// Tout est calculé par rapport à `today()` qui retourne la date du jour à minuit
// — facile à mocker dans les tests si besoin.

export function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function parseIsoDate(iso: string): Date {
  // "2026-06-02" → 2026-06-02 00:00 local
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysUntil(iso: string): number {
  const target = parseIsoDate(iso)
  return Math.round((target.getTime() - today().getTime()) / 86400000)
}

const MONTHS_FR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

// "2026-06-02" → "2 juin"
export function formatShortDate(iso: string): string {
  const d = parseIsoDate(iso)
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

// "2026-06-02" → "02.06.2026"
export function formatNumericDate(iso: string): string {
  const d = parseIsoDate(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

// "2026-06-02" → "02.06"
export function formatShortNumericDate(iso: string): string {
  const d = parseIsoDate(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}`
}
