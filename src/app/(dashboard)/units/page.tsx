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
import { Plus, Edit, Trash2, Ruler } from "lucide-react"
import { toast } from "sonner"
import type { Unit } from "@/types"

export default function UnitsPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const [units, setUnits] = useState<(Unit & { id: string })[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<(Unit & { id: string }) | null>(null)
  const [form, setForm] = useState({ name: '', symbol: '' })

  const fetch = useCallback(async () => {
    try {
      const { db } = await initializeFirebase()
      const q = tenantId ? query(collection(db, 'units'), where('tenantId', '==', tenantId)) : collection(db, 'units')
      const snap = await getDocs(q)
      setUnits(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)))
    } catch (err) { setError(err instanceof Error ? err.message : 'Une erreur est survenue'); toast.error('Erreur') }
    finally { setLoading(false) }
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  const handleSave = async () => {
    try {
      const { db } = await initializeFirebase()
      const now = Timestamp.now().toMillis().toString()
      if (editItem) {
        await updateDoc(doc(db, 'units', editItem.id), { ...form, updatedAt: now })
        toast.success('Unité modifiée')
      } else {
        await addDoc(collection(db, 'units'), { ...form, tenantId, createdAt: now, updatedAt: now })
        toast.success('Unité créée')
      }
      setOpen(false); setEditItem(null); setForm({ name: '', symbol: '' }); fetch()
    } catch { toast.error('Erreur') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette unité ?')) return
    try {
      const { db } = await initializeFirebase()
      await deleteDoc(doc(db, 'units', id))
      toast.success('Unité supprimée')
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
        <div><h1 className="text-2xl font-semibold">Unités</h1><p className="text-sm text-muted-foreground mt-1">Unités de mesure des produits</p></div>
        <Button onClick={() => { setEditItem(null); setForm({ name: '', symbol: '' }); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nouvelle unité
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Nom</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Symbole</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{u.name}</td>
                <td className="p-3 text-sm font-mono">{u.symbol}</td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditItem(u); setForm({ name: u.name, symbol: u.symbol }); setOpen(true) }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(u.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {units.length === 0 && (
              <tr><td colSpan={3} className="p-12 text-center text-muted-foreground"><Ruler className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Aucune unité</p></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Modifier' : 'Nouvelle'} unité</DialogTitle></DialogHeader>
          <form method="POST" onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
            <div className="space-y-2"><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Kilogramme" required /></div>
            <div className="space-y-2"><Label>Symbole</Label><Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="Ex: kg" required /></div>
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
