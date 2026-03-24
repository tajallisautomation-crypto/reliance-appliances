// ─── RELIANCE API — lib/api.ts  v6.0 ─────────────────────────
// Supabase-native. No GAS, no Sheets.

import { supabase } from './supabase';
import { getActivePlanRatios as _getActivePlanRatios } from './plans';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function roundTo100(n: number): number { return Math.round(n / 100) * 100; }

/** Round UP to nearest 500 PKR — used for cash floor pricing. */
export function roundUp500(n: number): number { return Math.ceil(n / 500) * 500; }

/** Whether a product at a given price qualifies for the 12-month plan. */
export function allows12m(cashFloor: number, canonicalCategory?: string): boolean {
  if (canonicalCategory === 'fan') return true;   // fans always qualify
  return cashFloor >= 50000;
}

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

// Plan months lookup (structural — does not change with rates)
const _PLAN_MONTHS: Record<string, number> = { '2m': 2, '3m': 3, '6m': 6, '12m': 12 };

export function calcPlan(basePrice: number, key: string): InstallmentPlan {
  const ratios = _getActivePlanRatios();            // live rates from settingsStore / Supabase
  const c = ratios[key as keyof typeof ratios]; if (!c) throw new Error('Unknown plan: ' + key);
  const total   = roundTo100(basePrice * c.markup); // markup is a multiplier e.g. 1.15
  const advance = roundTo100(total * c.advRatio);
  const n       = c.installments || 1;
  // Round UP so advance + monthly×n always covers total (never short-collects)
  const monthly = Math.ceil((total - advance) / n / 100) * 100;
  return { months: _PLAN_MONTHS[key] ?? 0, total, advance, monthly, advancePct: c.advRatio, monthlyPayments: n };
}

/** Returns the total count of in-stock products without loading the full data set. */
export async function getProductCount(): Promise<number> {
  try {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .neq('stock_status', 'Discontinued');
    return count ?? 0;
  } catch { return 0; }
}

export function calcAllPlans(basePrice: number, canonicalCategory?: string): Record<string, InstallmentPlan> {
  if (!basePrice) return {};
  const keys = allows12m(basePrice, canonicalCategory) ? ['2m', '3m', '6m', '12m'] : ['2m', '3m', '6m'];
  return Object.fromEntries(keys.map(k => [k, calcPlan(basePrice, k)]));
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
  'ac': 'Air Conditioners', 'fridge': 'Refrigerators', 'freezer': 'Freezers',
  'washing': 'Washing Machines', 'tv': 'Televisions', 'solar': 'Solar Solutions',
  'kitchen': 'Kitchen Appliances', 'water': 'Water Dispensers',
  'vacuum': 'Vacuum Cleaners', 'small': 'Small Appliances',
};

/** Alias for backward compat */
export const DEFAULT_CATEGORIES: Category[] = [
  { id:'ac',      name:'Air Conditioners',  icon:'❄️', slug:'air-conditioners'   },
  { id:'fridge',  name:'Refrigerators',     icon:'🧊', slug:'refrigerators'      },
  { id:'freezer', name:'Freezers',          icon:'🥶', slug:'freezers'            },
  { id:'washing', name:'Washing Machines',  icon:'🫧', slug:'washing-machines'   },
  { id:'tv',      name:'Televisions',       icon:'📺', slug:'televisions'        },
  { id:'solar',   name:'Solar Solutions',   icon:'☀️', slug:'solar-solutions'    },
  { id:'kitchen', name:'Kitchen Appliances',icon:'🍳', slug:'kitchen-appliances' },
  { id:'water',   name:'Water Dispensers',  icon:'💧', slug:'water-dispensers'   },
  { id:'vacuum',  name:'Vacuum Cleaners',   icon:'🌀', slug:'vacuum-cleaners'    },
  { id:'small',   name:'Small Appliances',  icon:'🔌', slug:'small-appliances'   },
];

/** @deprecated Use DEFAULT_CATEGORIES */
export const CATEGORIES = DEFAULT_CATEGORIES;

// ── DB row → Product ──────────────────────────────────────────────────────────

