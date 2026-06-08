import * as XLSX from 'xlsx'

export function downloadExcel(rows: Record<string, unknown>[], filename: string) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Rapport')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function downloadSalesReport(
  sales: Array<{
    id: string
    total: number
    amountPaid: number
    paymentMethod: string
    paymentStatus: string
    createdAt: string
    customerName?: string
  }>,
  periodLabel: string,
) {
  const rows: Record<string, unknown>[] = sales.map((s) => ({
    'N° Vente': s.id.slice(-6),
    'Client': s.customerName || 'N/A',
    'Total': s.total,
    'Payé': s.amountPaid || 0,
    'Reste': s.total - (s.amountPaid || 0),
    'Méthode': s.paymentMethod,
    'Statut': s.paymentStatus === 'PAID' ? 'Payée' : s.paymentStatus === 'PARTIAL' ? 'Partielle' : 'Impayée',
    'Date': s.createdAt ? new Date(parseInt(s.createdAt)).toLocaleDateString('fr-FR') : 'N/A',
  }))

  rows.push({
    'N° Vente': 'TOTAL',
    'Total': sales.reduce((s, v) => s + v.total, 0),
    'Payé': sales.reduce((s, v) => s + (v.amountPaid || 0), 0),
    'Reste': sales.reduce((s, v) => s + (v.total - (v.amountPaid || 0)), 0),
  })

  downloadExcel(rows, `rapport-ventes-${periodLabel}`)
}

export function downloadProfitReport(
  data: Array<{
    label: string
    revenue: number
    cogs: number
    profit: number
    margin: number
  }>,
  periodLabel: string,
) {
  const rows: Record<string, unknown>[] = data.map((d) => ({
    'Période': d.label,
    'Revenu': d.revenue,
    'COGS': d.cogs,
    'Profit Brut': d.profit,
    'Marge (%)': `${d.margin.toFixed(1)}%`,
  }))

  const totalRev = data.reduce((s, d) => s + d.revenue, 0)
  const totalProfit = data.reduce((s, d) => s + d.profit, 0)

  rows.push({
    'Période': 'TOTAL',
    'Revenu': totalRev,
    'COGS': data.reduce((s, d) => s + d.cogs, 0),
    'Profit Brut': totalProfit,
    'Marge (%)': `${(totalRev > 0 ? (totalProfit / totalRev) * 100 : 0).toFixed(1)}%`,
  })

  downloadExcel(rows, `rapport-profit-${periodLabel}`)
}
