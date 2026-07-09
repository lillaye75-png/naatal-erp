"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from "react";
import { getFirebase } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export type FirestoreDoc = Record<string, any> & { id: string };

export function useCollection<T = FirestoreDoc>(collectionPath: string) {
  const { tenantId } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const fb = await getFirebase();
      if (!fb?.db || !tenantId) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { collection, onSnapshot, query, orderBy } = await import("firebase/firestore");

      const path = `tenants/${tenantId}/${collectionPath}`;
      const q = query(collection(fb.db, path), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          if (cancelled) return;
          const docs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as T[];
          setData(docs);
          setLoading(false);
        },
        (err: Error) => {
          if (cancelled) return;
          setError(err.message);
          setLoading(false);
        }
      );
      return unsubscribe;
    };

    const promise = init();
    return () => {
      cancelled = true;
      promise.then((unsub) => unsub?.());
    };
  }, [tenantId, collectionPath]);

  return { data, loading, error };
}

export function useDoc(docPath: string) {
  const { tenantId } = useAuth();
  const [data, setData] = useState<FirestoreDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const fb = await getFirebase();
      if (!fb?.db || !tenantId) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { doc, onSnapshot } = await import("firebase/firestore");

      const path = `tenants/${tenantId}/${docPath}`;
      const unsubscribe = onSnapshot(
        doc(fb.db, path),
        (snap: any) => {
          if (cancelled) return;
          if (snap.exists()) {
            setData({ id: snap.id, ...snap.data() });
          } else {
            setData(null);
          }
          setLoading(false);
        }
      );
      return unsubscribe;
    };

    const unsubscribePromise = init();
    return () => {
      cancelled = true;
      unsubscribePromise.then((unsub) => unsub?.());
    };
  }, [tenantId, docPath]);

  return { data, loading };
}

export function useFirestoreMutations() {
  const { tenantId } = useAuth();

  const add = useCallback(async (collectionPath: string, data: Record<string, any>) => {
    const fb = await getFirebase();
    if (!fb?.db || !tenantId) return null;

    const { collection, addDoc, Timestamp } = await import("firebase/firestore");
    const docRef = await addDoc(collection(fb.db, `tenants/${tenantId}/${collectionPath}`), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  }, [tenantId]);

  const update = useCallback(async (collectionPath: string, id: string, data: Record<string, any>) => {
    const fb = await getFirebase();
    if (!fb?.db || !tenantId) return;

    const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
    await updateDoc(doc(fb.db, `tenants/${tenantId}/${collectionPath}/${id}`), {
      ...data,
      updatedAt: Timestamp.now(),
    });
  }, [tenantId]);

  const remove = useCallback(async (collectionPath: string, id: string) => {
    const fb = await getFirebase();
    if (!fb?.db || !tenantId) return;

    const { doc, deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(fb.db, `tenants/${tenantId}/${collectionPath}/${id}`));
  }, [tenantId]);

  return { add, update, remove };
}