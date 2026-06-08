"use client"

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { login, logout, register, resetPassword } from '@/services/auth.service'
import { getTenant } from '@/repositories/tenant.repository'
import { ROUTES } from '@/constants/routes'

export function useAuth() {
  const {
    user,
    tenant,
    role,
    permissions,
    isLoading,
  } = useAuthStore()
  const router = useRouter()

  const syncTenant = async (fbUser: any) => {
    if (fbUser?.tenantId) {
      const tenantData = await getTenant(fbUser.tenantId)
      if (tenantData) {
        useAuthStore.getState().setTenant(tenantData)
      }
    }
  }

  const handleLogin = async (email: string, password: string) => {
    const fbUser = await login(email, password)
    useAuthStore.getState().setUser(fbUser as any)
    await syncTenant(fbUser)
    document.cookie = `__session=true; path=/; max-age=86400; SameSite=Lax`
    router.push(ROUTES.DASHBOARD)
  }

  const handleRegister = async (
    email: string,
    password: string,
    businessName: string,
    phone: string,
  ) => {
    const { userId, tenantId } = await register(email, password, businessName, phone)
    const fbUser: any = { id: userId, email, displayName: businessName, tenantId }
    useAuthStore.getState().setUser(fbUser)
    await syncTenant(fbUser)
    document.cookie = `__session=true; path=/; max-age=86400; SameSite=Lax`
    router.push(ROUTES.DASHBOARD)
  }

  const handleLogout = async () => {
    await logout()
    useAuthStore.getState().reset()
    document.cookie = `__session=; path=/; max-age=0`
    router.push(ROUTES.LOGIN)
  }

  const handleResetPassword = async (email: string) => {
    await resetPassword(email)
  }

  return {
    user,
    tenant,
    role,
    permissions,
    isLoading,
    isAuthenticated: !!user,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    resetPassword: handleResetPassword,
  }
}
