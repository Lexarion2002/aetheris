import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  Home, Utensils, Wine, ShoppingBag, PawPrint, HeartPulse,
  CircleDot, RefreshCw, TrainFront, Package,
  Banknote, HandCoins, Users,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '../store'
import { computeReport } from '../utils/financeUtils'
import { DomainObjectivesSection } from '../components/DomainObjectivesSection'
import type { Transaction, SavingsGoal, FinanceCategory } from '../types'

// ─── Design-system palettes for donut segments ────────────────────────────────

const EXPENSE_PALETTE = ['#B5532A', '#C06A2F', '#8E3D1C', '#D08256', '#EAD1BE']
const INCOME_PALETTE  = ['#7E9A7A', '#5C7859', '#A8BAA3']

// ─── Category icon mapping ────────────────────────────────────────────────────

function getCategoryIcon(name: string): LucideIcon {
  const n = name.toLowerCase().trim()
  if (n.includes('logement') || n.includes('loyer') || n.includes('maison') || n.includes('locat')) return Home
  if (n.includes('nourrit') || n.includes('aliment') || n.includes('course') || n.includes('épicerie')) return Utensils
  if (n.includes('sortie') || n.includes('restaurant') || n.includes('bar') || n.includes('loisir')) return Wine
  if (n.includes('shopping') || n.includes('vêt') || n.includes('habit') || n.includes('mode')) return ShoppingBag
  if (n.includes('animal') || n.includes('chien') || n.includes('chat') || n.includes('vétér')) return PawPrint
  if (n.includes('santé') || n.includes('sante') || n.includes('médec') || n.includes('pharma') || n.includes('médic')) return HeartPulse
  if (n.includes('abonnement') || n.includes('abonne') || n.includes('streaming')) return RefreshCw
  if (n.includes('transport') || n.includes('voiture') || n.includes('train') || n.includes('métro') || n.includes('essence')) return TrainFront
  if (n.includes('autre') || n.includes('divers') || n.includes('miscell')) return CircleDot
  if (n.includes('salaire') || n.includes('revenu') || n.includes('paie')) return Banknote
  if (n.includes('aide') || n.includes('alloc') || n.includes('caf') || n.includes('bourse')) return HandCoins
  if (n.includes('famille') || n.includes('parent') || n.includes('proche')) return Users
  return Package
}

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
    <div className="flex items-center justify-between gap-3 py-2 text-xs text-[var(--fg-muted)]">
      {/* Info */}
      <span className="tabular-nums">
        {from}–{to} sur <span className="text-[var(--fg-muted)] font-medium">{count}</span> transaction{count > 1 ? 's' : ''}
      </span>
      {/* Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-xs text-[var(--fg-muted)] hover:bg-[var(--paper-3)] hover:text-[var(--fg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Précédent
        </button>
        <span className="px-2 tabular-nums text-[var(--fg-subtle)]">
          {page} / {total}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= total}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-xs text-[var(--fg-muted)] hover:bg-[var(--paper-3)] hover:text-[var(--fg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
    () => computeReport(transactions, month),
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
    return Array.from(map, ([catId, value]) => ({ value, ...catMeta(catId) }))
      .sort((a, b) => b.value - a.value)
      .map((item, i) => ({ ...item, color: EXPENSE_PALETTE[i % EXPENSE_PALETTE.length] }))
  }, [monthTx])

  const incomePie = useMemo(() => {
    const map = new Map<string, number>()
    monthTx.filter((t) => t.type === 'income').forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount))
    return Array.from(map, ([catId, value]) => ({ value, ...catMeta(catId) }))
      .sort((a, b) => b.value - a.value)
      .map((item, i) => ({ ...item, color: INCOME_PALETTE[i % INCOME_PALETTE.length] }))
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

  // ── Export Excel ─────────────────────────────────────────────────────────────
  const exportToExcel = useCallback(() => {
    // Transactions sheet — toutes les transactions, triées par date décroissante
    const txRows = [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(t => ({
        Date:      new Date(t.date + 'T00:00:00').toLocaleDateString('fr-FR'),
        Type:      t.type === 'income' ? 'Revenu' : 'Dépense',
        Catégorie: catMeta(t.category).label,
        Montant:   t.type === 'income' ? t.amount : -t.amount,
        Note:      t.note ?? '',
      }))

    // Résumé par mois courant
    const summaryRows = [
      { Indicateur: 'Revenus du mois',  Valeur: totalIncome  },
      { Indicateur: 'Dépenses du mois', Valeur: -totalExpense },
      { Indicateur: 'Solde net',        Valeur: totalIncome - totalExpense },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows),     'Transactions')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Résumé')
    XLSX.writeFile(wb, `aetheris-finances-${month}.xlsx`)
  }, [transactions, catMeta, totalIncome, totalExpense, month])

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, marginBottom: 40 }}>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            finance · {month.split('-').slice(1).concat(month.split('-').slice(0, 1)).join('.')}
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em', margin: '6px 0 8px', lineHeight: 1.1 }}>
            Finances.
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink-2)', margin: 0, lineHeight: 1.4 }}>
            « Tenir le compte, sans en faire une obsession. »
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <MonthSwitcher
            label={monthLabel(month)}
            onPrev={() => setMonth(m => shiftMonth(m, -1))}
            onNext={() => setMonth(m => shiftMonth(m, +1))}
          />
          <button
            onClick={exportToExcel}
            title="Exporter toutes les transactions en Excel"
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--ink-4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            ↓ Excel
          </button>
          <button
            onClick={() => { setEditTx(undefined); setShowTxModal(true) }}
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, padding: '8px 16px', borderRadius: 8, border: '1px solid transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--terra)', color: 'var(--paper-1)', whiteSpace: 'nowrap' }}>
            + Transaction
          </button>
        </div>
      </header>

      {/* ── KPI ─────────────────────────────────────────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <KpiCard
          label="Revenus"
          value={`+ ${fmtDec(totalIncome)}`}
          tone="sauge"
          foot={<span>ce mois · {monthTx.filter(t => t.type === 'income').length} écriture{monthTx.filter(t => t.type === 'income').length > 1 ? 's' : ''}</span>}
        />
        <KpiCard
          label="Dépenses"
          value={`− ${fmtDec(totalExpense)}`}
          tone="terra"
          foot={<span>ce mois · {expensePie.length} catégorie{expensePie.length > 1 ? 's' : ''}</span>}
        />
        <KpiCard
          label="Solde net"
          value={`${netBalance >= 0 ? '+ ' : ''}${fmtDec(netBalance)}`}
          tone="neutre"
          foot={previousBalance !== 0
            ? <span>Report : {previousBalance >= 0 ? '+' : ''}<span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDec(previousBalance)}</span></span>
            : <span style={{ textTransform: 'capitalize' }}>{monthLabel(month)}</span>
          }
        />
      </section>

      {/* ── Context line ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 40 }}>
        <ContextLine month={month} monthTx={monthTx} categoryBudgets={categoryBudgets} financeCategories={financeCategories} />
      </div>

      {/* ── Donuts ──────────────────────────────────────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
        <DonutSection title="Dépenses par catégorie" data={expensePie} total={totalExpense} empty="Aucune dépense ce mois" centerLabel="total" />
        <DonutSection title="Revenus par catégorie"  data={incomePie}  total={totalIncome}  empty="Aucun revenu ce mois"   centerLabel="total" />
      </section>

      {/* ── Budgets ─────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <SectionHead label="Budgets mensuels" meta={`${expenseCats.length} catégorie${expenseCats.length > 1 ? 's' : ''}`} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {expenseCats.map(cat => (
            <BudgetCard
              key={cat.id}
              icon={getCategoryIcon(cat.name)}
              cat={cat.name}
              spent={spentMap.get(cat.id) ?? 0}
              budget={budgetMap.get(cat.id) ?? 0}
              onEdit={() => setBudgetCat(cat.id)}
            />
          ))}
        </div>
      </section>

      {/* ── Épargne ─────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionHead label="Objectifs d'épargne" meta={`${savingsGoals.length} en cours`} />
          <button
            onClick={() => { setEditGoal(undefined); setShowGoalModal(true) }}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--terra)', background: 'transparent', border: 0, cursor: 'pointer', marginBottom: 14 }}>
            + Nouvel objectif
          </button>
        </div>

        {savingsGoals.length === 0 ? (
          <div style={{ background: 'var(--paper-1)', border: '1px dashed var(--ink-4)', borderRadius: 12, padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--paper-2)', display: 'grid', placeItems: 'center', fontSize: 20 }}>🎯</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink-2)', maxWidth: '48ch', lineHeight: 1.4, margin: 0 }}>
              Rien encore. Un voyage, un instrument, un déménagement — mets un nom sur ce que tu mets de côté.
            </p>
            <button
              onClick={() => { setEditGoal(undefined); setShowGoalModal(true) }}
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, padding: '8px 16px', borderRadius: 8, background: 'var(--terra)', color: 'var(--paper-1)', border: '1px solid transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              + Créer mon premier objectif
            </button>
          </div>
        ) : (
          <>
            <SavingsConsolidated goals={savingsGoals} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
              {[...savingsGoals]
                .sort((a, b) => {
                  if (!a.targetDate && !b.targetDate) return 0
                  if (!a.targetDate) return 1
                  if (!b.targetDate) return -1
                  return a.targetDate.localeCompare(b.targetDate)
                })
                .map(goal => (
                  <SavingsCard key={goal.id} goal={goal}
                    onEdit={() => { setEditGoal(goal); setShowGoalModal(true) }}
                    onContribute={() => setContributeGoal(goal)} />
                ))}
            </div>
          </>
        )}
      </section>

      {/* ── Transactions ────────────────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Transactions</span>
            {filteredTx.length > 0 && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-3)' }}>
                · {filteredTx.length} écriture{filteredTx.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <FilterChip active={txType === 'all'}     onClick={() => setTxType('all')}>Tout</FilterChip>
            <FilterChip active={txType === 'income'}  onClick={() => setTxType('income')}>Revenus</FilterChip>
            <FilterChip active={txType === 'expense'} onClick={() => setTxType('expense')}>Dépenses</FilterChip>
            {usedCats.length > 1 && (
              <select
                value={txCat}
                onChange={e => setTxCat(e.target.value)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, padding: '6px 14px', borderRadius: 999, background: 'transparent', border: '1px solid var(--paper-2)', color: 'var(--ink)', cursor: 'pointer', outline: 'none' }}>
                <option value="">Toutes catégories</option>
                {usedCats.map(k => <option key={k} value={k}>{catMeta(k).label}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowPdfModal(true)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--paper-2)', background: 'var(--paper-1)', color: 'var(--ink-2)', cursor: 'pointer' }}>
              📄 Relevé PDF
            </button>
            <button onClick={() => setShowCsvModal(true)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--paper-2)', background: 'var(--paper-1)', color: 'var(--ink-2)', cursor: 'pointer' }}>
              ↑ Importer CSV
            </button>
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: '1px dashed var(--paper-2)', padding: '48px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-3)', margin: 0 }}>Aucune transaction ce mois</p>
            <button onClick={() => { setEditTx(undefined); setShowTxModal(true) }} style={{ marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--terra)', background: 'transparent', border: 0, cursor: 'pointer' }}>
              Ajouter une transaction →
            </button>
          </div>
        ) : (
          <>
            {totalTxPages > 1 && (
              <TxPagination page={txPage} total={totalTxPages} count={filteredTx.length} pageSize={TX_PAGE_SIZE} onChange={setTxPage} />
            )}

            <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '88px 160px 1fr auto 52px', gap: 16, padding: '10px 20px', borderBottom: '1px solid var(--paper-2)', background: 'var(--paper)' }}>
                {['Date', 'Catégorie', 'Note', 'Montant', ''].map((h, i) => (
                  <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', textAlign: i === 3 ? 'right' : undefined }}>
                    {h}
                  </span>
                ))}
              </div>
              {/* Data rows */}
              {pagedTx.map((tx, i) => {
                const cat = catMeta(tx.category)
                return (
                  <TxRow
                    key={tx.id}
                    date={new Date(tx.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    cat={
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ink)' }}>
                        {(() => { const I = getCategoryIcon(cat.label); return <I size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} /> })()}
                        {cat.label}
                      </span>
                    }
                    amount={tx.type === 'income' ? tx.amount : -tx.amount}
                    note={tx.note ?? '—'}
                    last={i === pagedTx.length - 1}
                    onEdit={() => { setEditTx(tx); setShowTxModal(true) }}
                    onDelete={() => deleteTransaction(tx.id)}
                  />
                )
              })}
            </div>

            {totalTxPages > 1 && (
              <TxPagination page={txPage} total={totalTxPages} count={filteredTx.length} pageSize={TX_PAGE_SIZE} onChange={setTxPage} />
            )}
          </>
        )}
      </section>

      {/* ── Objectifs ───────────────────────────────────────────────────────── */}
      <DomainObjectivesSection
        domainId="finance"
        subtitle="« Construire la liberté financière, mois après mois. »"
      />

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showTxModal && <TransactionModal tx={editTx} onClose={() => { setShowTxModal(false); setEditTx(undefined) }} />}
      {budgetCat && <BudgetModal category={budgetCat} current={budgetMap.get(budgetCat) ?? 0} onClose={() => setBudgetCat(null)} />}
      {showGoalModal && <SavingsGoalModal goal={editGoal} onClose={() => { setShowGoalModal(false); setEditGoal(undefined) }} />}
      {contributeGoal && <ContributeModal goal={contributeGoal} onClose={() => setContributeGoal(undefined)} />}
      {showCsvModal && <CSVImportModal onClose={() => setShowCsvModal(false)} />}
      {showPdfModal && <PDFImportModal onClose={() => setShowPdfModal(false)} />}
    </div>
  )
}

