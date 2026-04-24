import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { getDomainColors, getDomainIcon } from '../utils/domainColors'
import type { DomainColor } from '../types'
import type { AppTheme, AppLanguage, AetherisData } from '../store'

// ─── Domain color picker ──────────────────────────────────────────────────────

const COLORS: DomainColor[] = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'gray']
const COLOR_HEX: Record<DomainColor, string> = {
  red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e',
  teal: '#14b8a6', blue: '#3b82f6', indigo: '#6366f1', purple: '#a855f7',
  pink: '#ec4899', gray: '#6b7280',
}

const LANG_LABELS: Record<AppLanguage, string> = { fr: '🇫🇷 Français', en: '🇬🇧 English' }

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none',
        checked ? 'bg-teal-500' : 'bg-zinc-700',
      ].join(' ')}
    >
      <span className={[
        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform',
        checked ? 'translate-x-4' : 'translate-x-0',
      ].join(' ')} />
    </button>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const navigate               = useNavigate()
  const domains                = useStore((s) => s.domains)
  const theme                  = useStore((s) => s.theme)
  const language               = useStore((s) => s.language)
  const setTheme               = useStore((s) => s.setTheme)
  const setLanguage            = useStore((s) => s.setLanguage)
  const updateDomain           = useStore((s) => s.updateDomain)
  const deleteDomain           = useStore((s) => s.deleteDomain)
  const addDomain              = useStore((s) => s.addDomain)
  const importData             = useStore((s) => s.importData)
  const resetAll               = useStore((s) => s.resetAll)
  const financeCategories      = useStore((s) => s.financeCategories)
  const pomodoroSettings       = useStore((s) => s.pomodoroSettings)
  const setPomodoroSettings    = useStore((s) => s.setPomodoroSettings)

  // Domain editing
  const [editingDomainId, setEditingDomainId]     = useState<string | null>(null)
  const [editName,        setEditName]             = useState('')
  const [editIcon,        setEditIcon]             = useState('')
  const [editColor,       setEditColor]            = useState<DomainColor>('teal')
  const [editDesc,        setEditDesc]             = useState('')
  const [deleteConfirmId, setDeleteConfirmId]      = useState<string | null>(null)

  // New domain
  const [showNewDomain,   setShowNewDomain]        = useState(false)
  const [newName,         setNewName]              = useState('')
  const [newIcon,         setNewIcon]              = useState('⭐')
  const [newColor,        setNewColor]             = useState<DomainColor>('blue')
  const [newDesc,         setNewDesc]              = useState('')

  // Notifications
  const [notifDeadlines,  setNotifDeadlines]       = useState(false)

  // Import/export
  const [importStatus,    setImportStatus]         = useState<'idle' | 'success' | 'error'>('idle')
  const [importMsg,       setImportMsg]            = useState('')
  const [resetConfirm,    setResetConfirm]         = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


  // ── Theme: apply to body ──────────────────────────────────────────────────

  const applyTheme = (t: AppTheme) => {
    setTheme(t)
    document.body.classList.toggle('theme-light', t === 'light')
  }

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = () => {
    const s = useStore.getState()
    const data: AetherisData = {
      domains:         s.domains,
      tasks:           s.tasks,
      objectives:      s.objectives,
      expenses:        s.expenses,
      timeSessions:    s.timeSessions,
      budgets:         s.budgets,
      transactions:    s.transactions,
      categoryBudgets: s.categoryBudgets,
      savingsGoals:    s.savingsGoals,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href:     url,
      download: `aetheris-backup-${new Date().toISOString().split('T')[0]}.json`,
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as Partial<AetherisData>
        if (!raw.domains || !raw.tasks) throw new Error('Format invalide')
        importData({
          domains:         raw.domains         ?? [],
          tasks:           raw.tasks           ?? [],
          objectives:      raw.objectives      ?? [],
          expenses:        raw.expenses        ?? [],
          timeSessions:    raw.timeSessions     ?? [],
          budgets:         raw.budgets         ?? [],
          transactions:    raw.transactions    ?? [],
          categoryBudgets: raw.categoryBudgets ?? [],
          savingsGoals:    raw.savingsGoals    ?? [],
        })
        setImportStatus('success')
        setImportMsg(`✓ ${raw.tasks.length} tâches, ${raw.objectives?.length ?? 0} objectifs importés.`)
      } catch {
        setImportStatus('error')
        setImportMsg('Fichier invalide. Vérifiez le format JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Domain edit handlers ──────────────────────────────────────────────────

  const startEdit = (id: string) => {
    const d = domains.find((d) => d.id === id)
    if (!d) return
    setEditingDomainId(id)
    setEditName(d.name)
    setEditIcon(d.icon)
    setEditColor(d.color)
    setEditDesc(d.description)
  }

  const saveEdit = () => {
    if (!editingDomainId || !editName.trim()) return
    updateDomain(editingDomainId, {
      name:        editName.trim(),
      icon:        editIcon,
      color:       editColor,
      description: editDesc.trim(),
    })
    setEditingDomainId(null)
  }

  const confirmDelete = (id: string) => {
    deleteDomain(id)
    setDeleteConfirmId(null)
  }

  const saveNewDomain = () => {
    if (!newName.trim()) return
    addDomain({ name: newName.trim(), icon: newIcon, color: newColor, description: newDesc.trim() })
    setNewName(''); setNewIcon('⭐'); setNewColor('blue'); setNewDesc('')
    setShowNewDomain(false)
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 px-4 py-6 md:px-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Paramètres</h1>
        <p className="text-sm text-zinc-500">Personnalise Aetheris selon tes préférences</p>
      </div>

      {/* ── Apparence ─────────────────────────────────────────────────────── */}
      <Section title="Apparence" description="Thème et langue de l'interface">
        {/* Theme */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-zinc-200">Thème</p>
            <p className="text-xs text-zinc-500">Mode sombre ou clair</p>
          </div>
          <div className="flex gap-1.5 rounded-lg bg-zinc-800 p-1">
            {(['dark', 'light'] as AppTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => applyTheme(t)}
                className={[
                  'rounded-md px-3 py-1 text-xs font-medium transition-all',
                  theme === t ? 'bg-zinc-700 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300',
                ].join(' ')}
              >
                {t === 'dark' ? '🌙 Sombre' : '☀️ Clair'}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-zinc-800 my-3" />

        {/* Language */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-zinc-200">Langue</p>
            <p className="text-xs text-zinc-500">Langue de l'interface</p>
          </div>
          <div className="flex gap-1.5 rounded-lg bg-zinc-800 p-1">
            {(['fr', 'en'] as AppLanguage[]).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={[
                  'rounded-md px-3 py-1 text-xs font-medium transition-all',
                  language === l ? 'bg-zinc-700 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300',
                ].join(' ')}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-zinc-800 my-3" />

        {/* Notifications */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-zinc-200">Rappels de deadlines</p>
            <p className="text-xs text-zinc-500">Notification browser pour les tâches dues aujourd'hui</p>
          </div>
          <Toggle
            checked={notifDeadlines}
            onChange={(v) => {
              if (v && Notification.permission !== 'granted') {
                Notification.requestPermission().then((p) => setNotifDeadlines(p === 'granted'))
              } else {
                setNotifDeadlines(v)
              }
            }}
          />
        </div>
      </Section>

      {/* ── Domaines ──────────────────────────────────────────────────────── */}
      <Section title="Domaines" description="Renomme, change la couleur ou supprime tes domaines de vie">
        <div className="space-y-2">
          {domains.map((domain) => {
            const c = getDomainColors(domain.color)
            const isEditing = editingDomainId === domain.id
            const DomainIcon = getDomainIcon(domain.name)

            if (isEditing) {
              return (
                <div key={domain.id} className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 space-y-3">
                  <div className="flex gap-3">
                    {/* Icon input */}
                    <input
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="w-12 rounded-lg border border-zinc-600 bg-zinc-700 px-2 py-2 text-center text-lg outline-none focus:border-zinc-400"
                      maxLength={2}
                    />
                    {/* Name */}
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nom du domaine"
                      className="flex-1 rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-400"
                    />
                  </div>
                  {/* Description */}
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description…"
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-500 outline-none focus:border-zinc-400"
                  />
                  {/* Color picker */}
                  <div>
                    <p className="text-xs text-zinc-500 mb-1.5">Couleur</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {COLORS.map((col) => (
                        <button
                          key={col}
                          onClick={() => setEditColor(col)}
                          className={[
                            'h-6 w-6 rounded-full border-2 transition-all',
                            editColor === col ? 'border-white scale-110' : 'border-transparent hover:border-zinc-400',
                          ].join(' ')}
                          style={{ backgroundColor: COLOR_HEX[col] }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingDomainId(null)} className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 transition-colors">Annuler</button>
                    <button onClick={saveEdit} disabled={!editName.trim()} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-40">Enregistrer</button>
                  </div>
                </div>
              )
            }

            return (
              <div key={domain.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 group hover:border-zinc-700 transition-colors">
                <span className={['flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm', c.bg, c.border].join(' ')}>
                  {DomainIcon ? <DomainIcon size={16} /> : domain.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{domain.name}</p>
                  <p className="text-xs text-zinc-600 truncate">{domain.description}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(domain.id)}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                    title="Modifier"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {deleteConfirmId === domain.id ? (
                    <div className="flex gap-1 items-center">
                      <span className="text-[10px] text-zinc-500">Supprimer ?</span>
                      <button onClick={() => confirmDelete(domain.id)} className="rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10 transition-colors">Oui</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-700 transition-colors">Non</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(domain.id)}
                      className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-700 hover:text-red-400 transition-colors"
                      title="Supprimer"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* New domain form */}
        {showNewDomain ? (
          <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-400">Nouveau domaine</p>
            <div className="flex gap-3">
              <input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="w-12 rounded-lg border border-zinc-600 bg-zinc-700 px-2 py-2 text-center text-lg outline-none focus:border-zinc-400"
                maxLength={2}
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du domaine"
                autoFocus
                className="flex-1 rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description…"
              className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-500 outline-none focus:border-zinc-400"
            />
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Couleur</p>
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map((col) => (
                  <button
                    key={col}
                    onClick={() => setNewColor(col)}
                    className={[
                      'h-6 w-6 rounded-full border-2 transition-all',
                      newColor === col ? 'border-white scale-110' : 'border-transparent hover:border-zinc-400',
                    ].join(' ')}
                    style={{ backgroundColor: COLOR_HEX[col] }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewDomain(false)} className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 transition-colors">Annuler</button>
              <button onClick={saveNewDomain} disabled={!newName.trim()} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-40">Créer</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewDomain(true)}
            className="mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            <span>Ajouter un domaine</span>
          </button>
        )}
      </Section>

      {/* ── Pomodoro ──────────────────────────────────────────────────────── */}
      <Section title="Pomodoro" description="Configure les durées et les sons du timer Focus">
        {/* Focus duration */}
        {[
          { label: 'Durée de focus',       desc: 'Durée d\'une session de concentration', key: 'focusDuration',           min: 1,  max: 120 },
          { label: 'Pause courte',          desc: 'Pause après chaque session',            key: 'shortBreakDuration',      min: 1,  max: 30  },
          { label: 'Pause longue',          desc: 'Pause après 4 sessions complétées',     key: 'longBreakDuration',       min: 5,  max: 60  },
          { label: 'Sessions avant pause longue', desc: 'Nombre de sessions par cycle',   key: 'sessionsBeforeLongBreak', min: 2,  max: 8   },
        ].map(({ label, desc, key, min, max }, i) => (
          <div key={key}>
            {i > 0 && <hr className="border-zinc-800 my-3" />}
            <div className="flex items-center justify-between py-1 gap-4">
              <div>
                <p className="text-sm text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={pomodoroSettings[key as keyof typeof pomodoroSettings] as number}
                  onChange={(e) => {
                    const v = Math.min(max, Math.max(min, Number(e.target.value)))
                    setPomodoroSettings({ [key]: v })
                  }}
                  className="w-16 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-center text-sm font-medium text-zinc-100 outline-none focus:border-zinc-500 tabular-nums"
                />
                <span className="text-xs text-zinc-500 w-8">
                  {key === 'sessionsBeforeLongBreak' ? 'sess.' : 'min'}
                </span>
              </div>
            </div>
          </div>
        ))}

        <hr className="border-zinc-800 my-3" />

        {/* Sound toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm text-zinc-200">Sons</p>
            <p className="text-xs text-zinc-500">Ding à la fin de chaque phase</p>
          </div>
          <Toggle
            checked={pomodoroSettings.soundEnabled}
            onChange={(v) => setPomodoroSettings({ soundEnabled: v })}
          />
        </div>
      </Section>

      {/* ── Catégories financières ────────────────────────────────────────── */}
      <Section title="Catégories financières" description="Personnalise les catégories de dépenses et de revenus">
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm text-zinc-200">Gérer les catégories</p>
            <p className="text-xs text-zinc-500">
              {financeCategories.filter((c) => c.type === 'expense').length} dépenses
              · {financeCategories.filter((c) => c.type === 'income').length} revenus
            </p>
          </div>
          <button
            onClick={() => navigate('/categories')}
            className="shrink-0 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
          >
            Gérer
            <span className="text-zinc-500">→</span>
          </button>
        </div>
      </Section>

      {/* ── Export / Import ────────────────────────────────────────────────── */}
      <Section title="Données" description="Exporte et importe tes données en JSON">
        {/* Export */}
        <div className="flex items-start justify-between gap-4 py-2">
          <div>
            <p className="text-sm text-zinc-200">Exporter les données</p>
            <p className="text-xs text-zinc-500">Télécharge un backup JSON de toutes tes données</p>
          </div>
          <button
            onClick={handleExport}
            className="shrink-0 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter
          </button>
        </div>

        <hr className="border-zinc-800 my-3" />

        {/* Import */}
        <div className="flex items-start justify-between gap-4 py-2">
          <div>
            <p className="text-sm text-zinc-200">Importer un backup</p>
            <p className="text-xs text-zinc-500">Charge un fichier JSON exporté précédemment</p>
            {importStatus !== 'idle' && (
              <p className={['text-xs mt-1', importStatus === 'success' ? 'text-teal-400' : 'text-red-400'].join(' ')}>
                {importMsg}
              </p>
            )}
          </div>
          <button
            onClick={() => { setImportStatus('idle'); fileInputRef.current?.click() }}
            className="shrink-0 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Importer
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>

        <hr className="border-zinc-800 my-3" />

        {/* Reset */}
        <div className="flex items-start justify-between gap-4 py-2">
          <div>
            <p className="text-sm text-zinc-200">Réinitialiser</p>
            <p className="text-xs text-zinc-500">Efface toutes les données et repart de zéro</p>
          </div>
          {resetConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Confirmer ?</span>
              <button onClick={() => { resetAll(); setResetConfirm(false) }} className="rounded-lg px-3 py-1.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors">Oui, effacer</button>
              <button onClick={() => setResetConfirm(false)} className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 transition-colors">Annuler</button>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirm(true)}
              className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </Section>

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <Section title="À propos">
        <div className="space-y-1.5 text-xs text-zinc-500">
          <div className="flex justify-between">
            <span>Application</span>
            <span className="text-zinc-300">Aetheris — Lucidité Personnelle</span>
          </div>
          <div className="flex justify-between">
            <span>Version</span>
            <span className="text-zinc-300">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Stack</span>
            <span className="text-zinc-400">React 19 · TypeScript · Tailwind 4 · Zustand 5</span>
          </div>
          <div className="flex justify-between">
            <span>Stockage</span>
            <span className="text-zinc-400">localStorage (aetheris-store)</span>
          </div>
        </div>
      </Section>
    </div>
  )
}