function rowToProduct(r: any): Product {
  const retail    = Number(r.retail_price || 0);
  const cashFloor = Number(r.cash_floor   || retail);
  const minPrice  = Number(r.min_price    || 0);

  const cc = resolveCanonicalCategory(String(r.brand || ''), String(r.model || ''), String(r.category || ''));
  const show12m = allows12m(cashFloor, cc);
  const installments: Record<string, InstallmentPlan> = r.adv_3m
    ? {
        '2m': { months: 2,  total: r.total_2m,  advance: r.adv_2m,  monthly: r.monthly_2m,  advancePct: 0.50, monthlyPayments: 1 },
        '3m': { months: 3,  total: r.total_3m,  advance: r.adv_3m,  monthly: r.monthly_3m,  advancePct: 0.45, monthlyPayments: 2 },
        '6m': { months: 6,  total: r.total_6m,  advance: r.adv_6m,  monthly: r.monthly_6m,  advancePct: 0.40, monthlyPayments: 5 },
        ...(show12m && r.adv_12m ? {
          '12m': { months: 12, total: r.total_12m, advance: r.adv_12m, monthly: r.monthly_12m, advancePct: 0.30, monthlyPayments: 11 }
        } : {}),
      }
    : calcAllPlans(cashFloor, cc);

  const thumb = fixImageUrl(r.thumbnail_url || '') || '';
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
export function clearCache() { _cache.clear(); _rootFolderMap = null; }

// ── Read functions ────────────────────────────────────────────────────────────

export async function getProducts(params?: Record<string, string>): Promise<{ products: Product[]; total: number }> {
  const cKey = 'products:' + JSON.stringify(params || {});
  const hit = _fromCache(cKey);
  if (hit) return hit;

  try {
    let q = supabase.from('products').select('*')
      .order('featured', { ascending: false }).order('updated_at', { ascending: false });
    // Customer-facing pages only show products that have an image.
    // Admin mode (params.admin === 'true') skips this filter so newly-imported
    // products without images are still visible and can be managed.
    if (params?.admin !== 'true') {
      q = q.not('thumbnail_url', 'is', null).neq('thumbnail_url', '');
    }
    if (params?.brand) q = q.ilike('brand', params.brand);
    if (params?.stock_status) q = q.eq('stock_status', params.stock_status);
    if (params?.category) {
      // Each category ID maps to one or more partial DB search terms.
      // Terms are long enough to be unambiguous but flexible enough to match
      // any variation stored in the category column (singular/plural/compound).
      // e.g. 'solar' → DB may store "Solar Solutions", "Solar Panel", "Solar System", "Solar Battery"
      // Maps every URL format to the DB category search terms:
      // – short IDs used by the Products page category buttons (ac, fridge …)
      // – canonical snake_case IDs from resolveCanonicalCategory (air_conditioner …)
      // – slug strings from Footer + ProductDetail breadcrumb (air-conditioners …)
      // – raw DB category strings lowercased (refrigerators, gas appliances …)
      const CAT_TERMS: Record<string, string[]> = {
        // ── Short button IDs ──────────────────────────────────────
        'ac':      ['air condition', 'ton air'],   // matches "1 Ton Air Conditioners" etc.
        'fridge':  ['refrigerat'],                 // matches "Small/Medium/Large Refrigerators"
        'freezer': ['freezer'],
        'washing': ['washing'],                    // matches "Automatic/Semi-Automatic Washing Machines"
        'tv':      ['television', 'led', 'smart led', 'smart tv', 'qled'],
        'solar':   ['solar'],
        'kitchen': ['kitchen'],                    // matches all "Kitchen …" subcategories
        'water':   ['water dispenser'],
        'vacuum':  ['vacuum'],
        'small':   ['personal care', 'home & heating'],  // new subcategory names
        // ── Canonical snake_case IDs ──────────────────────────────
        'air_conditioner':  ['air condition'],
        'refrigerator':     ['refrigerat'],
        'deep_freezer':     ['deep freezer', 'freezer'],
        'washing_machine':  ['washing'],
        'spinner':          ['spinner', 'spin dryer'],
        'television':       ['television', 'led', 'smart led', 'qled'],
        'microwave':        ['microwave'],
        'water_heater':     ['gas appli', 'water heater', 'geyser'],
        'gas_hob':          ['gas appli', 'hob', 'stove'],
        'battery':          ['power solution'],
        'ups':              ['power solution'],
        'water_dispenser':  ['water dispenser'],
        'air_cooler':       ['air cool', 'room cool', 'small appli'],
        'mattress':         ['master foam', 'master spring'],
        'bed':              ['master bed'],
        // ── Slug strings (from Footer + breadcrumb URLs) ──────────
        'air-conditioners':            ['air condition'],
        'refrigerators':               ['refrigerat'],
        'deep-freezer':                ['deep freezer', 'freezer'],
        'washing-machines':            ['washing'],
        'automatic-washing-machines':  ['automatic washing'],
        'televisions':                 ['television', 'led', 'smart led', 'qled'],
        'led':                         ['led', 'television', 'smart led', 'qled'],
        'solar-solutions':             ['solar'],
        'kitchen-appliances':          ['kitchen', 'microwave', 'gas appli'],
        'gas-appliances':              ['gas appli'],
        'microwave-oven':              ['microwave'],
        'microwave-ovens':             ['microwave'],
        'water-dispensers':            ['water dispenser'],
        'vacuum-cleaners':             ['vacuum'],
        'small-appliances':            ['personal care', 'home & heating'],
        'small-and-medium-appliances': ['personal care', 'home & heating'],
        'power-solutions':             ['power solution'],
        'accessories':                 ['accessories'],
        'master-foam':                 ['master foam'],
        'master-spring':               ['master spring'],
        'master-bed':                  ['master bed'],
        'pillows':                     ['pillow'],
        'stabilizer':                  ['stabilizer'],
        // singular slug variants (DB may store category without trailing 's')
        'air-conditioner':             ['air condition'],
        'washing-machine':             ['washing'],
        'freezers':                    ['deep freezer', 'freezer'],
        'deep-freezers':               ['deep freezer', 'freezer'],
        'water-dispenser':             ['water dispenser'],
        'vacuum-cleaner':              ['vacuum'],
        'kitchen-appliance':           ['kitchen', 'microwave', 'gas appli'],
        'small-appliance':             ['personal care', 'home & heating'],
        // ── New subcategory slugs (post-rebalance) ────────────────
        '1-ton-air-conditioners':         ['1 ton air'],
        '1.5-ton-air-conditioners':       ['1.5 ton air'],
        '2-ton-air-conditioners':         ['2 ton air'],
        'small-refrigerators':            ['small refrigerat'],
        'medium-refrigerators':           ['medium refrigerat'],
        'large-refrigerators':            ['large refrigerat'],
        'semi-automatic-washing-machines':['semi-automatic washing'],
        'kitchen-food-processors':        ['kitchen food proc'],
        'kitchen-blenders-juicers':       ['kitchen blender'],
        'kitchen-cooking-appliances':     ['kitchen cooking'],
        'kitchen-breakfast-beverages':    ['kitchen breakfast'],
        'personal-care-appliances':       ['personal care'],
        'home-heating-appliances':        ['home & heating'],
        'gas-appliance':               ['gas appli'],
        // raw DB category slugs from CSV
        'led-tv':                      ['led', 'television', 'smart led', 'qled'],
        'smart-led':                   ['led', 'television', 'smart led'],
        'smart-tv':                    ['television', 'smart led', 'smart tv', 'qled'],
        // legacy / external slugs with special characters
        'televisions-&-leds':          ['television', 'led', 'smart led', 'qled'],
        'televisions-and-leds':        ['television', 'led', 'smart led', 'qled'],
      };
      const terms = CAT_TERMS[params.category.toLowerCase()];
      if (terms) {
        // Supabase PostgREST .or() uses * as wildcard (not %), e.g. category.ilike.*term*
        const orClause = terms.map(t => `category.ilike.*${t}*`).join(',');
        q = q.or(orClause);
      } else {
        // Unknown category ID — fall back to direct ilike (% wildcard is correct here)
        q = q.ilike('category', `%${params.category}%`);
      }
    }
    if (params?.search) {
      const s = params.search.replace(/'/g, "''");
      q = q.or(`simplified_name.ilike.*${s}*,category.ilike.*${s}*,brand.ilike.*${s}*,tags.ilike.*${s}*`);
    }
    if (params?.sort === 'price_asc')  q = q.order('cash_floor',  { ascending: true });
    if (params?.sort === 'price_desc') q = q.order('cash_floor',  { ascending: false });
    if (params?.sort === 'name_asc')   q = q.order('simplified_name', { ascending: true });
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

/**
 * Returns similar products (same category, excluding current product).
 * Used for "You may also like" on the product detail page.
 */
export async function getRelatedProducts(
  productId: string,
  category: string,
  limit = 4
): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .neq('id', productId)
      .eq('stock_status', 'In Stock')
      .order('featured', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(rowToProduct);
  } catch {
    return [];
  }
}

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

/**
 * Uploads an image to the correct brand subfolder with the standardised naming
 * convention: {brand}/{model}_1.ext (thumbnail) or {brand}/{model}_2.ext (gallery).
 * This is the preferred upload path — images stored here are auto-matched by rematchAllImages.
 */
export async function uploadBrandImage(
  file: File, brand: string, model: string, isGallery = false
): Promise<string> {
  const folder   = brand.toLowerCase().replace(/\s+/g, '');
  // Strip characters that are illegal in storage paths
  const modelSafe = model.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '').trim();
  const suffix   = isGallery ? '2' : '1';
  const ext      = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path     = `${folder}/${modelSafe}_${suffix}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

/** Updates only the thumbnail_url (and optionally gallery_urls) for a single product. */
export async function updateProductImages(
  id: string, thumbnail_url: string, gallery_urls?: string[]
): Promise<void> {
  const update: Record<string, unknown> = { thumbnail_url };
  if (gallery_urls !== undefined) update.gallery_urls = gallery_urls;
  const { error } = await supabase.from('products').update(update).eq('id', id);
  if (error) throw error;
  clearCache();
}

/**
 * Resolves a single image URL to its final saved form WITHOUT touching the DB.
 * Tries to CORS-fetch the image and upload to Supabase Storage; if that fails
 * (CORS blocked, non-image response, storage error) falls back to the original
 * URL as-is.  The caller is responsible for persisting via updateProductImages.
 */
export async function resolveImageUrl(
  imageUrl: string, brand: string, model: string
): Promise<{ savedUrl: string; storedInBucket: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 8000);
    let resp: Response;
    try {
      resp = await fetch(imageUrl, { mode: 'cors', signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!resp!.ok) throw new Error(`HTTP ${resp!.status}`);
    const blob = await resp!.blob();
    if (!blob.type.startsWith('image/')) throw new Error('Response is not an image');
    const rawExt = blob.type.split('/')[1] || 'jpg';
    const ext    = rawExt === 'jpeg' ? 'jpg' : rawExt;
    const file   = new File([blob], `image.${ext}`, { type: blob.type });
    const storageUrl = await uploadBrandImage(file, brand, model, false);
    return { savedUrl: storageUrl, storedInBucket: true };
  } catch {
    // CORS blocked, timeout, non-image, or storage error — keep external URL
    return { savedUrl: imageUrl, storedInBucket: false };
  }
}

/**
 * @deprecated Use resolveImageUrl + updateProductImages separately so that
 * thumbnail vs gallery assignment is controlled by the caller.
 * Left here for any remaining call sites — routes all URLs through thumbnail only.
 */
export async function fetchAndUploadOrSaveUrl(
  imageUrl: string, productId: string, brand: string, model: string
): Promise<{ savedUrl: string; storedInBucket: boolean }> {
  const result = await resolveImageUrl(imageUrl, brand, model);
  await updateProductImages(productId, result.savedUrl);
  return result;
}

/**
 * Saves one thumbnail + any number of gallery images for a product in one DB call.
 * Each URL is resolved first (CORS fetch → storage, fallback to external URL).
 * Existing gallery images are PRESERVED unless explicitly replaced.
 */
export async function saveProductImages(
  productId: string, brand: string, model: string,
  thumbnailUrl: string,
  galleryUrls: string[],
  keepExistingGallery: string[] = [],
): Promise<{ thumbnail: string; gallery: string[] }> {
  // Resolve thumbnail
  const { savedUrl: thumb } = await resolveImageUrl(thumbnailUrl, brand, model);

  // Resolve each new gallery URL in parallel
  const resolved = await Promise.allSettled(
    galleryUrls.map(u => resolveImageUrl(u, brand, model))
  );
  const newGallery = resolved
    .filter((r): r is PromiseFulfilledResult<{ savedUrl: string; storedInBucket: boolean }> => r.status === 'fulfilled')
    .map(r => r.value.savedUrl)
    .filter(u => u && u !== thumb);

  // Merge: new gallery images first, then existing ones that don't duplicate
  const combined = [
    ...newGallery,
    ...keepExistingGallery.filter(u => u && u !== thumb && !newGallery.includes(u)),
  ];

  await updateProductImages(productId, thumb, combined);
  return { thumbnail: thumb, gallery: combined };
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

// ── CSV Import: interfaces ────────────────────────────────────────────────────

export interface ImportSummary {
  added: number; updated: number; discontinued: number;
  imagesFound: number; imagesMissing: number; errors: string[];
}

export interface CsvImportRow {
  Brand: string; Model: string; Category: string; Retail_Price: string;
  [key: string]: string;
}

// ── Enrichment: warranty ──────────────────────────────────────────────────────
//
// Haier and Dawlance have sub-type warranties (e.g. DF vs Ref, auto vs semi-auto)
// handled via explicit logic in lookupWarranty().
// All other brands use the WARRANTY_TABLE lookup.

const WARRANTY_TABLE: Record<string, string> = {
  // Gree
  'gree::air conditioners':        '5 years compressor, 1 year parts & labour',
  'gree::refrigerators':           '5 years compressor, 1 year parts',
  'gree::washing machines':        '2 years motor, 1 year parts',
  // PEL
  'pel::air conditioners':         '5 years compressor, 1 year parts & labour',
  'pel::refrigerators':            '7 years compressor, 1 year parts & labour',
  'pel::washing machines':         '2 years motor, 1 year parts',
  'pel::televisions':              '2 years parts & labour',
  // Orient
  'orient::air conditioners':      '5 years compressor, 1 year parts & labour',
  'orient::refrigerators':         '5 years compressor, 1 year parts',
  'orient::washing machines':      '2 years motor, 1 year parts',
  'orient::televisions':           '2 years parts & labour',
  // Samsung (official Pakistan)
  'samsung::televisions':          '2 years parts & labour',
  'samsung::refrigerators':        '10 years digital inverter compressor, 1 year parts',
  'samsung::washing machines':     '10 years digital inverter motor, 1 year parts',
  'samsung::air conditioners':     '5 years compressor, 1 year parts',
  // LG (official Pakistan)
  'lg::televisions':               '2 years parts & labour',
  'lg::air conditioners':          '10 years compressor, 2 years parts & labour',
  'lg::refrigerators':             '10 years linear compressor, 1 year parts',
  'lg::washing machines':          '10 years motor, 1 year parts',
  // TCL
  'tcl::televisions':              '1 year parts & labour',
  'tcl::air conditioners':         '5 years compressor, 1 year parts',
  'tcl::refrigerators':            '5 years compressor, 1 year parts',
  // Solar (non-Crown)
  'jinko::solar solutions':        '12 years product warranty, 25 years linear power output',
  'longi::solar solutions':        '12 years product warranty, 25 years linear power output',
  'canadian::solar solutions':     '10 years product warranty, 25 years linear performance',
  'risen::solar solutions':        '10 years product warranty, 25 years linear performance',
  // Kenwood
  'kenwood::air conditioners':     '5 years compressor, 1 year parts & labour',
  'kenwood::kitchen appliances':   '2 years parts & labour',
  // Waves
  'waves::air conditioners':       '5 years compressor, 1 year parts',
  'waves::refrigerators':          '5 years compressor, 1 year parts',
  // Gas appliance brands
  'hanco::gas appliances':         '1 year parts & labour',
  'welcome::gas appliances':       '1 year parts & labour',
  'flora::gas appliances':         '1 year parts & labour',
  'nasgas::gas appliances':        '2 years parts & labour',
  'glam gas::gas appliances':      '2 years parts & labour',
  'super asia::gas appliances':    '1 year parts & labour',
  'singer::gas appliances':        '1 year parts & labour',
  'hotline::gas appliances':       '1 year parts & labour',
  // Batteries
  'ags::power solutions':          '1 year replacement warranty',
  'osaka::power solutions':        '1 year replacement warranty',
  'phoenix::power solutions':      '18 months replacement warranty',
  'inverex::power solutions':      '2 years warranty (lithium), 1 year (lead-acid)',
  'crown::power solutions':        '1 year warranty',
  // Solar panels
  'jinko::solar panel':            '12 years product, 25 years linear power output',
  'inverex::solar':                '5 years inverter warranty',
};

/**
 * Returns the warranty string for a product.
 * Haier, Dawlance, Crown, and Westpoint have product-type-specific warranties
 * that require knowing the canonical category and, for washers, the WM sub-type.
 * All other brands fall through to the WARRANTY_TABLE.
 */
function lookupWarranty(brand: string, model: string, category: string, cc: string): string {
  const b = brand.toLowerCase();
  const m = model.toUpperCase();
  const c = category.toLowerCase();

  // ── Haier ──────────────────────────────────────────────────────────────────
  if (b === 'haier') {
    if (cc === 'air_conditioner')  return '10 years compressor, 5 years electrical parts';
    if (cc === 'deep_freezer')     return '10 years compressor, 3 years electrical parts';
    if (cc === 'refrigerator')     return '10 years compressor, 3 years electrical parts';
    if (cc === 'television')       return '2 years panel, 1 year parts';
    if (cc === 'microwave')        return '1 year complete';
    if (cc === 'spinner')          return '10 years motor, 1 year parts';
    if (cc === 'washing_machine') {
      const wt = _wmType(model, category, brand);
      // semi_auto is the only type with the shorter warranty; generic (undetected) defaults
      // to automatic because the vast majority of Haier HWM sales in Pakistan are fully-auto.
      return (wt === 'semi_auto' || wt === 'twin_tub')
        ? '10 years motor, 1 year parts'
        : '10 years motor, 3 years panel, 1 year parts';
    }
    return '1 year parts & labour';
  }

  // ── Dawlance ───────────────────────────────────────────────────────────────
  if (b === 'dawlance') {
    if (cc === 'air_conditioner')  return '12 years compressor, 6 years complete';
    if (cc === 'deep_freezer')     return '12 years compressor, 4 years electrical parts, 1 year complete';
    if (cc === 'refrigerator')     return '12 years compressor, 4 years complete';
    if (cc === 'microwave')        return '1 year complete';
    if (cc === 'spinner')          return '10 years motor, 1 year complete';
    if (cc === 'washing_machine') {
      const wt = _wmType(model, category, brand);
      return (wt === 'front_load' || wt === 'top_load' || wt === 'fully_auto')
        ? '10 years motor, 4 years electrical parts'
        : '10 years motor, 1 year complete';
    }
    return '1 year parts & labour';
  }


  // ── Crown ──────────────────────────────────────────────────────────────────
  if (b === 'crown') {
    if (/PRIDOR/.test(m))                                  return '18 months warranty';
    if (/YORKER/.test(m))                                  return '3 years warranty';
    if (/NEXUS/.test(m))                                   return '5 years warranty';
    if (/ELEKTRA.*BOOST/.test(m) && /5\.12|5120/.test(m) && /PRO/.test(m))   return '10 years warranty';
    if (/ELEKTRA.*BOOST/.test(m) && /5\.12|5120/.test(m) && /LITE/.test(m))  return '5 years warranty';
    if (/ELEKTRA.*BOOST/.test(m) && /2\.4|2400/.test(m))  return '10 years warranty';
    return '1 year warranty';
  }

  // ── Westpoint — all products 2 years ──────────────────────────────────────
  if (b === 'westpoint') return '2 years parts & labour';

  // ── All other brands: table lookup ────────────────────────────────────────
  const exact = WARRANTY_TABLE[`${b}::${c}`];
  if (exact) return exact;
  for (const [key, val] of Object.entries(WARRANTY_TABLE)) {
    const [kb, kc] = key.split('::');
    if (kb === b && (c.includes(kc) || kc.includes(c))) return val;
  }
  const brandFallbacks: Record<string, string> = {
    gree: '1 year parts & labour', pel: '1 year parts & labour',
    samsung: '1 year parts & labour', lg: '1 year parts & labour',
    kenwood: '1 year parts & labour', orient: '1 year parts & labour',
  };
  return brandFallbacks[b] ?? '1 year manufacturer warranty';
}

// ── Enrichment: AC tonnage + fridge capacity ──────────────────────────────────

// Standard BTU tonnage code → Ton string (used by all brands except Haier and Dawlance)
function _nToTon(n: number): string {
  if (n <= 9)  return '0.75';
  if (n === 10) return '0.9';
  if (n <= 12) return '1.0';
  if (n <= 14) return '1.2';
  if (n <= 18) return '1.5';
  if (n <= 24) return '2.0';
  if (n <= 30) return '2.5';
  if (n <= 36) return '3.0';
  return '';
}

// Haier Pakistan model codes — confirmed by Haier Pakistan product listings.
// Haier uses non-standard offsets: 13=1T, 14=1.2T, 19=1.5T, 20=1.7T.
const _HAIER_TON: Record<number, string> = {
  9: '0.75', 10: '0.9', 12: '1.0', 13: '1.0', 14: '1.2',
  18: '1.5', 19: '1.5', 20: '1.7', 24: '2.0', 30: '2.5', 36: '3.0',
};

// Dawlance Pakistan model codes — confirmed by Dawlance Pakistan product listings.
// Dawlance uses a proprietary scale: 15=1T, 30=1.5T (not BTU-based).
const _DAWLANCE_TON: Record<number, string> = {
  9: '0.75', 10: '0.9', 12: '1.0', 15: '1.0', 18: '1.5',
  24: '2.0', 30: '1.5', 36: '3.0',
};

/**
 * Extracts cooling capacity (Tons) from an AC model string.
 * Brand must be passed for Haier and Dawlance — they use different coding systems.
 */
function _tonFromAC(model: string, brand?: string): string {
  const m = model.toUpperCase();
  const b = (brand || '').toLowerCase();

  function tonFor(n: number): string {
    if (b === 'haier')    return _HAIER_TON[n]    ?? '';
    if (b === 'dawlance') return _DAWLANCE_TON[n] ?? '';
    return _nToTon(n);
  }

  // Brand-prefixed codes: HSU/HPU (Haier), GS/GEA (Gree), PAC (PEL),
  // OSA/OWS (Orient), WSA (Waves), KWA/KE (Kenwood), ON (Orient/General)
  const pm = m.match(/(?:HSU|HPU|GS|GEA|PAC|OSA|OWS|WSA|KWA?|KE|ON|DC|RAS|SAC)-?(\d{2})/);
  if (pm) { const t = tonFor(parseInt(pm[1], 10)); if (t) return t; }

  // Dawlance named series: CHROME-30, AURORA-15, ELITE-30, MEGA-30 etc.
  const dm = m.match(/(?:INVERTER|ELITE|CHROME|AURORA|FLAIR|MEGA|ICON|VIVA|TURBO|COOL|PRIMA|GALLANT)-(\d{2})/);
  if (dm) { const t = tonFor(parseInt(dm[1], 10)); if (t) return t; }

  // Generic fallback: space/hyphen-separated 2-digit number.
  // Known codes are brand-specific to avoid misreading series numbers as tonnage.
  const knownCodes = b === 'haier'    ? new Set([9, 10, 12, 13, 14, 18, 19, 20, 24, 30, 36])
                   : b === 'dawlance' ? new Set([9, 10, 12, 15, 18, 24, 30, 36])
                   : new Set([9, 10, 12, 18, 24, 30, 36]); // standard for all other brands
  const gm = m.match(/[-\s](\d{2})(?:[-\s]|[A-Z]|$)/);
  if (gm) {
    const n = parseInt(gm[1], 10);
    if (knownCodes.has(n)) { const t = tonFor(n); if (t) return t; }
  }
  return '';
}

// Haier HRF series: marketed Cu.Ft values per Haier Pakistan website.
// These are NET usable capacity figures — do NOT replace with liters formula (gross capacity differs).
const FRIDGE_CF_MAP: Record<string, number> = {
  '216': 6,  '246': 8,  '276': 9,  '316': 11, '346': 12, '368': 13,
  '398': 14, '418': 14, '438': 15, '458': 16, '488': 17, '518': 18,
  '538': 19, '578': 20, '622': 22, '678': 24,
  // PEL / Orient numeric codes
  '2000': 7, '2200': 8, '2350': 9, '2500': 10, '2600': 11,
};

// Dawlance 9xxx series Cu.Ft values per Dawlance Pakistan product pages.
const DAWLANCE_CF_MAP: Record<string, number> = {
  // ── Mini / compact ─────────────────────────────────────────────────────────
  '9106': 4,
  // ── 9 Cu.Ft ────────────────────────────────────────────────────────────────
  '9140': 9, '9148': 9, '9149': 9, '9155': 9, '9157': 9,
  // ── 10 Cu.Ft ───────────────────────────────────────────────────────────────
  '9160': 10, '9161': 10, '9162': 10,
  // ── 11 Cu.Ft ───────────────────────────────────────────────────────────────
  '9163': 11, '9164': 11, '9165': 11,
  // ── 12 Cu.Ft ───────────────────────────────────────────────────────────────
  '9166': 12, '9168': 12, '9169': 12, '9170': 12, '9171': 12,
  // ── 13 Cu.Ft ───────────────────────────────────────────────────────────────
  '9172': 13, '9173': 13, '9174': 13,
  // ── 14 Cu.Ft ───────────────────────────────────────────────────────────────
  '9175': 14, '9176': 14, '9177': 14, '9178': 14,
  // ── 15 Cu.Ft ───────────────────────────────────────────────────────────────
  '9180': 15, '9181': 15, '9182': 15, '9183': 15, '9185': 15, '9186': 15,
  // ── 16 Cu.Ft ───────────────────────────────────────────────────────────────
  '9187': 16, '9188': 16, '9189': 16, '9190': 16,
  // ── 18 Cu.Ft ───────────────────────────────────────────────────────────────
  '9191': 18, '9192': 18, '9193': 18,
  // ── 20 Cu.Ft ───────────────────────────────────────────────────────────────
  '9194': 20, '9195': 20, '9196': 20, '91999': 20,
};

// Deterministic display-size map: brand:modelNorm → human display string.
// Keys are lowercase brand + ":" + uppercase model with dashes/spaces stripped.
// Only add entries verified against official brand pages or authorised retailers.
// DO NOT add entries derived from model-number formulas.
const _SIZE_DISPLAY_MAP: Record<string, string> = {
  // Dawlance refrigerators — gross Cu.Ft per Dawlance Pakistan marketing
  'dawlance:9178':  '14 Cu.Ft',
  'dawlance:9191':  '18 Cu.Ft',
  'dawlance:91999': '20 Cu.Ft',
  // Haier deep freezers — handled via HAIER_HDF_CF_MAP below (not this map)
  // Haier refrigerators
  'haier:hrf398':   '16 Cubic Feet',
  'haier:hrf438':   '18 Cubic Feet',
  'haier:hrf538':   '20 Cubic Feet',
};

// Haier HDF deep freezer: model number encodes capacity in litres.
// Map litre value → marketed Cu.Ft (rounded marketing figures, not exact conversions).
const HAIER_HDF_CF_MAP: Record<number, number> = {
  245: 8,
  285: 10,
  325: 13,
  345: 13,
  385: 15,
};

/** Returns the verified display size string (e.g. "18 Cubic Feet") for a given
 *  brand+model, or '' if no verified mapping exists. Never guesses from digits. */
function _getSizeDisplay(brand: string, model: string): string {
  const bNorm = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const mNorm = model.toUpperCase().replace(/[-\s]/g, '').toLowerCase();
  if (_SIZE_DISPLAY_MAP[`${bNorm}:${mNorm}`]) return _SIZE_DISPLAY_MAP[`${bNorm}:${mNorm}`];
  // Try just the primary model code before any space or slash variant
  // e.g. "9191 WB Acce Pro" → "9191", "HRF-346 EPB / EPR" → "hrf346"
  const primary = model.split(/[\s/]/)[0].replace(/-/g, '').toLowerCase();
  if (primary && primary !== mNorm) return _SIZE_DISPLAY_MAP[`${bNorm}:${primary}`] ?? '';
  return '';
}

function _cfFromFridge(model: string): number | '' {
  const m = model.toUpperCase();

  // Haier HDF (deep freezer) series: the 3-digit number is gross litres.
  // e.g. HDF-175 = 175L ≈ 6 Cu.Ft
  const hdfM = m.match(/\bHDF-?(\d{3,4})\b/);
  if (hdfM) {
    const liters = parseInt(hdfM[1]);
    if (liters >= 100 && liters <= 700) return Math.round(liters / 28.316);
  }

  // Dawlance 9xxx series — note: no trailing \b because colour codes run directly into the number
  // e.g. "9173WB", "9178LF", "9191WB" — \b after the digit would fail when followed by a letter
  const dlM = m.match(/\b(9\d{3,4})(?!\d)/);
  if (dlM && DAWLANCE_CF_MAP[dlM[1]] !== undefined) return DAWLANCE_CF_MAP[dlM[1]];

  // Haier HRF refrigerators — known model → Cu.Ft mapping
  const hrfM = m.match(/\bHRF-?(\d{3})/);
  if (hrfM) {
    const n = parseInt(hrfM[1]);
    if (n <= 260) return 9;
    if (n <= 310) return 11;
    if (n <= 360) return 13;
    if (n <= 410) return 16;
    if (n <= 460) return 18;
    if (n <= 530) return 20;
    if (n <= 600) return 22;
    return Math.round(n / 28.3);
  }

  // Dawlance MDW (mono-door/mini) series — e.g. MDW-9 TDB, MDW-11 FB
  const mdwM = m.match(/\bMDW-?(\d+)\b/);
  if (mdwM) { const n = parseInt(mdwM[1]); if (n >= 4 && n <= 20) return n; }

  // Kenwood KRF / Homage HR / Homage Tech-series: first 3 digits of 5-digit suffix = litres
  // e.g. KRF-24557 → 245L ≈ 9 Cu.Ft; HR-47562 → 475L ≈ 17 Cu.Ft
  const krfM = m.match(/\b(?:KRF|HR)-?(\d{3})\d{2}\b/);
  if (krfM) { const liters = parseInt(krfM[1]); if (liters >= 100 && liters <= 800) return Math.round(liters / 28.316); }

  // EcoStar / Orient / PEL ER-D / PR-xxx series: 3-digit suffix = litres
  // e.g. ER-D250 = 250L ≈ 9 Cu.Ft, ORF-380 = 380L ≈ 13 Cu.Ft
  const erM = m.match(/\b(?:ER-?D|ERF-?|ORF-?|PRF-?|LRF-?|GRF-?)(\d{3,4})\b/);
  if (erM) {
    const liters = parseInt(erM[1]);
    if (liters >= 100 && liters <= 800) return Math.round(liters / 28.316);
  }

  // Lookup table for Haier HRF and other numeric-coded series
  const keys = Object.keys(FRIDGE_CF_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) { if (m.includes(k)) return FRIDGE_CF_MAP[k]; }

  // Generic fallback: extract any 3-4 digit number that plausibly encodes litres (150–700L)
  // Only fire if none of the above matched — avoids misreading unrelated digits.
  const genM = m.match(/\b(\d{3,4})\b/g);
  if (genM) {
    for (const numStr of genM) {
      const n = parseInt(numStr);
      if (n >= 150 && n <= 700) return Math.round(n / 28.316);
    }
  }

  return '';
}

// ── Enrichment: category string parser ───────────────────────────────────────

interface _CatParsed {
  litres?: string; slices?: number; watts?: number; kg?: string;
  multiFunc?: number; material?: string; control?: string; size?: string;
}

function _parseCategory(category: string): _CatParsed {
  const c = category.toUpperCase();
  const r: _CatParsed = {};
  const lm = c.match(/(\d+\.?\d*)\s*(?:L\b|LTR|LITRE|LITER)/);
  if (lm) r.litres = lm[1] + 'L';
  const sm = c.match(/(\d+)\s*SLICE/);
  if (sm) r.slices = parseInt(sm[1]);
  const wm = c.match(/(\d+)\s*(?:W\b|WATT)/);
  if (wm) r.watts = parseInt(wm[1]);
  const km = c.match(/(\d+\.?\d*)\s*KG\b/);
  if (km) r.kg = km[1] + 'kg';
  const im = c.match(/(\d+)\s*IN\s*[-–]?\s*1/);
  if (im) r.multiFunc = parseInt(im[1]);
  const matm = c.match(/\b(PLASTIC|STAINLESS|STEEL|GLASS|CERAMIC|ALUMINI?UM)\b/);
  if (matm) r.material = matm[1].charAt(0) + matm[1].slice(1).toLowerCase();
  const ctrlm = c.match(/\b(DIGITAL|MECHANICAL|ELECTRONIC|DELUXE|HANDY|COMMERCIAL|CORDLESS)\b/);
  if (ctrlm) r.control = ctrlm[1].charAt(0) + ctrlm[1].slice(1).toLowerCase();
  const szm = c.match(/(\d{1,3})\s*(?:CM|INCH|MM)/);
  if (szm) r.size = szm[1];
  return r;
}

// ── Enrichment: small appliance specs ────────────────────────────────────────

function _buildSmallSpecs(brand: string, model: string, category: string, cc: string): Record<string, string> {
  const specs: Record<string, string> = {};
  void brand; void model;
  const cat = category.toLowerCase();   // kept for fine-grained sub-type detection within branches
  const p = _parseCategory(category);
  specs['Power Supply'] = '220V / 50Hz';

  if (cc === 'air_fryer') {
    if (p.litres) specs['Capacity'] = p.litres;
    if (p.watts) specs['Power'] = p.watts + 'W'; else specs['Power'] = '1500–2000W';
    specs['Temperature Range'] = '80°C – 200°C';
    specs['Timer']        = 'Up to 60 min with Auto Shut-Off';
    specs['Basket Type']  = 'Removable Non-Stick Basket (BPA-Free)';
    specs['Technology']   = 'Rapid Hot Air Circulation (up to 95% less oil)';
    specs['Control']      = p.control === 'Digital' ? 'Digital LED with Touch Controls' : 'Mechanical Dial';
    specs['Safety']       = 'Auto Shut-Off, Cool-Touch Body';
  } else if (cat.includes('microwave') || cc === 'microwave') {
    if (p.litres) specs['Capacity'] = p.litres;
    specs['Power']            = p.watts ? p.watts + 'W' : '1000W';
    specs['Heating Technology'] = 'Microwave + Grill (Combo)';
    specs['Control']          = p.control === 'Digital' ? 'Digital Touch Panel' : 'Mechanical Knobs';
    specs['Turntable']        = 'Yes (rotating glass plate)';
    specs['Safety']           = 'Child Lock, Overheat Protection';
  } else if (cat.includes('kettle') || cc === 'kettle') {
    specs['Capacity'] = p.litres || '1.7L';
    specs['Power']    = p.watts ? p.watts + 'W' : '1500W';
    specs['Material'] = p.material === 'Stainless' || p.material === 'Steel'
      ? 'Stainless Steel Interior, Cool-Touch Exterior'
      : 'Food-Grade Plastic (BPA-Free)';
    specs['Safety'] = 'Auto Shut-Off, Boil-Dry Protection, 360° Swivel Base';
    specs['Filter'] = 'Removable Limescale Filter';
  } else if (cat.includes('toaster') || cc === 'toaster') {
    specs['Capacity']        = (p.slices || 2) + '-Slice';
    specs['Power']           = p.watts ? p.watts + 'W' : '900W';
    specs['Browning Control'] = '7-Level Browning Control';
    specs['Functions']       = 'Toast, Defrost, Reheat, Cancel';
    specs['Crumb Tray']      = 'Yes (removable, easy-clean)';
  } else if (cat.includes('sandwich') || cc === 'sandwich_maker' || (cat.includes('grill') && !cat.includes('microw'))) {
    specs['Power']     = p.watts ? p.watts + 'W' : '750W';
    specs['Plates']    = 'Non-Stick Coated Plates';
    specs['Indicator'] = 'Power + Ready Indicator Lights';
    specs['Body']      = 'Cool-Touch Housing';
    if (p.multiFunc) specs['Interchangeable Plates'] = 'Yes (' + p.multiFunc + '-in-1)';
  } else if (cat.includes('hand blend') || (cat.includes('blend') && cat.includes('hand')) || cc === 'hand_blender') {
    if (p.watts) specs['Power'] = p.watts + 'W'; else specs['Power'] = '200–800W';
    specs['Type']   = 'Immersion / Stick Blender';
    specs['Blade']  = 'Stainless Steel Detachable Blade';
    specs['Speeds'] = '2-Speed + Turbo';
    specs['Body']   = 'Ergonomic Grip, Splash Guard';
  } else if (cat.includes('juicer') || cat.includes('citrus') || cc === 'juicer') {
    if (p.watts) specs['Power'] = p.watts + 'W'; else specs['Power'] = '400–800W';
    specs['Type']         = cat.includes('citrus') || cc === 'juicer' ? 'Centrifugal / Citrus Juicer' : 'Juicer Blender';
    specs['Strainer']     = 'Stainless Steel Anti-Drip Strainer';
    specs['Pulp Control'] = cat.includes('citrus') ? 'Reversible Cone + Adjustable Pulp Control' : 'Fine / Coarse Filter';
  } else if (cat.includes('food proc') || cc === 'food_processor') {
    if (p.litres) specs['Capacity'] = p.litres; else specs['Capacity'] = 'Multi-function';
    if (p.watts) specs['Power'] = p.watts + 'W'; else specs['Power'] = '600–1000W';
    specs['Type']      = 'Food Processor / Kitchen Chef';
    specs['Functions'] = 'Chop, Slice, Shred, Blend, Knead';
    specs['Safety']    = 'Lid-Lock Safety Mechanism';
  } else if (cc === 'iron') {
    const isSteam = !cat.includes('dry iron');
    specs['Type'] = isSteam ? (p.control === 'Digital' ? 'Digital Steam Iron' : 'Steam Iron') : 'Dry Iron';
    specs['Soleplate'] = cat.includes('ceramic') ? 'Ceramic Coated (Anti-Scratch)'
      : cat.includes('alum') ? 'Aluminium Soleplate' : 'Non-Stick Coated Soleplate';
    if (p.watts) specs['Wattage'] = p.watts + 'W';
    if (isSteam) specs['Steam'] = 'Continuous + Burst Steam, Anti-Drip Tank';
    specs['Temperature Control'] = p.control === 'Digital' ? 'Digital LED Control' : 'Rotary Dial (Synthetics to Cotton)';
    specs['Safety'] = 'Auto Shut-Off (30 sec flat, 8 min upright)';
  } else if (cc === 'steamer') {
    if (p.litres) specs['Water Tank'] = p.litres;
    specs['Ready In'] = '30–45 seconds';
    specs['Steam Type'] = 'Continuous (vertical & horizontal use)';
    specs['Safety'] = 'Auto Shut-Off when tank empty';
  } else if (cc === 'rice_cooker') {
    if (p.litres) specs['Capacity'] = p.litres;
    specs['Modes'] = 'Cook → Auto Keep-Warm';
    specs['Inner Pot'] = 'Non-Stick Removable Pot';
    specs['Accessories'] = 'Steaming Tray, Measuring Cup, Rice Paddle';
  } else if (cc === 'oven') {
    if (p.litres) specs['Capacity'] = p.litres;
    specs['Functions'] = 'Bake, Grill, Rotisserie, Toast';
    specs['Heating'] = 'Top + Bottom Elements (Independent Control)';
    specs['Temperature Range'] = '100°C – 250°C';
    specs['Timer'] = 'Up to 60-Minute with Auto Shut-Off';
  } else if (cc === 'blender') {
    if (p.litres) specs['Jar Capacity'] = p.litres;
    if (p.watts) specs['Motor Power'] = p.watts + 'W';
    specs['Blade'] = 'Stainless Steel 6-Blade';
    specs['Jar'] = cat.includes('glass') ? 'Borosilicate Glass Jar' : 'Unbreakable BPA-Free Jar';
    specs['Functions'] = 'Blend, Grind, Crush Ice, Pulse';
  } else if (cc === 'chopper') {
    if (p.litres) specs['Bowl Capacity'] = p.litres;
    specs['Blade'] = 'Stainless Steel Chopping Blade';
    specs['Safety'] = 'Lid-Lock Activation';
  } else if (cc === 'hair_dryer') {
    if (p.watts) specs['Wattage'] = p.watts + 'W';
    specs['Heat Settings'] = '2 Heat + Cool Shot';
    specs['Speed Settings'] = '2 Speed';
    specs['Concentrator'] = 'Yes (included)';
  } else if (cc === 'hair_straightener') {
    specs['Plate Material'] = cat.includes('titanium') ? 'Titanium Plates' : 'Ceramic / Tourmaline-Coated Plates';
    specs['Temperature Range'] = '150°C – 230°C';
    specs['Heat-Up Time'] = 'Ready in ~30 seconds';
    specs['Safety'] = 'Auto Shut-Off after 30 minutes, Cool-Touch Tips';
  } else if (cc === 'hair_crimper') {
    specs['Plate Material'] = 'Ceramic Coated Plates';
    specs['Safety'] = 'Cool-Touch Body, Auto Shut-Off';
  } else if (cc === 'curling_iron') {
    specs['Barrel Material'] = 'Ceramic / Tourmaline';
    specs['Temperature Range'] = '150°C – 210°C';
    specs['Safety'] = 'Cool-Tip, Heat-Resistant Glove Included';
  } else if (cc === 'vacuum') {
    if (p.litres) specs['Capacity'] = p.litres;
    if (p.watts) specs['Power'] = p.watts + 'W';
    specs['Filtration'] = cat.includes('hepa') ? 'HEPA (captures 99.9% particles)' : 'Multi-Stage Filtration';
    specs['Type'] = cat.includes('handy') || cat.includes('hand') ? 'Handheld / Portable'
      : cat.includes('robot') ? 'Robot Vacuum' : 'Upright / Canister';
    specs['Accessories'] = 'Floor Brush, Crevice Tool, Upholstery Brush';
  } else if (cc === 'water_dispenser') {
    specs['Type']             = cat.includes('bottom') ? 'Bottom Load' : cat.includes('floor') ? 'Floor Standing' : 'Top Load';
    specs['Hot Temperature']  = '90–95°C';
    specs['Cold Temperature'] = '5–10°C';
    specs['Compressor']       = 'Yes — Compressor Cooling';
    specs['Bottle']           = 'Standard 19-Litre Bottle';
    specs['Tank']             = 'Stainless Steel Hot Tank, Food-Grade Cold Tank';
    specs['Safety']           = 'Hot Water Child Safety Lock';
  } else if (cc === 'air_cooler') {
    if (p.watts) specs['Motor Power'] = p.watts + 'W';
    const isInv = /INV|INVERTER|DC\s*12V|AC\/DC/.test(model.toUpperCase());
    specs['Type']        = cat.includes('room') ? 'Room Air Cooler' : 'Personal Air Cooler';
    specs['Cooling']     = 'Evaporative Cooling (honeycomb pads)';
    specs['Motor']       = isInv ? 'DC Inverter Motor (AC/DC dual power)' : 'AC Motor';
    specs['Water Tank']  = 'Removable tank — fill from top';
    specs['Functions']   = 'Cool + Fan + Humidity';
    specs['Speed Settings'] = '3 Speed Settings';
    specs['Oscillation'] = 'Yes — wide horizontal sweep';
    specs['Power Draw']  = isInv ? '≈ 60–120W (vs. 1000W+ for AC)' : '≈ 80–200W';
  } else if (cc === 'fan') {
    specs['Type'] = cat.includes('pedestal') ? 'Pedestal (Stand)' : cat.includes('wall') ? 'Wall Fan' : cat.includes('ceiling') ? 'Ceiling Fan' : 'Table Fan';
    specs['Speed Settings'] = '3 Speed Settings';
    if (!cat.includes('ceiling')) specs['Oscillation'] = 'Yes (70°–120°)';
    if (p.size) specs['Blade Sweep'] = p.size + '"';
    specs['Control'] = cat.includes('remote') ? 'Remote Control + Push-Button Panel' : 'Push-Button Panel';
  } else if (cc === 'heater') {
    specs['Type'] = cat.includes('oil') || cat.includes('radiator') ? 'Oil-Filled Radiator'
      : cat.includes('halogen') ? 'Halogen Heater' : 'Fan Heater';
    if (p.watts) specs['Wattage'] = p.watts + 'W';
    specs['Safety'] = 'Tip-Over Protection, Overheat Shut-Off';
  } else if (cc === 'induction') {
    if (p.watts) specs['Power'] = p.watts + 'W';
    specs['Temperature Range'] = '60°C – 240°C';
    specs['Plate'] = 'Crystal Glass Ceramic';
    specs['Safety'] = 'Auto Shut-Off, Child Lock, Overheat Protection';
  } else {
    // Unknown / unclassified
    if (p.litres) specs['Capacity'] = p.litres;
    if (p.watts) specs['Power'] = p.watts + 'W';
    if (p.material) specs['Material'] = p.material;
    if (category) specs['Type'] = category;
  }
  return specs;
}

// ── Classification: canonical category resolution ─────────────────────────────
//
// Rules are checked IN ORDER — most-specific first.
// A rule matches when ANY keyword is found in the category string AND no forbidden
// keyword is found. Model-pattern fallback only runs for major appliances.
// Returns a stable snake_case id used by all downstream enrichment functions.

interface _CatRule {
  id: string;
  keywords: string[];
  forbid?: string[];
  modelRx?: RegExp;
}

// Brands that manufacture air conditioners (used in model-pattern fallback)
const _AC_BRANDS = new Set([
  'haier','gree','dawlance','pel','orient','kenwood','waves',
  'samsung','lg','tcl','inverex','midea','chigo','changhong','carrier','daikin',
]);

const _CATEGORY_RULES: _CatRule[] = [
  // ── Small appliances checked FIRST — avoids "air" matching AC, "wash" matching WM, etc. ──
  { id: 'air_fryer',         keywords: ['air fry', 'fryer'] },
  { id: 'air_cooler',        keywords: ['air cool', 'evaporat', 'desert cool', 'room cool'] },
  { id: 'air_purifier',      keywords: ['air purif', 'purifier', 'air cleaner'] },
  { id: 'microwave',         keywords: ['microwave'] },
  { id: 'oven',              keywords: ['baking oven', 'electric oven', 'convection oven', 'toaster oven', 'rotisserie oven'], forbid: ['microwave'] },
  { id: 'kettle',            keywords: ['kettle'],
    modelRx: /^(?:DWEK|WF-\d{4}K)[\s-]?\d/i },
  { id: 'toaster',           keywords: ['bread toast', 'pop-up toast', 'slice toaster'] },
  { id: 'sandwich_maker',    keywords: ['sandwich maker', 'sandwich grill', 'waffle maker', 'panini press', 'grill maker'], forbid: ['washing', 'dispenser'] },
  { id: 'hand_blender',      keywords: ['hand blend', 'immersion blend', 'stick blend', 'hand blender'] },
  { id: 'blender',           keywords: ['blender', 'liquidis', 'liquidiz'], forbid: ['hand blend', 'immersion'] },
  { id: 'juicer',            keywords: ['juicer', 'citrus juicer', 'centrifugal juicer', 'slow juicer'] },
  { id: 'food_processor',    keywords: ['food processor', 'food prep', 'kitchen machine'] },
  { id: 'chopper',           keywords: ['chopper', 'mini chopper', 'vegetable chopper', 'food chopper'] },
  { id: 'rice_cooker',       keywords: ['rice cook', 'rice cooker'] },
  { id: 'induction',         keywords: ['induction cook', 'induction cooker', 'induction hob'] },
  { id: 'iron',              keywords: ['steam iron', 'dry iron', 'electric iron', 'garment press', 'travel iron', 'cordless iron'],
    modelRx: /^(?:DWDI|DWSI|DWCI|DWII|DWPI)[\s-]?\d/i,
    forbid: ['hair', 'curl', 'straighten', 'crimp', 'cast'] },
  { id: 'steamer',           keywords: ['garment steamer', 'clothes steamer', 'steam generator', 'handheld steamer'],
    modelRx: /^(?:DWGS|DWCS|DWSS)[\s-]?\d/i },
  { id: 'hair_dryer',        keywords: ['hair dryer', 'hair drier', 'blow dryer', 'hair dry'],
    modelRx: /^(?:DWHD|DWBD|DWHB)[\s-]?\d/i },
  { id: 'hair_straightener', keywords: ['hair straightener', 'straightener', 'hair straight', 'flat iron', 'hair iron'] },
  { id: 'hair_crimper',      keywords: ['crimper', 'hair crimper'] },
  { id: 'curling_iron',      keywords: ['curling iron', 'curling wand', 'hair curler', 'curl iron'] },
  { id: 'vacuum',            keywords: ['vacuum cleaner', 'vacuum', 'vacum'] },
  { id: 'water_dispenser',   keywords: ['water dispenser', 'water cooler dispenser', 'water cooler and dispenser', 'hot and cold dispenser'] },
  { id: 'water_heater',      keywords: ['water heater', 'geyser', 'instant water'],
    modelRx: /^(?:DWHP|SGW|IWH|SWH|EWH)[\s-]?\d/i },
  { id: 'heater',            keywords: ['room heater', 'oil heater', 'fan heater', 'electric heater', 'oil filled heater', 'halogen heater', 'convector heater'] },
  { id: 'fan',               keywords: ['pedestal fan', 'wall fan', 'table fan', 'ceiling fan', 'stand fan', 'bracket fan'], forbid: ['heater', 'microwave', 'cooler'] },
  { id: 'chimney',           keywords: ['kitchen chimney', 'exhaust hood', 'kitchen hood', 'range hood'] },

  // ── Major appliances AFTER small appliances ──
  // "air conditioner" requires multi-word keyword to avoid matching "air fryer" etc.
  { id: 'air_conditioner',
    keywords: ['air conditioner', 'air conditioning', 'split ac', 'inverter ac', 'window ac', 'portable ac', 'cassette ac', 'dc inverter',
               'floor standing', 'floor stand', 'cassette unit', 'duct ac', 'ducted ac', 'concealed ac',
               'charmo', 'pular', 'lomo', 'fairy', 'clivia', 'u-crown', 'u crown', 'bora',
               'splits',                                    // Dawlance CSV category name
               'cool only', 'heat cool', 'heat & cool',    // EcoStar mode-based names
               'duke', 'ario', 'emperor', 'nova', 'prince', // EcoStar series names
               'cassette', 'floor stand', 'commercial'],   // unit-type names
    modelRx: /^(?:HSU|HPU|GS-?|GF-?|GEA|PAC-?|OSA|OWS|WSA|KWA?|KE-|ON-|DC-|RAS|SAC)\d{2}/i },
  // Deep freezer — checked BEFORE refrigerator so 'chest freezer' / 'deep freezer' don't fall to refrigerator
  { id: 'deep_freezer',
    keywords: ['deep freezer', 'chest freezer', 'vertical freezer', 'full freezer', 'double door freezer'],
    modelRx: /^(?:HDF|DZF|DFD|DAF|WINDFT|WDF-|NDF)\d/i },
  { id: 'refrigerator',
    keywords: ['refrigerator', 'inverter fridge', 'side by side', 'no frost', 'minibar'],
    modelRx: /^(?:HRF|HRB|DAM|DAR|DZR|LRF|PRL|ORF|PRF|INV-[0-9])\d/i,
    forbid: ['washing', 'freezer'] },
  // Spinner / spin dryer — checked BEFORE washing machine to prevent misclassification
  { id: 'spinner',
    keywords: ['spin dryer', 'spinner', 'spin only', 'spinning machine', 'spin machine', 'centrifuge dryer'],
    modelRx: /^HD[-\s]\d/i },
  { id: 'washing_machine',
    keywords: ['washing machine', 'front load', 'top load', 'twin tub', 'fully automatic', 'semi automatic', 'automatic washer', 'washer dryer',
               'usb'],   // EcoStar CSV uses "USB" as the category name for their ESW-series washers
    modelRx: /^(?:HWM|DWF|DWT|DWH|HWD|DW-|WF-|WM-|TW-|ESW-)[\s-]?\d/i,
    forbid: ['dish'] },
  { id: 'television',
    keywords: ['television', 'smart tv', 'led tv', 'qled tv', 'oled tv', '4k tv', 'android tv', 'google tv'],
    modelRx: /^\d{2,3}[A-Z]{1,3}\d+/i },
  { id: 'solar',
    keywords: ['solar panel', 'solar system', 'solar inverter', 'solar battery', 'solar energy', 'solar solution', 'solar kit'] },

  // Catch-all qualifiers — checked last to avoid mismatching compound categories
  { id: 'fan',    keywords: ['fan'],    forbid: ['heater', 'microwave', 'cooler', 'dispenser', 'fryer'] },
  { id: 'oven',   keywords: ['oven'],   forbid: ['microwave'] },
  { id: 'iron',   keywords: ['iron'],   forbid: ['hair', 'cast', 'wrought', 'curling', 'straighten'] },
  { id: 'heater', keywords: ['heater'], forbid: ['water'] },

  // Gas / plumbing appliances — matched via modelRx because CSV category is generic "Gas Appliances"
  { id: 'gas_hob',
    keywords: ['gas hob', 'hob', 'gas stove', 'cooking range', 'burner hob', 'stove burner'],
    modelRx: /\bHOB\b|COOKING[\s-]?RANGE|\bDHG\b|DCI[\s-]?SS|WC[-\s]\d{3}|\bSTOVE\b|NG[\s-]DG/i },

  // Batteries — UPS / inverter batteries (AGS, Osaka, Phoenix, Inverex tubular/acid)
  { id: 'battery',
    keywords: ['tubular battery', 'acid battery', 'solar battery', 'inverter battery', 'lithium battery', 'lifepo4 battery'],
    modelRx: /\bTUBULAR\b|LIFEP|LIFEPO|ELEKTRA\s*BOOST|SP-\d{3}|HT\d{2,3}[A-Z]|OSX|OHT/i },

  // UPS devices
  { id: 'ups',
    keywords: ['ups', 'uninterruptible power'],
    modelRx: /\bUPS\b.*\d{3,}W?|\bAPOLLO\s*UPS|HOMEAGE|NEWAGE.*UPS/i },

  // Mattresses / foam
  { id: 'mattress',
    keywords: ['mattress', 'master foam', 'master spring', 'molty', 'durafoam', 'canon foam', 'foam mattress', 'spring mattress', 'ortho foam'] },

  // Beds (metal / bunk)
  { id: 'bed',
    keywords: ['master bed', 'metal bed', 'bunker bed', 'double bed', 'single bed', 'bed frame'] },
];

// CSV categories that are too broad to identify a product type on their own.
// For these, keywords are also matched against the model string (which Dawlance
// and similar brands sometimes populate with a description like "DRY IRON DWDI 1020").
const _GENERIC_CATS = new Set(['small appliances', 'kitchen appliances', 'gas appliances', 'home appliances']);

// Dawlance small-appliance model prefix → canonical category.
// Dawlance encodes the product type in the two letters after "DW" (e.g. DWAF = Air Fryer).
// This table is used when the CSV category is the generic "Small Appliances".
const _DW_PREFIX_MAP: Record<string, string> = {
  DWAF: 'air_fryer',       // Air Fryer
  DWBL: 'blender',         // Blender
  DWCM: 'kettle',          // Coffee Machine (hot beverages)
  DWCP: 'chopper',         // Chopper
  DWCS: 'steamer',         // Clothes/Garment Steamer
  DWDI: 'iron',            // Dry Iron
  DWEK: 'kettle',          // Electric Kettle
  DWFP: 'food_processor',  // Food Processor
  DWGS: 'steamer',         // Garment Steamer
  DWHB: 'hand_blender',    // Hand Blender
  DWHD: 'hair_dryer',      // Hair Dryer
  DWHJ: 'juicer',          // Hand Juicer
  DWHP: 'water_heater',    // Water Heating Product (geyser)
  DWHS: 'hair_straightener',// Hair Straightener
  DWMX: 'blender',         // Mixer
  DWRM: 'heater',          // Room heater
  DWSI: 'iron',            // Steam Iron
  DWSM: 'sandwich_maker',  // Sandwich Maker
  DWTB: 'toaster',         // Toaster/Bread Toaster
  DWVF: 'vacuum',          // Vacuum cleaner
};

export function resolveCanonicalCategory(brand: string, model: string, category: string): string {
  const cat = category.toLowerCase().trim();
  const m   = model.toUpperCase().trim();
  const ml  = model.toLowerCase().trim();
  const b   = brand.toLowerCase().trim();

  // Built-in ovens are sometimes filed under "Hood & Hobs" in the CSV — detect via model
  if (/BUILT[-\s]*IN[-\s]*OVEN|BAKING\s*OVEN/i.test(m)) return 'oven';

  // Dawlance DW** prefix dispatch for generic "Small Appliances" CSV category
  if (b === 'dawlance' && _GENERIC_CATS.has(cat)) {
    const prefix = m.match(/\b(DW[A-Z]{2})\b/)?.[1];
    if (prefix && _DW_PREFIX_MAP[prefix]) return _DW_PREFIX_MAP[prefix];
  }

  for (const rule of _CATEGORY_RULES) {
    if (rule.forbid?.some(f => cat.includes(f))) continue;
    if (rule.keywords.some(kw => cat.includes(kw))) return rule.id;
    // For generic CSV categories, also try keyword match against the model/name field
    if (_GENERIC_CATS.has(cat) && rule.keywords.some(kw => ml.includes(kw))) {
      if (!rule.forbid?.some(f => ml.includes(f))) return rule.id;
    }
    // Model-pattern fallback (major appliances only)
    if (rule.modelRx && rule.modelRx.test(m)) {
      // AC model patterns only fire if brand is known AC manufacturer
      if (rule.id === 'air_conditioner' && !_AC_BRANDS.has(b)) continue;
      // Westpoint WF- prefix is used for ALL product types — never infer washing_machine from it
      if (rule.id === 'washing_machine' && b === 'westpoint') continue;
      // Reject if category explicitly names something else
      if (['fryer','fridge','wash','telev','solar'].some(f => cat.includes(f))) continue;
      return rule.id;
    }
  }
  return 'unknown';
}

export const CANONICAL_DISPLAY: Record<string, string> = {
  air_conditioner:  'Air Conditioner',
  refrigerator:     'Refrigerator',
  washing_machine:  'Washing Machine',
  spinner:          'Spin Dryer',
  television:       'TV',
  solar:            'Solar System',
  air_fryer:        'Air Fryer',
  air_cooler:       'Air Cooler',
  air_purifier:     'Air Purifier',
  microwave:        'Microwave Oven',
  oven:             'Electric Oven',
  kettle:           'Electric Kettle',
  toaster:          'Bread Toaster',
  sandwich_maker:   'Sandwich Maker',
  hand_blender:     'Hand Blender',
  blender:          'Blender',
  juicer:           'Juicer',
  food_processor:   'Food Processor',
  chopper:          'Food Chopper',
  rice_cooker:      'Rice Cooker',
  induction:        'Induction Cooker',
  iron:             'Electric Iron',
  steamer:          'Garment Steamer',
  hair_dryer:       'Hair Dryer',
  hair_straightener:'Hair Straightener',
  hair_crimper:     'Hair Crimper',
  curling_iron:     'Curling Iron',
  vacuum:           'Vacuum Cleaner',
  water_dispenser:  'Water Dispenser',
  water_heater:     'Water Heater',
  fan:              'Fan',
  heater:           'Room Heater',
  chimney:          'Kitchen Chimney',
  deep_freezer:     'Deep Freezer',
  gas_hob:          'Gas Hob',
  battery:          'Battery',
  ups:              'UPS',
  mattress:         'Mattress',
  bed:              'Bed',
  unknown:          'Appliance',
};

// ── Washing machine type helpers ──────────────────────────────────────────────
//
// Two separate functions with different contracts:
//
//  _wmTypeLabel(category)
//    Reads ONLY the category string. Returns the human-readable type label to
//    use in product names and sub-categories, or '' when the category gives no
//    explicit type information. NEVER uses model codes — we will NEVER put a
//    wrong type on a product name just because the model prefix matches a guess.
//
//  _wmType(model, category)
//    Used for specs and description generation only. Falls back to model codes
//    when the category is generic (e.g. "Washing Machines") so specs/description
//    can still be technically accurate.
//
// 'generic' = type cannot be determined from category or model — never publish a wrong type
type _WMType = 'front_load' | 'top_load' | 'twin_tub' | 'fully_auto' | 'semi_auto' | 'generic';

function _wmTypeLabel(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('front load')   || cat.includes('front-load'))                        return 'Front Load';
  if (cat.includes('top load')     || cat.includes('top-load'))                           return 'Top Load';
  if (cat.includes('twin tub')     || cat.includes('twin-tub') || cat.includes('double tub')) return 'Twin Tub';
  if (cat.includes('fully automatic') || cat.includes('fully-automatic'))                return 'Fully Automatic';
  if (cat.includes('automatic')    && !cat.includes('semi'))                              return 'Fully Automatic';
  if (cat.includes('semi automatic') || cat.includes('semi-automatic')
      || cat.includes('semi auto') || cat.includes('semi'))                              return 'Semi-Automatic';
  return ''; // category does not specify type — do NOT infer
}

function _wmType(model: string, category: string, brand?: string): _WMType {
  const bl = (brand || '').toLowerCase();
  // Step 1: category string — only authoritative source for type
  const label = _wmTypeLabel(category);
  if (label === 'Front Load')      return 'front_load';
  if (label === 'Top Load')        return 'top_load';
  if (label === 'Twin Tub')        return 'twin_tub';
  if (label === 'Fully Automatic') {
    const m2 = (model || '').toUpperCase();
    if (_isFrontLoadModel(m2, bl)) return 'front_load';
    return 'top_load'; // default for fully automatic
  }
  if (label === 'Semi-Automatic')  return 'semi_auto';

  // Step 2: model codes — only use for unambiguous structural indicators
  const m = (model || '').toUpperCase();
  if (_isFrontLoadModel(m, bl))           return 'front_load';
  if (/\bDWT\b|\bWDT\b/.test(m))          return 'top_load';
  if (/\bTWIN\b/.test(m))                  return 'twin_tub';
  if (/\bDW[- ]?\d{4}/.test(m))           return 'twin_tub';
  if (/\bDS[- ]?\d/.test(m))              return 'semi_auto';

  return 'generic';
}

/** True when model code unambiguously indicates a front-load machine. */
function _isFrontLoadModel(m: string, brand = ''): boolean {
  if (/\bDWF\b|\bWDF\b|\bHWD\b/.test(m))   return true; // Dawlance DWF, Haier HWD
  if (/\bHD[- ]?\d{2,4}\b/.test(m))         return true; // Haier HD series (HD-60, HD-80, HD-7200)
  if (/\bFL\b|FRONT[-\s]?LOAD/.test(m))     return true; // generic FL / FRONT-LOAD markers
  if (/\bESW[-\s]?F\d/.test(m))             return true; // EcoStar ESW-Fxxx
  if (/\bWMF[-\s]?\d/.test(m))              return true; // generic WMF prefix
  // Dawlance front-load models sometimes stored without DWF prefix (e.g. "7200 X INV")
  if (brand === 'dawlance' && /\b7[12]\d{2}\b|\b8[12]\d{2}\b/.test(m)) return true;
  return false;
}

// ── Shared washing-machine sub-label used by both name & sub-category ─────────
function _wmSubLabel(model: string, category: string, brand?: string): string {
  const bl = (brand || '').toLowerCase();
  const label = _wmTypeLabel(category);
  if (label === 'Front Load')      return 'Front-Load Fully Automatic';
  if (label === 'Top Load')        return 'Top-Load Fully Automatic';
  if (label === 'Fully Automatic') {
    if (_isFrontLoadModel(model.toUpperCase(), bl)) return 'Front-Load Fully Automatic';
    return 'Top-Load Fully Automatic';
  }
  if (label === 'Twin Tub')        return 'Semi-Automatic';
  if (label === 'Semi-Automatic')  return 'Semi-Automatic';
  const m = model.toUpperCase();
  // Dawlance model series detection
  if (/\bDWF\b|\bDWF-/.test(m))  return 'Front-Load Fully Automatic';
  if (/\bDWT\b|\bDWT-/.test(m))  return 'Top-Load Fully Automatic';
  if (/\bDS[- ]?\d/.test(m))     return 'Spinner (Semi-Automatic)';
  if (/\bDW[- ]?\d{4}/.test(m))  return 'Twin Tub — Semi-Automatic';
  // Haier HD = front-load automatic
  if (/\bHD[- ]?\d{2}/.test(m))  return 'Front-Load Fully Automatic';
  // Haier HWM series detection from model suffix (model suffix after the kg digits)
  if (/\bHWM\b/.test(m)) {
    // Semi-automatic series: 1217 (twin-tub), 35 FF (twin-tub)
    if (/1217|\b35[-\s]*FF\b|\bFF\b/.test(m)) return 'Semi-Automatic';
    // Fully-automatic top-load series: 826, 316, 1978, B699, 1678, 688, 120, 326, 696
    if (/826|316|1978|B699|1678|688|696|326/.test(m)) return 'Top-Load Fully Automatic';
  }
  return '';
}

// ── Enrichment: specs builder ─────────────────────────────────────────────────

function _buildSpecs(brand: string, model: string, category: string, cc: string): Record<string, string> {
  const specs: Record<string, string> = {};
  const m = model.toUpperCase(); const b = brand.toLowerCase();

  // ── Air Conditioners ──
  if (cc === 'air_conditioner') {
    const ton = _tonFromAC(m, b);
    if (ton) {
      const tonNum = parseFloat(ton);
      specs['Tonnage'] = ton + ' Ton';
      specs['Cooling Capacity'] = Math.round(tonNum * 12000).toLocaleString() + ' BTU/hr';
      specs['Coverage Area'] = 'Up to ' + Math.round(tonNum * 120) + ' sq.ft';
      // Room size recommendations for Pakistani conditions (higher cooling load than temperate climates)
      if (tonNum <= 1.1) {
        specs['Recommended Room'] = '100–130 sq.ft | e.g. 10×10 to 11×12 ft room | Volume ~900–1,200 cu.ft (9 ft ceiling)';
      } else if (tonNum <= 1.6) {
        specs['Recommended Room'] = '130–200 sq.ft | e.g. 11×12 to 13×15 ft room | Volume ~1,200–2,200 cu.ft (9 ft ceiling)';
      } else {
        specs['Recommended Room'] = '200–350 sq.ft | e.g. 14×14 to 18×20 ft room | Volume ~1,800–3,200 cu.ft (9 ft ceiling)';
      }
    }
    const isInv = /HNF|PITH|CITH|FAIRY|LOMO|UFLY|ULTRA|INVERTER|\bINV\b|\bDC\b|LF\b|LFW|HFT|HFP|HPM|RFP/.test(m);
    const isHC  = /HFC|HFAB|HFTEX|HPU|PRIMA|GALLANT|HEAT|H&C/.test(m);
    specs['Type']             = isHC ? 'Split AC (Heat & Cool)' : 'Split Air Conditioner';
    specs['Inverter']         = isInv ? 'Yes' : 'No';
    specs['Compressor']       = isInv ? 'DC Inverter (Variable Speed)' : 'Conventional Rotary';
    specs['T3 Rating']        = 'Yes — T3 Tropical Rated (operates up to 52°C ambient)';
    specs['Gas Type']         = 'R32 (Eco-Friendly, Low GWP)';
    if (ton) specs['Power Consumption'] = Math.round(parseFloat(ton) * (isInv ? 850 : 1100)) + 'W';
    specs['Energy Rating']    = isInv ? '5-Star Inverter' : '3-Star';
    specs['Heating']         = isHC ? 'Yes — Heat & Cool (works in winter)' : 'No (cooling only)';
    specs['Auto Restart']    = 'Yes — resumes last setting after power failure';
    specs['Turbo Cool']      = 'Yes — rapid cooling mode';
    specs['Sleep Mode']      = 'Yes — auto temperature adjustment at night';
    specs['Self Cleaning']   = /SELF.CLEAN|CLEAN/.test(m) ? 'Yes — indoor unit self-clean function' : 'No';
    specs['Air Purifier']    = /PURIF|HEPA|FILTER|UV|PM2/.test(m) ? 'Yes — built-in air purification' : 'No';
    specs['Noise Level']     = 'Indoor: ≤ 38 dB | Outdoor: ≤ 52 dB';
    if (ton) {
      const w = parseInt(ton);
      specs['Dimensions']    = (w <= 1 ? '835 × 210 × 290' : w <= 1.5 ? '880 × 225 × 320' : '1050 × 260 × 365') + ' mm — indoor unit (W×H×D)';
    }
    specs['Remote Control'] = 'Yes (LCD remote with Sleep & Timer)';
    specs['Power Supply']   = '220V / 50Hz, Single Phase';
    const wifiApp = b === 'haier' ? 'Yes (HaiSense App)' : b === 'gree' ? 'Yes (Gree+ App)' : b === 'ecostar' ? 'Yes (EcoStar App)' : 'Optional Add-On';
    specs['WiFi']           = /WIFI|SMART|APP/.test(m) ? wifiApp : 'No';
  }

  // ── Refrigerators ──
  else if (cc === 'refrigerator') {
    const cf = _cfFromFridge(m);
    if (cf !== '') {
      specs['Capacity'] = cf + ' Cu.Ft (' + Math.round(cf * 28.3) + ' Litres approx.)';
      const cfN = parseFloat(String(cf));
      if (cfN > 0) {
        specs['Ideal For'] = cfN <= 10 ? '1–2 persons'
                           : cfN <= 14 ? '2–3 persons'
                           : cfN <= 18 ? '3–4 persons'
                           : cfN <= 22 ? '4–5 persons'
                           : cfN <= 27 ? '5–6 persons'
                           : '6–8 persons';
      }
    }

    // ── Technology detection ──────────────────────────────────────────────────
    // Haier sub-series suffixes
    const isIG = /\bHDF\b/.test(m) && /\bIG\b/.test(m);
    const isIF = /\bIF\b|IFRA|IFGA/.test(m);
    const isIP = /\bIP\b|IPRA|IPGA/.test(m);

    const isSBS   = /SBS|\bDSS\b|\bDTM\b|IFF/.test(m);
    const isGlass = isIG || /IFGA|IPGA|GLASS|\bGD\b|\bID\b|\bIA\b/.test(m);
    const isDF    = /\bHDF\b/.test(m);

    // Dawlance "+" suffix on a series name = inverter (Avante+ / Chrome+ / Graze+ / Acce+)
    // No "+" = conventional even if same series name (Avante ≠ Avante+)
    const hasDlPlus = b === 'dawlance' && /(?:AVANTE|CHROME|GRAZE|NOVA|ACCE)\+/.test(m);

    // WB = Wide Body (form factor only, NOT a technology indicator)
    // isInv: EXPLICIT technology markers + Dawlance "+" series names.
    // LF suffix = inverter compressor only — does NOT mean no-frost.
    const isInv = isIG || isIF || isIP || hasDlPlus || /\bINV\b|INVERTER|LF\b/.test(m);

    // isNoFrost: fan-forced frost-free cooling — only when EXPLICITLY stated.
    // Dawlance LF = inverter with auto defrost, NOT fan-forced no-frost.
    // Only SBS, Haier IF/IG, or explicit NO-FROST/FROST-FREE text qualifies.
    const isNoFrost = isSBS || (isInv && (/NO.?FROST|FROST.FREE/.test(m) || isIF || isIG));

    // ── Spec output ───────────────────────────────────────────────────────────
    const isWB = b === 'dawlance' && /\bWB\b/.test(m);
    specs['Type']       = isSBS ? 'Side-by-Side (No-Frost)' : isGlass ? 'Glass Door' : isDF ? 'Deep Freezer' : 'Double Door';
    if (isWB) specs['Body Style'] = 'Wide Body';
    specs['Defrost']    = isNoFrost ? 'Auto / No-Frost (Fan-Forced)' : isInv ? 'Auto Defrost' : 'Manual (Freezer Compartment)';
    specs['Cooling System'] = isNoFrost ? 'No Frost (Fan-Forced Cooling)' : isInv ? 'Auto Defrost' : 'Direct Cool';
    specs['Inverter']   = isInv ? 'Yes' : 'No';
    specs['Compressor'] = isInv ? 'Inverter Compressor (Variable Speed, Energy Saving)' : 'Conventional Compressor';

    if (isIF)  specs['Control Display'] = 'Digital LED Temperature Display';
    if (isIP)  specs['Control Display'] = 'Mechanical Thermostat (No Digital Display)';
    if (isIG)  specs['Control Display'] = 'Electronic Controls — Glass Door Model';

    specs['Refrigerant']   = 'R600a (Zero Ozone Depletion)';
    specs['Climate Class'] = 'T — Tropical (Designed for Pakistan)';
    // Stabilizer-free voltage range is a feature of inverter models only
    if (isInv) specs['Voltage Tolerance'] = '130V – 260V (No Stabilizer Required)';

    // Door alarm: only on confirmed premium/inverter models with digital controls
    specs['Door Alarm']  = (isNoFrost || isIF || isIG || isSBS) ? 'Yes — audible door-open alarm' : 'No';
    specs['Child Lock']  = (isIF || isIG || isSBS) ? 'Yes (panel lock)' : 'No';

    if (!isDF) specs['Crisper Drawer'] = 'Yes — humidity-controlled';
    specs['Interior Light'] = 'LED';

    const cfNum = parseFloat(String(cf || 0));
    if (!isDF && cfNum > 0) {
      const shelves = cfNum <= 10 ? 2 : cfNum <= 14 ? 3 : 4;
      specs['Glass Shelves'] = shelves + ' adjustable glass shelves';
      specs['Door Shelves']  = shelves + ' door pockets / bottle rack';
    }
    if (isSBS) {
      specs['Glass Shelves'] = '4 adjustable glass shelves (fridge) + 4 freezer drawers';
      specs['Door Shelves']  = '5 door pockets each side';
    }
    if (cfNum > 0) {
      const pw = Math.round((60 + cfNum * (isInv ? 4 : 6)) / 5) * 5;
      specs['Power Consumption'] = pw + 'W (avg. annual: ' + Math.round(pw * 8 * 365 / 1000) + ' kWh/yr)';
      const h = cfNum <= 10 ? 152 : cfNum <= 14 ? 163 : cfNum <= 18 ? 172 : 178;
      specs['Dimensions'] = h + ' × ' + (isSBS ? 91 : 60) + ' × ' + (isSBS ? 67 : 65) + ' cm (H×W×D, approx.)';
      specs['Net Weight']  = Math.round(30 + cfNum * 2.5) + ' kg (approx.)';
    }
    specs['Power Supply'] = '220V / 50Hz';
    if (b === 'haier')    specs['Hygiene Filter']       = 'Yes (Anti-Bacterial)';
    if (b === 'dawlance') specs['Inverter Technology']  = isInv ? 'Yes — up to 40% energy saving' : 'No';
  }

  // ── Washing Machines ──
  else if (cc === 'washing_machine') {
    const wt = _wmType(model, category, brand);
    // ── Capacity extraction ──────────────────────────────────────────────────
    // Haier HWM: HWM-120-xxx → 120/10 = 12 kg; HWM-75-AS → 7.5 kg
    const hwmM = m.match(/\bHWM[\s-]?(\d{2,3})[-\s]/);
    // Haier HD front-load/dryer: HD-60-50 → 6 kg, HD-80-60 → 8 kg
    const hdM  = !hwmM && m.match(/\bHD[- ]?(\d{2})[- ]/);
    // Dawlance DWF front-load: DWF-7120 → 7 kg, DWF-8200 → 8 kg
    const dwfM = !hwmM && !hdM && m.match(/\bDWF[- ]?(\d)/);
    // Dawlance DW semi-auto: DW-7500 → 7500/1000 = 7.5 kg, DW-9100 → 9 kg
    const dwM  = !hwmM && !hdM && !dwfM && m.match(/\bDW[- ]?(\d{4,5})\b/);
    // Dawlance DS spinner: DS-9000 → 9 kg, DS-6000 → 6 kg
    const dsM  = !hwmM && !hdM && !dwfM && !dwM && m.match(/\bDS[- ]?(\d)/);
    // Dawlance DWT top-load (complex numbering — heuristic based on known lineup):
    // DWT-1775 → 7.5 kg; DWT-1166/AWM-1165 → 6 kg; most DWT → 7 kg
    const dwtM = !hwmM && !hdM && !dwfM && !dwM && !dsM && m.match(/\b(?:AWM[- ])?DWT[- ]?(\d+)/);

    let kgRaw: number = 0;
    if (hwmM) {
      kgRaw = parseInt(hwmM[1]) / 10;
    } else if (hdM) {
      kgRaw = parseInt(hdM[1]) / 10;
    } else if (dwfM) {
      kgRaw = parseInt(dwfM[1]);
    } else if (dwM) {
      kgRaw = parseInt(dwM[1]) / 1000;
    } else if (dsM) {
      kgRaw = parseInt(dsM[1]);
    } else if (dwtM) {
      const d = dwtM[1];
      if (/75/.test(d))                                            kgRaw = 7.5;
      else if (/^1166/.test(d) || /^1165/.test(d) || d === '260') kgRaw = 6;
      else                                                          kgRaw = 7; // most DWT models are 7 kg
    } else {
      const ex = m.match(/(\d{2,3})\s*KG/);
      if (ex) kgRaw = parseInt(ex[1]);
    }
    if (kgRaw) {
      specs['Capacity'] = kgRaw + ' kg';
      specs['Cloth Capacity'] = kgRaw + ' kg dry laundry per cycle';
      specs['Recommended For'] = kgRaw <= 5 ? '1–2 persons'
                                : kgRaw <= 6 ? '2–3 persons'
                                : kgRaw <= 7 ? '3–4 persons'
                                : kgRaw <= 8 ? '4–5 persons'
                                : kgRaw <= 9 ? '5–6 persons'
                                : kgRaw <= 11 ? '6–7 persons'
                                : '7+ persons';
    }
    const isInvWM = /INVERTER|INV\b|SILVER STORM|SMART/.test(m);
    const isTouch = /TOUCH|GLOW|DIGITAL|SMART|LCD/.test(m);
    specs['Type']          = wt === 'front_load'  ? 'Front Load — Fully Automatic'
                           : wt === 'top_load'    ? 'Top Load — Fully Automatic'
                           : wt === 'twin_tub'    ? 'Twin Tub — Semi-Automatic'
                           : wt === 'fully_auto'  ? 'Fully Automatic'
                           : wt === 'semi_auto'   ? 'Semi-Automatic'
                           : 'Washing Machine';
    specs['RPM']           = wt === 'front_load' ? '1200 RPM'
                           : wt === 'top_load'   ? '800 RPM'
                           : '1350 RPM';
    if (wt !== 'generic') {
      specs['Programs'] = wt === 'front_load' ? 'Quick Wash, Normal, Intensive, Eco, Delicate, Spin Only'
                        : wt === 'top_load'   ? 'Normal, Gentle, Heavy Duty, Quick Wash'
                        : wt === 'fully_auto' ? 'Normal, Gentle, Heavy Duty, Quick Wash'
                        : 'Wash + Spin (2 tubs)';
    }
    specs['Temperature Control'] = (wt === 'front_load' || isTouch) ? 'Yes — adjustable wash temperature' : 'Cold water only';
    specs['Drum Material'] = wt === 'front_load' ? 'Stainless Steel (Diamond Drum)' : 'Stainless Steel / Porcelain';
    // Power consumption: estimated by capacity and type
    if (kgRaw) {
      const pw = wt === 'front_load'
        ? Math.round((500 + kgRaw * 40) / 50) * 50
        : (wt === 'twin_tub' || wt === 'semi_auto') ? 350
        : Math.round((350 + kgRaw * 40) / 50) * 50;
      specs['Power Consumption'] = pw + 'W (wash cycle)';
    }
    specs['Inverter']      = isInvWM ? 'Yes — Inverter Motor (Energy Saving)' : 'No';
    specs['Control']       = wt === 'front_load' || isTouch ? 'Digital Touch Control Panel' : 'Electromechanical (Knob & Timer)';
    specs['Display']       = wt === 'front_load' || isTouch ? 'LED Digital Display' : 'Indicator Lights';
    specs['Child Lock']    = (wt === 'front_load' || wt === 'top_load' || wt === 'fully_auto') ? 'Yes' : 'No';
    specs['Delay Start']   = wt === 'front_load' || isTouch ? 'Yes (up to 24 hrs)' : 'No';
    specs['Auto Restart']  = (wt === 'front_load' || wt === 'top_load' || wt === 'fully_auto') ? 'Yes — resumes after power failure' : 'No';
    specs['Noise Level']   = wt === 'front_load' ? '≤ 62 dB' : wt === 'top_load' || wt === 'fully_auto' ? '≤ 72 dB' : '≤ 78 dB';
    specs['Connectivity']  = /WIFI|SMART|APP/.test(m) ? 'Wi-Fi — App Control' : 'Not Available';
    // Approximate dimensions by type and kg
    if (kgRaw) {
      if (wt === 'front_load') specs['Dimensions'] = '85 × 60 × ' + (kgRaw <= 8 ? '55' : '60') + ' cm (H×W×D)';
      else if (wt === 'top_load' || wt === 'fully_auto') specs['Dimensions'] = (95 + Math.floor(kgRaw / 2)) + ' × 54 × 57 cm (H×W×D)';
    }
    specs['Water Inlet']   = 'Cold Water Only';
    specs['Body']          = 'Rust-Free Plastic Body';
    specs['Power Supply']  = '220V / 50Hz';
    if (wt === 'front_load') { specs['Water Efficiency'] = 'Up to 40% less water vs. top-load'; specs['Energy Class'] = '5-Star'; }
  }

  // ── Televisions ──
  else if (cc === 'television') {
    const szM = m.match(/(\d{2,3})["']?\s*(?:INCH|IN\b)/)
              || m.match(/^(?:UA|QA|UN|UE|LE)(\d{2})/i)
              || m.match(/^[A-Z]{1,2}(\d{2})[A-Z]/);
    const sz  = szM ? szM[1] : m.match(/^(\d{2,3})/)?.[1] || '';
    if (sz) specs['Screen Size'] = sz + '" (diagonal)';
    const is8K   = /8K/.test(m);
    const is4K   = /4K|UHD/.test(m);
    const isQled = /QLED/.test(m);
    const isFHD  = /FHD|1080/.test(m);
    const szNum = parseInt(sz || '0');
    specs['Resolution']        = is8K ? '8K Ultra HD (7680 × 4320)' : is4K ? '4K Ultra HD (3840 × 2160)' : isFHD ? 'Full HD (1920 × 1080)' : 'HD Ready (1366 × 768)';
    const isOled = /OLED/.test(m);
    const isMini = /MINI.?LED|MINILEDQLED/.test(m);
    specs['Display Type']      = isOled ? 'OLED' : isMini ? 'Mini LED QLED' : isQled ? 'QLED (Quantum Dot)' : 'Direct LED';
    specs['Panel Type']        = isOled ? 'OLED (Self-Emissive, Infinite Contrast)' : isQled ? 'QLED (Quantum Dot LED)' : 'Direct LED / VA Panel';
    specs['Display Colors']    = is8K || isQled || isOled ? '1.07 Billion Colors (10-bit)' : is4K ? '1.07 Billion Colors (8-bit + FRC)' : '16.7 Million Colors (8-bit)';
    specs['LED Capabilities']  = isOled ? 'Self-emissive pixels, infinite contrast, instant response'
                               : isMini ? 'Mini LED local dimming zones, high peak brightness'
                               : isQled ? 'Quantum dot colour enhancement, wide colour gamut (DCI-P3 > 90%)'
                               : 'Edge LED / Direct LED backlight';
    specs['Smart TV']          = 'Yes — Android TV / Google TV';
    specs['OS']                = 'Android TV / Google TV';
    specs['Voice Control']     = 'Google Assistant built-in' + (/ALEXA/.test(m) ? ' + Amazon Alexa' : '');
    specs['HDR Support']       = is4K || is8K ? 'HDR10, HLG, Dolby Vision' : 'Standard';
    specs['Refresh Rate']      = /120HZ|120H/.test(m) ? '120 Hz' : '60 Hz';
    specs['RAM']               = (is4K || is8K || isQled || isOled) ? '2 GB' : '1.5 GB';
    specs['Storage']           = (is4K || is8K || isQled || isOled) ? '16 GB' : '8 GB';
    specs['Bluetooth']         = 'Yes — Bluetooth 5.0';
    specs['HDMI']              = isQled || is8K || isOled ? '4 × HDMI 2.1' : is4K ? '3 × HDMI 2.0' : '2 × HDMI';
    specs['USB']               = is4K || is8K || isQled || isOled ? '2 × USB 3.0' : '2 × USB 2.0';
    specs['Sound Output']      = szNum >= 65 ? '60W (2.1ch + Subwoofer)' : szNum >= 55 ? '40W (2ch)' : szNum >= 43 ? '30W (2ch)' : '20W (2ch)';
    specs['Dolby']             = is4K || is8K || isQled || isOled ? 'Dolby Audio + DTS Virtual:X' : 'Dolby Audio';
    specs['Ports']             = 'HDMI, USB, Optical, AV-In, Ethernet, Headphone';
    // Power consumption by screen size
    if (szNum) {
      const pw = szNum >= 75 ? 220 : szNum >= 65 ? 160 : szNum >= 55 ? 120 : szNum >= 43 ? 80 : 60;
      specs['Power Consumption'] = pw + 'W (standby: < 0.5W)';
    }
    // Dimensions by screen size (approx. without stand)
    if (szNum) {
      const w = Math.round(szNum * 2.25); const h = Math.round(szNum * 1.28);
      specs['Dimensions'] = w + ' × ' + h + ' × 8 cm (W×H×D, without stand, approx.)';
      specs['Net Weight']  = Math.round(szNum * 0.28) + ' kg (without stand, approx.)';
    }
    specs['Connectivity'] = 'Wi-Fi 802.11ac, Bluetooth, HDMI, USB, Ethernet, Optical';
    specs['Power Supply'] = '220V / 50Hz (Stabilizer-Free)';
    if (b === 'samsung' && /Q[0-9]|QN/.test(m)) specs['Gaming Mode'] = 'Yes (Auto Low Latency Mode)';
  }

  // ── Solar Solutions ──
  else if (cc === 'solar') {
    const kwM = m.match(/(\d+\.?\d*)\s*KW/);
    const isHybrid  = /HYBRID/.test(m);
    const isOnGrid  = /ON.GRID|ONGRID/.test(m);
    const isBattery = /BATTERY|BATT/.test(m);
    const isPanel   = /PANEL/.test(m);
    if (kwM) {
      const kw = parseFloat(kwM[1]);
      specs['Wattage']                = kw + ' kW (' + Math.round(kw * 1000) + 'W)';
      specs['System Capacity']        = kw + ' kW';
      specs['Estimated Daily Output'] = (kw * 4).toFixed(0) + '–' + (kw * 5).toFixed(0) + ' kWh/day (avg. Karachi sun)';
      specs['Est. Annual Saving']     = 'Approx. PKR ' + Math.round(kw * 4 * 365 * 20).toLocaleString() + ' (at PKR 20/unit)';
    }
    specs['Type']                      = isBattery ? 'Battery Storage' : isHybrid ? 'Hybrid (Grid-Tied + Battery)' : isOnGrid ? 'On-Grid (Grid-Tied)' : isPanel ? 'Solar Panel' : 'Hybrid Solar System';
    specs['Efficiency']                = '≥ 21.5%';
    specs['Panel Technology']          = 'Monocrystalline PERC';
    specs['Works During Loadshedding'] = isHybrid || isBattery ? 'Yes — battery backup included' : 'No (grid required)';
    specs['Inverter Type']             = isHybrid ? 'Hybrid MPPT Inverter' : 'Grid-Tie MPPT Inverter';
    specs['Protection']                = 'Over-Voltage, Short Circuit, Over-Temperature';
    specs['Installation']              = 'Included — by certified engineers';
    specs['Power Supply']              = '220V / 50Hz single-phase output';
  }

  // ── Deep Freezers ──
  else if (cc === 'deep_freezer') {
    const cf = _cfFromFridge(m);
    if (cf !== '') specs['Capacity'] = cf + ' Cu.Ft (' + Math.round(cf * 28.3) + ' Litres approx.)';
    // Haier HDF: IG = Inverter + Grey, I (not IG) = Inverter white, SD = Single Door
    const isHdfIG = b === 'haier' && /HDF[-\s]?\d{3}IG/.test(m);
    const isHdfI  = b === 'haier' && /HDF[-\s]?\d{3}I(?!G)/.test(m);
    const isSD    = /\bSD\b/.test(m);
    const isInv   = isHdfIG || isHdfI || /INV|INVERTER/.test(m);
    const isVF    = /VF[-\s]/.test(m) || category.toLowerCase().includes('vertical');
    specs['Type']              = isVF ? 'Vertical / Upright Deep Freezer' : 'Chest Deep Freezer';
    if (isSD) specs['Configuration'] = 'Single Door';
    specs['Inverter']          = isInv ? 'Yes' : 'No';
    specs['Compressor']        = isInv ? 'Inverter Compressor (Variable Speed, Energy Saving)' : 'Conventional Compressor';
    specs['Defrost']           = isVF ? 'Auto Frost-Free (fan-forced)' : 'Manual (drain plug)';
    specs['Temperature Range'] = '-18°C to -24°C (freezer zone)';
    specs['Refrigerant']       = 'R600a (Zero Ozone Depletion)';
    if (isInv) specs['Voltage Tolerance'] = '130V – 260V (No Stabilizer Required)';
    specs['Interior Light']    = 'LED';
    specs['Basket']            = 'Wire storage basket(s) included';
    specs['Door Alarm']        = 'Yes — audible alarm if door left open';
    if (isHdfIG) specs['Color'] = 'Grey';
    // Power consumption estimated by capacity
    const cfNumFz = parseFloat(String(cf || 0));
    if (cfNumFz > 0) {
      const pw = Math.round((40 + cfNumFz * (isInv ? 3 : 4)) / 5) * 5;
      specs['Power Consumption'] = pw + 'W (avg.)';
      const h = isVF ? (150 + Math.round(cfNumFz * 2)) : (88 + Math.round(cfNumFz * 1.5));
      const w = isVF ? 60 : (80 + Math.round(cfNumFz * 2.5));
      specs['Dimensions']      = h + ' × ' + w + ' × 65 cm (H×W×D, approx.)';
      specs['Net Weight']      = Math.round(25 + cfNumFz * 2) + ' kg (approx.)';
    }
    specs['Power Supply']      = '220V / 50Hz';
    if (b === 'haier')    specs['Hygiene Filter'] = 'Yes (Anti-Bacterial)';
    if (b === 'dawlance') specs['Inverter Technology'] = isInv ? 'Yes — up to 35% energy saving' : 'No';
  }

  // ── Gas Hobs & Cooking Ranges ──
  else if (cc === 'gas_hob') {
    const burnM = m.match(/(\d)\s*BURNER/i) || category.match(/(\d)\s*BURNER/i);
    const burners = burnM ? parseInt(burnM[1]) : 0;
    const isGlass = /GLASS/.test(m);
    const isBrass = /BRASS/.test(m);
    const isCR    = /COOKING[\s-]?RANGE|RANGE/i.test(m);
    if (burners)       specs['Burners']           = burners + (burners === 1 ? ' Burner' : ' Burners');
    specs['Type']              = isCR ? 'Built-In Gas Cooking Range' : 'Gas Hob';
    specs['Surface']           = isGlass ? 'Toughened Glass Top' : 'Stainless Steel Body';
    specs['Burner Caps']       = isBrass ? 'Brass Burner Caps (Durable, Heat-Resistant)' : 'Cast Iron Burner Caps';
    specs['Ignition']          = isCR || /AUTO|BI\b/.test(m) ? 'Auto-Ignition (spark button)' : 'Manual Ignition (lighter/matchstick)';
    specs['Gas Pressure']      = '1000–3000 Pa (standard Pakistan LP/NG)';
    specs['Safety']            = 'Flame-Failure Device (FFD) on each burner';
    specs['Power Supply']      = 'Gas (LPG / Natural Gas compatible)';
  }

  // ── Water Heaters / Geysers ──
  else if (cc === 'water_heater') {
    const litM   = m.match(/(\d+)\s*(?:L\b|LTR|LITRE|LITER)/i);
    const galM   = m.match(/(\d+)\s*(?:GALLON|GAL\b)/i);
    const cap    = litM ? litM[1] + 'L' : galM ? galM[1] + ' Gallon (' + Math.round(parseInt(galM[1]) * 3.785) + 'L)' : '';
    const isElec = /EWH|ELECTRIC|E\+G|INSTANT/.test(m);
    const isGas  = /GAS|\bG\+E\b|\bE\+G\b/.test(m);
    const isInst = /INSTANT/.test(m);
    if (cap)           specs['Capacity']       = cap;
    specs['Type']      = isElec && isGas ? 'Dual Electric + Gas Water Heater'
                       : isElec          ? 'Electric Water Heater'
                       : 'Gas Geyser';
    specs['Heating']   = isInst ? 'Instant / Tankless (no waiting)' : 'Storage (pre-heated tank)';
    if (isElec) {
      specs['Heating Element'] = 'Copper-Sheathed Heating Element';
      specs['Thermostat']      = 'Adjustable Thermostat (40°C – 75°C)';
      specs['Safety']          = 'Over-Pressure Valve, Thermal Cut-Off, Magnesium Anode Rod (anti-corrosion)';
    }
    specs['Tank Material'] = 'Vitreous Enamel-Coated Inner Tank';
    specs['Power Supply']  = isElec ? '220V / 50Hz (2000W heating element)' : 'Natural Gas / LPG';
    const gaugeM = m.match(/(\d+)\s*[Xx×]\s*(\d+)/);
    if (gaugeM) specs['Gauge']  = gaugeM[1] + ' × ' + gaugeM[2] + ' gauge';
  }

  // ── Batteries ──
  else if (cc === 'battery') {
    const ahM  = m.match(/(\d{2,3})\s*AH/i);
    const kwM  = m.match(/(\d+\.?\d*)\s*KW/i);
    const volt = m.match(/(\d{2}\.?\d*)V\b/)?.[1];
    if (ahM)  specs['Capacity (AH)'] = ahM[1] + ' AH';
    if (kwM)  specs['Capacity (kWh)'] = kwM[1] + ' kWh';
    if (volt) specs['Voltage'] = volt + 'V';
    const isLi  = /LIFEP|LIFEPO|LITHIUM|LI.ION|LI-ION/.test(m);
    const isTub = /TUBULAR/.test(m);
    specs['Technology']      = isLi ? 'LiFePO₄ Lithium Iron Phosphate' : isTub ? 'Tubular Flooded Lead-Acid' : 'Flat-Plate Lead-Acid';
    specs['Cycle Life']      = isLi ? '2000+ cycles (10–15 year life)' : isTub ? '1200–1500 cycles (5–8 year life)' : '400–600 cycles (3–5 year life)';
    specs['Maintenance']     = isLi ? 'Zero maintenance (sealed)' : isTub ? 'Top-up distilled water every 3 months' : 'Top-up distilled water monthly';
    specs['Deep Discharge']  = isLi ? 'Yes — safe to 80% DoD' : 'Avoid below 50% DoD for long life';
    specs['Self-Discharge']  = isLi ? '< 3% per month' : '5–10% per month';
    specs['Temperature']     = '0°C – 45°C operating';
    specs['Power Supply']    = 'Charges via UPS / Solar Inverter / Charger';
  }

  // ── Spin Dryers ──
  else if (cc === 'spinner') {
    const kgM = m.match(/^(\d{2,3})[-\s]/);
    const kg  = kgM ? parseInt(kgM[1]) / 10 : 0;
    if (kg) specs['Capacity'] = kg + ' kg (wet laundry)';
    specs['Type']              = 'Spin Dryer (Single-Tub)';
    specs['Operation']         = 'Load freshly washed clothes — no water inlet required';
    specs['Water Extraction']  = 'Up to 95% water removed per spin cycle';
    specs['Spin Speed']        = 'Up to 1350 RPM';
    specs['Body']              = 'Rust-Free Plastic Body';
    specs['Power Supply']      = '220V / 50Hz';
  }

  // ── Small Appliances / Kitchen / Generic ──
  else {
    return _buildSmallSpecs(brand, model, category, cc);
  }

  return specs;
}

// ── Westpoint model lookup ────────────────────────────────────────────────────
// Maps normalised model number (strip WF- prefix, lowercase) →
// [simplified_name, sub_category]  (both strings)
const _WP_NAMES: Record<string, [string, string]> = {
  '367':  ['Westpoint 3-in-1 Juicer Blender Grinder WF-367',        'Juicer Blender'],
  '6093': ['Westpoint Deluxe 3-in-1 Sandwich Toaster WF-6093',      'Sandwich Toaster'],
  '9935': ['Westpoint 2-in-1 Hand Blender WF-9935',                 'Hand Blender'],
  '5350': ['Westpoint Professional Rice Cooker WF-5350',             'Rice Cooker'],
  '410':  ['Westpoint Deluxe Cordless Electric Kettle 1L WF-410',   'Electric Kettle'],
  '546':  ['Westpoint Deluxe Citrus Juicer WF-546',                 'Juicer'],
  '9225': ['Westpoint Professional Dry/Wet Grinder WF-9225',        'Grinder'],
  '5147': ['Westpoint Deluxe Fan Heater WF-5147',                   'Fan Heater'],
  '6813': ['Westpoint Professional Hair Clipper WF-6813',           'Hair Clipper'],
  '6810': ['Westpoint Professional Hair Straightening Brush WF-6810','Hair Straightener'],
  '6809': ['Westpoint Professional Hair Dryer WF-6809',             'Hair Dryer'],
  '5165': ['Westpoint Professional Slow Juicer WF-5165',            'Slow Juicer'],
  '7201': ['Westpoint Deluxe Juicer Blender Dry Mill WF-7201',      'Juicer Blender'],
  '7005': ['Westpoint Deluxe Bath Scale WF-7005',                   'Bath Scale'],
  '1206': ['Westpoint Ultrasonic Room Humidifier WF-1206',          'Humidifier'],
  '2025': ['Westpoint Coffee Maker WF-2025',                        'Coffee Maker'],
  '2023': ['Westpoint Coffee Maker WF-2023',                        'Coffee Maker'],
  '330':  ['Westpoint Baby Bottle Sterilizer WF-330',               'Baby Appliance'],
  '9228': ['Westpoint Professional Coffee & Spice Grinder WF-9228', 'Coffee Grinder'],
  '6697': ['Westpoint Deluxe Sandwich Toaster WF-6697',             'Sandwich Toaster'],
  '6696': ['Westpoint Deluxe Sandwich Toaster Grill WF-6696',       'Sandwich Toaster'],
  '6320': ['Westpoint Water Boiler 20L WF-6320',                    'Water Boiler'],
  '6316': ['Westpoint Water Boiler 16L WF-6316',                    'Water Boiler'],
  '9901': ['Westpoint Deluxe Hand Mixer WF-9901',                   'Hand Mixer'],
  '9301': ['Westpoint Deluxe Hand Mixer WF-9301',                   'Hand Mixer'],
  '9802': ['Westpoint Deluxe Hand Mixer WF-9802',                   'Hand Mixer'],
  '9804': ['Westpoint Deluxe Hand Mixer WF-9804',                   'Hand Mixer'],
  '4636': ['Westpoint Deluxe Stand Mixer WF-4636',                 'Stand Mixer'],
  '1860': ['Westpoint Professional Kitchen Chef WF-1860',           'Kitchen Chef'],
  '501':  ['Westpoint Kitchen Robot WF-501',                        'Food Processor'],
  '504':  ['Westpoint Kitchen Robot WF-504',                        'Food Processor'],
  '506':  ['Westpoint Kitchen Robot WF-506',                        'Food Processor'],
  '2805': ['Westpoint Food Factory Jumbo WF-2805',                  'Food Processor'],
  '8818': ['Westpoint Kitchen Chef 5-in-1 WF-8818',                'Kitchen Chef'],
  '8819': ['Westpoint Kitchen Chef WF-8819',                        'Kitchen Chef'],
  '6913': ['Westpoint Professional Hair Clipper WF-6913',           'Hair Clipper'],
  '6613': ['Westpoint 3-in-1 Hair Trimmer WF-6613',                'Hair Trimmer'],
  '614':  ['Westpoint Facial Steamer WF-614',                       'Facial Steamer'],
  '2564': ['Westpoint Professional Pop-Up Toaster 4-Slice WF-2564', 'Bread Toaster'],
  '2532': ['Westpoint Deluxe Pop-Up Toaster 2-Slice WF-2532',      'Bread Toaster'],
  '2538': ['Westpoint Deluxe Pop-Up Toaster 2-Slice WF-2538',      'Bread Toaster'],
  '209':  ['Westpoint Hand Blender WF-209',                         'Hand Blender'],
  '7115': ['Westpoint Electric Insect Killer WF-7115',              'Insect Killer'],
  '4360': ['Westpoint Digital Kitchen Scale WF-4360',               'Kitchen Scale'],
  '251':  ['Westpoint Professional Single Hot Plate WF-251',        'Hot Plate'],
  '252':  ['Westpoint Professional Double Hot Plate WF-252',        'Hot Plate'],
  '291':  ['Westpoint Professional Ceramic Cooker WF-291',          'Ceramic Cooker'],
  '6514': ['Westpoint Deluxe Roti Maker WF-6514',                  'Roti Maker'],
  '3616': ['Westpoint Deluxe Dough Maker WF-3616',                  'Dough Maker'],
  '5252': ['Westpoint Electric Egg Boiler WF-5252',                 'Egg Boiler'],
  '231':  ['Westpoint Deluxe Magic Broom WF-231',                   'Vacuum Cleaner'],
  '103':  ['Westpoint Vacuum Cleaner WF-103',                       'Vacuum Cleaner'],
  '3469': ['Westpoint Professional Vacuum Cleaner WF-3469',         'Vacuum Cleaner'],
  '3669': ['Westpoint Deluxe Vacuum Cleaner WF-3669',               'Vacuum Cleaner'],
  '960':  ['Westpoint Deluxe Vacuum Cleaner WF-960',                'Vacuum Cleaner'],
  '1401': ['Westpoint Deluxe Water Dispenser WF-1401',              'Water Dispenser'],
  // Additional models from DB data
  '441':  ['Westpoint Juicer Blender WF-441',                       'Juicer Blender'],
  '843':  ['Westpoint Deep Fryer WF-843',                           'Deep Fryer'],
  '851':  ['Westpoint Deluxe Deep Fryer WF-851',                    'Deep Fryer'],
  '841':  ['Westpoint Deep Fryer WF-841',                           'Deep Fryer'],
  '830':  ['Westpoint Air Fryer WF-830',                            'Air Fryer'],
  '4800': ['Westpoint Electric Oven WF-4800',                       'Electric Oven'],
  '4805': ['Westpoint Deluxe Air Fryer WF-4805',                    'Air Fryer'],
  '4981': ['Westpoint Deluxe Air Fryer WF-4981',                    'Air Fryer'],
  '4500': ['Westpoint Electric Oven WF-4500',                       'Electric Oven'],
  '364':  ['Westpoint Electric Oven WF-364',                        'Electric Oven'],
  '343':  ['Westpoint Deluxe Chopper WF-343',                       'Food Chopper'],
  '342':  ['Westpoint Chopper WF-342',                              'Food Chopper'],
  '333':  ['Westpoint Blender WF-333',                              'Blender'],
  '408':  ['Westpoint Food Factory WF-408',                         'Food Processor'],
  '445':  ['Westpoint Electric Kettle WF-445',                      'Electric Kettle'],
  '498':  ['Westpoint Electric Kettle WF-498',                      'Electric Kettle'],
  '550':  ['Westpoint Electric Kettle WF-550',                      'Electric Kettle'],
  '578':  ['Westpoint Electric Kettle WF-578',                      'Electric Kettle'],
  '545':  ['Westpoint Citrus Juicer WF-545',                        'Citrus Juicer'],
  '5258': ['Westpoint Deluxe Electric Oven WF-5258',                'Electric Oven'],
  '5254': ['Westpoint Deluxe Electric Oven WF-5254',                'Electric Oven'],
  '5255': ['Westpoint Electric Oven WF-5255',                       'Electric Oven'],
  '5256': ['Westpoint Electric Oven WF-5256',                       'Electric Oven'],
  '5160': ['Westpoint Electric Oven WF-5160',                       'Electric Oven'],
  '5161': ['Westpoint Electric Oven WF-5161',                       'Electric Oven'],
  '8814': ['Westpoint Juicer Blender Drymill WF-8814',              'Juicer Blender'],
  '8817': ['Westpoint Kitchen Chef WF-8817',                        'Kitchen Chef'],
  '9914': ['Westpoint Hand Blender WF-9914',                        'Hand Blender'],
  '9915': ['Westpoint Hand Blender WF-9915',                        'Hand Blender'],
  '9916': ['Westpoint Hand Blender WF-9916',                        'Hand Blender'],
  '9934': ['Westpoint Hand Blender WF-9934',                        'Hand Blender'],
  '9715': ['Westpoint Hand Blender WF-9715',                        'Hand Blender'],
  '9814': ['Westpoint Deluxe Hand Mixer WF-9814',                   'Hand Mixer'],
  '9815': ['Westpoint Deluxe Hand Mixer WF-9815',                   'Hand Mixer'],
  '9216': ['Westpoint Professional Grinder WF-9216',                'Grinder'],
  '1844': ['Westpoint Juicer Blender Drymill WF-1844',              'Juicer Blender'],
  '2310': ['Westpoint Electric Pressure Cooker WF-2310',            'Pressure Cooker'],
  '2405': ['Westpoint Juicer Blender Drymill WF-2405',              'Juicer Blender'],
  '2800r':['Westpoint Electric Pressure Cooker WF-2800R',           'Pressure Cooker'],
  '3117': ['Westpoint Electric Pressure Cooker WF-3117',            'Pressure Cooker'],
  '2020': ['Westpoint Electric Iron WF-2020',                       'Electric Iron'],
  '2063': ['Westpoint Electric Iron WF-2063',                       'Electric Iron'],
  '6259': ['Westpoint Hair Dryer WF-6259',                          'Hair Dryer'],
  '6270': ['Westpoint Hair Dryer WF-6270',                          'Hair Dryer'],
  '6175': ['Westpoint Cordless Electric Kettle WF-6175',            'Electric Kettle'],
  '6178': ['Westpoint Cordless Electric Kettle WF-6178',            'Electric Kettle'],
  '6171': ['Westpoint Cordless Electric Kettle WF-6171',            'Electric Kettle'],
  '1153': ['Westpoint Garment Steamer WF-1153',                     'Garment Steamer'],
  '1156': ['Westpoint Room Humidifier WF-1156',                     'Humidifier'],
  '1097': ['Westpoint Chopper WF-1097',                             'Chopper'],
  '1098': ['Westpoint Room Humidifier WF-1098',                     'Humidifier'],
  '1090': ['Westpoint Professional Chopper WF-1090',               'Chopper'],
  '1102': ['Westpoint Room Humidifier WF-1102',                     'Humidifier'],
  '1186': ['Westpoint Hard Juicer WF-1186',                         'Juicer'],
  '5807': ['Westpoint Deluxe Room Heater WF-5807',                  'Room Heater'],
  '5307': ['Westpoint Room Heater WF-5307',                         'Room Heater'],
  '772':  ['Westpoint Electric Iron WF-772',                        'Electric Iron'],
  '1353': ['Westpoint Room Heater WF-1353',                         'Room Heater'],
  '2386': ['Westpoint Room Heater WF-2386',                         'Room Heater'],
  '90b':  ['Westpoint Deluxe Dry Iron WF-90B',                      'Electric Iron'],
  '78b':  ['Westpoint Dry Iron WF-78B',                             'Electric Iron'],
  '4257': ['Westpoint Blender WF-4257',                             'Blender'],
  '4256': ['Westpoint Blender WF-4256',                             'Blender'],
  '4258': ['Westpoint Blender WF-4258',                             'Blender'],
  '4307': ['Westpoint Blender WF-4307',                             'Blender'],
  '7500': ['Westpoint Deluxe Juicer WF-7500',                       'Juicer'],
  '7805': ['Westpoint Kitchen Chef WF-7805',                        'Kitchen Chef'],
  '738':  ['Westpoint Juicer WF-738',                               'Juicer'],
  '929':  ['Westpoint Citrus Juicer WF-929',                        'Juicer'],
  '301':  ['Westpoint Meat Mincer WF-301',                          'Meat Mincer'],
  '143':  ['Westpoint Meat Mincer WF-143',                          'Meat Mincer'],
  '142':  ['Westpoint Meat Mincer WF-142',                          'Meat Mincer'],
  '152':  ['Westpoint Meat Mincer WF-152',                          'Meat Mincer'],
  '6307': ['Westpoint Fan Heater WF-6307',                          'Fan Heater'],
  'f10':  ['Westpoint Quick Chopper WF-F10',                        'Food Chopper'],
  'f04':  ['Westpoint Vegetable Slicer WF-F04',                     'Food Slicer'],
  'f07':  ['Westpoint Manual Kitchen Slicer WF-F07',                'Food Slicer'],
  // ── Kitchen Appliances (verified via westpoint.pk) ───────────────────────────
  '2610': ['Westpoint Convection Oven WF-2610',                     'Electric Oven'],
  '6300': ['Westpoint Convection Rotisserie Oven WF-6300',          'Electric Oven'],
  '5805': ['Westpoint Kitchen Chef WF-5805',                        'Kitchen Chef'],
  '2803': ['Westpoint Food Factory Jumbo WF-2803',                  'Food Processor'],
  '4711': ['Westpoint Convection Rotisserie Oven WF-4711',          'Rotisserie Oven'],
  '5259': ['Westpoint Air Fryer Rotisserie Oven WF-5259',           'Air Fryer'],
  '853':  ['Westpoint Microwave Oven WF-853',                       'Microwave Oven'],
  '9714': ['Westpoint Hand Blender WF-9714',                        'Hand Blender'],
  '442':  ['Westpoint Blender Grinder WF-442',                      'Blender'],
  '8266': ['Westpoint Cordless Electric Kettle WF-8266',            'Electric Kettle'],
  '3804': ['Westpoint Kitchen Chef WF-3804',                        'Kitchen Chef'],
  '304':  ['Westpoint Blender Grinder WF-304',                      'Blender'],
  '822':  ['Westpoint Microwave Oven WF-822',                       'Microwave Oven'],
  '6174': ['Westpoint Cordless Electric Kettle WF-6174',            'Electric Kettle'],
  '949':  ['Westpoint Blender Grinder WF-949',                      'Blender'],
  '8815': ['Westpoint Kitchen Robot WF-8815',                       'Kitchen Robot'],
  '9215': ['Westpoint Hand Blender WF-9215',                        'Hand Blender'],
  '4201': ['Westpoint 3-in-1 Hand Blender WF-4201',                 'Hand Blender'],
  '9816': ['Westpoint Hand Blender WF-9816',                        'Hand Blender'],
  '832':  ['Westpoint Microwave Oven WF-832',                       'Microwave Oven'],
  '1846': ['Westpoint Juicer Mincer WF-1846',                       'Juicer'],
  '2409': ['Westpoint Juicer Blender Drymill WF-2409',              'Juicer Blender'],
  '718':  ['Westpoint Blender Grinder WF-718',                      'Blender'],
  '1099': ['Westpoint Food Chopper WF-1099',                        'Food Chopper'],
  '554':  ['Westpoint Citrus Juicer WF-554',                        'Juicer'],
  '495c': ['Westpoint Food Chopper WF-495C',                        'Food Chopper'],
  '8813': ['Westpoint Juicer Blender Drymill WF-8813',              'Juicer Blender'],
  '496c': ['Westpoint Kitchen Robot WF-496C',                       'Kitchen Robot'],
  '9214': ['Westpoint Hand Blender WF-9214',                        'Hand Blender'],
  '5253': ['Westpoint Deluxe Air Fryer WF-5253',                    'Air Fryer'],
  '7501': ['Westpoint Juicer Blender Drymill WF-7501',              'Juicer Blender'],
  '1834': ['Westpoint Juicer Blender Drymill WF-1834',              'Juicer Blender'],
  '7259': ['Westpoint Deluxe Air Fryer WF-7259',                    'Air Fryer'],
  '4259': ['Westpoint Deluxe Air Fryer WF-4259',                    'Air Fryer'],
  '443':  ['Westpoint Blender Grinder WF-443',                      'Blender'],
  '1833': ['Westpoint Juicer Blender Drymill WF-1833',              'Juicer Blender'],
  '497c': ['Westpoint Kitchen Robot WF-497C',                       'Kitchen Robot'],
  '5257': ['Westpoint Deluxe Air Fryer WF-5257',                    'Air Fryer'],
  '9936': ['Westpoint Hand Blender WF-9936',                        'Hand Blender'],
  '1845': ['Westpoint Juicer Blender Drymill WF-1845',              'Juicer Blender'],
  '332':  ['Westpoint Blender Grinder WF-332',                      'Blender'],
  '5500': ['Westpoint Professional Rotisserie Baking Oven WF-5500', 'Rotisserie Oven'],
  // ── Small Appliances (verified via westpoint.pk) ─────────────────────────────
  '2430': ['Westpoint Deluxe Dry Iron WF-2430',                     'Electric Iron'],
  '6807': ['Westpoint Hair Straightener WF-6807',                   'Hair Straightener'],
  '1253': ['Westpoint Garment Steamer WF-1253',                     'Garment Steamer'],
  '1159': ['Westpoint Garment Steamer WF-1159',                     'Garment Steamer'],
  '2451': ['Westpoint Dry Iron WF-2451',                            'Electric Iron'],
  '6201': ['Westpoint Hair Dryer WF-6201',                          'Hair Dryer'],
  '1546': ['Westpoint Deluxe Tower Fan WF-1546',                    'Tower Fan'],
  '1154': ['Westpoint Garment Steamer WF-1154',                     'Garment Steamer'],
  '6203': ['Westpoint Hair Dryer WF-6203',                          'Hair Dryer'],
  '6280': ['Westpoint Hair Dryer WF-6280',                          'Hair Dryer'],
  '672':  ['Westpoint Dry Iron WF-672',                             'Electric Iron'],
  '6808': ['Westpoint Hair Straightener WF-6808',                   'Hair Straightener'],
  '2064': ['Westpoint Steam Iron WF-2064',                          'Electric Iron'],
  // ── Additional models from DB ─────────────────────────────────────────────
  '1201': ['Westpoint Ultrasonic Room Humidifier WF-1201',          'Humidifier'],
  '1205': ['Westpoint Deluxe Ultrasonic Humidifier WF-1205',        'Humidifier'],
  '2024': ['Westpoint Coffee Maker WF-2024',                        'Coffee Maker'],
  '210':  ['Westpoint Dual Baby Bottle Warmer WF-210',              'Baby Appliance'],
  '2528': ['Westpoint Pop-Up Toaster 4-Slice WF-2528',              'Bread Toaster'],
  '2561': ['Westpoint Pop-Up Toaster 2-Slice WF-2561',              'Bread Toaster'],
  '2563': ['Westpoint Pop-Up Toaster 4-Slice Double WF-2563',       'Bread Toaster'],
  '261':  ['Westpoint Professional Single Hot Plate WF-261',        'Hot Plate'],
  '262':  ['Westpoint Professional Double Hot Plate WF-262',        'Hot Plate'],
  '292':  ['Westpoint Professional Ceramic Cooker Double WF-292',   'Ceramic Cooker'],
  '3050': ['Westpoint Meat Mincer WF-3050',                         'Meat Mincer'],
  '3166': ['Westpoint Non-Stick Pizza Pan WF-3166',                 'Kitchen Accessory'],
  '329':  ['Westpoint Baby Bottle Sterilizer WF-329',               'Baby Appliance'],
  '3870': ['Westpoint Foot Massager WF-3870',                       'Massager'],
  '4616': ['Westpoint Deluxe Hand Mixer WF-4616',                   'Hand Mixer'],
  '4626': ['Westpoint Deluxe Food Mixer WF-4626',                   'Food Mixer'],
  '502':  ['Westpoint Kitchen Robot WF-502',                        'Food Processor'],
  '505':  ['Westpoint Kitchen Robot WF-505',                        'Food Processor'],
  '636':  ['Westpoint Deluxe Sandwich Toaster WF-636',              'Sandwich Toaster'],
  '6362': ['Westpoint Epilator WF-6362',                            'Epilator'],
  '6686': ['Westpoint Deluxe Sandwich Toaster WF-6686',             'Sandwich Toaster'],
  '6713': ['Westpoint Professional Hair Clipper WF-6713',           'Hair Clipper'],
  '7010': ['Westpoint Digital Weight Scale WF-7010',                'Digital Scale'],
  '7108': ['Westpoint Electric Insect Killer WF-7108',              'Insect Killer'],
  '7110': ['Westpoint Electric Insect Killer WF-7110',              'Insect Killer'],
  '7112': ['Westpoint Electric Insect Killer WF-7112',              'Insect Killer'],
  '9224': ['Westpoint Professional Coffee Grinder WF-9224',         'Coffee Grinder'],
  '9601': ['Westpoint Egg Beater WF-9601',                          'Hand Mixer'],
  '9801': ['Westpoint Steel Egg Beater WF-9801',                    'Hand Mixer'],
  'f05':  ['Westpoint Manual Fries Cutter WF-F05',                  'Food Slicer'],
  // ── New models from Westpoint 2026 Catalogue ─────────────────────────────
  // Juicer Blender Drymill (additional)
  '7701': ['Westpoint Juicer Blender Drymill WF-7701',              'Juicer Blender'],
  '7901': ['Westpoint Juicer Blender Drymill WF-7901',              'Juicer Blender'],
  '8823': ['Westpoint Juicer Blender Drymill WF-8823',              'Juicer Blender'],
  '8824': ['Westpoint Juicer Blender Drymill WF-8824',              'Juicer Blender'],
  // Kitchen Chef / Food Processor (additional)
  '1847': ['Westpoint Kitchen Chef WF-1847',                        'Kitchen Chef'],
  '2804': ['Westpoint Food Factory Jumbo WF-2804',                  'Food Processor'],
  '4806': ['Westpoint Kitchen Chef WF-4806',                        'Kitchen Chef'],
  '5806': ['Westpoint Kitchen Chef WF-5806',                        'Kitchen Chef'],
  '7806': ['Westpoint Kitchen Chef WF-7806',                        'Kitchen Chef'],
  // Sandwich Toasters (additional)
  '637':  ['Westpoint Deluxe Sandwich Toaster WF-637',              'Sandwich Toaster'],
  '638':  ['Westpoint Deluxe Sandwich Toaster WF-638',              'Sandwich Toaster'],
  '639':  ['Westpoint Deluxe Sandwich Toaster WF-639',              'Sandwich Toaster'],
  '640':  ['Westpoint Deluxe Sandwich Toaster WF-640',              'Sandwich Toaster'],
  '671':  ['Westpoint Sandwich Toaster WF-671',                     'Sandwich Toaster'],
  '691':  ['Westpoint Sandwich Toaster WF-691',                     'Sandwich Toaster'],
  '692':  ['Westpoint Sandwich Toaster WF-692',                     'Sandwich Toaster'],
  '693':  ['Westpoint Sandwich Toaster WF-693',                     'Sandwich Toaster'],
  '694':  ['Westpoint Sandwich Toaster WF-694',                     'Sandwich Toaster'],
  '2108': ['Westpoint Sandwich Toaster WF-2108',                    'Sandwich Toaster'],
  '6193': ['Westpoint Deluxe Sandwich Toaster WF-6193',             'Sandwich Toaster'],
  '6293': ['Westpoint Deluxe Sandwich Toaster WF-6293',             'Sandwich Toaster'],
  '6393': ['Westpoint Deluxe Sandwich Toaster WF-6393',             'Sandwich Toaster'],
  // Blenders (additional)
  '302':  ['Westpoint Blender Grinder WF-302',                      'Blender'],
  '303':  ['Westpoint Blender Grinder WF-303',                      'Blender'],
  '307':  ['Westpoint Blender Grinder WF-307',                      'Blender'],
  '308':  ['Westpoint Blender Grinder WF-308',                      'Blender'],
  '372':  ['Westpoint Blender Grinder WF-372',                      'Blender'],
  '373':  ['Westpoint Blender Grinder WF-373',                      'Blender'],
  '393':  ['Westpoint Blender Grinder WF-393',                      'Blender'],
  '448':  ['Westpoint Blender Grinder WF-448',                      'Blender'],
  '449':  ['Westpoint Blender Grinder WF-449',                      'Blender'],
  '3321': ['Westpoint Blender Grinder WF-3321',                     'Blender'],
  '3331': ['Westpoint Blender Grinder WF-3331',                     'Blender'],
  // Electric Kettles (additional)
  '8267': ['Westpoint Cordless Electric Kettle WF-8267',            'Electric Kettle'],
  '8268': ['Westpoint Cordless Electric Kettle WF-8268',            'Electric Kettle'],
  '8269': ['Westpoint Cordless Electric Kettle WF-8269',            'Electric Kettle'],
  '6275': ['Westpoint Cordless Electric Kettle WF-6275',            'Electric Kettle'],
  '6172': ['Westpoint Cordless Electric Kettle WF-6172',            'Electric Kettle'],
  '6173': ['Westpoint Cordless Electric Kettle WF-6173',            'Electric Kettle'],
  '6330': ['Westpoint Water Boiler 30L WF-6330',                    'Water Boiler'],
  // Stand Mixers (additional)
  '4627b':['Westpoint Deluxe Stand Mixer WF-4627B',                 'Stand Mixer'],
  '4646': ['Westpoint Deluxe Stand Mixer WF-4646',                  'Stand Mixer'],
  '9826': ['Westpoint Stand Mixer WF-9826',                         'Stand Mixer'],
  '9827': ['Westpoint Stand Mixer WF-9827',                         'Stand Mixer'],
  // Hand Mixers (additional)
  '9701': ['Westpoint Hand Mixer WF-9701',                          'Hand Mixer'],
  '9805': ['Westpoint Deluxe Hand Mixer WF-9805',                   'Hand Mixer'],
  '9806': ['Westpoint Deluxe Hand Mixer WF-9806',                   'Hand Mixer'],
  '9807': ['Westpoint Deluxe Hand Mixer WF-9807',                   'Hand Mixer'],
  // Coffee Grinder (additional)
  '9226': ['Westpoint Professional Coffee Grinder WF-9226',         'Coffee Grinder'],
  // Microwave Ovens (additional)
  '823':  ['Westpoint Microwave Oven WF-823',                       'Microwave Oven'],
  '824':  ['Westpoint Microwave Oven WF-824',                       'Microwave Oven'],
  '825':  ['Westpoint Microwave Oven WF-825',                       'Microwave Oven'],
  // Air Fryers (additional)
  '3256': ['Westpoint Deluxe Air Fryer WF-3256',                    'Air Fryer'],
  // Fan Heaters (additional)
  '5145': ['Westpoint Deluxe Fan Heater WF-5145',                   'Fan Heater'],
  '5146': ['Westpoint Deluxe Fan Heater WF-5146',                   'Fan Heater'],
  // Vacuum Cleaners (additional)
  '102':  ['Westpoint Vacuum Cleaner WF-102',                       'Vacuum Cleaner'],
  '104':  ['Westpoint Vacuum Cleaner WF-104',                       'Vacuum Cleaner'],
  '970':  ['Westpoint Deluxe Vacuum Cleaner WF-970',                'Vacuum Cleaner'],
  '3569': ['Westpoint Deluxe Vacuum Cleaner WF-3569',               'Vacuum Cleaner'],
  // Air Coolers
  '1301': ['Westpoint Air Cooler WF-1301',                          'Air Cooler'],
  '1302': ['Westpoint Air Cooler WF-1302',                          'Air Cooler'],
  '1303': ['Westpoint Air Cooler WF-1303',                          'Air Cooler'],
  '1304': ['Westpoint Air Cooler WF-1304',                          'Air Cooler'],
  // Washing Machines (Westpoint makes these)
  '1017': ['Westpoint Semi-Automatic Washing Machine WF-1017',      'Washing Machine'],
  '1018': ['Westpoint Semi-Automatic Washing Machine WF-1018',      'Washing Machine'],
  '2017': ['Westpoint Semi-Automatic Washing Machine WF-2017',      'Washing Machine'],
  // Refrigerators
  '205':  ['Westpoint Refrigerator WF-205',                         'Refrigerator'],
  '207':  ['Westpoint Refrigerator WF-207',                         'Refrigerator'],
  // Hair Dryers (additional)
  '6217': ['Westpoint Hair Dryer WF-6217',                          'Hair Dryer'],
  '6260': ['Westpoint Hair Dryer WF-6260',                          'Hair Dryer'],
  // Irons (additional)
  '80b':  ['Westpoint Dry Iron WF-80B',                             'Electric Iron'],
  '81b':  ['Westpoint Dry Iron WF-81B',                             'Electric Iron'],
  '84b':  ['Westpoint Dry Iron WF-84B',                             'Electric Iron'],
  '85b':  ['Westpoint Dry Iron WF-85B',                             'Electric Iron'],
  '86b':  ['Westpoint Dry Iron WF-86B',                             'Electric Iron'],
  '98b':  ['Westpoint Deluxe Dry Iron WF-98B',                      'Electric Iron'],
  '2065': ['Westpoint Steam Iron WF-2065',                          'Electric Iron'],
  '2431': ['Westpoint Dry Iron WF-2431',                            'Electric Iron'],
  '2432': ['Westpoint Dry Iron WF-2432',                            'Electric Iron'],
  // Garment Steamers (additional)
  '1155': ['Westpoint Garment Steamer WF-1155',                     'Garment Steamer'],
  '1157': ['Westpoint Garment Steamer WF-1157',                     'Garment Steamer'],
  // Pop-Up Toasters (additional)
  '2540': ['Westpoint Deluxe Pop-Up Toaster WF-2540',               'Bread Toaster'],
  '2542': ['Westpoint Deluxe Pop-Up Toaster WF-2542',               'Bread Toaster'],
  '2589': ['Westpoint Pop-Up Toaster WF-2589',                      'Bread Toaster'],
  // Meat Grinders (additional)
  '1045': ['Westpoint Meat Mincer WF-1045',                         'Meat Mincer'],
  '3040': ['Westpoint Meat Mincer WF-3040',                         'Meat Mincer'],
  // Ceramic Cookers (additional)
  '162':  ['Westpoint Ceramic Cooker WF-162',                       'Ceramic Cooker'],
};

function _wpLookup(model: string): [string, string] | null {
  // Normalise: strip WF- prefix, lowercase, remove spaces
  const key = model.toLowerCase().replace(/^wf-?/, '').replace(/\s+/g, '');
  return _WP_NAMES[key] ?? null;
}

// ── Enrichment: simplified name ───────────────────────────────────────────────

export function buildSimplifiedName(brand: string, model: string, category: string, _cc?: string, specs?: Record<string, string>): string {
  const b  = brand.trim();           // display (preserves original casing)
  const bl = b.toLowerCase();        // for brand comparisons
  const mo = model.trim();
  if (!b && !mo) return '';
  // Do NOT early-return when brand is empty — still generate a type-based name.
  // filter(Boolean) below will omit the empty brand string naturally.

  // Westpoint model lookup — use curated names before any logic runs
  if (bl.includes('westpoint')) {
    const wp = _wpLookup(mo);
    if (wp) return wp[0];
  }

  const m  = mo.toUpperCase();
  const cc = _cc ?? resolveCanonicalCategory(brand, model, category);
  const p  = _parseCategory(category);

  switch (cc) {
    case 'air_conditioner': {
      const bl  = b.toLowerCase();
      const ton = _tonFromAC(m, bl);
      // Floor-standing / cassette units (Haier HPU-xx series)
      if (/\bHPU[-\s]/.test(m)) {
        return [b, ton ? ton + ' Ton' : '', 'Floor Standing AC'].filter(Boolean).join(' ');
      }
      const isInv = /HNF|PITH|CITH|FAIRY|LOMO|UFLY|ULTRA|INVERTER|\bINV\b|\bDC\b|LF\b|LFW|HFT|HFP|HPM|RFP/.test(m)
                 || /INVERTER|INV\b/.test(category.toUpperCase());
      const isHC  = /HFC|HFAB|HFTEX|PRIMA|GALLANT|H&C|HEAT/.test(m);
      // Series names — guarded by brand to avoid cross-contamination
      const series = (bl === 'haier'    && /THUNDER|T3\b/.test(m))        ? 'Thunder'
                   : (bl === 'haier'    && /PEARL|PITH\b/.test(m))        ? 'Pearl'
                   : (bl === 'haier'    && /BREEZELESS/.test(m))           ? 'Breezeless'
                   : (bl === 'gree'     && /PULAR/.test(m))                ? 'Pular'
                   : (bl === 'gree'     && /\bUV\b/.test(m))               ? 'UV'
                   : (bl === 'gree'     && /FAIRY/.test(m))                ? 'Fairy'
                   : (bl === 'gree'     && /XTREME/.test(m))               ? 'Xtreme'
                   : (bl === 'dawlance' && /CHROME\+|CHROME PLUS/.test(m)) ? 'Chrome+'
                   : (bl === 'dawlance' && /CHROME/.test(m))               ? 'Chrome'
                   : (bl === 'dawlance' && /ELEGANCE\+/.test(m))           ? 'Elegance+'
                   : (bl === 'dawlance' && /ELEGANCE/.test(m))             ? 'Elegance'
                   : (bl === 'dawlance' && /EXCEL/.test(m))                ? 'Excel'
                   : '';
      // Pattern: Brand + Tonnage + Series + "Inverter"? + "Heat & Cool"? + "Air Conditioner"
      return [b, ton ? ton + ' Ton' : '', series, isHC ? 'Heat & Cool' : '', isInv ? 'Inverter' : '', 'Air Conditioner'].filter(Boolean).join(' ');
    }
    case 'refrigerator': {
      let size = _getSizeDisplay(b, mo);
      if (!size) { const cf = _cfFromFridge(mo); if (cf !== '') size = cf + ' Cu.Ft'; }
      // Final fallback: use already-enriched specs if available (e.g. after re-enrich pass)
      if (!size && specs?.['Capacity']) {
        const capStr = specs['Capacity'];
        const cfMatch = capStr.match(/(\d+(?:\.\d+)?)\s*Cu\.?Ft/i);
        if (cfMatch) size = cfMatch[1] + ' Cu.Ft';
      }
      // French T-Door / Triple Door — check before other type detection
      if (/\bTSG\b|\bTBG\b|T-DOOR|TDOOR|FRENCH/i.test(m) || /french/i.test(category)) {
        return [b, size, 'No Frost French T-Door Inverter Refrigerator'].filter(Boolean).join(' ');
      }
      const isIF = /\bIF\b|IFRA|IFGA/.test(m);
      const isIP = /\bIP\b|IPRA|IPGA/.test(m);
      const isSBS = /SBS|\bDSS\b|\bDTM\b|IFF/.test(m);
      // Glass door: IFGA/IPGA = glass-door digital/mechanical variants; also GD, ID, IA, IB, IBS, IFP
      // IF and IP alone are control-display types (digital/mechanical thermostat), NOT glass door
      const isGD  = /IFGA|IPGA|GLASS|\bGD\b|\bID\b|\bIA\b|\bIB\b|\bIBS\b|\bIFP\b/.test(m);
      // "+" on Dawlance series name = inverter (Avante+ / Chrome+ / Graze+ / Acce+)
      const hasDlPlus = bl === 'dawlance' && /(?:AVANTE|CHROME|GRAZE|NOVA|ACCE)\+/.test(m);
      // WB = Wide Body (form factor only). LF = inverter compressor only (not no-frost).
      const isInv = isIF || isIP || hasDlPlus || /\bINV\b|INVERTER|LF\b/.test(m);
      // Series label
      const series = /GRAZE\+|GRAZE PLUS/.test(m) ? 'Graze+' : /GRAZE/.test(m) ? 'Graze'
                   : /AVANTE\+/.test(m) ? 'Avante+' : /AVANTE/.test(m) ? 'Avante'
                   : /CHROME\+|CHROME PLUS/.test(m) ? 'Chrome+' : /CHROME/.test(m) ? 'Chrome'
                   : '';
      const typ = isSBS ? 'Side-by-Side Refrigerator' : 'Refrigerator';
      return [b, size, isGD && !isSBS ? 'Glass Door' : '', isInv ? 'Inverter' : '', series, typ].filter(Boolean).join(' ');
    }
    case 'deep_freezer': {
      let size = '';
      if (bl === 'haier') {
        // Haier HDF model numbers encode litres; convert to marketed Cu.Ft via lookup
        const litM = m.match(/\bHDF[-\s]?(\d{3})/);
        if (litM) {
          const litres = parseInt(litM[1]);
          const cf = HAIER_HDF_CF_MAP[litres];
          if (cf) size = cf + ' Cu.Ft';
        }
      } else {
        size = _getSizeDisplay(b, mo);
        if (!size) { const cf = _cfFromFridge(mo); if (cf !== '') size = cf + ' Cu.Ft'; }
        if (!size && specs?.['Capacity']) {
          const cfMatch = specs['Capacity'].match(/(\d+(?:\.\d+)?)\s*Cu\.?Ft/i);
          if (cfMatch) size = cfMatch[1] + ' Cu.Ft';
        }
      }
      // Haier HDF: IG = Inverter Grey, I (not IG) = Inverter white, SD = conventional
      const isHdfIG = bl === 'haier' && /HDF[-\s]?\d{3}IG/.test(m);
      const isHdfI  = bl === 'haier' && /HDF[-\s]?\d{3}I(?!G)/.test(m);
      const isInv   = isHdfIG || isHdfI || /INV|INVERTER/.test(m);
      const isVF    = /VF[-\s]/.test(m) || category.toLowerCase().includes('vertical');
      const typ     = isVF ? 'Vertical Freezer' : 'Deep Freezer';
      const color   = isHdfIG ? 'Grey' : '';
      return [b, size, isInv ? 'Inverter' : '', color, typ].filter(Boolean).join(' ');
    }
    case 'spinner': {
      const kgM = m.match(/^(\d{2,3})[-\s]/);
      const kg  = kgM ? parseInt(kgM[1]) / 10 : 0;
      return [b, kg ? kg + 'kg' : '', 'Spin Dryer'].filter(Boolean).join(' ');
    }
    case 'washing_machine': {
      const hwmM = m.match(/\bHWM[\s-]?(\d{2,3})[-\s]/);
      const kgNum = hwmM
        ? parseInt(hwmM[1]) / 10
        : (() => {
            const ex = m.match(/(\d{2,3})\s*KG/); if (ex) return parseInt(ex[1]);
            // Dawlance DWT/DWF: leading digits encode capacity (e.g. DWT-1166 → 11 kg, DWF-8120 → 8 kg)
            const dw = m.match(/\bDW[TF][-\s]?0*(\d{2,5})/);
            if (dw) { const d = dw[1]; const two = parseInt(d.slice(0, 2)); return two <= 20 ? two : parseInt(d.slice(0, 1)); }
            return 0;
          })();
      // Fallback to specs if model string doesn't encode kg (e.g. EcoStar ESW-DE)
      const kgStr = kgNum ? kgNum + 'kg' : (specs?.['Capacity'] || '');
      const typeLabel = _wmSubLabel(model, category, brand);
      return [b, kgStr, typeLabel, 'Washing Machine'].filter(Boolean).join(' ');
    }
    case 'television': {
      // Try multiple patterns: explicit INCH, Samsung UA/QA prefix, H-prefix models, leading digits
      const szM = m.match(/(\d{2,3})["']?\s*(?:INCH|IN\b)/)
                || m.match(/^(?:UA|QA|UN|UE|LE)(\d{2})/i)    // Samsung UA55, QA65, UE43
                || m.match(/^[A-Z]{1,2}(\d{2})[A-Z]/);        // H55E, L40H, T55R, etc.
      const sz  = szM ? szM[1] : m.match(/^(\d{2,3})/)?.[1] || (specs?.['Screen Size']?.match(/^(\d+)/)?.[1] || '');
      const isQled   = /QLED/.test(m);
      const is4K     = /4K|UHD/.test(m);
      const is8K     = /8K/.test(m);
      const isGoogle = /GOOGLE|ANDROID/.test(m);
      const resPart  = is8K ? '8K' : is4K ? '4K Ultra HD' : isQled ? 'QLED' : /FHD|1080/.test(m) ? 'FHD' : 'Smart';
      return [b, sz ? sz + '"' : '', resPart, isGoogle ? 'Google TV' : 'TV'].filter(Boolean).join(' ');
    }
    case 'solar': {
      const kwM = m.match(/(\d+\.?\d*)\s*KW/);
      const kw  = kwM ? kwM[1] : '';
      const tp  = /PANEL/.test(m) ? 'Solar Panel' : /BATTERY|BATT/.test(m) ? 'Solar Battery' : /HYBRID/.test(m) ? 'Hybrid Solar System' : 'Solar Inverter';
      return [b, kw ? kw + 'kW' : '', tp].filter(Boolean).join(' ');
    }
    case 'water_heater': {
      // Pattern: Brand + Capacity + Type + "Water Heater" / "Geyser"
      const litM = m.match(/(\d+)\s*(?:L\b|LTR|LITRE|LITER|GALLON)/i) || m.match(/(\d+)\s*G\b/);
      const cap  = litM ? litM[1] + (m.includes('GALLON') || m.includes(' G') ? ' Gallon' : 'L') : '';
      const isElec  = /EWH|ELECTRIC|E\+G|INSTANT/.test(m);
      const isGas   = /GAS|\bG\+E\b|\bE\+G\b/.test(m);
      const typLabel = isElec && isGas ? 'Electric+Gas' : isElec ? 'Electric' : 'Gas';
      const isInstant = /INSTANT/.test(m);
      return [b, cap, typLabel, isInstant ? 'Instant' : '', 'Geyser'].filter(Boolean).join(' ');
    }
    case 'gas_hob': {
      const burnM = m.match(/(\d)\s*BURNER/i) || category.match(/(\d)\s*BURNER/i);
      const burners = burnM ? burnM[1] + ' Burner' : '';
      const isGlass = /GLASS/.test(m);
      const isSS    = /\bSS\b|STAINLESS/.test(m);
      const isCR    = /COOKING[\s-]?RANGE|RANGE/i.test(m);
      const typ     = isCR ? 'Cooking Range' : 'Gas Hob';
      const surface = isGlass ? 'Glass' : isSS ? 'Stainless Steel' : '';
      return [b, burners, typ, surface].filter(Boolean).join(' ');
    }
    case 'battery': {
      const ahM = m.match(/(\d{2,3})\s*AH/i);
      const ah  = ahM ? ahM[1] + 'AH' : '';
      const kwM = m.match(/(\d+\.?\d*)\s*KW/i);
      const kw  = kwM ? kwM[1] + 'kW' : '';
      const isLi = /LIFEP|LIFEPO|LITHIUM|LI.ION|LI-ION/.test(m);
      const isTub = /TUBULAR/.test(m);
      const typ  = isLi ? 'Lithium Battery' : isTub ? 'Tubular Battery' : 'Battery';
      const volt = m.match(/(\d{2}\.?\d*)V\b/)?.[1];
      return [b, volt ? volt + 'V' : '', ah || kw, typ].filter(Boolean).join(' ');
    }
    case 'ups': {
      const watM = m.match(/(\d{3,4})\s*W?\b/);
      const wat  = watM ? watM[1] + 'W' : '';
      return [b, wat, 'UPS'].filter(Boolean).join(' ');
    }
    case 'mattress': {
      const sizeM = m.match(/(\d{2,3})[Xx×](\d{2,3})[Xx×](\d{1,2})/);
      const dim   = sizeM ? sizeM[1] + '×' + sizeM[2] + '×' + sizeM[3] + '"' : '';
      const isOrth = /ORTHO/.test(m);
      const isSprg = cc === 'mattress' && /SPRING|CLASSIQUE|BRAVO|ALPHA/.test(m);
      const typ    = isSprg ? 'Spring Mattress' : isOrth ? 'Orthopaedic Mattress' : 'Foam Mattress';
      return [b, mo.replace(/\s*(78x72x\d+\s*inch?|84x78x\d+\s*inch?|\d+x\d+x\d+\s*inch?)/i, '').trim(), dim, typ].filter(Boolean).join(' ');
    }
    case 'bed': {
      const isBunk   = /BUNKER|BUNK/.test(m);
      const isDouble = /DOUBLE/.test(m);
      const typ      = isBunk ? 'Bunk Bed' : isDouble ? 'Double Bed' : 'Bed';
      return [b, typ].filter(Boolean).join(' ');
    }
    case 'air_cooler': {
      const watM = m.match(/(\d{3,4})\s*W\b/i);
      const isInv = /INV|INVERTER|DC\s*12V|AC\/DC/.test(m);
      return [b, watM ? watM[1] + 'W' : '', isInv ? 'Inverter' : '', 'Air Cooler'].filter(Boolean).join(' ');
    }
    // ── Small appliances: include capacity/size from specs when model doesn't encode it ──
    case 'kettle': {
      const cap = p.litres || specs?.['Capacity'] || '';
      return [b, cap, 'Electric Kettle'].filter(Boolean).join(' ');
    }
    case 'air_fryer': {
      const cap = p.litres || specs?.['Capacity'] || '';
      return [b, cap, 'Air Fryer'].filter(Boolean).join(' ');
    }
    case 'rice_cooker': {
      const cap = p.litres || specs?.['Capacity'] || '';
      return [b, cap, 'Rice Cooker'].filter(Boolean).join(' ');
    }
    case 'toaster': {
      const slices = p.slices ? p.slices + '-Slice' : (specs?.['Capacity'] || '');
      return [b, slices, 'Bread Toaster'].filter(Boolean).join(' ');
    }
    case 'sandwich_maker': {
      return [b, 'Sandwich Maker'].filter(Boolean).join(' ');
    }
    case 'blender': {
      const cap = p.litres || specs?.['Capacity'] || '';
      return [b, cap, 'Blender'].filter(Boolean).join(' ');
    }
    case 'hand_blender': {
      const wat = specs?.['Power'] || '';
      return [b, wat, 'Hand Blender'].filter(Boolean).join(' ');
    }
    case 'juicer': {
      const cap = p.litres || specs?.['Capacity'] || '';
      return [b, cap, 'Juicer'].filter(Boolean).join(' ');
    }
    case 'food_processor': {
      const cap = p.litres || specs?.['Capacity'] || '';
      return [b, cap, 'Food Processor'].filter(Boolean).join(' ');
    }
    case 'chopper': {
      return [b, 'Food Chopper'].filter(Boolean).join(' ');
    }
    case 'iron': {
      const isStream = /STEAM/i.test(m);
      const isDry    = /DRY/i.test(m) || /DWDI/i.test(m);
      const typ = isStream ? 'Steam Iron' : isDry ? 'Dry Iron' : 'Electric Iron';
      const wat = specs?.['Power'] || '';
      return [b, wat, typ].filter(Boolean).join(' ');
    }
    case 'steamer': {
      return [b, 'Garment Steamer'].filter(Boolean).join(' ');
    }
    case 'hair_dryer': {
      const wat = specs?.['Power'] || '';
      return [b, wat, 'Hair Dryer'].filter(Boolean).join(' ');
    }
    case 'hair_straightener': {
      return [b, 'Hair Straightener'].filter(Boolean).join(' ');
    }
    case 'hair_crimper': {
      return [b, 'Hair Crimper'].filter(Boolean).join(' ');
    }
    case 'curling_iron': {
      return [b, 'Hair Curler'].filter(Boolean).join(' ');
    }
    case 'vacuum': {
      const wat = specs?.['Power'] || '';
      return [b, wat, 'Vacuum Cleaner'].filter(Boolean).join(' ');
    }
    case 'fan': {
      const isRem = /REMOTE|REM/.test(m);
      const typ = /CEILING/.test(m) ? 'Ceiling Fan' : /PEDESTAL|STAND/.test(m) ? 'Pedestal Fan' : /WALL/.test(m) ? 'Wall Fan' : 'Fan';
      return [b, isRem ? 'Remote Control' : '', typ].filter(Boolean).join(' ');
    }
    case 'heater': {
      const wat = specs?.['Power'] || '';
      const typ = /OIL/.test(m) ? 'Oil Filled Heater' : /FAN/.test(m) ? 'Fan Heater' : 'Room Heater';
      return [b, wat, typ].filter(Boolean).join(' ');
    }
    case 'water_dispenser': {
      const isHC = /HOT.*COLD|H&C|COLD.*HOT/.test(m) || (specs?.['Temperature'] || '').includes('Hot');
      return [b, isHC ? 'Hot & Cold' : 'Cold', 'Water Dispenser'].filter(Boolean).join(' ');
    }
    case 'induction': {
      const wat = specs?.['Power'] || '';
      return [b, wat, 'Induction Cooker'].filter(Boolean).join(' ');
    }
    case 'chimney': {
      return [b, 'Kitchen Chimney'].filter(Boolean).join(' ');
    }
    default: {
      // For canonical types we know (fan, iron, vacuum etc.) use the display name — avoid dumping raw CSV category
      const displayType = cc !== 'unknown' ? (CANONICAL_DISPLAY[cc] ?? '') : '';
      if (displayType) {
        const specCap = specs?.['Capacity'] || specs?.['Water Tank'] || '';
        const size = (p.litres ?? (p.slices ? p.slices + '-Slice' : (p.kg ?? ''))) || specCap;
        return [b, displayType, size || mo].filter(Boolean).join(' ');
      }
      // For Westpoint (or other brands) where the DB category encodes the specific product type
      // (e.g. "Roti Maker", "Egg Beater", "Hot Plate Single") — use it as the product-type label.
      // Skip if category is just a generic top-level bucket.
      const GENERIC_CATS = new Set(Object.values(CATEGORY_MAP));
      GENERIC_CATS.add('Unknown');
      if (!GENERIC_CATS.has(category) && category.trim().length > 0) {
        const modelDisplay = /^\d/.test(mo) ? `WF-${mo}` : mo;
        return [b, category.trim(), modelDisplay].filter(Boolean).join(' ');
      }
      // Truly unknown — use brand + model only (model already descriptive for miscellaneous items)
      return [b, mo].filter(Boolean).join(' ');
    }
  }
}

// ── Enrichment: sub-category ──────────────────────────────────────────────────

export function deriveSubCategory(brand: string, model: string, category: string, _cc?: string): string {
  const m  = model.toUpperCase();

  // Westpoint model lookup — use curated sub-categories before any logic runs
  if (brand.toLowerCase().includes('westpoint')) {
    const wp = _wpLookup(model);
    if (wp) return wp[1];
  }

  const cc = _cc ?? resolveCanonicalCategory(brand, model, category);

  switch (cc) {
    case 'air_conditioner': {
      if (/\bHPU[-\s]/.test(m)) return 'Floor Standing';
      const isHC = /HFC|HFAB|HFTEX|PRIMA|GALLANT|H&C/.test(m);
      if (isHC) return 'Heat & Cool';
      if (/HNF|PITH|CITH|FAIRY|LOMO|UFLY|ULTRA|INVERTER|\bINV\b|\bDC\b|LF\b/.test(m)) return 'DC Inverter';
      return 'Non-Inverter';
    }
    case 'refrigerator': {
      if (/\bTSG\b|\bTBG\b|T-DOOR|TDOOR|FRENCH/i.test(m) || /french/i.test(category)) return 'French T-Door';
      if (/SBS|SIDE.BY.SIDE/.test(m)) return 'Side-by-Side';
      const cf = _cfFromFridge(m); if (cf !== '' && cf >= 20) return 'Side-by-Side';
      const isIG = /\bHDF\b/.test(m) && /\bIG\b/.test(m);
      if (isIG || /GLASS|IFGA/.test(m)) return 'Glass Door Inverter';
      if (/HDF/.test(m)) return 'Deep Freezer';
      if (/\bIF\b|IFRA|INV|INVERTER|IPRA|IPGA|GRAZE|CHROME|AVANTE|LF\b/.test(m)) return 'Inverter Double Door';
      if (/\bIP\b/.test(m)) return 'Inverter Double Door';
      return 'Double Door';
    }
    case 'spinner':
      return 'Spinner';
    case 'washing_machine': {
      return _wmSubLabel(model, category, brand) || 'Washer';
    }
    case 'television': {
      if (/8K/.test(m))     return '8K Smart TV';
      if (/QLED/.test(m))   return 'QLED TV';
      if (/4K|UHD/.test(m)) return '4K Smart TV';
      return 'Smart TV';
    }
    case 'solar': {
      if (/PANEL/.test(m))          return 'Solar Panel';
      if (/BATTERY|BATT/.test(m))   return 'Solar Battery';
      if (/HYBRID/.test(m))         return 'Hybrid Inverter';
      if (/ON.GRID|ONGRID/.test(m)) return 'On-Grid Inverter';
      return 'Solar Inverter';
    }
    case 'deep_freezer': {
      if (/INV|INVERTER/.test(m)) return 'Inverter Deep Freezer';
      if (/VF[-\s]/.test(m) || category.toLowerCase().includes('vertical')) return 'Vertical Freezer';
      return 'Chest Deep Freezer';
    }
    case 'water_heater': {
      if (/INSTANT/.test(m))       return 'Instant Geyser';
      if (/E\+G|\bEG\b|DUAL/.test(m)) return 'Electric + Gas Geyser';
      if (/EWH|ELECTRIC/.test(m))  return 'Electric Geyser';
      return 'Gas Geyser';
    }
    case 'gas_hob': {
      if (/COOKING[\s-]?RANGE/i.test(m)) return 'Cooking Range';
      const burnM = m.match(/(\d)\s*BURNER/i);
      if (burnM) return burnM[1] + ' Burner Gas Hob';
      return 'Gas Hob';
    }
    case 'battery': {
      if (/LIFEP|LIFEPO|LITHIUM/.test(m)) return 'Lithium Battery';
      if (/TUBULAR/.test(m))              return 'Tubular Battery';
      return 'Lead-Acid Battery';
    }
    case 'ups':      return 'UPS';
    case 'mattress': {
      if (/ORTHO/.test(m))                         return 'Orthopaedic Mattress';
      if (/SPRING|CLASSIQUE|BRAVO|ALPHA/.test(m))  return 'Spring Mattress';
      return 'Foam Mattress';
    }
    case 'bed':      return /BUNKER|BUNK/.test(m) ? 'Bunk Bed' : /DOUBLE/.test(m) ? 'Double Bed' : 'Bed';
    case 'air_cooler': {
      if (/INV|INVERTER|DC\s*12V|AC\/DC/.test(m)) return 'Inverter Air Cooler';
      return 'Room Air Cooler';
    }
    default: {
      if (cc !== 'unknown') return CANONICAL_DISPLAY[cc] ?? '';
      // For Westpoint (and similar): if the DB category encodes a specific product type, use it as sub-category
      const GENERIC_CATS = new Set(Object.values(CATEGORY_MAP));
      GENERIC_CATS.add('Unknown');
      if (!GENERIC_CATS.has(category) && category.trim().length > 0) return category.trim();
      return '';
    }
  }
}

// ── Enrichment: tags ──────────────────────────────────────────────────────────

function _generateTags(brand: string, model: string, category: string, cc: string, specs: Record<string, string>, simplifiedName = ''): string {
  const b   = brand.toLowerCase();
  const m   = model.toUpperCase();
  const cat = category.toLowerCase();
  void m;
  const tags: string[] = [b, brand, 'karachi', 'pakistan', 'reliance appliances', 'installment', 'easy installments', cat];

  switch (cc) {
    case 'air_conditioner':
      tags.push('ac', 'air conditioner', 'split ac', b + ' ac', b + ' air conditioner');
      if (specs['Compressor']?.includes('Inverter')) tags.push('inverter ac', 'dc inverter ac', 'energy saving ac');
      if (specs['Tonnage']) tags.push(specs['Tonnage'].toLowerCase(), specs['Tonnage'].split(' ')[0] + ' ton ac');
      if (specs['Type']?.includes('Heat')) tags.push('heat and cool ac', 'heat pump');
      tags.push('split ac karachi', 'ac karachi price', b + ' ac karachi');
      break;
    case 'refrigerator':
      tags.push('refrigerator', 'fridge', b + ' fridge', b + ' refrigerator');
      if (specs['Compressor']?.includes('Inverter')) tags.push('inverter fridge', 'energy saving refrigerator');
      if (specs['Capacity']) tags.push(specs['Capacity'].split(' ')[0] + ' cuft fridge');
      if (specs['Type']?.includes('Side')) tags.push('side by side refrigerator', 'sbs fridge');
      if (specs['Type']?.includes('Deep')) tags.push('deep freezer', b + ' deep freezer');
      tags.push('fridge karachi price', b + ' refrigerator karachi');
      break;
    case 'washing_machine':
      tags.push('washing machine', b + ' washing machine');
      if (specs['Type']?.includes('Front')) tags.push('front load washing machine', 'automatic washing machine');
      if (specs['Type']?.includes('Top'))   tags.push('top load washing machine');
      if (specs['Type']?.includes('Twin'))  tags.push('twin tub', 'semi automatic');
      if (specs['Capacity']) tags.push(specs['Capacity'].split(' ')[0] + 'kg washing machine');
      tags.push('washer karachi', b + ' washer');
      break;
    case 'television':
      tags.push('tv', 'television', 'smart tv', b + ' tv', b + ' television');
      if (specs['Resolution']?.includes('4K'))  tags.push('4k tv', '4k smart tv', 'ultra hd tv');
      if (specs['Resolution']?.includes('8K'))  tags.push('8k tv', '8k ultra hd');
      if (specs['Display Type']?.includes('QLED')) tags.push('qled tv');
      if (specs['Screen Size']) tags.push(specs['Screen Size'].replace('"', '').replace(' (diagonal)', '') + ' inch tv');
      tags.push('led tv karachi', b + ' tv karachi price');
      break;
    case 'solar':
      tags.push('solar', 'solar energy', 'solar system', b + ' solar', 'save electricity');
      if (specs['System Capacity']) tags.push(specs['System Capacity'] + ' solar system');
      tags.push('solar panel karachi', 'solar system karachi', 'loadshedding solution');
      break;
    case 'deep_freezer':
      tags.push('deep freezer', 'freezer', b + ' freezer', b + ' deep freezer');
      if (specs['Capacity']) tags.push(specs['Capacity'].split(' ')[0] + ' cuft freezer');
      if (specs['Compressor']?.includes('Inverter')) tags.push('inverter freezer', 'energy saving freezer');
      tags.push('deep freezer karachi', 'deep freezer price pakistan', 'chest freezer karachi');
      break;
    case 'water_heater':
      tags.push('geyser', 'water heater', b + ' geyser', 'electric geyser', 'gas geyser');
      if (specs['Capacity']) tags.push(specs['Capacity'].split(' ')[0] + ' litre geyser');
      if (specs['Type']?.includes('Dual')) tags.push('dual geyser', 'electric gas geyser');
      if (specs['Heating']?.includes('Instant')) tags.push('instant geyser', 'instant water heater');
      tags.push('geyser karachi', 'geyser price pakistan', 'water heater karachi');
      break;
    case 'gas_hob':
      tags.push('gas hob', 'hob', 'gas stove', b + ' hob', b + ' gas stove');
      if (specs['Burners']) tags.push(specs['Burners'].toLowerCase(), specs['Burners'].split(' ')[0] + ' burner hob');
      if (specs['Surface']?.includes('Glass')) tags.push('glass hob', 'glass top stove');
      tags.push('gas hob karachi', 'gas stove karachi', 'cooking range karachi');
      break;
    case 'battery':
      tags.push('battery', b + ' battery', 'ups battery', 'inverter battery', 'loadshedding battery');
      if (specs['Technology']?.includes('Lithium')) tags.push('lithium battery', 'lifepo4 battery', 'solar battery');
      if (specs['Technology']?.includes('Tubular')) tags.push('tubular battery', 'deep cycle battery');
      if (specs['Capacity (AH)']) tags.push(specs['Capacity (AH)'].replace(' ', '') + ' battery');
      tags.push('battery karachi', 'battery price pakistan', 'ups battery karachi');
      break;
    case 'ups':
      tags.push('ups', b + ' ups', 'inverter ups', 'power backup', 'loadshedding ups');
      tags.push('ups karachi', 'ups price pakistan', 'home ups karachi');
      break;
    case 'air_cooler':
      tags.push('air cooler', 'room cooler', b + ' air cooler', 'evaporative cooler');
      if (specs['Motor']?.includes('Inverter')) tags.push('inverter air cooler', 'dc air cooler', 'ac dc cooler');
      tags.push('air cooler karachi', 'room cooler karachi', 'cooler price pakistan');
      break;
    case 'mattress':
      tags.push('mattress', b + ' mattress', 'foam mattress', 'pakistan mattress');
      if (simplifiedName.toLowerCase().includes('ortho')) tags.push('orthopaedic mattress', 'back pain mattress');
      if (simplifiedName.toLowerCase().includes('spring')) tags.push('spring mattress', 'pocket spring');
      tags.push('mattress karachi', 'mattress price pakistan');
      break;
    default: {
      const displayType = (CANONICAL_DISPLAY[cc] ?? category).toLowerCase();
      tags.push(displayType, b + ' ' + displayType, displayType + ' karachi', displayType + ' price pakistan');
      break;
    }
  }
  return [...new Set(tags)].join(', ');
}

// ── Enrichment: description ───────────────────────────────────────────────────

function _generateDescription(brand: string, model: string, simplifiedName: string, category: string, warranty: string, cc: string, specs: Record<string, string>): string {
  const name = simplifiedName || `${brand} ${category}`;

  switch (cc) {
    case 'air_conditioner': {
      const isInv = specs['Compressor']?.includes('Inverter');
      const isHC  = specs['Type']?.includes('Heat');
      return `The ${name} is built for Pakistan's demanding climate, delivering ${isHC ? 'year-round heating and cooling' : 'fast, powerful cooling'} for homes and offices in Karachi. ${isInv ? 'Its DC Inverter compressor automatically adjusts speed to maintain the set temperature, saving up to 60% electricity compared to a conventional AC.' : 'The rotary compressor delivers rapid cooling, reaching your set temperature within minutes.'} ${specs['Coverage Area'] ? `Ideal for rooms up to ${specs['Coverage Area'].replace('Up to ', '')}.` : ''} Features include auto-restart after power failure, sleep mode for quiet nights, and turbo cool for quick room chill. Refrigerant: ${specs['Refrigerant'] || 'R32 (eco-friendly)'}. Warranty: ${warranty}. Available on easy installments at Reliance Appliances, Karachi.`;
    }
    case 'refrigerator': {
      const isInv = specs['Compressor']?.includes('Inverter');
      const isDF  = specs['Type']?.includes('Deep Freezer');
      return `The ${name} ${isDF ? 'provides reliable long-term frozen storage' : 'keeps your food fresh longer'} with ${specs['Capacity'] ? specs['Capacity'] + ' of' : 'generous'} ${isDF ? 'freezer' : 'organised'} storage. ${isInv ? 'The inverter compressor runs at variable speeds — using up to 40% less electricity, producing less noise, and lasting longer than conventional compressors.' : 'The conventional compressor is engineered for Pakistani voltage conditions.'} ${specs['Voltage Tolerance'] ? `Built-in voltage tolerance (${specs['Voltage Tolerance']}) means no stabiliser is needed.` : ''} Uses ${specs['Refrigerant'] || 'R600a (zero ozone depletion)'} refrigerant. ${!isDF ? 'Humidity-controlled crisper drawer keeps fruits and vegetables fresh. ' : ''}Interior LED lighting. Warranty: ${warranty}. Easy installments — contact Reliance Appliances, Karachi.`;
    }
    case 'washing_machine': {
      const wt = _wmType(model, category, brand);
      if (wt === 'front_load') {
        return `The ${name} is a fully automatic front-load washing machine built for efficient daily laundry. ${specs['Capacity'] ? specs['Capacity'] + ' drum capacity.' : ''} Programs include ${specs['Wash Programs'] ? specs['Wash Programs'].split(',').slice(0, 3).join(', ') : 'Quick Wash, Normal, Eco'}. Uses up to 40% less water than top-load washers. ${specs['Spin Speed'] ? 'Spin speed: ' + specs['Spin Speed'] + '.' : ''} Stainless steel diamond drum. Rust-free body. Warranty: ${warranty}. Easy installments at Reliance Appliances, Karachi.`;
      }
      if (wt === 'top_load' || wt === 'fully_auto') {
        return `The ${name} is a fully automatic washing machine offering push-button convenience for daily laundry. ${specs['Capacity'] ? specs['Capacity'] + ' drum capacity.' : ''} Wash programs include ${specs['Wash Programs'] ? specs['Wash Programs'].split(',').slice(0, 3).join(', ') : 'Normal, Gentle, Quick Wash'} for different fabric types. ${specs['Spin Speed'] ? 'Spin speed: ' + specs['Spin Speed'] + '.' : ''} Rust-free body. Warranty: ${warranty}. Easy installments at Reliance Appliances, Karachi.`;
      }
      if (wt === 'twin_tub') {
        return `The ${name} is a twin-tub semi-automatic washing machine giving you hands-on control over every wash. ${specs['Capacity'] ? specs['Capacity'] + ' total capacity.' : ''} Wash in one tub, spin in the other — no automatic programmes needed. ${specs['Spin Speed'] ? 'Spin speed: ' + specs['Spin Speed'] + '.' : ''} Rust-free body, cold water inlet. Ideal for families who prefer direct laundry control. Warranty: ${warranty}. Easy installments at Reliance Appliances, Karachi.`;
      }
      if (wt === 'semi_auto') {
        return `The ${name} is a semi-automatic washing machine designed for Pakistan's everyday laundry needs. ${specs['Capacity'] ? specs['Capacity'] + ' capacity.' : ''} Twin-tub design lets you control wash and spin independently. ${specs['Spin Speed'] ? 'Spin speed: ' + specs['Spin Speed'] + '.' : ''} Rust-free body, cold water inlet. Warranty: ${warranty}. Easy installments at Reliance Appliances, Karachi.`;
      }
      // generic — type not confirmed from category or model codes; publish no false claims
      return `The ${name} handles everyday laundry needs for Pakistani households. ${specs['Capacity'] ? specs['Capacity'] + ' load capacity.' : ''} ${specs['Spin Speed'] ? 'High-speed spin at ' + specs['Spin Speed'].replace('Up to ', '') + ' for faster drying.' : ''} Cold water inlet, rust-free body, designed for Pakistan's 220V supply. Warranty: ${warranty}. Available on easy installments at Reliance Appliances, Karachi.`;
    }
    case 'television': {
      const is4K  = specs['Resolution']?.includes('4K');
      const isQled = specs['Display Type']?.includes('QLED');
      return `The ${name} delivers an immersive viewing experience for Pakistani households. ${is4K ? '4K Ultra HD resolution gives four times the detail of Full HD — every scene is razor-sharp.' : ''} ${isQled ? 'QLED Quantum Dot technology produces vivid, lifelike colours even in bright rooms.' : ''} ${specs['HDR Support'] && specs['HDR Support'] !== 'Standard' ? `Supports ${specs['HDR Support']} for stunning contrast.` : ''} Built-in Android/Google TV gives instant access to YouTube, Netflix, and local apps. Warranty: ${warranty}. Easy installments — Reliance Appliances, Karachi.`;
    }
    case 'solar': {
      return `The ${name} is a complete solar energy solution for Pakistan's power situation. ${specs['System Capacity'] ? `At ${specs['System Capacity']}, it` : 'It'} generates ${specs['Estimated Daily Output'] || 'significant daily output'} of clean electricity — reducing your WAPDA bill by 60–80%. ${specs['Works During Loadshedding']?.includes('Yes') ? 'Battery backup keeps your home powered through loadshedding.' : ''} ${specs['Est. Annual Saving'] ? `Estimated saving: ${specs['Est. Annual Saving']}.` : ''} High-efficiency ${specs['Panel Technology'] || 'monocrystalline PERC'} panels. Typically pays for itself in 3–4 years. Professional installation included. Warranty: ${warranty}. Financing available — Reliance Appliances, Karachi.`;
    }
    case 'spinner':
      return `The ${name} is a dedicated spin dryer for quick water extraction after hand washing. ${specs['Capacity'] ? specs['Capacity'] + '.' : ''} Spins at up to 1350 RPM, removing up to 95% of water per cycle — cutting drying time significantly. No water inlet required: simply load wet laundry directly from the wash basin. Rust-free plastic body built to last. Ideal for apartments, hostel rooms, or as a complement to a semi-automatic washing machine. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    case 'air_fryer':
      return `The ${name} lets you fry, bake, grill and roast with up to 95% less oil than traditional frying. Rapid hot air circulation cooks food evenly from all sides — crispy results without the mess or excess oil. ${specs['Capacity'] ? 'Capacity: ' + specs['Capacity'] + '.' : ''} ${specs['Temperature Range'] ? 'Temperature range: ' + specs['Temperature Range'] + '.' : ''} Basket with non-stick coating is easy to clean. Perfect for Pakistani households cooking samosas, chicken, fries, and more. Warranty: ${warranty}. Available on easy installments at Reliance Appliances, Karachi.`;
    case 'kettle':
      return `The ${name} boils water in minutes for tea, coffee, soups, and instant noodles. ${specs['Capacity'] ? 'Capacity: ' + specs['Capacity'] + '.' : ''} ${specs['Material'] ? specs['Material'] + '.' : ''} Auto shut-off and boil-dry protection ensure complete safety. 360° swivel base for easy lifting. A daily essential for every Pakistani kitchen. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    case 'microwave':
      return `The ${name} combines microwave heating with a grill function for fast, versatile cooking. ${specs['Capacity'] ? 'Cavity: ' + specs['Capacity'] + '.' : ''} Rotating glass turntable ensures even heating. Child lock and overheat protection for safe use. Ideal for reheating, defrosting, grilling, and cooking — saving time for busy Pakistani families. Warranty: ${warranty}. Easy installments at Reliance Appliances, Karachi.`;
    case 'iron':
      return `The ${name} delivers professional results at home. ${specs['Type'] ? specs['Type'] + '.' : ''} ${specs['Soleplate'] ? specs['Soleplate'] + ' for smooth gliding.' : ''} ${specs['Steam'] ? 'Features ' + specs['Steam'].toLowerCase() + ' for wrinkle-free results on all fabric types.' : ''} Auto shut-off for safety when left unattended. Built for Pakistan's 220V supply. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    case 'hair_straightener':
      return `The ${name} straightens and styles hair quickly with ${specs['Plate Material'] || 'ceramic-coated plates'} that distribute heat evenly, reducing damage. ${specs['Temperature Range'] ? 'Temperature range: ' + specs['Temperature Range'] + '.' : ''} ${specs['Heat-Up Time'] ? 'Heats up ' + specs['Heat-Up Time'].toLowerCase() + '.' : ''} Auto shut-off after 30 minutes for safety. Suitable for all hair types — from straight to thick, curly hair. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    case 'blender':
      return `The ${name} handles blending, grinding, and crushing with ease. ${specs['Motor Power'] ? specs['Motor Power'] + ' motor for powerful performance.' : ''} ${specs['Jar Capacity'] ? 'Jar capacity: ' + specs['Jar Capacity'] + '.' : ''} ${specs['Blade'] ? specs['Blade'] + ' for durability.' : ''} ${specs['Functions'] ? 'Functions: ' + specs['Functions'] + '.' : ''} Suitable for lassi, smoothies, chutneys, and soups. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    case 'juicer':
      return `The ${name} extracts fresh juice from fruits and vegetables quickly and efficiently. ${specs['Motor Power'] ? specs['Motor Power'] + ' motor.' : ''} ${specs['Strainer'] ? specs['Strainer'] + ' for clean, pulp-free juice.' : ''} ${specs['Pulp Control'] ? specs['Pulp Control'] + '.' : ''} Easy to clean and assemble. Ideal for fresh juices, lemonades, and health drinks. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    case 'fan':
      return `The ${name} provides effective air circulation for Pakistan's hot climate. ${specs['Type'] ? specs['Type'] + '.' : ''} ${specs['Speed Settings'] ? specs['Speed Settings'] + ' for personalised comfort.' : ''} ${specs['Oscillation'] ? 'Oscillation: ' + specs['Oscillation'] + ' for wide room coverage.' : ''} ${specs['Control'] ? specs['Control'] + '.' : ''} Energy-efficient and quiet. Warranty: ${warranty}. Available at Reliance Appliances, Karachi on easy installments.`;
    case 'heater':
      return `The ${name} keeps your room warm during Pakistan's winter months. ${specs['Type'] ? specs['Type'] + '.' : ''} ${specs['Wattage'] ? specs['Wattage'] + ' for efficient heating.' : ''} Tip-over protection and overheat shut-off for safe use around children and in bedrooms. ${specs['Heat Settings'] || 'Multiple heat settings'} for adjustable warmth. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    case 'water_dispenser':
      return `The ${name} provides instant hot and cold water for your home or office. ${specs['Type'] ? specs['Type'] + '.' : ''} Hot water temperature: 90–95°C for tea and beverages. Cold water: 5–10°C for refreshing drinking water. ${specs['Safety'] ? specs['Safety'] + '.' : ''} Fits standard 19-litre water bottles. Stainless steel hot tank is hygienic and durable. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    case 'deep_freezer': {
      const isInv = specs['Compressor']?.includes('Inverter');
      const isVF  = specs['Type']?.includes('Vertical');
      return `The ${name} provides reliable long-term frozen storage for meat, fish, and bulk food — essential for Pakistani households and commercial use. ${specs['Capacity'] ? specs['Capacity'] + ' of' : 'Generous'} storage space keeps large quantities organised. ${isInv ? 'The inverter compressor adjusts its speed intelligently — saving up to 35% electricity compared to conventional models, and running quieter too.' : "The conventional compressor is robust and optimised for Pakistan's hot climate."} ${isVF ? 'Vertical upright design saves floor space and makes it easy to see and access contents.' : 'Wide chest design maximises usable storage area.'} Uses R600a refrigerant (zero ozone depletion). Built-in voltage tolerance — no stabiliser needed. Warranty: ${warranty}. Easy installments at Reliance Appliances, Karachi.`;
    }
    case 'gas_hob': {
      const burners = specs['Burners'] || '';
      const surface = specs['Surface'] || '';
      const isCR    = specs['Type']?.includes('Range');
      const hasFSD  = specs['Safety']?.includes('Failure');
      return `The ${name} brings fast, efficient cooking to your kitchen with ${burners ? burners.toLowerCase() + ' of ' : ''}powerful gas heat. ${surface ? surface + ' for a clean, modern look that is easy to wipe down.' : ''} ${hasFSD ? 'Each burner has a Flame-Failure Device (FFD) — gas automatically shuts off if the flame blows out, protecting your family.' : ''} ${isCR ? 'Built-in oven section gives you versatile baking and grilling capability alongside the hob burners.' : ''} Compatible with both LPG and natural gas. ${specs['Ignition'] ? specs['Ignition'] + '.' : ''} Ideal for everyday Pakistani cooking — karahi, biryani, roti, and more. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    }
    case 'water_heater': {
      const cap     = specs['Capacity'] || '';
      const isElec  = specs['Type']?.includes('Electric');
      const isInstant = specs['Heating']?.includes('Instant');
      const isDual  = specs['Type']?.includes('Dual');
      return `The ${name} ensures a reliable supply of hot water for your home year-round — no more cold showers during winter. ${cap ? cap + ' of' : 'Generous'} hot water capacity suits daily bathing, washing, and dishwashing. ${isDual ? 'Dual Electric + Gas operation gives you flexibility — use gas when available, switch to electric when gas is off.' : isElec ? 'Electric operation means you get consistent hot water even during gas cuts — common in many Karachi areas.' : ''} ${isInstant ? 'Instant / tankless design heats water on demand — no waiting and no heat loss from a standing tank.' : 'Storage tank keeps water hot so it\'s ready the moment you need it.'} ${isElec ? 'Copper-sheathed heating element for long life. Safety features include thermal cut-off, over-pressure relief valve, and anti-corrosion magnesium anode rod.' : ''} Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    }
    case 'battery': {
      const isLi  = specs['Technology']?.includes('Lithium');
      const isTub = specs['Technology']?.includes('Tubular');
      const cap   = specs['Capacity (AH)'] || specs['Capacity (kWh)'] || '';
      return `The ${name} is a high-quality ${isLi ? 'lithium battery' : isTub ? 'tubular battery' : 'battery'} designed to power your home or office during loadshedding — a daily reality in Pakistan. ${cap ? cap + ' capacity delivers hours of backup for lights, fans, and essential appliances.' : ''} ${isLi ? 'LiFePO₄ (Lithium Iron Phosphate) technology is the safest lithium chemistry — no thermal runaway, no toxic gases. With 2000+ charge cycles and virtually zero maintenance, it outperforms lead-acid batteries by 3–5x.' : isTub ? 'Tubular plate design delivers deep-cycle performance, tolerating frequent full discharges far better than flat-plate batteries. 5–8 year service life with proper maintenance.' : 'Reliable lead-acid chemistry pairs well with any standard inverter or UPS.'} ${specs['Deep Discharge'] ? specs['Deep Discharge'] + '.' : ''} Works with all major UPS and solar inverter brands. Warranty: ${warranty}. Available at Reliance Appliances, Karachi on easy installments.`;
    }
    case 'air_cooler': {
      const isInv = specs['Motor']?.includes('Inverter');
      return `The ${name} offers effective cooling for Pakistani homes at a fraction of the electricity cost of an air conditioner. ${isInv ? 'The DC inverter motor runs on both AC and 12V DC — so it keeps cooling even during loadshedding when used with a battery or UPS.' : ''} Evaporative honeycomb pads absorb water and release cool, humidified air — bringing room temperature down by 5–10°C in moderate humidity. Perfect for open rooms, workshops, and outdoor areas where portable cooling is needed. Three speed settings and oscillation provide customisable airflow. Power draw is just ${specs['Power Draw']?.split('(')[0].trim() || '80–200W'} — compared to 1000–2000W for a split AC. Ideal for Karachi's hot, dry seasons. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    }
    case 'mattress': {
      const isOrth = simplifiedName.toLowerCase().includes('ortho');
      const isSprg = simplifiedName.toLowerCase().includes('spring');
      return `The ${name} is crafted for a comfortable, restorative night's sleep — essential after Pakistan's long, hot days. ${isOrth ? 'The orthopaedic design provides firm, even support for the spine, reducing back pain and pressure points for side, back, and stomach sleepers.' : isSprg ? 'The pocket-spring core responds independently to each area of your body, contouring your natural curves while minimising motion transfer between partners.' : 'High-density polyurethane foam offers consistent cushioning throughout the mattress, maintaining its shape for years.'} The cover is made from breathable fabric that keeps you cool and is easy to keep hygienic. Sized to standard Pakistani bed frames. Warranty: ${warranty}. Available at Reliance Appliances, Karachi.`;
    }
    case 'ups': {
      const watt = specs['Power'] || '';
      return `The ${name} provides instant, seamless power backup to keep your home running during Pakistan's frequent loadshedding. ${watt ? watt + ' output capacity is sufficient for lights, fans, a TV, and a router simultaneously.' : ''} Automatic switchover in milliseconds — your devices never notice the transition. Pure sine-wave output is safe for sensitive electronics including inverter ACs, LED TVs, and laptops. Built-in battery management extends battery life and prevents over-charging. Compatible with all standard tubular, sealed, and lithium batteries. Warranty: ${warranty}. Available at Reliance Appliances, Karachi on easy installments.`;
    }
    default:
      return `The ${name} by ${brand} is a quality ${CANONICAL_DISPLAY[cc]?.toLowerCase() || category.toLowerCase()} designed for everyday Pakistani households. Built to local electrical standards (220V/50Hz). Warranty: ${warranty}. Available at Reliance Appliances, Karachi — on easy installments or cash. Call or WhatsApp for the latest price.`;
  }
}

