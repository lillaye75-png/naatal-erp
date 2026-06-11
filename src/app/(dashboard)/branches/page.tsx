"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { Plus, Edit, Building2, Check, X } from "lucide-react"
import { toast } from "sonner"
import type { Branch } from "@/types"

export default function BranchesPage() {
  const { user, tenant } = useAuthStore()
  const tenantId = tenant?.id
  const userId = user?.id

  const [items, setItems] = useState<Branch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<Branch | null>(null)
  const [form, setForm] = useState({ name: '', location: '', phone: '', isPrimary: false })

  const fetch = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(collection(db, 'branches'), where('tenantId', '==', tenantId)))
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Branch)))
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
        await updateDoc(doc(db, 'branches', editItem.id), { ...form, updatedAt: now, updatedBy: userId })
        toast.success('Branche modifiée')
      } else {
        await addDoc(collection(db, 'branches'), { ...form, tenantId, createdAt: now, updatedAt: now, createdBy: userId, updatedBy: userId, isDeleted: false, status: 'ACTIVE' })
        toast.success('Branche créée')
      }
      setOpen(false); setEditItem(null); setForm({ name: '', location: '', phone: '', isPrimary: false }); fetch()
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
        <div><h1 className="text-2xl font-semibold">Branches</h1><p className="text-sm text-muted-foreground mt-1">Gérez vos points de vente</p></div>
        <Button onClick={() => { setEditItem(null); setForm({ name: '', location: '', phone: '', isPrimary: false }); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nouvelle branche
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Nom</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Emplacement</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Téléphone</th>
              <th className="text-center p-3 text-xs font-medium text-muted-foreground">Principale</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{b.name}</td>
                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{b.location}</td>
                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{b.phone}</td>
                <td className="p-3 text-center">{b.isPrimary ? <Check className="w-4 h-4 mx-auto text-success" /> : <X className="w-4 h-4 mx-auto text-muted-foreground" />}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditItem(b); setForm({ name: b.name, location: b.location, phone: b.phone, isPrimary: b.isPrimary }); setOpen(true) }}>
                    <Edit className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground"><Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Aucune branche</p></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Modifier' : 'Nouvelle'} branche</DialogTitle></DialogHeader>
          <form method="POST" onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
            <div className="space-y-2"><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Emplacement</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} className="rounded" />
              Branche principale
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
