import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, orderBy, getDocs, type Firestore } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { useOnSnapshot } from '@/hooks/useOnSnapshot'
import { getLowStockProducts } from '@/services/inventory.service'
import type { Sale, Customer, Product, Settings } from '@/types'

export interface ChartDataPoint {
  date: string
  ventes: number
}

export interface AlertItem {
  id: string
  name: string
  stock: number
  minStock: number
}

export interface RecentSaleItem {
  id: string
  customerName: string
  total: number
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'PENDING'
}

export function useDashboard() {
  const tenant = useAuthStore((s) => s.tenant)
  const tenantId = tenant?.id

  const [todaySales, setTodaySales] = useState(0)
  const [totalDebt, setTotalDebt] = useState(0)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [recentSales, setRecentSales] = useState<RecentSaleItem[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [db, setDb] = useState<Firestore | null>(null)
  const [totalUsers, setTotalUsers] = useState(0)
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    if (!tenantId) return
    initializeFirebase().then(({ db: d }) => setDb(d))
  }, [tenantId])

  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime().toString()
  }, [])

  const todayQ = useMemo(
    () =>
      db && tenantId
        ? query(
            collection(db, 'sales'),
            where('tenantId', '==', tenantId),
            where('isDeleted', '==', false),
            where('createdAt', '>=', todayStart),
            orderBy('createdAt', 'desc'),
          )
        : null,
    [db, tenantId, todayStart],
  )

  const customersQ = useMemo(
    () =>
      db && tenantId
        ? query(
            collection(db, 'customers'),
            where('tenantId', '==', tenantId),
            where('isDeleted', '==', false),
          )
        : null,
    [db, tenantId],
  )

  const productsQ = useMemo(
    () =>
      db && tenantId
        ? query(
            collection(db, 'products'),
            where('tenantId', '==', tenantId),
            where('isDeleted', '==', false),
          )
        : null,
    [db, tenantId],
  )

  const { data: todaySalesData, error: todayError } = useOnSnapshot<Sale>(todayQ)
  const { data: customers, error: customersError } = useOnSnapshot<Customer>(customersQ)
  const { data: products, error: productsError } = useOnSnapshot<Product>(productsQ)

  const customerMap = useMemo(
    () => new Map((customers ?? []).map((c) => [c.id, c.name])),
    [customers],
  )

  useEffect(() => {
    if (!todaySalesData) return
    const filtered = todaySalesData.filter(
      (s) => s.invoiceType !== 'PROFORMA' && s.invoiceType !== 'QUOTATION' && s.invoiceType !== 'CREDIT_NOTE'
    )
    setTodaySales(filtered.reduce((sum, s) => sum + (s.total || 0), 0))
    const recent = filtered.slice(0, 5).map((s) => ({
      id: s.id,
      customerName: s.customerId
        ? customerMap.get(s.customerId) || 'Client inconnu'
        : 'Client inconnu',
      total: s.total,
      paymentStatus: s.paymentStatus,
    }))
    setRecentSales(recent)
    const dayTotals: Record<string, number> = {}
    for (const sale of filtered) {
      if (!sale.createdAt) continue
      const saleDate = new Date(parseInt(sale.createdAt, 10))
      const dayKey = saleDate.toDateString()
      dayTotals[dayKey] = (dayTotals[dayKey] || 0) + (sale.total || 0)
    }
    const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    const points: ChartDataPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toDateString()
      points.push({ date: dayLabels[d.getDay()], ventes: dayTotals[key] || 0 })
    }
    setChartData(points)
  }, [todaySalesData, customerMap])

  useEffect(() => {
    if (!customers) return
    setTotalDebt(customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0))
  }, [customers])

  useEffect(() => {
    if (!tenantId) return
    let cancelled = false
    getLowStockProducts(tenantId).then((items) => {
      if (!cancelled) setAlerts(items.slice(0, 10))
    })
    return () => { cancelled = true }
  }, [tenantId])

  useEffect(() => {
    if (!db || !tenantId) return
    getDocs(
      query(collection(db, 'users'), where('tenantId', '==', tenantId)),
    ).then((snap) => setTotalUsers(snap.docs.length)).catch(() => {})
  }, [db, tenantId])

  useEffect(() => {
    if (!db || !tenantId) return
    getDocs(
      query(collection(db, 'settings'), where('tenantId', '==', tenantId)),
    ).then((snap) => {
      const doc = snap.docs[0]
      if (doc) setSettings({ id: doc.id, ...doc.data() } as Settings)
    }).catch(() => {})
  }, [db, tenantId])

  const error = todayError || customersError || productsError

  return {
    tenantName: tenant?.name || 'Naatal ERP',
    currency: tenant?.currency || 'XOF',
    todaySales,
    totalCustomers: customers?.length || 0,
    totalProducts: products?.length || 0,
    totalDebt,
    alerts,
    recentSales,
    chartData,
    todaySalesCount: (todaySalesData || []).filter(
      (s) => s.invoiceType !== 'PROFORMA' && s.invoiceType !== 'QUOTATION' && s.invoiceType !== 'CREDIT_NOTE'
    ).length,
    totalUsers,
    settings,
    loading: !todaySalesData,
    error,
  }
}
