import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../lib/api'

interface CartItem extends Product { qty: number }

interface CartStore {
  items: CartItem[]
  addItem: (p: Product, qty?: number) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (p, qty = 1) => set(s => {
        const ex = s.items.find(i => i.id === p.id)
        if (ex) return { items: s.items.map(i => i.id === p.id ? { ...i, qty: i.qty + qty } : i) }
        return { items: [...s.items, { ...p, qty }] }
      }),
      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
      updateQty: (id, qty) => set(s => ({
        items: qty <= 0 ? s.items.filter(i => i.id !== id) : s.items.map(i => i.id === id ? { ...i, qty } : i)
      })),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((t, i) => t + (i.price?.cash_floor || 0) * i.qty, 0),
    }),
    { name: 'reliance-cart' }
  )
)
