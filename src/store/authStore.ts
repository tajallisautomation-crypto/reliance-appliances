import { create } from 'zustand';
import type { Customer } from '@/lib/types';

interface AuthStore {
  customer:    Customer | null;
  isLoggedIn:  boolean;
  login:       (c: Customer) => void;
  logout:      () => void;
}

export const useAuthStore = create<AuthStore>(set => ({
  customer:   null,
  isLoggedIn: false,
  login:  c  => set({ customer: c, isLoggedIn: true }),
  logout: () => set({ customer: null, isLoggedIn: false }),
}));
