"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { Plus, Edit, Trash2, Play, ToggleLeft, ToggleRight, RefreshCw, Repeat } from "lucide-react"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"
import type { RecurringTransaction, Customer } from "@/types"
import { createRecurring, updateRecurring, deleteRecurring, generateNow } from "@/services/recurring.service"

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const
const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Quotidien',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
  YEARLY: 'Annuel',
}
const CATEGORIES = [
  'Loyer', 'Électricité', 'Eau', 'Salaire', 'Transport',
  'Fournitures', 'Entretien', 'Marketing', 'Impôts', 'Autre',
]

function getNextDue(item: RecurringTransaction): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(parseInt(item.startDate, 10))
  if (today < start) return start.toLocaleDateString('fr-FR')
  if (item.endDate) {
    const end = new Date(parseInt(item.endDate, 10))
    if (today > end) return 'Terminé'
  }

  let next = new Date(today)
  switch (item.frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1)
      break
    case 'WEEKLY': {
      if (item.dayOfWeek === undefined) return '-'
      const diff = (item.dayOfWeek - next.getDay() + 7) % 7
      next.setDate(next.getDate() + diff)
      if (next <= today) next.setDate(next.getDate() + 7)
      break
    }
    case 'MONTHLY': {
      if (!item.dayOfMonth) return '-'
      next.setDate(item.dayOfMonth)
      if (next <= today) next.setMonth(next.getMonth() + 1)
      break
    }
    case 'YEARLY': {
      if (!item.dayOfMonth || !item.month) return '-'
      next.setFullYear(today.getFullYear(), item.month - 1, item.dayOfMonth)
      if (next <= today) next.setFullYear(next.getFullYear() + 1)
      break
    }
  }

  if (item.endDate) {
    const end = new Date(parseInt(item.endDate, 10))
    if (next > end) return 'Terminé'
  }
  return next.toLocaleDateString('fr-FR')
}

