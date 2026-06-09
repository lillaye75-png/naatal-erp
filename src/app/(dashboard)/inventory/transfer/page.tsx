"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeftRight, Loader2, Search } from "lucide-react"
import { useAuthStore } from "@/stores/auth.store"
import { getProducts } from "@/repositories/product.repository"
import { getStockLevel, transferStock } from "@/services/inventory.service"
import { collection, getDocs, query, where } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"
import type { Product, Warehouse } from "@/types"

export default function StockTransferPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [fromWarehouse, setFromWarehouse] = useState("")
  const [toWarehouse, setToWarehouse] = useState("")
  const [qty, setQty] = useState("")
  const [sourceStock, setSourceStock] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!tenantId) return
    Promise.all([
      getProducts(tenantId).then((r) => setProducts(r.items)),
      initializeFirebase().then(({ db }) =>
        getDocs(query(collection(db, 'warehouses'), where('tenantId', '==', tenantId)))
          .then((snap) => setWarehouses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Warehouse))))
      ),
    ]).finally(() => setLoading(false))
  }, [tenantId])

  useEffect(() => {
    if (!selectedProduct || !fromWarehouse || !tenantId) { setSourceStock(null); return }
    getStockLevel(selectedProduct, tenantId, fromWarehouse).then(setSourceStock)
  }, [selectedProduct, fromWarehouse, tenantId])

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleTransfer = async () => {
    if (!tenantId || !userId) { toast.error("Session expirée"); return }
    const qtyNum = parseInt(qty) || 0
    if (!selectedProduct || !fromWarehouse || !toWarehouse || qtyNum <= 0) {
      toast.error("Veuillez remplir tous les champs")
      return
    }
    if (fromWarehouse === toWarehouse) {
      toast.error("Les entrepôts doivent être différents")
      return
    }
    setSubmitting(true)
    try {
      const product = products.find((p) => p.id === selectedProduct)
      await transferStock({
        productId: selectedProduct,
        productName: product?.name || '',
        fromWarehouseId: fromWarehouse,
        toWarehouseId: toWarehouse,
        qty: qtyNum,
        tenantId,
        userId,
      })
      toast.success("Transfert effectué avec succès")
      setQty("")
      setSourceStock(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du transfert")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transfert de stock</h1>
        <p className="text-sm text-muted-foreground mt-1">Transférer du stock entre entrepôts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            Nouveau transfert
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Produit</Label>
            <Input placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
            <Select value={selectedProduct} onValueChange={(v) => setSelectedProduct(v || '')}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filteredProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} - {formatXOF(p.price)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entrepôt source</Label>
              <Select value={fromWarehouse} onValueChange={(v) => setFromWarehouse(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceStock !== null && (
                <p className="text-xs text-muted-foreground">Stock disponible: {sourceStock}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Entrepôt destination</Label>
              <Select value={toWarehouse} onValueChange={(v) => setToWarehouse(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantité</Label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" min="1" />
          </div>

          <Button className="w-full" onClick={handleTransfer} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ArrowLeftRight className="w-4 h-4 mr-1" />}
            {submitting ? "Transfert en cours..." : "Effectuer le transfert"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
