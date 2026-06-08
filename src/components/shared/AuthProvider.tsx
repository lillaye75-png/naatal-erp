"use client"

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { onAuthChange } from '@/services/auth.service'
import { getTenant } from '@/repositories/tenant.repository'
import { ROLE_PERMISSIONS } from '@/constants/permissions'
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setTenant, setRole, setPermissions, reset, setLoading } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      setLoading(true)
      try {
        if (fbUser) {
          setUser(fbUser as any)
          if (fbUser.tenantId) {
            const tenantData = await getTenant(fbUser.tenantId)
            if (tenantData) {
              setTenant(tenantData)
            }
          }
          setRole(null)
          setPermissions(ROLE_PERMISSIONS.OWNER || [])
        } else {
          const { user, tenant } = useAuthStore.getState()
          if (!user && !tenant) {
            document.cookie = `__session=; path=/; max-age=0`
            reset()
          }
        }
      } catch (err) {
        console.error('AuthProvider error:', err)
        const { user, tenant } = useAuthStore.getState()
        if (!user && !tenant) {
          document.cookie = `__session=; path=/; max-age=0`
          reset()
        }
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  return children
}
