import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'

export async function logSession(
  userId: string,
  tenantId: string,
  action: 'LOGIN' | 'LOGOUT',
) {
  try {
    const { db } = await initializeFirebase()
    const browser = typeof navigator !== 'undefined'
      ? `${navigator.userAgent.match(/Chrome|Firefox|Safari|Edge/i)?.[0] || 'Unknown'}`
      : 'Server'
    const device = typeof navigator !== 'undefined'
      ? (/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop')
      : 'Server'
    await addDoc(collection(db, 'session_logs'), {
      userId,
      tenantId,
      action,
      browser,
      device,
      ip: '',
      createdAt: Timestamp.now().toMillis().toString(),
    })
  } catch (err) {
    console.error('Session log error:', err)
  }
}
