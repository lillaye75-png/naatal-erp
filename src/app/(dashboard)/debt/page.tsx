"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { HandCoins, Search, TrendingDown, DollarSign, Users } from "lucide-react"
import { DebtReminder } from "@/features/debt/DebtReminder"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { getCustomer } from "@/repositories/customer.repository"
import { PaymentStatusBadge } from "@/components/shared/PaymentStatusBadge"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"
import { getDebts, recordPayment } from "@/services/debt.service"

export default function DebtPage() {
  const [debts, setDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [paymentDialog, setPaymentDialog] = useState<{ saleId: string; remaining: number } | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("0")
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)

  const loadDebts = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const sales = await getDebts(tenantId)

      const withCustomers = await Promise.all(
        sales.map(async (s) => {
          const cust = s.customerId ? await getCustomer(s.customerId) : null
          return { ...s, customer: cust }
        }),
      )
      setDebts(withCustomers)
    } catch (err) {
      console.error('Error loading debts:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement des dettes')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { loadDebts() }, [loadDebts])

  const handlePayment = async () => {
    if (!tenantId || !userId || !paymentDialog) return
    const amount = parseInt(paymentAmount) || 0
    if (amount <= 0 || amount > paymentDialog.remaining) return

    try {
      await recordPayment(paymentDialog.saleId, amount, userId, tenantId)
      toast.success(`Paiement de ${formatXOF(amount)} enregistré`)
      setPaymentDialog(null)
      loadDebts()
    } catch {
      toast.error("Erreur lors du paiement")
    }
  }

  const totalDebt = debts.reduce((sum, d) => sum + (d.total - (d.amountPaid || 0)), 0)

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <HandCoins className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); loadDebts() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dettes clients</h1>
        <p className="text-sm text-muted-foreground mt-1">Suivi des créances clients</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Total dû
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatXOF(totalDebt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              Clients endettés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{debts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <TrendingDown className="w-4 h-4" />
              Dette moyenne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{debts.length > 0 ? formatXOF(Math.round(totalDebt / debts.length)) : formatXOF(0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher un client..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {debts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <HandCoins className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucune dette en cours</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Client</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Vente</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Payé</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Reste</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {debts
                .filter((d) => !search || d.customer?.name?.toLowerCase().includes(search.toLowerCase()))
                .map((d) => {
                  const remaining = d.total - (d.amountPaid || 0)
                  return (
                    <tr key={d.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 text-sm font-medium">{d.customer?.name || "Client inconnu"}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">#{d.id.slice(-6)}</td>
                      <td className="p-3 text-sm text-right">{formatXOF(d.total)}</td>
                      <td className="p-3 text-sm text-right text-muted-foreground">{formatXOF(d.amountPaid || 0)}</td>
                      <td className="p-3 text-sm text-right font-semibold text-destructive">{formatXOF(remaining)}</td>
                      <td className="p-3 text-center">
                        <PaymentStatusBadge status={d.paymentStatus} />
                      </td>
                      <td className="p-3 text-right flex items-center gap-1 justify-end">
                        <DebtReminder
                          customerName={d.customer?.name || "Client"}
                          customerPhone={d.customer?.phone}
                          amount={remaining}
                          dueDate={d.createdAt ? new Date(Number(d.createdAt) + 30 * 86400000).toLocaleDateString('fr-FR') : undefined}
                          storeName="Mon Magasin"
                        />
                        <Button size="sm" onClick={() => { setPaymentAmount(remaining.toString()); setPaymentDialog({ saleId: d.id, remaining }) }}>
                          Payer
                        </Button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!paymentDialog} onOpenChange={(open) => !open && setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm space-y-1 bg-muted p-3 rounded-lg">
              <div className="flex justify-between"><span>Reste dû</span><span className="font-semibold">{paymentDialog ? formatXOF(paymentDialog.remaining) : ''}</span></div>
            </div>
            <div className="space-y-2">
              <Label>Montant payé (FCFA)</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} max={paymentDialog?.remaining} />
            </div>
            <Button className="w-full" onClick={handlePayment}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
