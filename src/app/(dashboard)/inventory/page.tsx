"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PackageSearch, AlertTriangle, Search, Warehouse, Eye, Plus, Minus, RefreshCw, ArrowRightLeft, Loader2 } from "lucide-react"
import { ColumnVisibilityDropdown } from "@/components/shared/ColumnVisibilityDropdown"
import { useColumnManager, type ColumnDef } from "@/hooks/useColumnManager"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { getProducts } from "@/repositories/product.repository"
import { getStockLevel, getLowStockProducts } from "@/services/inventory.service"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"
import { collection, getDocs, query, where, doc, setDoc, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import type { Product, Warehouse as WarehouseType, InventoryMovement } from "@/types"
import { useWarehouseName } from "@/hooks/useWarehouses"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  const [showAddMovement, setShowAddMovement] = useState(false)
  const [addMovementProduct, setAddMovementProduct] = useState<Product | null>(null)
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'>('IN')
  const [movementQty, setMovementQty] = useState("0")
  const [movementNote, setMovementNote] = useState("")
  const [movementWarehouse, setMovementWarehouse] = useState("")
  const [movementSubmitting, setMovementSubmitting] = useState(false)
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)
  const getWarehouseName = useWarehouseName(tenantId)

  const columns: ColumnDef[] = useMemo(() => [
    { id: 'product', label: 'Produit' },
    { id: 'warehouse', label: 'Entrepôt' },
    { id: 'stock', label: 'Stock' },
    { id: 'minStock', label: 'Min' },
    { id: 'value', label: 'Valeur' },
    { id: 'status', label: 'Statut' },
    { id: 'actions', label: 'Actions' },
  ], [])

  const { visible, filters, toggleColumn, setFilter, resetVisibility } = useColumnManager(columns)

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

  const MOVEMENT_TYPE_OPTIONS: { value: string; label: string; icon: React.ReactNode }[] = [
    { value: 'IN', label: 'Entrée', icon: <Plus className="w-4 h-4 text-green-600" /> },
    { value: 'OUT', label: 'Sortie', icon: <Minus className="w-4 h-4 text-red-600" /> },
    { value: 'ADJUSTMENT', label: 'Ajustement', icon: <RefreshCw className="w-4 h-4 text-yellow-600" /> },
    { value: 'TRANSFER', label: 'Transfert', icon: <ArrowRightLeft className="w-4 h-4 text-purple-600" /> },
  ]

  const handleAddMovement = async () => {
    if (!tenantId || !userId || !addMovementProduct) return
    const qty = parseInt(movementQty) || 0
    if (qty <= 0) { toast.error("La quantité doit être supérieure à 0"); return }
    if (movementType === 'TRANSFER' && !movementWarehouse) { toast.error("Sélectionnez un entrepôt de destination"); return }
    setMovementSubmitting(true)
    try {
      const { db } = await initializeFirebase()
      if (movementType === 'TRANSFER') {
        const outRef = doc(collection(db, 'inventory_movements'))
        await setDoc(outRef, {
          id: outRef.id,
          productId: addMovementProduct.id,
          type: 'TRANSFER',
          qty: -qty,
          balance: 0,
          note: movementNote || `Transfert sortant vers ${movementWarehouse}`,
          referenceId: addMovementProduct.id,
          warehouseId: addMovementProduct.warehouseId || '',
          tenantId,
          createdAt: Timestamp.now().toMillis().toString(),
          updatedAt: Timestamp.now().toMillis().toString(),
          createdBy: userId,
          updatedBy: userId,
          isDeleted: false,
          status: 'ACTIVE',
        })
        const inRef = doc(collection(db, 'inventory_movements'))
        await setDoc(inRef, {
          id: inRef.id,
          productId: addMovementProduct.id,
          type: 'TRANSFER',
          qty,
          balance: 0,
          note: movementNote || `Transfert entrant depuis ${addMovementProduct.warehouseId || 'entrepôt source'}`,
          referenceId: addMovementProduct.id,
          warehouseId: movementWarehouse,
          tenantId,
          createdAt: Timestamp.now().toMillis().toString(),
          updatedAt: Timestamp.now().toMillis().toString(),
          createdBy: userId,
          updatedBy: userId,
          isDeleted: false,
          status: 'ACTIVE',
        })
      } else {
        const movRef = doc(collection(db, 'inventory_movements'))
        await setDoc(movRef, {
          id: movRef.id,
          productId: addMovementProduct.id,
          type: movementType === 'IN' ? 'PURCHASE' : movementType === 'OUT' ? 'SALE' : 'ADJUSTMENT',
          qty: movementType === 'OUT' ? -qty : qty,
          balance: 0,
          note: movementNote || `Mouvement manuel: ${MOVEMENT_TYPE_OPTIONS.find(o => o.value === movementType)?.label || movementType}`,
          referenceId: addMovementProduct.id,
          warehouseId: addMovementProduct.warehouseId || '',
          tenantId,
          createdAt: Timestamp.now().toMillis().toString(),
          updatedAt: Timestamp.now().toMillis().toString(),
          createdBy: userId,
          updatedBy: userId,
          isDeleted: false,
          status: 'ACTIVE',
        })
      }
      toast.success("Mouvement enregistré")
      setShowAddMovement(false)
      setAddMovementProduct(null)
      setMovementQty("0")
      setMovementNote("")
      setMovementWarehouse("")
      load()
    } catch (err) {
      console.error('Error creating movement:', err)
      toast.error("Erreur lors de la création du mouvement")
    } finally {
      setMovementSubmitting(false)
    }
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
        <ColumnVisibilityDropdown
          columns={columns}
          visible={visible}
          onToggle={toggleColumn}
          onReset={resetVisibility}
        />
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
        <Button variant="outline" size="sm" onClick={() => { setAddMovementProduct(products[0] || null); setShowAddMovement(true) }}>
          <Plus className="w-4 h-4 mr-1" />
          Mouvement
        </Button>
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
                {visible.has('product') && <th className="text-left p-3 text-xs font-medium text-muted-foreground">Produit</th>}
                {visible.has('warehouse') && <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Entrepôt</th>}
                {visible.has('stock') && <th className="text-right p-3 text-xs font-medium text-muted-foreground">Stock</th>}
                {visible.has('minStock') && <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Min</th>}
                {visible.has('value') && <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Valeur</th>}
                {visible.has('status') && <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>}
                {visible.has('actions') && <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const stock = stockMap[p.id] || 0
                const minStock = p.minStock || 0
                const status = stock <= 0 ? 'OUT' : stock <= minStock ? 'LOW' : 'OK'

                return (
                  <tr key={p.id} className="border-t hover:bg-muted/30">
                    {visible.has('product') && <td className="p-3 text-sm font-medium">{p.name}</td>}
                    {visible.has('warehouse') && <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{getWarehouseName(p.warehouseId)}</td>}
                    {visible.has('stock') && <td className="p-3 text-sm text-right font-medium">{stock}</td>}
                    {visible.has('minStock') && <td className="p-3 text-sm text-right text-muted-foreground hidden md:table-cell">{minStock}</td>}
                    {visible.has('value') && <td className="p-3 text-sm text-right hidden md:table-cell">{formatXOF(stock * p.costPrice)}</td>}
                    {visible.has('status') && <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        status === 'OK' ? 'bg-success/10 text-success' :
                        status === 'LOW' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {status === 'OK' ? 'OK' : status === 'LOW' ? 'Faible' : 'Rupture'}
                      </span>
                    </td>}
                    {visible.has('actions') && <td className="p-3 text-right">
                      <Button variant="ghost" size="xs" onClick={() => loadMovements(p)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    </td>}
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

      {/* Add movement dialog */}
      <Dialog open={showAddMovement} onOpenChange={(o) => { if (!o) { setShowAddMovement(false); setAddMovementProduct(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageSearch className="w-4 h-4" />
              Nouveau mouvement de stock
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produit</Label>
              <Select value={addMovementProduct?.id || ''} onValueChange={(v) => setAddMovementProduct(products.find(p => p.id === v) || null)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {stockMap[p.id] || 0})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type de mouvement</Label>
              <div className="grid grid-cols-2 gap-2">
                {MOVEMENT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMovementType(opt.value as any)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                      movementType === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantité</Label>
              <Input type="number" value={movementQty} onChange={(e) => setMovementQty(e.target.value)} placeholder="0" min="1" />
            </div>
            {movementType === 'TRANSFER' && (
              <div className="space-y-2">
                <Label>Entrepôt de destination</Label>
                <Select value={movementWarehouse} onValueChange={(v) => setMovementWarehouse(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un entrepôt" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Note (optionnelle)</Label>
              <Input value={movementNote} onChange={(e) => setMovementNote(e.target.value)} placeholder="Raison du mouvement..." />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddMovement(false); setAddMovementProduct(null) }}>Annuler</Button>
              <Button onClick={handleAddMovement} disabled={movementSubmitting}>
                {movementSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
