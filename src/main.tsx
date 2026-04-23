import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

window.addEventListener('load', () => {
  const KEYS = [
    'aetheris-app',
    'aetheris-music-v1',
    'aetheris-books-v1',
    'aetheris-shopping-v1',
    'aetheris-filmseries-v1',
  ]
  console.group('[Debug] localStorage — état au chargement')
  for (const key of KEYS) {
    const raw = localStorage.getItem(key)
    if (raw) {
      console.log(`  ✅ ${key} — ${Math.round(raw.length / 1024)}kb`)
    } else {
      console.log(`  ❌ ${key} — absent`)
    }
  }
  console.groupEnd()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
