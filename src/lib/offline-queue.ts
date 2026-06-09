export interface PendingWrite {
  id: string
  collection: string
  action: 'create' | 'update' | 'delete'
  payload: unknown
  tenantId: string
  createdAt: string
  attempts: number
}

const DB_NAME = 'naatal-offline-queue'
const STORE_NAME = 'writes'
const DB_VERSION = 2

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function enqueueWrite(
  collection: string,
  action: 'create' | 'update' | 'delete',
  payload: unknown,
  tenantId: string,
): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const item: PendingWrite = {
    id,
    collection,
    action,
    payload,
    tenantId,
    createdAt: Date.now().toString(),
    attempts: 0,
  }
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).add(item)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }).catch(() => {})
  return id
}

export async function addToQueue(item: {
  id: string
  action: string
  collection: string
  docId?: string
  data: unknown
  createdAt: string
  tenantId?: string
}): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).add({
    id: item.id,
    collection: item.collection,
    action: item.action.toLowerCase() as 'create' | 'update' | 'delete',
    payload: item.data,
    tenantId: item.tenantId || '',
    createdAt: item.createdAt,
    attempts: 0,
  })
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }).catch(console.error)
}

export async function getPendingWrites(): Promise<PendingWrite[]> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const items = await new Promise<PendingWrite[]>((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
  items.sort((a, b) => parseInt(a.createdAt) - parseInt(b.createdAt))
  return items
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }).catch(() => {})
}

export async function clearProcessedQueue(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).clear()
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }).catch(() => {})
}

export async function getQueueSize(): Promise<number> {
  const items = await getPendingWrites()
  return items.length
}

function showToast(msg: string) {
  if (typeof window !== 'undefined') {
    import('sonner').then(({ toast }) => toast.warning(msg)).catch(() => {})
  }
}

async function resolveConflict(item: PendingWrite): Promise<boolean> {
  try {
    const { collection: colName, payload, createdAt } = item
    const docPayload = payload as Record<string, unknown>
    const docId = (docPayload?.id as string) || ''
    if (!docId) return false

    const { doc, getDoc, Timestamp } = await import('firebase/firestore')
    const { initializeFirebase } = await import('@/lib/firebase')
    const { db } = await initializeFirebase()
    const snap = await getDoc(doc(db, colName, docId))

    if (!snap.exists()) return false

    const existing = snap.data()
    const existingUpdatedAt = parseInt(existing?.updatedAt || '0', 10)
    const queueCreatedAt = parseInt(createdAt, 10)
    const now = Timestamp.now().toMillis().toString()

    if (existingUpdatedAt > queueCreatedAt) {
      showToast('⚠️ Conflit résolu — la version la plus récente a été conservée.')
      return true
    }

    const { updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, colName, docId), {
      ...docPayload,
      updatedAt: now,
    })
    showToast('⚠️ Conflit résolu — la version la plus récente a été conservée.')
    return true
  } catch {
    return false
  }
}

export async function processQueue(
  processFn: (item: PendingWrite) => Promise<void>,
  onConflict?: (item: PendingWrite, error: Error) => void,
): Promise<void> {
  const items = await getPendingWrites()
  for (const item of items) {
    try {
      await processFn(item)
      await removeFromQueue(item.id)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      if (error.message.includes('conflict') || error.message.includes('already exists')) {
        onConflict?.(item, error)
        const resolved = await resolveConflict(item)
        if (resolved) {
          await removeFromQueue(item.id)
        }
      } else {
        item.attempts++
        if (item.attempts >= 5) {
          await removeFromQueue(item.id)
        }
      }
    }
  }
}
