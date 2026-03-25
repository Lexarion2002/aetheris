import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '../store'
import type { Transaction, SavingsGoal, FinanceCategory } from '../types'

// PDF.js worker URL (must be at module level for Vite's static analysis)
const PDF_WORKER_URL = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href

// ─── Category helpers ─────────────────────────────────────────────────────────

type CatEntry = { key: string; label: string; icon: string; color: string }

function makeCatMeta(categories: FinanceCategory[]) {
  return function catMeta(key: string): CatEntry {
    const c = categories.find((c) => c.id === key)
    return c ? { key: c.id, label: c.name, icon: c.icon, color: c.color }
             : { key, label: key, icon: '📦', color: '#71717a' }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const fmtDec = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthKey(d)
}
function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── TxPagination ─────────────────────────────────────────────────────────────

function TxPagination({ page, total, count, pageSize, onChange }: {
  page:     number
  total:    number
  count:    number
  pageSize: number
  onChange: (p: number) => void
}) {
  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, count)
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs text-zinc-500">
      {/* Info */}
      <span className="tabular-nums">
        {from}–{to} sur <span className="text-zinc-400 font-medium">{count}</span> transaction{count > 1 ? 's' : ''}
      </span>
      {/* Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Précédent
        </button>
        <span className="px-2 tabular-nums text-zinc-600">
          {page} / {total}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= total}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Suivant →
        </button>
      </div>
    </div>
  )
}

// ─── FinancePage ──────────────────────────────────────────────────────────────

export function FinancePage() {
  const [month,          setMonth]          = useState(monthKey())
  const [showTxModal,    setShowTxModal]    = useState(false)
  const [editTx,         setEditTx]         = useState<Transaction | undefined>()
  const [budgetCat,      setBudgetCat]      = useState<string | null>(null)
  const [showGoalModal,  setShowGoalModal]  = useState(false)
  const [editGoal,       setEditGoal]       = useState<SavingsGoal | undefined>()
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | undefined>()
  const [txType,         setTxType]         = useState<'all' | 'income' | 'expense'>('all')
  const [txCat,          setTxCat]          = useState('')
  const [txPage,         setTxPage]         = useState(1)
  const [showCsvModal,   setShowCsvModal]   = useState(false)
  const [showPdfModal,   setShowPdfModal]   = useState(false)

  const transactions      = useStore((s) => s.transactions)
  const categoryBudgets   = useStore((s) => s.categoryBudgets)
  const savingsGoals      = useStore((s) => s.savingsGoals)
  const financeCategories = useStore((s) => s.financeCategories)
  const deleteTransaction = useStore((s) => s.deleteTransaction)

  const catMeta     = useMemo(() => makeCatMeta(financeCategories), [financeCategories])
  const expenseCats = useMemo(() => financeCategories.filter((c) => c.type === 'expense'), [financeCategories])

  // ── Month data ────────────────────────────────────────────────────────────────
  const previousBalance = useMemo(
    () => transactions
      .filter((t) => t.date < month + '-01')
      .reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0),
    [transactions, month],
  )
  const monthTx = useMemo(
    () => transactions.filter((t) => t.date.startsWith(month)),
    [transactions, month],
  )
  const totalIncome  = useMemo(() => monthTx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0),  [monthTx])
  const totalExpense = useMemo(() => monthTx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0), [monthTx])
  const netBalance   = previousBalance + totalIncome - totalExpense

  // ── Pie chart data ────────────────────────────────────────────────────────────
  const expensePie = useMemo(() => {
    const map = new Map<string, number>()
    monthTx.filter((t) => t.type === 'expense').forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount))
    return Array.from(map, ([catId, value]) => ({ value, ...catMeta(catId) })).sort((a, b) => b.value - a.value)
  }, [monthTx])

  const incomePie = useMemo(() => {
    const map = new Map<string, number>()
    monthTx.filter((t) => t.type === 'income').forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount))
    return Array.from(map, ([catId, value]) => ({ value, ...catMeta(catId) })).sort((a, b) => b.value - a.value)
  }, [monthTx])

  // ── Budget lookups ────────────────────────────────────────────────────────────
  const budgetMap = useMemo(() => {
    const m = new Map<string, number>()
    categoryBudgets.forEach((b) => m.set(b.category, b.amount))
    return m
  }, [categoryBudgets])

  const spentMap = useMemo(() => {
    const m = new Map<string, number>()
    monthTx.filter((t) => t.type === 'expense').forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + t.amount))
    return m
  }, [monthTx])

  // ── Transactions table ────────────────────────────────────────────────────────
  const filteredTx = useMemo(() => {
    return [...transactions]
      .filter((t) => t.date.startsWith(month))
      .filter((t) => txType === 'all' || t.type === txType)
      .filter((t) => !txCat || t.category === txCat)
      .sort((a, b) => {
        const d = b.date.localeCompare(a.date)
        return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt)
      })
  }, [transactions, month, txType, txCat])

  const usedCats = useMemo(() => Array.from(new Set(monthTx.map((t) => t.category))), [monthTx])

  // ── Pagination ───────────────────────────────────────────────────────────────
  const TX_PAGE_SIZE = 10
  const totalTxPages = Math.max(1, Math.ceil(filteredTx.length / TX_PAGE_SIZE))
  const pagedTx      = filteredTx.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE)

  // Reset to page 1 when filters or month change
  useEffect(() => { setTxPage(1) }, [txType, txCat, month])

  return (
    <div className="space-y-12">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Finances</h1>
          <p className="mt-1 text-sm text-zinc-500 capitalize">{monthLabel(month)}</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">‹</button>
          <span className="min-w-[110px] text-center text-xs font-medium capitalize text-zinc-300">{monthLabel(month)}</span>
          <button onClick={() => setMonth((m) => shiftMonth(m, +1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors">›</button>
        </div>
      </div>

      {/* ── Section 1 : Récapitulatif ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Revenus"   value={fmt(totalIncome)}  sign="↑" accent="emerald" />
          <SummaryCard label="Dépenses"  value={fmt(totalExpense)} sign="↓" accent="red"     />
          <SummaryCard label="Solde net" value={fmt(netBalance)}   sign="⊜" accent={netBalance >= 0 ? 'teal' : 'red'}
            sub={previousBalance !== 0 ? `Report : ${previousBalance > 0 ? '+' : ''}${fmtDec(previousBalance)}` : undefined} />
        </div>
        <ContextLine
          month={month}
          monthTx={monthTx}
          categoryBudgets={categoryBudgets}
          financeCategories={financeCategories}
        />
      </div>

      {/* ── Section 2 : Graphiques ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <PieSection title="Dépenses par catégorie" data={expensePie} total={totalExpense} empty="Aucune dépense ce mois" />
        <PieSection title="Revenus par catégorie"  data={incomePie}  total={totalIncome}  empty="Aucun revenu ce mois"   />
      </div>

      {/* ── Section 3 : Budgets ───────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-base font-semibold text-zinc-100">Budgets mensuels</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {expenseCats.map((cat) => {
            const budget   = budgetMap.get(cat.id) ?? 0
            const spent    = spentMap.get(cat.id) ?? 0
            const realPct  = budget > 0 ? (spent / budget) * 100 : 0
            const barWidth = budget > 0 ? Math.min(100, realPct) : 0
            const bar      = realPct >= 100 ? 'bg-red-500' : realPct >= 50 ? 'bg-amber-500' : 'bg-green-500'
            const pctText  = realPct >= 100 ? 'text-red-400' : realPct >= 50 ? 'text-amber-400' : 'text-green-500'
            const overage  = spent - budget
            return (
              <div key={cat.id} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                    <span className="text-base">{cat.icon}</span>
                    {cat.name}
                  </span>
                  <button onClick={() => setBudgetCat(cat.id)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors" title="Modifier le budget">
                    ✎
                  </button>
                </div>
                <div>
                  <div className="mb-1.5 flex items-end justify-between text-xs">
                    <span className={spent > 0 ? 'font-medium text-zinc-300' : 'text-zinc-600'}>{fmtDec(spent)}</span>
                    {budget > 0
                      ? <span className="text-zinc-600">/ {fmtDec(budget)}</span>
                      : <button onClick={() => setBudgetCat(cat.id)} className="text-teal-600 hover:text-teal-400 transition-colors">+ Définir</button>
                    }
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    {budget > 0 && (
                      <div className={['h-full rounded-full transition-all duration-500', bar].join(' ')} style={{ width: `${barWidth}%` }} />
                    )}
                  </div>
                  {budget > 0 && (
                    <p className={['mt-1 text-[10px]', pctText].join(' ')}>
                      {Math.round(realPct)}% du budget
                      {realPct >= 100 && ` — Dépassement : +${fmtDec(overage)}`}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Section 4 : Épargne ───────────────────────────────────────────────── */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">Objectifs d'épargne</h2>
          <button onClick={() => { setEditGoal(undefined); setShowGoalModal(true) }}
            className="text-xs text-teal-500 hover:text-teal-400 transition-colors">
            + Nouvel objectif
          </button>
        </div>
        {savingsGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-14 text-center">
            <p className="text-sm text-zinc-600">Aucun objectif d'épargne</p>
            <button onClick={() => { setEditGoal(undefined); setShowGoalModal(true) }}
              className="mt-3 text-xs text-teal-500 hover:text-teal-400 transition-colors">
              Créer mon premier objectif →
            </button>
          </div>
        ) : (
          <>
            {/* Level 1 — Vue consolidée */}
            <SavingsConsolidated goals={savingsGoals} />

            {/* Level 2 — Cartes individuelles triées par date cible */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...savingsGoals]
                .sort((a, b) => {
                  if (!a.targetDate && !b.targetDate) return 0
                  if (!a.targetDate) return 1
                  if (!b.targetDate) return -1
                  return a.targetDate.localeCompare(b.targetDate)
                })
                .map((goal) => (
                  <SavingsCard key={goal.id} goal={goal}
                    onEdit={() => { setEditGoal(goal); setShowGoalModal(true) }}
                    onContribute={() => setContributeGoal(goal)} />
                ))}
            </div>
          </>
        )}
      </section>

      {/* ── Section 5 : Transactions ──────────────────────────────────────────── */}
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-100">
            Transactions
            {filteredTx.length > 0 && (
              <span className="ml-2 text-xs font-normal text-zinc-600">
                {filteredTx.length > TX_PAGE_SIZE
                  ? `${(txPage - 1) * TX_PAGE_SIZE + 1}–${Math.min(txPage * TX_PAGE_SIZE, filteredTx.length)} sur ${filteredTx.length}`
                  : filteredTx.length}
              </span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              {(['all', 'income', 'expense'] as const).map((f) => (
                <button key={f} onClick={() => setTxType(f)}
                  className={['px-3 py-1.5 text-xs font-medium transition-colors',
                    txType === f ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
                  ].join(' ')}>
                  {f === 'all' ? 'Tout' : f === 'income' ? 'Revenus' : 'Dépenses'}
                </button>
              ))}
            </div>
            {usedCats.length > 1 && (
              <select value={txCat} onChange={(e) => setTxCat(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 outline-none">
                <option value="">Toutes catégories</option>
                {usedCats.map((k) => <option key={k} value={k}>{catMeta(k).label}</option>)}
              </select>
            )}
            <button
              onClick={() => setShowPdfModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <span className="text-sm leading-none">📄</span>
              Relevé PDF
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <span className="text-sm leading-none">↑</span>
              Importer CSV
            </button>
            <button
              onClick={() => { setEditTx(undefined); setShowTxModal(true) }}
              className="flex items-center gap-1.5 rounded-xl border border-teal-500/25 bg-teal-500/15 px-3 py-1.5 text-xs font-medium text-teal-400 hover:bg-teal-500/25 transition-colors"
            >
              <span className="text-sm leading-none">+</span>
              Transaction
            </button>
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-14 text-center">
            <p className="text-sm text-zinc-600">Aucune transaction ce mois</p>
            <button onClick={() => { setEditTx(undefined); setShowTxModal(true) }}
              className="mt-3 text-xs text-teal-500 hover:text-teal-400 transition-colors">
              Ajouter une transaction →
            </button>
          </div>
        ) : (
          <>
            {/* Pagination — haut */}
            {totalTxPages > 1 && (
              <TxPagination page={txPage} total={totalTxPages} count={filteredTx.length} pageSize={TX_PAGE_SIZE} onChange={setTxPage} />
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wider text-zinc-600">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Catégorie</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left">Note</th>
                    <th className="w-16 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {pagedTx.map((tx) => {
                    const cat = catMeta(tx.category)
                    return (
                      <tr key={tx.id} className="group hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                          {new Date(tx.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                            <span>{cat.icon}</span>
                            {cat.label}
                            <span className={['ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                              tx.type === 'income' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400',
                            ].join(' ')}>
                              {tx.type === 'income' ? '↑' : '↓'}
                            </span>
                          </span>
                        </td>
                        <td className={['px-4 py-3 text-right font-semibold tabular-nums',
                          tx.type === 'income' ? 'text-emerald-400' : 'text-red-400',
                        ].join(' ')}>
                          {tx.type === 'income' ? '+' : '-'}{fmtDec(tx.amount)}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 max-w-[180px]">
                          <span className="truncate text-xs text-zinc-600">{tx.note ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditTx(tx); setShowTxModal(true) }}
                              className="rounded p-1 text-zinc-600 hover:text-zinc-300 transition-colors">✎</button>
                            <button onClick={() => deleteTransaction(tx.id)}
                              className="rounded p-1 text-zinc-700 hover:text-red-400 transition-colors">✕</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination — bas */}
            {totalTxPages > 1 && (
              <TxPagination page={txPage} total={totalTxPages} count={filteredTx.length} pageSize={TX_PAGE_SIZE} onChange={setTxPage} />
            )}
          </>
        )}
      </section>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showTxModal && (
        <TransactionModal tx={editTx} onClose={() => { setShowTxModal(false); setEditTx(undefined) }} />
      )}
      {budgetCat && (
        <BudgetModal category={budgetCat} current={budgetMap.get(budgetCat) ?? 0} onClose={() => setBudgetCat(null)} />
      )}
      {showGoalModal && (
        <SavingsGoalModal goal={editGoal} onClose={() => { setShowGoalModal(false); setEditGoal(undefined) }} />
      )}
      {contributeGoal && (
        <ContributeModal goal={contributeGoal} onClose={() => setContributeGoal(undefined)} />
      )}
      {showCsvModal && (
        <CSVImportModal onClose={() => setShowCsvModal(false)} />
      )}
      {showPdfModal && (
        <PDFImportModal onClose={() => setShowPdfModal(false)} />
      )}
    </div>
  )
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

type Accent = 'emerald' | 'red' | 'teal'
const ACCENT: Record<Accent, { text: string; bg: string; border: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  red:     { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  teal:    { text: 'text-teal-400',    bg: 'bg-teal-500/10',    border: 'border-teal-500/20'    },
}

function SummaryCard({ label, value, sign, accent, sub }: { label: string; value: string; sign: string; accent: Accent; sub?: string }) {
  const cls = ACCENT[accent]
  return (
    <div className={['rounded-2xl border p-6', cls.bg, cls.border].join(' ')}>
      <div className="mb-3 flex items-center gap-2">
        <span className={['text-lg font-bold', cls.text].join(' ')}>{sign}</span>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      </div>
      <p className={['text-3xl font-bold tabular-nums leading-none', cls.text].join(' ')}>{value}</p>
      {sub && <p className="mt-2 text-xs tabular-nums text-zinc-600">{sub}</p>}
    </div>
  )
}

// ─── PieSection ───────────────────────────────────────────────────────────────

type PieRow = CatEntry & { value: number }

function PieSection({ title, data, total, empty }: { title: string; data: PieRow[]; total: number; empty: string }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="mb-6 text-sm font-semibold text-zinc-200">{title}</h3>
        <div className="flex h-36 items-center justify-center">
          <p className="text-sm text-zinc-700">{empty}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h3 className="mb-5 text-sm font-semibold text-zinc-200">{title}</h3>
      <div className="flex items-center gap-6">
        <div className="h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={62} innerRadius={38} dataKey="value" paddingAngle={2}>
                {data.map((_entry, i) => <Cell key={i} fill={data[i].color} />)}
              </Pie>
              <Tooltip content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0]?.payload as PieRow
                return (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
                    <p className="text-zinc-400">{d.icon} {d.label}</p>
                    <p className="mt-0.5 font-semibold text-zinc-100">{fmtDec(d.value)}</p>
                  </div>
                )
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {data.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="min-w-0 truncate text-zinc-400">{item.icon} {item.label}</span>
              <span className="ml-auto shrink-0 font-semibold tabular-nums text-zinc-300">{fmtDec(item.value)}</span>
            </div>
          ))}
          <div className="border-t border-zinc-800 pt-2 flex justify-between text-xs">
            <span className="text-zinc-600">Total</span>
            <span className="font-semibold text-zinc-200">{fmtDec(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ContextLine ──────────────────────────────────────────────────────────────

function ContextLine({ month, monthTx, categoryBudgets, financeCategories }: {
  month:              string
  monthTx:            Transaction[]
  categoryBudgets:    { category: string; amount: number }[]
  financeCategories:  FinanceCategory[]
}) {
  const [y, m]     = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const now         = new Date()
  const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth

  const totalExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome  = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalBudget  = categoryBudgets.reduce((s, b) => s + b.amount, 0)

  // Rythme
  const tempsPct    = daysInMonth > 0 ? (daysElapsed / daysInMonth) * 100 : 0
  const depensePct  = totalBudget > 0 ? (totalExpense / totalBudget) * 100 : null

  let rythmeCls = 'text-emerald-400'
  let rythmeMsg = ''
  if (depensePct !== null && totalBudget > 0) {
    rythmeMsg = `${Math.round(depensePct)}% du budget dépensé en ${Math.round(tempsPct)}% du mois`
    if (depensePct > tempsPct * 1.4) rythmeCls = 'text-red-400'
    else if (depensePct > tempsPct * 1.1) rythmeCls = 'text-amber-400'
    else rythmeCls = 'text-emerald-400'
  }

  // Épargne projetée
  const epargneCours  = totalIncome - totalExpense
  const epargneProjete = daysElapsed > 0 ? Math.round(epargneCours * (daysInMonth / daysElapsed)) : null

  // Alerte catégorie
  const spentMap = new Map<string, number>()
  monthTx.filter((t) => t.type === 'expense').forEach((t) => spentMap.set(t.category, (spentMap.get(t.category) ?? 0) + t.amount))
  const catMeta = makeCatMeta(financeCategories)
  const worstCat = categoryBudgets
    .filter((b) => b.amount > 0)
    .map((b) => ({ id: b.category, pct: ((spentMap.get(b.category) ?? 0) / b.amount) * 100 }))
    .filter((x) => x.pct >= 100)
    .sort((a, b) => b.pct - a.pct)[0]

  if (!rythmeMsg && epargneProjete === null && !worstCat) return null

  return (
    <div className="flex flex-wrap items-start gap-x-8 gap-y-2 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-5 py-3">
      {/* Rythme */}
      {rythmeMsg && (
        <p className={`text-xs ${rythmeCls}`}>{rythmeMsg}</p>
      )}

      {/* Épargne projetée */}
      {epargneProjete !== null && (
        <p className={`text-xs ${epargneProjete >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          Épargne estimée ce mois : {epargneProjete >= 0 ? '+' : ''}{fmtDec(epargneProjete)}
        </p>
      )}

      {/* Alerte catégorie */}
      {worstCat && (
        <p className="text-xs text-zinc-500">
          Attention : {catMeta(worstCat.id).label} à {Math.round(worstCat.pct)}% du budget
        </p>
      )}
    </div>
  )
}

// ─── SavingsConsolidated ──────────────────────────────────────────────────────

function SavingsConsolidated({ goals }: { goals: SavingsGoal[] }) {
  const totalTarget  = goals.reduce((s, g) => s + g.targetAmount, 0)
  const totalSaved   = goals.reduce((s, g) => s + g.currentAmount, 0)
  const globalPct    = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

  // Contribution mensuelle totale nécessaire
  const now = new Date()
  const totalContribNeeded = goals
    .filter((g) => g.currentAmount < g.targetAmount && !g.paused)
    .reduce((sum, g) => {
      if (!g.targetDate) return sum
      const target   = new Date(g.targetDate)
      const months   = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth())
      const needed   = (g.targetAmount - g.currentAmount) / months
      return sum + needed
    }, 0)

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-0.5">Total visé</p>
            <p className="font-semibold text-zinc-200">{fmt(totalTarget)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-0.5">Total épargné</p>
            <p className="font-semibold text-emerald-400">{fmt(totalSaved)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-0.5">Progression</p>
            <p className="font-semibold text-zinc-200">{globalPct}%</p>
          </div>
        </div>
        {totalContribNeeded > 0 && (
          <p className="text-xs text-zinc-500 self-end">
            Pour être dans les temps, épargner{' '}
            <span className="font-semibold text-zinc-300">{fmt(totalContribNeeded)}/mois</span>
          </p>
        )}
      </div>
      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${globalPct}%` }} />
      </div>
    </div>
  )
}

// ─── SavingsCard ──────────────────────────────────────────────────────────────

function SavingsCard({ goal, onEdit, onContribute }: {
  goal: SavingsGoal; onEdit: () => void; onContribute: () => void
}) {
  const deleteSavingsGoal  = useStore((s) => s.deleteSavingsGoal)
  const updateSavingsGoal  = useStore((s) => s.updateSavingsGoal)
  const [confirmDel, setConfirmDel] = useState(false)

  const pct       = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
  const achieved  = remaining === 0

  const now = new Date()
  let monthsLeft: number | null = null
  if (goal.targetDate) {
    const target = new Date(goal.targetDate)
    monthsLeft = Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth())
  }

  const contribNeeded = !achieved && monthsLeft !== null && monthsLeft > 0
    ? Math.ceil(remaining / monthsLeft)
    : null

  // Status: paused > achieved > en_bonne_voie / a_accelerer
  // "En bonne voie" if avg monthly contributions since creation >= contribNeeded
  const monthsSinceCreation = Math.max(1, (Date.now() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30.5))
  const avgMonthlyContrib   = goal.currentAmount / monthsSinceCreation

  type GoalStatus = 'achieved' | 'en_pause' | 'en_bonne_voie' | 'a_accelerer'
  let status: GoalStatus = 'a_accelerer'
  if (achieved)         status = 'achieved'
  else if (goal.paused) status = 'en_pause'
  else if (contribNeeded !== null && avgMonthlyContrib >= contribNeeded) status = 'en_bonne_voie'

  const STATUS_LABELS: Record<GoalStatus, string> = {
    achieved:       'Objectif atteint',
    en_pause:       'En pause',
    en_bonne_voie:  'En bonne voie',
    a_accelerer:    'À accélérer',
  }
  const STATUS_CLS: Record<GoalStatus, string> = {
    achieved:      'bg-emerald-500/15 text-emerald-400',
    en_pause:      'bg-zinc-700/40 text-zinc-500',
    en_bonne_voie: 'bg-teal-500/15 text-teal-400',
    a_accelerer:   'bg-amber-500/15 text-amber-400',
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-zinc-200 truncate">{goal.title}</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-100">{fmtDec(goal.targetAmount)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
          <button onClick={onEdit} className="rounded p-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors" title="Modifier">✎</button>
          {confirmDel
            ? <button onClick={() => deleteSavingsGoal(goal.id)} className="rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:text-red-300 transition-colors">Confirmer</button>
            : <button onClick={() => setConfirmDel(true)} className="rounded p-1 text-xs text-zinc-700 hover:text-red-400 transition-colors" title="Supprimer">✕</button>
          }
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="mb-1.5 flex items-end justify-between text-xs">
          <span className="font-semibold text-emerald-400 tabular-nums">{fmtDec(goal.currentAmount)}</span>
          <span className="text-zinc-500 tabular-nums">/ {fmtDec(goal.targetAmount)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs">
        {goal.targetDate && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Date cible</span>
            <span className="text-zinc-400">
              {new Date(goal.targetDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {monthsLeft !== null && monthsLeft > 0 && (
                <span className="ml-1 text-zinc-600">({monthsLeft} mois)</span>
              )}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          {achieved ? (
            <span className="text-emerald-400 font-medium">Objectif atteint !</span>
          ) : contribNeeded !== null ? (
            <>
              <span className="text-zinc-500">À épargner / mois</span>
              <span className="font-semibold text-zinc-200 tabular-nums">{fmt(contribNeeded)}</span>
            </>
          ) : !goal.targetDate ? (
            <span className="text-zinc-600">Aucune date cible définie</span>
          ) : null}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex items-center gap-2">
        <button onClick={onContribute}
          className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
          + Contribuer
        </button>
        {!achieved && (
          <button
            onClick={() => updateSavingsGoal(goal.id, { paused: !goal.paused })}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            title={goal.paused ? 'Reprendre' : 'Mettre en pause'}
          >
            {goal.paused ? '▶' : '⏸'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Shared modal primitives ──────────────────────────────────────────────────

function Modal({ onClose, title, maxW, children }: {
  onClose: () => void; title: string; maxW: string; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={['w-full rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl', maxW].join(' ')}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
          <button onClick={onClose} className="leading-none text-zinc-600 hover:text-zinc-300 transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ onClose, disabled, label }: { onClose: () => void; disabled?: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button type="button" onClick={onClose}
        className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">Annuler</button>
      <button type="submit" disabled={disabled}
        className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-40">
        {label}
      </button>
    </div>
  )
}

// ─── TransactionModal ─────────────────────────────────────────────────────────

function TransactionModal({ tx, onClose }: { tx?: Transaction; onClose: () => void }) {
  const addTransaction    = useStore((s) => s.addTransaction)
  const updateTransaction = useStore((s) => s.updateTransaction)
  const allCategories     = useStore((s) => s.financeCategories)
  const [type,     setType]     = useState<'income' | 'expense'>(tx?.type ?? 'expense')
  const [amount,   setAmount]   = useState(tx?.amount.toString() ?? '')
  const [category, setCategory] = useState(tx?.category ?? '')
  const [date,     setDate]     = useState(tx?.date ?? todayStr())
  const [note,     setNote]     = useState(tx?.note ?? '')
  const cats     = useMemo(() => allCategories.filter((c) => c.type === type), [allCategories, type])
  const validCat = cats.some((c) => c.id === category) ? category : ''

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validCat || !amount) return
    const payload = { type, amount: parseFloat(amount), category: validCat, date, note: note || undefined }
    if (tx) updateTransaction(tx.id, payload)
    else    addTransaction(payload)
    onClose()
  }

  return (
    <Modal onClose={onClose} title={tx ? 'Modifier la transaction' : 'Nouvelle transaction'} maxW="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={['rounded-xl border py-2.5 text-sm font-medium transition-all',
                type === t
                  ? t === 'expense' ? 'border-red-500/40 bg-red-500/15 text-red-400' : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-700',
              ].join(' ')}>
              {t === 'expense' ? '↓ Dépense' : '↑ Revenu'}
            </button>
          ))}
        </div>

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">Montant (€)</label>
            <input type="number" min="0.01" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required autoFocus
              className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition-colors [color-scheme:dark]" />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-500">Catégorie</label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7">
            {cats.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                className={['flex w-full overflow-hidden flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all',
                  validCat === cat.id ? 'border-teal-500/40 bg-teal-500/10 text-teal-300' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700',
                ].join(' ')}>
                <span className="text-xl leading-none shrink-0">{cat.icon}</span>
                <span className="text-[10px] truncate w-full text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">Note (optionnel)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note…" rows={2}
            className="w-full resize-none rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
        </div>

        <ModalActions onClose={onClose} disabled={!validCat || !amount} label={tx ? 'Enregistrer' : 'Ajouter'} />
      </form>
    </Modal>
  )
}

// ─── BudgetModal ──────────────────────────────────────────────────────────────

function BudgetModal({ category, current, onClose }: { category: string; current: number; onClose: () => void }) {
  const setCategoryBudget    = useStore((s) => s.setCategoryBudget)
  const deleteCategoryBudget = useStore((s) => s.deleteCategoryBudget)
  const financeCategories    = useStore((s) => s.financeCategories)
  const [amount, setAmount]  = useState(current > 0 ? current.toString() : '')
  const cat = useMemo(() => makeCatMeta(financeCategories)(category), [financeCategories, category])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = parseFloat(amount)
    if (v > 0) setCategoryBudget(category, v)
    onClose()
  }

  return (
    <Modal onClose={onClose} title={`Budget — ${cat.label}`} maxW="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3">
          <span className="text-2xl">{cat.icon}</span>
          <p className="text-sm text-zinc-400">Budget mensuel pour <span className="font-medium text-zinc-200">{cat.label}</span></p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">Montant (€ / mois)</label>
          <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="ex: 500" autoFocus
            className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          {current > 0 && (
            <button type="button" onClick={() => { deleteCategoryBudget(category); onClose() }}
              className="text-xs text-red-500/70 hover:text-red-400 transition-colors">
              Supprimer le budget
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">Annuler</button>
            <button type="submit" disabled={!amount}
              className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-40">
              Enregistrer
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ─── SavingsGoalModal ─────────────────────────────────────────────────────────

function SavingsGoalModal({ goal, onClose }: { goal?: SavingsGoal; onClose: () => void }) {
  const addSavingsGoal    = useStore((s) => s.addSavingsGoal)
  const updateSavingsGoal = useStore((s) => s.updateSavingsGoal)
  const [title,      setTitle]      = useState(goal?.title ?? '')
  const [target,     setTarget]     = useState(goal?.targetAmount.toString() ?? '')
  const [current,    setCurrent]    = useState(goal?.currentAmount.toString() ?? '0')
  const [targetDate, setTargetDate] = useState(goal?.targetDate?.slice(0, 7) ?? '')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      title:         title.trim(),
      targetAmount:  parseFloat(target),
      currentAmount: parseFloat(current) || 0,
      targetDate:    targetDate ? `${targetDate}-01` : null,
    }
    if (goal) updateSavingsGoal(goal.id, payload)
    else      addSavingsGoal(payload)
    onClose()
  }

  return (
    <Modal onClose={onClose} title={goal ? "Modifier l'objectif" : "Nouvel objectif d'épargne"} maxW="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">Titre</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Vacances, Voiture, Fond d'urgence…" required autoFocus
            className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">Objectif (€)</label>
            <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="5 000" required
              className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">Déjà épargné (€)</label>
            <input type="number" min="0" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0"
              className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">Date cible (optionnel)</label>
          <input type="month" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
            className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition-colors [color-scheme:dark]" />
        </div>
        <ModalActions onClose={onClose} disabled={!title.trim() || !target} label={goal ? 'Enregistrer' : 'Créer'} />
      </form>
    </Modal>
  )
}

// ─── ContributeModal ──────────────────────────────────────────────────────────

function ContributeModal({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const contributeSavingsGoal = useStore((s) => s.contributeSavingsGoal)
  const [amount, setAmount]   = useState('')
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = parseFloat(amount)
    if (v > 0) contributeSavingsGoal(goal.id, v)
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Contribuer à l'objectif" maxW="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3">
          <p className="text-sm font-medium text-zinc-200">{goal.title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{fmtDec(remaining)} restants pour atteindre l'objectif</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">Montant à ajouter (€)</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="100" required autoFocus
            className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">Annuler</button>
          <button type="submit" disabled={!amount || parseFloat(amount) <= 0}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 transition-colors disabled:opacity-40">
            Contribuer
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── CSV Import ────────────────────────────────────────────────────────────────

interface CsvRow {
  id:          string
  date:        string
  description: string
  amount:      number
  type:        'income' | 'expense'
  category:    string
  duplicate:   boolean
  selected:    boolean
}

const formatDate = (raw: string): string | null => {
  const clean = raw.trim()
  // Le Store utilise du texte au format ISO (YYYY-MM-DD) pour garantir un tri chronologique correct
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean
  }
  // Transforme les formats DD/MM/YYYY ou DD-MM-YYYY en YYYY-MM-DD
  const match = clean.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  }
  return null
}

function parseCsvAmount(raw: string): number | null {
  if (!raw?.trim()) return null
  let s = raw.trim().replace(/[€$£\u00a0\s]/g, '').trim()
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.')
  else if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function detectCsvDelimiter(line: string): string {
  let best = ',', bestCount = 0
  for (const c of [';', ',', '\t', '|']) {
    const count = line.split(c).length - 1
    if (count > bestCount) { bestCount = count; best = c }
  }
  return best
}

function normStr(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

const CSV_CAT_HINTS: { patterns: string[]; names: string[] }[] = [
  { patterns: ['salaire', 'traitement', 'paie'],                                                              names: ['salaire', 'revenu'] },
  { patterns: ['freelance', 'mission', 'prestation', 'honoraire'],                                            names: ['freelance', 'mission', 'revenu'] },
  { patterns: ['loyer', 'logement', 'appartement', 'charges', 'syndic', 'copropriete'],                      names: ['loyer', 'logement', 'habitat', 'housing'] },
  { patterns: ['courses', 'supermarche', 'carrefour', 'leclerc', 'lidl', 'aldi', 'monoprix', 'intermarche'], names: ['alimentation', 'courses', 'nourriture', 'food', 'epicerie'] },
  { patterns: ['restaurant', 'brasserie', 'sushi', 'burger', 'mcdo', 'kebab', 'boulangerie'],                names: ['restaurant', 'repas', 'sortie'] },
  { patterns: ['essence', 'carburant', 'sncf', 'ratp', 'navigo', 'uber', 'taxi', 'parking', 'autoroute'],   names: ['transport', 'deplacement', 'voiture'] },
  { patterns: ['pharmacie', 'medecin', 'docteur', 'dentiste', 'mutuelle', 'cpam', 'clinique', 'hopital'],    names: ['sante', 'medical', 'health', 'pharmacie'] },
  { patterns: ['netflix', 'spotify', 'apple', 'amazon prime', 'disney', 'cinema', 'theatre', 'fnac'],        names: ['loisir', 'divertissement', 'abonnement', 'entertainment'] },
  { patterns: ['edf', 'engie', 'electricite', 'internet', 'sfr', 'orange', 'free mobile', 'bouygues'],       names: ['facture', 'abonnement', 'energie', 'utilities'] },
]

function guessCsvCategory(description: string, type: 'income' | 'expense', categories: FinanceCategory[]): string {
  const d = normStr(description)
  const typeCats = categories.filter((c) => c.type === type)
  if (typeCats.length === 0) return ''
  for (const hint of CSV_CAT_HINTS) {
    if (hint.patterns.some((p) => d.includes(p))) {
      const match = typeCats.find((c) => hint.names.some((n) => normStr(c.name).includes(n)))
      if (match) return match.id
    }
  }
  for (const cat of typeCats) {
    if (d.includes(normStr(cat.name))) return cat.id
  }
  return typeCats[0].id
}

function parseCsvText(text: string, categories: FinanceCategory[], existing: Transaction[]): CsvRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  // Scan the first 10 lines to find the header row (some bank exports have metadata before headers)
  let headerLineIdx = 0
  let delim = ','
  let idx = { date: -1, desc: -1, amount: -1, debit: -1, credit: -1 }
  for (let li = 0; li < Math.min(10, lines.length); li++) {
    const d = detectCsvDelimiter(lines[li])
    const split = (l: string) => l.split(d).map((c) => c.replace(/^["']|["']$/g, '').trim())
    const h = split(lines[li]).map(normStr)
    const dateIdx = h.findIndex((hh) => hh === 'date' || hh.startsWith('date') || hh.includes('booking date'))
    if (dateIdx !== -1) {
      headerLineIdx = li
      delim = d
      idx = {
        date:   dateIdx,
        desc:   h.findIndex((hh) => ['libelle', 'description', 'label', 'intitule', 'operation', 'details', 'partner name'].some((k) => hh.includes(k))),
        amount: h.findIndex((hh) => ['montant', 'amount'].some((k) => hh.includes(k))),
        debit:  h.findIndex((hh) => hh.includes('debit')),
        credit: h.findIndex((hh) => hh.includes('credit')),
      }
      break
    }
  }
  if (idx.date === -1) return []
  const split  = (l: string) => l.split(delim).map((c) => c.replace(/^["']|["']$/g, '').trim())
  const existSet = new Set(existing.map((t) => `${t.date}|${t.amount}|${(t.note ?? '').toLowerCase()}`))
  return lines.slice(headerLineIdx + 1).flatMap((line, i) => {
    const cols = split(line)
    const date = formatDate(cols[idx.date] ?? '')
    if (!date) return []
    const description = idx.desc >= 0 ? (cols[idx.desc] ?? '') : ''
    let amount: number | null = null
    let type: 'income' | 'expense' = 'expense'
    if (idx.amount >= 0) {
      amount = parseCsvAmount(cols[idx.amount] ?? '')
      if (amount !== null) { type = amount >= 0 ? 'income' : 'expense'; amount = Math.abs(amount) }
    } else {
      const debit  = idx.debit  >= 0 ? parseCsvAmount(cols[idx.debit]  ?? '') : null
      const credit = idx.credit >= 0 ? parseCsvAmount(cols[idx.credit] ?? '') : null
      if (credit && Math.abs(credit) > 0)    { amount = Math.abs(credit); type = 'income'  }
      else if (debit && Math.abs(debit) > 0) { amount = Math.abs(debit);  type = 'expense' }
    }
    if (amount === null || amount === 0) return []
    const category  = guessCsvCategory(description, type, categories)
    const duplicate = existSet.has(`${date}|${amount}|${description.toLowerCase()}`)
    return [{ id: `csv-${i}`, date, description, amount, type, category, duplicate, selected: true }]
  })
}

function CSVImportModal({ onClose }: { onClose: () => void }) {
  const addTransaction    = useStore((s) => s.addTransaction)
  const transactions      = useStore((s) => s.transactions)
  const financeCategories = useStore((s) => s.financeCategories)
  const [rows,     setRows]     = useState<CsvRow[] | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [done,     setDone]     = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError('Fichier invalide — seuls les fichiers .csv sont acceptés.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCsvText(text, financeCategories, transactions)
      if (parsed.length === 0) setError('Aucune transaction détectée. Vérifiez le format du fichier.')
      else { setError(null); setRows(parsed) }
    }
    reader.readAsText(file, 'UTF-8')
  }, [financeCategories, transactions])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleImport = useCallback(() => {
    if (!rows) return
    const selected = rows.filter((r) => r.selected)
    selected.forEach((r) => addTransaction({ type: r.type, amount: r.amount, category: r.category, date: r.date, note: r.description || undefined }))
    setDone(selected.length)
  }, [rows, addTransaction])

  const toggle    = (id: string)            => setRows((p) => p?.map((r) => r.id === id ? { ...r, selected: !r.selected } : r) ?? null)
  const setCat    = (id: string, v: string) => setRows((p) => p?.map((r) => r.id === id ? { ...r, category: v } : r) ?? null)
  const toggleAll = () => { const all = rows?.every((r) => r.selected); setRows((p) => p?.map((r) => ({ ...r, selected: !all })) ?? null) }

  const selectedCount = rows?.filter((r) => r.selected).length ?? 0
  const dupCount      = rows?.filter((r) => r.duplicate && r.selected).length ?? 0

  if (done !== null) {
    return (
      <Modal onClose={onClose} title="Import terminé" maxW="max-w-sm">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/15 text-2xl text-teal-400">✓</div>
          <p className="text-sm font-medium text-zinc-200">
            {done} transaction{done > 1 ? 's' : ''} importée{done > 1 ? 's' : ''} avec succès
          </p>
          <button onClick={onClose} className="rounded-xl bg-zinc-100 px-6 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors">
            Voir les transactions
          </button>
        </div>
      </Modal>
    )
  }

  if (rows) {
    const allSelected = rows.every((r) => r.selected)
    return (
      <Modal onClose={onClose} title={`Aperçu — ${rows.length} transaction${rows.length > 1 ? 's' : ''} détectée${rows.length > 1 ? 's' : ''}`} maxW="max-w-3xl">
        <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
          {dupCount > 0 && (
            <div className="mx-5 mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-400">
              ⚠ {dupCount} transaction{dupCount > 1 ? 's semblent' : ' semble'} déjà exister (même date + montant + description).
            </div>
          )}
          <div className="overflow-y-auto flex-1 mx-5 mt-4 rounded-xl border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                <tr className="text-[10px] uppercase tracking-wider text-zinc-600">
                  <th className="px-3 py-2.5 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-teal-500 cursor-pointer" />
                  </th>
                  <th className="px-3 py-2.5 text-left">Date</th>
                  <th className="px-3 py-2.5 text-left">Description</th>
                  <th className="px-3 py-2.5 text-right">Montant</th>
                  <th className="px-3 py-2.5 text-left">Catégorie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {rows.map((row) => {
                  const typeCats = financeCategories.filter((c) => c.type === row.type)
                  return (
                    <tr key={row.id} className={['transition-colors', !row.selected ? 'opacity-40' : row.duplicate ? 'bg-amber-500/5' : ''].join(' ')}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={row.selected} onChange={() => toggle(row.id)} className="accent-teal-500 cursor-pointer" />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-400 whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <span className="block truncate text-zinc-300">{row.description || '—'}</span>
                        {row.duplicate && <span className="text-[9px] text-amber-500">doublon possible</span>}
                      </td>
                      <td className={['px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap', row.type === 'income' ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                        {row.type === 'income' ? '+' : '−'}{fmtDec(row.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.category} onChange={(e) => setCat(row.id, e.target.value)}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 outline-none">
                          {typeCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                          {typeCats.length === 0 && <option value="">—</option>}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 p-5 pt-4">
            <p className="text-xs text-zinc-600">{selectedCount} / {rows.length} sélectionnée{selectedCount > 1 ? 's' : ''}</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">Annuler</button>
              <button onClick={handleImport} disabled={selectedCount === 0}
                className="rounded-xl bg-teal-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400 transition-colors disabled:opacity-40">
                Importer {selectedCount > 0 ? selectedCount : ''} transaction{selectedCount > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} title="Importer un fichier CSV" maxW="max-w-md">
      <div className="p-5 space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={['flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-12 transition-colors',
            dragging ? 'border-teal-500/60 bg-teal-500/5' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30',
          ].join(' ')}
        >
          <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">Déposer un fichier CSV</p>
            <p className="mt-1 text-xs text-zinc-600">ou cliquer pour sélectionner</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
        {error && (
          <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{error}</p>
        )}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">Formats acceptés</p>
          <div className="font-mono text-[10px] leading-relaxed text-zinc-700 space-y-0.5">
            <p>Date;Description;Montant</p>
            <p>Date;Libellé;Débit;Crédit</p>
            <p>Date,Description,Amount</p>
            <p>Booking Date,Partner Name,Amount (EUR)</p>
            <p className="text-zinc-800">Séparateurs : ; , | tab · Encodage : UTF-8</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── PDF Import ────────────────────────────────────────────────────────────────

async function parsePdfFile(file: File, categories: FinanceCategory[]): Promise<CsvRow[]> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = PDF_WORKER_URL

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise

  type Item = { str: string; x: number; y: number }
  const allItems: Item[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p)
    const vp      = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      allItems.push({
        str: item.str,
        x:   item.transform[4],
        y:   vp.height - item.transform[5],  // flip to top-down
      })
    }
  }

  // Group items into visual lines (Y tolerance 3px)
  const sorted = [...allItems].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)
  const lineGroups: Item[][] = []
  let cur: Item[] = []
  let curY = -9999
  for (const item of sorted) {
    if (Math.abs(item.y - curY) > 3) {
      if (cur.length) lineGroups.push(cur)
      cur = [item]; curY = item.y
    } else {
      cur.push(item)
    }
  }
  if (cur.length) lineGroups.push(cur)

  // Parse transactions: lines that begin with a date and contain an amount
  const AMT_RE = /^[+\-]?\d{1,3}(?:[. ]\d{3})*[,\.]\d{2}$/
  const rows: CsvRow[] = []

  for (let i = 0; i < lineGroups.length; i++) {
    const parts = lineGroups[i].sort((a, b) => a.x - b.x).map((it) => it.str.trim()).filter(Boolean)
    if (parts.length < 2) continue

    // Date at start (accept DD/MM/YYYY or DD/MM/YY — normalise dots/dashes too)
    const rawDate = parts[0].replace(/\./g, '/')
    const date = formatDate(rawDate)
    if (!date) continue

    // Amount: last token matching number pattern
    let amtIdx = -1
    for (let j = parts.length - 1; j >= 1; j--) {
      const clean = parts[j].replace(/\s/g, '')
      if (AMT_RE.test(clean) || /^[+\-]?\d+[,\.]\d{2}$/.test(clean)) {
        amtIdx = j; break
      }
    }
    if (amtIdx < 0) continue

    const amount = parseCsvAmount(parts[amtIdx])
    if (amount === null || amount === 0) continue

    // Description between date token and amount token
    const descParts = parts.slice(1, amtIdx)
    let description = descParts.join(' ').trim()

    // If description is very short, try next line as continuation
    if (description.length < 8 && i + 1 < lineGroups.length) {
      const nextParts = lineGroups[i + 1].sort((a, b) => a.x - b.x).map((it) => it.str.trim()).filter(Boolean)
      const nextIsDate = nextParts[0] && formatDate(nextParts[0].replace(/\./g, '/')) !== null
      if (!nextIsDate) description = (description + ' ' + nextParts.join(' ')).trim()
    }

    const type     = amount >= 0 ? 'income' : 'expense' as 'income' | 'expense'
    const absAmt   = Math.abs(amount)
    const category = guessCsvCategory(description, type, categories)
    rows.push({ id: `pdf-${i}`, date, description, amount: absAmt, type, category, duplicate: false, selected: true })
  }

  return rows
}

function downloadCsvFromRows(rows: CsvRow[]) {
  const selected = rows.filter((r) => r.selected)
  const lines = [
    'Date;Description;Montant',
    ...selected.map((r) => `${r.date};${r.description.replace(/;/g, ',')};${r.type === 'income' ? r.amount : -r.amount}`),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'releve-transactions.csv'; a.click()
  URL.revokeObjectURL(url)
}

function PDFImportModal({ onClose }: { onClose: () => void }) {
  const financeCategories = useStore((s) => s.financeCategories)
  const addTransaction    = useStore((s) => s.addTransaction)
  const [rows,     setRows]     = useState<CsvRow[] | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [done,     setDone]     = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Fichier invalide — seuls les fichiers .pdf sont acceptés.')
      return
    }
    setLoading(true); setError(null)
    try {
      const parsed = await parsePdfFile(file, financeCategories)
      if (parsed.length === 0) setError('Aucune transaction détectée. Le PDF est peut-être scanné (image) ou dans un format non supporté.')
      else setRows(parsed)
    } catch {
      setError('Erreur lors de la lecture du PDF.')
    } finally {
      setLoading(false)
    }
  }, [financeCategories])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleImport = useCallback(() => {
    if (!rows) return
    const selected = rows.filter((r) => r.selected)
    selected.forEach((r) => addTransaction({ type: r.type, amount: r.amount, category: r.category, date: r.date, note: r.description || undefined }))
    setDone(selected.length)
  }, [rows, addTransaction])

  const toggle    = (id: string)            => setRows((p) => p?.map((r) => r.id === id ? { ...r, selected: !r.selected } : r) ?? null)
  const setCat    = (id: string, v: string) => setRows((p) => p?.map((r) => r.id === id ? { ...r, category: v } : r) ?? null)
  const toggleAll = () => { const all = rows?.every((r) => r.selected); setRows((p) => p?.map((r) => ({ ...r, selected: !all })) ?? null) }

  const selectedCount = rows?.filter((r) => r.selected).length ?? 0

  if (done !== null) {
    return (
      <Modal onClose={onClose} title="Import terminé" maxW="max-w-sm">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/15 text-2xl text-teal-400">✓</div>
          <p className="text-sm font-medium text-zinc-200">
            {done} transaction{done > 1 ? 's' : ''} importée{done > 1 ? 's' : ''} avec succès
          </p>
          <button onClick={onClose} className="rounded-xl bg-zinc-100 px-6 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors">
            Voir les transactions
          </button>
        </div>
      </Modal>
    )
  }

  if (rows) {
    const allSelected = rows.every((r) => r.selected)
    return (
      <Modal onClose={onClose} title={`Aperçu PDF — ${rows.length} transaction${rows.length > 1 ? 's' : ''} détectée${rows.length > 1 ? 's' : ''}`} maxW="max-w-3xl">
        <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
          <div className="mx-5 mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-xs text-zinc-500">
            ℹ Résultats best-effort — vérifiez et corrigez avant d'importer.
          </div>
          <div className="overflow-y-auto flex-1 mx-5 mt-3 rounded-xl border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                <tr className="text-[10px] uppercase tracking-wider text-zinc-600">
                  <th className="px-3 py-2.5 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-teal-500 cursor-pointer" />
                  </th>
                  <th className="px-3 py-2.5 text-left">Date</th>
                  <th className="px-3 py-2.5 text-left">Description</th>
                  <th className="px-3 py-2.5 text-right">Montant</th>
                  <th className="px-3 py-2.5 text-left">Catégorie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {rows.map((row) => {
                  const typeCats = financeCategories.filter((c) => c.type === row.type)
                  return (
                    <tr key={row.id} className={['transition-colors', !row.selected ? 'opacity-40' : ''].join(' ')}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={row.selected} onChange={() => toggle(row.id)} className="accent-teal-500 cursor-pointer" />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-400 whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <span className="block truncate text-zinc-300">{row.description || '—'}</span>
                      </td>
                      <td className={['px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap', row.type === 'income' ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                        {row.type === 'income' ? '+' : '−'}{fmtDec(row.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.category} onChange={(e) => setCat(row.id, e.target.value)}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 outline-none">
                          {typeCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                          {typeCats.length === 0 && <option value="">—</option>}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 p-5 pt-4">
            <p className="text-xs text-zinc-600">{selectedCount} / {rows.length} sélectionnée{selectedCount > 1 ? 's' : ''}</p>
            <div className="flex gap-2">
              <button onClick={() => downloadCsvFromRows(rows)} disabled={selectedCount === 0}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors disabled:opacity-40">
                ↓ CSV
              </button>
              <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">Annuler</button>
              <button onClick={handleImport} disabled={selectedCount === 0}
                className="rounded-xl bg-teal-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400 transition-colors disabled:opacity-40">
                Importer {selectedCount > 0 ? selectedCount : ''} transaction{selectedCount > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} title="Importer un relevé PDF" maxW="max-w-md">
      <div className="p-5 space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !loading && fileRef.current?.click()}
          className={['flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-12 transition-colors',
            loading ? 'border-zinc-800 cursor-default' :
            dragging ? 'border-teal-500/60 bg-teal-500/5 cursor-copy' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30 cursor-pointer',
          ].join(' ')}
        >
          {loading ? (
            <>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
              <p className="text-xs text-zinc-500">Analyse du PDF en cours…</p>
            </>
          ) : (
            <>
              <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-300">Déposer un relevé PDF</p>
                <p className="mt-1 text-xs text-zinc-600">ou cliquer pour sélectionner</p>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </>
          )}
        </div>
        {error && (
          <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{error}</p>
        )}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">Comment ça marche</p>
          <ul className="space-y-1 text-[11px] text-zinc-600 leading-relaxed">
            <li>• Extrait le texte du PDF (relevés bancaires numériques uniquement)</li>
            <li>• Détecte les lignes Date + Libellé + Montant</li>
            <li>• Résultats best-effort — corrigez les erreurs avant d'importer</li>
            <li>• PDFs scannés (images) non supportés</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
