import { create } from "zustand"

interface UIState {
  sidebarCollapsed: boolean
  isMobileMenuOpen: boolean
  activeModal: string | null
  globalLoading: boolean
  toggleSidebar: () => void
  setMobileMenuOpen: (open: boolean) => void
  setActiveModal: (modal: string | null) => void
  setGlobalLoading: (loading: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  isMobileMenuOpen: false,
  activeModal: null,
  globalLoading: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),
  setActiveModal: (activeModal) => set({ activeModal }),
  setGlobalLoading: (globalLoading) => set({ globalLoading }),
}))
