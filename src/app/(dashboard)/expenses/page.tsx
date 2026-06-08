"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { Plus, Edit, Trash2, Receipt, TrendingDown } from "lucide-react"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"
import type { Expense } from "@/types"

const CATEGORIES = [
  'Loyer', 'Électricité', 'Eau', 'Salaire', 'Transport',
  'Fournitures', 'Entretien', 'Marketing', 'Impôts', 'Autre',
]

export default function ExpensesPage() {
  const { user, tenant } = useAuthStore()
  const tenantId = tenant?.id
  const userId = user?.id

  const [expenses, setExpenses] = useState<(Expense & { id: string })[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<(Expense & { id: string }) | null>(null)
  const [form, setForm] = useState({ category: CATEGORIES[0], amount: 0, description: '', date: new Date().toISOString().split('T')[0] })

  const fetch = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(collection(db, 'expenses'), where('tenantId', '==', tenantId)))
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)))
    } catch (err) { setError(err instanceof Error ? err.message : 'Une erreur est survenue'); toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  const handleSave = async () => {
    if (!tenantId || !userId) return
    try {
      const { db } = await initializeFirebase()
      const now = Timestamp.now().toMillis().toString()
      if (editItem) {
        await updateDoc(doc(db, 'expenses', editItem.id), { ...form, updatedAt: now, updatedBy: userId })
        toast.success('Dépense modifiée')
      } else {
        await addDoc(collection(db, 'expenses'), { ...form, tenantId, createdAt: now, updatedAt: now, createdBy: userId, updatedBy: userId, isDeleted: false, status: 'ACTIVE' })
        toast.success('Dépense créée')
      }
      setOpen(false); setEditItem(null); setForm({ category: CATEGORIES[0], amount: 0, description: '', date: new Date().toISOString().split('T')[0] })
      fetch()
    } catch { toast.error('Erreur') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return
    try {
      const { db } = await initializeFirebase()
      await deleteDoc(doc(db, 'expenses', id))
      toast.success('Dépense supprimée')
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
        <div>
          <h1 className="text-2xl font-semibold">Dépenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Suivez vos dépenses d'exploitation</p>
        </div>
        <Button onClick={() => { setEditItem(null); setForm({ category: CATEGORIES[0], amount: 0, description: '', date: new Date().toISOString().split('T')[0] }); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Nouvelle dépense
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <TrendingDown className="w-4 h-4" />
            Total des dépenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-destructive">{formatXOF(totalExpenses)}</p>
          <p className="text-xs text-muted-foreground mt-1">{expenses.length} dépense(s)</p>
        </CardContent>
      </Card>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Catégorie</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Description</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Montant</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Date</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{e.category}</td>
                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{e.description}</td>
                <td className="p-3 text-sm text-right font-medium text-destructive">{formatXOF(e.amount)}</td>
                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditItem(e); setForm({ category: e.category, amount: e.amount, description: e.description, date: e.date }); setOpen(true) }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground"><Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Aucune dépense</p></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Modifier' : 'Nouvelle'} dépense</DialogTitle></DialogHeader>
          <form method="POST" onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant (FCFA)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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
