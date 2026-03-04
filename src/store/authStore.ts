import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthStore {
  session:    Session | null;
  isLoggedIn: boolean;
  loading:    boolean;
  setSession: (s: Session | null) => void;
  signOut:    () => Promise<void>;
}

export const useAuthStore = create<AuthStore>(set => ({
  session:    null,
  isLoggedIn: false,
  loading:    true,

  setSession: s => set({ session: s, isLoggedIn: !!s, loading: false }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, isLoggedIn: false });
  },
}));

// Bootstrap auth state on app load
supabase.auth.getSession().then(({ data }) => {
  useAuthStore.getState().setSession(data.session);
});

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
});
