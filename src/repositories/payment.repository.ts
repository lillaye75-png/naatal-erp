import { collection, getDocs, query, where, orderBy, limit, startAfter, doc, setDoc } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Payment } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function fetchPayments(tenantId: string, lastDoc?: any, pageSize = 25) {
  const db = await getDb()
  let q = query(
    collection(db, 'payments'),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1),
  )
  if (lastDoc) q = query(q, startAfter(lastDoc))
  const snap = await getDocs(q)
  const docs = snap.docs.slice(0, pageSize)
  return {
    items: docs.map((d) => ({ id: d.id, ...d.data() } as Payment)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

export async function createPaymentRef(data: Record<string, unknown>) {
  const db = await getDb()
  const ref = doc(collection(db, 'payments'))
  await setDoc(ref, { id: ref.id, ...data })
  return ref.id
}
