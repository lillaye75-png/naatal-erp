"use client"

import { useState } from "react"
import { ProductTable } from "@/features/products/ProductTable"
import { ProductForm } from "@/features/products/ProductForm"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useProducts } from "@/features/products/hooks/useProducts"
import { useAuthStore } from "@/stores/auth.store"
import { toast } from "sonner"
import type { Product } from "@/types"

export default function ProductsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const { addProduct, editProduct } = useProducts()
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)

  const handleSubmit = async (data: any) => {
    if (!tenantId || !userId) {
      toast.error("Session expirée")
      return
    }
    try {
      if (editingProduct) {
        await editProduct(editingProduct.id, data, userId)
        toast.success("Produit modifié")
      } else {
        await addProduct(data, userId)
        toast.success("Produit ajouté")
      }
      setShowForm(false)
      setEditingProduct(null)
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Produits</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez votre catalogue de produits</p>
      </div>
      <ProductTable
        onAdd={() => {
          setEditingProduct(null)
          setShowForm(true)
        }}
        onEdit={(product) => {
          setEditingProduct(product)
          setShowForm(true)
        }}
      />
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditingProduct(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
