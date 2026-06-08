import { collection, doc, addDoc, getDocs, query, where, orderBy, limit, startAfter, Timestamp, runTransaction, increment } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { InventoryMovement, StockAdjustment, Warehouse } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getMovements(productId: string, lastDoc?: any, pageSize = 50) {
  const db = await getDb()
  let q = query(
    collection(db, 'inventory_movements'),
    where('productId', '==', productId),
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1),
  )
  if (lastDoc) q = query(q, startAfter(lastDoc))
  const snap = await getDocs(q)
  const docs = snap.docs.slice(0, pageSize)
  return {
    items: docs.map((d) => ({ id: d.id, ...d.data() } as InventoryMovement)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

export async function getStockLevel(productId: string): Promise<number> {
  const db = await getDb()
  const snap = await getDocs(
    query(collection(db, 'inventory_movements'), where('productId', '==', productId)),
  )
  return snap.docs.reduce((sum, d) => sum + (d.data().qty || 0), 0)
}

export async function adjustStock(data: {
  productId: string
  reason: string
  qtyChange: number
  note: string
  tenantId: string
  userId: string
}) {
  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()

  const currentStock = await getStockLevel(data.productId)
  const newBalance = currentStock + data.qtyChange

  await runTransaction(db, async (transaction) => {
    const adjustmentRef = doc(collection(db, 'stock_adjustments'))
    transaction.set(adjustmentRef, {
      id: adjustmentRef.id,
      productId: data.productId,
      reason: data.reason,
      qtyBefore: currentStock,
      qtyAfter: newBalance,
      userId: data.userId,
      tenantId: data.tenantId,
      createdAt: now,
    })

    const movementRef = doc(collection(db, 'inventory_movements'))
    transaction.set(movementRef, {
      id: movementRef.id,
      productId: data.productId,
      type: 'ADJUSTMENT',
      qty: data.qtyChange,
      balance: newBalance,
      note: data.note || data.reason,
      referenceId: adjustmentRef.id,
      warehouseId: '',
      tenantId: data.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: data.userId,
      isDeleted: false,
      status: 'ACTIVE',
    })
  })
}

export async function getLowStockProducts(tenantId: string) {
  const db = await getDb()
  const snap = await getDocs(
    query(
      collection(db, 'products'),
      where('tenantId', '==', tenantId),
      where('isDeleted', '==', false),
    ),
  )
  const products = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any))
  const lowStock: Array<{ id: string; name: string; stock: number; minStock: number }> = []

  for (const p of products) {
    const stock = await getStockLevel(p.id)
    if (stock <= (p.minStock || 0)) {
      lowStock.push({ id: p.id, name: p.name, stock, minStock: p.minStock || 0 })
    }
  }

  return lowStock.sort((a, b) => a.stock - b.stock)
}
