"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Plus, Search, Truck, Pencil, Trash2 } from "lucide-react"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { formatXOF } from "@/lib/currency"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuthStore } from "@/stores/auth.store"
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/repositories/supplier.repository"
import { toast } from "sonner"
import type { Supplier } from "@/types"

const supplierSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  email: z.string().optional().default(""),
  phone: z.string().min(1, "Téléphone requis"),
  address: z.string().optional().default(""),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await getSuppliers(tenantId)
      setSuppliers(result.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      console.error('Error loading suppliers:', err)
      toast.error('Erreur de chargement des fournisseurs')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  async function refresh() {
    if (!tenantId) return
    setLoading(true)
    try {
      const result = await getSuppliers(tenantId)
      setSuppliers(result.items)
    } catch (err) {
      console.error('Error refreshing suppliers:', err)
      toast.error('Erreur de chargement des fournisseurs')
    } finally {
      setLoading(false)
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: { name: "", email: "", phone: "", address: "" },
  })

  function openAddDialog() {
    setEditingSupplier(null)
    reset({ name: "", email: "", phone: "", address: "" })
    setDialogOpen(true)
  }

  function openEditDialog(supplier: Supplier) {
    setEditingSupplier(supplier)
    reset({
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone,
      address: supplier.address || "",
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: SupplierFormValues) {
    if (!tenantId || !userId) return
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, data, userId)
        toast.success("Fournisseur modifié avec succès")
      } else {
        await createSupplier({ ...data, tenantId }, userId)
        toast.success("Fournisseur ajouté avec succès")
      }
      setDialogOpen(false)
      await refresh()
    } catch {
      toast.error("Une erreur est survenue")
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!userId) return
    if (!window.confirm(`Supprimer le fournisseur "${supplier.name}" ?`)) return
    try {
      await deleteSupplier(supplier.id, userId)
      toast.success("Fournisseur supprimé avec succès")
      await refresh()
    } catch {
      toast.error("Une erreur est survenue")
    }
  }

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search),
  )

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
      <div>
        <h1 className="text-2xl font-semibold">Fournisseurs</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez vos fournisseurs</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou téléphone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucun fournisseur trouvé</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Nom</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                  Téléphone
                </th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                  Dû
                </th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{s.name}</td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{s.phone}</td>
                  <td className="p-3 text-sm text-right hidden md:table-cell">
                    {formatXOF(Number(s.totalOwed) || 0)}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(s)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Modifier le fournisseur" : "Ajouter un fournisseur"}
            </DialogTitle>
          </DialogHeader>
          <form method="POST" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" {...register("name")} placeholder="Nom du fournisseur" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="fournisseur@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" {...register("phone")} placeholder="+221 77 123 45 67" />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" {...register("address")} placeholder="Adresse" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Enregistrement..."
                  : editingSupplier
                    ? "Modifier"
                    : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
