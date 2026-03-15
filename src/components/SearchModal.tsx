import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { getDomainColors } from '../utils/domainColors'

interface SearchResult {
  id:       string
  type:     'task' | 'objective' | 'domain'
  title:    string
  subtitle: string
  domainId: string
  href:     string
}

interface Props {
  onClose: () => void
}

export function SearchModal({ onClose }: Props) {
  const navigate   = useNavigate()
  const domains    = useStore((s) => s.domains)
  const tasks      = useStore((s) => s.tasks)
  const objectives = useStore((s) => s.objectives)

  const [query, setQuery]     = useState('')
  const [cursor, setCursor]   = useState(0)
  const inputRef              = useRef<HTMLInputElement>(null)
  const listRef               = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const STATUS_LABEL: Record<string, string> = {
    todo: 'À faire', in_progress: 'En cours', done: 'Terminé', cancelled: 'Annulé',
  }

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const out: SearchResult[] = []

    // Tasks
    for (const t of tasks) {
      if (t.title.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q)) {
        const domain = domains.find((d) => d.id === t.domainId)
        out.push({
          id:       t.id,
          type:     'task',
          title:    t.title,
          subtitle: `${domain?.icon ?? ''} ${domain?.name ?? ''} · ${STATUS_LABEL[t.status] ?? t.status}`,
          domainId: t.domainId,
          href:     `/domain/${t.domainId}`,
        })
      }
    }

    // Objectives
    for (const o of objectives) {
      if (
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q)
      ) {
        const domain = domains.find((d) => d.id === o.domainId)
        out.push({
          id:       o.id,
          type:     'objective',
          title:    o.title,
          subtitle: `${domain?.icon ?? ''} ${domain?.name ?? ''} · ${o.progress}%`,
          domainId: o.domainId,
          href:     `/objectives`,
        })
      }
    }

    // Domains
    for (const d of domains) {
      if (d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)) {
        out.push({
          id:       d.id,
          type:     'domain',
          title:    d.name,
          subtitle: d.description,
          domainId: d.id,
          href:     `/domain/${d.id}`,
        })
      }
    }

    return out.slice(0, 12)
  }, [query, tasks, objectives, domains])

  useEffect(() => { setCursor(0) }, [results])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const navigate_to = useCallback((href: string) => {
    navigate(href)
    onClose()
  }, [navigate, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) { navigate_to(results[cursor].href) }
  }

  const TYPE_ICON: Record<string, string> = {
    task: '✓', objective: '◎', domain: '⊹',
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <svg className="h-4 w-4 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une tâche, un objectif, un domaine…"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-zinc-600 hover:text-zinc-400 text-xs">
              ✕
            </button>
          )}
          <kbd className="hidden sm:flex h-5 items-center rounded border border-zinc-700 bg-zinc-800 px-1.5 text-[10px] text-zinc-500">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {query.trim() === '' ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-zinc-600">Commencez à taper pour rechercher…</p>
              <div className="mt-3 flex justify-center gap-4 text-[10px] text-zinc-700">
                <span>↑↓ naviguer</span>
                <span>↵ ouvrir</span>
                <span>Esc fermer</span>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-600">
              Aucun résultat pour « {query} »
            </div>
          ) : (
            <div className="py-1">
              {results.map((r, i) => {
                const domain = domains.find((d) => d.id === r.domainId)
                const c = domain ? getDomainColors(domain.color) : null
                return (
                  <button
                    key={r.id + r.type}
                    data-idx={i}
                    onClick={() => navigate_to(r.href)}
                    onMouseEnter={() => setCursor(i)}
                    className={[
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      cursor === i ? 'bg-zinc-800' : 'hover:bg-zinc-800/50',
                    ].join(' ')}
                  >
                    {/* Type icon */}
                    <span className={[
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-medium',
                      c ? [c.bg, c.border, c.text].join(' ') : 'bg-zinc-800 border-zinc-700 text-zinc-400',
                    ].join(' ')}>
                      {TYPE_ICON[r.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{r.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{r.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-zinc-600 capitalize">
                      {r.type === 'task' ? 'Tâche' : r.type === 'objective' ? 'Objectif' : 'Domaine'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="border-t border-zinc-800 px-4 py-2 flex justify-between items-center">
            <span className="text-[10px] text-zinc-600">{results.length} résultat{results.length > 1 ? 's' : ''}</span>
            <div className="flex gap-3 text-[10px] text-zinc-700">
              <span>↑↓ naviguer</span>
              <span>↵ ouvrir</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
