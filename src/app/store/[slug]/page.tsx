"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Store, Phone } from "lucide-react"
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
  const [stocks, setStocks] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null)

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

        // Look up storefront by slug
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

        // Load products for this tenant
        const prodSnap = await getDocs(query(
          collection(db, 'products'),
          where('tenantId', '==', sfData.tenantId),
          where('isDeleted', '==', false),
          where('isSoldOnline', '==', true),
        ))
        if (!cancelled) {
          const productsData = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as StoreProduct))
          setProducts(productsData)

          const stockMap: Record<string, number> = {}
          const ids = productsData.map((p) => p.id)
          for (let i = 0; i < ids.length; i += 30) {
            const chunk = ids.slice(i, i + 30)
            const movSnap = await getDocs(
              query(collection(db, 'inventory_movements'), where('productId', 'in', chunk), where('isDeleted', '==', false)),
            )
            const grouped: Record<string, number> = {}
            movSnap.docs.forEach((d) => {
              const pid = d.data().productId
              grouped[pid] = (grouped[pid] || 0) + (d.data().qty || 0)
            })
            chunk.forEach((pid) => { stockMap[pid] = grouped[pid] || 0 })
          }
          if (!cancelled) setStocks(stockMap)
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

  const handleWhatsAppOrder = useCallback(async () => {
    if (cart.length === 0) return
    if (!store?.tenantId) {
      toast.error('Boutique non configurée')
      return
    }

    let trackingId = ''
    try {
      const { db } = await initializeFirebase()
      const orderRef = doc(collection(db, 'orders'))
      trackingId = orderRef.id.slice(-8).toUpperCase()
      await setDoc(orderRef, {
        id: orderRef.id,
        trackingId,
        storefrontId: store.id,
        tenantId: store.tenantId,
        items: cart.map((i) => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })),
        total: cartTotal,
        status: 'CONFIRMED',
        customerPhone: '',
        customerName: '',
        source: 'storefront',
        paymentMethod: 'CASH',
        createdAt: Timestamp.now().toMillis().toString(),
        updatedAt: Timestamp.now().toMillis().toString(),
      })
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
    setCart([])
    toast.success(`Commande enregistrée — Suivi: ${trackingId}`)
  }, [cart, cartTotal, store, slug])

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
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-bold">
                {trackedOrder.trackingId}
              </div>
              <span className="font-medium">
                {trackedOrder.status === 'CONFIRMED' ? 'Commande confirmée' :
                 trackedOrder.status === 'DELIVERED' ? 'Commande livrée' :
                 trackedOrder.status === 'CANCELLED' ? 'Commande annulée' :
                 `Statut: ${trackedOrder.status}`}
              </span>
              <span className="text-muted-foreground">
                — {formatXOF(trackedOrder.total || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      <header className="border-b bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{store.name}</h1>
            <p className="text-xs text-muted-foreground">Boutique en ligne</p>
          </div>
          <div className="flex items-center gap-3">
            {cart.length > 0 && !trackedOrder && (
              <div className="text-right">
                <p className="text-sm font-medium">{cart.length} article(s)</p>
                <p className="text-xs text-muted-foreground">{formatXOF(cartTotal)}</p>
              </div>
            )}
            {!trackedOrder && (
              <Button size="sm" disabled={cart.length === 0} onClick={handleWhatsAppOrder}>
                <Phone className="w-4 h-4 mr-1" />
                Commander
              </Button>
            )}
          </div>
        </div>
      </header>

      {cart.length > 0 && (
        <div className="border-b bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-1 bg-white border rounded-full px-3 py-1 text-xs shrink-0">
                  <span className="font-medium truncate max-w-[100px]">{item.name}</span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <button className="p-0.5 hover:bg-muted rounded" onClick={() => updateQty(item.productId, item.qty - 1)}>
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-4 text-center">{item.qty}</span>
                    <button className="p-0.5 hover:bg-muted rounded" onClick={() => updateQty(item.productId, item.qty + 1)}>
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button className="p-0.5 hover:bg-destructive/10 rounded text-destructive" onClick={() => removeFromCart(item.productId)}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              const stock = stocks[product.id] ?? -1
              const isOutOfStock = stock <= 0
              return (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow relative">
                {isOutOfStock && (
                  <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    Rupture de stock
                  </div>
                )}
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
                    {!isOutOfStock && (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => addToCart(product)}>
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Ajouter
                      </Button>
                    )}
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
