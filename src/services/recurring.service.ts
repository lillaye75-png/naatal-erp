import {
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { RecurringTransaction } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function createRecurring(
  data: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'status'>,
  userId: string,
): Promise<string> {
  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()
  const ref = await addDoc(collection(db, 'recurring_transactions'), {
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
    isDeleted: false,
    status: 'ACTIVE',
  })
  return ref.id
}

export async function updateRecurring(
  id: string,
  data: Partial<Omit<RecurringTransaction, 'id' | 'createdAt' | 'createdBy'>>,
  userId: string,
): Promise<void> {
  const db = await getDb()
  await updateDoc(doc(db, 'recurring_transactions', id), {
    ...data,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}

export async function deleteRecurring(id: string, userId: string): Promise<void> {
  const db = await getDb()
  await updateDoc(doc(db, 'recurring_transactions', id), {
    isDeleted: true,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}

export async function getRecurringByTenant(tenantId: string): Promise<RecurringTransaction[]> {
  const db = await getDb()
  const snap = await getDocs(
    query(
      collection(db, 'recurring_transactions'),
      where('tenantId', '==', tenantId),
      where('isDeleted', '==', false),
    ),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecurringTransaction))
}

function isDue(item: RecurringTransaction): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(parseInt(item.startDate, 10))
  if (today < start) return false
  if (item.endDate) {
    const end = new Date(parseInt(item.endDate, 10))
    if (today > end) return false
  }
  if (!item.isActive) return false

  const last = item.lastGenerated ? new Date(parseInt(item.lastGenerated, 10)) : null

  switch (item.frequency) {
    case 'DAILY': {
      if (!last) return true
      return today.getTime() !== last.getTime()
    }
    case 'WEEKLY': {
      if (item.dayOfWeek === undefined) return false
      if (today.getDay() !== item.dayOfWeek) return false
      if (!last) return true
      const diffWeeks = Math.floor((today.getTime() - last.getTime()) / (7 * 86400000))
      return diffWeeks >= 1
    }
    case 'MONTHLY': {
      if (!item.dayOfMonth) return false
      if (today.getDate() !== item.dayOfMonth) return false
      if (!last) return true
      const diffMonths =
        (today.getFullYear() - last.getFullYear()) * 12 + (today.getMonth() - last.getMonth())
      return diffMonths >= 1
    }
    case 'YEARLY': {
      if (!item.dayOfMonth || !item.month) return false
      if (today.getDate() !== item.dayOfMonth || today.getMonth() + 1 !== item.month) return false
      if (!last) return true
      return today.getFullYear() > last.getFullYear()
    }
    default:
      return false
  }
}

export async function generateDueTransactions(tenantId: string): Promise<number> {
  const db = await getDb()
  const items = await getRecurringByTenant(tenantId)
  const now = Timestamp.now().toMillis().toString()
  let count = 0

  for (const item of items) {
    if (!isDue(item)) continue

    if (item.type === 'EXPENSE') {
      await addDoc(collection(db, 'expenses'), {
        tenantId,
        category: item.categoryId || 'Autre',
        amount: item.amount,
        description: item.description || item.title,
        date: now,
        receipt: '',
        createdAt: now,
        updatedAt: now,
        createdBy: item.createdBy,
        updatedBy: item.createdBy,
        isDeleted: false,
        status: 'ACTIVE',
      })
    } else {
      await addDoc(collection(db, 'invoices'), {
        tenantId,
        number: `REC-${now}`,
        saleId: '',
        customerId: item.customerId || '',
        total: item.amount,
        dueDate: now,
        printCount: 0,
        whatsappSent: false,
        invoiceType: 'INVOICE',
        createdAt: now,
        updatedAt: now,
        createdBy: item.createdBy,
        updatedBy: item.createdBy,
        isDeleted: false,
        status: 'ACTIVE',
      })
    }

    await updateDoc(doc(db, 'recurring_transactions', item.id), {
      lastGenerated: now,
      updatedAt: now,
      updatedBy: item.createdBy,
    })
    count++
  }

  return count
}

export async function generateNow(item: RecurringTransaction): Promise<void> {
  const db = await getDb()
  const now = Timestamp.now().toMillis().toString()

  if (item.type === 'EXPENSE') {
    await addDoc(collection(db, 'expenses'), {
      tenantId: item.tenantId,
      category: item.categoryId || 'Autre',
      amount: item.amount,
      description: item.description || item.title,
      date: now,
      receipt: '',
      createdAt: now,
      updatedAt: now,
      createdBy: item.createdBy,
      updatedBy: item.createdBy,
      isDeleted: false,
      status: 'ACTIVE',
    })
  } else {
    await addDoc(collection(db, 'invoices'), {
      tenantId: item.tenantId,
      number: `REC-${now}`,
      saleId: '',
      customerId: item.customerId || '',
      total: item.amount,
      dueDate: now,
      printCount: 0,
      whatsappSent: false,
      invoiceType: 'INVOICE',
      createdAt: now,
      updatedAt: now,
      createdBy: item.createdBy,
      updatedBy: item.createdBy,
      isDeleted: false,
      status: 'ACTIVE',
    })
  }

  await updateDoc(doc(db, 'recurring_transactions', item.id), {
    lastGenerated: now,
    updatedAt: now,
    updatedBy: item.createdBy,
  })
}
