import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LandingPage } from './pages/LandingPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { useStore } from './store'

// ─── Lazy page imports ────────────────────────────────────────────────────────

const Dashboard      = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const DomainView     = lazy(() => import('./pages/DomainView').then((m) => ({ default: m.DomainView })))
const FocusDashboard = lazy(() => import('./pages/FocusDashboard').then((m) => ({ default: m.FocusDashboard })))
const ObjectivesPage = lazy(() => import('./pages/ObjectivesPage').then((m) => ({ default: m.ObjectivesPage })))
const FinancePage    = lazy(() => import('./pages/FinancePage').then((m) => ({ default: m.FinancePage })))
const AnalyticsPage  = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const WeekView       = lazy(() => import('./pages/WeekView').then((m) => ({ default: m.WeekView })))
const SettingsPage   = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })))
const MusicPage      = lazy(() => import('./pages/MusicPage').then((m) => ({ default: m.MusicPage })))

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
  const addDomain    = useStore((s) => s.addDomain)
  const domains      = useStore((s) => s.domains)

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light')
  }, [theme])

  // One-time migration: remove legacy standalone "Finance" domain (now a standalone page)
  useEffect(() => {
    domains
      .filter((d) => ['finance', 'finances'].includes(d.name.trim().toLowerCase()))
      .forEach((d) => deleteDomain(d.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // One-time migration: ensure "Musique" domain exists
  useEffect(() => {
    const exists = domains.some((d) => d.name.trim().toLowerCase() === 'musique')
    if (!exists) {
      addDomain({ name: 'Musique', color: 'red', icon: '🎵', description: 'Écoute, critique musicale et collection' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public pages ──────────────────────────────────────────────────── */}
        <Route path="/"           element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* ── App (requires onboarding) ─────────────────────────────────────── */}
        <Route element={onboarded ? <Layout /> : <Navigate to="/" replace />}>
          <Route path="dashboard" element={
            <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
          } />
          <Route path="domain/:id" element={
            <Suspense fallback={<PageLoader />}><DomainView /></Suspense>
          } />
          <Route path="focus" element={
            <Suspense fallback={<PageLoader />}><FocusDashboard /></Suspense>
          } />
          <Route path="objectives" element={
            <Suspense fallback={<PageLoader />}><ObjectivesPage /></Suspense>
          } />
          <Route path="finances" element={
            <Suspense fallback={<PageLoader />}><FinancePage /></Suspense>
          } />
          <Route path="analytics" element={
            <Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>
          } />
          <Route path="week" element={
            <Suspense fallback={<PageLoader />}><WeekView /></Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
          } />
          <Route path="categories" element={
            <Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>
          } />
          <Route path="musique" element={
            <Suspense fallback={<PageLoader />}><MusicPage /></Suspense>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