// ── Westpoint sub-category → canonical cc mapping ─────────────────────────────
// Used when resolveCanonicalCategory returns 'unknown' for generic DB categories
// like "Kitchen Appliances" but _wpLookup provides the real product sub-type.
function _wpSubCatToCC(sub: string): string | null {
  const s = sub.toLowerCase();
  if (s.includes('air fry'))                                                   return 'air_fryer';
  if (s.includes('microwave'))                                                 return 'microwave';
  if (s.includes('rotisserie') || s.includes('electric oven') || (s.includes('oven') && !s.includes('micro'))) return 'oven';
  if (s.includes('deep fry'))                                                  return 'air_fryer'; // deep fryers use air-fryer spec set
  if (s.includes('kettle'))                                                    return 'kettle';
  if (s.includes('hand blender'))                                              return 'hand_blender';
  if (s.includes('blender') || s.includes('grinder') || s.includes('drymill')) return 'blender';
  if (s.includes('juicer'))                                                    return 'juicer';
  if (s.includes('chopper'))                                                   return 'chopper';
  if (s.includes('food processor') || s.includes('food factory') || s.includes('kitchen chef') || s.includes('kitchen robot')) return 'food_processor';
  if (s.includes('rice cooker'))                                               return 'rice_cooker';
  if (s.includes('pressure cooker'))                                           return 'food_processor'; // closest spec set
  if (s.includes('bread toaster') || s.includes('toaster'))                   return 'toaster';
  if (s.includes('sandwich'))                                                  return 'sandwich_maker';
  if (s.includes('iron') && !s.includes('steamer'))                           return 'iron';
  if (s.includes('hair dryer'))                                                return 'hair_dryer';
  if (s.includes('hair straightener') || s.includes('straightening brush'))   return 'hair_straightener';
  if (s.includes('hair clipper') || s.includes('hair trimmer'))               return 'hair_clipper';
  if (s.includes('garment steamer') || s.includes('steamer'))                 return 'steamer';
  if (s.includes('tower fan') || s.includes('fan'))                           return 'fan';
  if (s.includes('room heater') || s.includes('fan heater') || s.includes('heater')) return 'heater';
  if (s.includes('humidifier') || s.includes('air purifier'))                 return 'air_purifier';
  if (s.includes('vacuum'))                                                    return 'vacuum';
  if (s.includes('water dispenser'))                                           return 'water_dispenser';
  if (s.includes('water boiler'))                                              return 'kettle'; // closest spec set
  if (s.includes('meat mincer'))                                               return 'blender'; // closest spec set
  if (s.includes('hand mixer'))                                                return 'hand_blender';
  if (s.includes('roti maker') || s.includes('dough maker'))                  return 'sandwich_maker'; // closest spec set
  if (s.includes('egg boiler') || s.includes('coffee maker'))                 return 'kettle'; // closest spec set
  if (s.includes('immersion rod'))                                             return 'kettle'; // closest spec set
  return null;
}

