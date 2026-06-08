import { collection, addDoc, updateDoc, doc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Notification } from '@/types'
import { formatXOF } from '@/lib/currency'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  const db = await getDb()
  const ref = await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    title,
    body,
    isRead: false,
    link: link || '',
    createdAt: Timestamp.now().toMillis().toString(),
  })
  return ref.id
}

export async function markAsRead(notificationId: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'notifications', notificationId), {
    isRead: true,
  })
}

export async function markAllAsRead(userId: string) {
  const db = await getDb()
  const { getDocs } = await import('firebase/firestore')
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false),
    ),
  )
  const updates = snap.docs.map((d) =>
    updateDoc(doc(db, 'notifications', d.id), { isRead: true }),
  )
  await Promise.all(updates)
}

export function buildNotificationsQuery(db: any, userId: string) {
  return query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20),
  )
}

export function createLowStockNotification(
  userId: string,
  productName: string,
  stock: number,
) {
  return createNotification(
    userId,
    'LOW_STOCK',
    'Stock faible',
    `${productName} — ${stock} unité(s) restante(s)`,
    '/products',
  )
}

export function createPaymentNotification(
  userId: string,
  amount: number,
  customerName: string,
) {
  return createNotification(
    userId,
    'PAYMENT',
    'Paiement reçu',
    `${customerName} — ${formatXOF(amount)}`,
    '/sales',
  )
}

export function createDebtNotification(
  userId: string,
  customerName: string,
  amount: number,
) {
  return createNotification(
    userId,
    'DEBT',
    'Dette enregistrée',
    `${customerName} — ${formatXOF(amount)}`,
    '/debt',
  )
}