// ─── Donut ────────────────────────────────────────────────────────────────────

interface DonutSeg { label: string; value: number; color: string; icon?: string }

function Donut({ data, centerLabel, centerValue, size = 180 }: {
  data: DonutSeg[]; centerLabel?: string; centerValue?: string; size?: number
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [mouse,   setMouse]   = useState({ x: 0, y: 0 })

  const total = data.reduce((s, d) => s + d.value, 0)
  const r = 70, stroke = 22, c = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  let offset = 0
  const arcs = data.map((d, i) => {
    const frac = total > 0 ? d.value / total : 0
    const dash = frac * c
    const seg = { color: d.color, strokeDasharray: `${dash} ${c - dash}`, strokeDashoffset: -offset, key: i }
    offset += dash
    return seg
  })

  const hovSeg = hovered !== null ? data[hovered] : null
  const hovPct = hovSeg && total > 0 ? Math.round((hovSeg.value / total) * 100) : 0

  return (
    <>
      <svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
        onMouseLeave={() => setHovered(null)}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--paper-2)" strokeWidth={stroke} />
        {arcs.map(a => (
          <circle
            key={a.key}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={hovered === a.key ? stroke + 5 : stroke}
            strokeDasharray={a.strokeDasharray}
            strokeDashoffset={a.strokeDashoffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
            style={{ cursor: 'pointer', transition: 'stroke-width 120ms ease' }}
            onMouseEnter={e => { setHovered(a.key); setMouse({ x: e.clientX, y: e.clientY }) }}
            onMouseMove={e => setMouse({ x: e.clientX, y: e.clientY })}
          />
        ))}
        {centerLabel && (
          <text x={cx} y={cy - 6} textAnchor="middle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', fill: 'var(--ink-3)' }}>
            {centerLabel}
          </text>
        )}
        {centerValue && (
          <text x={cx} y={cy + 16} textAnchor="middle"
            style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, fill: 'var(--ink)', letterSpacing: '-0.01em' }}>
            {centerValue}
          </text>
        )}
      </svg>

      {hovSeg && (
        <div style={{
          position: 'fixed',
          left: mouse.x + 14,
          top: mouse.y - 12,
          pointerEvents: 'none',
          zIndex: 200,
          background: 'var(--ink)',
          color: 'var(--paper-1)',
          borderRadius: 8,
          padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(58,46,34,0.28)',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
            {hovSeg.label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--paper-2)' }}>
            {fmtDec(hovSeg.value)}<span style={{ marginLeft: 8, opacity: 0.7 }}>{hovPct}%</span>
          </div>
        </div>
      )}
    </>
  )
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, tone, foot }: {
  label: string; value: string; tone: 'sauge' | 'terra' | 'neutre'; foot: React.ReactNode
}) {
  const tones = {
    sauge:  { bg: 'var(--sage-soft)',  accent: 'var(--sage-deep)',  border: '#B9C8B4' },
    terra:  { bg: 'var(--terra-soft)', accent: 'var(--terra-deep)', border: '#DEB89C' },
    neutre: { bg: 'var(--paper-1)',    accent: 'var(--ink)',        border: 'var(--paper-2)' },
  }
  const t = tones[tone]
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: tone !== 'neutre' ? t.accent : 'var(--ink-3)' }}>
          {label}
        </span>
        {tone === 'sauge' && <span style={{ color: t.accent, fontSize: 16 }}>↙</span>}
        {tone === 'terra' && <span style={{ color: t.accent, fontSize: 16 }}>↗</span>}
      </div>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 500, color: tone !== 'neutre' ? t.accent : 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-2)', borderTop: `1px solid ${tone !== 'neutre' ? t.border : 'var(--paper-2)'}`, paddingTop: 10, marginTop: 2 }}>
        {foot}
      </div>
    </div>
  )
}

