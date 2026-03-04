// ─── RELIANCE API — lib/api.ts  v6.0 ─────────────────────────
// Supabase-native. No GAS, no Sheets.

import { supabase } from './supabase';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function roundTo100(n: number): number { return Math.round(n / 100) * 100; }

/** Format a number as locale string (e.g. 148,500). Used in price displays. */
export function formatPrice(n: number): string { return Math.round(n || 0).toLocaleString('en-PK'); }
export function fmtPKR(n: number): string { return 'PKR\u00A0' + formatPrice(n); }

export function fixImageUrl(url: string, size = 400): string {
  if (!url) return '';
  if (url.includes('drive.google.com/thumbnail')) return url;
  if (url.includes('lh3.googleusercontent.com'))  return url;
  if (url.startsWith('http') && !url.includes('drive.google.com')) return url;
  let fileId = '', m: RegExpMatchArray | null;
  m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) { fileId = m[1]; } else {
    m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) fileId = m[1];
    else if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) fileId = url.trim();
  }
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}` : '';
}

// ── Plan calculation ──────────────────────────────────────────────────────────

export interface InstallmentPlan {
  months: number; total: number; advance: number; monthly: number;
  advancePct: number; monthlyPayments: number;
}

const PLAN_CONFIG: Record<string, { markup: number; advancePct: number; months: number; installments: number }> = {
  '2m':  { markup: 0.10, advancePct: 0.50, months: 2,  installments: 1  },
  '3m':  { markup: 0.15, advancePct: 0.45, months: 3,  installments: 2  },
  '6m':  { markup: 0.25, advancePct: 0.40, months: 6,  installments: 5  },
  '12m': { markup: 0.40, advancePct: 0.30, months: 12, installments: 11 },
};

export function calcPlan(basePrice: number, key: string): InstallmentPlan {
  const c = PLAN_CONFIG[key]; if (!c) throw new Error('Unknown plan: ' + key);
  const total   = roundTo100(basePrice * (1 + c.markup));
  const advance = roundTo100(total * c.advancePct);
  const monthly = roundTo100((total - advance) / c.installments);
  return { months: c.months, total, advance, monthly, advancePct: c.advancePct, monthlyPayments: c.installments };
}

export function calcAllPlans(basePrice: number): Record<string, InstallmentPlan> {
  if (!basePrice) return {};
  return Object.fromEntries(Object.keys(PLAN_CONFIG).map(k => [k, calcPlan(basePrice, k)]));
}

// ── Product type (unified schema used by all pages) ───────────────────────────

export interface Product {
  id:              string;
  brand:           string;
  model:           string;
  simplified_name: string;
  category:        string;
  sub_category:    string;
  slug:            string;
  description:     string;
  specs:           Record<string, string>;
  tags:            string;
  colors:          string;
  price: {
    min:        number;
    retail:     number;
    cash_floor: number;
  };
  installments: Record<string, InstallmentPlan>;  // keys: '2m','3m','6m','12m'
  warranty:     string;
  stock_status: string;
  featured:     boolean;
  thumbnail:    string;
  gallery:      string[];
  seo: { title: string; description: string; keywords: string };
}

export interface Category { id: string; name: string; icon: string; slug: string; }

export const CATEGORY_MAP: Record<string, string> = {
  'ac': 'Air Conditioners', 'fridge': 'Refrigerators', 'washing': 'Washing Machines',
  'tv': 'Televisions', 'solar': 'Solar Solutions', 'kitchen': 'Kitchen Appliances',
  'water': 'Water Dispensers', 'vacuum': 'Vacuum Cleaners', 'small': 'Small Appliances',
};

/** Alias for backward compat */
export const DEFAULT_CATEGORIES: Category[] = [
  { id:'ac',      name:'Air Conditioners',  icon:'❄️', slug:'air-conditioners'   },
  { id:'fridge',  name:'Refrigerators',     icon:'🧊', slug:'refrigerators'      },
  { id:'washing', name:'Washing Machines',  icon:'🪣', slug:'washing-machines'   },
  { id:'tv',      name:'Televisions',       icon:'📺', slug:'televisions'        },
  { id:'solar',   name:'Solar Solutions',   icon:'☀️', slug:'solar-solutions'    },
  { id:'kitchen', name:'Kitchen Appliances',icon:'🍳', slug:'kitchen-appliances' },
  { id:'water',   name:'Water Dispensers',  icon:'💧', slug:'water-dispensers'   },
  { id:'vacuum',  name:'Vacuum Cleaners',   icon:'🌀', slug:'vacuum-cleaners'    },
  { id:'small',   name:'Small Appliances',  icon:'🔌', slug:'small-appliances'   },
];

export const CATEGORIES: Category[] = [
  { id:'ac',      name:'Air Conditioners',  icon:'❄️', slug:'air-conditioners'   },
  { id:'fridge',  name:'Refrigerators',     icon:'🧊', slug:'refrigerators'      },
  { id:'washing', name:'Washing Machines',  icon:'🪣', slug:'washing-machines'   },
  { id:'tv',      name:'Televisions',       icon:'📺', slug:'televisions'        },
  { id:'solar',   name:'Solar Solutions',   icon:'☀️', slug:'solar-solutions'    },
  { id:'kitchen', name:'Kitchen Appliances',icon:'🍳', slug:'kitchen-appliances' },
  { id:'water',   name:'Water Dispensers',  icon:'💧', slug:'water-dispensers'   },
  { id:'vacuum',  name:'Vacuum Cleaners',   icon:'🌀', slug:'vacuum-cleaners'    },
  { id:'small',   name:'Small Appliances',  icon:'🔌', slug:'small-appliances'   },
];

// ── DB row → Product ──────────────────────────────────────────────────────────

function rowToProduct(r: any): Product {
  const retail    = Number(r.retail_price || 0);
  const cashFloor = Number(r.cash_floor   || retail);
  const minPrice  = Number(r.min_price    || 0);

  const installments: Record<string, InstallmentPlan> = r.adv_3m
    ? {
        '2m':  { months: 2,  total: r.total_2m,  advance: r.adv_2m,  monthly: r.monthly_2m,  advancePct: 0.50, monthlyPayments: 1  },
        '3m':  { months: 3,  total: r.total_3m,  advance: r.adv_3m,  monthly: r.monthly_3m,  advancePct: 0.45, monthlyPayments: 2  },
        '6m':  { months: 6,  total: r.total_6m,  advance: r.adv_6m,  monthly: r.monthly_6m,  advancePct: 0.40, monthlyPayments: 5  },
        '12m': { months: 12, total: r.total_12m, advance: r.adv_12m, monthly: r.monthly_12m, advancePct: 0.30, monthlyPayments: 11 },
      }
    : calcAllPlans(cashFloor);

  const thumb = fixImageUrl(r.thumbnail_url || '') || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80';
  const gallery = Array.isArray(r.gallery_urls) ? r.gallery_urls.map((u: string) => fixImageUrl(u)).filter(Boolean) : [];

  return {
    id:              String(r.id            || ''),
    brand:           String(r.brand         || ''),
    model:           String(r.model         || ''),
    simplified_name: String(r.simplified_name || ''),
    category:        String(r.category      || ''),
    sub_category:    String(r.sub_category  || ''),
    slug:            String(r.slug          || r.id || ''),
    description:     String(r.description   || ''),
    specs:           (typeof r.specs === 'object' && r.specs) ? r.specs : {},
    tags:            String(r.tags          || ''),
    colors:          String(r.colors        || ''),
    price:           { min: minPrice, retail, cash_floor: cashFloor },
    installments,
    warranty:        String(r.warranty      || ''),
    stock_status:    String(r.stock_status  || 'In Stock'),
    featured:        !!r.featured,
    thumbnail:       thumb,
    gallery,
    seo: {
      title:       String(r.seo_title    || r.simplified_name || r.model || ''),
      description: String(r.seo_desc     || ''),
      keywords:    String(r.seo_keywords || ''),
    },
  };
}

// ── 5-minute in-memory cache ──────────────────────────────────────────────────

const _cache = new Map<string, { data: any; ts: number }>();
function _fromCache(key: string) {
  const c = _cache.get(key);
  return c && Date.now() - c.ts < 5 * 60 * 1000 ? c.data : null;
}
function _setCache(key: string, data: any) { _cache.set(key, { data, ts: Date.now() }); }
export function clearCache() { _cache.clear(); }

// ── Read functions ────────────────────────────────────────────────────────────

export async function getProducts(params?: Record<string, string>): Promise<{ products: Product[]; total: number }> {
  const cKey = 'products:' + JSON.stringify(params || {});
  const hit = _fromCache(cKey);
  if (hit) return hit;

  try {
    let q = supabase.from('products').select('*').order('featured', { ascending: false }).order('updated_at', { ascending: false });
    if (params?.category) q = q.eq('category', params.category);
    if (params?.search)   q = q.ilike('simplified_name', `%${params.search}%`);
    const { data, error } = await q;
    if (error) throw error;
    const result = { products: (data || []).map(rowToProduct), total: data?.length || 0 };
    _setCache(cKey, result);
    return result;
  } catch {
    return { products: FALLBACK_PRODUCTS, total: FALLBACK_PRODUCTS.length };
  }
}

/** Get a product by id or slug. */
export async function getProduct(idOrSlug: string): Promise<Product | null> {
  try {
    let { data } = await supabase.from('products').select('*').eq('id', idOrSlug).maybeSingle();
    if (!data) ({ data } = await supabase.from('products').select('*').eq('slug', idOrSlug).maybeSingle());
    if (!data) return FALLBACK_PRODUCTS.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null;
    return rowToProduct(data);
  } catch {
    return FALLBACK_PRODUCTS.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null;
  }
}

/** Backward-compat alias */
export const getProductBySlug = getProduct;

export async function getCategories(): Promise<{ categories: Category[] }> {
  try {
    const { data, error } = await supabase.from('products').select('category').order('category');
    if (error || !data) return { categories: CATEGORIES };
    const seen = new Set<string>();
    const cats: Category[] = [];
    for (const row of data) {
      if (!row.category || seen.has(row.category)) continue;
      seen.add(row.category);
      const entry = CATEGORIES.find(c => c.name === row.category);
      cats.push(entry || { id: row.category.toLowerCase().replace(/\s+/g, '-'), name: row.category, icon: '📦', slug: row.category.toLowerCase().replace(/\s+/g, '-') });
    }
    return { categories: cats.length > 0 ? cats : CATEGORIES };
  } catch {
    return { categories: CATEGORIES };
  }
}

// ── Write functions ───────────────────────────────────────────────────────────

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

/** Upsert a product (raw DB format). Auto-generates id, slug, installment columns. */
export async function upsertProduct(data: Record<string, any>): Promise<void> {
  if (!data.id) data.id = slugify(`${data.brand || ''}-${data.model || ''}-${Date.now()}`);
  if (!data.slug) data.slug = slugify(`${data.brand || ''}-${data.model || ''}`);

  const price = Number(data.retail_price || 0);
  if (price && !data.adv_3m) {
    const p2 = calcPlan(price, '2m'); const p3 = calcPlan(price, '3m');
    const p6 = calcPlan(price, '6m'); const p12 = calcPlan(price, '12m');
    Object.assign(data, {
      adv_2m: p2.advance,  monthly_2m: p2.monthly,  total_2m: p2.total,
      adv_3m: p3.advance,  monthly_3m: p3.monthly,  total_3m: p3.total,
      adv_6m: p6.advance,  monthly_6m: p6.monthly,  total_6m: p6.total,
      adv_12m: p12.advance, monthly_12m: p12.monthly, total_12m: p12.total,
    });
  }

  const { error } = await supabase.from('products').upsert(data, { onConflict: 'id' });
  if (error) throw error;
  clearCache();
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  clearCache();
}

export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const ext  = file.name.split('.').pop() || 'jpg';
  const path = `${productId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function submitOrder(body: any) {
  const { error } = await supabase.from('orders').insert(body);
  if (error) return { error: error.message };
  return { success: true };
}

export async function submitEnquiry(body: any) {
  await supabase.from('analytics').insert({ event: 'enquiry', ...body });
  return { success: true };
}

export function discountPct(cashPrice: number, retail: number): number {
  if (!retail || retail <= cashPrice) return 0;
  return Math.round((retail - cashPrice) / retail * 100);
}

// ── Fallback products (shown if Supabase unreachable) ────────────────────────

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'fallback-1', brand: 'Haier', model: 'HSU-18HNF', simplified_name: 'Haier 1.5 Ton Inverter AC',
    slug: 'haier-hsu-18hnf', category: 'Air Conditioners', sub_category: 'DC Inverter',
    description: '1.5 Ton DC Inverter AC.', specs: { BTU: '18000', Refrigerant: 'R32' },
    tags: 'ac,inverter,haier', colors: 'White', warranty: '5 years compressor, 1 year parts',
    price: { min: 148500, retail: 156000, cash_floor: 148500 },
    installments: calcAllPlans(148500), stock_status: 'In Stock', featured: true,
    thumbnail: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80', gallery: [],
    seo: { title: 'Haier 1.5 Ton Inverter AC Karachi', description: 'Buy Haier HSU-18HNF in Karachi.', keywords: 'haier ac karachi' },
  },
  {
    id: 'fallback-2', brand: 'Dawlance', model: '9160 WB', simplified_name: 'Dawlance 14 Cu.Ft Refrigerator',
    slug: 'dawlance-9160-wb', category: 'Refrigerators', sub_category: 'Double Door',
    description: 'Dawlance 14 Cu.Ft refrigerator.', specs: { Size: '14 Cu.Ft', Type: 'Defrost' },
    tags: 'fridge,dawlance', colors: 'White', warranty: '10 years compressor',
    price: { min: 121000, retail: 127000, cash_floor: 121000 },
    installments: calcAllPlans(121000), stock_status: 'In Stock', featured: true,
    thumbnail: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80', gallery: [],
    seo: { title: 'Dawlance Fridge Price Karachi', description: 'Buy Dawlance 9160 WB in Karachi.', keywords: 'dawlance fridge karachi' },
  },
];
