import { useState, useMemo } from 'react'
import { useStore } from '../store'
import type { FinanceCategory, FinanceCategoryType } from '../types'

// ─── Icon picker options ───────────────────────────────────────────────────────

const ICON_OPTIONS = [
  '🏠','🏡','🏢','🏬','🏗️',
  '🚗','🚌','🚂','✈️','🛵',
  '🍎','🥗','🍕','🍔','☕',
  '🍺','🛒','🎮','🎭','🎬',
  '📚','🎓','💻','📱','🎨',
  '👗','👟','💊','🏋️','🧘',
  '💼','📈','💰','🎁','🎀',
  '🏖️','🏥','🔧','⚡','🎵',
]

const COLOR_OPTIONS = [
  '#ef4444','#f97316','#f59e0b','#eab308',
  '#22c55e','#10b981','#06b6d4','#3b82f6',
  '#6366f1','#8b5cf6','#a855f7','#ec4899',
  '#71717a','#14b8a6',
]

// ─── CategoriesPage ───────────────────────────────────────────────────────────

export function CategoriesPage() {
  const transactions                       = useStore((s) => s.transactions)
  const financeCategories                  = useStore((s) => s.financeCategories)
  const addFinanceCategory                 = useStore((s) => s.addFinanceCategory)
  const updateFinanceCategory              = useStore((s) => s.updateFinanceCategory)
  const deleteFinanceCategory              = useStore((s) => s.deleteFinanceCategory)
  const reassignAndDeleteFinanceCategory   = useStore((s) => s.reassignAndDeleteFinanceCategory)

  const [tab,          setTab]          = useState<FinanceCategoryType>('expense')
  const [modal,        setModal]        = useState<'create' | 'edit' | 'delete' | null>(null)
  const [editTarget,   setEditTarget]   = useState<FinanceCategory | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<FinanceCategory | undefined>()
  const [reassignTo,   setReassignTo]   = useState('')

  // Form state (shared create/edit)
  const [formName,  setFormName]  = useState('')
  const [formIcon,  setFormIcon]  = useState('📦')
  const [formColor, setFormColor] = useState('#71717a')
  const [formType,  setFormType]  = useState<FinanceCategoryType>('expense')

  // ── Derived ────────────────────────────────────────────────────────────────

  const txCountById = useMemo(() => {
    const map = new Map<string, number>()
    transactions.forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + 1))
    return map
  }, [transactions])

  const currentTabCats = useMemo(
    () => financeCategories.filter((c) => c.type === tab),
    [financeCategories, tab],
  )

  const deleteCount     = deleteTarget ? (txCountById.get(deleteTarget.id) ?? 0) : 0
  const reassignOptions = deleteTarget
    ? financeCategories.filter((c) => c.type === deleteTarget.type && c.id !== deleteTarget.id)
    : []

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(undefined)
    setFormName(''); setFormIcon('📦'); setFormColor('#71717a'); setFormType(tab)
    setModal('create')
  }

  const openEdit = (cat: FinanceCategory) => {
    setEditTarget(cat)
    setFormName(cat.name); setFormIcon(cat.icon); setFormColor(cat.color); setFormType(cat.type)
    setModal('edit')
  }

  const openDelete = (cat: FinanceCategory) => {
    setDeleteTarget(cat)
    const opts = financeCategories.filter((c) => c.type === cat.type && c.id !== cat.id)
    setReassignTo(opts[0]?.id ?? '')
    setModal('delete')
  }

  const saveForm = () => {
    if (!formName.trim()) return
    if (modal === 'edit' && editTarget) {
      updateFinanceCategory(editTarget.id, { name: formName.trim(), icon: formIcon, color: formColor, type: formType })
    } else {
      addFinanceCategory({ name: formName.trim(), icon: formIcon, color: formColor, type: formType })
    }
    setModal(null)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteCount > 0 && reassignTo) {
      reassignAndDeleteFinanceCategory(deleteTarget.id, reassignTo)
    } else {
      deleteFinanceCategory(deleteTarget.id)
    }
    setModal(null)
    setDeleteTarget(undefined)
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 py-2">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Catégories</h1>
          <p className="mt-1 text-sm text-zinc-500">Gère les catégories de transactions financières</p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 flex items-center gap-1.5 rounded-xl border border-teal-500/25 bg-teal-500/15 px-4 py-2 text-xs font-medium text-teal-400 hover:bg-teal-500/25 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Nouvelle catégorie
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-1 w-fit">
        {(['expense', 'income'] as FinanceCategoryType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'rounded-lg px-5 py-2 text-sm font-medium transition-all',
              tab === t ? 'bg-zinc-700 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            {t === 'expense' ? '↓ Dépenses' : '↑ Revenus'}
            <span className={['ml-2 rounded-full px-1.5 py-0.5 text-[10px]',
              tab === t ? 'bg-zinc-600 text-zinc-300' : 'bg-zinc-800 text-zinc-600',
            ].join(' ')}>
              {financeCategories.filter((c) => c.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Category list ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {currentTabCats.map((cat) => {
          const count = txCountById.get(cat.id) ?? 0
          return (
            <div
              key={cat.id}
              className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors"
            >
              {/* Icon badge */}
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl border border-zinc-700/60"
                style={{ backgroundColor: cat.color + '22' }}
              >
                {cat.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <p className="text-sm font-medium text-zinc-200 truncate">{cat.name}</p>
                </div>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {count > 0
                    ? `${count} transaction${count > 1 ? 's' : ''}`
                    : 'Aucune transaction'
                  }
                </p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(cat)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                  title="Modifier"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => openDelete(cat)}
                  className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-700 hover:text-red-400 transition-colors"
                  title="Supprimer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}

        {/* Empty state */}
        {currentTabCats.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
            <p className="text-sm text-zinc-600">Aucune catégorie de {tab === 'expense' ? 'dépense' : 'revenu'}</p>
            <button
              onClick={openCreate}
              className="mt-3 text-xs text-teal-500 hover:text-teal-400 transition-colors"
            >
              Créer la première →
            </button>
          </div>
        )}
      </div>

      {/* ── Create / Edit modal ───────────────────────────────────────────── */}
      {(modal === 'create' || modal === 'edit') && (
        <ModalBackdrop onClose={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-200">
                {modal === 'edit' ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <button onClick={() => setModal(null)} className="text-zinc-600 hover:text-zinc-300 transition-colors leading-none">✕</button>
            </div>

            <div className="space-y-5 p-5">
              {/* Usage count (edit only) */}
              {modal === 'edit' && editTarget && (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-2.5">
                  <span className="text-xl">{editTarget.icon}</span>
                  <p className="text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-200">
                      {txCountById.get(editTarget.id) ?? 0}
                    </span> transaction{(txCountById.get(editTarget.id) ?? 0) !== 1 ? 's' : ''} utilisent cette catégorie
                  </p>
                </div>
              )}

              {/* Type toggle */}
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['expense', 'income'] as FinanceCategoryType[]).map((t) => (
                    <button key={t} type="button" onClick={() => setFormType(t)}
                      className={['rounded-xl border py-2.5 text-sm font-medium transition-all',
                        formType === t
                          ? t === 'expense' ? 'border-red-500/40 bg-red-500/15 text-red-400' : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                          : 'border-zinc-800 text-zinc-500 hover:border-zinc-700',
                      ].join(' ')}>
                      {t === 'expense' ? '↓ Dépense' : '↑ Revenu'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name + preview */}
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">Nom</p>
                <div className="flex items-center gap-3">
                  {/* Live preview badge */}
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl border border-zinc-700/60"
                    style={{ backgroundColor: formColor + '22' }}
                  >
                    {formIcon}
                  </div>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Courses, Restaurant, Loyer…"
                    autoFocus
                    className="flex-1 rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">Icône</p>
                <div className="grid grid-cols-10 gap-1.5">
                  {ICON_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormIcon(emoji)}
                      className={[
                        'flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-all hover:scale-110',
                        formIcon === emoji
                          ? 'bg-teal-500/20 ring-1 ring-teal-500/50 scale-110'
                          : 'bg-zinc-800/60 hover:bg-zinc-700',
                      ].join(' ')}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">Couleur</p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={[
                        'h-7 w-7 rounded-full border-2 transition-all',
                        formColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-zinc-400',
                      ].join(' ')}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setModal(null)}
                  className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">
                  Annuler
                </button>
                <button type="button" onClick={saveForm} disabled={!formName.trim()}
                  className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-40">
                  {modal === 'edit' ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* ── Delete modal ──────────────────────────────────────────────────── */}
      {modal === 'delete' && deleteTarget && (
        <ModalBackdrop onClose={() => setModal(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-200">Supprimer la catégorie</h2>
              <button onClick={() => setModal(null)} className="text-zinc-600 hover:text-zinc-300 transition-colors leading-none">✕</button>
            </div>

            <div className="space-y-4 p-5">
              {/* Category preview */}
              <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
                  style={{ backgroundColor: deleteTarget.color + '22' }}
                >
                  {deleteTarget.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{deleteTarget.name}</p>
                  <p className="text-xs text-zinc-500">
                    {deleteCount > 0
                      ? <span className="text-amber-400">{deleteCount} transaction{deleteCount > 1 ? 's' : ''} utilisent cette catégorie</span>
                      : 'Aucune transaction'}
                  </p>
                </div>
              </div>

              {/* Reassign picker */}
              {deleteCount > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-400">
                    Réassigner les transactions vers :
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {reassignOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setReassignTo(opt.id)}
                        className={[
                          'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                          reassignTo === opt.id
                            ? 'border-teal-500/40 bg-teal-500/10'
                            : 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700',
                        ].join(' ')}
                      >
                        <span className="text-lg leading-none">{opt.icon}</span>
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                        <span className={['text-sm', reassignTo === opt.id ? 'text-teal-300' : 'text-zinc-300'].join(' ')}>
                          {opt.name}
                        </span>
                        {reassignTo === opt.id && (
                          <span className="ml-auto text-[10px] text-teal-500">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setModal(null)}
                  className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteCount > 0 && !reassignTo}
                  className="rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40"
                >
                  {deleteCount > 0 ? 'Réassigner et supprimer' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  )
}

// ─── ModalBackdrop ────────────────────────────────────────────────────────────

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}
