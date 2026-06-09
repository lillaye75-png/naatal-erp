"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingCart, Trash2, Plus, Minus, Search, Keyboard, Loader2, Maximize2, Minimize2, RefreshCw, Database, User, Wallet, ChevronDown } from "lucide-react"
import { formatXOF } from "@/lib/currency"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth.store"
import { useCartStore } from "@/stores/cart.store"
import { useOnSnapshot } from "@/hooks/useOnSnapshot"
import { useOfflineStore } from "@/stores/offline.store"
import { initializeFirebase } from "@/lib/firebase"
import { collection, query, where, getDocs, type Firestore } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { createSale } from "@/services/sale.service"
import { createCustomer } from "@/repositories/customer.repository"
import { InvoiceModal } from "@/components/shared/InvoiceModal"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { doc, getDoc } from "firebase/firestore"
import type { Product, Sale, Invoice, Customer } from "@/types"

const CACHE_PREFIX = 'naatal_products_cache_'
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000

function getCachedProducts(tenantId: string): { products: Product[]; cachedAt: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + tenantId)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { products: Product[]; cachedAt: string }
    const age = Date.now() - new Date(parsed.cachedAt).getTime()
    if (age > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_PREFIX + tenantId)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function setCachedProducts(tenantId: string, products: Product[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + tenantId, JSON.stringify({ products, cachedAt: new Date().toISOString() }))
  } catch { null }
}

