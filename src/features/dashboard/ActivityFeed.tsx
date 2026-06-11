"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { useAuthStore } from "@/stores/auth.store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, DollarSign, Package, RefreshCw, Receipt, ShoppingCart, Activity, Loader2 } from "lucide-react"
import type { AuditLog } from "@/types"

const actionConfig: Record<string, { icon: any; label: string }> = {
  CREATE_SALE: { icon: ShoppingCart, label: 'a créé la vente' },
  RECORD_PAYMENT: { icon: DollarSign, label: 'a enregistré un paiement' },
  CREATE_PRODUCT: { icon: Package, label: 'a ajouté le produit' },
  UPDATE_PRODUCT: { icon: Package, label: 'a modifié le produit' },
  CREATE_INVOICE: { icon: FileText, label: 'a créé la facture' },
  CREATE_EXPENSE: { icon: Receipt, label: 'a créé la dépense' },
  ADJUST_STOCK: { icon: RefreshCw, label: 'a ajusté le stock' },
}

export function ActivityFeed() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) return
    let cancelled = false
    initializeFirebase().then(({ db }) => {
      if (cancelled) return
      getDocs(
        query(
          collection(db, 'audit_logs'),
          where('tenantId', '==', tenantId),
          orderBy('createdAt', 'desc'),
          limit(10),
        ),
      ).then((snap) => {
        if (!cancelled) setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog)))
      }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    })
    return () => { cancelled = true }
  }, [tenantId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Activités récentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune activité</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const config = actionConfig[log.action] || { icon: Activity, label: log.action }
              const Icon = config.icon
              return (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">{log.userName || 'Utilisateur'}</span>{' '}
                      {config.label}{' '}
                      <span className="font-mono text-xs">{log.resourceId?.slice(-8) || ''}</span>
                    </p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{log.details}</p>
                    )}
                    <p className="text-xs text-muted-foreground/50 mt-0.5">
                      {log.createdAt ? new Date(parseInt(log.createdAt)).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
