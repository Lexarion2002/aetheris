import type { Transaction } from '../types'

// Solde cumulé de toutes les transactions antérieures au mois donné (format YYYY-MM).
// C'est le "report" affiché dans FinancePage.
export function computeReport(transactions: Transaction[], month: string): number {
  return transactions
    .filter((t) => t.date < month + '-01')
    .reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0)
}

// Solde net du mois = report + revenus du mois − dépenses du mois.
// Correspond au "SOLDE NET" de FinancePage.
export function computeMonthBalance(transactions: Transaction[], month: string): number {
  const report = computeReport(transactions, month)
  const brut = transactions
    .filter((t) => t.date.startsWith(month))
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
  return brut + report
}
