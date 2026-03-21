/**
 * /api/meta-catalog
 * WhatsApp Business / Meta Catalog CSV feed — auto-syncs from Supabase.
 *
 * Optimised for WhatsApp catalog display:
 *  - Titles ≤ 100 chars, front-loaded with key spec
 *  - Descriptions ≤ 500 chars, built from live specs data
 *  - product_type creates the category sections visible in WhatsApp catalog
 *  - google_product_category improves Meta ad targeting
 *
 * Feed URL:  https://reliance.tajallis.com.pk/api/meta-catalog
 * Docs:      https://www.facebook.com/business/help/120325381656392
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL      || 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SITE_URL          = process.env.VITE_SITE_URL          || 'https://reliance.tajallis.com.pk';
const WA_NUMBER         = process.env.VITE_WA_SALES          || '923702578788';

// ── Category → WhatsApp product_type section name ────────────────────────────
// product_type is what creates the visible "category tabs" inside the WA catalog.
const PRODUCT_TYPE = {
  // ── Air Conditioners (split by tonnage) ────────────────────────────────────
  '1 Ton Air Conditioners':     'Cooling & Climate > 1 Ton Air Conditioners',
  '1.5 Ton Air Conditioners':   'Cooling & Climate > 1.5 Ton Air Conditioners',
  '2 Ton Air Conditioners':     'Cooling & Climate > 2 Ton Air Conditioners',
  // Legacy broad names (kept for backward compat)
  'Air Conditioners':           'Cooling & Climate > Air Conditioners',
  'Commercial AC':              'Cooling & Climate > Commercial Air Conditioners',
  // ── Refrigerators (split by size) ─────────────────────────────────────────
  'Small Refrigerators':        'Kitchen Appliances > Compact Refrigerators',
  'Medium Refrigerators':       'Kitchen Appliances > Refrigerators',
  'Large Refrigerators':        'Kitchen Appliances > Large Refrigerators',
  'Refrigerators':              'Kitchen Appliances > Refrigerators',
  // ── Freezers ──────────────────────────────────────────────────────────────
  'Freezers':                   'Kitchen Appliances > Freezers',
  'Freezer':                    'Kitchen Appliances > Freezers',
  // ── Washing Machines (split by type) ──────────────────────────────────────
  'Automatic Washing Machines':      'Laundry > Automatic Washing Machines',
  'Semi-Automatic Washing Machines': 'Laundry > Semi-Automatic Washing Machines',
  'Washing Machines':                'Laundry > Washing Machines',
  'Water Dispensers':           'Kitchen Appliances > Water Dispensers',
  'Televisions':                'Electronics > Televisions',
  'Vacuum Cleaners':            'Cleaning > Vacuum Cleaners',
  'Coffee Maker':               'Kitchen Appliances > Coffee Makers',
  'Coffee Grinder':             'Kitchen Appliances > Coffee Grinders',
  'Coffee Grinder Dry Wet':     'Kitchen Appliances > Coffee Grinders',
  'Dough Maker':                'Kitchen Appliances > Dough Makers',
  'Roti Maker':                 'Kitchen Appliances > Roti Makers',
  'Sandwich Toaster':           'Kitchen Appliances > Sandwich Toasters & Grills',
  'Sandwich Toaster Grill':     'Kitchen Appliances > Sandwich Toasters & Grills',
  'Toaster 2 Slice':            'Kitchen Appliances > Toasters',
  'Toaster 4 Slice':            'Kitchen Appliances > Toasters',
  'Toaster 4 Slice Double':     'Kitchen Appliances > Toasters',
  'Toaster 4 Slice Steel':      'Kitchen Appliances > Toasters',
  'Hand Mixer':                 'Kitchen Appliances > Mixers & Beaters',
  'Egg Beater':                 'Kitchen Appliances > Mixers & Beaters',
  'Egg Beater Black':           'Kitchen Appliances > Mixers & Beaters',
  'Egg Beater Steel':           'Kitchen Appliances > Mixers & Beaters',
  'Kitchen Chef':               'Kitchen Appliances > Food Processors',
  'Kitchen Robot':              'Kitchen Appliances > Food Processors',
  'Food Factory 11in1':         'Kitchen Appliances > Food Processors',
  'Food Factory Jumbo':         'Kitchen Appliances > Food Processors',
  'Meat Mincer':                'Kitchen Appliances > Meat Mincers',
  'Kitchen Slicer Manual':      'Kitchen Appliances > Kitchen Tools',
  'Fries Cutter Manual':        'Kitchen Appliances > Kitchen Tools',
  'Pizza Pan':                  'Kitchen Appliances > Cookware',
  'Hot Plate':                  'Kitchen Appliances > Hot Plates',
  'Hot Plate Single':           'Kitchen Appliances > Hot Plates',
  'Hot Plate Double':           'Kitchen Appliances > Hot Plates',
  'Ceramic Cooker Double':      'Kitchen Appliances > Hot Plates',
  'Kitchen Scale':              'Kitchen Appliances > Kitchen Scales',
  'Digital Weight Scale':       'Personal Care > Weight Scales',
  'Egg Boiler':                 'Kitchen Appliances > Egg Cookers',
  'Water Boiler 16L':           'Kitchen Appliances > Water Boilers',
  'Water Boiler 20L':           'Kitchen Appliances > Water Boilers',
  'Hair Clipper':               'Personal Care > Hair Clippers',
  'Epilator':                   'Personal Care > Epilators',
  'Face Steamer':               'Personal Care > Face Steamers',
  'Foot Massager':              'Personal Care > Foot Massagers',
  'Baby Bottle Sterilizer':     'Baby Care > Bottle Sterilizers',
  'Baby Bottle Warmer':         'Baby Care > Bottle Warmers',
  'Dual Bottle Warmer':         'Baby Care > Bottle Warmers',
  'Insect Killer':              'Home & Garden > Insect Killers',
  'Humidifier Ultrasonic':      'Home & Garden > Humidifiers',
  'Humidifier Ultrasonic Deluxe': 'Home & Garden > Humidifiers',
  // ── Kitchen (split by type) ────────────────────────────────────────────────
  'Kitchen Food Processors':        'Kitchen Appliances > Food Processors & Mincers',
  'Kitchen Blenders & Juicers':     'Kitchen Appliances > Blenders & Juicers',
  'Kitchen Cooking Appliances':     'Kitchen Appliances > Ovens, Fryers & Cookers',
  'Kitchen Breakfast & Beverages':  'Kitchen Appliances > Kettles, Toasters & Coffee',
  'Kitchen Appliances':             'Kitchen Appliances > Small Appliances',
  // ── Small Appliances (split by type) ──────────────────────────────────────
  'Personal Care Appliances':       'Personal Care > Personal Care & Baby',
  'Home & Heating Appliances':      'Home & Garden > Irons, Heaters & Home',
  'Small Appliances':               'Small Appliances',
  // ── Solar ─────────────────────────────────────────────────────────────────
  'Solar Solutions':                'Home & Garden > Solar Solutions',
};

// ── Google Product Category (for Meta ad targeting) ───────────────────────────
const GOOGLE_CATEGORY = {
  '1 Ton Air Conditioners':     'Appliances > Climate Control > Air Conditioners',
  '1.5 Ton Air Conditioners':   'Appliances > Climate Control > Air Conditioners',
  '2 Ton Air Conditioners':     'Appliances > Climate Control > Air Conditioners',
  'Air Conditioners':           'Appliances > Climate Control > Air Conditioners',
  'Commercial AC':              'Appliances > Climate Control > Air Conditioners',
  'Small Refrigerators':        'Appliances > Kitchen Appliances > Refrigerators',
  'Medium Refrigerators':       'Appliances > Kitchen Appliances > Refrigerators',
  'Large Refrigerators':        'Appliances > Kitchen Appliances > Refrigerators',
  'Refrigerators':              'Appliances > Kitchen Appliances > Refrigerators',
  'Freezers':                   'Appliances > Kitchen Appliances > Freezers',
  'Freezer':                    'Appliances > Kitchen Appliances > Freezers',
  'Automatic Washing Machines':      'Appliances > Laundry Appliances > Washing Machines & Dryers',
  'Semi-Automatic Washing Machines': 'Appliances > Laundry Appliances > Washing Machines & Dryers',
  'Washing Machines':           'Appliances > Laundry Appliances > Washing Machines & Dryers',
  'Water Dispensers':   'Appliances > Kitchen Appliances > Water Dispensers',
  'Televisions':        'Electronics > Video > Televisions',
  'Vacuum Cleaners':    'Appliances > Vacuums',
  'Coffee Maker':       'Appliances > Kitchen Appliances > Coffee Makers & Espresso Machines',
  'Dough Maker':        'Appliances > Kitchen Appliances > Bread Machines',
  'Hand Mixer':         'Appliances > Kitchen Appliances > Mixers',
  'Egg Beater':         'Appliances > Kitchen Appliances > Mixers',
  'Egg Beater Black':   'Appliances > Kitchen Appliances > Mixers',
  'Egg Beater Steel':   'Appliances > Kitchen Appliances > Mixers',
  'Kitchen Chef':       'Appliances > Kitchen Appliances > Food Processors',
  'Kitchen Robot':      'Appliances > Kitchen Appliances > Food Processors',
  'Food Factory 11in1': 'Appliances > Kitchen Appliances > Food Processors',
  'Meat Mincer':        'Appliances > Kitchen Appliances > Meat Grinders',
  'Hot Plate':          'Appliances > Kitchen Appliances > Cooktops',
  'Hot Plate Single':   'Appliances > Kitchen Appliances > Cooktops',
  'Hot Plate Double':   'Appliances > Kitchen Appliances > Cooktops',
  'Hair Clipper':       'Health & Beauty > Personal Care > Hair Care > Hair Clippers & Trimmers',
  'Epilator':           'Health & Beauty > Personal Care > Hair Removal',
  'Digital Weight Scale': 'Health & Beauty > Health Care > Scales',
  'Baby Bottle Sterilizer':     'Baby & Toddler > Feeding > Bottle Sterilizers',
  'Baby Bottle Warmer':         'Baby & Toddler > Feeding > Bottle Warmers',
  'Dual Bottle Warmer':         'Baby & Toddler > Feeding > Bottle Warmers',
  'Kitchen Food Processors':    'Appliances > Kitchen Appliances > Food Processors',
  'Kitchen Blenders & Juicers': 'Appliances > Kitchen Appliances > Blenders & Juicers',
  'Kitchen Cooking Appliances': 'Appliances > Kitchen Appliances',
  'Kitchen Breakfast & Beverages': 'Appliances > Kitchen Appliances',
  'Personal Care Appliances':   'Health & Beauty > Personal Care',
  'Home & Heating Appliances':  'Appliances > Household Appliances',
  'Solar Solutions':            'Hardware > Electrical > Solar Energy',
};

// ── Spec keys to highlight in description, by category ───────────────────────
// First match wins per product.
const SPEC_HIGHLIGHTS = {
  // Refrigerators
  'Small Refrigerators':        ['Capacity', 'Defrost', 'Cooling System', 'Inverter'],
  'Medium Refrigerators':       ['Capacity', 'Defrost', 'Cooling System', 'Inverter'],
  'Large Refrigerators':        ['Capacity', 'Defrost', 'Cooling System', 'Inverter'],
  'Refrigerators':              ['Capacity', 'Defrost', 'Cooling System', 'Inverter', 'defrost_type'],
  'Freezers':                   ['Capacity', 'Defrost', 'Inverter'],
  'Freezer':                    ['Capacity', 'Defrost', 'Inverter'],
  // Washing machines
  'Automatic Washing Machines':      ['Capacity', 'Type', 'Inverter', 'Spin Speed'],
  'Semi-Automatic Washing Machines': ['Capacity', 'Type', 'Spin Speed'],
  'Washing Machines':                ['Capacity', 'Type', 'Inverter', 'Spin Speed'],
  // Air conditioners
  '1 Ton Air Conditioners':     ['Tonnage', 'Inverter', 'Energy Rating', 'BTU'],
  '1.5 Ton Air Conditioners':   ['Tonnage', 'Inverter', 'Energy Rating', 'BTU'],
  '2 Ton Air Conditioners':     ['Tonnage', 'Inverter', 'Energy Rating', 'BTU'],
  'Air Conditioners':           ['Tonnage', 'Capacity', 'Inverter', 'Energy Rating', 'BTU'],
  'Commercial AC':              ['Tonnage', 'Capacity', 'Inverter', 'BTU'],
  // Other
  'Televisions':                ['Screen Size', 'Resolution', 'Smart TV', 'Panel Type'],
  'Water Dispensers':           ['Type', 'Cooling', 'Heating'],
  'Kitchen Food Processors':    ['Power', 'Capacity', 'Type', 'Wattage'],
  'Kitchen Blenders & Juicers': ['Power', 'Capacity', 'Wattage'],
  'Kitchen Cooking Appliances': ['Power', 'Capacity', 'Type', 'Wattage'],
  'Kitchen Breakfast & Beverages': ['Power', 'Capacity', 'Wattage'],
  'default':                    ['Power', 'Capacity', 'Type', 'Wattage', 'Power Supply'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(str) {
  return (str || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function csvEscape(str) {
  if (str == null) return '';
  const s = String(str).replace(/\r?\n/g, ' ').trim();
  if (s.includes(',') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(...fields) {
  return fields.map(csvEscape).join(',');
}

/**
 * Build a WhatsApp-optimised title (max 100 chars).
 * Format: "{SimplifiedName} ({Model}) — {KeySpec}"
 * Model is always shown so buyers can identify the exact product.
 */
