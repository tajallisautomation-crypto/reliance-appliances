import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  user: { name: string; phone: string; email: string; tier: string } | null
  login: (u: any) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    set => ({
      user: null,
      login: (u) => set({ user: u }),
      logout: () => set({ user: null }),
    }),
    { name: 'reliance-auth' }
  )
)
