import { collection, doc, getDocs, getDoc, query, updateDoc, setDoc, where, orderBy, Timestamp, runTransaction } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Order } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getOrders(tenantId: string) {
  const db = await getDb()
  const snap = await getDocs(query(
    collection(db, 'orders'),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc'),
  ))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))
}

export async function updateOrderStatus(orderId: string, status: string, userId: string) {
  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()

  await updateDoc(doc(db, 'orders', orderId), {
    status,
    updatedAt: now,
    updatedBy: userId,
  })

  if (status === 'DELIVERED') {
    const orderSnap = await getDoc(doc(db, 'orders', orderId))
    if (!orderSnap.exists()) return
    const order = orderSnap.data() as Order

    const saleRef = doc(collection(db, 'sales'))
    const invoiceRef = doc(collection(db, 'invoices'))
    const counterRef = doc(db, 'counters', `invoice_${order.tenantId}_INV`)
    const counterSnap = await getDoc(counterRef)
    const invoiceNumber = counterSnap.exists() ? (counterSnap.data()?.value || 0) + 1 : 1

    await setDoc(counterRef, { value: invoiceNumber, tenantId: order.tenantId }, { merge: true })

    const saleId = saleRef.id
    const invoiceId = invoiceRef.id
    const invoiceNum = `INV-${String(invoiceNumber).padStart(4, '0')}`

    const saleData = {
      id: saleId,
      customerId: '',
      customerName: order.customerName,
      items: order.items.map((item, idx) => ({
        id: `${saleId}-item-${idx}`,
        saleId,
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        unitPrice: item.price,
        total: item.qty * item.price,
      })),
      subtotal: order.total,
      discount: 0,
      tax: 0,
      total: order.total,
      amountPaid: order.total,
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      invoiceId,
      note: `Commande en ligne #${order.trackingId}`,
      cashRegisterId: '',
      tenantId: order.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      isDeleted: false,
      status: 'ACTIVE',
      invoiceType: 'INVOICE',
    }

    const invoiceData = {
      id: invoiceId,
      number: invoiceNum,
      saleId,
      customerId: '',
      total: order.total,
      dueDate: '',
      printCount: 0,
      whatsappSent: false,
      invoiceType: 'INVOICE',
      tenantId: order.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      isDeleted: false,
      status: 'ACTIVE',
    }

    await setDoc(saleRef, saleData)
    await setDoc(invoiceRef, invoiceData)
    await updateDoc(doc(db, 'sales', saleId), { invoiceId })

    for (const item of order.items) {
      const movRef = doc(collection(db, 'inventory_movements'))
      await setDoc(movRef, {
        id: movRef.id,
        productId: item.productId,
        type: 'SALE',
        qty: -item.qty,
        balance: 0,
        note: `Commande en ligne ${invoiceNum}`,
        referenceId: saleId,
        warehouseId: '',
        tenantId: order.tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        isDeleted: false,
        status: 'ACTIVE',
      })
    }

    const paymentRef = doc(collection(db, 'payments'))
    await setDoc(paymentRef, {
      id: paymentRef.id,
      saleId,
      invoiceId,
      amount: order.total,
      method: 'CASH',
      reference: '',
      cashRegisterId: '',
      tenantId: order.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      isDeleted: false,
      status: 'ACTIVE',
    })
  }
}
