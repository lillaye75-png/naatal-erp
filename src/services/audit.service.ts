import { collection, addDoc, Timestamp, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import type { AuditLog } from '@/types'

async function getDb() {
  const { db } = await initializeFirebase()
  return db
}

export async function createAuditLog(params: {
  tenantId: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId: string
  details?: string
}) {
  try {
    const db = await getDb()
    const now = Timestamp.now().toMillis().toString()
    await addDoc(collection(db, 'audit_logs'), {
      tenantId: params.tenantId,
      userId: params.userId,
      userName: params.userName || '',
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details || '',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      status: 'ACTIVE',
    })
  } catch (err) {
    console.error('Audit log failed (non-critical):', err)
  }
}

export async function getAuditLogs(
  tenantId: string,
  maxItems = 100,
): Promise<AuditLog[]> {
  const db = await getDb()
  const snap = await getDocs(
    query(
      collection(db, 'audit_logs'),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc'),
      limit(maxItems),
    ),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))
}