export default function PosPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const userId = useAuthStore((s) => s.user?.id)
  const isOnline = useOfflineStore((s) => s.isOnline)
  const [barcode, setBarcode] = useState("")
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [db, setDb] = useState<Firestore | null>(null)
  const [cachedProducts, setCachedProductsState] = useState<Product[]>(() =>
    tenantId ? getCachedProducts(tenantId)?.products || [] : []
  )
  const [cacheInfo, setCacheInfo] = useState<{ count: number; cachedAt: string } | null>(() => {
    if (!tenantId) return null
    const cached = getCachedProducts(tenantId)
    return cached ? { count: cached.products.length, cachedAt: cached.cachedAt } : null
  })
  const [cacheLoading, setCacheLoading] = useState(false)
  const [customerQuery, setCustomerQuery] = useState("")
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone?: string }>>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedCustomerName, setSelectedCustomerName] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WAVE' | 'OM' | 'DEBT'>('CASH')
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [invoiceType, setInvoiceType] = useState<'INVOICE' | 'PROFORMA' | 'QUOTATION' | 'CREDIT_NOTE'>('INVOICE')
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [createdSale, setCreatedSale] = useState<Sale | null>(null)
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null)
  const [amountPaid, setAmountPaid] = useState(0)
  const [showCustomerCreate, setShowCustomerCreate] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [newCustomerEmail, setNewCustomerEmail] = useState("")
  const [newCustomerAddress, setNewCustomerAddress] = useState("")
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null)
  const [taxRate, setTaxRate] = useState(18)

  useEffect(() => {
    if (!tenantId) return
    initializeFirebase().then(({ db: d }) => setDb(d))
  }, [tenantId])

  useEffect(() => {
    if (!db || !tenantId) return
    getDocs(query(collection(db, 'settings'), where('tenantId', '==', tenantId)))
      .then((snap) => {
        const doc = snap.docs[0]
        if (doc) setTaxRate((doc.data() as any)?.taxRate ?? 18)
      })
      .catch(() => {})
  }, [db, tenantId])

  const productsQ = useMemo(
    () =>
      db && tenantId
        ? query(
            collection(db, 'products'),
            where('tenantId', '==', tenantId),
            where('isDeleted', '==', false),
          )
        : null,
    [db, tenantId],
  )

  const { data: products, loading, error: productsError } = useOnSnapshot<Product>(productsQ)

  useEffect(() => {
    if (products.length > 0 && tenantId) {
      setCachedProducts(tenantId, products)
      setCachedProductsState(products)
      setCacheInfo({ count: products.length, cachedAt: new Date().toISOString() })
    }
  }, [products, tenantId])

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

  const displayProducts = isOnline && products.length > 0 ? products : cachedProducts

  const handleRefreshCache = useCallback(async () => {
    if (!tenantId || !db) return
    setCacheLoading(true)
    try {
      const snap = await getDocs(
        query(collection(db, 'products'), where('tenantId', '==', tenantId), where('isDeleted', '==', false))
      )
      const allProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
      setCachedProducts(tenantId, allProducts)
      setCachedProductsState(allProducts)
      setCacheInfo({ count: allProducts.length, cachedAt: new Date().toISOString() })
      toast.success('Cache mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour du cache')
    } finally {
      setCacheLoading(false)
    }
  }, [tenantId, db])

  const items = useCartStore((s) => s.items)
  const addItemToStore = useCartStore((s) => s.addItem)
  const removeItemFromStore = useCartStore((s) => s.removeItem)
  const updateQtyInStore = useCartStore((s) => s.updateQty)
  const updatePriceInStore = useCartStore((s) => s.updatePrice)
  const clearCartInStore = useCartStore((s) => s.clearCart)

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const totalBeforeTax = Math.max(0, subtotal - discount)
  const computedTax = Math.round(totalBeforeTax * taxRate / 100)
  const total = totalBeforeTax + computedTax

  const addItem = useCallback((product: Product) => {
    addItemToStore({ productId: product.id, name: product.name, price: product.price, qty: 1, imageUrl: product.imageUrl })
  }, [addItemToStore])

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) removeItemFromStore(productId)
    else updateQtyInStore(productId, qty)
  }, [removeItemFromStore, updateQtyInStore])

  const removeItem = useCallback((productId: string) => {
    removeItemFromStore(productId)
  }, [removeItemFromStore])

  const clearCart = useCallback(() => {
    if (items.length > 0) {
      clearCartInStore()
      toast.info("Panier vidé")
    }
  }, [items.length, clearCartInStore])

  const handlePay = useCallback(async () => {
    if (items.length === 0) {
      toast.error("Panier vide")
      return
    }
    if (!tenantId || !userId) {
      toast.error("Session expirée")
      return
    }
    const paid = paymentMethod === 'DEBT' ? amountPaid : total
    try {
      const result = await createSale({
        tenantId,
        userId,
        customerId: selectedCustomerId,
        items: items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitPrice: i.price,
          productName: i.name,
        })),
        subtotal,
        discount,
        tax: computedTax,
        total,
        paymentMethod,
        amountPaid: paid,
        invoiceType,
      })
      if (result.saleId !== 'offline') {
        const { db } = await initializeFirebase()
        const [saleSnap, invoiceSnap, custSnap] = await Promise.all([
          getDoc(doc(db, 'sales', result.saleId)),
          getDoc(doc(db, 'invoices', result.invoiceId)),
          selectedCustomerId ? getDoc(doc(db, 'customers', selectedCustomerId)) : Promise.resolve(null),
        ])
        if (saleSnap.exists()) setCreatedSale({ id: result.saleId, ...saleSnap.data() } as Sale)
        if (invoiceSnap.exists()) setCreatedInvoice({ id: result.invoiceId, ...invoiceSnap.data() } as Invoice)
        if (custSnap?.exists()) setCreatedCustomer({ id: custSnap.id, ...custSnap.data() } as Customer)
        setShowInvoiceModal(true)
        clearCartInStore()
      } else {
        clearCartInStore()
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du paiement")
    }
  }, [items, subtotal, discount, computedTax, total, tenantId, userId, clearCartInStore, paymentMethod, amountPaid, selectedCustomerId, invoiceType])

  const handleBarcode = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcode.trim()) {
      const found = displayProducts.find(
        (p) => p.barcode === barcode.trim() || p.sku === barcode.trim() || p.id === barcode.trim()
      )
      if (found) {
        addItem(found)
        toast.success(`${found.name} ajouté`)
      } else {
        toast.error("Produit introuvable")
      }
      setBarcode("")
    }
  }, [barcode, displayProducts, addItem])

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      setFullscreen(true)
    } else {
      await document.exitFullscreen()
      setFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useKeyboardShortcuts([
    { key: 'F1', handler: () => handlePay(), enabled: true },
    { key: 'F2', handler: () => document.querySelector<HTMLInputElement>('[data-pos-search]')?.focus(), enabled: true },
    { key: 'F8', handler: () => clearCart(), enabled: true },
    { key: 'F11', handler: () => toggleFullscreen(), enabled: true },
    { key: 'F12', handler: () => setShowShortcuts((s) => !s), enabled: true },
    { key: 'Delete', ctrl: true, handler: () => clearCart(), enabled: true },
  ])

  return (
    <div className={cn(
      "flex flex-col lg:flex-row gap-4",
      fullscreen ? "h-screen p-4" : "h-[calc(100vh-8rem)]",
    )}>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-pos-search
              placeholder="Scanner ou chercher un produit..."
              className={cn("pl-9", fullscreen ? "h-14 text-xl" : "h-12 text-lg")}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcode}
              autoFocus
            />
          </div>
          <Button variant="outline" size="icon" className={cn("shrink-0", fullscreen ? "h-14 w-14" : "h-12 w-12")} onClick={() => setShowShortcuts(!showShortcuts)} title="Raccourcis (F12)">
            <Keyboard className={fullscreen ? "w-6 h-6" : "w-5 h-5"} />
          </Button>
          <Button variant="outline" size="icon" className={cn("shrink-0", fullscreen ? "h-14 w-14" : "h-12 w-12")} onClick={toggleFullscreen} title="Plein écran (F11)">
            {fullscreen ? <Minimize2 className={fullscreen ? "w-6 h-6" : "w-5 h-5"} /> : <Maximize2 className={fullscreen ? "w-6 h-6" : "w-5 h-5"} />}
          </Button>
          <Button variant="outline" size="icon" className={cn("shrink-0", fullscreen ? "h-14 w-14" : "h-12 w-12")} onClick={handleRefreshCache} disabled={cacheLoading} title="Actualiser le cache">
            <RefreshCw className={cn(cacheLoading ? "animate-spin" : "", fullscreen ? "w-6 h-6" : "w-5 h-5")} />
          </Button>
        </div>

        {cacheInfo && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 px-1">
            <Database className="w-3 h-3" />
            <span>{cacheInfo.count} produits en cache</span>
            <span className="text-muted-foreground/50">—</span>
            <span>Mis à jour le {new Date(cacheInfo.cachedAt).toLocaleString('fr-FR')}</span>
          </div>
        )}

        {showShortcuts && (
          <Card className="mb-3">
            <CardContent className="p-3 text-xs space-y-1">
              <p><kbd className="bg-muted px-1 rounded">F1</kbd> Payer</p>
              <p><kbd className="bg-muted px-1 rounded">F2</kbd> Rechercher</p>
              <p><kbd className="bg-muted px-1 rounded">F8</kbd> Vider le panier</p>
              <p><kbd className="bg-muted px-1 rounded">F11</kbd> Plein écran</p>
              <p><kbd className="bg-muted px-1 rounded">Ctrl+Suppr</kbd> Vider le panier</p>
              <p><kbd className="bg-muted px-1 rounded">F12</kbd> Masquer ce menu</p>
              <p><kbd className="bg-muted px-1 rounded">Entrée</kbd> Ajouter depuis le scan</p>
            </CardContent>
          </Card>
        )}

        {productsError && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <Database className="w-12 h-12 mb-3 text-destructive opacity-40" />
            <p className="text-destructive mb-4">Erreur de chargement des produits</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Réessayer
            </Button>
          </div>
        )}
        {loading && isOnline ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : productsError ? null : (
          <div className={cn(
            "flex-1 grid gap-3 overflow-y-auto p-1",
            fullscreen ? "grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          )}>
            {displayProducts.length === 0 && !loading && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Database className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Aucun produit trouvé</p>
                {!isOnline && <p className="text-xs mt-1">Connectez-vous à Internet pour charger les produits</p>}
              </div>
            )}
            {displayProducts.map((product) => (
              <Card key={product.id} className={cn(
                "cursor-pointer hover:border-primary transition-colors",
                fullscreen && "p-2",
              )} onClick={() => addItem(product)}>
                <CardContent className={cn(fullscreen ? "p-2" : "p-3") + " text-center"}>
                  <div className={cn(
                    "bg-muted rounded-lg mb-2 flex items-center justify-center text-muted-foreground text-xs",
                    fullscreen ? "w-full h-28" : "w-full h-20",
                  )}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : "Image"}
                  </div>
                  <p className={cn("font-medium truncate", fullscreen ? "text-base" : "text-sm")}>{product.name}</p>
                  <p className={cn("text-muted-foreground", fullscreen ? "text-sm" : "text-xs")}>{formatXOF(product.price)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className={cn(
        "flex flex-col bg-card rounded-xl border p-4",
        fullscreen ? "w-96" : "w-full lg:w-80",
      )}>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <ShoppingCart className="w-4 h-4" />
          Panier
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">{items.length} article(s)</span>
          )}
        </h2>
        <div className="flex-1 overflow-y-auto space-y-2">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <Input
                  type="number"
                  min={0}
                  value={item.price}
                  onChange={(e) => updatePriceInStore(item.productId, Math.max(0, Number(e.target.value)))}
                  className="h-6 text-xs w-20 mt-1"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => updateQty(item.productId, item.qty - 1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-sm w-6 text-center font-medium">{item.qty}</span>
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => updateQty(item.productId, item.qty + 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive shrink-0" onClick={() => removeItem(item.productId)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">Panier vide</div>
          )}
        </div>
        <div className="border-t pt-3 mt-3 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-muted-foreground" />
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
                      <Plus className="w-3 h-3 inline mr-1" />
                      Créer un nouveau client
                    </button>
                  </div>
                )}
                {customers.length === 0 && (
                  <button
                    className="w-full text-left px-3 py-1.5 text-xs text-primary font-medium hover:bg-muted transition-colors"
                    onMouseDown={() => { setShowCustomerSearch(false); setShowCustomerCreate(true); setNewCustomerName(''); setNewCustomerPhone(''); setNewCustomerEmail(''); setNewCustomerAddress('') }}
                  >
                    <Plus className="w-3 h-3 inline mr-1" />
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
                    <Label htmlFor="posNewName">Nom *</Label>
                    <Input
                      id="posNewName"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Nom du client"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="posNewPhone">Téléphone</Label>
                    <Input
                      id="posNewPhone"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="+221 XX XXX XX XX"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="posNewEmail">Email</Label>
                    <Input
                      id="posNewEmail"
                      type="email"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      placeholder="client@exemple.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="posNewAddress">Adresse</Label>
                    <Input
                      id="posNewAddress"
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
              <Wallet className="w-3 h-3 text-muted-foreground" />
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

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type de facture</Label>
            <div className="flex gap-1">
              {(['INVOICE', 'PROFORMA', 'QUOTATION', 'CREDIT_NOTE'] as const).map((t) => (
                <button
                  key={t}
                  className={cn(
                    "flex-1 text-xs h-7 rounded-md border transition-colors",
                    invoiceType === t
                      ? 'bg-primary/10 text-primary border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  )}
                  onClick={() => setInvoiceType(t)}
                >
                  {t === 'INVOICE' ? 'Facture' : t === 'PROFORMA' ? 'Proforma' : t === 'QUOTATION' ? 'Devis' : 'Avoir'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Remise (FCFA)</Label>
            <Input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
              className="h-7 w-24 text-xs text-right"
            />
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

          <div className="space-y-1 border-t pt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sous-total</span>
              <span>{formatXOF(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Remise</span>
                <span>-{formatXOF(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>TVA ({taxRate}%)</span>
              <span>{formatXOF(computedTax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-1">
              <span>Total</span>
              <span>{formatXOF(total)}</span>
            </div>
          </div>

          <Button className="w-full" size="lg" disabled={items.length === 0} onClick={handlePay}>
            {paymentMethod === 'DEBT' ? 'Enregistrer la dette' : 'Payer'}
          </Button>
        </div>
      </div>
      <InvoiceModal
        open={showInvoiceModal}
        onOpenChange={(open) => { setShowInvoiceModal(open); if (!open) { clearCartInStore(); setDiscount(0); setAmountPaid(0); setInvoiceType('INVOICE') } }}
        sale={createdSale}
        invoice={createdInvoice}
        customer={createdCustomer}
        storeName={useAuthStore.getState().tenant?.name || 'Mon Magasin'}
        storeLogo={useAuthStore.getState().tenant?.logoUrl}
      />
    </div>
  )
}
