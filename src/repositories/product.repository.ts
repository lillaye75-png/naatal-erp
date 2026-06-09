import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, addDoc, deleteDoc, where, orderBy, limit, startAfter, Timestamp, runTransaction } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { Product, Category, Brand, Unit } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getProducts(tenantId: string, lastDoc?: any, pageSize = 20) {
  const db = await getDb()
  let q = query(
    collection(db, 'products'),
    where('tenantId', '==', tenantId),
    where('isDeleted', '==', false),
    orderBy('name'),
    limit(pageSize + 1),
  )
  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }
  const snap = await getDocs(q)
  const docs = snap.docs.slice(0, pageSize)
  return {
    items: docs.map((d) => ({ id: d.id, ...d.data() } as Product)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, 'products', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Product
}

export async function createProduct(data: Record<string, any>, userId: string) {
  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()
  const initialStock = Number(data.initialStock) || 0
  const { initialStock: _, ...productData } = data

  const ref = await addDoc(collection(db, 'products'), {
    ...productData,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
    isDeleted: false,
    status: 'ACTIVE',
  })

  if (initialStock > 0) {
    const movRef = doc(collection(db, 'inventory_movements'))
    await setDoc(movRef, {
      id: movRef.id,
      productId: ref.id,
      type: 'ADJUSTMENT',
      qty: initialStock,
      balance: initialStock,
      note: 'Stock initial',
      referenceId: ref.id,
      warehouseId: data.warehouseId || '',
      tenantId: data.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      isDeleted: false,
      status: 'ACTIVE',
    })
  }

  return ref.id
}

export async function updateProduct(id: string, data: Partial<Product>, userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'products', id), {
    ...data,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}

export async function deleteProduct(id: string, userId: string) {
  const db = await getDb()
  await updateDoc(doc(db, 'products', id), {
    isDeleted: true,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}

export async function getCategories(tenantId: string) {
  const db = await getDb()
  const snap = await getDocs(
    query(collection(db, 'categories'), where('tenantId', '==', tenantId)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
}

export async function createCategory(data: Omit<Category, 'id'>) {
  const db = await getDb()
  const ref = await addDoc(collection(db, 'categories'), data)
  return ref.id
}

export async function getBrands(tenantId?: string) {
  const db = await getDb()
  const constraints = tenantId ? [where('tenantId', '==', tenantId)] : []
  const snap = await getDocs(query(collection(db, 'brands'), ...constraints))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Brand))
}

export async function getUnits(tenantId?: string) {
  const db = await getDb()
  const constraints = tenantId ? [where('tenantId', '==', tenantId)] : []
  const snap = await getDocs(query(collection(db, 'units'), ...constraints))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Unit))
}
