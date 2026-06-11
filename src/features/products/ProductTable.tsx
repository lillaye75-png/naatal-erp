"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle } from "lucide-react"
import { useProducts } from "./hooks/useProducts"
import { useAuthStore } from "@/stores/auth.store"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { ColumnVisibilityDropdown } from "@/components/shared/ColumnVisibilityDropdown"
import { useColumnManager, type ColumnDef } from "@/hooks/useColumnManager"
import { formatXOF } from "@/lib/currency"
import { getStockLevel } from "@/services/inventory.service"
import { cn } from "@/lib/utils"
import { createLowStockNotification } from "@/services/notification.service"
import type { Product, Category } from "@/types"
import { collection, getDocs, query, where } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"

interface ProductTableProps {
  onAdd: () => void
  onEdit: (product: Product) => void
}

export function ProductTable({ onAdd, onEdit }: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { fetchProducts, removeProduct, editProduct } = useProducts()
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const columns: ColumnDef[] = useMemo(() => [
    { id: 'name', label: 'Produit' },
    { id: 'sku', label: 'SKU' },
    { id: 'category', label: 'Catégorie' },
    { id: 'price', label: 'Prix' },
    { id: 'stock', label: 'Stock' },
    { id: 'actions', label: 'Actions' },
  ], [])

  const { visible, visibleColumns, filters, setFilter, toggleColumn, resetVisibility } = useColumnManager(columns)
  const notifiedLowStock = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!tenantId) return
    initializeFirebase().then(({ db }) =>
      getDocs(query(collection(db, 'categories'), where('tenantId', '==', tenantId)))
        .then((snap) => setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))))
    )
  }, [tenantId])

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
      const userId = useAuthStore.getState().user?.id
      if (userId) {
        for (const p of products) {
          const stock = map[p.id]
          if (stock !== undefined && p.minStock > 0 && stock <= p.minStock) {
            const key = `${p.id}-${stock}`
            if (!notifiedLowStock.current.has(key)) {
              notifiedLowStock.current.add(key)
              createLowStockNotification(userId, tenantId, p.name, stock).catch(console.error)
            }
          }
        }
      }
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

  const filtered = products.filter((p) => {
    const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    const catName = categories.find((c) => c.id === p.categoryId)?.name || ''
    const colMatch = Object.entries(filters).every(([key, val]) => {
      if (!val) return true
      const v = val.toLowerCase()
      if (key === 'name') return p.name.toLowerCase().includes(v)
      if (key === 'sku') return p.sku.toLowerCase().includes(v)
      if (key === 'category') return catName.toLowerCase().includes(v)
      if (key === 'price') {
        const [min, max] = val.split('-').map(Number)
        if (max) return p.price >= min && p.price <= max
        return String(p.price).includes(v)
      }
      if (key === 'stock') return String(stockMap[p.id] ?? '').includes(v)
      return true
    })
    return searchMatch && colMatch
  })

  if (loading) return <TableSkeleton />

  const renderContent = (() => {
    if (filtered.length === 0) {
      if (products.length === 0) {
        return <EmptyState icon={Package} title="Aucun produit" description="Ajoutez votre premier produit pour commencer à vendre" actionLabel="Ajouter un produit" onAction={onAdd} />
      }
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucun résultat pour "{search}"</p>
        </div>
      )
    }
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(filtered.map((p) => p.id)))
                    else setSelected(new Set())
                  }}
                />
              </th>
              {visible.has('name') && <th className="text-left p-3 text-xs font-medium text-muted-foreground">Produit</th>}
              {visible.has('sku') && <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">SKU</th>}
              {visible.has('category') && <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Catégorie</th>}
              {visible.has('price') && <th className="text-right p-3 text-xs font-medium text-muted-foreground">Prix</th>}
              {visible.has('stock') && <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Stock</th>}
              {visible.has('actions') && <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>}
            </tr>
            <tr className="bg-muted/30">
              <th className="w-10 p-0"></th>
              {visible.has('name') && <th className="p-1"><Input placeholder="Filtrer..." className="h-7 text-xs" value={filters.name || ''} onChange={(e) => setFilter('name', e.target.value)} /></th>}
              {visible.has('sku') && <th className="p-1 hidden md:table-cell"><Input placeholder="Filtrer..." className="h-7 text-xs" value={filters.sku || ''} onChange={(e) => setFilter('sku', e.target.value)} /></th>}
              {visible.has('category') && <th className="p-1 hidden md:table-cell"><Input placeholder="Filtrer..." className="h-7 text-xs" value={filters.category || ''} onChange={(e) => setFilter('category', e.target.value)} /></th>}
              {visible.has('price') && <th className="p-1"><Input placeholder="Min-Max" className="h-7 text-xs" value={filters.price || ''} onChange={(e) => setFilter('price', e.target.value)} /></th>}
              {visible.has('stock') && <th className="p-1 hidden md:table-cell"><Input placeholder="Min" className="h-7 text-xs" value={filters.stock || ''} onChange={(e) => setFilter('stock', e.target.value)} /></th>}
              {visible.has('actions') && <th className="p-1"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const stock = stockMap[product.id]
              const isLowStock = stock !== undefined && product.minStock > 0 && stock <= product.minStock
              return (
                <tr key={product.id} className={cn("border-t hover:bg-muted/30", isLowStock && "bg-destructive/5")}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selected.has(product.id)}
                      onChange={() => {
                        const next = new Set(selected)
                        if (next.has(product.id)) next.delete(product.id)
                        else next.add(product.id)
                        setSelected(next)
                      }}
                    />
                  </td>
                  {visible.has('name') && (
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                          {product.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{product.name}</span>
                        {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                      </div>
                    </td>
                  )}
                  {visible.has('sku') && <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{product.sku}</td>}
                  {visible.has('category') && <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{categories.find((c) => c.id === product.categoryId)?.name || product.categoryId?.slice(0, 8) || '-'}</td>}
                  {visible.has('price') && <td className="p-3 text-sm text-right font-medium">{formatXOF(product.price)}</td>}
                  {visible.has('stock') && (
                    <td className="p-3 text-sm text-right hidden md:table-cell">
                      <span className={cn(isLowStock && "text-destructive font-semibold")}>
                        {stock !== undefined ? stock : (product.minStock ? `${product.minStock}+` : '-')}
                      </span>
                    </td>
                  )}
                  {visible.has('actions') && (
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
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  })()

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm">
          <span className="text-muted-foreground">{selected.size} sélectionné(s)</span>
          <Button variant="outline" size="sm" onClick={() => {
            selected.forEach((id) => handleDelete(id))
            setSelected(new Set())
          }}>
            <Trash2 className="w-3 h-3 mr-1 text-destructive" /> Supprimer
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Annuler
          </Button>
        </div>
      )}
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
        <ColumnVisibilityDropdown
          columns={columns}
          visible={visible}
          onToggle={toggleColumn}
          onReset={resetVisibility}
        />
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>
      {renderContent}
    </div>
  )
}
