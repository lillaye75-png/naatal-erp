"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { collection, getDocs, query, where, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { Globe, ShoppingBag, Eye } from "lucide-react"
import { formatXOF } from "@/lib/currency"
import { toast } from "sonner"

export default function EcommercePage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [storefront, setStorefront] = useState<any>(null)
  const [storeName, setStoreName] = useState("")
  const [slug, setSlug] = useState("")
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { db } = await initializeFirebase()

      const snap = await getDocs(query(
        collection(db, 'products'),
        where('tenantId', '==', tenantId),
        where('isDeleted', '==', false),
        where('isSoldOnline', '==', true),
      ))
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))

      const sfSnap = await getDocs(query(
        collection(db, 'storefronts'),
        where('tenantId', '==', tenantId),
      ))
      if (!sfSnap.empty) {
        const sf = { id: sfSnap.docs[0].id, ...sfSnap.docs[0].data() } as any
        setStorefront(sf)
        setStoreName(sf.name)
        setSlug(sf.slug)
      } else {
        setStoreName("Ma Boutique")
        setSlug(`boutique-${tenantId.slice(-6)}`)
      }
    } catch (err) {
      console.error('Error loading ecommerce:', err)
      toast.error('Erreur de chargement de la boutique')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const saveStorefront = async () => {
    if (!tenantId) { toast.error("Session expirée"); return }
    try {
      const { db } = await initializeFirebase()
      if (storefront?.id) {
        await updateDoc(doc(db, 'storefronts', storefront.id), {
          name: storeName,
          slug,
          updatedAt: Timestamp.now().toMillis().toString(),
        })
      } else {
        await addDoc(collection(db, 'storefronts'), {
          tenantId,
          slug,
          name: storeName,
          theme: 'default',
          isActive: false,
          createdAt: Timestamp.now().toMillis().toString(),
        })
      }
      toast.success("Boutique enregistrée")
      load()
    } catch (err) {
      console.error('Error saving storefront:', err)
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  const toggleActive = async () => {
    if (!storefront?.id) return
    try {
      const { db } = await initializeFirebase()
      await updateDoc(doc(db, 'storefronts', storefront.id), {
        isActive: !storefront.isActive,
      })
      setStorefront({ ...storefront, isActive: !storefront.isActive })
      toast.success(storefront.isActive ? "Boutique désactivée" : "Boutique activée")
    } catch (err) {
      console.error('Error toggling storefront:', err)
      toast.error("Erreur lors de la modification")
    }
  }

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Boutique en ligne</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez votre boutique e-commerce</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de la boutique</Label>
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              {slug && (
                <p className="text-xs text-muted-foreground">
                  https://sununaatal.com/store/{slug}
                </p>
              )}
            </div>
            <Button onClick={saveStorefront}>Enregistrer</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Statut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Boutique active</span>
              <Button size="sm" variant={storefront?.isActive ? "default" : "outline"} onClick={toggleActive}>
                {storefront?.isActive ? "Activée" : "Désactivée"}
              </Button>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produits en ligne</span>
                <span className="font-medium">{products.length}</span>
              </div>
            </div>
            {storefront?.isActive && (
              <Button variant="outline" className="w-full" size="sm" onClick={() => window.open(`/store/${slug}`, '_blank')}>
                <Eye className="w-3 h-3 mr-1" />
                Voir la boutique
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Produits disponibles en ligne ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Aucun produit n'est activé pour la vente en ligne</p>
              <p className="text-xs mt-1">Modifiez un produit et cochez "Vente en ligne"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {products.map((p) => (
                <div key={p.id} className="border rounded-lg p-3 text-center">
                  <div className="w-full h-20 bg-muted rounded-md mb-2 flex items-center justify-center text-muted-foreground text-xs">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover rounded-md" /> : 'Image'}
                  </div>
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatXOF(p.price)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
