"use client"

import { useCallback, useEffect, useRef } from 'react'
import { getPendingWrites, removeFromQueue, addToQueue } from '@/lib/offline-queue'
import { useOfflineStore } from '@/stores/offline.store'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { initializeFirebase } from '@/lib/firebase'
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'

export function useSyncManager() {
  const isOnline = useOnlineStatus()
  const { setSyncing, setLastSyncAt, addPendingWrite, removePendingWrite } = useOfflineStore()
  const syncingRef = useRef(false)

  const processQueue = useCallback(async () => {
    if (!isOnline || syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)

    try {
      const { db } = await initializeFirebase()
      const queue = await getPendingWrites()

      for (const item of queue) {
        try {
          const colRef = collection(db, item.collection)
          const now = Timestamp.now().toMillis().toString()
          const act = item.action.toUpperCase()

          if (act === 'CREATE') {
            await addDoc(colRef, { ...(item.payload as Record<string, unknown>), createdAt: now, updatedAt: now })
          } else if (act === 'UPDATE') {
            const pid = (item.payload as Record<string, unknown>)?.id as string
            if (pid) {
              await updateDoc(doc(db, item.collection, pid), {
                ...(item.payload as Record<string, unknown>),
                updatedAt: now,
              })
            }
          } else if (act === 'DELETE') {
            const pid = (item.payload as Record<string, unknown>)?.id as string
            if (pid) {
              await updateDoc(doc(db, item.collection, pid), {
                isDeleted: true,
                updatedAt: now,
              })
            }
          }

          await removeFromQueue(item.id)
          removePendingWrite(item.id)
        } catch {
          await removeFromQueue(item.id)
          removePendingWrite(item.id)
        }
      }

      setLastSyncAt(new Date().toISOString())
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [isOnline, setSyncing, setLastSyncAt, removePendingWrite])

  useEffect(() => {
    if (isOnline) processQueue()
  }, [isOnline, processQueue])

  const sync = useCallback(async () => {
    await processQueue()
  }, [processQueue])

  const enqueue = useCallback(async (
    action: string,
    collection: string,
    data: unknown,
    docId?: string,
  ) => {
    const id = crypto.randomUUID()
    const item = { id, action, collection, docId, data, createdAt: Date.now().toString() }

    try {
      await addToQueue(item)
      addPendingWrite({
        id: item.id,
        collection: item.collection,
        action: item.action.toLowerCase() as 'create' | 'update' | 'delete',
        payload: item.data,
        tenantId: '',
        createdAt: item.createdAt,
        attempts: 0,
      })
    } catch {
      // IndexedDB might not be available
    }

    if (isOnline) processQueue()
  }, [isOnline, addPendingWrite, processQueue])

  return { sync, enqueue, processQueue }
}
