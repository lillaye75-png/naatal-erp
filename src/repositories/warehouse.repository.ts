import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, addDoc, where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Warehouse } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getWarehouses(tenantId: string, lastDoc?: any, pageSize = 20) {
  const db = await getDb()
  let q = query(
    collection(db, 'warehouses'),
    where('tenantId', '==', tenantId),
    where('isDeleted', '==', false),
    orderBy('name'),
    limit(pageSize + 1),
  )
  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }
  const snap = await getDocs(q)
  const docs = snap.docs.slice(0, pageSize)
  return {
    items: docs.map((d) => ({ id: d.id, ...d.data() } as Warehouse)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

export async function getWarehouse(id: string): Promise<Warehouse | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, 'warehouses', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Warehouse
}

export async function createWarehouse(data: Record<string, any>, userId: string) {
  const db = await getDb()
  const ref = await addDoc(collection(db, 'warehouses'), {
    ...data,
    createdAt: Timestamp.now().toMillis().toString(),
    updatedAt: Timestamp.now().toMillis().toString(),
    createdBy: userId,
    updatedBy: userId,
    isDeleted: false,
    status: 'ACTIVE',
  })
  return ref.id
}

export async function updateWarehouse(id: string, data: Partial<Warehouse>, userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'warehouses', id), {
    ...data,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}

export async function deleteWarehouse(id: string, userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'warehouses', id), {
    isDeleted: true,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}
