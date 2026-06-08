"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, RefreshCw } from "lucide-react"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { useOnSnapshot } from "@/hooks/useOnSnapshot"
import { initializeFirebase } from "@/lib/firebase"
import { collection, query, where, orderBy, type Firestore } from "firebase/firestore"
import { formatXOF } from "@/lib/currency"
import type { Payment } from "@/types"

const METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  WAVE: "Wave",
  OM: "Orange Money",
  CARD: "Carte",
}

const METHOD_COLORS: Record<string, string> = {
  CASH: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  WAVE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  OM: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  CARD: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
}

export default function PaymentsPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const [retryCount, setRetryCount] = useState(0)

  const [db, setDb] = useState<Firestore | null>(null)
  useEffect(() => {
    if (!tenantId) return
    initializeFirebase().then(({ db: d }) => setDb(d))
  }, [tenantId])

  const paymentsQ = useMemo(
    () =>
      db && tenantId
        ? query(
            collection(db, 'payments'),
            where('tenantId', '==', tenantId),
            where('isDeleted', '==', false),
            orderBy('createdAt', 'desc'),
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, tenantId, retryCount],
  )

  const { data: payments, loading, error } = useOnSnapshot<Payment>(paymentsQ)

  if (loading) return <TableSkeleton />

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="mb-2">Erreur de chargement des paiements</p>
        <p className="text-sm mb-4">{error.message}</p>
        <Button variant="outline" onClick={() => setRetryCount((c) => c + 1)}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Paiements</h1>
        <p className="text-sm text-muted-foreground mt-1">Historique des paiements</p>
      </div>
      {payments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucun paiement enregistré</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Montant</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Méthode</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Référence</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Vente</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{formatXOF(p.amount)}</td>
                  <td className="p-3 text-sm hidden md:table-cell">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${METHOD_COLORS[p.method] || ''}`}>
                      {METHOD_LABELS[p.method] || p.method}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{p.reference || '-'}</td>
                  <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">
                    {p.saleId?.slice(-8) || '-'}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground text-right">
                    {p.createdAt ? new Date(parseInt(p.createdAt)).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
