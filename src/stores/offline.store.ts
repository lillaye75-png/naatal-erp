import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { processQueue, getPendingWrites, type PendingWrite } from '@/lib/offline-queue'
import { initializeFirebase } from '@/lib/firebase'
import { collection, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore'

interface OfflineState {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  pendingWrites: PendingWrite[]
  lastSyncAt: string | null
  showBanner: boolean
  dismissed: boolean

  setOnline: (online: boolean) => void
  setSyncing: (syncing: boolean) => void
  setLastSyncAt: (date: string) => void
  addPendingWrite: (item: PendingWrite) => void
  removePendingWrite: (id: string) => void
  dismissBanner: () => void
  refreshPendingCount: () => Promise<void>
  syncNow: () => Promise<void>
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      isSyncing: false,
      pendingCount: 0,
      pendingWrites: [],
      lastSyncAt: null,
      showBanner: false,
      dismissed: false,

      setOnline: (online) => {
        set({ isOnline: online, showBanner: !online && !get().dismissed })
        if (online) {
          get().syncNow()
        }
      },

      setSyncing: (syncing) => set({ isSyncing: syncing }),

      setLastSyncAt: (date) => set({ lastSyncAt: date }),

      addPendingWrite: (item) =>
        set((state) => ({
          pendingWrites: [...state.pendingWrites, item],
          pendingCount: state.pendingCount + 1,
        })),

      removePendingWrite: (id) =>
        set((state) => ({
          pendingWrites: state.pendingWrites.filter((w) => w.id !== id),
        })),

      dismissBanner: () => set({ dismissed: true, showBanner: false }),

      refreshPendingCount: async () => {
        try {
          const count = (await getPendingWrites()).length
          set({ pendingCount: count })
        } catch { null }
      },

      syncNow: async () => {
        const state = get()
        if (state.isSyncing || !state.isOnline) return
        set({ isSyncing: true })
        try {
          const { db } = await initializeFirebase()
          await processQueue(
            async (item) => {
              const ref = item.collection === 'sales'
                ? doc(collection(db, item.collection))
                : doc(collection(db, item.collection), (item.payload as Record<string, unknown>).id as string)
              const data = {
                ...(item.payload as Record<string, unknown>),
                updatedAt: Timestamp.now().toMillis().toString(),
              }
              if (item.action === 'delete') {
                await deleteDoc(doc(db, item.collection, (item.payload as Record<string, unknown>).id as string))
              } else {
                await setDoc(ref, data, { merge: item.action === 'update' })
              }
            },
            (item, error) => {
              console.warn('Conflict resolved for', item.id, error.message)
            },
          )
          set({ lastSyncAt: new Date().toISOString() })
        } catch (err) {
          console.error('Sync failed:', err)
        } finally {
          const remaining = (await getPendingWrites()).length
          set({ isSyncing: false, pendingCount: remaining, showBanner: remaining > 0 })
        }
      },
    }),
    {
      name: 'naatal-offline-store',
      partialize: (state) => ({
        lastSyncAt: state.lastSyncAt,
        dismissed: state.dismissed,
      }),
    },
  ),
)
