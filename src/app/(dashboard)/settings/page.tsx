"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { Building2, FileText, Smartphone, Globe, Settings2, Save, Plug, Wifi, Users, Upload, X, Plus, UserCheck, Mail, Download, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { testWaveConnection } from "@/lib/wave"
import { testOrangeMoneyConnection } from "@/lib/orange-money"
import { cn } from "@/lib/utils"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function SettingsPage() {
  const [tab, setTab] = useState("business")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testingWave, setTestingWave] = useState(false)
  const [testingOrange, setTestingOrange] = useState(false)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [storefrontId, setStorefrontId] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const tenant = useAuthStore((s) => s.tenant)
  const tenantId = tenant?.id

  const [form, setForm] = useState({
    currency: "XOF",
    companyName: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    logoUrl: "",
    invoicePrefix: "INV-",
    invoiceFooter: "",
    paymentTerms: "",
    taxRate: 18,
    language: "fr",
    defaultDueDays: 30,
    waveEnabled: false,
    waveApiKey: "",
    orangeMoneyEnabled: false,
    orangeMoneyKey: "",
    orangeMoneySecret: "",
    testMode: false,
    storeName: "",
    storeSlug: "",
    storeTagline: "",
    storePhone: "",
    storeActive: false,
  })

  const [users, setUsers] = useState<any[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("employee")
  const [roles, setRoles] = useState<any[]>([])
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [autoBackup, setAutoBackup] = useState(false)
  const [backupTime, setBackupTime] = useState("02:00")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { db } = await initializeFirebase()

      const tenantSnap = await getDoc(doc(db, 'tenants', tenantId))
      if (tenantSnap.exists()) {
        const t = tenantSnap.data() as { name?: string; address?: string; phone?: string; email?: string; logoUrl?: string; language?: string; currency?: string }
        setForm((prev) => ({
          ...prev,
          companyName: t.name || "",
          companyAddress: t.address || "",
          companyPhone: t.phone || "",
          companyEmail: t.email || "",
          logoUrl: t.logoUrl || "",
          language: t.language || "fr",
          currency: t.currency || "XOF",
        }))
      }

      const snap = await getDocs(query(
        collection(db, 'settings'),
        where('tenantId', '==', tenantId),
      ))
      if (!snap.empty) {
        const s = snap.docs[0].data() as { taxRate?: number; invoicePrefix?: string; invoiceFooter?: string; paymentTerms?: string; language?: string; defaultDueDays?: number; waveEnabled?: boolean; waveApiKey?: string; orangeMoneyEnabled?: boolean; orangeMoneyKey?: string; orangeMoneySecret?: string; testMode?: boolean }
        setSettingsId(snap.docs[0].id)
        setForm((prev) => ({
          ...prev,
          taxRate: s.taxRate ?? 18,
          invoicePrefix: s.invoicePrefix || "INV-",
          invoiceFooter: s.invoiceFooter || "",
          paymentTerms: s.paymentTerms || "",
          language: s.language || prev.language,
          defaultDueDays: s.defaultDueDays ?? 30,
          waveEnabled: s.waveEnabled ?? false,
          waveApiKey: s.waveApiKey || "",
          orangeMoneyEnabled: s.orangeMoneyEnabled ?? false,
          orangeMoneyKey: s.orangeMoneyKey || "",
          orangeMoneySecret: s.orangeMoneySecret || "",
          testMode: s.testMode ?? false,
        }))
      }

      const sfSnap = await getDocs(query(
        collection(db, 'storefronts'),
        where('tenantId', '==', tenantId),
      ))
      if (!sfSnap.empty) {
        const sf = sfSnap.docs[0].data() as { name?: string; slug?: string; tagline?: string; phone?: string; isActive?: boolean }
        setStorefrontId(sfSnap.docs[0].id)
        setForm((prev) => ({
          ...prev,
          storeName: sf.name || "",
          storeSlug: sf.slug || "",
          storeTagline: sf.tagline || "",
          storePhone: sf.phone || "",
          storeActive: sf.isActive ?? false,
        }))
      }

      const [usersSnap, rolesSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('tenantId', '==', tenantId))),
        getDocs(query(collection(db, 'roles'), where('tenantId', '==', tenantId))),
      ])
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setRoles(rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('Error loading settings:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!tenantId) return
    setSaving(true)
    try {
      const { db } = await initializeFirebase()
      const now = Timestamp.now().toMillis().toString()

      await updateDoc(doc(db, 'tenants', tenantId), {
        name: form.companyName,
        address: form.companyAddress,
        phone: form.companyPhone,
        email: form.companyEmail,
        logoUrl: form.logoUrl,
        language: form.language,
        currency: form.currency,
        updatedAt: now,
      }).catch(() => null)

      const settingsData = {
        taxRate: form.taxRate,
        invoicePrefix: form.invoicePrefix,
        invoiceFooter: form.invoiceFooter,
        paymentTerms: form.paymentTerms,
        language: form.language,
        defaultDueDays: form.defaultDueDays,
        waveEnabled: form.waveEnabled,
        waveApiKey: form.waveApiKey,
        orangeMoneyEnabled: form.orangeMoneyEnabled,
        orangeMoneyKey: form.orangeMoneyKey,
        orangeMoneySecret: form.orangeMoneySecret,
        testMode: form.testMode,
        tenantId,
        updatedAt: now,
      }

      if (settingsId) {
        await updateDoc(doc(db, 'settings', settingsId), settingsData)
      } else {
        const ref = await addDoc(collection(db, 'settings'), {
          ...settingsData,
          createdAt: now,
        })
        setSettingsId(ref.id)
      }
      if (storefrontId) {
        await updateDoc(doc(db, 'storefronts', storefrontId), {
          name: form.storeName,
          slug: form.storeSlug,
          tagline: form.storeTagline,
          phone: form.storePhone,
          isActive: form.storeActive,
          updatedAt: now,
        })
      } else if (form.storeName) {
        const ref = await addDoc(collection(db, 'storefronts'), {
          tenantId,
          name: form.storeName,
          slug: form.storeSlug,
          tagline: form.storeTagline,
          phone: form.storePhone,
          theme: 'default',
          isActive: form.storeActive,
          createdAt: now,
          updatedAt: now,
        })
        setStorefrontId(ref.id)
      }

      toast.success("Paramètres enregistrés")
    } catch (err) {
      console.error('Error saving settings:', err)
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const inviteUser = async () => {
    if (!tenantId || !inviteEmail) return
    try {
      const { db } = await initializeFirebase()
      const inviteId = await addDoc(collection(db, 'user_invites'), {
        email: inviteEmail,
        role: inviteRole,
        tenantId,
        status: 'PENDING',
        createdAt: Timestamp.now().toMillis().toString(),
        invitedBy: useAuthStore.getState().user?.id,
      })

      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: inviteEmail,
          subject: `Invitation à rejoindre ${tenant?.name || 'Naatal ERP'}`,
          html: `<p>Vous avez été invité à rejoindre <strong>${tenant?.name || 'Naatal ERP'}</strong>.</p>
<p>Créez votre compte ici : <a href="${window.location.origin}/register">${window.location.origin}/register</a></p>
<p>Votre email d'invitation : ${inviteEmail}</p>`,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erreur d'envoi d'email")
      }

      toast.success(`Invitation envoyée à ${inviteEmail}`)
      setShowInvite(false)
      setInviteEmail("")
    } catch (err) {
      console.error('Error inviting user:', err)
      toast.error("Erreur lors de l'envoi de l'invitation")
    }
  }

  const handleBackup = async () => {
    if (!tenantId) return
    setBackingUp(true)
    try {
      const { db } = await initializeFirebase()
      const collections = ['products', 'customers', 'sales', 'suppliers', 'expenses', 'payments', 'invoices', 'inventory_movements', 'categories', 'brands', 'units', 'warehouses', 'orders', 'storefronts', 'cash_registers']
      const backup: Record<string, any[]> = {}
      for (const name of collections) {
        const snap = await getDocs(query(collection(db, name), where('tenantId', '==', tenantId)))
        backup[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      }
      const blob = new Blob([JSON.stringify({ tenantId, exportedAt: new Date().toISOString(), data: backup }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `naatal-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Sauvegarde téléchargée")
    } catch (err) {
      console.error('Backup error:', err)
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setBackingUp(false)
    }
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenantId) return
    setRestoring(true)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      if (!backup.data || !backup.tenantId) { toast.error("Fichier de sauvegarde invalide"); return }

      const { db } = await initializeFirebase()
      const collections = Object.keys(backup.data)
      let restored = 0
      for (const colName of collections) {
        const docs = backup.data[colName] || []
        for (const docData of docs) {
          const ref = doc(db, colName, docData.id)
          await setDoc(ref, docData, { merge: true })
          restored++
        }
      }
      toast.success(`${restored} documents restaurés`)
      load()
    } catch (err) {
      console.error('Restore error:', err)
      toast.error("Erreur lors de la restauration")
    } finally {
      setRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tabs = [
    { id: "business", label: "Business", icon: Building2 },
    { id: "invoice", label: "Facturation", icon: FileText },
    { id: "payments", label: "Paiements", icon: Smartphone },
    { id: "store", label: "Boutique en ligne", icon: Globe },
    { id: "users", label: "Utilisateurs & Rôles", icon: Users },
    { id: "backup", label: "Sauvegarde", icon: Download },
  ]

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image')
      return
    }
    setLogoUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      setForm((prev) => ({ ...prev, logoUrl: url }))
      toast.success('Logo téléversé')
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors du téléversement")
    }
    setLogoUploading(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }, [])

  const handleTestWave = async () => {
    setTestingWave(true)
    try {
      const ok = await testWaveConnection(form.waveApiKey)
      if (ok) toast.success("✅ Connexion Wave réussie")
      else toast.error("❌ Erreur de connexion Wave")
    } catch {
      toast.error("❌ Erreur de connexion Wave")
    } finally {
      setTestingWave(false)
    }
  }

  const handleTestOrange = async () => {
    setTestingOrange(true)
    try {
      const ok = await testOrangeMoneyConnection(form.orangeMoneyKey, form.orangeMoneySecret)
      if (ok) toast.success("✅ Connexion Orange Money réussie")
      else toast.error("❌ Erreur de connexion Orange Money")
    } catch {
      toast.error("❌ Erreur de connexion Orange Money")
    } finally {
      setTestingOrange(false)
    }
  }

  if (loading) return <TableSkeleton />
  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Settings2 className="w-12 h-12 mb-3 text-destructive opacity-40" />
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" onClick={() => { setError(null); load() }}>
        Réessayer
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Paramètres</h1>
          <p className="text-sm text-muted-foreground mt-1">Configuration de l'application</p>
        </div>
        {tab !== "users" && (
          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        )}
      </div>

      <div className="flex border-b gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "business" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Profil de l'entreprise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-6">
            <div className="space-y-2">
              <Label>Logo</Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              {form.logoUrl ? (
                <div className="relative w-32 h-32 rounded-lg border overflow-hidden bg-muted">
                  <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, logoUrl: '' })}
                    className="absolute top-1 right-1 w-6 h-6 bg-background/80 rounded-full flex items-center justify-center hover:bg-background"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-32 h-32 flex-col gap-2"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  {logoUploading ? (
                    <span className="text-xs">Chargement...</span>
                  ) : (
                    <>
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">Changer le logo</span>
                    </>
                  )}
                </Button>
              )}
              {form.logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive text-xs"
                  onClick={() => setForm({ ...form, logoUrl: '' })}
                >
                  Supprimer
                </Button>
              )}
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de l'entreprise</Label>
                <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Ex: Mon Commerce" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={form.companyPhone} onChange={(e) => setForm({ ...form, companyPhone: e.target.value })} placeholder="+221 77 000 00 00" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} placeholder="contact@exemple.com" />
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={form.companyAddress} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })} placeholder="Dakar, Sénégal" />
              </div>
              <div className="space-y-2">
                <Label>Langue par défaut</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v ?? 'fr' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="wo">Wolof</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v ?? 'XOF' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XOF">FCFA (XOF)</SelectItem>
                    <SelectItem value="XAF">FCFA (XAF)</SelectItem>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                    <SelectItem value="USD">Dollar ($)</SelectItem>
                    <SelectItem value="MAD">Dirham (DH)</SelectItem>
                    <SelectItem value="GNF">Franc Guinéen (FG)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {tab === "invoice" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Facturation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Préfixe facture</Label>
                <Input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>TVA (%)</Label>
                <Input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Échéance par défaut (jours)</Label>
                <Input type="number" value={form.defaultDueDays} onChange={(e) => setForm({ ...form, defaultDueDays: parseInt(e.target.value) || 30 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pied de page facture</Label>
              <Input value={form.invoiceFooter} onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })} placeholder="Merci de votre visite !" />
            </div>
            <div className="space-y-2">
              <Label>Conditions de paiement</Label>
              <Input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Paiement à réception" />
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "payments" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Paiements mobiles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Wave</Label>
                  <Switch checked={form.waveEnabled} onCheckedChange={(v) => setForm({ ...form, waveEnabled: v })} />
                </div>
                {form.waveEnabled && (
                  <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Clé API</Label>
                  <Input type="password" value={form.waveApiKey} onChange={(e) => setForm({ ...form, waveApiKey: e.target.value })} placeholder="..." />
                  <Button variant="outline" size="sm" className="w-full" onClick={handleTestWave} disabled={testingWave || !form.waveApiKey}>
                    <Wifi className="w-3.5 h-3.5 mr-1" />
                    {testingWave ? 'Test en cours...' : 'Tester la connexion Wave'}
                  </Button>
                </div>
                )}
              </div>
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Orange Money</Label>
                  <Switch checked={form.orangeMoneyEnabled} onCheckedChange={(v) => setForm({ ...form, orangeMoneyEnabled: v })} />
                </div>
                {form.orangeMoneyEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Clé API</Label>
                      <Input type="password" value={form.orangeMoneyKey} onChange={(e) => setForm({ ...form, orangeMoneyKey: e.target.value })} placeholder="..." />
                    </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Secret</Label>
                    <Input type="password" value={form.orangeMoneySecret} onChange={(e) => setForm({ ...form, orangeMoneySecret: e.target.value })} placeholder="..." />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleTestOrange} disabled={testingOrange || !form.orangeMoneyKey || !form.orangeMoneySecret}>
                    <Wifi className="w-3.5 h-3.5 mr-1" />
                    {testingOrange ? 'Test en cours...' : 'Tester la connexion Orange Money'}
                  </Button>
                </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={form.testMode} onCheckedChange={(v) => setForm({ ...form, testMode: v })} />
              <Label className="text-sm">Mode test (sandbox)</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "store" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Ma boutique en ligne
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de la boutique</Label>
                <Input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} placeholder="Ma Boutique" />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input value={form.storeSlug} onChange={(e) => setForm({ ...form, storeSlug: e.target.value })} placeholder="ma-boutique" />
                {form.storeSlug && (
                  <p className="text-xs text-muted-foreground">/store/{form.storeSlug}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Téléphone (WhatsApp)</Label>
                <Input value={form.storePhone} onChange={(e) => setForm({ ...form, storePhone: e.target.value })} placeholder="+221 77 000 00 00" />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input value={form.storeTagline} onChange={(e) => setForm({ ...form, storeTagline: e.target.value })} placeholder="Votre boutique en ligne de référence" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={form.storeActive} onCheckedChange={(v) => setForm({ ...form, storeActive: v })} />
              <Label className="text-sm">Boutique active</Label>
            </div>
            {form.storeSlug && form.storeActive && (
              <p className="text-xs text-muted-foreground">
                <a href={`/store/${form.storeSlug}`} target="_blank" rel="noopener noreferrer" className="underline">
                  Voir la boutique
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Utilisateurs</h2>
              <p className="text-sm text-muted-foreground">Gérez les accès à votre entreprise</p>
            </div>
            <Button onClick={() => setShowInvite(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Inviter un utilisateur
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Nom</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Rôle</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun utilisateur</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 text-sm font-medium">{u.displayName || u.email}</td>
                      <td className="p-3 text-sm text-muted-foreground">{u.email}</td>
                      <td className="p-3 text-sm">{u.roleId || "employé"}</td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          u.isActive === false
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        )}>
                          {u.isActive === false ? "Inactif" : "Actif"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "backup" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Download className="w-4 h-4" />
                Sauvegarder les données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Exportez toutes vos données (produits, clients, ventes, etc.) dans un fichier JSON.
              </p>
              <Button onClick={handleBackup} disabled={backingUp}>
                {backingUp ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                {backingUp ? "Sauvegarde en cours..." : "Télécharger la sauvegarde"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Restaurer les données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Importez un fichier de sauvegarde JSON pour restaurer vos données. Les documents existants seront mis à jour.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestore}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={restoring}>
                {restoring ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                {restoring ? "Restauration en cours..." : "Choisir un fichier de sauvegarde"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Sauvegarde automatique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
                <Label>Activer la sauvegarde automatique</Label>
              </div>
              {autoBackup && (
                <div className="space-y-2">
                  <Label>Heure de sauvegarde</Label>
                  <Input type="time" value={backupTime} onChange={(e) => setBackupTime(e.target.value)} className="w-[200px]" />
                  <p className="text-xs text-muted-foreground">
                    La sauvegarde sera téléchargée automatiquement chaque jour à {backupTime}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Inviter un utilisateur
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemple.com" />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={inviteRole} onValueChange={(v) => v && setInviteRole(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.length > 0 ? (
                    roles.map((r) => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="manager">Gestionnaire</SelectItem>
                      <SelectItem value="employee">Employé</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={inviteUser}>
              <UserCheck className="w-4 h-4 mr-1" />
              Envoyer l'invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
