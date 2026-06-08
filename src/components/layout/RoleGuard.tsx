"use client"

import { useAuthStore } from '@/stores/auth.store'

interface RoleGuardProps {
  children: React.ReactNode
  permissions?: string[]
  fallback?: React.ReactNode
}

export function RoleGuard({ children, permissions, fallback }: RoleGuardProps) {
  const { user, permissions: userPermissions, isLoading } = useAuthStore()

  if (isLoading) {
    return null
  }

  if (!user) {
    return fallback ? <>{fallback}</> : null
  }

  if (permissions && permissions.length > 0) {
    const hasAllPermissions = permissions.every((p) => userPermissions.includes(p))
    if (!hasAllPermissions) {
      return fallback ? <>{fallback}</> : null
    }
  }

  return <>{children}</>
}
