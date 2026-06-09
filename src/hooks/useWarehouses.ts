import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import type { Warehouse } from "@/types"

const cache = new Map<string, Warehouse[]>()

export function useWarehouses(tenantId?: string) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    if (tenantId && cache.has(tenantId)) return cache.get(tenantId)!
    return []
  })

  useEffect(() => {
    if (!tenantId) return
    if (cache.has(tenantId)) {
      setWarehouses(cache.get(tenantId)!)
      return
    }
    initializeFirebase().then(({ db }) =>
      getDocs(query(collection(db, 'warehouses'), where('tenantId', '==', tenantId)))
        .then((snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Warehouse))
          cache.set(tenantId, list)
          setWarehouses(list)
        })
    )
  }, [tenantId])

  return warehouses
}

export function useWarehouseName(tenantId?: string) {
  const warehouses = useWarehouses(tenantId)
  return (warehouseId: string | undefined) => {
    if (!warehouseId) return '-'
    const w = warehouses.find((w) => w.id === warehouseId)
    return w?.name || warehouseId.slice(0, 8) + '...'
  }
}
