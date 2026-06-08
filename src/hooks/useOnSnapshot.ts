"use client"

import { useEffect, useState, useRef } from "react"
import {
  type Query,
  type DocumentData,
  onSnapshot,
} from "firebase/firestore"

export function useOnSnapshot<T>(
  queryOrNull: Query<DocumentData> | null,
  initial: T[] = [],
) {
  const [data, setData] = useState<T[]>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const loadedOnce = useRef(false)

  useEffect(() => {
    if (!queryOrNull) {
      setLoading(false)
      return
    }

    const unsub = onSnapshot(
      queryOrNull,
      (snap) => {
        const docs = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as unknown as T,
        )
        setData(docs)
        if (!loadedOnce.current) {
          loadedOnce.current = true
          setLoading(false)
        }
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return () => unsub()
  }, [queryOrNull])

  return { data, loading, error }
}
