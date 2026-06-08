"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { TableSkeleton } from "@/components/shared/Skeleton"
import { useAuthStore } from "@/stores/auth.store"
import { collection, getDocs, query, where, addDoc, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Shield, UserCheck } from "lucide-react"
import { toast } from "sonner"

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("employee")
  const tenantId = useAuthStore((s) => s.tenant?.id)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { db } = await initializeFirebase()
      const snap = await getDocs(query(
        collection(db, 'users'),
        where('tenantId', '==', tenantId),
      ))
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('Error loading users:', err)
      toast.error('Erreur de chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const inviteUser = async () => {
    if (!tenantId || !email) return
    try {
      const { db } = await initializeFirebase()
      await addDoc(collection(db, 'user_invites'), {
        email,
        role,
        tenantId,
        status: 'PENDING',
        createdAt: Timestamp.now().toMillis().toString(),
        invitedBy: useAuthStore.getState().user?.id,
      })
      toast.success(`Invitation envoyée à ${email}`)
      setShowInvite(false)
      setEmail("")
    } catch (err) {
      console.error('Error inviting user:', err)
      toast.error("Erreur lors de l'envoi de l'invitation")
    }
  }

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez les accès à votre entreprise</p>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Inviter
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucun utilisateur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{u.displayName || u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  {u.roleId || 'employé'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inviter un utilisateur</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="manager">Gestionnaire</SelectItem>
                  <SelectItem value="employee">Employé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={inviteUser}>Envoyer l'invitation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
