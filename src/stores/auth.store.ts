import { create } from "zustand"
import type { User, Tenant, Role } from "@/types"

interface AuthState {
  user: User | null
  tenant: Tenant | null
  role: Role | null
  permissions: string[]
  isLoading: boolean
  setUser: (user: User | null) => void
  setTenant: (tenant: Tenant | null) => void
  setRole: (role: Role | null) => void
  setPermissions: (permissions: string[]) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  role: null,
  permissions: [],
  isLoading: true,
  setUser: (user) => set({ user }),
  setTenant: (tenant) => set({ tenant }),
  setRole: (role) => set({ role }),
  setPermissions: (permissions) => set({ permissions }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({
      user: null,
      tenant: null,
      role: null,
      permissions: [],
      isLoading: false,
    }),
}))