// ─── DonutSection ─────────────────────────────────────────────────────────────

function DonutSection({ title, data, total, empty, centerLabel }: {
  title: string; data: DonutSeg[]; total: number; empty: string; centerLabel: string
}) {
  const centerValue = total > 0 ? fmt(total) : undefined
  if (data.length === 0) {
    return (
      <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, padding: '22px 24px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, marginTop: 14 }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>{empty}</p>
        </div>
      </div>
    )
  }
  return (
    <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, padding: '22px 24px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{title}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 14 }}>
        <div style={{ flexShrink: 0 }}>
          <Donut data={data} centerLabel={centerLabel} centerValue={centerValue} size={180} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
          {data.map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '10px 16px 1fr auto auto', gap: 8, alignItems: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                {(() => { const I = getCategoryIcon(d.label); return <I size={14} style={{ color: 'var(--ink-3)' }} /> })()}
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtDec(d.value)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--ink-3)', minWidth: 32, textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid var(--paper-2)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-3)' }}>Total</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmtDec(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MonthSwitcher ────────────────────────────────────────────────────────────

function MonthSwitcher({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  const [hp, setHp] = useState(false)
  const [hn, setHn] = useState(false)
  const arrowStyle = (h: boolean): React.CSSProperties => ({
    width: 32, height: 32, border: 0, background: h ? 'var(--paper-2)' : 'transparent',
    borderRadius: 8, color: 'var(--ink-2)', cursor: 'pointer',
    display: 'grid', placeItems: 'center', fontSize: 18, lineHeight: 1,
    transition: 'background var(--dur) var(--ease)',
  })
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 10, padding: 2 }}>
      <button onClick={onPrev} onMouseEnter={() => setHp(true)} onMouseLeave={() => setHp(false)} style={arrowStyle(hp)}>‹</button>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', padding: '0 10px', minWidth: 110, textAlign: 'center', textTransform: 'capitalize' }}>
        {label}
      </span>
      <button onClick={onNext} onMouseEnter={() => setHn(true)} onMouseLeave={() => setHn(false)} style={arrowStyle(hn)}>›</button>
    </div>
  )
}