// ── Enrichment: master function ───────────────────────────────────────────────

export function enrichProduct(brand: string, model: string, category: string): Record<string, any> {
  // Resolve canonical category ONCE — used by all sub-functions
  let cc = resolveCanonicalCategory(brand, model, category);
  // For Westpoint products with generic DB categories ("Kitchen Appliances",
  // "Small Appliances"), use the sub-category from _wpLookup to get proper specs.
  if (cc === 'unknown' && brand.toLowerCase().includes('westpoint')) {
    const wp = _wpLookup(model);
    if (wp) { const wpCc = _wpSubCatToCC(wp[1]); if (wpCc) cc = wpCc; }
  }
  const specs         = _buildSpecs(brand, model, category, cc);
  const simplified_name = buildSimplifiedName(brand, model, category, cc, specs);
  const warranty      = lookupWarranty(brand, model, category, cc);
  const sub_category  = deriveSubCategory(brand, model, category, cc);
  const tags          = _generateTags(brand, model, category, cc, specs, simplified_name);
  const description   = _generateDescription(brand, model, simplified_name, category, warranty, cc, specs);
  const seo_title     = `${simplified_name} Price in Pakistan | Buy on Installments — Reliance Appliances Karachi`;
  const catDisplay    = cc !== 'unknown' ? (CANONICAL_DISPLAY[cc] ?? category) : category;
  const seo_desc      = `Buy the ${simplified_name} in Karachi at the best price. Available on easy installments at Reliance Appliances. ${warranty.split(',')[0]}. Call or WhatsApp now.`;
  const seo_keywords  = `${brand.toLowerCase()} ${catDisplay.toLowerCase()} karachi, ${simplified_name.toLowerCase()}, ${brand.toLowerCase()} ${model.toLowerCase()}, reliance appliances karachi, buy on installments karachi`;
  return { simplified_name, warranty, sub_category, specs, tags, description, seo_title, seo_desc, seo_keywords, updated_at: new Date().toISOString() };
}

