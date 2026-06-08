"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Plus, Search, Users, Pencil, Trash2 } from "lucide-react"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { formatXOF } from "@/lib/currency"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuthStore } from "@/stores/auth.store"
import { useOnSnapshot } from "@/hooks/useOnSnapshot"
import { initializeFirebase } from "@/lib/firebase"
import { collection, query, where, type Firestore } from "firebase/firestore"
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/repositories/customer.repository"
import { toast } from "sonner"
import type { Customer } from "@/types"

const customerSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  email: z.string().optional().default(""),
  phone: z.string().min(1, "Téléphone requis"),
  address: z.string().optional().default(""),
  creditLimit: z.coerce.number().min(0, "Limite de crédit invalide").default(0),
})

type CustomerFormValues = z.infer<typeof customerSchema>

export default function CustomersPage() {
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)

  const [db, setDb] = useState<Firestore | null>(null)
  useEffect(() => {
    if (!tenantId) return
    initializeFirebase().then(({ db: d }) => setDb(d))
  }, [tenantId])

  const customersQ = useMemo(
    () =>
      db && tenantId
        ? query(
            collection(db, 'customers'),
            where('tenantId', '==', tenantId),
            where('isDeleted', '==', false),
          )
        : null,
    [db, tenantId],
  )

  const { data: customers, loading } = useOnSnapshot<Customer>(customersQ)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: { name: "", email: "", phone: "", address: "", creditLimit: 0 },
  })

  function openAddDialog() {
    setEditingCustomer(null)
    reset({ name: "", email: "", phone: "", address: "", creditLimit: 0 })
    setDialogOpen(true)
  }

  function openEditDialog(customer: Customer) {
    setEditingCustomer(customer)
    reset({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone,
      address: customer.address || "",
      creditLimit: customer.creditLimit,
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: CustomerFormValues) {
    if (!tenantId || !userId) return
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, data, userId)
        toast.success("Client modifié avec succès")
      } else {
        await createCustomer({ ...data, tenantId }, userId)
        toast.success("Client ajouté avec succès")
      }
      setDialogOpen(false)
    } catch {
      toast.error("Une erreur est survenue")
    }
  }

  async function handleDelete(customer: Customer) {
    if (!userId) return
    if (!window.confirm(`Supprimer le client "${customer.name}" ?`)) return
    try {
      await deleteCustomer(customer.id, userId)
      toast.success("Client supprimé avec succès")
    } catch {
      toast.error("Une erreur est survenue")
    }
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search),
  )

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez vos clients</p>
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
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucun client trouvé</p>
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
                  Dette
                </th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{c.name}</td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{c.phone}</td>
                  <td className="p-3 text-sm text-right hidden md:table-cell">
                    {formatXOF(Number(c.totalDebt) || 0)}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}>
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
              {editingCustomer ? "Modifier le client" : "Ajouter un client"}
            </DialogTitle>
          </DialogHeader>
          <form method="POST" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" {...register("name")} placeholder="Nom du client" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="client@exemple.com" />
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
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Limite de crédit (FCFA)</Label>
              <Input id="creditLimit" type="number" {...register("creditLimit")} placeholder="0" />
              {errors.creditLimit && (
                <p className="text-xs text-destructive">{errors.creditLimit.message}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Enregistrement..."
                  : editingCustomer
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
