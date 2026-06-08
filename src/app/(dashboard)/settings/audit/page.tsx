"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { ScrollText, UserCheck, ShoppingCart, Settings2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

const actionIcons: Record<string, any> = {
  SALE_CREATE: ShoppingCart,
  USER_LOGIN: UserCheck,
  SETTINGS_UPDATE: Settings2,
}

const actionLabels: Record<string, string> = {
  SALE_CREATE: 'Vente créée',
  USER_LOGIN: 'Connexion',
  SETTINGS_UPDATE: 'Paramètres modifiés',
  PRODUCT_CREATE: 'Produit créé',
  PRODUCT_UPDATE: 'Produit modifié',
  CUSTOMER_CREATE: 'Client créé',
  PAYMENT_RECEIVED: 'Paiement reçu',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { db } = await initializeFirebase()
      let q = query(
        collection(db, 'audit_logs'),
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc'),
        limit(100),
      )
      if (filter !== 'all') {
        q = query(q, where('action', '==', filter))
      }
      const snap = await getDocs(q)
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('Error loading audit logs:', err)
      toast.error('Erreur de chargement du journal d\'audit')
    } finally {
      setLoading(false)
    }
  }, [tenantId, filter])

  useEffect(() => { load() }, [load])

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Journal d'audit</h1>
          <p className="text-sm text-muted-foreground mt-1">Historique des actions</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v ?? 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            <SelectItem value="SALE_CREATE">Ventes</SelectItem>
            <SelectItem value="USER_LOGIN">Connexions</SelectItem>
            <SelectItem value="PAYMENT_RECEIVED">Paiements</SelectItem>
            <SelectItem value="SETTINGS_UPDATE">Paramètres</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucune entrée d'audit</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const Icon = actionIcons[log.action] || AlertTriangle
            return (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{actionLabels[log.action] || log.action}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {log.entity} / {log.entityId?.slice(-8)}
                  </p>
                  {log.after && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {JSON.stringify(log.after).slice(0, 100)}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {log.createdAt
                    ? new Date(parseInt(log.createdAt)).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })
                    : '-'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
