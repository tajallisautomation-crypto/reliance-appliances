import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export type StaffRole = 'owner' | 'admin' | 'sales' | 'finance' | 'service' | 'reports';

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
}

interface AdminAuthStore {
  session:    Session | null;
  staff:      StaffMember | null;
  isStaff:    boolean;
  loading:    boolean;
  isRecovery: boolean;
  loadFromSession: (s: Session | null) => Promise<void>;
  setRecovery:     (v: boolean) => void;
  signOut:         () => Promise<void>;
}

async function fetchStaffMember(userId: string): Promise<StaffMember | null> {
  const { data } = await supabase
    .from('staff_members')
    .select('id, email, name, role')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();
  return data ?? null;
}

export const useAdminAuthStore = create<AdminAuthStore>(set => ({
  session:    null,
  staff:      null,
  isStaff:    false,
  loading:    true,
  isRecovery: false,

  loadFromSession: async (s) => {
    set({ loading: true });
    if (!s) {
      set({ session: null, staff: null, isStaff: false, loading: false });
      return;
    }
    const staff = await fetchStaffMember(s.user.id);
    set({ session: s, staff, isStaff: !!staff, loading: false });
  },

  setRecovery: v => set({ isRecovery: v, loading: false }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, staff: null, isStaff: false, isRecovery: false });
  },
}));

// Bootstrap auth state on app load
supabase.auth.getSession().then(({ data }) => {
  useAdminAuthStore.getState().loadFromSession(data.session);
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    useAdminAuthStore.getState().setRecovery(true);
  } else {
    useAdminAuthStore.getState().loadFromSession(session);
  }
});
