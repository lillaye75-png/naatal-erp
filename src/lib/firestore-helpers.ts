import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore'
import { initializeFirebase } from './firebase'

export function withTenant(tenantId: string): QueryConstraint[] {
  return [where('tenantId', '==', tenantId), where('isDeleted', '==', false)]
}

export function withTenantAndStatus(tenantId: string, status: string): QueryConstraint[] {
  return [where('tenantId', '==', tenantId), where('status', '==', status), where('isDeleted', '==', false)]
}

export async function softDelete(collectionName: string, id: string, userId: string): Promise<void> {
  const { db } = await initializeFirebase()
  const ref = doc(db, collectionName, id)
  await updateDoc(ref, {
    isDeleted: true,
    updatedAt: Timestamp.now().toMillis().toString(),
    updatedBy: userId,
  })
}

export async function hardDelete(collectionName: string, id: string): Promise<void> {
  const { db } = await initializeFirebase()
  const ref = doc(db, collectionName, id)
  await deleteDoc(ref)
}

export interface PaginationResult<T> {
  items: T[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
}

export async function paginate<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  pageSize: number,
  lastDoc?: DocumentSnapshot | null,
): Promise<PaginationResult<T>> {
  const { db } = await initializeFirebase()
  const baseConstraints = [...constraints, orderBy('createdAt', 'desc'), limit(pageSize + 1)]
  if (lastDoc) {
    baseConstraints.push(startAfter(lastDoc))
  }
  const q = query(collection(db, collectionName), ...baseConstraints)
  const snapshot = await getDocs(q)
  const docs = snapshot.docs.slice(0, pageSize)
  return {
    items: docs.map((d) => ({ id: d.id, ...d.data() } as T)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  }
}

export function nowISO(): string {
  return Timestamp.now().toMillis().toString()
}

export function timestampToDate(ts: string): Date {
  return new Date(parseInt(ts, 10))
}
