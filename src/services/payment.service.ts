import { collection, doc, runTransaction, Timestamp, where, orderBy, limit, startAfter } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { createAuditLog } from './audit.service'
import { fetchPayments } from '@/repositories/payment.repository'
import type { Sale } from '@/types'
import { formatXOF } from '@/lib/currency'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function recordPayment(params: {
  saleId: string
  amount: number
  method: 'CASH' | 'WAVE' | 'OM' | 'CARD'
  reference?: string
  userId: string
  tenantId: string
}) {
  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()

  return runTransaction(db, async (transaction) => {
    const saleRef = doc(db, 'sales', params.saleId)
    const saleSnap = await transaction.get(saleRef)
    if (!saleSnap.exists()) throw new Error('Vente introuvable')

    const sale = saleSnap.data()
    const oldPaid = sale.amountPaid || 0
    const newPaid = oldPaid + params.amount
    const newStatus = newPaid >= sale.total ? 'PAID' : 'PARTIAL'

    transaction.update(saleRef, {
      amountPaid: newPaid,
      paymentStatus: newStatus,
      updatedAt: now,
      updatedBy: params.userId,
    })

    const paymentRef = doc(collection(db, 'payments'))
    transaction.set(paymentRef, {
      id: paymentRef.id,
      saleId: params.saleId,
      invoiceId: sale.invoiceId || '',
      amount: params.amount,
      method: params.method,
      reference: params.reference || '',
      cashRegisterId: sale.cashRegisterId || '',
      tenantId: params.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: params.userId,
      updatedBy: params.userId,
      isDeleted: false,
      status: 'ACTIVE',
    })

    // Update customer debt (decrement on any payment, partial or full)
    if (sale.customerId) {
      const customerRef = doc(db, 'customers', sale.customerId)
      const custSnap = await transaction.get(customerRef)
      if (custSnap.exists()) {
        const cust = custSnap.data()
        transaction.update(customerRef, {
          totalDebt: Math.max(0, (cust.totalDebt || 0) - params.amount),
          updatedAt: now,
        })
      }
    }

    const result = { paymentId: paymentRef.id, paymentStatus: newStatus }

    createAuditLog({
      tenantId: params.tenantId,
      userId: params.userId,
      userName: '',
      action: 'RECORD_PAYMENT',
      resource: 'payments',
      resourceId: paymentRef.id,
      details: `Paiement de ${formatXOF(params.amount)} via ${params.method} pour la vente ${params.saleId}`,
    })

    return result
  })
}

export async function processWavePayment(
  saleId: string,
  amount: number,
  reference: string,
  tenantId: string,
  userId: string,
) {
  return recordPayment({
    saleId,
    amount,
    method: 'WAVE',
    reference,
    userId,
    tenantId,
  })
}

export async function processOrangeMoneyPayment(
  saleId: string,
  amount: number,
  reference: string,
  tenantId: string,
  userId: string,
) {
  return recordPayment({
    saleId,
    amount,
    method: 'OM',
    reference,
    userId,
    tenantId,
  })
}

export async function getPayments(tenantId: string, lastDoc?: any, pageSize = 25) {
  return fetchPayments(tenantId, lastDoc, pageSize)
}
