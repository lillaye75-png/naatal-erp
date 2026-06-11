"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { useOnSnapshot } from "@/hooks/useOnSnapshot"
import { useColumnManager, type ColumnDef } from "@/hooks/useColumnManager"
import { ColumnVisibilityDropdown } from "@/components/shared/ColumnVisibilityDropdown"
import { initializeFirebase } from "@/lib/firebase"
import { collection, query, where, orderBy, type Firestore } from "firebase/firestore"
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge"
import { Input } from "@/components/ui/input"
import { formatXOF } from "@/lib/currency"
import type { Sale } from "@/types"

export default function SalesPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const router = useRouter()

  const columns: ColumnDef[] = useMemo(() => [
    { id: 'invoice', label: 'N° Facture' },
    { id: 'customer', label: 'Client' },
    { id: 'total', label: 'Total' },
    { id: 'status', label: 'Statut' },
    { id: 'date', label: 'Date' },
  ], [])

  const { visible, filters, toggleColumn, setFilter, resetVisibility } = useColumnManager(columns)

  const [db, setDb] = useState<Firestore | null>(null)
  useEffect(() => {
    if (!tenantId) return
    initializeFirebase().then(({ db: d }) => setDb(d))
  }, [tenantId])

  const salesQ = useMemo(
    () =>
      db && tenantId
        ? query(
            collection(db, 'sales'),
            where('tenantId', '==', tenantId),
            where('isDeleted', '==', false),
            orderBy('createdAt', 'desc'),
          )
        : null,
    [db, tenantId],
  )

  const { data: sales, loading, error } = useOnSnapshot<Sale>(salesQ)

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <ShoppingCart className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">Erreur de chargement des ventes</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Réessayer
      </Button>
    </div>
  )

  const filtered = sales.filter((s) => {
    const colMatch = Object.entries(filters).every(([key, val]) => {
      if (!val) return true
      const v = val.toLowerCase()
      if (key === 'invoice') return (s.invoiceId || '').toLowerCase().includes(v)
      if (key === 'customer') return (s.customerId || '').toLowerCase().includes(v)
      if (key === 'total') return String(s.total).includes(v)
      if (key === 'status') return (s.paymentStatus || '').toLowerCase().includes(v)
      if (key === 'date') return (s.createdAt || '').includes(v)
      return true
    })
    return colMatch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ventes</h1>
          <p className="text-sm text-muted-foreground mt-1">Consultez l'historique des ventes</p>
        </div>
        <Button onClick={() => router.push('/sales/new')}>
          <Plus className="w-4 h-4 mr-1" />
          Nouvelle vente
        </Button>
        <ColumnVisibilityDropdown
          columns={columns}
          visible={visible}
          onToggle={toggleColumn}
          onReset={resetVisibility}
        />
      </div>
      {sales.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucune vente</p>
          <Button className="mt-3" onClick={() => router.push('/sales/new')}>
            Créer une vente
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                {visible.has('invoice') && <th className="text-left p-3 text-xs font-medium text-muted-foreground">N° Facture</th>}
                {visible.has('customer') && <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Client</th>}
                {visible.has('total') && <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total</th>}
                {visible.has('status') && <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>}
                {visible.has('date') && <th className="text-right p-3 text-xs font-medium text-muted-foreground">Date</th>}
              </tr>
              <tr className="bg-muted/30">
                {visible.has('invoice') && <th className="p-1"><Input placeholder="Filtrer..." className="h-7 text-xs" value={filters.invoice || ''} onChange={(e) => setFilter('invoice', e.target.value)} /></th>}
                {visible.has('customer') && <th className="p-1 hidden md:table-cell"><Input placeholder="Filtrer..." className="h-7 text-xs" value={filters.customer || ''} onChange={(e) => setFilter('customer', e.target.value)} /></th>}
                {visible.has('total') && <th className="p-1"><Input placeholder="Min" className="h-7 text-xs" value={filters.total || ''} onChange={(e) => setFilter('total', e.target.value)} /></th>}
                {visible.has('status') && <th className="p-1"><Input placeholder="Filtrer..." className="h-7 text-xs" value={filters.status || ''} onChange={(e) => setFilter('status', e.target.value)} /></th>}
                {visible.has('date') && <th className="p-1"><Input placeholder="JJ/MM" className="h-7 text-xs" value={filters.date || ''} onChange={(e) => setFilter('date', e.target.value)} /></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  {visible.has('invoice') && <td className="p-3 text-sm font-medium">{s.invoiceId?.slice(-6) || '-'}</td>}
                  {visible.has('customer') && <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{s.customerId?.slice(-6) || 'Walk-in'}</td>}
                  {visible.has('total') && <td className="p-3 text-sm text-right font-medium">{formatXOF(s.total)}</td>}
                  {visible.has('status') && <td className="p-3 text-center">
                    <PaymentStatusBadge status={s.paymentStatus} />
                  </td>}
                  {visible.has('date') && <td className="p-3 text-sm text-muted-foreground text-right">{s.createdAt ? new Date(parseInt(s.createdAt)).toLocaleDateString() : '-'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
