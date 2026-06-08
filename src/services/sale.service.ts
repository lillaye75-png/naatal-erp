import { collection, doc, runTransaction, Timestamp, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { createAuditLog } from './audit.service'
import { enqueueWrite } from '@/lib/offline-queue'
import { useOfflineStore } from '@/stores/offline.store'
import type { Sale, Invoice, Customer } from '@/types'
import { formatXOF } from '@/lib/currency'
import { toast } from 'sonner'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

async function getProductStock(productId: string, tenantId?: string): Promise<number> {
  const db = await getDb()
  const conditions = [where('productId', '==', productId), where('isDeleted', '==', false)]
  if (tenantId) conditions.push(where('tenantId', '==', tenantId))
  const snap = await getDocs(query(collection(db, 'inventory_movements'), ...conditions))
  return snap.docs.reduce((sum, d) => sum + (d.data().qty || 0), 0)
}

const INVOICE_PREFIX: Record<string, string> = {
  INVOICE: 'INV',
  PROFORMA: 'PRO',
  QUOTATION: 'DEV',
  CREDIT_NOTE: 'AVR',
}

export async function createSale(params: {
  tenantId: string
  userId: string
  customerId: string
  items: Array<{ productId: string; qty: number; unitPrice: number; productName?: string }>
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: 'CASH' | 'WAVE' | 'OM' | 'CARD' | 'DEBT'
  amountPaid: number
  cashRegisterId?: string
  note?: string
  invoiceType?: 'INVOICE' | 'PROFORMA' | 'QUOTATION' | 'CREDIT_NOTE'
}) {
  const invoiceType = params.invoiceType || 'INVOICE'
  const skipStock = invoiceType === 'PROFORMA' || invoiceType === 'QUOTATION'

  const store = useOfflineStore.getState()

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueWrite(
      'sales',
      'create',
      {
        ...params,
        paymentStatus: params.amountPaid >= params.total ? 'PAID' : params.amountPaid > 0 ? 'PARTIAL' : 'UNPAID',
        createdAt: Date.now().toString(),
      },
      params.tenantId,
    )
    store.refreshPendingCount().catch(console.error)
    toast.success('Sauvegardé en mode hors-ligne — sera synchronisé automatiquement')
    return { saleId: 'offline', invoiceId: 'offline', invoiceNumber: 'OFFLINE' }
  }

  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()

  if (!skipStock) {
    for (const item of params.items) {
      const stock = await getProductStock(item.productId, params.tenantId)
      if (item.qty > stock) {
        throw new Error(`Stock insuffisant pour ${item.productName || item.productId}`)
      }
    }
  }

  return runTransaction(db, async (transaction) => {
    const saleRef = doc(collection(db, 'sales'))
    const paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'PENDING' =
      params.paymentMethod === 'WAVE' || params.paymentMethod === 'OM'
        ? 'PENDING'
        : params.amountPaid >= params.total ? 'PAID'
        : params.amountPaid > 0 ? 'PARTIAL' : 'UNPAID'

    const saleData: Sale = {
      id: saleRef.id,
      customerId: params.customerId,
      items: params.items.map((i, idx) => ({
        id: `${saleRef.id}-item-${idx}`,
        saleId: saleRef.id,
        productId: i.productId,
        qty: i.qty,
        unitPrice: i.unitPrice,
        total: i.qty * i.unitPrice,
      })),
      subtotal: params.subtotal,
      discount: params.discount,
      tax: params.tax,
      total: params.total,
      amountPaid: params.amountPaid || 0,
      paymentStatus,
      paymentMethod: params.paymentMethod,
      invoiceId: '',
      note: params.note || '',
      cashRegisterId: params.cashRegisterId || '',
      tenantId: params.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: params.userId,
      updatedBy: params.userId,
      isDeleted: false,
      status: 'ACTIVE',
      invoiceType,
    }
    transaction.set(saleRef, saleData)

    const prefix = INVOICE_PREFIX[invoiceType] || 'INV'
    const counterRef = doc(db, 'counters', `invoice_${params.tenantId}_${prefix}`)
    const counterSnap = await transaction.get(counterRef)
    const invoiceNumber = counterSnap.exists() ? (counterSnap.data()?.value || 0) + 1 : 1
    transaction.set(counterRef, { value: invoiceNumber, tenantId: params.tenantId }, { merge: true })

    const invoiceRef = doc(collection(db, 'invoices'))
    const invoiceData: Invoice = {
      id: invoiceRef.id,
      number: `${prefix}-${String(invoiceNumber).padStart(4, '0')}`,
      saleId: saleRef.id,
      customerId: params.customerId,
      total: params.total,
      dueDate: params.paymentMethod === 'DEBT'
        ? Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toMillis().toString()
        : '',
      printCount: 0,
      whatsappSent: false,
      invoiceType,
      tenantId: params.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: params.userId,
      updatedBy: params.userId,
      isDeleted: false,
      status: 'ACTIVE',
    }
    transaction.set(invoiceRef, invoiceData)
    transaction.update(saleRef, { invoiceId: invoiceRef.id })

    if (params.amountPaid > 0) {
      const paymentRef = doc(collection(db, 'payments'))
      transaction.set(paymentRef, {
        id: paymentRef.id,
        saleId: saleRef.id,
        invoiceId: invoiceRef.id,
        amount: params.amountPaid,
        method: params.paymentMethod === 'DEBT' ? 'CASH' : params.paymentMethod,
        reference: '',
        cashRegisterId: params.cashRegisterId || '',
        tenantId: params.tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: params.userId,
        updatedBy: params.userId,
        isDeleted: false,
        status: 'ACTIVE',
      })
    }

    if (!skipStock) {
      for (const item of params.items) {
        const movRef = doc(collection(db, 'inventory_movements'))
        transaction.set(movRef, {
          id: movRef.id,
          productId: item.productId,
          type: 'SALE',
          qty: -item.qty,
          balance: 0,
          note: `Vente ${invoiceData.number}`,
          referenceId: saleRef.id,
          warehouseId: '',
          tenantId: params.tenantId,
          createdAt: now,
          updatedAt: now,
          createdBy: params.userId,
          updatedBy: params.userId,
          isDeleted: false,
          status: 'ACTIVE',
        })
      }
    }

    if (paymentStatus !== 'PAID' && params.customerId) {
      const customerRef = doc(db, 'customers', params.customerId)
      try {
        const custSnap = await transaction.get(customerRef)
        if (custSnap.exists()) {
          const cust = custSnap.data() as Customer
          transaction.update(customerRef, {
            totalDebt: (cust.totalDebt || 0) + (params.total - params.amountPaid),
            updatedAt: now,
          })
        }
      } catch { null }
    }

    const result = { saleId: saleRef.id, invoiceId: invoiceRef.id, invoiceNumber: invoiceData.number }

    createAuditLog({
      tenantId: params.tenantId,
      userId: params.userId,
      userName: '',
      action: 'CREATE_SALE',
      resource: 'sales',
      resourceId: saleRef.id,
      details: `Vente ${invoiceData.number} - ${formatXOF(params.total)} (${params.paymentMethod})`,
    }).catch(console.error)

    return result
  })
}

export async function getSales(tenantId: string, lastDoc?: any, pageSize = 25) {
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
