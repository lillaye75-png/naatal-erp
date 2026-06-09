import { create } from "zustand"
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, setDoc, increment } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"

interface CashRegisterState {
  sessionId: string | null
  firestoreDocId: string | null
  isOpen: boolean
  openingBalance: number
  currentBalance: number
  tenantId: string | null
  setSession: (sessionId: string, openingBalance: number, firestoreDocId: string) => void
  addMovement: (amount: number) => Promise<void>
  closeSession: () => void
  checkAutoClose: () => Promise<void>
}

function showWarningToast(msg: string) {
  if (typeof window !== 'undefined') {
    import('sonner').then(({ toast }) => toast.warning(msg)).catch(() => {})
  }
}

let _autoCloseInterval: ReturnType<typeof setInterval> | null = null

export function startAutoCloseCheck() {
  if (_autoCloseInterval) return
  _autoCloseInterval = setInterval(() => {
    useCashRegisterStore.getState().checkAutoClose()
  }, 60 * 60 * 1000)
}

export function stopAutoCloseCheck() {
  if (_autoCloseInterval) {
    clearInterval(_autoCloseInterval)
    _autoCloseInterval = null
  }
}

export const useCashRegisterStore = create<CashRegisterState>((set, get) => {
  startAutoCloseCheck()
  return {
    sessionId: null,
    firestoreDocId: null,
    isOpen: false,
    openingBalance: 0,
    currentBalance: 0,
    tenantId: null,
    setSession: (sessionId, openingBalance, firestoreDocId) =>
      set({ sessionId, firestoreDocId, isOpen: true, openingBalance, currentBalance: openingBalance }),
    addMovement: async (amount) => {
      const { firestoreDocId, tenantId, currentBalance } = get()
      const newBalance = currentBalance + amount
      set({ currentBalance: newBalance })
      if (firestoreDocId && tenantId) {
        try {
          const { db } = await initializeFirebase()
          await updateDoc(doc(db, 'cash_registers', firestoreDocId), {
            currentBalance: newBalance,
          })
        } catch (err) {
          console.error("Failed to persist cash movement:", err)
        }
      }
    },
    closeSession: () =>
      set({ sessionId: null, firestoreDocId: null, isOpen: false, openingBalance: 0, currentBalance: 0, tenantId: null }),
    checkAutoClose: async () => {
      try {
        const now = new Date()
        const hours = now.getHours()
        if (hours !== 0) return

        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        const yesterdayStart = yesterday.getTime().toString()
        yesterday.setHours(23, 59, 59, 999)
        const yesterdayEnd = yesterday.getTime().toString()

        const { db } = await initializeFirebase()
        const snap = await getDocs(
          query(
            collection(db, 'cash_registers'),
            where('openedAt', '>=', yesterdayStart),
            where('openedAt', '<=', yesterdayEnd),
            where('closedAt', '==', ''),
          ),
        )

        for (const session of snap.docs) {
          const data = session.data()
          const nowTs = Timestamp.now().toMillis().toString()
          await updateDoc(doc(db, 'cash_registers', session.id), {
            closedAt: nowTs,
            closingBalance: data.currentBalance || data.openingBalance || 0,
            difference: 0,
            note: "Fermeture automatique — caissier n'a pas fermé la session",
            updatedAt: nowTs,
          })
        }

        if (snap.docs.length > 0) {
          showWarningToast("⚠️ La caisse d'hier a été fermée automatiquement.")
        }
      } catch (err) {
        console.error("Auto-close check failed:", err)
      }
    },
  }
})
