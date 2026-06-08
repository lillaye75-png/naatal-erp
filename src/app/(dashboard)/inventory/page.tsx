"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PackageSearch, AlertTriangle, Search } from "lucide-react"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { getProducts } from "@/repositories/product.repository"
import { getStockLevel, getLowStockProducts } from "@/services/inventory.service"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"
import type { Product } from "@/types"

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
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([])
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await getProducts(tenantId)
      setProducts(result.items)

      const stocks: Record<string, number> = {}
      await Promise.all(
        result.items.map(async (p) => {
          stocks[p.id] = await getStockLevel(p.id)
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
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()),
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher un produit..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Stock</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Min</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Valeur</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
