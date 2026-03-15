import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { getDomainColors } from '../utils/domainColors'
import type { Expense, ExpenseCategory } from '../types'

interface Props {
  domainId?: string
  expense?: Expense
  onClose: () => void
}

const CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'food',          label: 'Alimentation',  icon: '🍎' },
  { value: 'health',        label: 'Santé',         icon: '💊' },
  { value: 'education',     label: 'Formation',     icon: '📚' },
  { value: 'entertainment', label: 'Loisirs',       icon: '🎭' },
  { value: 'transport',     label: 'Transport',     icon: '🚌' },
  { value: 'housing',       label: 'Logement',      icon: '🏠' },
  { value: 'clothing',      label: 'Vêtements',     icon: '👔' },
  { value: 'savings',       label: 'Épargne',       icon: '🏦' },
  { value: 'other',         label: 'Autre',         icon: '📦' },
]

export function ExpenseFormModal({ domainId: propDomainId, expense, onClose }: Props) {
  const domains        = useStore((s) => s.domains)
  const addExpense     = useStore((s) => s.addExpense)
  const updateExpense  = useStore((s) => s.updateExpense)

  const today = new Date().toISOString().split('T')[0]
  const isEdit = !!expense

  const [amount,      setAmount]      = useState(expense ? String(expense.amount) : '')
  const [category,    setCategory]    = useState<ExpenseCategory>(expense?.category ?? 'other')
  const [domainId,    setDomainId]    = useState(propDomainId ?? expense?.domainId ?? '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [date,        setDate]        = useState(expense?.date ?? today)

  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => { amountRef.current?.focus() }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0 || !domainId) return

    const payload = {
      domainId,
      amount:      parsed,
      category,
      description: description.trim(),
      date,
    }

    if (isEdit) {
      updateExpense(expense.id, payload)
    } else {
      addExpense(payload)
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            {isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Montant */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Montant (€)</label>
            <div className="relative">
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-colors"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">€</span>
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Catégorie</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={[
                    'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-all',
                    category === c.value
                      ? 'border-teal-500/40 bg-teal-500/15 text-teal-300'
                      : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300',
                  ].join(' ')}
                >
                  <span>{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Domaine */}
          {!propDomainId && (
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500">Domaine</label>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {domains.map((d) => {
                  const c = getDomainColors(d.color)
                  return (
                    <button key={d.id} type="button"
                      onClick={() => setDomainId(d.id)}
                      className={[
                        'flex flex-col items-center gap-1 rounded-lg border py-2 px-1 text-center transition-all',
                        domainId === d.id ? [c.bg, c.border, c.text].join(' ') : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300',
                      ].join(' ')}>
                      <span className="text-lg leading-none">{d.icon}</span>
                      <span className="text-[9px] leading-tight">{d.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnelle)…"
            className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-colors"
          />

          {/* Date */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500 transition-colors [color-scheme:dark]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors">Annuler</button>
            <button
              type="submit"
              disabled={!amount || parseFloat(amount.replace(',', '.')) <= 0 || !domainId}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-40"
            >
              {isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
