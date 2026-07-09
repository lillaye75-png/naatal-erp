"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getFirebase } from "./firebase";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  tenantId: string | null;
  role: "owner" | "employee" | null;
  logout: () => Promise<void>;
  firebaseReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  tenantId: null,
  role: null,
  logout: async () => {},
  firebaseReady: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<"owner" | "employee" | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const fb = await getFirebase();
      if (!fb) {
        if (!cancelled) {
          setLoading(false);
          setFirebaseReady(false);
        }
        return;
      }

      if (!cancelled) setFirebaseReady(true);
      const { onAuthStateChanged } = await import("firebase/auth");

      const unsubscribe = onAuthStateChanged(fb.auth, async (firebaseUser: any) => {
        if (cancelled) return;
        if (firebaseUser) {
          setUser(firebaseUser);
          try {
            const tokenResult = await firebaseUser.getIdTokenResult();
            setTenantId(tokenResult.claims.tenantId as string);
            setRole(tokenResult.claims.role as "owner" | "employee");
          } catch {
            setTenantId(null);
            setRole(null);
          }
        } else {
          setUser(null);
          setTenantId(null);
          setRole(null);
        }
        if (!cancelled) setLoading(false);
      });

      return unsubscribe;
    };

    const promise = init();
    return () => {
      cancelled = true;
      promise.then((unsub) => unsub?.());
    };
  }, []);

  const logout = async () => {
    const fb = await getFirebase();
    if (fb) {
      const { signOut } = await import("firebase/auth");
      await signOut(fb.auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, tenantId, role, logout, firebaseReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);