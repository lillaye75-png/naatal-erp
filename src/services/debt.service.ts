import { collection, getDocs, query, where, orderBy, Timestamp, doc, runTransaction } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { createAuditLog } from './audit.service'
import type { Sale, Customer } from '@/types'
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
    where('isDeleted', '==', false),
    where('paymentStatus', 'in', ['UNPAID', 'PARTIAL']),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale))
    .filter((s) => s.invoiceType !== 'PROFORMA' && s.invoiceType !== 'QUOTATION' && s.invoiceType !== 'CREDIT_NOTE')
    .sort((a, b) => parseInt(b.createdAt || '0') - parseInt(a.createdAt || '0'))
}

export async function recordPayment(saleId: string, amount: number, userId: string, tenantId: string, method: 'CASH' | 'WAVE' | 'OM' | 'CARD' = 'CASH') {
  const db = await getDb()

  const now = Timestamp.now().toMillis().toString()

  await runTransaction(db, async (transaction) => {
    const saleRef = doc(db, 'sales', saleId)
    const snap = await transaction.get(saleRef)
    if (!snap.exists()) throw new Error('Sale not found')

    const sale = snap.data() as Sale
    const amountAlreadyPaid = sale.amountPaid || 0
    const newPaid = amountAlreadyPaid + amount
    const newStatus = newPaid >= sale.total ? 'PAID' : 'PARTIAL'

    transaction.update(saleRef, {
      amountPaid: newPaid,
      paymentStatus: newStatus,
      updatedAt: now,
      updatedBy: userId,
    })

    if (amount > 0) {
      const paymentRef = doc(collection(db, 'payments'))
      transaction.set(paymentRef, {
        id: paymentRef.id,
        saleId,
        invoiceId: sale.invoiceId || '',
        amount,
        method,
        reference: '',
        cashRegisterId: sale.cashRegisterId || '',
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        isDeleted: false,
        status: 'ACTIVE',
      })
    }

    if (sale.customerId) {
      const customerRef = doc(db, 'customers', sale.customerId)
      const custSnap = await transaction.get(customerRef)
      if (custSnap.exists()) {
        const cust = custSnap.data() as Customer
        const currentDebt = cust.totalDebt || 0
        transaction.update(customerRef, { totalDebt: Math.max(0, currentDebt - amount), updatedAt: now })
      }
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
  })
}
