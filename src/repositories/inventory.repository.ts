import { collection, getDocs, query, where, orderBy, limit, startAfter, doc, setDoc, Timestamp, DocumentReference } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { InventoryMovement } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function fetchMovements(productId: string, tenantId: string, lastDoc?: any, pageSize = 50) {
  const db = await getDb()
  let q = query(
    collection(db, 'inventory_movements'),
    where('productId', '==', productId),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1),
  )
  if (lastDoc) q = query(q, startAfter(lastDoc))
  const snap = await getDocs(q)
  const docs = snap.docs.slice(0, pageSize)
  return {
    items: docs.map((d) => ({ id: d.id, ...d.data() } as InventoryMovement)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

export async function fetchStockLevel(productId: string, tenantId: string, warehouseId?: string): Promise<number> {
  const db = await getDb()
  const conditions = [
    where('productId', '==', productId),
    where('tenantId', '==', tenantId),
  ]
  if (warehouseId) conditions.push(where('warehouseId', '==', warehouseId))
  const snap = await getDocs(query(collection(db, 'inventory_movements'), ...conditions))
  return snap.docs.reduce((sum, d) => sum + (d.data().qty || 0), 0)
}

export async function createMovement(data: Record<string, unknown>): Promise<void> {
  const db = await getDb()
  const ref = doc(collection(db, 'inventory_movements'))
  await setDoc(ref, { id: ref.id, ...data })
}