// ─── SectionHead ──────────────────────────────────────────────────────────────

function SectionHead({ label, meta }: { label: string; meta?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</span>
      {meta && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-3)' }}>· {meta}</span>}
    </div>
  )
}

// ─── BudgetCard ───────────────────────────────────────────────────────────────

function BudgetCard({ icon: IconComp, cat, spent, budget, onEdit }: {
  icon: LucideIcon; cat: string; spent: number; budget: number; onEdit: () => void
}) {
  const pct      = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
  const over      = budget > 0 && spent > budget
  const remaining = budget - spent
  const fillColor = over ? 'var(--terra-deep)' : 'var(--terra)'

  return (
    <div style={{ background: 'var(--paper-1)', border: '1px solid var(--paper-2)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--paper-2)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--ink-2)' }}>
          <IconComp size={15} />
        </div>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 500, color: 'var(--ink)', flex: 1 }}>{cat}</span>
        {over && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: 'var(--terra-soft)', color: '#6B2F14' }}>dépassé</span>}
        <button onClick={onEdit} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14, padding: 2 }} title="Modifier le budget">✎</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {fmtDec(spent)}
        </span>
        {budget > 0 ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>/ {fmtDec(budget)}</span>
        ) : (
          <button onClick={onEdit} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--terra)', background: 'transparent', border: 0, cursor: 'pointer' }}>+ Définir</button>
        )}
      </div>
      {budget > 0 && (
        <>
          <div style={{ height: 6, background: 'var(--paper-2)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: fillColor, borderRadius: 999, transition: 'width 320ms ease' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-3)' }}>
            <span>
              {over
                ? `↑ ${Math.abs(remaining).toLocaleString('fr-FR')} € au-dessus`
                : `${remaining.toLocaleString('fr-FR')} € restants`}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: over ? 'var(--terra-deep)' : 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
              {pct} %
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: active ? 500 : 400,
        padding: '6px 14px', borderRadius: 999,
        background: active ? 'var(--paper-3)' : (hover ? 'var(--paper-2)' : 'transparent'),
        border: `1px solid ${active ? 'var(--ink-4)' : 'var(--paper-2)'}`,
        color: 'var(--ink)', cursor: 'pointer',
        transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
      }}>
      {children}
    </button>
  )
}

