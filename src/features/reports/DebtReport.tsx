"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { formatXOF } from "@/lib/currency"
import { ExportTools } from "./ExportTools"
import { AlertTriangle, UserCheck } from "lucide-react"
import { toast } from "sonner"
import type { Customer } from "@/types"

export function DebtReport() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debtors, setDebtors] = useState<Customer[]>([])
  const [totalDebt, setTotalDebt] = useState(0)
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(
        collection(db, 'customers'),
        where('tenantId', '==', tenantId),
        where('isDeleted', '==', false),
        where('totalDebt', '>', 0),
        orderBy('totalDebt', 'desc'),
        limit(50),
      ))
      const customers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer))
      setDebtors(customers)
      setTotalDebt(customers.reduce((s, c) => s + (c.totalDebt || 0), 0))
    } catch (err) {
      console.error("Error loading debt report:", err)
      setError(err instanceof Error ? err.message : "Erreur de chargement du rapport dettes")
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangle className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); load() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Rapport des dettes</h2>
        <ExportTools
          data={debtors.map((c) => ({
            client: c.name,
            phone: c.phone,
            dette: c.totalDebt || 0,
          }))}
          columns={[
            { key: "client", label: "Client" },
            { key: "phone", label: "Téléphone" },
            { key: "dette", label: "Dette" },
          ]}
          filename="rapport-dettes"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Clients endettés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{debtors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Total des dettes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatXOF(totalDebt)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Client</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Téléphone</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Dette</th>
            </tr>
          </thead>
          <tbody>
            {debtors.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{c.name}</td>
                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{c.phone}</td>
                <td className="p-3 text-sm text-right font-semibold text-destructive">{formatXOF(c.totalDebt || 0)}</td>
              </tr>
            ))}
            {debtors.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted-foreground">
                  Aucun client endetté
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
