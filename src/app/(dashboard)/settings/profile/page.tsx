"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/stores/auth.store"
import { initializeFirebase } from "@/lib/firebase"
import { doc, updateDoc, Timestamp } from "firebase/firestore"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { toast } from "sonner"
import { Save, User, Lock } from "lucide-react"

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { db } = await initializeFirebase()
      await updateDoc(doc(db, "users", user.id), {
        displayName,
        phone,
        updatedAt: Timestamp.now().toMillis().toString(),
      })
      toast.success("Profil mis à jour")
    } catch (err) {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Remplissez tous les champs")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères")
      return
    }
    setSaving(true)
    try {
      const { auth } = await initializeFirebase()
      const cred = EmailAuthProvider.credential(user?.email || "", currentPassword)
      await reauthenticateWithCredential(auth.currentUser!, cred)
      await updatePassword(auth.currentUser!, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      toast.success("Mot de passe modifié avec succès")
    } catch (err: any) {
      if (err?.code === "auth/wrong-password") {
        toast.error("Mot de passe actuel incorrect")
      } else {
        toast.error("Erreur lors du changement de mot de passe")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Profil</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez vos informations personnelles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom d'affichage</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mot de passe actuel</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <Button onClick={handleChangePassword} disabled={saving || !currentPassword || !newPassword}>
            <Lock className="w-4 h-4 mr-1" />
            {saving ? "Modification..." : "Modifier le mot de passe"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
