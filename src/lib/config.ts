// All runtime config — set these in .env (Vite) or Vercel env vars
export const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL      || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const SITE_URL          = import.meta.env.VITE_SITE_URL          || 'https://reliance.tajallis.com.pk';
export const WA_SALES          = import.meta.env.VITE_WA_SALES          || '923702578788';
export const WA_ADMIN          = import.meta.env.VITE_WA_ADMIN          || '923354266238';
export const COMPANY           = 'Reliance Appliances';
export const CITY              = 'Karachi';