function buildTitle(p) {
  const simplified = (p.simplified_name || `${p.brand} ${p.model}`).trim();
  const model      = (p.model || '').trim();
  const specs      = p.specs || {};

  // Include model number if not already in the simplified name
  const base = (model && !simplified.toUpperCase().includes(model.toUpperCase()))
    ? `${simplified} (${model})`
    : simplified;

  // Append one key differentiating spec
  let suffix = '';
  if (p.category === 'Refrigerators' || p.category === 'Freezer') {
    const cap = specs['Capacity'] || specs['capacity'];
    const dt  = specs['Defrost'] || specs['defrost_type'];
    if (cap) suffix = cap;
    else if (dt) suffix = dt;
  } else if (p.category === 'Washing Machines') {
    const cap = specs['Capacity'] || specs['capacity'];
    if (cap) suffix = cap;
  } else if (p.category === 'Air Conditioners' || p.category === 'Commercial AC') {
    const cap = specs['Capacity'] || specs['BTU'] || specs['Tonnage'];
    if (cap) suffix = cap;
  } else if (p.category === 'Televisions') {
    const size = specs['Screen Size'];
    const res  = specs['Resolution'];
    if (size && !base.includes(size)) suffix = size;
    else if (res) suffix = res;
  }

  const full = suffix ? `${base} — ${suffix}` : base;
  return full.substring(0, 100);
}

