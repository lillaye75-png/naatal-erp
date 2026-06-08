import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { initializeFirebase } from '@/lib/firebase'
import { ROLES } from '@/constants/roles'

async function getFirebase() {
  return initializeFirebase()
}

function mapFirebaseUser(fbUser: any): any {
  return {
    id: fbUser.uid,
    email: fbUser.email || '',
    displayName: fbUser.displayName || '',
    tenantId: fbUser.tenantId || null,
  }
}

async function setCustomClaims(userId: string, claims: Record<string, string>) {
  if (typeof window === 'undefined') return
  const { auth } = await getFirebase()
  const currentUser = auth.currentUser
  if (!currentUser) return
  const idToken = await currentUser.getIdToken()
  await fetch('/api/auth/set-claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, claims }),
  })
  await currentUser.getIdTokenResult(true)
}

export async function login(email: string, password: string) {
  const { auth, db } = await getFirebase()
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const fbUser = mapFirebaseUser(credential.user)
  const tokenResult = await credential.user.getIdTokenResult().catch(() => null)
  if (tokenResult?.claims?.tenantId) {
    fbUser.tenantId = tokenResult.claims.tenantId
  } else {
    try {
      const userDoc = await getDoc(doc(db, 'users', credential.user.uid))
      if (userDoc.exists()) {
        fbUser.tenantId = userDoc.data().tenantId
        await setCustomClaims(credential.user.uid, {
          tenantId: fbUser.tenantId,
          role: userDoc.data().roleId || 'OWNER',
        })
      }
    } catch {
      // tenantId will be loaded via onAuthChange listener
    }
  }
  return fbUser
}

export async function register(
  email: string,
  password: string,
  businessName: string,
  phone: string,
) {
  const { auth, db } = await getFirebase()
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const userId = credential.user.uid

  const tenantId = userId

  await setCustomClaims(userId, { tenantId, role: 'OWNER' })

  const tenantRef = doc(db, 'tenants', userId)
  await setDoc(tenantRef, {
    name: businessName,
    plan: 'FREE',
    currency: 'XOF',
    country: 'SN',
    logoUrl: '',
    language: 'fr',
    locale: 'fr-SN',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(doc(db, 'users', userId), {
    email,
    displayName: businessName,
    phone,
    tenantId,
    roleId: ROLES.OWNER,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return { userId, tenantId }
}

export async function resetPassword(email: string) {
  const { auth } = await getFirebase()
  await sendPasswordResetEmail(auth, email)
}

export async function logout() {
  const { auth } = await getFirebase()
  await signOut(auth)
}

export function onAuthChange(callback: (user: any) => void) {
  let unsub: (() => void) | null = null
  let cancelled = false

  initializeFirebase().then(({ auth, db }) => {
    if (cancelled) return
    unsub = onAuthStateChanged(auth, async (fbUser: any) => {
      if (fbUser) {
        const userData = mapFirebaseUser(fbUser)
        try {
          const tokenResult = await fbUser.getIdTokenResult()
          if (tokenResult.claims?.tenantId) {
            userData.tenantId = tokenResult.claims.tenantId
          }
        } catch {}
        if (!userData.tenantId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
            if (userDoc.exists()) {
              userData.tenantId = userDoc.data().tenantId
            }
          } catch {}
        }
        if (!cancelled) callback(userData)
      } else {
        if (!cancelled) callback(null)
      }
    })
  })

  return () => {
    cancelled = true
    if (unsub) unsub()
  }
}