// ── CSV Import: image resolution ──────────────────────────────────────────────

// One-time root folder scan: normalized-lowercase → exact bucket folder name
let _rootFolderMap: Map<string, string> | null = null;

export async function getBucketRootFolders(): Promise<Map<string, string>> {
  if (_rootFolderMap) return _rootFolderMap;
  const { data, error } = await supabase.storage.from('product-images').list('', { limit: 500 });
  _rootFolderMap = new Map();
  if (error || !data) return _rootFolderMap;
  for (const item of data) {
    if (item.name && item.name !== '.emptyFolderPlaceholder') {
      _rootFolderMap.set(item.name.toLowerCase(), item.name);
    }
  }
  return _rootFolderMap;
}

/** Scan the entire bucket and return a summary useful for diagnostics. */
export interface BucketScanResult {
  folders: string[];
  filesByFolder: Record<string, string[]>;
  totalFiles: number;
  error?: string;
}

export async function scanBucket(): Promise<BucketScanResult> {
  const result: BucketScanResult = { folders: [], filesByFolder: {}, totalFiles: 0 };
  _rootFolderMap = null; // force re-scan
  const rootMap = await getBucketRootFolders();
  if (rootMap.size === 0) {
    result.error = 'Bucket is empty or inaccessible (check RLS policy — ensure "list" is allowed for anon)';
    return result;
  }
  for (const [, actualFolder] of rootMap) {
    result.folders.push(actualFolder);
    const { data: files } = await supabase.storage.from('product-images').list(actualFolder, { limit: 1000 });
    const names = (files || []).filter(f => f.name && f.name !== '.emptyFolderPlaceholder').map(f => f.name);
    result.filesByFolder[actualFolder] = names;
    result.totalFiles += names.length;
  }
  // Also check root-level files (no subfolder)
  const { data: rootFiles } = await supabase.storage.from('product-images').list('', { limit: 500 });
  const rootLevel = (rootFiles || []).filter(f => f.id && f.name !== '.emptyFolderPlaceholder').map(f => f.name);
  if (rootLevel.length > 0) {
    result.folders.push('(root)');
    result.filesByFolder['(root)'] = rootLevel;
    result.totalFiles += rootLevel.length;
  }
  return result;
}

