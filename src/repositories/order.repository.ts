import { collection, doc, getDocs, query, updateDoc, where, orderBy, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Order } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getOrders(tenantId: string) {
  const db = await getDb()
  const snap = await getDocs(query(
    collection(db, 'orders'),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc'),
  ))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))
}

export async function updateOrderStatus(orderId: string, status: string, userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}
