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
import { Plus, Edit, Trash2, Users, Percent } from "lucide-react"
import { toast } from "sonner"

interface GroupData {
  id: string
  name: string
  discountPercent: number
  tenantId: string
}

export default function CustomerGroupsPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const [groups, setGroups] = useState<GroupData[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<GroupData | null>(null)
  const [form, setForm] = useState({ name: '', discountPercent: 0 })

  const fetch = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(collection(db, 'customer_groups'), where('tenantId', '==', tenantId)))
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupData)))
    } catch { toast.error('Erreur') }
    finally { setLoading(false) }
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  const handleSave = async () => {
    if (!tenantId) return
    try {
      const { db } = await initializeFirebase()
      const now = Timestamp.now().toMillis().toString()
      if (editItem) {
        await updateDoc(doc(db, 'customer_groups', editItem.id), { ...form, updatedAt: now })
        toast.success('Groupe modifié')
      } else {
        await addDoc(collection(db, 'customer_groups'), { ...form, tenantId, createdAt: now, updatedAt: now })
        toast.success('Groupe créé')
      }
      setOpen(false); setEditItem(null); setForm({ name: '', discountPercent: 0 }); fetch()
    } catch { toast.error('Erreur') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce groupe ?')) return
    try {
      const { db } = await initializeFirebase()
      await deleteDoc(doc(db, 'customer_groups', id))
      toast.success('Groupe supprimé')
      fetch()
    } catch { toast.error('Erreur') }
  }

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Groupes clients</h1><p className="text-sm text-muted-foreground mt-1">Segmentez vos clients avec des remises</p></div>
        <Button onClick={() => { setEditItem(null); setForm({ name: '', discountPercent: 0 }); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nouveau groupe
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Nom</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Remise (%)</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{g.name}</td>
                <td className="p-3 text-sm text-right"><span className="flex items-center justify-end gap-1"><Percent className="w-3 h-3" />{g.discountPercent}%</span></td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditItem(g); setForm({ name: g.name, discountPercent: g.discountPercent }); setOpen(true) }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(g.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr><td colSpan={3} className="p-12 text-center text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Aucun groupe</p></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Modifier' : 'Nouveau'} groupe</DialogTitle></DialogHeader>
          <form method="POST" onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
            <div className="space-y-2"><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Grossiste" required /></div>
            <div className="space-y-2"><Label>Remise (%)</Label><Input type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: parseInt(e.target.value) || 0 })} min={0} max={100} /></div>
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
