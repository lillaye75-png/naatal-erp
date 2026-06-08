import { create } from "zustand"

export interface CartItem {
  productId: string
  name: string
  price: number
  qty: number
  imageUrl?: string
}

interface CartState {
  items: CartItem[]
  discount: number
  discountType: "PERCENTAGE" | "FIXED"
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  applyDiscount: (discount: number, type: "PERCENTAGE" | "FIXED") => void
  clearCart: () => void
  subtotal: () => number
  total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  discountType: "PERCENTAGE",
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId ? { ...i, qty: i.qty + item.qty } : i,
          ),
        }
      }
      return { items: [...state.items, item] }
    }),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),
  updateQty: (productId, qty) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, qty: Math.max(0, qty) } : i,
      ),
    })),
  applyDiscount: (discount, discountType) => set({ discount, discountType }),
  clearCart: () => set({ items: [], discount: 0, discountType: "PERCENTAGE" }),
  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
  total: () => {
    const state = get()
    const sub = state.subtotal()
    if (state.discountType === "PERCENTAGE") {
      return sub - sub * (state.discount / 100)
    }
    return Math.max(0, sub - state.discount)
  },
}))
