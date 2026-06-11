import { collection, doc, runTransaction, Timestamp, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { createAuditLog } from './audit.service'
import { INVOICE_PREFIX } from './invoice.service'
import { enqueueWrite } from '@/lib/offline-queue'
import { useOfflineStore } from '@/stores/offline.store'
import { fetchStockLevel } from '@/repositories/inventory.repository'
import type { Sale, Invoice, Customer } from '@/types'
import { formatXOF } from '@/lib/currency'
import { toast } from 'sonner'
import { createPaymentNotification } from './notification.service'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

async function getProductStock(productId: string, tenantId?: string): Promise<number> {
  if (!tenantId) return 0
  return fetchStockLevel(productId, tenantId)
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
  skipStock?: boolean
  customerName?: string
}) {
  const invoiceType = params.invoiceType || 'INVOICE'
  const nonInvoice = invoiceType === 'PROFORMA' || invoiceType === 'QUOTATION' || invoiceType === 'CREDIT_NOTE'
  const skipStock = params.skipStock || nonInvoice

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
    store.refreshPendingCount()
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

  const saleResult = await runTransaction(db, async (transaction) => {
    const saleRef = doc(collection(db, 'sales'))
    const paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'PENDING' =
      nonInvoice ? 'UNPAID'
        : params.paymentMethod === 'WAVE' || params.paymentMethod === 'OM'
          ? 'PENDING'
          : params.amountPaid >= params.total ? 'PAID'
          : params.amountPaid > 0 ? 'PARTIAL' : 'UNPAID'

    const prefix = INVOICE_PREFIX[invoiceType] || 'INV'
    const counterRef = doc(db, 'counters', `invoice_${params.tenantId}_${prefix}`)
    const counterSnap = await transaction.get(counterRef)
    const invoiceNumber = counterSnap.exists() ? (counterSnap.data()?.value || 0) + 1 : 1

    let customerData: Customer | null = null
    if (paymentStatus !== 'PAID' && params.customerId) {
      const customerRef = doc(db, 'customers', params.customerId)
      try {
        const custSnap = await transaction.get(customerRef)
        if (custSnap.exists()) {
          customerData = custSnap.data() as Customer
        }
      } catch { null }
    }

    const saleData: Sale = {
      id: saleRef.id,
      customerId: params.customerId,
      items: params.items.map((i, idx) => ({
        id: `${saleRef.id}-item-${idx}`,
        saleId: saleRef.id,
        productId: i.productId,
        name: i.productName || '',
        qty: i.qty,
        unitPrice: i.unitPrice,
        total: i.qty * i.unitPrice,
      })),
      subtotal: params.subtotal,
      discount: params.discount,
      tax: params.tax,
      total: params.total,
      amountPaid: nonInvoice ? 0 : (params.amountPaid || 0),
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

    if (params.amountPaid > 0 && !nonInvoice) {
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

    if (customerData && !nonInvoice) {
      const customerRef = doc(db, 'customers', params.customerId)
      transaction.update(customerRef, {
        totalDebt: (customerData.totalDebt || 0) + (params.total - params.amountPaid),
        updatedAt: now,
      })
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
    })

    return result
  })

  if (params.amountPaid > 0 && !nonInvoice) {
    createPaymentNotification(params.userId, params.tenantId, params.amountPaid, params.customerName || 'Client').catch(console.error)
  }

  return saleResult
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
