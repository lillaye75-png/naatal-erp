"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { useOnSnapshot } from "@/hooks/useOnSnapshot"
import { initializeFirebase } from "@/lib/firebase"
import { collection, query, where, orderBy, type Firestore } from "firebase/firestore"
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge"
import { formatXOF } from "@/lib/currency"
import type { Sale } from "@/types"

export default function SalesPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const router = useRouter()

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
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">N° Facture</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Client</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{s.invoiceId?.slice(-6) || '-'}</td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{s.customerId?.slice(-6) || 'Walk-in'}</td>
                  <td className="p-3 text-sm text-right font-medium">{formatXOF(s.total)}</td>
                  <td className="p-3 text-center">
                    <PaymentStatusBadge status={s.paymentStatus} />
                  </td>
                  <td className="p-3 text-sm text-muted-foreground text-right">{s.createdAt ? new Date(parseInt(s.createdAt)).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
