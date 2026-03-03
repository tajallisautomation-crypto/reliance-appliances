import { create } from 'zustand';
import type { Product } from '@/lib/types';

export interface CartItem {
  product:           Product;
  qty:               number;
  plan:              string;
  withInstallation:  boolean;
  installationCost:  number;
}

interface CartStore {
  items:           CartItem[];
  addItem:         (p: Product, plan?: string) => void;
  removeItem:      (id: string) => void;
  updateQty:       (id: string, qty: number) => void;
  setPlan:         (id: string, plan: string) => void;
  toggleInstall:   (id: string) => void;
  clearCart:       () => void;
  totalItems:      () => number;
  subtotal:        () => number;
}

const INSTALL_COST = 2000;

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (p, plan = 'cash') => set(s => {
    const existing = s.items.find(i => i.product.id === p.id);
    if (existing) return { items: s.items.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i) };
    return { items: [...s.items, { product: p, qty: 1, plan, withInstallation: false, installationCost: INSTALL_COST }] };
  }),

  removeItem: id => set(s => ({ items: s.items.filter(i => i.product.id !== id) })),

  updateQty: (id, qty) => set(s => ({
    items: qty < 1 ? s.items.filter(i => i.product.id !== id) : s.items.map(i => i.product.id === id ? { ...i, qty } : i),
  })),

  setPlan: (id, plan) => set(s => ({ items: s.items.map(i => i.product.id === id ? { ...i, plan } : i) })),

  toggleInstall: id => set(s => ({ items: s.items.map(i => i.product.id === id ? { ...i, withInstallation: !i.withInstallation } : i) })),

  clearCart: () => set({ items: [] }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),

  subtotal: () => get().items.reduce((sum, i) => {
    const price = i.plan === 'cash' ? i.product.price.cash_floor : i.product.price.retail;
    return sum + price * i.qty + (i.withInstallation ? i.installationCost : 0);
  }, 0),
}));