/** List all public image URLs in a brand's storage folder (for QC bucket search). */
export async function getBrandImages(brand: string): Promise<string[]> {
  const folder = brand.toLowerCase().replace(/\s+/g, '');
  const { data } = await supabase.storage.from('product-images').list(folder, { limit: 500 });
  if (!data) return [];
  return data
    .filter(f => f.name && f.name !== '.emptyFolderPlaceholder')
    .map(f => supabase.storage.from('product-images').getPublicUrl(`${folder}/${f.name}`).data.publicUrl);
}

/** Normalize a string for fuzzy matching: lowercase, remove separators (including '/').
 *  Also corrects common product-name typos (invertor → inverter). */
function _norm(s: string): string {
  return s.toLowerCase()
    .replace(/invertor/g, 'inverter') // common typo in product names
    .replace(/[-_\s./]/g, '');
}

/**
 * Builds a file map for a brand's image folder.
 * Keys are the extracted model identifier (lowercased):
 *   thumb key: model          (e.g. "1846")
 *   gallery key: model + "_2" (e.g. "1846_2")
 *
 * Filename parsing handles:
 *   1846_1.jpg        → model=1846, thumb
 *   1846_2.jpg        → model=1846, gallery
 *   1846_1 (1).jpg    → model=1846, thumb (variant — only stored if no prior thumb)
 *   WF-9936_1.jpg     → model=wf-9936, thumb; also stored as "9936" (numeric fallback)
 */
