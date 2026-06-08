"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { initializeFirebase } from "@/lib/firebase"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    let cancelled = false
    initializeFirebase().then(({ auth }) => {
      if (cancelled) return
      const unsub = onAuthStateChanged(auth, (fbUser) => {
        if (cancelled) return
        if (fbUser) {
          setReady(true)
        } else {
          setDenied(true)
        }
      })
      return () => unsub()
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (denied) {
      document.cookie = `__session=; path=/; max-age=0`
      window.location.href = '/login'
    }
  }, [denied])

  if (denied) return null
  if (!ready) return null

  return <>{children}</>
}
