"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Trash2, Calculator, User, Wallet, Plus, ArrowLeft, ChevronDown } from "lucide-react"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth.store"
import { initializeFirebase } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { createSale } from "@/services/sale.service"
import { createCustomer } from "@/repositories/customer.repository"
import { InvoiceModal } from "@/components/shared/InvoiceModal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { doc, getDoc } from "firebase/firestore"
import type { Sale, Invoice, Customer } from "@/types"

export default function QuickPosPage() {
  const router = useRouter()
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)
  const tenantName = useAuthStore((s) => s.tenant?.name)

  const [amounts, setAmounts] = useState<number[]>([])
  const [inputValue, setInputValue] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WAVE' | 'OM' | 'DEBT'>('CASH')
  const [submitting, setSubmitting] = useState(false)
  const [customerQuery, setCustomerQuery] = useState("")
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone?: string }>>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedCustomerName, setSelectedCustomerName] = useState("")
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [amountPaid, setAmountPaid] = useState(0)
  const [showCustomerCreate, setShowCustomerCreate] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [newCustomerEmail, setNewCustomerEmail] = useState("")
  const [newCustomerAddress, setNewCustomerAddress] = useState("")
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [createdSale, setCreatedSale] = useState<Sale | null>(null)
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const total = useMemo(() => amounts.reduce((sum, a) => sum + a, 0), [amounts])

  useEffect(() => {
    if (!customerQuery.trim() || !tenantId) { setCustomers([]); return }
    const t = setTimeout(async () => {
      try {
        const { db } = await initializeFirebase()
        const snap = await getDocs(query(
          collection(db, 'customers'),
          where('tenantId', '==', tenantId),
          where('isDeleted', '==', false),
        ))
        const q = customerQuery.toLowerCase()
        const matches = snap.docs
          .map((d) => ({ id: d.id, name: d.data().name || '', phone: d.data().phone || '' }))
          .filter((c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
          .slice(0, 10)
        setCustomers(matches)
      } catch { setCustomers([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [customerQuery, tenantId])

  const addAmount = useCallback(() => {
    const val = Number(inputValue)
    if (val <= 0) return
    setAmounts((prev) => [...prev, val])
    setInputValue("")
  }, [inputValue])

  const removeAmount = useCallback((index: number) => {
    setAmounts((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearAll = useCallback(() => {
    setAmounts([])
    setInputValue("")
    setAmountPaid(0)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addAmount()
  }, [addAmount])

  const handlePay = useCallback(async () => {
    if (amounts.length === 0) { toast.error("Ajoutez au moins un montant"); return }
    if (!tenantId || !userId) { toast.error("Session expirée"); return }
    const paid = paymentMethod === 'DEBT' ? amountPaid : total

    setSubmitting(true)
    try {
      const result = await createSale({
        tenantId,
        userId,
        customerId: selectedCustomerId,
        items: [{
          productId: '__quick_pos__',
          qty: 1,
          unitPrice: total,
          productName: 'Quick POS',
        }],
        subtotal: total,
        discount: 0,
        tax: 0,
        total,
        paymentMethod,
        amountPaid: paid,
        skipStock: true,
      })
      const { db } = await initializeFirebase()
      const [saleSnap, invoiceSnap] = await Promise.all([
        getDoc(doc(db, 'sales', result.saleId)),
        getDoc(doc(db, 'invoices', result.invoiceId)),
      ])
      if (saleSnap.exists()) setCreatedSale({ id: result.saleId, ...saleSnap.data() } as Sale)
      if (invoiceSnap.exists()) setCreatedInvoice({ id: result.invoiceId, ...invoiceSnap.data() } as Invoice)
      if (selectedCustomerName) {
        setSelectedCustomer({ id: selectedCustomerId, name: selectedCustomerName, phone: selectedCustomerName, email: '', address: '', groupId: '', creditLimit: 0, totalDebt: 0, language: 'fr' })
      }
      setShowInvoiceModal(true)
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du paiement")
    } finally {
      setSubmitting(false)
    }
  }, [amounts, total, tenantId, userId, paymentMethod, amountPaid, selectedCustomerId, selectedCustomerName])

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/pos')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Quick POS
          </h1>
        </div>

        <Card className="flex-1">
          <CardContent className="p-6 space-y-4">
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="Saisir un montant..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-2xl h-14 font-bold text-right"
                autoFocus
              />
              <Button size="lg" onClick={addAmount} disabled={!inputValue || Number(inputValue) <= 0}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {amounts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Saisissez des montants et appuyez sur Entrée
                </p>
              ) : (
                amounts.map((amt, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                    <span className="text-sm font-medium">Montant {i + 1}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold tabular-nums">{formatXOF(amt)}</span>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => removeAmount(i)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {amounts.length > 0 && (
              <div className="flex justify-between items-center border-t pt-4">
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Tout effacer
                </Button>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{formatXOF(total)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="w-full lg:w-80 flex flex-col gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Client</span>
                {selectedCustomerName && (
                  <button className="text-xs text-destructive ml-auto" onClick={() => { setSelectedCustomerId(''); setSelectedCustomerName('') }}>
                    Retirer
                  </button>
                )}
              </div>
              {showCustomerSearch ? (
                <div className="relative">
                  <Input
                    placeholder="Rechercher un client..."
                    className="h-8 text-xs"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    autoFocus
                    onBlur={() => setTimeout(() => setShowCustomerSearch(false), 200)}
                  />
                  {customers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md mt-1 shadow-md max-h-40 overflow-y-auto">
                      {customers.map((c) => (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                          onMouseDown={() => { setSelectedCustomerId(c.id); setSelectedCustomerName(c.name); setShowCustomerSearch(false); setCustomerQuery('') }}
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.phone && <span className="text-muted-foreground ml-2">{c.phone}</span>}
                        </button>
                      ))}
                      <button
                        className="w-full text-left px-3 py-1.5 text-xs text-primary font-medium hover:bg-muted transition-colors border-t"
                        onMouseDown={() => { setShowCustomerSearch(false); setShowCustomerCreate(true); setNewCustomerName(''); setNewCustomerPhone(''); setNewCustomerEmail(''); setNewCustomerAddress('') }}
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-1" />
                        Créer un nouveau client
                      </button>
                    </div>
                  )}
                  {customers.length === 0 && (
                    <button
                      className="w-full text-left px-3 py-1.5 text-xs text-primary font-medium hover:bg-muted transition-colors"
                      onMouseDown={() => { setShowCustomerSearch(false); setShowCustomerCreate(true); setNewCustomerName(''); setNewCustomerPhone(''); setNewCustomerEmail(''); setNewCustomerAddress('') }}
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1" />
                      Créer un nouveau client
                    </button>
                  )}
                </div>
              ) : (
                <button
                  className="text-xs text-primary hover:underline w-full text-left"
                  onClick={() => setShowCustomerSearch(true)}
                >
                  {selectedCustomerName || 'Ajouter un client (optionnel)'}
                </button>
              )}

              <Dialog open={showCustomerCreate} onOpenChange={setShowCustomerCreate}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Nouveau client</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="qNewName">Nom *</Label>
                      <Input
                        id="qNewName"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="Nom du client"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="qNewPhone">Téléphone</Label>
                      <Input
                        id="qNewPhone"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        placeholder="+221 XX XXX XX XX"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="qNewEmail">Email</Label>
                      <Input
                        id="qNewEmail"
                        type="email"
                        value={newCustomerEmail}
                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                        placeholder="client@exemple.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="qNewAddress">Adresse</Label>
                      <Input
                        id="qNewAddress"
                        value={newCustomerAddress}
                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                        placeholder="Adresse"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <Button type="button" variant="outline" onClick={() => setShowCustomerCreate(false)}>
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        disabled={!newCustomerName.trim()}
                        onClick={async () => {
                          if (!tenantId || !userId) return
                          try {
                            const customerId = await createCustomer(
                              { name: newCustomerName.trim(), phone: newCustomerPhone.trim(), email: newCustomerEmail.trim(), address: newCustomerAddress.trim(), tenantId },
                              userId,
                            )
                            setSelectedCustomerId(customerId)
                            setSelectedCustomerName(newCustomerName.trim())
                            setShowCustomerCreate(false)
                            toast.success("Client créé avec succès")
                          } catch (err: any) {
                            toast.error(err?.message || "Erreur lors de la création du client")
                          }
                        }}
                      >
                        Créer
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Paiement</span>
              </div>
              <div className="flex gap-1">
                {(['CASH', 'WAVE', 'OM', 'DEBT'] as const).map((m) => (
                  <button
                    key={m}
                    className={cn(
                      "flex-1 text-xs h-8 rounded-md border transition-colors font-medium",
                      paymentMethod === m
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    )}
                    onClick={() => { setPaymentMethod(m); if (m !== 'DEBT') setAmountPaid(0) }}
                  >
                    {m === 'CASH' ? 'Espèces' : m === 'WAVE' ? 'Wave' : m === 'OM' ? 'Orange Money' : 'Dette'}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'DEBT' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Montant payé (acompte)</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Math.max(0, Number(e.target.value)))}
                  className="h-8 text-sm"
                  placeholder="0"
                />
                {amountPaid > 0 && amountPaid < total && (
                  <p className="text-xs text-muted-foreground">Reste à payer : {formatXOF(total - amountPaid)}</p>
                )}
                {amountPaid === 0 && (
                  <p className="text-xs text-muted-foreground">Cette vente sera enregistrée comme une dette</p>
                )}
              </div>
            )}

            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>Total</span>
              <span>{formatXOF(total)}</span>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={amounts.length === 0 || submitting}
              onClick={handlePay}
            >
              {submitting ? "Paiement en cours..." : paymentMethod === 'DEBT' ? 'Enregistrer la dette' : 'Payer'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <InvoiceModal
        open={showInvoiceModal}
        onOpenChange={(open) => { setShowInvoiceModal(open); if (!open) { clearAll(); setSelectedCustomerId(''); setSelectedCustomerName(''); router.push('/pos') }}}
        sale={createdSale}
        invoice={createdInvoice}
        customer={selectedCustomer}
        storeName={tenantName || 'Mon Magasin'}
        storeLogo={useAuthStore.getState().tenant?.logoUrl}
      />
    </div>
  )
}
