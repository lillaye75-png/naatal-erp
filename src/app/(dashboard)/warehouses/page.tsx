"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { Plus, Edit, Trash2, Warehouse as WarehouseIcon, Check, X } from "lucide-react"
import { toast } from "sonner"

interface WarehouseData {
  id: string
  name: string
  location: string
  isPrimary: boolean
  tenantId: string
}

export default function WarehousesPage() {
  const { user, tenant } = useAuthStore()
  const tenantId = tenant?.id
  const userId = user?.id

  const [items, setItems] = useState<WarehouseData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<WarehouseData | null>(null)
  const [form, setForm] = useState({ name: '', location: '', isPrimary: false })

  const fetch = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(collection(db, 'warehouses'), where('tenantId', '==', tenantId)))
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WarehouseData)))
    } catch (err) { setError(err instanceof Error ? err.message : 'Une erreur est survenue'); toast.error('Erreur') }
    finally { setLoading(false) }
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  const handleSave = async () => {
    if (!tenantId || !userId) return
    try {
      const { db } = await initializeFirebase()
      const now = Timestamp.now().toMillis().toString()
      if (editItem) {
        await updateDoc(doc(db, 'warehouses', editItem.id), { ...form, updatedAt: now, updatedBy: userId })
        toast.success('Entrepôt modifié')
      } else {
        await addDoc(collection(db, 'warehouses'), { ...form, tenantId, createdAt: now, updatedAt: now, createdBy: userId, updatedBy: userId, isDeleted: false, status: 'ACTIVE' })
        toast.success('Entrepôt créé')
      }
      setOpen(false); setEditItem(null); setForm({ name: '', location: '', isPrimary: false }); fetch()
    } catch { toast.error('Erreur') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet entrepôt ?')) return
    try {
      const { db } = await initializeFirebase()
      await deleteDoc(doc(db, 'warehouses', id))
      toast.success('Entrepôt supprimé')
      fetch()
    } catch { toast.error('Erreur') }
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
        <div><h1 className="text-2xl font-semibold">Entrepôts</h1><p className="text-sm text-muted-foreground mt-1">Gérez vos lieux de stockage</p></div>
        <Button onClick={() => { setEditItem(null); setForm({ name: '', location: '', isPrimary: false }); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nouvel entrepôt
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Nom</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Emplacement</th>
              <th className="text-center p-3 text-xs font-medium text-muted-foreground">Principal</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{w.name}</td>
                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{w.location}</td>
                <td className="p-3 text-center">{w.isPrimary ? <Check className="w-4 h-4 mx-auto text-success" /> : <X className="w-4 h-4 mx-auto text-muted-foreground" />}</td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditItem(w); setForm({ name: w.name, location: w.location, isPrimary: w.isPrimary }); setOpen(true) }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(w.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className="p-12 text-center text-muted-foreground"><WarehouseIcon className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Aucun entrepôt</p></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Modifier' : 'Nouvel'} entrepôt</DialogTitle></DialogHeader>
          <form method="POST" onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
            <div className="space-y-2"><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Emplacement</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} className="rounded" />
              Entrepôt principal
            </label>
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
