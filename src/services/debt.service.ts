import { collection, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, runTransaction } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { createAuditLog } from './audit.service'
import type { Sale } from '@/types'
import { formatXOF } from '@/lib/currency'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getDebts(tenantId: string) {
  const db = await getDb()
  const q = query(
    collection(db, 'sales'),
    where('tenantId', '==', tenantId),
    where('paymentStatus', 'in', ['UNPAID', 'PARTIAL']),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale))
}

export async function recordPayment(saleId: string, amount: number, userId: string, tenantId: string) {
  const db = await getDb()

  const now = Timestamp.now().toMillis().toString()

  await runTransaction(db, async (transaction) => {
    const saleRef = doc(db, 'sales', saleId)
    const snap = await transaction.get(saleRef)
    if (!snap.exists()) throw new Error('Sale not found')

    const sale = snap.data() as Sale
    const amountAlreadyPaid = (sale as any).amountPaid || 0
    const newPaid = amountAlreadyPaid + amount
    const newStatus = newPaid >= sale.total ? 'PAID' : 'PARTIAL'

    transaction.update(saleRef, {
      amountPaid: newPaid,
      paymentStatus: newStatus,
      updatedAt: now,
    })

    if (amount > 0) {
      const paymentRef = doc(collection(db, 'payments'))
      transaction.set(paymentRef, {
        id: paymentRef.id,
        saleId,
        amount,
        method: 'CASH',
        userId,
        tenantId,
        createdAt: now,
      })
    }
  })

  createAuditLog({
    tenantId,
    userId,
    userName: '',
    action: 'RECORD_PAYMENT',
    resource: 'debts',
    resourceId: saleId,
    details: `Paiement de dette de ${formatXOF(amount)} pour la vente ${saleId}`,
  }).catch(console.error)
}
