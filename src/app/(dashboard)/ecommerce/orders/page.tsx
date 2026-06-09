"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { useAuthStore } from "@/stores/auth.store"
import { getOrders, updateOrderStatus } from "@/repositories/order.repository"
import { formatXOF } from "@/lib/currency"
import { ShoppingBag, CheckCircle, XCircle, Truck, RefreshCw, Bell } from "lucide-react"
import { toast } from "sonner"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import type { Order } from "@/types"

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  ACCEPTED: "Acceptée",
  REFUSED: "Refusée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-indigo-100 text-indigo-800",
  REFUSED: "bg-red-100 text-red-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
}

const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "REFUSED"],
  CONFIRMED: ["ACCEPTED", "REFUSED"],
  ACCEPTED: ["DELIVERED", "CANCELLED"],
  REFUSED: [],
  DELIVERED: [],
  CANCELLED: [],
}

export default function EcommerceOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)

  const loadOrders = async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await getOrders(tenantId)
      setOrders(data)
    } catch (err: any) {
      toast.error(err?.message || "Erreur de chargement des commandes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    let unsub: (() => void) | null = null
    initializeFirebase().then(({ db }) => {
      unsub = onSnapshot(
        query(collection(db, 'orders'), where('tenantId', '==', tenantId)),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data() as Order
              if (data.status === 'PENDING' || data.status === 'CONFIRMED') {
                toast(
                  <div className="flex items-start gap-2">
                    <Bell className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">Nouvelle commande</p>
                      <p className="text-xs text-muted-foreground">{data.customerName || 'Client anonyme'} — {formatXOF(data.total)}</p>
                    </div>
                  </div>,
                  { duration: 8000 },
                )
              }
            }
          })
          setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)))
        },
      )
    })
    return () => { unsub?.() }
  }, [tenantId])

  const handleStatusChange = async (orderId: string, status: string) => {
    if (!userId) return
    try {
      await updateOrderStatus(orderId, status, userId)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: status as Order['status'] } : o)),
      )
      toast.success(`Commande ${STATUS_LABELS[status]?.toLowerCase()}`)
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du changement de statut")
    }
  }

  const statusSummary = (status: string) => orders.filter((o) => o.status === status).length

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Commandes</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez les commandes de votre boutique en ligne</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders}>
          <RefreshCw className="size-3.5 mr-1" />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{statusSummary(key)}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Aucune commande"
          description="Les commandes passées depuis votre boutique en ligne apparaîtront ici"
          icon={ShoppingBag}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-muted-foreground">#{order.trackingId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {order.customerName || "Client anonyme"}
                    </p>
                    {order.customerPhone && (
                      <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                    )}
                    <div className="mt-2 space-y-1">
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          {item.name} x{item.qty} — {formatXOF(item.price * item.qty)}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold">{formatXOF(order.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(Number(order.createdAt)).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                {TRANSITIONS[order.status]?.length > 0 && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    {TRANSITIONS[order.status].map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(order.id, nextStatus)}
                      >
                        {nextStatus === "ACCEPTED" || nextStatus === "CONFIRMED" ? (
                          <><CheckCircle className="size-3.5 mr-1" /> {STATUS_LABELS[nextStatus]}</>
                        ) : nextStatus === "REFUSED" || nextStatus === "CANCELLED" ? (
                          <><XCircle className="size-3.5 mr-1" /> {STATUS_LABELS[nextStatus]}</>
                        ) : nextStatus === "DELIVERED" ? (
                          <><Truck className="size-3.5 mr-1" /> {STATUS_LABELS[nextStatus]}</>
                        ) : (
                          STATUS_LABELS[nextStatus]
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
