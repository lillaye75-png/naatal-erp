"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuthStore } from "@/stores/auth.store"
import { useCashRegisterStore } from "@/stores/cashRegister.store"
import { formatXOF } from "@/lib/currency"
import { Play, Square, Banknote, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { initializeFirebase } from "@/lib/firebase"
import { collection, doc, setDoc, updateDoc, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"

export default function CashRegisterPage() {
  const { sessionId, isOpen, openingBalance, currentBalance, setSession, addMovement, closeSession, tenantId: storeTenantId } = useCashRegisterStore()
  const [sessionDocId, setSessionDocId] = useState<string | null>(null)
  const [showOpenDialog, setShowOpenDialog] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [openingAmount, setOpeningAmount] = useState("0")
  const [actualCash, setActualCash] = useState("0")
  const [movements, setMovements] = useState<Array<{ type: 'IN' | 'OUT'; amount: number; reason: string }>>([])
  const [reason, setReason] = useState("")
  const [manualAmount, setManualAmount] = useState("")

  useEffect(() => {
    const restore = async () => {
      if (isOpen) return
      const tenantId = useAuthStore.getState().tenant?.id
      if (!tenantId) return
      const { db } = await initializeFirebase()
      const snap = await getDocs(
        query(collection(db, 'cash_registers'), where('tenantId', '==', tenantId), where('status', '==', 'OPEN')),
      )
      if (!snap.empty) {
        const session = snap.docs[0].data() as any
        const id = snap.docs[0].id
        setSession(session.sessionId || id, session.openingBalance || 0, id)
        setSessionDocId(id)
        const movSnap = await getDocs(
          query(collection(db, 'cash_movements'), where('sessionId', '==', session.sessionId || id)),
        )
        setMovements(movSnap.docs.map((d) => d.data() as any))
      }
    }
    restore()
  }, [])

  const handleOpen = async () => {
    const amount = parseInt(openingAmount) || 0

    try {
      const tenantId = useAuthStore.getState().tenant?.id
      const userId = useAuthStore.getState().user?.id
      if (!tenantId || !userId) return

      const { db } = await initializeFirebase()
      const docRef = doc(collection(db, 'cash_registers'))
      await setDoc(docRef, {
        id: docRef.id,
        tenantId,
        openingBalance: amount,
        currentBalance: amount,
        status: 'OPEN',
        openedAt: serverTimestamp(),
        openedBy: userId,
      })
      setSession("session-" + Date.now(), amount, docRef.id)
      setSessionDocId(docRef.id)
      setShowOpenDialog(false)
      toast.success("Caisse ouverte")
    } catch {
      toast.error("Erreur à l'ouverture de la caisse")
    }
  }

  const handleClose = async () => {
    closeSession()
    setShowCloseDialog(false)

    try {
      const userId = useAuthStore.getState().user?.id
      if (!userId || !sessionDocId) return

      const closingAmount = parseInt(actualCash) || 0
      const expected = openingBalance + movements.reduce((sum, m) => sum + (m.type === 'IN' ? m.amount : -m.amount), 0)
      const diff = closingAmount - expected

      const { db } = await initializeFirebase()
      await updateDoc(doc(db, 'cash_registers', sessionDocId), {
        status: 'CLOSED',
        closingAmount,
        expectedBalance: expected,
        difference: diff,
        closedAt: serverTimestamp(),
        closedBy: userId,
      })
      setSessionDocId(null)
      toast.success("Caisse fermée")
    } catch {
      toast.error("Erreur à la fermeture de la caisse")
    }
  }

  const addManualMovement = async (type: 'IN' | 'OUT') => {
    const amount = parseInt(manualAmount) || 0
    if (amount <= 0) return
    await addMovement(type === 'IN' ? amount : -amount)
    setMovements([...movements, { type, amount, reason }])
    setManualAmount("")
    setReason("")

    try {
      const tenantId = useAuthStore.getState().tenant?.id
      const userId = useAuthStore.getState().user?.id
      const currentSessionId = useCashRegisterStore.getState().sessionId
      if (!tenantId || !userId || !currentSessionId) return

      const { db } = await initializeFirebase()
      await addDoc(collection(db, 'cash_movements'), {
        tenantId,
        sessionId: currentSessionId,
        type,
        amount,
        reason: reason || (type === 'IN' ? 'Entrée manuelle' : 'Sortie manuelle'),
        createdAt: serverTimestamp(),
        createdBy: userId,
      })
      toast.success(type === 'IN' ? 'Entrée enregistrée' : 'Sortie enregistrée')
    } catch {
      toast.error("Erreur lors de l'enregistrement du mouvement")
    }
  }

  const expectedBalance = openingBalance + movements.reduce((sum, m) => sum + (m.type === 'IN' ? m.amount : -m.amount), 0)
  const difference = parseInt(actualCash) - expectedBalance

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Caisse</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez les sessions de caisse</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isOpen ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Solde actuel</p>
                  <p className="text-3xl font-bold text-success">{formatXOF(currentBalance)}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Ouverture: {formatXOF(openingBalance)}
                </div>
                <Button variant="destructive" className="w-full" onClick={() => { setActualCash(currentBalance.toString()); setShowCloseDialog(true) }}>
                  <Square className="w-4 h-4 mr-1" />
                  Fermer la caisse
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Aucune session ouverte</p>
                <Button className="w-full" onClick={() => setShowOpenDialog(true)}>
                  <Play className="w-4 h-4 mr-1" />
                  Ouvrir la caisse
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {isOpen && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-success" />
                  Entrée / Sortie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Montant</Label>
                  <Input type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Motif</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Paiement fournisseur" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-success" onClick={() => addManualMovement('IN')}>
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    Entrée
                  </Button>
                  <Button variant="outline" className="flex-1 text-destructive" onClick={() => addManualMovement('OUT')}>
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                    Sortie
                  </Button>
                </div>
                {movements.length > 0 && (
                  <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {movements.map((m, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{m.reason || (m.type === 'IN' ? 'Entrée manuelle' : 'Sortie manuelle')}</span>
                        <span className={m.type === 'IN' ? 'text-success' : 'text-destructive'}>
                          {m.type === 'IN' ? '+' : '-'}{formatXOF(m.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Mouvements récents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground text-center py-6">
                  Les ventes en espèces sont enregistrées automatiquement
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ouvrir la caisse</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fond de caisse (FCFA)</Label>
              <Input type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} placeholder="0" />
            </div>
            <Button className="w-full" onClick={handleOpen}>Ouvrir</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fermer la caisse</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Espèces comptées (FCFA)</Label>
              <Input type="number" value={actualCash} onChange={(e) => setActualCash(e.target.value)} />
            </div>
            <div className="text-sm space-y-1 bg-muted p-3 rounded-lg">
              <div className="flex justify-between"><span>Attendu</span><span>{formatXOF(expectedBalance)}</span></div>
              <div className="flex justify-between font-semibold">
                <span>Différence</span>
                <span className={difference === 0 ? 'text-success' : 'text-destructive'}>
                  {difference >= 0 ? '+' : ''}{formatXOF(difference)}
                </span>
              </div>
            </div>
            <Button className="w-full" onClick={handleClose}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
