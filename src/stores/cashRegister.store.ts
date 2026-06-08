import { create } from "zustand"
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"

interface CashRegisterState {
  sessionId: string | null
  isOpen: boolean
  openingBalance: number
  currentBalance: number
  setSession: (sessionId: string, openingBalance: number) => void
  addMovement: (amount: number) => void
  closeSession: () => void
  checkAutoClose: () => Promise<void>
}

function showWarningToast(msg: string) {
  if (typeof window !== 'undefined') {
    import('sonner').then(({ toast }) => toast.warning(msg)).catch(() => {})
  }
}

export const useCashRegisterStore = create<CashRegisterState>((set, get) => {
  setInterval(() => {
    get().checkAutoClose()
  }, 60 * 60 * 1000)

  return {
    sessionId: null,
    isOpen: false,
    openingBalance: 0,
    currentBalance: 0,
    setSession: (sessionId, openingBalance) =>
      set({ sessionId, isOpen: true, openingBalance, currentBalance: openingBalance }),
    addMovement: (amount) =>
      set((state) => ({ currentBalance: state.currentBalance + amount })),
    closeSession: () =>
      set({ sessionId: null, isOpen: false, openingBalance: 0, currentBalance: 0 }),
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
