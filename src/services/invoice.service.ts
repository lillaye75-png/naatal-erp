import { collection, doc, getDocs, query, where, orderBy, limit, startAfter, getDoc, Timestamp, DocumentReference } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Invoice } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export const INVOICE_PREFIX: Record<string, string> = {
  INVOICE: 'INV',
  PROFORMA: 'PRO',
  QUOTATION: 'DEV',
  CREDIT_NOTE: 'AVR',
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, 'invoices', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } as Invoice : null
}

export async function getInvoices(tenantId: string, lastDoc?: any, pageSize = 25) {
  const db = await getDb()
  let q = query(
    collection(db, 'invoices'),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1),
  )
  if (lastDoc) q = query(q, startAfter(lastDoc))
  const snap = await getDocs(q)
  const docs = snap.docs.slice(0, pageSize)
  return {
    items: docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

export async function getInvoiceByNumber(tenantId: string, number: string) {
  const db = await getDb()
  const snap = await getDocs(
    query(collection(db, 'invoices'), where('tenantId', '==', tenantId), where('number', '==', number)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice))[0] || null
}
