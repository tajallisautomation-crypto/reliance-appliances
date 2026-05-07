/**
 * myopStore.ts — Make Your Own Package persistent state
 *
 * Persisted to localStorage so the user's package selections survive:
 *  - route changes
 *  - tab refreshes
 *  - browser navigation (back/forward)
 *
 * The store is intentionally flat. The MYOP page reads/writes it directly;
 * a persistent floating mini-summary renders from it on any route.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MyopItem {
  product: Product;
  qty:     number;
}

export interface MyopStore {
  /** Current tab visible in the MYOP page (persisted so user returns to their tab) */
  activeTab:  string;
  /** Accumulated package items */
  items:      MyopItem[];
  /** Collapsed/expanded state of the floating summary panel */
  summaryOpen: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────────
  setActiveTab:   (tab: string) => void;
  addItem:        (p: Product, qty?: number) => void;
  removeItem:     (productId: string) => void;
  updateQty:      (productId: string, qty: number) => void;
  clearPackage:   () => void;
  setSummaryOpen: (open: boolean) => void;

  // ── Selectors ────────────────────────────────────────────────────────────────
  subtotal:      () => number;
  itemCount:     () => number;
  hasItem:       (productId: string) => boolean;
  getItem:       (productId: string) => MyopItem | undefined;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useMyopStore = create<MyopStore>()(
  persist(
    (set, get) => ({
      activeTab:   'ac',
      items:       [],
      summaryOpen: true,

      setActiveTab: (tab) => set({ activeTab: tab }),

      addItem: (p, qty = 1) => set(s => {
        const existing = s.items.find(i => i.product.id === p.id);
        if (existing) {
          return {
            items: s.items.map(i =>
              i.product.id === p.id ? { ...i, qty: i.qty + qty } : i
            ),
          };
        }
        return { items: [...s.items, { product: p, qty }] };
      }),

      removeItem: (productId) => set(s => ({
        items: s.items.filter(i => i.product.id !== productId),
      })),

      updateQty: (productId, qty) => set(s => ({
        items: qty <= 0
          ? s.items.filter(i => i.product.id !== productId)
          : s.items.map(i => i.product.id === productId ? { ...i, qty } : i),
      })),

      clearPackage: () => set({ items: [] }),

      setSummaryOpen: (open) => set({ summaryOpen: open }),

      subtotal: () =>
        get().items.reduce((t, i) => t + (i.product.price?.cash_floor || 0) * i.qty, 0),

      itemCount: () =>
        get().items.reduce((t, i) => t + i.qty, 0),

      hasItem: (productId) =>
        get().items.some(i => i.product.id === productId),

      getItem: (productId) =>
        get().items.find(i => i.product.id === productId),
    }),
    {
      name: 'tajallis-myop',
      // Serialize only the stable fields — exclude function selectors
      partialize: (s) => ({
        activeTab:   s.activeTab,
        items:       s.items,
        summaryOpen: s.summaryOpen,
      }),
    }
  )
);
