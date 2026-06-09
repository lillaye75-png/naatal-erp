"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/stores/auth.store"
import { collection, addDoc, doc, updateDoc, getDoc, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { useTranslation } from "react-i18next"
import { Store, ShoppingBag, QrCode, ChevronLeft, ChevronRight, Check, PartyPopper } from "lucide-react"
import { toast } from "sonner"

const SECTORS = [
  { value: "retail", label: "Commerce de détail" },
  { value: "wholesale", label: "Commerce de gros" },
  { value: "restaurant", label: "Restaurant / Alimentation" },
  { value: "service", label: "Prestation de services" },
  { value: "other", label: "Autre" },
]

export function OnboardingWizard() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)

  const [companyName, setCompanyName] = useState("")
  const [sector, setSector] = useState("retail")
  const [language, setLanguage] = useState("fr")

  const [productName, setProductName] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [productCost, setProductCost] = useState("")

  const [enableWave, setEnableWave] = useState(false)
  const [enableOM, setEnableOM] = useState(false)

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1)
      return
    }

    setSaving(true)
    try {
      const { auth, db } = await initializeFirebase()
      const uid = auth.currentUser?.uid
      if (!uid) {
        toast.error("Session expirée, veuillez vous reconnecter")
        return
      }

      const userSnap = await getDoc(doc(db, 'users', uid))
      if (!userSnap.exists()) {
        toast.error("Session expirée, veuillez vous reconnecter")
        return
      }
      const userData = userSnap.data()
      const tenantId: string = userData.tenantId
      const userId = uid

      const tenantSnap = await getDoc(doc(db, 'tenants', tenantId))
      if (!tenantSnap.exists()) {
        toast.error("Session expirée, veuillez vous reconnecter")
        return
      }
      const tenantData = { id: tenantSnap.id, ...tenantSnap.data() }

      const now = Timestamp.now().toMillis().toString()

      if (companyName) {
        await updateDoc(doc(db, 'tenants', tenantId), {
          name: companyName,
          sector,
          language,
          onboardingCompleted: true,
          updatedAt: now,
          updatedBy: userId,
        })
      } else {
        await updateDoc(doc(db, 'tenants', tenantId), {
          sector,
          language,
          onboardingCompleted: true,
          updatedAt: now,
          updatedBy: userId,
        })
      }

      if (language !== i18n.language) {
        i18n.changeLanguage(language)
        document.cookie = `NEXT_LOCALE=${language}; path=/; max-age=31536000`
      }

      if (productName && productPrice) {
        await addDoc(collection(db, 'products'), {
          name: productName,
          price: parseInt(productPrice) || 0,
          costPrice: parseInt(productCost) || 0,
          sku: '',
          barcode: '',
          categoryId: '',
          brandId: '',
          unitId: '',
          imageUrl: '',
          minStock: 0,
          warehouseId: '',
          isSoldOnline: false,
          tenantId,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
          isDeleted: false,
          status: 'ACTIVE',
        })
      }

      const settingsRef = collection(db, 'settings')
      await addDoc(settingsRef, {
        tenantId,
        taxRate: 18,
        invoicePrefix: 'INV-',
        language,
        waveEnabled: enableWave,
        orangeMoneyEnabled: enableOM,
        createdAt: now,
        updatedAt: now,
      })

      useAuthStore.getState().setTenant({ ...tenantData, language } as any)
      setCompleted(true)
      toast.success("Configuration terminée !")
      setTimeout(() => router.refresh(), 1500)
    } catch (err) {
      console.error("Onboarding error:", err)
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  if (completed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-12 pb-8 space-y-4">
            <PartyPopper className="w-16 h-16 mx-auto text-primary" />
            <CardTitle className="text-2xl">Configuration terminée !</CardTitle>
            <p className="text-muted-foreground">
              Votre entreprise est prête. Vous allez être redirigé...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {step === 0 && <Store className="w-5 h-5 text-primary" />}
              {step === 1 && <ShoppingBag className="w-5 h-5 text-primary" />}
              {step === 2 && <QrCode className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <CardTitle className="text-lg">
                {step === 0 ? "Votre entreprise" : step === 1 ? "Votre premier produit" : "Configurez vos paiements"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {step === 0 ? "Nom et configuration de votre société" :
                 step === 1 ? "Ajoutez un produit pour démarrer" :
                 "Activez Wave ou Orange Money"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Nom de l'entreprise</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Mon Commerce" />
              </div>
              <div className="space-y-2">
                <Label>Secteur d'activité</Label>
                <Select value={sector} onValueChange={(v) => setSector(v ?? 'retail')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Langue préférée</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v ?? 'fr')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="wo">Wolof</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Nom du produit</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ex: Huile 1L" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Prix de vente (FCFA)</Label>
                  <Input type="number" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="1500" />
                </div>
                <div className="space-y-2">
                  <Label>Prix de revient</Label>
                  <Input type="number" value={productCost} onChange={(e) => setProductCost(e.target.value)} placeholder="1000" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Vous pourrez ajouter plus de produits plus tard.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-4 border rounded-lg p-4">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={enableWave} onChange={(e) => setEnableWave(e.target.checked)} className="rounded" />
                  Activer Wave
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={enableOM} onChange={(e) => setEnableOM(e.target.checked)} className="rounded" />
                  Activer Orange Money
                </Label>
                <p className="text-xs text-muted-foreground">
                  Vous pourrez configurer les clés API dans les paramètres plus tard.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(step + 1)} className="text-muted-foreground">
                Passer cette étape
              </Button>
            </>
          )}

          <div className="flex items-center justify-between pt-4">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
            <Button onClick={handleNext} disabled={saving}>
              {step < 2 ? (
                <>Suivant <ChevronRight className="w-4 h-4 ml-1" /></>
              ) : (
                <>{saving ? "Enregistrement..." : "Terminer"} <Check className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
