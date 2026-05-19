import { useState, useEffect, useRef, useMemo } from 'react'
import { Circle } from 'lucide-react'
import { useStore } from '../store'
import { getDomainIcon } from '../utils/domainColors'
import type { Domain, Objective } from '../types'

const STATIC_DOMAINS: Domain[] = [
  { id: 'musique',  name: 'Musique',        color: 'purple', icon: '', description: '' },
  { id: 'cuisine',  name: 'Cuisine',        color: 'orange', icon: '', description: '' },
  { id: 'achats',   name: 'Achats',         color: 'teal',   icon: '', description: '' },
  { id: 'films',    name: 'Films & Séries', color: 'red',    icon: '', description: '' },
  { id: 'livres',   name: 'Livres',         color: 'blue',   icon: '', description: '' },
  { id: 'cabinet',  name: 'Cabinet',        color: 'gray',   icon: '', description: '' },
  { id: 'ecriture', name: 'Écriture',       color: 'indigo', icon: '', description: '' },
  { id: 'droit',    name: 'Droit',          color: 'indigo', icon: '', description: '' },
  { id: 'sport',    name: 'Sport',          color: 'green',  icon: '', description: '' },
]

interface Props {
  domainId?:  string
  objective?: Objective
  onClose: () => void
}

// ─── Styles communs ───────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--ink-3)',
  display: 'block',
  marginBottom: 8,
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--r-md)',
  border: '1px solid var(--ink-4)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ObjectiveFormModal({ domainId: propDomainId, objective, onClose }: Props) {
  const storeDomains    = useStore((s) => s.domains)
  const storeIds        = new Set(storeDomains.map((d) => d.id))
  const domains         = [...storeDomains, ...STATIC_DOMAINS.filter((d) => !storeIds.has(d.id))]
  const tasks           = useStore((s) => s.tasks)
  const addObjective    = useStore((s) => s.addObjective)
  const updateObjective = useStore((s) => s.updateObjective)
  const updateTask      = useStore((s) => s.updateTask)

  const [title,        setTitle]        = useState(objective?.title ?? '')
  const [description,  setDescription]  = useState(objective?.description ?? '')
  const [targetDate,   setTargetDate]   = useState(objective?.targetDate?.slice(0, 10) ?? '')
  const [progress,     setProgress]     = useState(objective?.progress ?? 0)
  const [domainId,     setDomainId]     = useState(propDomainId ?? objective?.domainId ?? '')
  const [showTaskLink, setShowTaskLink] = useState(false)

  const [linkedTaskIds, setLinkedTaskIds] = useState<Set<string>>(() =>
    new Set(objective ? tasks.filter((t) => t.objectiveId === objective.id).map((t) => t.id) : [])
  )

  const titleRef = useRef<HTMLInputElement>(null)
  const isEdit   = !!objective

  useEffect(() => { titleRef.current?.focus() }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const linkableTasks = useMemo(() =>
    tasks.filter((t) =>
      t.domainId === domainId &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
    ), [tasks, domainId])

  const toggleTask = (taskId: string) => {
    setLinkedTaskIds((prev) => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !domainId) return
    const payload = {
      domainId,
      title:       title.trim(),
      description: description.trim(),
      targetDate:  targetDate || null,
      progress,
    }
    if (isEdit) {
      updateObjective(objective.id, payload)
      for (const t of tasks.filter((t) => t.domainId === domainId)) {
        const wasLinked = t.objectiveId === objective.id
        const nowLinked = linkedTaskIds.has(t.id)
        if (!wasLinked && nowLinked) updateTask(t.id, { objectiveId: objective.id })
        if (wasLinked && !nowLinked)  updateTask(t.id, { objectiveId: undefined })
      }
    } else {
      const newObj = addObjective(payload)
      for (const taskId of linkedTaskIds) {
        updateTask(taskId, { objectiveId: newObj.id })
      }
    }
    onClose()
  }

  const canSubmit = title.trim() && domainId

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'color-mix(in srgb, var(--ink) 30%, transparent)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--paper-1)',
        borderRadius: 'var(--r-xl)',
        boxShadow: 'var(--shadow-3)',
        padding: '28px 32px',
        maxWidth: 560,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Titre */}
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          color: 'var(--ink)',
          margin: '0 0 24px',
          fontWeight: 400,
        }}>
          {isEdit ? "Modifier l'objectif" : 'Nouvel objectif'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Domaine — chips horizontaux */}
          {!propDomainId && (
            <div>
              <label style={labelStyle}>Domaine</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {domains.map((d) => {
                  const active = domainId === d.id
                  const Icon   = getDomainIcon(d.name) ?? Circle
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => { setDomainId(d.id); setLinkedTaskIds(new Set()) }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        borderRadius: 'var(--r-full)',
                        border: `1px solid ${active ? 'var(--ink)' : 'var(--paper-2)'}`,
                        background: active ? 'var(--ink)' : 'transparent',
                        color: active ? 'var(--paper-1)' : 'var(--ink-2)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Icon size={14} />
                      {d.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Titre — ligne éditoriale */}
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de l'objectif…"
            required
            style={{
              width: '100%',
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              color: 'var(--ink)',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--paper-2)',
              borderRadius: 0,
              outline: 'none',
              padding: '4px 0 8px',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.target.style.borderBottomColor = 'var(--ink-4)' }}
            onBlur={(e) => { e.target.style.borderBottomColor = 'var(--paper-2)' }}
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description, critères de succès…"
            rows={2}
            style={{
              ...fieldStyle,
              border: '1px solid var(--paper-2)',
              resize: 'vertical',
              padding: '10px 12px',
            }}
          />

          {/* Date cible */}
          <div>
            <label style={labelStyle}>Date cible</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              style={{ ...fieldStyle, fontFamily: 'var(--font-mono)', colorScheme: 'light' }}
            />
          </div>

          {/* Progression — 5 chips */}
          <div>
            <label style={labelStyle}>Progression actuelle</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 25, 50, 75, 100].map((v) => {
                const active = progress === v
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setProgress(v)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 'var(--r-full)',
                      border: `1px solid ${active ? 'var(--terra)' : 'var(--paper-2)'}`,
                      background: active ? 'var(--terra)' : 'transparent',
                      color: active ? 'var(--paper-1)' : 'var(--ink-2)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {v}%
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lier des tâches */}
          {domainId && linkableTasks.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowTaskLink(!showTaskLink)}
                style={{
                  display: 'flex', width: '100%', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--paper-2)',
                  background: 'transparent',
                  color: 'var(--ink-2)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Lier des tâches
                  {linkedTaskIds.size > 0 && (
                    <span style={{
                      padding: '1px 8px',
                      borderRadius: 'var(--r-full)',
                      background: 'var(--terra-soft)',
                      color: 'var(--terra)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                    }}>
                      {linkedTaskIds.size}
                    </span>
                  )}
                </span>
                <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>{showTaskLink ? '▲' : '▼'}</span>
              </button>

              {showTaskLink && (
                <div style={{
                  marginTop: 6,
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--paper-2)',
                  overflow: 'hidden',
                  maxHeight: 160,
                  overflowY: 'auto',
                }}>
                  {linkableTasks.map((t) => {
                    const checked = linkedTaskIds.has(t.id)
                    return (
                      <label key={t.id} style={{
                        display: 'flex', cursor: 'pointer', alignItems: 'center', gap: 10,
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--paper-2)',
                        background: 'transparent',
                      }}>
                        <div style={{
                          width: 16, height: 16, flexShrink: 0,
                          border: `1.5px solid ${checked ? 'var(--terra)' : 'var(--ink-4)'}`,
                          borderRadius: 4,
                          background: checked ? 'var(--terra-soft)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--terra)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                          )}
                        </div>
                        <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleTask(t.id)} />
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)' }}>{t.title}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                background: 'transparent',
                color: 'var(--ink-2)',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                background: 'var(--terra)',
                color: 'var(--paper-1)',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 500,
                cursor: canSubmit ? 'pointer' : 'default',
                opacity: canSubmit ? 1 : 0.4,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.background = 'var(--terra-deep)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--terra)' }}
            >
              {isEdit ? 'Enregistrer' : "Créer l'objectif"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
