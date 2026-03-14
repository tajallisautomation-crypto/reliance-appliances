import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../lib/api';

const MAX_COMPARE = 4;

interface CompareStore {
  items: Product[];
  add:    (p: Product) => void;
  remove: (id: string) => void;
  toggle: (p: Product) => void;
  clear:  () => void;
  has:    (id: string) => boolean;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (p) => set(s => {
        if (s.items.length >= MAX_COMPARE) return s;
        if (s.items.some(i => i.id === p.id)) return s;
        return { items: [...s.items, p] };
      }),
      remove: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
      toggle: (p) => {
        const s = get();
        s.has(p.id) ? s.remove(p.id) : s.add(p);
      },
      clear: () => set({ items: [] }),
      has:   (id) => get().items.some(i => i.id === id),
    }),
    { name: 'tajalli-compare' },
  ),
);

export const MAX_COMPARE_ITEMS = MAX_COMPARE;
