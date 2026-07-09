export async function getFirebase() {
  if (typeof window === "undefined") return null;

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const hasConfig = Object.values(firebaseConfig).every(Boolean);
  if (!hasConfig) return null;

  const appModule = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");
  const { getFirestore } = await import("firebase/firestore");
  const { getStorage } = await import("firebase/storage");
  const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import("firebase/app-check");

  const { initializeApp, getApps } = appModule;
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

  if (typeof self !== "undefined") {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider("6LdUvkstAAAAAErD_CNfyKhZ2Cdcpb1JVHGSXS47"),
    isTokenAutoRefreshEnabled: true,
  });

  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  return { app, auth, db, storage } as const;
}
