/**
 * WhatsApp / Meta Commerce Manager Catalog Feed
 *
 * Generates a catalog feed compatible with Meta Commerce Manager
 * for WhatsApp Shopping, Facebook Shop, and Instagram Shopping.
 *
 * Meta CSV required columns:
 *   id, title, description, availability, condition, price, link,
 *   image_link, brand, google_product_category
 *
 * Additional columns used:
 *   additional_image_link, sale_price, custom_label_0..4
 *
 * Rules enforced:
 *   - All URLs must use the production domain (never localhost)
 *   - Price formatted as "15000 PKR"
 *   - Availability: "in stock" | "out of stock"
 *   - Condition: always "new"
 *   - custom_label_0: WhatsApp size-band category label
 *   - custom_label_1: brand
 *   - custom_label_2: installment eligibility
 *   - custom_label_3: warranty tier
 *   - custom_label_4: featured flag
 */

import type { Product } from './api';
import { SITE_URL } from './config';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CatalogItem {
  id:                    string;
  title:                 string;
  description:           string;
  availability:          'in stock' | 'out of stock' | 'preorder';
  condition:             'new';
  price:                 string;       // e.g. "15000 PKR"
  sale_price?:           string;
  link:                  string;       // production URL
  image_link:            string;       // primary image URL
  additional_image_link: string;       // comma-separated extra images
  brand:                 string;
  google_product_category: string;
  // WhatsApp custom grouping labels
  custom_label_0:        string;       // size-band category (e.g. "1.5 Ton Inverter Air Conditioner")
  custom_label_1:        string;       // brand name
  custom_label_2:        string;       // installment tier ("12 months" | "6 months" | "Cash only")
  custom_label_3:        string;       // warranty tier ("10 years" | "5 years" | "2 years" | "1 year")
  custom_label_4:        string;       // "featured" | ""
}

export interface CatalogValidationResult {
  total:        number;
  valid:        number;
  warnings:     number;
  errors:       number;
  issues:       { id: string; title: string; problems: string[] }[];
  localhostUrls: number;
}

// ── Google Product Category mapping ──────────────────────────────────────────
// Uses Google's product taxonomy numeric IDs for common appliance types.
// https://support.google.com/merchants/answer/6324436

const GOOGLE_CATEGORY: Record<string, string> = {
  'Air Conditioners':    'Electronics > Climate Control > Air Conditioners',
  'Refrigerators':       'Appliances > Kitchen Appliances > Refrigerators',
  'Freezers':            'Appliances > Kitchen Appliances > Freezers',
  'Deep Freezer':        'Appliances > Kitchen Appliances > Freezers',
  'Washing Machines':    'Appliances > Laundry Appliances > Washing Machines',
  'Televisions':         'Electronics > Video > Televisions',
  'Solar Solutions':     'Hardware > Electrical > Solar Energy Panels',
  'Kitchen Appliances':  'Appliances > Kitchen Appliances > Small Kitchen Appliances',
  'Air Fryers':          'Appliances > Kitchen Appliances > Small Kitchen Appliances > Air Fryers',
  'Water Dispensers':    'Appliances > Water Appliances > Water Dispensers',
  'Vacuum Cleaners':     'Appliances > Floor Care > Vacuum Cleaners',
  'Small Appliances':    'Appliances > Kitchen Appliances > Small Kitchen Appliances',
  'Gas Appliances':      'Appliances > Kitchen Appliances > Stoves & Cooktops',
};

function getGoogleCategory(category: string): string {
  const exact = GOOGLE_CATEGORY[category];
  if (exact) return exact;
  const lower = category.toLowerCase();
  if (lower.includes('air condition')) return GOOGLE_CATEGORY['Air Conditioners'];
  if (lower.includes('refrigerat'))   return GOOGLE_CATEGORY['Refrigerators'];
  if (lower.includes('freezer'))      return GOOGLE_CATEGORY['Freezers'];
  if (lower.includes('washing'))      return GOOGLE_CATEGORY['Washing Machines'];
  if (lower.includes('television') || lower.includes('led') || lower.includes('tv'))
                                      return GOOGLE_CATEGORY['Televisions'];
  if (lower.includes('solar'))        return GOOGLE_CATEGORY['Solar Solutions'];
  if (lower.includes('vacuum'))       return GOOGLE_CATEGORY['Vacuum Cleaners'];
  if (lower.includes('water dispen')) return GOOGLE_CATEGORY['Water Dispensers'];
  if (lower.includes('air fryer'))    return GOOGLE_CATEGORY['Air Fryers'];
  return GOOGLE_CATEGORY['Small Appliances'];
}

