import { useState, useEffect, useCallback } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { GlobalTimer } from './GlobalTimer'
import { SearchModal } from './SearchModal'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const location = useLocation()

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Cmd+K / Ctrl+K to open search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen((v) => !v)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">

      {/* ── Sidebar desktop (w-56) ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col">
        <Sidebar onSearch={() => setSearchOpen(true)} />
      </div>

      {/* ── Drawer mobile ─────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(58,46,34,0.5)' }} />
          <div
            className="absolute inset-y-0 left-0 w-56 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              onNavigate={() => setSidebarOpen(false)}
              onSearch={() => { setSidebarOpen(false); setSearchOpen(true) }}
            />
          </div>
        </div>
      )}

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 flex-col">
        <Header
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          onSearchOpen={() => setSearchOpen(true)}
        />

        {/* Scrollable content with page-enter animation keyed to route */}
        <main className="flex-1 overflow-y-auto">
          <div
            key={location.pathname}
            className="mx-auto max-w-4xl px-6 py-8 sm:px-10 page-enter"
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Global timer ──────────────────────────────────────────────────────── */}
      <GlobalTimer />

      {/* ── Search modal ──────────────────────────────────────────────────────── */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
