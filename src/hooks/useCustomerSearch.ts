"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { createCustomer as createCustomerRepo } from "@/repositories/customer.repository"

export interface CustomerSearchResult {
  id: string
  name: string
  phone?: string
}

export function useCustomerSearch(tenantId?: string) {
  const [query_, setQuery] = useState("")
  const [results, setResults] = useState<CustomerSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!query_.trim() || !tenantId) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const { db } = await initializeFirebase()
        const snap = await getDocs(query(
          collection(db, 'customers'),
          where('tenantId', '==', tenantId),
          where('isDeleted', '==', false),
        ))
        const q = query_.toLowerCase()
        const matches = snap.docs
          .map((d) => ({ id: d.id, name: d.data().name || '', phone: d.data().phone || '' }))
          .filter((c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
          .slice(0, 10)
        setResults(matches)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query_, tenantId])

  const createCustomer = useCallback(async (data: { name: string; phone?: string; email?: string; address?: string }, userId: string) => {
    if (!tenantId) throw new Error("Tenant non trouvé")
    return createCustomerRepo({ ...data, tenantId }, userId)
  }, [tenantId])

  return { query: query_, setQuery, results, searching, createCustomer }
}