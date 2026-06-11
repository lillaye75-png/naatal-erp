"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { collection, getDocs, query, where } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { formatXOF } from "@/lib/currency"
import { ExportTools } from "./ExportTools"
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DailyPNL {
  date: string
  revenue: number
  cogs: number
  profit: number
}

export function ProfitReport({ startDate, endDate }: { startDate: number; endDate: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dailyData, setDailyData] = useState<DailyPNL[]>([])
  const [totals, setTotals] = useState({ revenue: 0, cogs: 0, profit: 0, expenseSum: 0 })
  const [exportingPdf, setExportingPdf] = useState(false)
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { db } = await initializeFirebase()

      const salesSnap = await getDocs(query(
        collection(db, 'sales'),
        where('tenantId', '==', tenantId),
        where('isDeleted', '==', false),
      ))
      const sales = salesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((s) => {
          const ts = parseInt(s.createdAt || '0')
          return ts >= startDate && ts <= endDate && s.invoiceType !== 'PROFORMA' && s.invoiceType !== 'QUOTATION'
        })

      let totalRevenue = 0
      let totalCogs = 0
      const dailyMap = new Map<string, { revenue: number; cogs: number }>()

      for (const s of sales) {
        const saleTotal = s.invoiceType === 'CREDIT_NOTE' ? -(s.total || 0) : (s.total || 0)
        totalRevenue += saleTotal
        const dateKey = s.createdAt ? new Date(parseInt(s.createdAt)).toISOString().split('T')[0] : 'unknown'
        const entry = dailyMap.get(dateKey) || { revenue: 0, cogs: 0 }
        entry.revenue += saleTotal

        if (s.invoiceType !== 'CREDIT_NOTE') {
          const items = s.items || []
          for (const item of items) {
            if (item.productId === '__quick_pos__') continue
            const prodSnap = await getDocs(query(
              collection(db, 'products'),
              where('__name__', '==', item.productId),
            ))
            if (!prodSnap.empty) {
              const costPrice = prodSnap.docs[0].data()?.costPrice || 0
              entry.cogs += costPrice * item.qty
              totalCogs += costPrice * item.qty
            }
          }
        }
        dailyMap.set(dateKey, entry)
      }

      const expensesSnap = await getDocs(query(
        collection(db, 'expenses'),
        where('tenantId', '==', tenantId),
        where('isDeleted', '==', false),
      ))
      const expenseSum = expensesSnap.docs
        .map((d) => d.data() as any)
        .filter((e) => {
          const ts = parseInt(e.date || e.createdAt || '0')
          return ts >= startDate && ts <= endDate
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0)

      const dailyRevenue = Array.from(dailyMap.entries())
        .map(([date, v]) => ({ date, revenue: v.revenue, cogs: v.cogs, profit: v.revenue - v.cogs }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setDailyData(dailyRevenue)
      setTotals({ revenue: totalRevenue, cogs: totalCogs, profit: totalRevenue - totalCogs, expenseSum })
    } catch (err) {
      console.error("Error loading profit report:", err)
      setError(err instanceof Error ? err.message : "Erreur de chargement du rapport profit")
    } finally {
      setLoading(false)
    }
  }, [tenantId, startDate, endDate])

  useEffect(() => { load() }, [load])

  const generateReportHTML = (data: typeof dailyData, t: typeof totals) => {
    const dailyRows = data.map((d) => `
      <tr>
        <td style="padding:6px 12px;border:1px solid #ddd;text-align:left">${d.date}</td>
        <td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${formatXOF(d.revenue)}</td>
        <td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${formatXOF(d.cogs)}</td>
        <td style="padding:6px 12px;border:1px solid #ddd;text-align:right">${formatXOF(d.profit)}</td>
      </tr>`).join('')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport de profit</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;color:#333;padding:30px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:20px 0 8px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#f5f5f5;padding:8px 12px;border:1px solid #ddd;text-align:left;font-size:12px}
td{padding:6px 12px;border:1px solid #ddd}.title{color:#666;font-size:12px;margin-bottom:20px}
.summary td:first-child{font-weight:600;width:220px}
.summary td:last-child{text-align:right;font-weight:700}
.footer{margin-top:30px;font-size:11px;color:#999;text-align:center}</style></head><body>
<h1>Rapport de profit</h1>
<p class="title">Période du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}</p>
<h2>Résumé</h2>
<table class="summary">
<tr><td>Revenus</td><td>${formatXOF(t.revenue)}</td></tr>
<tr><td>COGS</td><td>${formatXOF(t.cogs)}</td></tr>
<tr><td>Profit brut</td><td>${formatXOF(t.profit)}</td></tr>
<tr><td>Dépenses</td><td>${formatXOF(t.expenseSum)}</td></tr>
<tr><td>Profit net</td><td>${formatXOF(t.profit - t.expenseSum)}</td></tr>
<tr><td>Marge</td><td>${t.revenue > 0 ? ((t.profit / t.revenue) * 100).toFixed(1) : 0}%</td></tr>
</table>
<h2>Évolution quotidienne</h2>
<table><thead><tr><th>Date</th><th>Revenu</th><th>COGS</th><th>Profit</th></tr></thead><tbody>${dailyRows}</tbody></table>
<p class="footer">Généré par Naatal ERP</p></body></html>`
  }

  const handleExportPdf = async () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) { toast.error("Veuillez autoriser les popups"); return }
    const content = generateReportHTML(dailyData, totals)
    printWindow.document.write(content)
    printWindow.document.close()
    printWindow.print()
  }

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <TrendingUp className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); load() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Rapport de profit</h2>
        <ExportTools
          data={dailyData.map((d) => ({
            date: d.date,
            revenue: d.revenue,
            cogs: d.cogs,
            profit: d.profit,
          }))}
          columns={[
            { key: "date", label: "Date" },
            { key: "revenue", label: "Revenu" },
            { key: "cogs", label: "COGS" },
            { key: "profit", label: "Profit" },
          ]}
          filename="rapport-profit"
          onExportPdf={handleExportPdf}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              Revenus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatXOF(totals.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <TrendingDown className="w-4 h-4" />
              COGS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">{formatXOF(totals.cogs)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Profit brut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatXOF(totals.profit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Percent className="w-4 h-4" />
              Marge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profit net (Revenus - COGS - Dépenses)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">
            {formatXOF(totals.profit - totals.expenseSum)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Dépenses: {formatXOF(totals.expenseSum)}
          </p>
        </CardContent>
      </Card>

      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Évolution quotidienne</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: unknown) => formatXOF(Number(value) || 0)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
