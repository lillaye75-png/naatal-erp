import { collection, doc, getDocs, query, where, Timestamp, runTransaction } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { fetchMovements, fetchStockLevel } from '@/repositories/inventory.repository'
import type { InventoryMovement, StockAdjustment, Warehouse } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getMovements(productId: string, tenantId: string, lastDoc?: any, pageSize = 50) {
  return fetchMovements(productId, tenantId, lastDoc, pageSize)
}

export async function getStockLevel(productId: string, tenantId: string, warehouseId?: string): Promise<number> {
  return fetchStockLevel(productId, tenantId, warehouseId)
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

  const currentStock = await getStockLevel(data.productId, data.tenantId)
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

export async function transferStock(data: {
  productId: string
  productName: string
  fromWarehouseId: string
  toWarehouseId: string
  qty: number
  tenantId: string
  userId: string
}) {
  if (data.fromWarehouseId === data.toWarehouseId) throw new Error('Les entrepôts doivent être différents')
  if (data.qty <= 0) throw new Error('La quantité doit être positive')

  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()

  const sourceStock = await getStockLevel(data.productId, data.tenantId, data.fromWarehouseId)
  if (data.qty > sourceStock) throw new Error(`Stock insuffisant dans l'entrepôt source (${sourceStock} disponible)`)

  await runTransaction(db, async (transaction) => {
    // Out movement from source warehouse
    const outRef = doc(collection(db, 'inventory_movements'))
    transaction.set(outRef, {
      id: outRef.id,
      productId: data.productId,
      type: 'TRANSFER',
      qty: -data.qty,
      balance: sourceStock - data.qty,
      note: `Transfert sortant vers ${data.toWarehouseId}`,
      referenceId: '',
      warehouseId: data.fromWarehouseId,
      tenantId: data.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: data.userId,
      isDeleted: false,
      status: 'ACTIVE',
    })

    // In movement to destination warehouse
    const destStock = await getStockLevel(data.productId, data.tenantId, data.toWarehouseId)
    const inRef = doc(collection(db, 'inventory_movements'))
    transaction.set(inRef, {
      id: inRef.id,
      productId: data.productId,
      type: 'TRANSFER',
      qty: data.qty,
      balance: destStock + data.qty,
      note: `Transfert entrant depuis ${data.fromWarehouseId}`,
      referenceId: '',
      warehouseId: data.toWarehouseId,
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
    const stock = await getStockLevel(p.id, tenantId)
    if (stock <= (p.minStock || 0)) {
      lowStock.push({ id: p.id, name: p.name, stock, minStock: p.minStock || 0 })
    }
  }

  return lowStock.sort((a, b) => a.stock - b.stock)
}