// ─── TxRow ────────────────────────────────────────────────────────────────────

function TxRow({ date, cat, amount, note, last, onEdit, onDelete }: {
  date: string; cat: React.ReactNode; amount: number
  note: string; last: boolean; onEdit: () => void; onDelete: () => void
}) {
  const [hover, setHover] = useState(false)
  const positive = amount > 0
  const formatted = `${positive ? '+ ' : '− '}${Math.abs(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '88px 160px 1fr auto 52px',
        gap: 16, padding: '14px 20px',
        borderBottom: last ? 0 : '1px solid var(--paper-2)',
        background: hover ? 'var(--paper-2)' : 'transparent',
        alignItems: 'center',
        transition: 'background var(--dur) var(--ease)',
      }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{date}</span>
      <div style={{ minWidth: 0 }}>{cat}</div>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-2)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, textAlign: 'right', color: positive ? 'var(--sage-deep)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatted}</span>
      <div style={{ display: 'flex', gap: 2, opacity: hover ? 1 : 0, transition: 'opacity var(--dur) var(--ease)', justifyContent: 'flex-end' }}>
        <button onClick={onEdit}   style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, padding: '2px 4px' }}>✎</button>
        <button onClick={onDelete} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, padding: '2px 4px' }}>✕</button>
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

  let rythmeCls = 'text-[var(--positive)]'
  let rythmeMsg = ''
  if (depensePct !== null && totalBudget > 0) {
    rythmeMsg = `${Math.round(depensePct)}% du budget dépensé en ${Math.round(tempsPct)}% du mois`
    if (depensePct > tempsPct * 1.4) rythmeCls = 'text-[var(--danger)]'
    else if (depensePct > tempsPct * 1.1) rythmeCls = 'text-amber-400'
    else rythmeCls = 'text-[var(--positive)]'
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
    <div className="flex flex-wrap items-start gap-x-8 gap-y-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-5 py-3">
      {/* Rythme */}
      {rythmeMsg && (
        <p className={`text-xs ${rythmeCls}`}>{rythmeMsg}</p>
      )}

      {/* Épargne projetée */}
      {epargneProjete !== null && (
        <p className={`text-xs ${epargneProjete >= 0 ? 'text-[var(--positive)]' : 'text-[var(--danger)]'}`}>
          Épargne estimée ce mois : {epargneProjete >= 0 ? '+' : ''}{fmtDec(epargneProjete)}
        </p>
      )}

      {/* Alerte catégorie */}
      {worstCat && (
        <p className="text-xs text-[var(--fg-muted)]">
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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)] mb-0.5">Total visé</p>
            <p className="font-semibold text-[var(--fg)]">{fmt(totalTarget)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)] mb-0.5">Total épargné</p>
            <p className="font-semibold text-[var(--positive)]">{fmt(totalSaved)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)] mb-0.5">Progression</p>
            <p className="font-semibold text-[var(--fg)]">{globalPct}%</p>
          </div>
        </div>
        {totalContribNeeded > 0 && (
          <p className="text-xs text-[var(--fg-muted)] self-end">
            Pour être dans les temps, épargner{' '}
            <span className="font-semibold text-[var(--fg)]">{fmt(totalContribNeeded)}/mois</span>
          </p>
        )}
      </div>
      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--paper-3)]">
        <div className="h-full rounded-full bg-[var(--positive)] transition-all duration-700" style={{ width: `${globalPct}%` }} />
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
    achieved:      'bg-[var(--sage-soft)] text-[var(--positive)]',
    en_pause:      'bg-[var(--paper-3)] text-[var(--fg-muted)]',
    en_bonne_voie: 'bg-[var(--terra-soft)] text-[var(--accent)]',
    a_accelerer:   'bg-amber-500/15 text-amber-400',
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-[var(--fg)] truncate">{goal.title}</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-[var(--fg)]">{fmtDec(goal.targetAmount)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
          <button onClick={onEdit} className="rounded p-1 text-xs text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] transition-colors" title="Modifier">✎</button>
          {confirmDel
            ? <button onClick={() => deleteSavingsGoal(goal.id)} className="rounded px-1.5 py-0.5 text-[10px] text-[var(--danger)] hover:text-[var(--danger)] transition-colors">Confirmer</button>
            : <button onClick={() => setConfirmDel(true)} className="rounded p-1 text-xs text-[var(--fg-subtle)] hover:text-[var(--danger)] transition-colors" title="Supprimer">✕</button>
          }
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="mb-1.5 flex items-end justify-between text-xs">
          <span className="font-semibold text-[var(--positive)] tabular-nums">{fmtDec(goal.currentAmount)}</span>
          <span className="text-[var(--fg-muted)] tabular-nums">/ {fmtDec(goal.targetAmount)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--paper-3)]">
          <div className="h-full rounded-full bg-[var(--positive)] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs">
        {goal.targetDate && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--fg-muted)]">Date cible</span>
            <span className="text-[var(--fg-muted)]">
              {new Date(goal.targetDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {monthsLeft !== null && monthsLeft > 0 && (
                <span className="ml-1 text-[var(--fg-subtle)]">({monthsLeft} mois)</span>
              )}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          {achieved ? (
            <span className="text-[var(--positive)] font-medium">Objectif atteint !</span>
          ) : contribNeeded !== null ? (
            <>
              <span className="text-[var(--fg-muted)]">À épargner / mois</span>
              <span className="font-semibold text-[var(--fg)] tabular-nums">{fmt(contribNeeded)}</span>
            </>
          ) : !goal.targetDate ? (
            <span className="text-[var(--fg-subtle)]">Aucune date cible définie</span>
          ) : null}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex items-center gap-2">
        <button onClick={onContribute}
          className="flex-1 rounded-xl border border-[var(--sage-soft)] bg-[var(--sage-soft)] py-2 text-xs font-medium text-[var(--positive)] hover:bg-[var(--sage-soft)] transition-colors">
          + Contribuer
        </button>
        {!achieved && (
          <button
            onClick={() => updateSavingsGoal(goal.id, { paused: !goal.paused })}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-xs text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] transition-colors"
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
      <div className={['w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] shadow-2xl', maxW].join(' ')}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--fg)]">{title}</h2>
          <button onClick={onClose} className="leading-none text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors">✕</button>
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
        className="rounded-xl px-4 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--paper-3)] transition-colors">Annuler</button>
      <button type="submit" disabled={disabled}
        className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40">
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
                  ? t === 'expense' ? 'border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]' : 'border-[var(--sage-soft)] bg-[var(--sage-soft)] text-[var(--positive)]'
                  : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-strong)]',
              ].join(' ')}>
              {t === 'expense' ? '↓ Dépense' : '↑ Revenu'}
            </button>
          ))}
        </div>

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--fg-muted)]">Montant (€)</label>
            <input type="number" min="0.01" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required autoFocus
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-3 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] outline-none focus:border-[var(--border-strong)] transition-colors" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--fg-muted)]">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-3 py-2.5 text-sm text-[var(--fg)] outline-none focus:border-[var(--border-strong)] transition-colors [color-scheme:light]" />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--fg-muted)]">Catégorie</label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7">
            {cats.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                className={['flex w-full overflow-hidden flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all',
                  validCat === cat.id ? 'border-[var(--terra-soft)] bg-[var(--terra-soft)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-strong)]',
                ].join(' ')}>
                {(() => { const I = getCategoryIcon(cat.name); return <I size={18} className="shrink-0 text-[var(--fg-muted)]" /> })()}
                <span className="text-[10px] truncate w-full text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--fg-muted)]">Note (optionnel)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note…" rows={2}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-3 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] outline-none focus:border-[var(--border-strong)] transition-colors" />
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
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-4 py-3">
          {(() => { const I = getCategoryIcon(cat.label); return <I size={20} className="text-[var(--fg-muted)]" /> })()}
          <p className="text-sm text-[var(--fg-muted)]">Budget mensuel pour <span className="font-medium text-[var(--fg)]">{cat.label}</span></p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--fg-muted)]">Montant (€ / mois)</label>
          <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="ex: 500" autoFocus
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-3 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] outline-none focus:border-[var(--border-strong)] transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          {current > 0 && (
            <button type="button" onClick={() => { deleteCategoryBudget(category); onClose() }}
              className="text-xs text-[var(--danger)]/70 hover:text-[var(--danger)] transition-colors">
              Supprimer le budget
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--paper-3)] transition-colors">Annuler</button>
            <button type="submit" disabled={!amount}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40">
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
          <label className="mb-1.5 block text-xs font-medium text-[var(--fg-muted)]">Titre</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Vacances, Voiture, Fond d'urgence…" required autoFocus
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-3 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] outline-none focus:border-[var(--border-strong)] transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--fg-muted)]">Objectif (€)</label>
            <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="5 000" required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-3 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] outline-none focus:border-[var(--border-strong)] transition-colors" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--fg-muted)]">Déjà épargné (€)</label>
            <input type="number" min="0" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-3 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] outline-none focus:border-[var(--border-strong)] transition-colors" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--fg-muted)]">Date cible (optionnel)</label>
          <input type="month" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-3 py-2.5 text-sm text-[var(--fg)] outline-none focus:border-[var(--border-strong)] transition-colors [color-scheme:light]" />
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
        <div className="rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--fg)]">{goal.title}</p>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{fmtDec(remaining)} restants pour atteindre l'objectif</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--fg-muted)]">Montant à ajouter (€)</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="100" required autoFocus
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--paper-2)] px-3 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] outline-none focus:border-[var(--border-strong)] transition-colors" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--paper-3)] transition-colors">Annuler</button>
          <button type="submit" disabled={!amount || parseFloat(amount) <= 0}
            className="rounded-xl bg-[var(--positive)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--positive-hover)] transition-colors disabled:opacity-40">
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
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 1) return []
  // Scan the first 10 lines to find the header row (some bank exports have metadata before headers)
  let headerLineIdx = -1
  let delim = ','
  let idx = { date: -1, desc: -1, amount: -1, debit: -1, credit: -1 }
  for (let li = 0; li < Math.min(10, lines.length); li++) {
    const d = detectCsvDelimiter(lines[li])
    const splitFn = (l: string) => l.split(d).map((c) => c.replace(/^["']|["']$/g, '').trim())
    const h = splitFn(lines[li]).map(normStr)
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
  // No header found — try headerless mode: detect delimiter from first line and assume col 0=date, 1=desc, 2=amount
  if (headerLineIdx === -1) {
    delim = detectCsvDelimiter(lines[0])
    const firstCols = lines[0].split(delim).map((c) => c.replace(/^["']|["']$/g, '').trim())
    if (firstCols.length >= 2 && formatDate(firstCols[0]) !== null) {
      headerLineIdx = -1  // data starts at line 0
      idx = { date: 0, desc: firstCols.length >= 2 ? 1 : -1, amount: firstCols.length >= 3 ? 2 : -1, debit: -1, credit: -1 }
    } else {
      return []
    }
  }
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
      const firstLines = text.replace(/^\uFEFF/, '').split(/\r?\n/).slice(0, 5).join(' | ')
      console.log('[CSV] Premières lignes:', firstLines)
      const parsed = parseCsvText(text, financeCategories, transactions)
      console.log('[CSV] Transactions parsées:', parsed.length, parsed[0])
      if (parsed.length === 0) setError(`Aucune transaction détectée. Vérifiez le format du fichier.\n[Debug] Lignes: ${firstLines}`)
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
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--terra-soft)] text-2xl text-[var(--accent)]">✓</div>
          <p className="text-sm font-medium text-[var(--fg)]">
            {done} transaction{done > 1 ? 's' : ''} importée{done > 1 ? 's' : ''} avec succès
          </p>
          <button onClick={onClose} className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
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
          <div className="overflow-y-auto flex-1 mx-5 mt-4 rounded-xl border border-[var(--border)]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-elev)] border-b border-[var(--border)]">
                <tr className="text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  <th className="px-3 py-2.5 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[var(--accent)] cursor-pointer" />
                  </th>
                  <th className="px-3 py-2.5 text-left">Date</th>
                  <th className="px-3 py-2.5 text-left">Description</th>
                  <th className="px-3 py-2.5 text-right">Montant</th>
                  <th className="px-3 py-2.5 text-left">Catégorie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((row) => {
                  const typeCats = financeCategories.filter((c) => c.type === row.type)
                  return (
                    <tr key={row.id} className={['transition-colors', !row.selected ? 'opacity-40' : row.duplicate ? 'bg-amber-500/5' : ''].join(' ')}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={row.selected} onChange={() => toggle(row.id)} className="accent-[var(--accent)] cursor-pointer" />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-[var(--fg-muted)] whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <span className="block truncate text-[var(--fg)]">{row.description || '—'}</span>
                        {row.duplicate && <span className="text-[9px] text-amber-500">doublon possible</span>}
                      </td>
                      <td className={['px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap', row.type === 'income' ? 'text-[var(--positive)]' : 'text-[var(--danger)]'].join(' ')}>
                        {row.type === 'income' ? '+' : '−'}{fmtDec(row.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.category} onChange={(e) => setCat(row.id, e.target.value)}
                          className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--paper-3)] px-2 py-1 text-xs text-[var(--fg)] outline-none">
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
            <p className="text-xs text-[var(--fg-subtle)]">{selectedCount} / {rows.length} sélectionnée{selectedCount > 1 ? 's' : ''}</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--paper-3)] transition-colors">Annuler</button>
              <button onClick={handleImport} disabled={selectedCount === 0}
                className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40">
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
            dragging ? 'border-[var(--accent)]/60 bg-[var(--paper-2)]' : 'border-[var(--border-strong)] hover:border-[var(--border-strong)] hover:bg-[var(--paper-2)]',
          ].join(' ')}
        >
          <svg className="h-8 w-8 text-[var(--fg-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--fg)]">Déposer un fichier CSV</p>
            <p className="mt-1 text-xs text-[var(--fg-subtle)]">ou cliquer pour sélectionner</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
        {error && (
          <p className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 px-4 py-2.5 text-xs text-[var(--danger)]">{error}</p>
        )}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--fg-subtle)]">Formats acceptés</p>
          <div className="font-mono text-[10px] leading-relaxed text-[var(--fg-subtle)] space-y-0.5">
            <p>Date;Description;Montant</p>
            <p>Date;Libellé;Débit;Crédit</p>
            <p>Date,Description,Amount</p>
            <p>Booking Date,Partner Name,Amount (EUR)</p>
            <p className="text-[var(--fg-subtle)]">Séparateurs : ; , | tab · Encodage : UTF-8</p>
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
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--terra-soft)] text-2xl text-[var(--accent)]">✓</div>
          <p className="text-sm font-medium text-[var(--fg)]">
            {done} transaction{done > 1 ? 's' : ''} importée{done > 1 ? 's' : ''} avec succès
          </p>
          <button onClick={onClose} className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
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
          <div className="mx-5 mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2.5 text-xs text-[var(--fg-muted)]">
            ℹ Résultats best-effort — vérifiez et corrigez avant d'importer.
          </div>
          <div className="overflow-y-auto flex-1 mx-5 mt-3 rounded-xl border border-[var(--border)]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-elev)] border-b border-[var(--border)]">
                <tr className="text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  <th className="px-3 py-2.5 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[var(--accent)] cursor-pointer" />
                  </th>
                  <th className="px-3 py-2.5 text-left">Date</th>
                  <th className="px-3 py-2.5 text-left">Description</th>
                  <th className="px-3 py-2.5 text-right">Montant</th>
                  <th className="px-3 py-2.5 text-left">Catégorie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((row) => {
                  const typeCats = financeCategories.filter((c) => c.type === row.type)
                  return (
                    <tr key={row.id} className={['transition-colors', !row.selected ? 'opacity-40' : ''].join(' ')}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={row.selected} onChange={() => toggle(row.id)} className="accent-[var(--accent)] cursor-pointer" />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-[var(--fg-muted)] whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <span className="block truncate text-[var(--fg)]">{row.description || '—'}</span>
                      </td>
                      <td className={['px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap', row.type === 'income' ? 'text-[var(--positive)]' : 'text-[var(--danger)]'].join(' ')}>
                        {row.type === 'income' ? '+' : '−'}{fmtDec(row.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <select value={row.category} onChange={(e) => setCat(row.id, e.target.value)}
                          className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--paper-3)] px-2 py-1 text-xs text-[var(--fg)] outline-none">
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
            <p className="text-xs text-[var(--fg-subtle)]">{selectedCount} / {rows.length} sélectionnée{selectedCount > 1 ? 's' : ''}</p>
            <div className="flex gap-2">
              <button onClick={() => downloadCsvFromRows(rows)} disabled={selectedCount === 0}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--paper-3)] hover:text-[var(--fg)] transition-colors disabled:opacity-40">
                ↓ CSV
              </button>
              <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-[var(--fg-muted)] hover:bg-[var(--paper-3)] transition-colors">Annuler</button>
              <button onClick={handleImport} disabled={selectedCount === 0}
                className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40">
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
            loading ? 'border-[var(--border)] cursor-default' :
            dragging ? 'border-[var(--accent)]/60 bg-[var(--paper-2)] cursor-copy' : 'border-[var(--border-strong)] hover:border-[var(--border-strong)] hover:bg-[var(--paper-2)] cursor-pointer',
          ].join(' ')}
        >
          {loading ? (
            <>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
              <p className="text-xs text-[var(--fg-muted)]">Analyse du PDF en cours…</p>
            </>
          ) : (
            <>
              <svg className="h-8 w-8 text-[var(--fg-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--fg)]">Déposer un relevé PDF</p>
                <p className="mt-1 text-xs text-[var(--fg-subtle)]">ou cliquer pour sélectionner</p>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </>
          )}
        </div>
        {error && (
          <p className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 px-4 py-2.5 text-xs text-[var(--danger)]">{error}</p>
        )}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--fg-subtle)]">Comment ça marche</p>
          <ul className="space-y-1 text-[11px] text-[var(--fg-subtle)] leading-relaxed">
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
