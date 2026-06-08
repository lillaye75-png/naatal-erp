"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  description: string
  tenantId: string
  createdAt: string
  isDeleted: boolean
}

export default function CategoriesPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenantId
  const userId = user?.id

  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const fetchCategories = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(
        query(collection(db, 'categories'), where('tenantId', '==', tenantId), where('isDeleted', '==', false)),
      )
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleSave = async () => {
    if (!tenantId || !userId) return
    try {
      const { db } = await initializeFirebase()
      const now = Timestamp.now().toMillis().toString()
      if (editItem) {
        await updateDoc(doc(db, 'categories', editItem.id), {
          name: form.name,
          description: form.description,
          updatedAt: now,
          updatedBy: userId,
        })
        toast.success('Catégorie modifiée')
      } else {
        await addDoc(collection(db, 'categories'), {
          name: form.name,
          description: form.description,
          tenantId,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
          isDeleted: false,
        })
        toast.success('Catégorie créée')
      }
      setOpen(false)
      setEditItem(null)
      setForm({ name: '', description: '' })
      fetchCategories()
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return
    try {
      const { db } = await initializeFirebase()
      await updateDoc(doc(db, 'categories', id), { isDeleted: true, updatedAt: Timestamp.now().toMillis().toString(), updatedBy: userId })
      toast.success('Catégorie supprimée')
      fetchCategories()
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const openEdit = (cat: Category) => {
    setEditItem(cat)
    setForm({ name: cat.name, description: cat.description })
    setOpen(true)
  }

  if (loading) return <p className="p-6 text-muted-foreground">Chargement...</p>
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); fetchCategories() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catégories</h1>
        <Button onClick={() => { setEditItem(null); setForm({ name: '', description: '' }); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nouvelle catégorie
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Nom</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.filter((c) => !c.isDeleted).map((cat) => (
              <tr key={cat.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{cat.name}</td>
                <td className="p-3 text-sm">{cat.description}</td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(cat)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(cat.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.filter((c) => !c.isDeleted).length === 0 && (
              <tr>
                <td colSpan={3} className="p-12 text-center text-muted-foreground">Aucune catégorie</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Modifier' : 'Nouvelle'} catégorie</DialogTitle>
            <DialogDescription>Créez ou modifiez une catégorie de produit</DialogDescription>
          </DialogHeader>
          <form method="POST" onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