// ── WhatsApp size-band category label ─────────────────────────────────────────
// This is what shoppers see in the WhatsApp catalog grouping.
// Each unique label becomes its own product set / catalog section.

export function getWACategory(p: Product): string {
  const name  = (p.simplified_name || '').trim();
  const cat   = (p.category || '').toLowerCase();
  const model = (p.model || '').toUpperCase();

  // ── Air Conditioners — group by tonnage ──────────────────────────────────
  if (cat.includes('air condition')) {
    const tonM = name.match(/(\d+\.?\d*)\s*Ton/i);
    const ton  = tonM ? tonM[1] : null;
    if (ton) return `${ton} Ton Air Conditioner`;
    return 'Air Conditioner';
  }

  // ── Refrigerators — group by cubic feet ──────────────────────────────────
  if (cat.includes('refrigerat')) {
    const cfM = name.match(/(\d+)\s*(?:Cubic Feet|Cu\.Ft)/i);
    const cf  = cfM ? cfM[1] : null;
    if (cf) return `${cf} Cubic Feet Refrigerator`;
    return 'Refrigerator';
  }

  // ── Freezers — group by cubic feet ───────────────────────────────────────
  if (cat.includes('freezer')) {
    const cfM = name.match(/(\d+)\s*(?:Cubic Feet|Cu\.Ft)/i);
    const cf  = cfM ? cfM[1] : null;
    const isVF = /vertical/i.test(name) || /\bVF[-\s]/i.test(model);
    const typ  = isVF ? 'Vertical Freezer' : 'Deep Freezer';
    if (cf) return `${cf} Cubic Feet ${typ}`;
    return typ;
  }

  // ── Washing Machines — group by capacity + type ───────────────────────────
  if (cat.includes('washing')) {
    const kgM  = name.match(/(\d+\.?\d*)\s*kg/i);
    const kg   = kgM ? kgM[1] : null;
    const isSemi = /semi/i.test(name);
    const isFront = /front.?load/i.test(name);
    const typ  = isFront ? 'Front-Load' : isSemi ? 'Semi-Automatic' : 'Top-Load';
    if (kg) return `${kg}kg ${typ} Washing Machine`;
    return `${typ} Washing Machine`;
  }

  // ── Televisions — group by screen size ───────────────────────────────────
  if (cat.includes('television') || cat.includes('led') || cat.includes('tv')) {
    const szM = name.match(/(\d{2,3})["']/);
    const sz  = szM ? szM[1] : null;
    const is4K = /4K|Ultra HD/i.test(name);
    const res  = is4K ? '4K' : /FHD/i.test(name) ? 'FHD' : 'HD';
    if (sz) return `${sz} Inch ${res} Smart TV`;
    return 'Smart LED TV';
  }

  // ── Solar — group by kW ───────────────────────────────────────────────────
  if (cat.includes('solar')) {
    const kwM = name.match(/(\d+\.?\d*)\s*kW/i);
    const kw  = kwM ? kwM[1] : null;
    const isPanel = /panel/i.test(name);
    const isBatt  = /battery/i.test(name);
    const typ     = isPanel ? 'Solar Panel' : isBatt ? 'Solar Battery' : 'Solar Inverter';
    if (kw) return `${kw}kW ${typ}`;
    return typ;
  }

  // ── Air Fryers ────────────────────────────────────────────────────────────
  if (cat.includes('air fryer') || /air fryer/i.test(name)) {
    const litM = name.match(/(\d+\.?\d*)\s*(?:L|Litre|Liter)/i);
    if (litM) return `${litM[1]}L Air Fryer`;
    return 'Air Fryer';
  }

  // ── Kitchen Appliances — use product type from name ───────────────────────
  if (cat.includes('kitchen') || cat.includes('small appli')) {
    // Extract the product type from the simplified name
    const typeMatch = name.match(/(?:Hand Blender|Blender|Juicer|Food Processor|Chopper|Rice Cooker|Microwave|Oven|Kettle|Toaster|Air Fryer|Sandwich Maker|Induction|Humidifier|Iron|Steamer|Hair Dryer|Hair Straightener|Vacuum|Water Dispenser|Fan|Heater|Air Cooler)/i);
    if (typeMatch) return typeMatch[0];
    return 'Kitchen Appliances';
  }

  // ── Vacuum Cleaners ───────────────────────────────────────────────────────
  if (cat.includes('vacuum')) return 'Vacuum Cleaner';

  // ── Water Dispensers ──────────────────────────────────────────────────────
  if (cat.includes('water dispen')) {
    const isCompr = /compressor|cool/i.test(p.specs?.Type || '');
    return isCompr ? 'Compressor Water Dispenser' : 'Water Dispenser';
  }

  // ── Fallback: use category name directly ──────────────────────────────────
  return p.category || 'Home Appliances';
}

// ── Warranty tier label ───────────────────────────────────────────────────────
function warrantyTier(warranty: string): string {
  if (!warranty) return '1 year';
  const lower = warranty.toLowerCase();
  if (lower.includes('12') || lower.includes('twelve')) return '12 years';
  if (lower.includes('10') || lower.includes('ten'))    return '10 years';
  if (lower.includes('5')  || lower.includes('five'))   return '5 years';
  if (lower.includes('3')  || lower.includes('three'))  return '3 years';
  if (lower.includes('2')  || lower.includes('two'))    return '2 years';
  return '1 year';
}

// ── Installment tier label ────────────────────────────────────────────────────
function installmentTier(p: Product): string {
  if (p.installments?.['12m']) return '12 months';
  if (p.installments?.['6m'])  return '6 months';
  if (p.installments?.['3m'])  return '3 months';
  if (p.installments?.['2m'])  return '2 months';
  return 'Cash only';
}

// ── Clean production URL — never localhost ────────────────────────────────────
function productionUrl(path: string): string {
  const base = (SITE_URL || 'https://tajallis.com.pk').replace(/\/$/, '');
  // Guard: reject localhost or empty base
  if (base.includes('localhost') || base.includes('127.0.0.1')) {
    return `https://tajallis.com.pk${path}`;
  }
  return `${base}${path}`;
}

function safeImageUrl(url: string): string {
  if (!url) return '';
  // If the URL already uses a production host, leave it alone
  if (url.startsWith('https://') && !url.includes('localhost')) return url;
  // Strip localhost variants
  if (url.includes('localhost') || url.includes('127.0.0.1')) return '';
  return url;
}

// ── Build a single catalog item ───────────────────────────────────────────────
export function buildCatalogItem(p: Product): CatalogItem {
  const title       = (p.simplified_name || `${p.brand} ${p.model}`).trim();
  const description = (p.description || title).trim().slice(0, 9999);
  const imageUrl    = safeImageUrl(p.thumbnail || '');
  const extraImages = (p.gallery || [])
    .map(safeImageUrl)
    .filter(Boolean)
    .slice(0, 9)   // Meta allows up to 10 images total (1 primary + 9 extra)
    .join(',');

  const cashPrice   = p.price?.cash_floor || 0;
  const retailPrice = p.price?.retail || 0;

  return {
    id:                       p.id,
    title,
    description,
    availability:             p.stock_status === 'In Stock' ? 'in stock'
                            : p.stock_status === 'Coming Soon' ? 'preorder'
                            : 'out of stock',
    condition:                'new',
    price:                    `${cashPrice} PKR`,
    ...(retailPrice > cashPrice && { sale_price: `${cashPrice} PKR` }),
    link:                     productionUrl(`/products/${p.slug}`),
    image_link:               imageUrl,
    additional_image_link:    extraImages,
    brand:                    p.brand,
    google_product_category:  getGoogleCategory(p.category),
    custom_label_0:           p.category || '',   // plain DB category — matches meta-catalog.js and meta-sets-sync.js filters
    custom_label_1:           p.brand,
    custom_label_2:           installmentTier(p),
    custom_label_3:           warrantyTier(p.warranty),
    custom_label_4:           p.featured ? 'featured' : '',
  };
}

// ── Build full catalog feed ───────────────────────────────────────────────────
export function buildCatalogFeed(products: Product[]): CatalogItem[] {
  return products
    .filter(p => p.stock_status !== 'Discontinued')
    .map(buildCatalogItem);
}

// ── CSV export ────────────────────────────────────────────────────────────────
// Produces a Meta Commerce Manager compatible CSV string.

const CSV_HEADERS: (keyof CatalogItem)[] = [
  'id', 'title', 'description', 'availability', 'condition',
  'price', 'sale_price', 'link', 'image_link', 'additional_image_link',
  'brand', 'google_product_category',
  'custom_label_0', 'custom_label_1', 'custom_label_2', 'custom_label_3', 'custom_label_4',
];

function csvCell(val: string | undefined): string {
  if (!val) return '';
  // Wrap in quotes if cell contains comma, newline, or quote
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

export function exportCatalogCSV(items: CatalogItem[]): string {
  const header = CSV_HEADERS.join(',');
  const rows   = items.map(item =>
    CSV_HEADERS.map(h => csvCell(item[h] as string | undefined)).join(',')
  );
  return [header, ...rows].join('\r\n');
}

// ── JSON export ───────────────────────────────────────────────────────────────
export function exportCatalogJSON(items: CatalogItem[]): string {
  return JSON.stringify({ data: items }, null, 2);
}

// ── Validation ────────────────────────────────────────────────────────────────
export function validateCatalogFeed(items: CatalogItem[]): CatalogValidationResult {
  let errors = 0, warnings = 0, localhostUrls = 0;
  const issues: CatalogValidationResult['issues'] = [];

  for (const item of items) {
    const problems: string[] = [];

    if (!item.title || item.title.length < 4)
      problems.push('Missing or too-short title');
    if (!item.description || item.description.length < 20)
      problems.push('Missing or too-short description');
    if (!item.image_link)
      problems.push('Missing primary image');
    if (item.image_link?.includes('localhost') || item.link?.includes('localhost')) {
      problems.push('Localhost URL detected — use production domain');
      localhostUrls++;
    }
    if (!item.price || item.price === '0 PKR')
      problems.push('Missing or zero price');
    if (!item.brand)
      problems.push('Missing brand');
    if (!item.custom_label_0)
      problems.push('Missing WhatsApp category label');

    const isError = problems.some(p =>
      p.includes('Localhost') || p.includes('image') || p.includes('price')
    );

    if (problems.length > 0) {
      if (isError) errors++; else warnings++;
      issues.push({ id: item.id, title: item.title, problems });
    }
  }

  return {
    total:        items.length,
    valid:        items.length - issues.length,
    warnings,
    errors,
    issues,
    localhostUrls,
  };
}

// ── Download helpers (browser) ────────────────────────────────────────────────
export function downloadCatalogCSV(items: CatalogItem[], filename = 'catalog.csv'): void {
  const csv  = exportCatalogCSV(items);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCatalogJSON(items: CatalogItem[], filename = 'catalog.json'): void {
  const json = exportCatalogJSON(items);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── WhatsApp product set summary (for feed preview in admin) ─────────────────
export interface WAProductSet {
  label:    string;   // custom_label_0 value = WhatsApp category label
  count:    number;
  minPrice: number;
  maxPrice: number;
}

export function buildWAProductSets(items: CatalogItem[]): WAProductSet[] {
  const map = new Map<string, { count: number; prices: number[] }>();
  for (const item of items) {
    const label = item.custom_label_0 || 'Other';
    const price = parseInt(item.price) || 0;
    if (!map.has(label)) map.set(label, { count: 0, prices: [] });
    const entry = map.get(label)!;
    entry.count++;
    entry.prices.push(price);
  }
  return [...map.entries()]
    .map(([label, { count, prices }]) => ({
      label,
      count,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    }))
    .sort((a, b) => b.count - a.count);
}
