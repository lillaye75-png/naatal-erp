"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"

export function useCollection<T>(
  collectionName: string,
  tenantId?: string,
  options?: { filterDeleted?: boolean },
) {
  const filterDeleted = options?.filterDeleted ?? true
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setLoading(false)
      return
    }
    const { db } = await initializeFirebase()
    const constraints = [where("tenantId", "==", tenantId)]
    if (filterDeleted) constraints.push(where("isDeleted", "==", false))
    const snap = await getDocs(
      query(collection(db, collectionName), ...constraints),
    )
    setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)))
    setLoading(false)
  }, [collectionName, tenantId, filterDeleted])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, refetch: fetch }
}
