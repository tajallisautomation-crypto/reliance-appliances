import { useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useAutoRefresh(load: () => void, table: string, pollMs = 60_000) {
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => {
    loadRef.current();
    const channel = supabase
      .channel(`admin-rt-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => loadRef.current())
      .subscribe();
    const timer = setInterval(() => loadRef.current(), pollMs);
    const onVisible = () => { if (!document.hidden) loadRef.current(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [table, pollMs]);
}