/** Format a PKR amount compactly, e.g. 15000 → "Rs.15,000" */
function pkr(n) {
  if (!n) return null;
  return 'Rs.' + Number(n).toLocaleString('en-PK');
}

/**
 * Build a WhatsApp-optimised description (max 500 chars).
 * Leads with top specs, then installment plans, ends with CTA.
 */
function buildDescription(p) {
  const specs    = p.specs || {};
  const catKeys  = SPEC_HIGHLIGHTS[p.category] || SPEC_HIGHLIGHTS['default'];

  // Collect key spec lines (up to 4 to leave room for installments)
  const specLines = [];
  for (const key of catKeys) {
    if (specLines.length >= 4) break;
    const val = specs[key];
    if (val && String(val).trim()) {
      if (key === 'defrost_type') continue;
      specLines.push(`${key}: ${val}`);
    }
  }

  // Build installment summary line
  const instParts = [];
  if (p.monthly_3m && p.adv_3m)   instParts.push(`3m: ${pkr(p.adv_3m)} adv + ${pkr(p.monthly_3m)}/mo`);
  if (p.monthly_6m && p.adv_6m)   instParts.push(`6m: ${pkr(p.adv_6m)} adv + ${pkr(p.monthly_6m)}/mo`);
  if (p.monthly_12m && p.adv_12m) instParts.push(`12m: ${pkr(p.adv_12m)} adv + ${pkr(p.monthly_12m)}/mo`);
  const instLine = instParts.length > 0 ? 'Installments — ' + instParts.join(' | ') : '';

  const cta = 'WhatsApp +' + WA_NUMBER + ' to order.';

  const parts = [specLines.join(' | '), instLine, cta].filter(Boolean);
  return parts.join('\n').substring(0, 500);
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).end('Method Not Allowed'); return; }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, brand, model, simplified_name, category, stock_status, description, retail_price, cash_floor, thumbnail_url, gallery_urls, specs, tags, adv_2m, monthly_2m, adv_3m, monthly_3m, adv_6m, monthly_6m, adv_12m, monthly_12m')
    .gt('retail_price', 0)                       // exclude zero-price / unpublished products
    .neq('stock_status', 'Discontinued')
    .order('category',       { ascending: true })
    .order('brand',          { ascending: true })
    .order('simplified_name',{ ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const lines = [];

  // ── CSV header ──────────────────────────────────────────────────────────────
  // Meta required: id, title, description, availability, condition, price, link, image_link
  // WhatsApp recommended: additional_image_link, brand, product_type, google_product_category
  lines.push(csvRow(
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'additional_image_link',
    'brand',
    'product_type',
    'google_product_category',
    'custom_label_0',   // plain category name — used by Sets filter (no special chars)
    'retailer_id',
  ));

  for (const p of products) {
    // Skip products with no image — WhatsApp won't show them anyway
    if (!p.thumbnail_url) continue;

    const price = `${p.cash_floor || p.retail_price || 0} PKR`;  // cash_floor = actual selling price

    // Up to 9 extra images (Meta max = 10 total including primary)
    const extraImgs = Array.isArray(p.gallery_urls)
      ? p.gallery_urls.filter(Boolean).slice(0, 9).join(',')
      : '';

    lines.push(csvRow(
      p.id,
      buildTitle(p),
      buildDescription(p),
      p.stock_status === 'Out of Stock' ? 'out of stock' : p.stock_status === 'Coming Soon' ? 'preorder' : 'in stock',
      'new',
      price,
      `${SITE_URL}/products/${p.slug || p.id}`,
      p.thumbnail_url,
      extraImgs,
      p.brand || '',
      PRODUCT_TYPE[p.category]    || 'Small Appliances',
      GOOGLE_CATEGORY[p.category] || 'Appliances',
      p.category || 'Small Appliances',  // custom_label_0 — plain, no special chars
      p.id,   // retailer_id mirrors id for cross-channel matching
    ));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  // Cache 1 hour on CDN; serve stale up to 2 h while revalidating
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(lines.join('\n'));
}
