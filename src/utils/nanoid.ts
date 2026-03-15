/** Génère un identifiant unique court (sans dépendance externe). */
export const nanoid = (size = 12): string =>
  crypto.getRandomValues(new Uint8Array(size))
    .reduce((acc, b) => acc + (b & 63).toString(36), '')
    .slice(0, size)
