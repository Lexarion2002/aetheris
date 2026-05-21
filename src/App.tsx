import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LandingPage } from './pages/LandingPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { AuthModal } from './components/AuthModal'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { watchOnlineStatus, setCurrentUserId } from './lib/supabaseSync'
import { getCurrentUser, onAuthStateChange } from './lib/supabaseAuth'
import { isSupabaseReady } from './lib/supabase'
import { runAllMigrations } from './lib/migrations'
import { useStore } from './store'
import type { User } from '@supabase/supabase-js'

// ─── Lazy page imports ────────────────────────────────────────────────────────

const Dashboard      = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const DomainView     = lazy(() => import('./pages/DomainView').then((m) => ({ default: m.DomainView })))
const FocusDashboard = lazy(() => import('./pages/FocusDashboard').then((m) => ({ default: m.FocusDashboard })))
const FinancePage    = lazy(() => import('./pages/FinancePage').then((m) => ({ default: m.FinancePage })))
const AnalyticsPage  = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const SettingsPage   = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })))
const MusicPage      = lazy(() => import('./pages/MusicPage').then((m) => ({ default: m.MusicPage })))
const CuisinePage    = lazy(() => import('./pages/CuisinePage').then((m) => ({ default: m.CuisinePage })))
const ShoppingPage      = lazy(() => import('./pages/ShoppingPage').then((m) => ({ default: m.ShoppingPage })))
const FilmsSeriesPage   = lazy(() => import('./pages/FilmsSeriesPage').then((m) => ({ default: m.FilmsSeriesPage })))
const BooksPage         = lazy(() => import('./pages/BooksPage').then((m) => ({ default: m.BooksPage })))
const CabinetPage       = lazy(() => import('./pages/CabinetPage').then((m) => ({ default: m.CabinetPage })))
const DroitPage         = lazy(() => import('./pages/DroitPage').then((m) => ({ default: m.DroitPage })))
const SportView         = lazy(() => import('./pages/SportView').then((m) => ({ default: m.SportView })))

// ─── Page loader ──────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const onboarded    = useStore((s) => s.onboarded)
  const theme        = useStore((s) => s.theme)
  const deleteDomain = useStore((s) => s.deleteDomain)
  const domains      = useStore((s) => s.domains)

  // ── Auth state ───────────────────────────────────────────────────────────
  const [authUser,    setAuthUser]    = useState<User | null | undefined>(undefined) // undefined = chargement
  const supabaseOn = isSupabaseReady()

  useEffect(() => {
    if (!supabaseOn) {
      setAuthUser(null)
      return
    }
    // Vérifie la session existante
    getCurrentUser().then((user) => {
      setAuthUser(user)
      setCurrentUserId(user?.id ?? null)
    })
    // Écoute les changements d'auth — NE PAS rehydrater (évite d'écraser le state en cours)
    const unsub = onAuthStateChange((user) => {
      setAuthUser(user)
      setCurrentUserId(user?.id ?? null)
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light')
  }, [theme])

  // ── Sync au retour d'Internet ─────────────────────────────────────────────
  useEffect(() => watchOnlineStatus(), [])


  // Nettoyage des anciennes clés localStorage (migration unique)
  useEffect(() => {
    const LEGACY_KEYS = ['aetheris-v2', 'aetheris-store', 'aetheris-anthropic-key']
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // One-time migration: remove legacy standalone "Finance" domain
  useEffect(() => {
    domains
      .filter((d) => ['finance', 'finances'].includes(d.name.trim().toLowerCase()))
      .forEach((d) => deleteDomain(d.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Migrations one-shot des objectifs domain-spécifiques vers le store principal.
  // Délai pour laisser le sportStore / bookStore s'hydrater depuis Supabase.
  useEffect(() => {
    const t = setTimeout(() => runAllMigrations(), 1500)
    return () => clearTimeout(t)
  }, [])


  // ── Auth guard ────────────────────────────────────────────────────────────
  // Pendant la vérification auth → spinner
  if (authUser === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex gap-2">
          {[0,1,2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-bounce"
              style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  // Supabase activé mais pas connecté → AuthModal (sauf reset-password)
  if (supabaseOn && !authUser && !window.location.pathname.startsWith('/reset-password')) {
    return <AuthModal onSuccess={() => getCurrentUser().then((u) => { setAuthUser(u); setCurrentUserId(u?.id ?? null) })} />
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public pages ──────────────────────────────────────────────────── */}
        <Route path="/"               element={<LandingPage />} />
        <Route path="/onboarding"     element={<OnboardingPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ── App (requires onboarding) ─────────────────────────────────────── */}
        <Route element={onboarded ? <Layout /> : <Navigate to="/" replace />}>
          <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="domain/:id" element={<Suspense fallback={<PageLoader />}><DomainView /></Suspense>} />
          <Route path="focus" element={<Suspense fallback={<PageLoader />}><FocusDashboard /></Suspense>} />
          <Route path="finances" element={<Suspense fallback={<PageLoader />}><FinancePage /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
          <Route path="categories" element={<Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>} />
          <Route path="musique" element={<Suspense fallback={<PageLoader />}><MusicPage /></Suspense>} />
          <Route path="cuisine" element={<Suspense fallback={<PageLoader />}><CuisinePage /></Suspense>} />
          <Route path="achats" element={<Suspense fallback={<PageLoader />}><ShoppingPage /></Suspense>} />
          <Route path="films" element={<Suspense fallback={<PageLoader />}><FilmsSeriesPage /></Suspense>} />
          <Route path="livres"   element={<Suspense fallback={<PageLoader />}><BooksPage /></Suspense>} />
          <Route path="cabinet" element={<Suspense fallback={<PageLoader />}><CabinetPage /></Suspense>} />
          <Route path="droit" element={<Suspense fallback={<PageLoader />}><DroitPage /></Suspense>} />
          <Route path="sport" element={<Suspense fallback={<PageLoader />}><SportView /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
