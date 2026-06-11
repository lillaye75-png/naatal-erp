"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { Plus, Edit, Trash2, Shield } from "lucide-react"
import { toast } from "sonner"
import type { Role } from "@/types"

const PERMISSION_GROUPS = [
  {
    label: "Ventes",
    permissions: [
      { key: "sales:read", label: "Voir les ventes" },
      { key: "sales:write", label: "Créer/Modifier les ventes" },
      { key: "sales:delete", label: "Supprimer les ventes" },
    ],
  },
  {
    label: "Produits",
    permissions: [
      { key: "products:read", label: "Voir les produits" },
      { key: "products:write", label: "Créer/Modifier les produits" },
      { key: "products:delete", label: "Supprimer les produits" },
    ],
  },
  {
    label: "Clients",
    permissions: [
      { key: "customers:read", label: "Voir les clients" },
      { key: "customers:write", label: "Créer/Modifier les clients" },
      { key: "customers:delete", label: "Supprimer les clients" },
    ],
  },
  {
    label: "Achats",
    permissions: [
      { key: "purchases:read", label: "Voir les achats" },
      { key: "purchases:write", label: "Créer/Modifier les achats" },
      { key: "purchases:delete", label: "Supprimer les achats" },
    ],
  },
  {
    label: "Stock",
    permissions: [
      { key: "inventory:read", label: "Voir le stock" },
      { key: "inventory:write", label: "Ajuster le stock" },
      { key: "inventory:transfer", label: "Transférer le stock" },
    ],
  },
  {
    label: "Dettes",
    permissions: [
      { key: "debt:read", label: "Voir les dettes" },
      { key: "debt:write", label: "Gérer les dettes" },
    ],
  },
  {
    label: "Caisse",
    permissions: [
      { key: "cash_register:open", label: "Ouvrir la caisse" },
      { key: "cash_register:close", label: "Fermer la caisse" },
      { key: "cash_register:read", label: "Voir la caisse" },
    ],
  },
  {
    label: "Rapports",
    permissions: [
      { key: "reports:read", label: "Voir les rapports" },
      { key: "reports:export", label: "Exporter les rapports" },
    ],
  },
  {
    label: "Paramètres",
    permissions: [
      { key: "settings:read", label: "Voir les paramètres" },
      { key: "settings:write", label: "Modifier les paramètres" },
    ],
  },
  {
    label: "Utilisateurs",
    permissions: [
      { key: "users:read", label: "Voir les utilisateurs" },
      { key: "users:write", label: "Créer/Modifier les utilisateurs" },
      { key: "users:delete", label: "Supprimer les utilisateurs" },
    ],
  },
] as const

type RoleWithId = Role & { id: string }

export default function RolesPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const [roles, setRoles] = useState<RoleWithId[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<RoleWithId | null>(null)
  const [name, setName] = useState("")
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())

  const fetch = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(
        collection(db, 'roles'),
        where('tenantId', '==', tenantId),
      ))
      setRoles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoleWithId)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  const openCreate = () => {
    setEditItem(null)
    setName("")
    setSelectedPerms(new Set())
    setOpen(true)
  }

  const openEdit = (role: RoleWithId) => {
    setEditItem(role)
    setName(role.name)
    setSelectedPerms(new Set(role.permissions))
    setOpen(true)
  }

  const togglePerm = (key: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSave = async () => {
    if (!tenantId || !name.trim()) return
    try {
      const { db } = await initializeFirebase()
      const now = Timestamp.now().toMillis().toString()
      const data = {
        name: name.trim(),
        permissions: Array.from(selectedPerms),
        tenantId,
        updatedAt: now,
      }

      if (editItem) {
        await updateDoc(doc(db, 'roles', editItem.id), data)
        toast.success('Rôle modifié')
      } else {
        await addDoc(collection(db, 'roles'), { ...data, createdAt: now })
        toast.success('Rôle créé')
      }

      setOpen(false)
      setEditItem(null)
      setName("")
      setSelectedPerms(new Set())
      fetch()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  const handleDelete = async (id: string, roleName: string) => {
    if (!confirm(`Supprimer le rôle "${roleName}" ?`)) return
    try {
      const { db } = await initializeFirebase()
      await deleteDoc(doc(db, 'roles', id))
      toast.success('Rôle supprimé')
      fetch()
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); fetch() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rôles &amp; Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez les rôles et leurs permissions</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter un rôle
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Nom</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Permissions</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{r.name}</td>
                <td className="p-3 text-sm text-muted-foreground">{r.permissions.length} permission{r.permissions.length > 1 ? 's' : ''}</td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(r)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(r.id, r.name)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={3} className="p-12 text-center text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>Aucun rôle</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Modifier' : 'Ajouter'} un rôle</DialogTitle>
          </DialogHeader>
          <form method="POST" onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du rôle</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Gestionnaire" required />
            </div>

            <div className="space-y-1">
              <Label>Permissions</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto border rounded-lg p-3">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</p>
                    {group.permissions.map((perm) => (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded px-1 py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPerms.has(perm.key)}
                          onChange={() => togglePerm(perm.key)}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit">{editItem ? 'Modifier' : 'Créer'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
