import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { nowISO } from '@/lib/firestore-helpers'
import type { Tenant } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, 'tenants', tenantId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Tenant
}

export async function updateTenant(
  tenantId: string,
  data: Partial<Tenant>,
  userId: string,
): Promise<void> {
  const db = await getDb()
  await updateDoc(doc(db, 'tenants', tenantId), {
    ...data,
    updatedAt: nowISO(),
    updatedBy: userId,
  })
}

export async function createTenant(
  tenantId: string,
  data: Omit<Tenant, 'id'>,
  userId: string,
): Promise<void> {
  const db = await getDb()
  await setDoc(doc(db, 'tenants', tenantId), {
    ...data,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    createdBy: userId,
    updatedBy: userId,
    isDeleted: false,
    status: 'ACTIVE',
  })
}
