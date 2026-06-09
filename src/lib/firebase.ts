import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import type { FirebaseStorage } from 'firebase/storage'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null
let initPromise: Promise<void> | null = null

export async function initializeFirebase(): Promise<{
  app: FirebaseApp
  auth: Auth
  db: Firestore
  storage: FirebaseStorage
}> {
  if (app && auth && db && storage) {
    return { app, auth, db, storage }
  }

  if (!initPromise) {
    initPromise = (async () => {
      if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== 'true') {
        Object.keys(localStorage).filter(k => k.startsWith('firebase:')).forEach(k => localStorage.removeItem(k))
      }

      const { initializeApp, getApps } = await import('firebase/app')
      const { getAuth, connectAuthEmulator } = await import('firebase/auth')
      const {
        initializeFirestore,
        getFirestore,
        persistentLocalCache,
        persistentMultipleTabManager,
        connectFirestoreEmulator,
      } = await import('firebase/firestore')
      const { getStorage, connectStorageEmulator } = await import('firebase/storage')

      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      }

      const missingVars = [
        !firebaseConfig.apiKey && 'NEXT_PUBLIC_FIREBASE_API_KEY',
        !firebaseConfig.authDomain && 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        !firebaseConfig.projectId && 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        !firebaseConfig.storageBucket && 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        !firebaseConfig.messagingSenderId && 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        !firebaseConfig.appId && 'NEXT_PUBLIC_FIREBASE_APP_ID',
      ].filter(Boolean) as string[]

      if (missingVars.length > 0 && typeof window !== 'undefined') {
        throw new Error(
          `Missing Firebase env vars: ${missingVars.join(', ')}. Set them in .env.local`,
        )
      }

      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
      auth = getAuth(app)

      if (typeof window !== 'undefined') {
        try {
          db = initializeFirestore(app, {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          })
        } catch {
          db = getFirestore(app)
        }
      } else {
        db = getFirestore(app)
      }

      storage = getStorage(app)

      const emulatorsAlreadyConnected = typeof window !== 'undefined' && (window as any).__FIREBASE_EMULATORS_CONNECTED__
      if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' && !emulatorsAlreadyConnected) {
        connectAuthEmulator(auth, 'http://localhost:9099')
        connectFirestoreEmulator(db, 'localhost', 8080)
        connectStorageEmulator(storage, 'localhost', 9199)
        // Emulator never persists auth across page loads — stale cookie would
        // bypass the proxy and land the user on a protected page with no FB user.
        if (typeof document !== 'undefined') {
          document.cookie = `__session=; path=/; max-age=0`
        }
        if (typeof window !== 'undefined') {
          (window as any).__FIREBASE_EMULATORS_CONNECTED__ = true
        }
      }
    })()
  }

  await initPromise

  if (!app || !auth || !db || !storage) {
    throw new Error('Firebase initialization failed')
  }

  return { app, auth, db, storage }
}
