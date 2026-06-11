import { collection, doc, addDoc, updateDoc, runTransaction, Timestamp, query, where, orderBy, getDocs, getDoc } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { PurchaseOrder } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function createPurchaseOrder(params: {
  supplierId: string
  items: Array<{ productId: string; productName?: string; qty: number; unitCost: number }>
  total: number
  notes?: string
  userId: string
  tenantId: string
  status?: string
}) {
  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()

  const ref = await addDoc(collection(db, 'purchase_orders'), {
    supplierId: params.supplierId,
    items: params.items.map((i, idx) => ({
      id: `${idx}`,
      purchaseId: '',
      productId: i.productId,
      qty: i.qty,
      unitCost: i.unitCost,
      total: i.qty * i.unitCost,
    })),
    total: params.total,
    status: params.status || 'DRAFT',
    notes: params.notes || '',
    tenantId: params.tenantId,
    createdAt: now,
    updatedAt: now,
    createdBy: params.userId,
    updatedBy: params.userId,
    isDeleted: false,
  })

  return ref.id
}

export async function approvePurchaseOrder(orderId: string, userId: string) {
  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()
  await updateDoc(doc(db, 'purchase_orders', orderId), {
    status: 'APPROVED',
    updatedAt: now,
    updatedBy: userId,
  })
}

export async function cancelPurchaseOrder(orderId: string, userId: string) {
  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()
  await updateDoc(doc(db, 'purchase_orders', orderId), {
    status: 'CANCELLED',
    updatedAt: now,
    updatedBy: userId,
  })
}

export async function receivePurchaseOrder(
  orderId: string,
  userId: string,
  tenantId: string,
) {
  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()

  return runTransaction(db, async (transaction) => {
    const orderRef = doc(db, 'purchase_orders', orderId)
    const orderSnap = await transaction.get(orderRef)
    if (!orderSnap.exists()) throw new Error('Bon de commande introuvable')

    const order = orderSnap.data() as PurchaseOrder
    const isFullReceive = !order.items.some((item) => false)
    transaction.update(orderRef, {
      status: isFullReceive ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
      updatedAt: now,
      updatedBy: userId,
    })

    for (const item of order.items) {
      const movRef = doc(collection(db, 'inventory_movements'))
      transaction.set(movRef, {
        id: movRef.id,
        productId: item.productId,
        type: 'PURCHASE',
        qty: item.qty,
        balance: 0,
        note: `Réception BL ${orderId}`,
        referenceId: orderId,
        warehouseId: '',
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        isDeleted: false,
        status: 'ACTIVE',
      })
    }

    return orderId
  })
}

export async function getPurchaseOrders(tenantId: string) {
  const db = await getDb()
  const snap = await getDocs(
    query(
      collection(db, 'purchase_orders'),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc'),
    ),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PurchaseOrder))
}