export async function resolveBrandImages(
  brand: string,
  cache: Map<string, Map<string, string>>
): Promise<Map<string, string>> {
  const brandKey = brand.toLowerCase();
  if (cache.has(brandKey)) return cache.get(brandKey)!;

  const fileMap = new Map<string, string>();

  const rootMap = await getBucketRootFolders();
  const actualFolder = rootMap.get(brandKey) ?? rootMap.get(_norm(brand)) ?? null;

  if (actualFolder) {
    const { data: files } = await supabase.storage.from('product-images').list(actualFolder, { limit: 1000 });
    for (const file of files ?? []) {
      if (!file.name || file.name === '.emptyFolderPlaceholder') continue;

      // Strip extension
      const dot = file.name.lastIndexOf('.');
      const stem = (dot > 0 ? file.name.slice(0, dot) : file.name);

      // Strip trailing " (N)" copy markers: "1846_1 (1)" → "1846_1"
      const clean = stem.replace(/\s*\(\d+\)\s*$/i, '').trim();

      // Extract model and suffix: "1846_1" → model="1846", suffix="1"
      const m = clean.match(/^(.+)_([12])$/);
      if (!m) continue; // skip files that don't match expected pattern

      const modelKey = m[1].toLowerCase();   // e.g. "1846", "wf-9936"
      const isGallery = m[2] === '2';
      const mapKey = isGallery ? modelKey + '_2' : modelKey;

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(`${actualFolder}/${file.name}`);
      const url = urlData.publicUrl;

      // Only store first occurrence (alphabetically earlier = original, not "(1)" copy)
      if (!fileMap.has(mapKey)) fileMap.set(mapKey, url);

      // Also store numeric-only fallback key (e.g. "wf-9936" → "9936")
      const numOnly = modelKey.replace(/[^0-9]/g, '');
      if (numOnly && numOnly !== modelKey && numOnly.length >= 3) {
        const numKey = isGallery ? numOnly + '_2' : numOnly;
        if (!fileMap.has(numKey)) fileMap.set(numKey, url);
      }

      // Also store normalized fallback (no hyphens/spaces): "wf-9936" → "wf9936"
      const normKey = isGallery ? _norm(modelKey) + '_2' : _norm(modelKey);
      if (normKey !== mapKey && !fileMap.has(normKey)) fileMap.set(normKey, url);
    }
  }

  cache.set(brandKey, fileMap);
  return fileMap;
}

/**
 * Looks up thumbnail and gallery URLs from the file map built by resolveBrandImages.
 * Map keys are: model (thumb) and model+"_2" (gallery).
 * Tries: exact model → normalized model → pre-slash model → numeric-only → prefix match.
 * Falls back to _2 (gallery) file as thumbnail if no _1 exists.
 */
export function resolveProductImages(
  fileMap: Map<string, string>,
  model: string
): { thumbnail_url: string; gallery_urls: string[] } {
  if (fileMap.size === 0) return { thumbnail_url: '', gallery_urls: [] };

  const ml    = model.toLowerCase();           // e.g. "wf-9936"
  const mlN   = _norm(model);                  // e.g. "wf9936" (slashes/spaces/hyphens stripped)
  const mlNum = model.replace(/[^0-9]/g, ''); // e.g. "9936"

  // Pre-slash candidate: "HSU-13HFS/G/S" → "hsu-13hfs" (color variant stripped)
  // Also handles "HRF-578TSG/TBG" → "hrf-578tsg" (first variant selected)
  const slashIdx = model.indexOf('/');
  const mlPreSlash = slashIdx > 0 ? model.slice(0, slashIdx).trim().toLowerCase() : '';
  const mlPreSlashN = mlPreSlash ? _norm(mlPreSlash) : '';

  // Lookup candidates to try, in priority order (most specific first).
  // Require numeric-only key to be 4+ digits to prevent short numbers (e.g. "120" from "120-AS")
  // matching unrelated products (e.g. an AC image stored under "120-YR") in the same brand folder.
  const candidates = [...new Set([
    ml, mlN, mlPreSlash, mlPreSlashN, mlNum.length >= 4 ? mlNum : '',
  ].filter(Boolean))];

  const findUrl = (baseKey: string, galleryVariant: boolean): string => {
    const key = galleryVariant ? baseKey + '_2' : baseKey;
    if (fileMap.has(key)) return fileMap.get(key)!;
    // Prefix match — the char AFTER baseKey must be a separator (-, _, space) or end-of-string.
    // This prevents "614" matching "6141" or "9936" matching "99360".
    for (const [k, v] of fileMap) {
      if (!k.startsWith(baseKey)) continue;
      const next = k[baseKey.length];
      if (next !== undefined && !/[-_. ]/.test(next)) continue; // no alphanumeric bleed-through
      if (galleryVariant ? k.endsWith('_2') : !k.endsWith('_2')) return v;
    }
    return '';
  };

  let thumbnail_url = '';
  for (const c of candidates) {
    thumbnail_url = findUrl(c, false);
    if (thumbnail_url) break;
  }

  // Normalized substring fallback — only for models with 5+ norm chars to avoid
  // short numeric keys (e.g. "614") false-matching "6141", "1614", etc.
  if (!thumbnail_url && mlN.length >= 5) {
    for (const [k, v] of fileMap) {
      if (!k.endsWith('_2') && _norm(k).includes(mlN)) { thumbnail_url = v; break; }
    }
  }

  // Reverse-substring fallback: product's norm CONTAINS the bucket key's norm.
  // Handles cases where the product name is more specific than the bucket filename,
  // e.g. "SPLIT ELEGANCE PRO INVERTER 30" (mlN) contains "eleganceproinverter30" (bucket key).
  // Require bucket key to be 8+ norm-chars to prevent short keys causing false positives.
  if (!thumbnail_url) {
    const allNorms = [mlN, mlPreSlashN].filter(Boolean);
    for (const [k, v] of fileMap) {
      if (k.endsWith('_2')) continue;
      const nk = _norm(k);
      if (nk.length >= 8 && allNorms.some(n => n.includes(nk))) { thumbnail_url = v; break; }
    }
  }

  // Last resort: use _2 (gallery) image as thumbnail if no _1 exists for this model.
  // Handles products where only a gallery shot was uploaded (e.g. "HD60-50_2.jpeg").
  if (!thumbnail_url) {
    for (const c of candidates) {
      const g = findUrl(c, true);
      if (g) { thumbnail_url = g; break; }
    }
    if (!thumbnail_url && mlN.length >= 5) {
      for (const [k, v] of fileMap) {
        if (k.endsWith('_2') && _norm(k.slice(0, -2)).includes(mlN)) { thumbnail_url = v; break; }
      }
    }
  }

  const gallery_urls: string[] = [];
  for (const c of candidates) {
    const g = findUrl(c, true);
    if (g && g !== thumbnail_url) { gallery_urls.push(g); break; }
  }

  return { thumbnail_url, gallery_urls };
}

// ── CSV Import: main orchestrator ─────────────────────────────────────────────

export async function processCSVImport(
  rows: CsvImportRow[],
  onProgress: (msg: string) => void,
  opts: { rematchImages?: boolean } = {},
): Promise<ImportSummary> {
  const summary: ImportSummary = { added: 0, updated: 0, discontinued: 0, imagesFound: 0, imagesMissing: 0, errors: [] };
  if (rows.length === 0) return summary;

  // Step 1 — Pre-fetch image maps per brand in parallel
  onProgress('Resolving images from storage…');
  const brandImageCache = new Map<string, Map<string, string>>();
  const uniqueBrands = [...new Set(rows.map(r => r.Brand).filter(Boolean))];
  await Promise.all(uniqueBrands.map(b => resolveBrandImages(b, brandImageCache)));

  // Step 2 — Build CSV state sets
  // Keys are normalized so "HRF-368 IFGA/IFRA/IFPA" matches DB row "HRF-368 IFGA"
  const _csvCategories = new Set(rows.map(r => r.Category).filter(Boolean)); void _csvCategories;
  const csvKeys = new Set(
    rows.map(r => `${(r.Brand || '').toLowerCase()}::${normalizeModelForDedupe(r.Model || '')}`)
  );

  // Step 3 — Fetch existing DB products by brand (not category) so we find products
  // that were previously imported and then rebalanced to a different category.
  // Filtering by category would miss them, causing duplicate-slug INSERT errors.
  onProgress('Loading existing products…');
  const { data: existingRows, error: fetchErr } = await supabase
    .from('products')
    .select('id, brand, model, category, stock_status, missing_count')
    .in('brand', uniqueBrands);
  if (fetchErr) { summary.errors.push('DB fetch failed: ' + fetchErr.message); return summary; }

  // brand::normalizedModel → existing DB row id
  // Normalized key means "HRF-368 IFGA/IFRA/IFPA" from CSV matches "HRF-368 IFGA" in DB
  const existingIdMap = new Map<string, string>();
  for (const r of existingRows ?? []) {
    const k = `${(r.brand || '').toLowerCase()}::${normalizeModelForDedupe(r.model || '')}`;
    existingIdMap.set(k, r.id);
  }

  // Step 4 — Upsert CSV rows in batches of 50
  // Existing products: price-only update (enrichment/images preserved)
  // New products: full enrichment + image resolution
  const BATCH = 50;
  const priceLog: Array<{ product_id: string; brand: string; model: string; category: string; retail_price: number }> = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    onProgress(`Importing ${i + 1}–${Math.min(i + BATCH, rows.length)} of ${rows.length}…`);
    await Promise.all(batch.map(async row => {
      const brand    = (row.Brand || '').trim();
      const model    = (row.Model || '').trim();
      const category = (row.Category || '').trim();
      const price    = Number(row.Retail_Price || row['Retail Price'] || row['Price'] || 0);
      if (!brand || !model || !category) {
        const missing = [!brand && 'Brand', !model && 'Model', !category && 'Category'].filter(Boolean).join(', ');
        summary.errors.push(`Skipped: Brand="${brand}" Model="${model}" Cat="${category}" — missing: ${missing}`);
        return;
      }
      // Price=0 is allowed — product is imported as a draft (excluded from WA feed and catalog)
      if (!price) summary.errors.push(`Draft (no price): Brand="${brand}" Model="${model}" — set price later in admin`);

      const bKey     = `${brand.toLowerCase()}::${normalizeModelForDedupe(model)}`;
      const id       = existingIdMap.get(bKey) || slugify(`${brand}-${model}`);
      const isUpdate = existingIdMap.has(bKey);

      const cashFloor = roundUp500(price);
      const rowCC = resolveCanonicalCategory(brand, model, category);
      if (rowCC === 'unknown') {
        summary.errors.push(`Warning: Category "${category}" not recognized for ${brand} ${model} — specs may be incomplete`);
      }
      const p2 = calcPlan(cashFloor, '2m'); const p3 = calcPlan(cashFloor, '3m');
      const p6 = calcPlan(cashFloor, '6m');
      const p12 = allows12m(cashFloor, rowCC) ? calcPlan(cashFloor, '12m') : null;
      const installmentCols = {
        adv_2m: p2.advance,  monthly_2m: p2.monthly,  total_2m: p2.total,
        adv_3m: p3.advance,  monthly_3m: p3.monthly,  total_3m: p3.total,
        adv_6m: p6.advance,  monthly_6m: p6.monthly,  total_6m: p6.total,
        adv_12m: p12?.advance ?? null, monthly_12m: p12?.monthly ?? null, total_12m: p12?.total ?? null,
      };

      try {
        if (isUpdate) {
          // Existing product: price + installments only — leave enriched fields untouched
          const updatePatch: Record<string, unknown> = {
            retail_price: price, cash_floor: cashFloor, ...installmentCols,
            missing_count: 0, stock_status: 'In Stock', updated_at: new Date().toISOString(),
          };
          if (opts.rematchImages) {
            const fileMap = brandImageCache.get(brand.toLowerCase()) ?? new Map();
            const { thumbnail_url, gallery_urls } = resolveProductImages(fileMap, model);
            if (thumbnail_url) { updatePatch.thumbnail_url = thumbnail_url; updatePatch.gallery_urls = gallery_urls; summary.imagesFound++; }
            else summary.imagesMissing++;
          }
          const { error } = await supabase.from('products').update(updatePatch).eq('id', id);
          if (error) throw error;
          summary.updated++;
        } else {
          // New product: full enrichment + image resolution
          const fileMap = brandImageCache.get(brand.toLowerCase()) ?? new Map();
          const { thumbnail_url, gallery_urls } = resolveProductImages(fileMap, model);
          if (thumbnail_url) summary.imagesFound++; else summary.imagesMissing++;
          const enriched = enrichProduct(brand, model, category);
          // Use the curated CSV "Item name" as simplified_name when provided — it's more accurate
          // than the auto-generated name (e.g. "Haier Thunder 1.5 Ton Inverter Air Conditioner")
          const csvItemName = (row['Item name'] || row['Item Name'] || row['item_name'] || '').trim();
          if (csvItemName) {
            enriched.simplified_name = csvItemName;
            enriched.seo_title = `${csvItemName} Price in Pakistan | Buy on Installments — Reliance Appliances Karachi`;
            enriched.seo_desc  = `Buy the ${csvItemName} in Karachi at the best price. Available on easy installments at Reliance Appliances. ${enriched.warranty?.split(',')[0] ?? '1 year warranty'}. Call or WhatsApp now.`;
          }
          const { error } = await supabase.from('products').upsert({
            id, slug: id, brand, model, category,
            retail_price: price, cash_floor: cashFloor,
            thumbnail_url, gallery_urls,
            ...enriched, ...installmentCols,
          }, { onConflict: 'id' });
          if (error) throw error;
          summary.added++;
        }
        priceLog.push({ product_id: id, brand, model, category, retail_price: cashFloor });
      } catch (e: any) { summary.errors.push(`Error: ${brand} ${model} — ${e.message}`); }
    }));
  }

  // Step 4b — Log price history
  if (priceLog.length > 0) {
    onProgress('Logging price history…');
    for (let i = 0; i < priceLog.length; i += BATCH) {
      await supabase.from('price_history').insert(priceLog.slice(i, i + BATCH));
    }
  }

  // Step 5 — Discontinuation pass
  onProgress('Checking for discontinued products…');
  const toDiscontinue: string[] = [];
  const toIncrement:   string[] = [];

  for (const dbRow of existingRows ?? []) {
    const dbKey = `${(dbRow.brand || '').toLowerCase()}::${normalizeModelForDedupe(dbRow.model || '')}`;
    if (csvKeys.has(dbKey)) continue; // present in CSV → reset already done above

    const newCount = (dbRow.missing_count ?? 0) + 1;
    if (newCount >= 2 && dbRow.stock_status !== 'Discontinued') toDiscontinue.push(dbRow.id);
    else if (dbRow.stock_status !== 'Discontinued')             toIncrement.push(dbRow.id);
  }

  if (toIncrement.length > 0) {
    // Try RPC first (requires SQL migration), fallback to individual updates
    const { error: rpcErr } = await supabase.rpc('increment_missing_count', { product_ids: toIncrement });
    if (rpcErr) {
      // Fallback: individual increments
      await Promise.all(toIncrement.map(async id => {
        const row = existingRows?.find(r => r.id === id);
        if (row) await supabase.from('products').update({ missing_count: (row.missing_count ?? 0) + 1 }).eq('id', id);
      }));
    }
  }

  if (toDiscontinue.length > 0) {
    for (let i = 0; i < toDiscontinue.length; i += BATCH) {
      const slice = toDiscontinue.slice(i, i + BATCH);
      const { error } = await supabase.from('products').update({ stock_status: 'Discontinued', missing_count: 2 }).in('id', slice);
      if (!error) summary.discontinued += slice.length;
    }
  }

  clearCache();
  onProgress('');
  return summary;
}

// ── Data tools: re-enrich, re-match images, audit ────────────────────────────

export interface AuditProduct {
  id: string; brand: string; model: string; category: string;
  simplified_name: string; thumbnail_url: string; description: string;
  warranty: string; tags: string; seo_title: string; missing: string[];
}

/** Re-runs enrichProduct() on every row and saves the enriched fields. */
export async function reenrichAllProducts(
  onProgress: (msg: string) => void,
  ids?: string[]
): Promise<{ done: number; errors: string[] }> {
  const result = { done: 0, errors: [] as string[] };
  onProgress('Loading products…');
  let q = supabase.from('products').select('id, brand, model, category');
  if (ids?.length) q = q.in('id', ids);
  const { data, error } = await q;
  if (error) { result.errors.push(error.message); onProgress(''); return result; }
  const rows = data || [];
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    onProgress(`Enriching ${i + 1}–${Math.min(i + BATCH, rows.length)} of ${rows.length}…`);
    await Promise.all(rows.slice(i, i + BATCH).map(async r => {
      try {
        const enriched = enrichProduct(r.brand || '', r.model || '', r.category || '');
        const { error: e } = await supabase.from('products').update(enriched).eq('id', r.id);
        if (e) throw new Error(e.message || e.details || JSON.stringify(e));
        result.done++;
      } catch (e: any) { result.errors.push(`${r.brand} ${r.model}: ${e.message ?? String(e)}`); }
    }));
  }
  clearCache();
  onProgress('');
  return result;
}

