// Runtime config — works in Next.js server context (process.env) and client bundles (NEXT_PUBLIC_ inlined at build time)
export const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      || ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
export const SITE_URL          = process.env.NEXT_PUBLIC_SITE_URL          || 'https://reliance.tajallis.com.pk'
export const WA_SALES          = process.env.NEXT_PUBLIC_WA_SALES          || '923702578788'
export const WA_ADMIN          = process.env.NEXT_PUBLIC_WA_ADMIN          || '923354266238'
export const COMPANY           = "Tajalli's Home & Commercial Solutions"
export const COMPANY_SHORT     = "Tajalli's"
export const CITY              = 'Karachi'