export default function RecurringPage() {
  const { user, tenant } = useAuthStore()
  const tenantId = tenant?.id
  const userId = user?.id

  const [items, setItems] = useState<(RecurringTransaction & { id: string })[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<(RecurringTransaction & { id: string }) | null>(null)
  const [form, setForm] = useState<{
    type: 'INVOICE' | 'EXPENSE'
    title: string
    description: string
    amount: number
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
    dayOfMonth: number
    dayOfWeek: number
    month: number
    startDate: string
    endDate: string
    categoryId: string
    customerId: string
  }>({
    type: 'EXPENSE',
    title: '',
    description: '',
    amount: 0,
    frequency: 'MONTHLY',
    dayOfMonth: 1,
    dayOfWeek: 0,
    month: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    categoryId: CATEGORIES[0],
    customerId: '',
  })

  const fetchCustomers = useCallback(async () => {
    if (!tenantId) return
    const { db } = await initializeFirebase()
    const snap = await getDocs(query(collection(db, 'customers'), where('tenantId', '==', tenantId)))
    setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)))
  }, [tenantId])

  const fetch = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(
        query(collection(db, 'recurring_transactions'), where('tenantId', '==', tenantId), where('isDeleted', '==', false)),
      )
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)))
    } catch (err) { setError(err instanceof Error ? err.message : 'Une erreur est survenue'); toast.error('Erreur de chargement') }
    finally { setLoading(false) }
  }, [tenantId])

  useEffect(() => { fetch(); fetchCustomers() }, [fetch, fetchCustomers])

  const resetForm = () => {
    setForm({
      type: 'EXPENSE',
      title: '',
      description: '',
      amount: 0,
      frequency: 'MONTHLY',
      dayOfMonth: 1,
      dayOfWeek: 0,
      month: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      categoryId: CATEGORIES[0],
      customerId: '',
    })
  }

  const handleSave = async () => {
    if (!tenantId || !userId) return
    try {
      const nowMillis = Timestamp.now().toMillis().toString()
      const data = {
        ...form,
        startDate: new Date(form.startDate).getTime().toString(),
        endDate: form.endDate ? new Date(form.endDate).getTime().toString() : undefined,
        dayOfMonth: form.frequency === 'MONTHLY' || form.frequency === 'YEARLY' ? form.dayOfMonth : undefined,
        dayOfWeek: form.frequency === 'WEEKLY' ? form.dayOfWeek : undefined,
        month: form.frequency === 'YEARLY' ? form.month : undefined,
        tenantId,
        isActive: true,
        lastGenerated: undefined,
      } as any

      if (editItem) {
        await updateRecurring(editItem.id, data, userId)
        toast.success('Transaction récurrente modifiée')
      } else {
        await createRecurring(data, userId)
        toast.success('Transaction récurrente créée')
      }
      setOpen(false); setEditItem(null); resetForm(); fetch()
    } catch { toast.error('Erreur') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette transaction récurrente ?')) return
    if (!userId) return
    try {
      await deleteRecurring(id, userId)
      toast.success('Transaction récurrente supprimée')
      fetch()
    } catch { toast.error('Erreur') }
  }

  const handleToggleActive = async (item: RecurringTransaction & { id: string }) => {
    if (!userId) return
    try {
      await updateRecurring(item.id, { isActive: !item.isActive }, userId)
      toast.success(item.isActive ? 'Désactivée' : 'Activée')
      fetch()
    } catch { toast.error('Erreur') }
  }

  const handleGenerateNow = async (item: RecurringTransaction & { id: string }) => {
    try {
      await generateNow(item)
      toast.success('Instance créée')
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
          <h1 className="text-2xl font-semibold">Transactions récurrentes</h1>
          <p className="text-sm text-muted-foreground mt-1">Automatisez vos factures et dépenses récurrentes</p>
        </div>
        <Button onClick={() => { setEditItem(null); resetForm(); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Titre</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Montant</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Fréquence</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Prochaine échéance</th>
              <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{item.title}</td>
                <td className="p-3 text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.type === 'INVOICE' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {item.type === 'INVOICE' ? 'Facture' : 'Dépense'}
                  </span>
                </td>
                <td className="p-3 text-sm text-right font-medium">{formatXOF(item.amount)}</td>
                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{FREQ_LABELS[item.frequency] || item.frequency}</td>
                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{getNextDue(item)}</td>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="w-7 h-7" title="Générer maintenant" onClick={() => handleGenerateNow(item)}>
                      <Play className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7" title={item.isActive ? 'Désactiver' : 'Activer'} onClick={() => handleToggleActive(item)}>
                      {item.isActive ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => {
                      setEditItem(item)
                      setForm({
                        type: item.type,
                        title: item.title,
                        description: item.description || '',
                        amount: item.amount,
                        frequency: item.frequency,
                        dayOfMonth: item.dayOfMonth || 1,
                        dayOfWeek: item.dayOfWeek || 0,
                        month: item.month || 1,
                        startDate: new Date(parseInt(item.startDate, 10)).toISOString().split('T')[0],
                        endDate: item.endDate ? new Date(parseInt(item.endDate, 10)).toISOString().split('T')[0] : '',
                        categoryId: item.categoryId || CATEGORIES[0],
                        customerId: item.customerId || '',
                      })
                      setOpen(true)
                    }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="p-12 text-center text-muted-foreground"><Repeat className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Aucune transaction récurrente</p></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? 'Modifier' : 'Nouvelle'} transaction récurrente</DialogTitle></DialogHeader>
          <form method="POST" onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as 'INVOICE' | 'EXPENSE' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Dépense</SelectItem>
                  <SelectItem value="INVOICE">Facture</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Montant (FCFA)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} required />
            </div>
            <div className="space-y-2">
              <Label>Fréquence</Label>
              <Select value={form.frequency} onValueChange={(v) => v && setForm({ ...form, frequency: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{FREQ_LABELS[f]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {(form.frequency === 'WEEKLY') && (
              <div className="space-y-2">
                <Label>Jour de la semaine</Label>
                <Select value={String(form.dayOfWeek)} onValueChange={(v) => setForm({ ...form, dayOfWeek: parseInt(v || '0') })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Dimanche</SelectItem>
                    <SelectItem value="1">Lundi</SelectItem>
                    <SelectItem value="2">Mardi</SelectItem>
                    <SelectItem value="3">Mercredi</SelectItem>
                    <SelectItem value="4">Jeudi</SelectItem>
                    <SelectItem value="5">Vendredi</SelectItem>
                    <SelectItem value="6">Samedi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(form.frequency === 'MONTHLY' || form.frequency === 'YEARLY') && (
              <div className="space-y-2">
                <Label>Jour du mois</Label>
                <Input type="number" min={1} max={31} value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: parseInt(e.target.value) || 1 })} />
              </div>
            )}

            {form.frequency === 'YEARLY' && (
              <div className="space-y-2">
                <Label>Mois</Label>
                <Select value={String(form.month)} onValueChange={(v) => setForm({ ...form, month: parseInt(v || '1') })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {new Date(0, i).toLocaleDateString('fr-FR', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Date de fin (optionnelle)</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>

            {form.type === 'EXPENSE' && (
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={form.categoryId} onValueChange={(v) => v && setForm({ ...form, categoryId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.type === 'INVOICE' && (
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v || '' })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun client</SelectItem>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

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
