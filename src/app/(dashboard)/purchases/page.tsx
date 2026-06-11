"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PackageSearch, Plus, PackageCheck } from "lucide-react"
import { ColumnVisibilityDropdown } from "@/components/shared/ColumnVisibilityDropdown"
import { useColumnManager, type ColumnDef } from "@/hooks/useColumnManager"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { getPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, approvePurchaseOrder, cancelPurchaseOrder } from "@/services/purchase.service"
import { getProducts } from "@/repositories/product.repository"
import { getSuppliers } from "@/services/contact.service"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"
import type { Product, Supplier, PurchaseOrder } from "@/types"

interface PurchaseFormItem {
  productId: string
  qty: number
  unitCost: number
}

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const columns: ColumnDef[] = useMemo(() => [
    { id: 'number', label: 'N°' },
    { id: 'supplier', label: 'Fournisseur' },
    { id: 'total', label: 'Total' },
    { id: 'status', label: 'Statut' },
    { id: 'actions', label: 'Actions' },
  ], [])

  const { visible, filters, toggleColumn, setFilter, resetVisibility } = useColumnManager(columns)

  const filtered = orders.filter((o) => {
    const colMatch = Object.entries(filters).every(([key, val]) => {
      if (!val) return true
      const v = val.toLowerCase()
      if (key === 'number') return o.id.toLowerCase().includes(v)
      if (key === 'supplier') return (suppliers.find((s) => s.id === o.supplierId)?.name || o.supplierId).toLowerCase().includes(v)
      if (key === 'total') return String(o.total).includes(v)
      if (key === 'status') return o.status.toLowerCase().includes(v)
      return true
    })
    return colMatch
  })

  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)

  const [form, setForm] = useState<{
    supplierId: string
    expectedDate: string
    items: PurchaseFormItem[]
  }>({
    supplierId: "",
    expectedDate: "",
    items: [{ productId: "", qty: 1, unitCost: 0 }],
  })

  const statusLabel: Record<string, string> = {
    DRAFT: 'Brouillon',
    PENDING: 'En attente',
    APPROVED: 'Approuvée',
    PARTIALLY_RECEIVED: 'Reçue partiellement',
    RECEIVED: 'Reçue',
    CANCELLED: 'Annulée',
  }

  const statusColor: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground',
    PENDING: 'bg-warning/10 text-warning',
    APPROVED: 'bg-info/10 text-info',
    PARTIALLY_RECEIVED: 'bg-blue-100 text-blue-700',
    RECEIVED: 'bg-success/10 text-success',
    CANCELLED: 'bg-destructive/10 text-destructive',
  }

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const [result, prodResult, supResult] = await Promise.all([
        getPurchaseOrders(tenantId),
        getProducts(tenantId),
        getSuppliers(tenantId),
      ])
      setOrders(result)
      setProducts(prodResult.items)
      setSuppliers(supResult.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      console.error('Error loading purchases:', err)
      toast.error('Erreur de chargement des achats')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!tenantId || !userId) return
    try {
      const items = form.items.map((i) => ({ ...i }))
      const total = items.reduce((sum, i) => sum + i.qty * i.unitCost, 0)
      await createPurchaseOrder({
        supplierId: form.supplierId,
        items,
        total,
        notes: '',
        tenantId,
        userId,
      })
      toast.success("Commande créée")
      setShowCreate(false)
      load()
    } catch (err) {
      console.error('Error creating purchase order:', err)
      toast.error("Erreur lors de la création de la commande")
    }
  }

  const handleReceive = async (orderId: string) => {
    if (!userId) return
    try {
      if (!tenantId) return
      await receivePurchaseOrder(orderId, userId, tenantId)
      toast.success("Commande réceptionnée")
      load()
    } catch (err) {
      console.error('Error receiving purchase order:', err)
      toast.error("Erreur lors de la réception")
    }
  }

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { productId: "", qty: 1, unitCost: 0 }] })
  }

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); load() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Achats</h1>
          <p className="text-sm text-muted-foreground mt-1">Commandes fournisseurs</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Nouvelle commande
        </Button>
        <ColumnVisibilityDropdown
          columns={columns}
          visible={visible}
          onToggle={toggleColumn}
          onReset={resetVisibility}
        />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              {visible.has('number') && <th className="text-left p-3 text-xs font-medium text-muted-foreground">N°</th>}
              {visible.has('supplier') && <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Fournisseur</th>}
              {visible.has('total') && <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total</th>}
              {visible.has('status') && <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>}
              {visible.has('actions') && <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>}
            </tr>
            <tr className="bg-muted/30">
              {visible.has('number') && <th className="p-1"><Input placeholder="Filtrer..." className="h-7 text-xs" value={filters.number || ''} onChange={(e) => setFilter('number', e.target.value)} /></th>}
              {visible.has('supplier') && <th className="p-1 hidden md:table-cell"><Input placeholder="Filtrer..." className="h-7 text-xs" value={filters.supplier || ''} onChange={(e) => setFilter('supplier', e.target.value)} /></th>}
              {visible.has('total') && <th className="p-1"><Input placeholder="Min" className="h-7 text-xs" value={filters.total || ''} onChange={(e) => setFilter('total', e.target.value)} /></th>}
              {visible.has('status') && <th className="p-1"><Input placeholder="Filtrer..." className="h-7 text-xs" value={filters.status || ''} onChange={(e) => setFilter('status', e.target.value)} /></th>}
              {visible.has('actions') && <th className="p-1"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t hover:bg-muted/30">
                {visible.has('number') && <td className="p-3 text-sm font-mono">#{o.id.slice(-6)}</td>}
                {visible.has('supplier') && <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                  {suppliers.find((s) => s.id === o.supplierId)?.name || o.supplierId}
                </td>}
                {visible.has('total') && <td className="p-3 text-sm text-right font-medium">{formatXOF(o.total)}</td>}
                {visible.has('status') && <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[o.status] || ''}`}>
                    {statusLabel[o.status] || o.status}
                  </span>
                </td>}
                {visible.has('actions') && (
                <td className="p-3 text-right">
                  {o.status === 'DRAFT' && (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" onClick={() => approvePurchaseOrder(o.id, userId || '')}>
                        Approuver
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => cancelPurchaseOrder(o.id, userId || '')}>
                        Annuler
                      </Button>
                    </div>
                  )}
                  {o.status === 'APPROVED' && (
                    <Button size="sm" variant="outline" onClick={() => handleReceive(o.id)}>
                      <PackageCheck className="w-3 h-3 mr-1" />
                      Réceptionner
                    </Button>
                  )}
                  {o.status === 'PENDING' && (
                    <Button size="sm" variant="outline" onClick={() => handleReceive(o.id)}>
                      <PackageCheck className="w-3 h-3 mr-1" />
                      Réceptionner
                    </Button>
                  )}
                </td>
                )}
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={visible.size} className="p-12 text-center text-muted-foreground">
                <PackageSearch className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Aucune commande</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle commande</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v ?? '' })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date prévue</Label>
              <Input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
            </div>
            <div className="space-y-3">
              <Label>Articles</Label>
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end">
                  <Select value={item.productId} onValueChange={(v) => {
                    const items = [...form.items]
                    items[i] = { ...items[i], productId: v ?? '' }
                    setForm({ ...form, items })
                  }}>
                    <SelectTrigger><SelectValue placeholder="Produit" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" value={item.qty} onChange={(e) => {
                    const items = [...form.items]
                    items[i].qty = parseInt(e.target.value) || 0
                    setForm({ ...form, items })
                  }} placeholder="Qté" />
                  <Input type="number" value={item.unitCost} onChange={(e) => {
                    const items = [...form.items]
                    items[i].unitCost = parseInt(e.target.value) || 0
                    setForm({ ...form, items })
                  }} placeholder="PU" />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" />
                Ajouter un article
              </Button>
            </div>
            <div className="text-right font-semibold">
              Total: {formatXOF(form.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0))}
            </div>
            <Button className="w-full" onClick={handleCreate}>Créer la commande</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
