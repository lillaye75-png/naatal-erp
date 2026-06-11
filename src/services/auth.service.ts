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
import { logSession } from './session.service'

async function getFirebase() {
  return initializeFirebase()
}

import type { User as FirebaseUser } from 'firebase/auth'

interface MappedUser {
  id: string
  email: string
  displayName: string
  tenantId: string
}

function mapFirebaseUser(fbUser: FirebaseUser): MappedUser {
  return {
    id: fbUser.uid,
    email: fbUser.email || '',
    displayName: fbUser.displayName || '',
    tenantId: '',
  }
}

async function setCustomClaims(userId: string, claims: Record<string, string>) {
  if (typeof window === 'undefined') return
  const { auth } = await getFirebase()
  const currentUser = auth.currentUser
  if (!currentUser) return
  const idToken = await currentUser.getIdToken()
  const res = await fetch('/api/auth/set-claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, claims }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to set custom claims')
  }
  await currentUser.getIdTokenResult(true)
}

export async function login(email: string, password: string) {
  const { auth, db } = await getFirebase()
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const fbUser = mapFirebaseUser(credential.user)
  const tokenResult = await credential.user.getIdTokenResult().catch(() => null)
  if (tokenResult?.claims?.tenantId) {
    fbUser.tenantId = tokenResult.claims.tenantId as string
  } else {
    try {
      const userDoc = await getDoc(doc(db, 'users', credential.user.uid))
      if (userDoc.exists()) {
        fbUser.tenantId = userDoc.data().tenantId || ''
        await setCustomClaims(credential.user.uid, {
          tenantId: fbUser.tenantId,
          role: userDoc.data().roleId || 'OWNER',
        })
      }
    } catch (err) {
      console.error('Failed to load user tenantId on login:', err)
    }
  }
  logSession(fbUser.id, fbUser.tenantId, 'LOGIN')
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
  logSession(userId, tenantId, 'LOGIN')

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
  const user = auth.currentUser
  if (user) {
    try {
      const tokenResult = await user.getIdTokenResult()
      const tenantId = tokenResult.claims?.tenantId as string || ''
      logSession(user.uid, tenantId, 'LOGOUT')
    } catch {}
  }
  await signOut(auth)
}

export function onAuthChange(callback: (user: MappedUser | null) => void) {
  let unsub: (() => void) | null = null
  let cancelled = false

  initializeFirebase().then(({ auth, db }) => {
    if (cancelled) return
    unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const userData = mapFirebaseUser(fbUser)
        try {
          const tokenResult = await fbUser.getIdTokenResult()
          if (tokenResult.claims?.tenantId) {
            userData.tenantId = tokenResult.claims.tenantId as string
          }
        } catch (err) {
          console.error('Failed to get token claims:', err)
        }
        if (!userData.tenantId) {
          let tenantId = ''
          try {
            const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
            if (userDoc.exists()) {
              tenantId = userDoc.data().tenantId || ''
            }
          } catch (err) {
            console.error('Failed to fetch user doc:', err)
          }
          if (!tenantId) {
            try {
              const tenantSnap = await getDoc(doc(db, 'tenants', fbUser.uid))
              if (tenantSnap.exists()) {
                tenantId = fbUser.uid
              }
            } catch (err) {
              console.error('Failed to fetch tenant doc:', err)
            }
          }
          if (tenantId) {
            userData.tenantId = tenantId
            try {
              await setCustomClaims(fbUser.uid, {
                tenantId,
                role: 'OWNER',
              })
            } catch (err) {
              console.error('Failed to set custom claims:', err)
            }
          }
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
