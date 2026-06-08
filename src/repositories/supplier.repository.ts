import { collection, doc, getDoc, getDocs, query, addDoc, updateDoc, where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Supplier } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getSuppliers(tenantId: string, lastDoc?: any, pageSize = 20) {
  const db = await getDb()
  let q = query(
    collection(db, 'suppliers'),
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
    items: docs.map((d) => ({ id: d.id, ...d.data() } as Supplier)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, 'suppliers', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Supplier
}

export async function createSupplier(data: Record<string, any>, userId: string) {
  const db = await getDb()
  const ref = await addDoc(collection(db, 'suppliers'), {
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

export async function updateSupplier(id: string, data: Partial<Supplier>, userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'suppliers', id), {
    ...data,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}

export async function deleteSupplier(id: string, userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'suppliers', id), {
    isDeleted: true,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}
