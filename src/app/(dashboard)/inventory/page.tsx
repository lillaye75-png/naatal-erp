"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PackageSearch, AlertTriangle, Search, Warehouse, Eye } from "lucide-react"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { getProducts } from "@/repositories/product.repository"
import { getStockLevel, getLowStockProducts } from "@/services/inventory.service"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"
import { collection, getDocs, query, where } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import type { Product, Warehouse as WarehouseType, InventoryMovement } from "@/types"
import { useWarehouseName } from "@/hooks/useWarehouses"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LowStockProduct {
  id: string
  name: string
  stock: number
  minStock: number
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [warehouseFilter, setWarehouseFilter] = useState("")
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([])
  const [movementProduct, setMovementProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const getWarehouseName = useWarehouseName(tenantId)

  useEffect(() => {
    if (!tenantId) return
    initializeFirebase().then(({ db }) =>
      getDocs(query(collection(db, 'warehouses'), where('tenantId', '==', tenantId)))
        .then((snap) => setWarehouses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WarehouseType))))
    )
  }, [tenantId])

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await getProducts(tenantId)
      setProducts(result.items)

      const wId = warehouseFilter || undefined
      const stocks: Record<string, number> = {}
      await Promise.all(
        result.items.map(async (p) => {
          stocks[p.id] = await getStockLevel(p.id, tenantId, wId)
        }),
      )
      setStockMap(stocks)

      const low = await getLowStockProducts(tenantId)
      setLowStockItems(low)
    } catch (err) {
      console.error('Error loading inventory:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement du stock')
    } finally {
      setLoading(false)
    }
  }, [tenantId, warehouseFilter])

  useEffect(() => { load() }, [load])

  const loadMovements = async (product: Product) => {
    if (!tenantId) return
    setMovementProduct(product)
    setMovementsLoading(true)
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(
        collection(db, 'inventory_movements'),
        where('productId', '==', product.id),
        where('tenantId', '==', tenantId),
      ))
      setMovements(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryMovement)).reverse())
    } catch {
      toast.error("Erreur de chargement des mouvements")
    } finally {
      setMovementsLoading(false)
    }
  }

  const MOVEMENT_LABELS: Record<string, string> = {
    SALE: 'Vente',
    PURCHASE: 'Achat',
    RETURN: 'Retour',
    ADJUSTMENT: 'Ajustement',
    TRANSFER: 'Transfert',
  }

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()),
  ).filter(
    (p) => !warehouseFilter || p.warehouseId === warehouseFilter,
  )

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <PackageSearch className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); load() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Stock</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez votre inventaire</p>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-warning">
              <AlertTriangle className="w-4 h-4" />
              Produits en rupture imminente ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name}</span>
                  <span className="text-destructive font-medium">{item.stock} / {item.minStock}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher un produit..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={warehouseFilter} onValueChange={(v) => setWarehouseFilter(v === 'all' || !v ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <Warehouse className="w-4 h-4 mr-1" />
            <SelectValue placeholder="Tous les entrepôts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les entrepôts</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <PackageSearch className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucun produit trouvé</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Produit</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Entrepôt</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Stock</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Min</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Valeur</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const stock = stockMap[p.id] || 0
                const minStock = p.minStock || 0
                const status = stock <= 0 ? 'OUT' : stock <= minStock ? 'LOW' : 'OK'

                return (
                  <tr key={p.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 text-sm font-medium">{p.name}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{getWarehouseName(p.warehouseId)}</td>
                    <td className="p-3 text-sm text-right font-medium">{stock}</td>
                    <td className="p-3 text-sm text-right text-muted-foreground hidden md:table-cell">{minStock}</td>
                    <td className="p-3 text-sm text-right hidden md:table-cell">{formatXOF(stock * p.costPrice)}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        status === 'OK' ? 'bg-success/10 text-success' :
                        status === 'LOW' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {status === 'OK' ? 'OK' : status === 'LOW' ? 'Faible' : 'Rupture'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="xs" onClick={() => loadMovements(p)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!movementProduct} onOpenChange={(open) => { if (!open) setMovementProduct(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageSearch className="w-4 h-4" />
              {movementProduct?.name}
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                Stock: <span className="font-semibold">{movementProduct ? stockMap[movementProduct.id] || 0 : 0}</span>
              </span>
            </DialogTitle>
          </DialogHeader>
          {movementsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Chargement...</div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Aucun mouvement</div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">Qté</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Entrepôt</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 text-xs">{m.createdAt ? new Date(parseInt(m.createdAt)).toLocaleDateString("fr-FR") : '-'}</td>
                      <td className="p-2 text-xs">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          m.type === 'PURCHASE' ? 'bg-blue-100 text-blue-800' :
                          m.type === 'SALE' ? 'bg-green-100 text-green-800' :
                          m.type === 'ADJUSTMENT' ? 'bg-yellow-100 text-yellow-800' :
                          m.type === 'TRANSFER' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {MOVEMENT_LABELS[m.type] || m.type}
                        </span>
                      </td>
                      <td className={`p-2 text-xs text-right font-medium ${m.qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{getWarehouseName(m.warehouseId)}</td>
                      <td className="p-2 text-xs text-muted-foreground">{m.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
