import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Invoice } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, 'invoices', invoiceId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Invoice
}

export async function getInvoicesByTenant(tenantId: string, lastDoc?: any, pageSize = 25) {
  const db = await getDb()
  let q = query(
    collection(db, 'invoices'),
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
    items: docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}
