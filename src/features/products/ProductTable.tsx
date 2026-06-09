"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle } from "lucide-react"
import { useProducts } from "./hooks/useProducts"
import { useAuthStore } from "@/stores/auth.store"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { formatXOF } from "@/lib/currency"
import { getStockLevel } from "@/services/inventory.service"
import { cn } from "@/lib/utils"
import type { Product } from "@/types"

interface ProductTableProps {
  onAdd: () => void
  onEdit: (product: Product) => void
}

export function ProductTable({ onAdd, onEdit }: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const { fetchProducts, removeProduct } = useProducts()
  const tenantId = useAuthStore((s) => s.tenant?.id)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchProducts()
      .then((result) => {
        if (cancelled) return
        setProducts(result.items)
      })
      .catch((err) => {
        if (!cancelled) console.error('Error loading products:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [fetchProducts])

  useEffect(() => {
    if (products.length === 0) return
    let cancelled = false
    if (!tenantId) return
    Promise.all(
      products.map(async (p) => {
        const stock = await getStockLevel(p.id, tenantId).catch(() => 0)
        return { id: p.id, stock }
      }),
    ).then((results) => {
      if (cancelled) return
      const map: Record<string, number> = {}
      for (const r of results) map[r.id] = r.stock
      setStockMap(map)
    })
    return () => { cancelled = true }
  }, [products, tenantId])

  const handleDelete = async (id: string) => {
    try {
      await removeProduct(id, "system")
      const result = await fetchProducts()
      setProducts(result.items)
    } catch (err) {
      console.error('Error deleting product:', err)
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou SKU..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucun produit trouvé</p>
          <Button variant="outline" className="mt-3" onClick={onAdd}>
            Ajouter un produit
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Produit</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">SKU</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Catégorie</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Prix</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Stock</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const stock = stockMap[product.id]
                const isLowStock = stock !== undefined && product.minStock > 0 && stock <= product.minStock
                return (
                  <tr key={product.id} className={cn("border-t hover:bg-muted/30", isLowStock && "bg-destructive/5")}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                          {product.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{product.name}</span>
                        {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{product.sku}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{product.categoryId?.slice(0, 8) || '-'}</td>
                    <td className="p-3 text-sm text-right font-medium">{formatXOF(product.price)}</td>
                    <td className="p-3 text-sm text-right hidden md:table-cell">
                      <span className={cn(isLowStock && "text-destructive font-semibold")}>
                        {stock !== undefined ? stock : (product.minStock ? `${product.minStock}+` : '-')}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(product)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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
