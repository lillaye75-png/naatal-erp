"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { collection, getDocs, query, where } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { formatXOF } from "@/lib/currency"
import { downloadSalesReport, downloadProfitReport } from "@/lib/excel"
import { ShoppingCart, TrendingUp, DollarSign, TrendingDown, Download } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { toast } from "sonner"

export function SalesReport({ startDate, endDate }: { startDate: number; endDate: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    totalSales: number; totalRevenue: number; salesCount: number; totalCogs: number
    grossProfit: number; profitMargin: number; productCount: number; customerCount: number
    inventoryValue: number
  } | null>(null)
  const [dailyRevenue, setDailyRevenue] = useState<Array<{ date: string; revenue: number; cogs: number; profit: number }>>([])
  const [exporting, setExporting] = useState(false)
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const loadReports = useCallback(async () => {
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
          return ts >= startDate && ts <= endDate
        })

      const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0)
      const totalPaid = sales.reduce((sum, s) => sum + (s.amountPaid || 0), 0)
      const salesCount = sales.length

      let totalCogs = 0
      for (const sale of sales) {
        const items = sale.items || []
        for (const item of items) {
          const prodSnap = await getDocs(query(
            collection(db, 'products'),
            where('__name__', '==', item.productId),
          ))
          if (!prodSnap.empty) {
            totalCogs += (prodSnap.docs[0].data()?.costPrice || 0) * item.qty
          }
        }
      }

      const prodSnap = await getDocs(query(
        collection(db, 'products'),
        where('tenantId', '==', tenantId),
        where('isDeleted', '==', false),
      ))
      const productCount = prodSnap.docs.length
      const inventoryValue = prodSnap.docs.reduce((sum, d) => {
        const p = d.data() as any
        return sum + (p.costPrice || 0) * (p.minStock || 0)
      }, 0)

      const custSnap = await getDocs(query(
        collection(db, 'customers'),
        where('tenantId', '==', tenantId),
        where('isDeleted', '==', false),
      ))
      const customerCount = custSnap.docs.length

      const grossProfit = totalRevenue - totalCogs
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

      const dailyMap = new Map<string, { revenue: number; cogs: number }>()
      for (const s of sales) {
        if (!s.createdAt) continue
        const key = new Date(parseInt(s.createdAt)).toISOString().split('T')[0]
        const entry = dailyMap.get(key) || { revenue: 0, cogs: 0 }
        entry.revenue += s.total || 0
        const items = s.items || []
        for (const item of items) {
          const prodSnap = await getDocs(query(
            collection(db, 'products'),
            where('__name__', '==', item.productId),
          ))
          if (!prodSnap.empty) {
            entry.cogs += (prodSnap.docs[0].data()?.costPrice || 0) * item.qty
          }
        }
        dailyMap.set(key, entry)
      }

      const dailyRevenueArr = Array.from(dailyMap.entries())
        .map(([date, vals]) => ({ date, revenue: vals.revenue, cogs: vals.cogs, profit: vals.revenue - vals.cogs }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setData({ totalSales: totalRevenue, totalRevenue: totalPaid, inventoryValue, salesCount, productCount, customerCount, totalCogs, grossProfit, profitMargin })
      setDailyRevenue(dailyRevenueArr)
    } catch (err) {
      console.error('Error loading sales report:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement des rapports')
    } finally {
      setLoading(false)
    }
  }, [tenantId, startDate, endDate])

  useEffect(() => { loadReports() }, [loadReports])

  const handleExportSales = async () => {
    if (!tenantId) return
    setExporting(true)
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(
        collection(db, 'sales'),
        where('tenantId', '==', tenantId),
        where('isDeleted', '==', false),
      ))
      downloadSalesReport(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)), 'period')
      toast.success('Rapport exporté')
    } catch { toast.error("Erreur lors de l'export") }
    finally { setExporting(false) }
  }

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <ShoppingCart className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); loadReports() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Rapport des ventes</h2>
        <Button variant="outline" size="sm" onClick={handleExportSales} disabled={exporting}>
          <Download className="w-3 h-3 mr-1" />
          Exporter
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <ShoppingCart className="w-4 h-4" />
              Chiffre d'affaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatXOF(data?.totalSales || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.salesCount || 0} ventes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              Revenu encaissé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{formatXOF(data?.totalRevenue || 0)}</p>
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
            <p className="text-3xl font-bold text-primary">{formatXOF(data?.grossProfit || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Marge: {(data?.profitMargin || 0).toFixed(1)}%</p>
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
            <p className="text-3xl font-bold text-orange-500">{formatXOF(data?.totalCogs || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Coût des marchandises vendues</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Revenus quotidiens</CardTitle></CardHeader>
          <CardContent className="h-72">
            {dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: unknown) => formatXOF(Number(value) || 0)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée pour cette période
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Profit quotidien</CardTitle></CardHeader>
          <CardContent className="h-72">
            {dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: unknown) => formatXOF(Number(value) || 0)} />
                  <Bar dataKey="profit" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée pour cette période
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Résumé</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-muted-foreground">Produits</p><p className="font-semibold">{data?.productCount || 0}</p></div>
            <div><p className="text-muted-foreground">Clients</p><p className="font-semibold">{data?.customerCount || 0}</p></div>
            <div><p className="text-muted-foreground">Valeur stock</p><p className="font-semibold">{formatXOF(data?.inventoryValue || 0)}</p></div>
            <div><p className="text-muted-foreground">Marge bénéficiaire</p><p className="font-semibold">{(data?.profitMargin || 0).toFixed(1)}%</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
