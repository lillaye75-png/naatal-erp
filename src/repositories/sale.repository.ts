import { collection, doc, getDocs, query, where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Sale, Payment } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getSales(tenantId: string, lastDoc?: any, pageSize = 20) {
  const db = await getDb()
  let q = query(
    collection(db, 'sales'),
    where('tenantId', '==', tenantId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1),
  )
  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }
  const snap = await getDocs(q)
  const docs = snap.docs.slice(0, pageSize)
  return {
    items: docs.map((d) => ({ id: d.id, ...d.data() } as Sale)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

export async function getPaymentsBySale(saleId: string) {
  const db = await getDb()
  const snap = await getDocs(
    query(collection(db, 'payments'), where('saleId', '==', saleId)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment))
}
