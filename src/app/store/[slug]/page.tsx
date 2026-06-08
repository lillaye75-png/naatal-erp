"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Store, Phone } from "lucide-react"
import { formatXOF } from "@/lib/currency"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import { toast } from "sonner"
import { useParams } from "next/navigation"

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

  const [store, setStore] = useState<StorefrontData | null>(null)
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [stocks, setStocks] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])

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
          for (const p of productsData) {
            const movSnap = await getDocs(
              query(collection(db, 'inventory_movements'), where('productId', '==', p.id)),
            )
            stockMap[p.id] = movSnap.docs.reduce((sum, d) => sum + (d.data().qty || 0), 0)
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

  const handleWhatsAppOrder = useCallback(() => {
    if (cart.length === 0) return
    const lines = cart.map((i) => `- ${i.name} x${i.qty} = ${formatXOF(i.price * i.qty)}`)
    const message = [
      `🛍️ *Nouvelle commande*`,
      `Boutique: ${store?.name || 'Boutique'}`,
      '',
      ...lines,
      '',
      `Total: ${formatXOF(cartTotal)}`,
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
  }, [cart, cartTotal, store])

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
      <header className="border-b bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{store.name}</h1>
            <p className="text-xs text-muted-foreground">Boutique en ligne</p>
          </div>
          <div className="flex items-center gap-3">
            {cart.length > 0 && (
              <div className="text-right">
                <p className="text-sm font-medium">{cart.length} article(s)</p>
                <p className="text-xs text-muted-foreground">{formatXOF(cartTotal)}</p>
              </div>
            )}
            <Button size="sm" disabled={cart.length === 0} onClick={handleWhatsAppOrder}>
              <Phone className="w-4 h-4 mr-1" />
              Commander
            </Button>
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
