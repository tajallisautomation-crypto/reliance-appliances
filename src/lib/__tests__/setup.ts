/**
 * Vitest setup — mock Supabase so unit tests run without a live DB connection.
 */
import { vi } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: () => ({ data: null, error: null }),
    }),
    storage: {
      from: () => ({
        list: () => ({ data: [], error: null }),
        upload: () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    rpc: () => ({ error: null }),
  },
}));

vi.mock('../plans', () => ({
  getActivePlanRatios: () => ({
    '2m':  { markup: 1.10, advRatio: 0.50, installments: 1 },
    '3m':  { markup: 1.15, advRatio: 0.45, installments: 2 },
    '6m':  { markup: 1.25, advRatio: 0.40, installments: 5 },
    '12m': { markup: 1.40, advRatio: 0.30, installments: 11 },
  }),
}));
