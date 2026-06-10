"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ShoppingCart, Plus, Minus, Loader2, Store, Phone, X, ShoppingBag, Package, ClipboardList, MapPin } from "lucide-react"
import { formatXOF } from "@/lib/currency"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import { toast } from "sonner"
import { useParams, useSearchParams } from "next/navigation"

interface StoreProduct {
  id: string
  name: string
  price: number
  imageUrl: string
  description: string
  tenantId: string
  isSoldOnline?: boolean
}

interface StorefrontData {
  id: string
  name: string
  slug: string
  phone: string
  tenantId: string
  theme: string
  isActive: boolean
}

interface CartItem {
  productId: string
  name: string
  price: number
  qty: number
}

export default function StorefrontPage() {
  const params = useParams()
  const slug = params?.slug as string
  const searchParams = useSearchParams()
  const trackId = searchParams?.get('track')

  const [store, setStore] = useState<StorefrontData | null>(null)
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [stocks, setStocks] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null)
  const [cartOpen, setCartOpen] = useState(false)

  // Customer info state
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [showCustomerForm, setShowCustomerForm] = useState(false)

  // Track order state
  const [trackDialogOpen, setTrackDialogOpen] = useState(false)
  const [trackName, setTrackName] = useState("")
  const [trackPhone, setTrackPhone] = useState("")
  const [trackUuid, setTrackUuid] = useState("")
  const [trackResult, setTrackResult] = useState<any | null>(null)
  const [trackSearching, setTrackSearching] = useState(false)

  // Order confirmation popup
  const [orderConfirmation, setOrderConfirmation] = useState<any | null>(null)

  useEffect(() => {
    if (!trackId || !store) return
    initializeFirebase().then(async ({ db }) => {
      const snap = await getDocs(query(
        collection(db, 'orders'),
        where('trackingId', '==', trackId),
        where('tenantId', '==', store.tenantId),
      ))
      if (!snap.empty) setTrackedOrder({ id: snap.docs[0].id, ...snap.docs[0].data() })
    }).catch(() => {})
  }, [trackId, store])

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const { db } = await initializeFirebase()

        const sfSnap = await getDocs(query(
          collection(db, 'storefronts'),
          where('slug', '==', slug),
          where('isActive', '==', true),
        ))

        if (sfSnap.empty || cancelled) {
          if (!cancelled) setNotFound(true)
          return
        }

        const sfDoc = sfSnap.docs[0]
        const sfData = { id: sfDoc.id, ...sfDoc.data() } as StorefrontData
        if (cancelled) return
        setStore(sfData)

        const prodSnap = await getDocs(query(
          collection(db, 'products'),
          where('tenantId', '==', sfData.tenantId),
          where('isDeleted', '==', false),
        ))
        if (!cancelled) {
          let productsData = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as StoreProduct))
          productsData = productsData.filter((p) => (p as any).isSoldOnline !== false)
          setProducts(productsData)

          try {
            const stockMap: Record<string, number | null> = {}
            const ids = productsData.map((p) => p.id)
            for (let i = 0; i < ids.length; i += 30) {
              const chunk = ids.slice(i, i + 30)
              const movSnap = await getDocs(
                query(collection(db, 'inventory_movements'), where('productId', 'in', chunk), where('tenantId', '==', sfData.tenantId)),
              )
              const grouped: Record<string, number> = {}
              movSnap.docs.forEach((d) => {
                const pid = d.data().productId
                grouped[pid] = (grouped[pid] || 0) + (d.data().qty || 0)
              })
              chunk.forEach((pid) => { stockMap[pid] = grouped[pid] ?? null })
            }
            if (!cancelled) setStocks(stockMap)
          } catch {}
        }
      } catch (err) {
        console.error('Error loading storefront:', err)
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [slug])

  const addToCart = useCallback((product: StoreProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1 }]
    })
    toast.success(`${product.name} ajouté au panier`)
  }, [])

  const updateQty = useCallback((productId: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((i) => i.productId !== productId)
      return prev.map((i) => i.productId === productId ? { ...i, qty } : i)
    })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)

  const openCustomerForm = () => {
    if (cart.length === 0) { toast.error("Panier vide"); return }
    setShowCustomerForm(true)
  }

  const handlePlaceOrder = useCallback(async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Veuillez saisir votre nom et téléphone")
      return
    }
    if (cart.length === 0) return
    if (!store?.tenantId) {
      toast.error('Boutique non configurée')
      return
    }

    let trackingId = ''
    let savedOrder: any = null
    try {
      const { db } = await initializeFirebase()
      const orderRef = doc(collection(db, 'orders'))
      trackingId = orderRef.id.slice(-8).toUpperCase()
      const orderData = {
        id: orderRef.id,
        trackingId,
        storefrontId: store.id,
        tenantId: store.tenantId,
        items: cart.map((i) => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })),
        total: cartTotal,
        status: 'CONFIRMED',
        customerPhone: customerPhone.trim(),
        customerName: customerName.trim(),
        source: 'storefront',
        paymentMethod: 'CASH',
        createdAt: Timestamp.now().toMillis().toString(),
        updatedAt: Timestamp.now().toMillis().toString(),
      }
      await setDoc(orderRef, orderData)
      savedOrder = orderData
    } catch (err) {
      console.error('Error saving order:', err)
      toast.error("Erreur lors de l'enregistrement de la commande")
      return
    }

    const trackingUrl = `${window.location.origin}/store/${slug}?track=${trackingId}`
    const lines = cart.map((i) => `- ${i.name} x${i.qty} = ${formatXOF(i.price * i.qty)}`)
    const message = [
      `🛍️ *Nouvelle commande*`,
      `Boutique: ${store?.name || 'Boutique'}`,
      `Client: ${customerName.trim()} - ${customerPhone.trim()}`,
      '',
      ...lines,
      '',
      `Total: ${formatXOF(cartTotal)}`,
      '',
      `🔍 Suivi: ${trackingId}`,
      `📎 ${trackingUrl}`,
      '',
      'Merci !',
    ].join('\n')

    const phone = store?.phone || ''
    if (!phone) {
      toast.error('Numéro de téléphone non configuré')
      return
    }
    const url = buildWhatsAppUrl(phone, message)
    window.open(url, '_blank')
    setShowCustomerForm(false)
    setOrderConfirmation(savedOrder)
    setCart([])
  }, [cart, cartTotal, store, slug, customerName, customerPhone])

  const handleTrackOrder = useCallback(async () => {
    if (!trackName.trim() || !trackPhone.trim() || !trackUuid.trim()) {
      toast.error("Veuillez remplir tous les champs de suivi")
      return
    }
    if (!store?.tenantId) return
    setTrackSearching(true)
    setTrackResult(null)
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(
        collection(db, 'orders'),
        where('trackingId', '==', trackUuid.trim().toUpperCase()),
        where('tenantId', '==', store.tenantId),
      ))
      if (snap.empty) {
        setTrackResult({ notFound: true })
      } else {
        const order = { id: snap.docs[0].id, ...snap.docs[0].data() } as any
        if (order.customerName?.toLowerCase() === trackName.trim().toLowerCase() &&
            order.customerPhone === trackPhone.trim()) {
          setTrackResult(order)
        } else {
          setTrackResult({ notFound: true })
        }
      }
    } catch (err) {
      console.error('Track error:', err)
      toast.error("Erreur lors du suivi")
    } finally {
      setTrackSearching(false)
    }
  }, [trackName, trackPhone, trackUuid, store])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Chargement de la boutique...</p>
        </div>
      </div>
    )
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Store className="w-16 h-16 mx-auto text-muted-foreground/40" />
          <h1 className="text-xl font-semibold mt-4">Boutique introuvable</h1>
          <p className="text-sm text-muted-foreground mt-1">Cette boutique n'existe pas ou est inactive</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {trackedOrder && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-bold">
                {trackedOrder.trackingId}
              </div>
              <span className="font-medium text-sm">{formatXOF(trackedOrder.total || 0)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              {['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'].map((step, i) => {
                const statuses = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED']
                const currentIdx = statuses.indexOf(trackedOrder.status)
                const isPast = i <= currentIdx
                const isCancelled = trackedOrder.status === 'CANCELLED'
                return (
                  <div key={step} className="flex items-center gap-1 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCancelled ? 'bg-destructive/20 text-destructive' :
                      isPast ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isCancelled && step === statuses[currentIdx] ? '✕' : isPast ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] ${isPast ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {step === 'CONFIRMED' ? 'Confirmée' :
                       step === 'PREPARING' ? 'Préparation' :
                       step === 'SHIPPED' ? 'Expédiée' : 'Livrée'}
                    </span>
                    {i < 3 && <div className={`flex-1 h-0.5 ${isPast && !isCancelled ? 'bg-primary' : 'bg-muted'}`} />}
                  </div>
                )
              })}
            </div>
            {trackedOrder.status === 'CANCELLED' && (
              <p className="text-xs text-destructive mt-3">Cette commande a été annulée</p>
            )}
          </div>
        </div>
      )}

      <header className="border-b bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{store.name}</h1>
            <p className="text-xs text-muted-foreground">Boutique en ligne</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTrackDialogOpen(true)}>
              <MapPin className="w-3.5 h-3.5 mr-1" />
              Suivre
            </Button>
            {!trackedOrder && (
              <Button size="sm" onClick={() => setCartOpen(true)} className="relative">
                <ShoppingBag className="w-4 h-4 mr-1" />
                Panier
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Floating cart button */}
      {!trackedOrder && cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-background">
            {cart.length}
          </span>
        </button>
      )}

      {/* Cart drawer/sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-sm bg-background h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Panier ({cart.length})</h2>
              <button onClick={() => setCartOpen(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Votre panier est vide</p>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatXOF(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1 hover:bg-muted rounded" onClick={() => updateQty(item.productId, item.qty - 1)}>
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                      <button className="p-1 hover:bg-muted rounded" onClick={() => updateQty(item.productId, item.qty + 1)}>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatXOF(item.price * item.qty)}</p>
                      <button className="text-xs text-destructive hover:underline" onClick={() => removeFromCart(item.productId)}>
                        Retirer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t p-4 space-y-3">
                <button
                  className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mb-2"
                  onClick={() => { setCartOpen(false); setTrackDialogOpen(true) }}
                >
                  <MapPin className="w-3 h-3" />
                  Suivre une commande existante
                </button>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatXOF(cartTotal)}</span>
                </div>
                <Button className="w-full" onClick={() => { setCartOpen(false); openCustomerForm() }}>
                  <Phone className="w-4 h-4 mr-2" />
                  Commander
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer info form dialog */}
      <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Vos coordonnées
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <p className="font-medium">Récapitulatif de la commande</p>
              {cart.map((item) => (
                <div key={item.productId} className="flex justify-between text-muted-foreground">
                  <span>{item.name} x{item.qty}</span>
                  <span>{formatXOF(item.price * item.qty)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-1 border-t mt-1">
                <span>Total</span>
                <span>{formatXOF(cartTotal)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nom complet *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Votre nom" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone *</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="77 123 45 67" type="tel" />
            </div>
            <Button className="w-full" onClick={handlePlaceOrder}>
              <Phone className="w-4 h-4 mr-2" />
              Confirmer et commander via WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order confirmation popup */}
      <Dialog open={!!orderConfirmation} onOpenChange={(o) => { if (!o) setOrderConfirmation(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Package className="w-4 h-4" />
              Commande confirmée !
            </DialogTitle>
          </DialogHeader>
          {orderConfirmation && (
            <div className="space-y-4">
              <div className="bg-success/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold tracking-wider text-success">{orderConfirmation.trackingId}</p>
                <p className="text-xs text-muted-foreground mt-1">Code de suivi</p>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Client :</span> <span className="font-medium">{orderConfirmation.customerName}</span></p>
                <p><span className="text-muted-foreground">Téléphone :</span> {orderConfirmation.customerPhone}</p>
                <p><span className="text-muted-foreground">Total :</span> <span className="font-semibold">{formatXOF(orderConfirmation.total)}</span></p>
              </div>
              <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                <p>Vous allez être redirigé vers WhatsApp pour finaliser votre commande.</p>
                <p className="mt-1">Utilisez le code <strong>{orderConfirmation.trackingId}</strong> pour suivre votre commande.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setOrderConfirmation(null) }}>
                Fermer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Track order dialog */}
      <Dialog open={trackDialogOpen} onOpenChange={(o) => { if (!o) { setTrackDialogOpen(false); setTrackResult(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Suivre ma commande
            </DialogTitle>
          </DialogHeader>
          {trackResult ? (
            trackResult.notFound ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-medium">Commande introuvable</p>
                  <p className="text-sm text-muted-foreground">Vérifiez vos informations et réessayez</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setTrackResult(null)}>Réessayer</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold tracking-wider">{trackResult.trackingId}</p>
                  <p className="text-xs text-muted-foreground mt-1">Code de suivi</p>
                </div>
                <div className="flex items-center justify-between gap-1 text-xs">
                  {['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'].map((step, i) => {
                    const statuses = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED']
                    const currentIdx = statuses.indexOf(trackResult.status)
                    const isPast = i <= currentIdx
                    return (
                      <div key={step} className="flex flex-col items-center gap-1 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isPast ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>{isPast ? '✓' : i + 1}</div>
                        <span className={`${isPast ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {step === 'CONFIRMED' ? 'Confirmée' : step === 'PREPARING' ? 'Prépa.' : step === 'SHIPPED' ? 'Expédiée' : 'Livrée'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><span className="font-medium text-foreground">Client :</span> {trackResult.customerName}</p>
                  <p><span className="font-medium text-foreground">Total :</span> {formatXOF(trackResult.total || 0)}</p>
                  {trackResult.status === 'CANCELLED' && <p className="text-destructive font-medium">Cette commande a été annulée</p>}
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setTrackDialogOpen(false); setTrackResult(null) }}>Fermer</Button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom complet *</Label>
                <Input value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="Votre nom" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone *</Label>
                <Input value={trackPhone} onChange={(e) => setTrackPhone(e.target.value)} placeholder="77 123 45 67" type="tel" />
              </div>
              <div className="space-y-2">
                <Label>Code de suivi *</Label>
                <Input value={trackUuid} onChange={(e) => setTrackUuid(e.target.value)} placeholder="Ex: A1B2C3D4" />
              </div>
              <Button className="w-full" onClick={handleTrackOrder} disabled={trackSearching}>
                {trackSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                Suivre ma commande
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-16 h-16 mx-auto text-muted-foreground/40" />
            <h2 className="text-lg font-medium mt-4">Aucun produit disponible</h2>
            <p className="text-sm text-muted-foreground mt-1">Revenez plus tard pour découvrir nos produits</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product) => {
              const stock = stocks[product.id] ?? null
              const isOutOfStock = stock !== null && stock <= 0
              return (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow relative">
                <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground text-xs">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 opacity-40" />
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-primary">{formatXOF(product.price)}</span>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => addToCart(product)} disabled={isOutOfStock}>
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      {isOutOfStock ? 'Indisponible' : 'Ajouter'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Propulsé par <span className="font-medium">Naatal ERP</span></p>
        </div>
      </footer>
    </div>
  )
}
