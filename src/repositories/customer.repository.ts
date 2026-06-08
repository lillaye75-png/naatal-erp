import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, addDoc, where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Customer } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getCustomers(tenantId: string, lastDoc?: any, pageSize = 20) {
  const db = await getDb()
  let q = query(
    collection(db, 'customers'),
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
    items: docs.map((d) => ({ id: d.id, ...d.data() } as Customer)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, 'customers', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Customer
}

export async function createCustomer(data: Record<string, any>, userId: string) {
  const db = await getDb()
  const ref = await addDoc(collection(db, 'customers'), {
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

export async function updateCustomer(id: string, data: Partial<Customer>, userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'customers', id), {
    ...data,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}

export async function deleteCustomer(id: string, userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'customers', id), {
    isDeleted: true,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}