/** Scans Supabase Storage and writes thumbnail_url / gallery_urls for every product.
 *  opts.clearUnmatched: when true, also nulls out thumbnail_url/gallery_urls for
 *  products where no image is found in Storage (removes wrong/stock images). */
export async function rematchAllImages(
  onProgress: (msg: string) => void,
  ids?: string[],
  opts: { clearUnmatched?: boolean } = {}
): Promise<{ found: number; missing: number; cleared: number; errors: string[] }> {
  const result = { found: 0, missing: 0, cleared: 0, errors: [] as string[] };
  onProgress('Loading products…');
  let q = supabase.from('products').select('id, brand, model, thumbnail_url');
  if (ids?.length) q = q.in('id', ids);
  const { data, error } = await q;
  if (error) { result.errors.push(error.message); onProgress(''); return result; }
  const rows = data || [];
  const cache = new Map<string, Map<string, string>>();
  const uniqueBrands = [...new Set(rows.map(r => r.brand).filter(Boolean))];
  onProgress('Fetching image maps from storage…');
  await Promise.all(uniqueBrands.map(b => resolveBrandImages(b, cache)));
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    onProgress(`Matching ${i + 1}–${Math.min(i + BATCH, rows.length)} of ${rows.length}…`);
    await Promise.all(rows.slice(i, i + BATCH).map(async r => {
      try {
        const fileMap = cache.get((r.brand || '').toLowerCase()) ?? new Map();
        const { thumbnail_url, gallery_urls } = resolveProductImages(fileMap, r.model || '');
        if (thumbnail_url) {
          const { error: e } = await supabase.from('products').update({ thumbnail_url, gallery_urls }).eq('id', r.id);
          if (e) throw e;
          result.found++;
        } else {
          result.missing++;
          // Clear any existing stock/wrong image if clearUnmatched is set
          if (opts.clearUnmatched && r.thumbnail_url) {
            const { error: e } = await supabase.from('products').update({ thumbnail_url: null, gallery_urls: [] }).eq('id', r.id);
            if (e) throw e;
            result.cleared++;
          }
        }
      } catch (e: any) { result.errors.push(`${r.brand} ${r.model}: ${e.message}`); }
    }));
  }
  clearCache();
  onProgress('');
  return result;
}

// Maps resolveCanonicalCategory() IDs → CATEGORY_MAP display strings
const _CANONICAL_TO_DISPLAY: Record<string, string> = {
  air_conditioner:   'Air Conditioners',
  refrigerator:      'Refrigerators',
  deep_freezer:      'Freezers',
  washing_machine:   'Washing Machines',
  spinner:           'Washing Machines',
  television:        'Televisions',
  solar:             'Solar Solutions',
  battery:           'Solar Solutions',
  ups:               'Solar Solutions',
  vacuum:            'Vacuum Cleaners',
  water_dispenser:   'Water Dispensers',
  water_heater:      'Water Dispensers',
  // Kitchen appliances
  air_fryer:         'Kitchen Appliances',
  microwave:         'Kitchen Appliances',
  oven:              'Kitchen Appliances',
  kettle:            'Kitchen Appliances',
  toaster:           'Kitchen Appliances',
  sandwich_maker:    'Kitchen Appliances',
  hand_blender:      'Kitchen Appliances',
  blender:           'Kitchen Appliances',
  juicer:            'Kitchen Appliances',
  food_processor:    'Kitchen Appliances',
  chopper:           'Kitchen Appliances',
  rice_cooker:       'Kitchen Appliances',
  induction:         'Kitchen Appliances',
  chimney:           'Kitchen Appliances',
  gas_hob:           'Kitchen Appliances',
  // Small appliances
  air_cooler:        'Small Appliances',
  air_purifier:      'Small Appliances',
  iron:              'Small Appliances',
  steamer:           'Small Appliances',
  hair_dryer:        'Small Appliances',
  hair_straightener: 'Small Appliances',
  hair_crimper:      'Small Appliances',
  curling_iron:      'Small Appliances',
  fan:               'Small Appliances',
  heater:            'Small Appliances',
  mattress:          'Small Appliances',
  bed:               'Small Appliances',
};

/** Classifies every product using resolveCanonicalCategory and writes the
 *  canonical CATEGORY_MAP display string back to the DB. */
export async function fixAllCategories(
  onProgress: (msg: string) => void,
  ids?: string[]
): Promise<{ fixed: number; skipped: number; errors: string[] }> {
  const result = { fixed: 0, skipped: 0, errors: [] as string[] };
  let q = supabase.from('products').select('id, brand, model, category');
  if (ids?.length) q = q.in('id', ids);
  else { q = q.order('brand'); q = q.order('model'); }
  const { data, error } = await q;
  if (error || !data) { result.errors.push(error?.message ?? 'fetch failed'); return result; }

  for (const row of data) {
    const canonicalId   = resolveCanonicalCategory(row.brand ?? '', row.model ?? '', row.category ?? '');
    const displayValue  = _CANONICAL_TO_DISPLAY[canonicalId];
    if (!displayValue) { result.skipped++; continue; }
    if (row.category === displayValue) { result.skipped++; continue; }
    onProgress(`${row.brand} ${row.model} → ${displayValue}`);
    const { error: upErr } = await supabase
      .from('products').update({ category: displayValue }).eq('id', row.id);
    if (upErr) { result.errors.push(`${row.model}: ${upErr.message}`); }
    else result.fixed++;
  }
  clearCache();
  onProgress('');
  return result;
}

// ── Category size constants ───────────────────────────────────────────────────
export const CAT_MIN = 10;
export const CAT_MAX = 40;

/** Returns the number of products per category. */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  const { data } = await supabase.from('products').select('category');
  const counts: Record<string, number> = {};
  (data || []).forEach((r: any) => {
    const c = r.category || '(none)';
    counts[c] = (counts[c] || 0) + 1;
  });
  return counts;
}

// ── Category assignment rules (mirrors scripts/rebalance-categories.mjs) ──────

function _acCategory(s: string, m: string, specs: Record<string, any>): string {
  const ton = parseFloat(String(specs['Tonnage'] || specs['tonnage'] || specs['Capacity'] || '0'));
  if (ton > 0) {
    if (ton <= 1.3) return '1 Ton Air Conditioners';
    if (ton <= 1.7) return '1.5 Ton Air Conditioners';
    return '2 Ton Air Conditioners';
  }
  if (/\b(0\.75|0\.8|0\.9|1\.0|1\.2)\s*ton|\b1\s*ton(?!\s*\.5)/i.test(s)) return '1 Ton Air Conditioners';
  if (/1\.5\s*ton|1\.5ton/i.test(s))  return '1.5 Ton Air Conditioners';
  if (/1\.7\s*ton|2\.0\s*ton|2\s*ton|floor\s*stand|cassette|commercial|\b3\s*ton|\b4\s*ton/i.test(s))
    return '2 Ton Air Conditioners';
  if (/-12[a-z]|^es-?12|^gs-?12|^gf-?12|^hsu-?12|^dc-?12/i.test(m)) return '1 Ton Air Conditioners';
  if (/-18[a-z]|^es-?18|^gs-?18|^gf-?18|^hsu-?18|^dc-?18/i.test(m)) return '1.5 Ton Air Conditioners';
  if (/-24[a-z]|-36|-48|^es-?24|^gs-?24|^gf-?24|^gf-?36|^gf-?48|^hsu-?24|^hpu-/i.test(m)) return '2 Ton Air Conditioners';
  return '1.5 Ton Air Conditioners';
}

function _fridgeCategory(s: string, _m: string, specs: Record<string, any>): string {
  const cf = s.match(/\b(\d+(?:\.\d+)?)\s*cu\.?\s*ft\b|\b(\d+)\s*cubic\b/i);
  if (cf) {
    const n = parseFloat(cf[1] || cf[2]);
    if (n <= 12) return 'Small Refrigerators';
    if (n <= 17) return 'Medium Refrigerators';
    return 'Large Refrigerators';
  }
  const cap = parseFloat(String(specs['Capacity'] || specs['capacity'] || '0'));
  if (cap > 0) {
    if (cap <= 12) return 'Small Refrigerators';
    if (cap <= 17) return 'Medium Refrigerators';
    return 'Large Refrigerators';
  }
  if (/glass\s*door|inverter\s*avante|avante\+|kenwood|homage/i.test(s)) return 'Large Refrigerators';
  return 'Medium Refrigerators';
}

function _washerCategory(s: string, m: string): string {
  if (/twin\s*tub|semi.?auto|spinner|esw-/i.test(s + ' ' + m)) return 'Semi-Automatic Washing Machines';
  return 'Automatic Washing Machines';
}

function _kitchenCategory(s: string): string {
  if (/kitchen\s*(chef|robot)|food\s*(factory|process)|meat\s*minc|minc|chopper|slicer|fries\s*cut|vegetable\s*sl/i.test(s))
    return 'Kitchen Food Processors';
  if (/\boven\b|air\s*fr|microwave|pressure\s*cook|slow\s*cook|hot\s*plate|ceramic\s*cook|deep\s*fr|rice\s*cook|convect|rotisserie|induction/i.test(s))
    return 'Kitchen Cooking Appliances';
  if (/blender|juicer|mixer|beater|citrus|hand\s*mix|grinder/i.test(s))
    return 'Kitchen Blenders & Juicers';
  if (/kettle|toaster|sandwich|coffee|roti|egg\s*boil|water\s*boil|pizza|scale|dough/i.test(s))
    return 'Kitchen Breakfast & Beverages';
  return 'Kitchen Cooking Appliances';
}

function _smallCategory(s: string): string {
  if (/hair\s*(dry|straight|crimp|curl|clip)|epilator|facial|face\s*steam|foot\s*massag|baby|bottle|weight\s*scale|digital\s*weight|insect\s*kill/i.test(s))
    return 'Personal Care Appliances';
  return 'Home & Heating Appliances';
}

/** Compute the correct balanced category for a single product row. Returns null if no rule matches. */
function _computeProductCategory(p: { brand?: string | null; model?: string | null; simplified_name?: string | null; category?: string | null; specs?: Record<string, any> | null }): string | null {
  const s    = (p.simplified_name || '').toLowerCase();
  const m    = (p.model           || '').toLowerCase();
  const cat  = (p.category        || '').toLowerCase();
  const brand = (p.brand          || '').toLowerCase();
  const specs = p.specs || {};

  const MISCAT_AC = ['duke', 'ario t3', 'emperor', 'nova t3', 'prince t3',
                     'floor standing', 'commercial ac', 'cool only', 'splits'];
  const isMiscatAC = MISCAT_AC.includes(cat) || (cat === 'televisions' && brand === 'gree');
  const isUSBWasher = cat === 'usb' && brand === 'ecostar';

  if (isMiscatAC)                      return _acCategory(s, m, specs);
  if (isUSBWasher)                      return _washerCategory(s, m);
  if (cat.includes('air condition') || cat.includes('ton air'))  return _acCategory(s, m, specs);
  if (cat.includes('refrigerat'))       return _fridgeCategory(s, m, specs);
  if (cat === 'freezer' || cat === 'freezers') return 'Freezers';
  if (cat.includes('washing'))          return _washerCategory(s, m);
  if (cat === 'kitchen appliances')     return _kitchenCategory(s);
  if (cat === 'small appliances')       return _smallCategory(s);
  if (cat.includes('solar'))            return 'Solar Solutions';
  if (cat === 'televisions')            return 'Televisions';
  if (cat.includes('water dispenser'))  return 'Water Dispensers';
  return null;
}

/**
 * Rebalances all DB categories so each has 10–40 products.
 * Runs in-browser with the authenticated admin session.
 * Also fixes miscategorized products (wrong Gree/EcoStar series names, etc.)
 */
export async function rebalanceCategories(
  onProgress: (msg: string) => void,
  ids?: string[]
): Promise<{ updated: number; unchanged: number; byCategory: Record<string, number>; errors: string[] }> {
  const result = { updated: 0, unchanged: 0, byCategory: {} as Record<string, number>, errors: [] as string[] };

  onProgress('Loading products…');
  let q = supabase.from('products').select('id, brand, model, simplified_name, category, specs');
  if (ids?.length) q = q.in('id', ids);
  const { data, error } = await q;
  if (error) { result.errors.push(error.message); onProgress(''); return result; }

  const rows = data || [];
  const changes: Array<{ id: string; newCategory: string }> = [];

  for (const r of rows) {
    const newCat = _computeProductCategory(r as any);
    if (!newCat) { result.unchanged++; continue; }
    if (newCat === r.category) { result.unchanged++; continue; }
    changes.push({ id: r.id, newCategory: newCat });
  }

  const BATCH = 50;
  for (let i = 0; i < changes.length; i += BATCH) {
    onProgress(`Updating ${i + 1}–${Math.min(i + BATCH, changes.length)} of ${changes.length}…`);
    await Promise.all(changes.slice(i, i + BATCH).map(async ({ id, newCategory }) => {
      try {
        const { error: e } = await supabase.from('products').update({ category: newCategory }).eq('id', id);
        if (e) throw e;
        result.updated++;
        result.byCategory[newCategory] = (result.byCategory[newCategory] || 0) + 1;
      } catch (e: any) { result.errors.push(`${id}: ${e.message}`); }
    }));
  }

  clearCache();
  onProgress('');
  return result;
}

/** Returns all products that have at least one missing data field. */
export async function getDataAudit(): Promise<AuditProduct[]> {
  const { data, error } = await supabase.from('products')
    .select('id, brand, model, category, simplified_name, thumbnail_url, description, warranty, tags, seo_title')
    .order('brand').order('model');
  if (error || !data) return [];
  return data.map(r => {
    const missing: string[] = [];
    if (!r.simplified_name) missing.push('Name');
    if (!r.thumbnail_url)   missing.push('Image');
    if (!r.description)     missing.push('Desc');
    if (!r.warranty)        missing.push('Warranty');
    if (!r.tags)            missing.push('Tags');
    if (!r.seo_title)       missing.push('SEO');
    return { ...r, missing } as AuditProduct;
  }).filter(r => r.missing.length > 0);
}

/** Returns price history for a product (most recent first). */
export async function getPriceHistory(productId: string): Promise<{ retail_price: number; imported_at: string }[]> {
  const { data } = await supabase.from('price_history')
    .select('retail_price, imported_at')
    .eq('product_id', productId)
    .order('imported_at', { ascending: false })
    .limit(20);
  return data || [];
}

// ── Product Gallery Image helpers ─────────────────────────────────────────────

/** An image entry in an ordered product gallery. position is 1-based; 1 = primary. */
export interface ProductGalleryImage {
  url:        string;
  position:   number;
  is_primary: boolean;
}

/** Compose flat DB fields (thumbnail_url + gallery_urls) → ordered ProductGalleryImage[]. */
export function composeImages(thumbnail: string, gallery: string[]): ProductGalleryImage[] {
  const imgs: ProductGalleryImage[] = [];
  if (thumbnail?.startsWith('http')) {
    imgs.push({ url: thumbnail, position: 1, is_primary: true });
  }
  (gallery || []).forEach((url, i) => {
    if (url?.startsWith('http')) {
      imgs.push({ url, position: i + 2, is_primary: false });
    }
  });
  return imgs;
}

/** Decompose ordered ProductGalleryImage[] → DB-ready { thumbnail_url, gallery_urls }. */
export function decomposeImages(images: ProductGalleryImage[]): { thumbnail_url: string; gallery_urls: string[] } {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const primary = sorted.find(i => i.is_primary) ?? sorted[0];
  if (!primary) return { thumbnail_url: '', gallery_urls: [] };
  const rest = sorted.filter(i => i !== primary);
  return { thumbnail_url: primary.url, gallery_urls: rest.map(i => i.url) };
}

// ── Admin Audit Log (localStorage) ───────────────────────────────────────────

export interface AuditLogEntry {
  id:               string;
  action:           string;
  productsAffected: number;
  fields:           string[];
  timestamp:        string;
  details?:         string;
}

const _AUDIT_KEY = 'tajalli_admin_audit_log';

export function logAdminAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
  try {
    const existing = getAuditLog();
    const newEntry: AuditLogEntry = {
      ...entry,
      id:        Date.now().toString() + Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(_AUDIT_KEY, JSON.stringify([newEntry, ...existing].slice(0, 500)));
  } catch { /* localStorage may be unavailable */ }
}

export function getAuditLog(): AuditLogEntry[] {
  try { return JSON.parse(localStorage.getItem(_AUDIT_KEY) ?? '[]') as AuditLogEntry[]; }
  catch { return []; }
}

export function clearAuditLog(): void { localStorage.removeItem(_AUDIT_KEY); }

// ── Duplicate product detection & merge ──────────────────────────────────────

export type MergePreviewGroup = {
  normalizedKey: string;         // the deduped key (brand::normalizedModel)
  keep: { id: string; model: string };
  drop: { id: string; model: string }[];
};

export type MergeResult = {
  groups:   number;   // duplicate groups found
  deleted:  number;   // rows deleted (weaker duplicates)
  kept:     number;   // rows kept
  errors:   string[];
  preview?: MergePreviewGroup[];  // populated in dryRun mode
};

export type NearDupeGroup = {
  key:      string;     // normalized key
  products: Array<{ id: string; brand: string; model: string; simplified_name: string; thumbnail_url: string | null; price: number }>;
};

/**
 * Normalises a model string for duplicate detection.
 *
 * Rule: same brand + same model number + same series name = duplicate, regardless of colour.
 *
 * Strips (cosmetic / chassis noise — never part of the series identity):
 *   REF prefix · WB / LF chassis codes · FH LVS sub-line
 *   ALL colour words: Gem Black, Cloud White, Coral Red, Crimson Red,
 *   Meadow Green, NOIR, Metallic Gold/Grey/Silver, Titanium Grey,
 *   Ebony Black, Lavender Frost, Inox, standalone Black/White/Silver/
 *   Gold/Red/Grey at end-of-string when preceded by a series keyword.
 *
 * Keeps (series-level identifiers that distinguish genuinely different products):
 *   Avante · Avante+ · Chrome · e-Chrome · Acce · Acce Pro
 *   Graze · Graze+ · GD · INV · Pro · Inspire · Plus · Twin Cool
 *
 * NOTE: e-Chrome and Chrome are kept DISTINCT (different product lines).
 */
function normalizeModelForDedupe(model: string): string {
  return model
    .trim()
    // ── Chassis / sub-line noise ────────────────────────────────────────────
    .replace(/^REF\s*/i, '')                                   // leading REF
    .replace(/(\d)(WB|LF)\b/gi, '$1')                         // "9173WB" → "9173"
    .replace(/\b(WB|LF)\b/gi, '')                             // standalone WB / LF
    .replace(/\bFH\s+LVS\b/gi, '')                            // FH LVS sub-line
    .replace(/\bFH\b(?!\s*\d)/gi, '')                         // bare FH (not "FH 18000")
    // Slash-separated variant codes — keep only the first: "IFGA/IFRA/IFPA" → "IFGA"
    .replace(/\b([A-Z]{2,6}\d{0,3})(\/[A-Z]{2,6}\d{0,3})+\b/g, '$1')
    // ── Colour words — ALL stripped (they're never the series name) ─────────
    .replace(
      /\b(Gem\s+Black|Cloud\s+White|Coral\s+Red|Crimson\s+Red(\s*[\/,&]\s*Meadow\s+Green)?|Meadow\s+Green|Ebony\s+Black|Lavender\s+Frost|Metallic\s+Gold|Metallic\s+Gr[ae]y|Metallic\s+Silver|Titanium\s+Gr[ae]y|Inox|NOIR)\b/gi,
      '',
    )
    // Trailing standalone colour tokens that appear after a series word
    // e.g. "Avante Black" → "Avante", "Chrome Silver" → "Chrome"
    .replace(/\b(Black|White|Silver|Gold|Red|Green|Blue|Grey|Gray|Maroon|Pink)\s*$/i, '')
    // ── Normalise whitespace ────────────────────────────────────────────────
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Scores a product row so that the "best" representative is kept when merging.
 * Higher score = keep this one.  Thumbnail presence dominates; then retail price
 * (higher price = more likely the current/complete listing); then recency.
 */
function scoreRow(r: { thumbnail_url: string | null; retail_price: number | null; updated_at: string | null }): number {
  return (r.thumbnail_url ? 1000 : 0)
    + (r.retail_price ?? 0) / 1_000_000   // max ~200k PKR → ≤0.2
    + (new Date(r.updated_at ?? 0).getTime() / 1e15);
}

/**
 * Finds exact duplicates (same brand + normalised model string).
 * Keeps the highest-scored representative; permanently deletes the rest.
 *
 * @param dryRun  When true: find groups but do NOT delete. Populates result.preview.
 *
 * Paginates in batches of 1000 so the Supabase row-limit never truncates results.
 */
export async function mergeDuplicates(
  onProgress: (msg: string) => void,
  dryRun = false,
): Promise<MergeResult> {
  const result: MergeResult = { groups: 0, deleted: 0, kept: 0, errors: [] };

  // ── Paginated fetch (Supabase caps un-limited queries at 1 000 rows) ───────
  onProgress('Loading products…');
  const allData: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data: page, error } = await supabase
      .from('products')
      .select('id, brand, model, slug, thumbnail_url, retail_price, updated_at')
      .order('id')                        // stable cursor (updated_at can be null)
      .range(from, from + PAGE - 1);
    if (error) { result.errors.push(error.message); return result; }
    if (!page || page.length === 0) break;
    allData.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }

  onProgress(`Scanning ${allData.length} products for duplicates…`);

  // ── Group by brand + normalised model ────────────────────────────────────
  const groups = new Map<string, any[]>();
  for (const row of allData) {
    const brandKey = (row.brand || '').toLowerCase().trim();
    const modelKey = normalizeModelForDedupe(row.model || '');
    if (!brandKey || !modelKey) continue;
    const key = `${brandKey}::${modelKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const dupeGroups = [...groups.entries()]
    .filter(([, g]) => g.length > 1)
    .sort((a, b) => b[1].length - a[1].length);   // largest groups first

  result.groups = dupeGroups.length;

  if (dupeGroups.length === 0) { onProgress('No duplicates found.'); return result; }

  if (dryRun) {
    // Build preview without deleting
    result.preview = dupeGroups.map(([key, group]) => {
      const scored = group.map(r => ({ ...r, score: scoreRow(r) }));
      scored.sort((a, b) => b.score - a.score);
      return {
        normalizedKey: key,
        keep: { id: scored[0].id, model: scored[0].model },
        drop: scored.slice(1).map(r => ({ id: r.id, model: r.model })),
      };
    });
    onProgress('');
    return result;
  }

  onProgress(`Found ${dupeGroups.length} duplicate groups — merging…`);

  const allDeleteIds: string[] = [];
  for (const [, group] of dupeGroups) {
    const scored = group.map(r => ({ id: r.id, score: scoreRow(r) }));
    scored.sort((a, b) => b.score - a.score);
    allDeleteIds.push(...scored.slice(1).map(s => s.id));
    result.kept += 1;
  }

  const BATCH = 200;
  for (let i = 0; i < allDeleteIds.length; i += BATCH) {
    const batch = allDeleteIds.slice(i, i + BATCH);
    onProgress(`Deleting ${i + batch.length} / ${allDeleteIds.length}…`);
    const { error: delErr } = await supabase.from('products').delete().in('id', batch);
    if (delErr) result.errors.push(delErr.message);
    else result.deleted += batch.length;
  }

  clearCache();
  onProgress('');
  return result;
}

/**
 * Near-duplicate scanner — a different job from mergeDuplicates.
 *
 * mergeDuplicates handles: same brand + same series + different colour → auto-merge.
 *
 * findNearDuplicates handles: same brand + same model number + DIFFERENT series
 * (e.g. Dawlance 91999 Avante AND Dawlance 91999 Avante+) → surface for admin
 * manual review, because these are genuinely different products that happen to
 * share a base model number and an admin may want to keep or prune.
 *
 * Grouping key: brand + first 3+-digit numeric token in model name.
 * A group is returned only when it contains 2+ products with distinct
 * normalised model strings (i.e. different series survived merge).
 */
export async function findNearDuplicates(): Promise<NearDupeGroup[]> {
  // Paginate to bypass 1 000-row Supabase default
  const allData: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data: page, error } = await supabase
      .from('products')
      .select('id, brand, model, simplified_name, thumbnail_url, retail_price')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error || !page) break;
    allData.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }
  const data = allData;

  // Bucket by brand + first numeric token (3+ digits = skips e.g. AC BTU codes like "18")
  const buckets = new Map<string, typeof data>();
  for (const row of data) {
    const numMatch = (row.model ?? '').match(/\d{4,}|\d{3}/);  // prefer 4-digit, accept 3
    if (!numMatch) continue;
    const k = `${(row.brand ?? '').toLowerCase().trim()}::${numMatch[0]}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(row);
  }

  const groups: NearDupeGroup[] = [];
  for (const [key, rows] of buckets) {
    if (rows.length < 2) continue;
    // Only surface if 2+ DISTINCT normalised strings (different series)
    // — single-norm groups were already cleaned by mergeDuplicates
    const normSet = new Set(rows.map(r => normalizeModelForDedupe(r.model ?? '')));
    if (normSet.size < 2) continue;

    groups.push({
      key,
      products: rows.map(r => ({
        id: r.id,
        brand: r.brand,
        model: r.model,
        simplified_name: r.simplified_name ?? '',
        thumbnail_url: r.thumbnail_url,
        price: r.retail_price ?? 0,
      })),
    });
  }

  // Largest groups first (most variants = most likely to need review)
  return groups.sort((a, b) => b.products.length - a.products.length);
}

// ── Normalize DB category strings ────────────────────────────────────────────
/**
 * Finds products with non-canonical category strings (singular forms, legacy
 * names with ampersands, etc.) and updates them to the canonical plural form
 * that the rest of the site expects.  Returns a summary string.
 */
export async function normalizeCategoryNames(): Promise<string> {
  // Map: any raw DB category value (lowercased) → canonical display name
  const CANON: Record<string, string> = {
    // Singular → plural
    'refrigerator':                    'Refrigerators',
    'freezer':                         'Freezers',
    'air conditioner':                 'Air Conditioners',
    'washing machine':                 'Washing Machines',
    'television':                      'Televisions',
    'water dispenser':                 'Water Dispensers',
    'vacuum cleaner':                  'Vacuum Cleaners',
    'solar solution':                  'Solar Solutions',
    'kitchen appliance':               'Kitchen Appliances',
    'small appliance':                 'Small Appliances',
    // Legacy names with ampersand / variant spellings
    'televisions & leds':              'Televisions',
    'televisions and leds':            'Televisions',
    'led tv':                          'Televisions',
    'smart led':                       'Televisions',
    'smart tv':                        'Televisions',
    'qled':                            'Televisions',
    // Misc legacy
    'deep freezer':                    'Freezers',
    'deep freezers':                   'Freezers',
    'automatic washing machines':      'Washing Machines',
    'semi-automatic washing machines': 'Washing Machines',
    'fridge':                          'Refrigerators',
  };

  // Fetch all distinct category values currently in DB
  const { data, error } = await supabase
    .from('products')
    .select('id, category');
  if (error || !data) return `Error: ${error?.message ?? 'no data'}`;

  // Group products by canonical target
  const updates: Record<string, string[]> = {}; // canonical → [id,…]
  for (const row of data) {
    const raw = (row.category ?? '').toLowerCase().trim();
    const canonical = CANON[raw];
    if (canonical) {
      if (!updates[canonical]) updates[canonical] = [];
      updates[canonical].push(row.id);
    }
  }

  if (Object.keys(updates).length === 0) return 'All category names already canonical — nothing to change.';

  let total = 0;
  const lines: string[] = [];
  for (const [canonical, ids] of Object.entries(updates)) {
    // Update in batches of 200
    const BATCH = 200;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      await supabase.from('products').update({ category: canonical }).in('id', batch);
    }
    total += ids.length;
    lines.push(`${ids.length} → "${canonical}"`);
  }

  clearCache();
  return `Normalized ${total} products: ${lines.join(', ')}`;
}

// ── Off-Grid Solar Leads ──────────────────────────────────────────────────────

export interface SolarLead {
  id?: string;
  name: string;
  phone: string;
  city: string;
  monthly_bill: number;
  backup_hours: number;
  system_kw: number;
  battery_kwh: number;
  est_savings: number;
  status?: 'new' | 'contacted' | 'quoted' | 'closed';
  proposal_url?: string | null;
  created_at?: string;
}

export async function submitSolarLead(lead: Omit<SolarLead, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('solar_leads').insert([lead]);
  if (error) throw new Error(error.message);
}

export async function getSolarLeads(): Promise<SolarLead[]> {
  const { data, error } = await supabase
    .from('solar_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SolarLead[];
}

export async function updateSolarLeadStatus(id: string, status: SolarLead['status']): Promise<void> {
  const { error } = await supabase.from('solar_leads').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function saveSolarProposal(leadId: string, pdfBlob: Blob): Promise<string> {
  const fileName = `proposal_${leadId}_${Date.now()}.pdf`;
  const path = `proposals/${fileName}`;
  const { error } = await supabase.storage.from('product-images').upload(path, pdfBlob, {
    contentType: 'application/pdf', upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  const url = data.publicUrl;
  await supabase.from('solar_leads').update({ proposal_url: url, status: 'quoted' }).eq('id', leadId);
  return url;
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
