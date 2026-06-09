"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuthStore } from "@/stores/auth.store"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { getLowStockProducts } from "@/services/inventory.service"
import { formatXOF } from "@/lib/currency"
import { ExportTools } from "./ExportTools"
import { useRouter } from "next/navigation"
import { Package, AlertTriangle, ShoppingCart, TrendingDown, Info } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const MOVEMENT_LABELS: Record<string, string> = {
  SALE: "Vente",
  PURCHASE: "Achat",
  ADJUSTMENT: "Ajustement",
  RETURN: "Retour",
  TRANSFER: "Transfert",
}

export function InventoryReport() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stockValue, setStockValue] = useState(0)
  const [productCount, setProductCount] = useState(0)
  const [products, setProducts] = useState<Array<{ id: string; name: string; stock: number; minStock: number; costPrice?: number }>>([])
  const [lowStock, setLowStock] = useState<Array<{ id: string; name: string; stock: number; minStock: number }>>([])
  const [showMovements, setShowMovements] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; stock: number } | null>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const router = useRouter()

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { db } = await initializeFirebase()
      const prodSnap = await getDocs(query(
        collection(db, 'products'),
        where('tenantId', '==', tenantId),
        where('isDeleted', '==', false),
      ))
      const rawProducts = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any))
      setProductCount(rawProducts.length)

      const productList: Array<{ id: string; name: string; stock: number; minStock: number; costPrice?: number }> = []
      let totalValue = 0
      for (const p of rawProducts) {
        const movSnap = await getDocs(query(
          collection(db, 'inventory_movements'),
          where('productId', '==', p.id),
          where('tenantId', '==', tenantId),
        ))
        const stock = movSnap.docs.reduce((sum, d) => sum + (d.data().qty || 0), 0)
        totalValue += stock * (p.costPrice || 0)
        productList.push({ id: p.id, name: p.name, stock, minStock: p.minStock || 0, costPrice: p.costPrice })
      }
      setStockValue(totalValue)
      setProducts(productList.sort((a, b) => a.name.localeCompare(b.name)))

      const low = await getLowStockProducts(tenantId)
      setLowStock(low)
    } catch (err) {
      console.error("Error loading inventory report:", err)
      setError(err instanceof Error ? err.message : "Erreur de chargement du rapport stock")
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const loadMovements = async (productId: string) => {
    if (!tenantId) return
    setMovementsLoading(true)
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(
        collection(db, 'inventory_movements'),
        where('productId', '==', productId),
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc'),
      ))
      setMovements(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)))
    } catch (err) {
      console.error("Error loading movements:", err)
      toast.error("Erreur de chargement des mouvements")
    } finally {
      setMovementsLoading(false)
    }
  }

  const openMovements = (product: { id: string; name: string; stock: number }) => {
    setSelectedProduct(product)
    setShowMovements(true)
    loadMovements(product.id)
  }

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); load() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Rapport de stock</h2>
        <ExportTools
          data={products.map((p) => ({
            produit: p.name,
            stock: p.stock,
            stockMinimum: p.minStock,
          }))}
          columns={[
            { key: "produit", label: "Produit" },
            { key: "stock", label: "Stock actuel" },
            { key: "stockMinimum", label: "Stock minimum" },
          ]}
          filename="rapport-stock"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{productCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Valeur du stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatXOF(stockValue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Tous les produits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Produit</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Stock actuel</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Stock minimum</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground w-12"></th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun produit</td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t hover:bg-muted/30 cursor-pointer"
                      onClick={() => openMovements(p)}
                    >
                      <td className="p-3 text-sm font-medium">{p.name}</td>
                      <td className="p-3 text-sm text-right">{p.stock}</td>
                      <td className="p-3 text-sm text-right">{p.minStock}</td>
                      <td className="p-3 text-center">
                        <button
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted transition-colors"
                          onClick={(e) => { e.stopPropagation(); openMovements(p) }}
                          title="Voir l'historique des mouvements"
                        >
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {lowStock.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Stock faible — {lowStock.length} produit(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1">
                  <Button
                    variant="link"
                    className="p-0 h-auto font-medium text-sm"
                    onClick={() => openMovements(p)}
                  >
                    {p.name}
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-destructive">{p.stock} / {p.minStock}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/purchases?productId=${p.id}`)}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Commander
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showMovements} onOpenChange={(open) => { if (!open) setShowMovements(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {selectedProduct?.name}
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                Stock actuel: <span className="font-semibold text-foreground">{selectedProduct?.stock}</span>
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
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">Solde</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Référence</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 text-xs">{new Date(parseInt(m.createdAt)).toLocaleDateString("fr-FR")}</td>
                      <td className="p-2 text-xs">
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                          m.type === "PURCHASE" ? "bg-blue-100 text-blue-800" :
                          m.type === "SALE" ? "bg-green-100 text-green-800" :
                          m.type === "ADJUSTMENT" ? "bg-yellow-100 text-yellow-800" :
                          m.type === "RETURN" ? "bg-purple-100 text-purple-800" :
                          "bg-gray-100 text-gray-800"
                        )}>
                          {MOVEMENT_LABELS[m.type] || m.type}
                        </span>
                      </td>
                      <td className={cn("p-2 text-xs text-right font-medium", m.qty > 0 ? "text-green-600" : "text-red-600")}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </td>
                      <td className="p-2 text-xs text-right">{m.balance}</td>
                      <td className="p-2 text-xs text-muted-foreground">{m.referenceId ? m.referenceId.slice(0, 8) : "-"}</td>
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
