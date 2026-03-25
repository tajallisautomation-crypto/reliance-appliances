/**
 * fix_product_names.mjs
 *
 * Fixes all product naming issues identified from the products page:
 *  1. Kitchen Hoods wrongly categorised as "Gas Hob"
 *  2. Built-in Ovens (TRADING BRANDS) wrongly labelled "Gas Hob"
 *  3. Chest freezers with raw model codes as simplified_name
 *  4. Convertible and vertical freezers with raw model codes
 *  5. Verbose "Home & Heating Appliances" / "Personal Care Appliances" prefix
 *  6. Carton counts "(06 IN ONE CARTON/S)" embedded in names
 *  7. Trailing " Dawlance" or " DAWLANCE" in simplified_name
 *  8. Individual misc. corrections
 *
 * Run:  node fix_product_names.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN           = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// Explicit model → simplified_name fixes
// Each entry: { model, brand, simplified_name }
// ─────────────────────────────────────────────────────────────────────────────
const EXPLICIT_FIXES = [

  // ── Kitchen Hoods (incorrectly labelled "Gas Hob") ───────────────────────
  { brand: 'Dawlance', model: 'HOOD DCB 7530 B',             simplified_name: 'Dawlance Kitchen Range Hood' },
  { brand: 'Dawlance', model: 'HOODS DCB 9630 B A SERIES',   simplified_name: 'Dawlance Kitchen Range Hood (90cm, Black)' },
  { brand: 'Dawlance', model: 'HOODS DCA 9630 BG A SERIES',  simplified_name: 'Dawlance Kitchen Range Hood (90cm, Beige/Gold)' },
  { brand: 'Dawlance', model: 'HOODS DCB 7310 S A SERIES',   simplified_name: 'Dawlance Kitchen Range Hood (73cm, Silver)' },
  { brand: 'Dawlance', model: 'HOODS DCT 9630 S A SERIES',   simplified_name: 'Dawlance Kitchen Range Hood (90cm, Silver)' },
  { brand: 'Dawlance', model: 'HOOD DCT 9030 S',             simplified_name: 'Dawlance Kitchen Range Hood (90cm)' },

  // ── Built-in Ovens TRADING BRANDS (incorrectly labelled "Gas Hob") ───────
  { brand: 'Dawlance', model: 'DBE 208110 B TRADING BRANDS', simplified_name: 'Dawlance Built-in Electric Oven' },
  { brand: 'Dawlance', model: 'DBM 208120 B TRADING BRANDS', simplified_name: 'Dawlance Built-in Microwave Oven' },

  // ── Chest Freezers ────────────────────────────────────────────────────────
  { brand: 'Dawlance', model: 'DF-300P STUCCO PCM (ARC-P1-WHITE)',  simplified_name: 'Dawlance DF-300P Chest Freezer (Stucco White)' },
  { brand: 'Dawlance', model: 'DF-400 SD EDS (ARC-P1-WHITE)',        simplified_name: 'Dawlance DF-400 Chest Freezer (White)' },
  { brand: 'Dawlance', model: 'DF-400P STUCCO PCM (ARC-P1-WHITE)',   simplified_name: 'Dawlance DF-400P Chest Freezer (Stucco White)' },
  { brand: 'Dawlance', model: 'DF-500 DD STUCCO PCM (ARC-P1-WHITE)', simplified_name: 'Dawlance DF-500 DD Chest Freezer (Stucco White)' },
  { brand: 'Dawlance', model: 'DF-400 SD Inverter Grey',             simplified_name: 'Dawlance DF-400 SD Inverter Chest Freezer (Grey)' },
  { brand: 'Dawlance', model: 'DF-300 SD Inverter Grey',             simplified_name: 'Dawlance DF-300 SD Inverter Chest Freezer (Grey)' },
  { brand: 'Dawlance', model: 'DF-500 DD Inverter White',            simplified_name: 'Dawlance DF-500 DD Inverter Chest Freezer (White)' },
  { brand: 'Dawlance', model: 'DF-200 SD Inverter White',            simplified_name: 'Dawlance DF-200 SD Inverter Chest Freezer (White)' },
  { brand: 'Dawlance', model: 'DF 200 ES GD (WICKER CHAM)',          simplified_name: 'Dawlance DF-200 Glass Door Chest Freezer' },
  { brand: 'Dawlance', model: 'DF-200P STUCCO PCM (ARC-P1-WHITE)',   simplified_name: 'Dawlance DF-200P Chest Freezer (Stucco White)' },
  { brand: 'Dawlance', model: 'DF-500 Commercial',                   simplified_name: 'Dawlance DF-500 Commercial Chest Freezer' },
  { brand: 'Dawlance', model: 'DF-200 D Solar Line ARC - White',     simplified_name: 'Dawlance DF-200 Solar Line Chest Freezer' },
  { brand: 'Dawlance', model: 'DF-400P INVERTER EXISTING',           simplified_name: 'Dawlance DF-400P Inverter Chest Freezer' },
  { brand: 'Dawlance', model: 'DF-300P INVERTER EXISTING',           simplified_name: 'Dawlance DF-300P Inverter Chest Freezer' },

  // ── Convertible Refrigerator-Freezers ────────────────────────────────────
  { brand: 'Dawlance', model: 'CONVERTIBLE CF-91997 LVS',                  simplified_name: 'Dawlance CF-91997 Convertible Refrigerator-Freezer' },
  { brand: 'Dawlance', model: 'CONVERTIBLE CF-91998 LVS',                  simplified_name: 'Dawlance CF-91998 Convertible Refrigerator-Freezer' },
  { brand: 'Dawlance', model: 'SIGN. NEW OUTLOOK CF-91997 LVS',            simplified_name: 'Dawlance CF-91997 Signature New Outlook Convertible' },
  { brand: 'Dawlance', model: 'SIGN. NEW OUTLOOK CF-91998 LVS',            simplified_name: 'Dawlance CF-91998 Signature New Outlook Convertible' },
  { brand: 'Dawlance', model: 'SIG NEW OUTLOOK PCM FOR CF-91997 INVERTER', simplified_name: 'Dawlance CF-91997 Signature Inverter Convertible' },
  { brand: 'Dawlance', model: 'SIG NEW OUTLOOK PCM FOR CF-91998 INVERTER', simplified_name: 'Dawlance CF-91998 Signature Inverter Convertible' },
  { brand: 'Dawlance', model: '91998-H SIGNA. INVERTER GD (WICKER CHAM)',  simplified_name: 'Dawlance CF-91998 Signature Glass Door Inverter' },

  // ── Vertical Freezers ────────────────────────────────────────────────────
  { brand: 'Dawlance', model: 'DW VF 1045 CVT', simplified_name: 'Dawlance VF-1045 CVT Vertical Freezer' },
  { brand: 'Dawlance', model: 'VF -1045 CVT',   simplified_name: 'Dawlance VF-1045 CVT Vertical Freezer' },
  { brand: 'Dawlance', model: 'VF 1035WB GD',   simplified_name: 'Dawlance VF-1035 Glass Door Vertical Freezer' },

  // ── Hair Appliances ───────────────────────────────────────────────────────
  { brand: 'Dawlance', model: 'HAIR STRAIGHTENER (DWHS 7031) (06 IN ONE CARTON)', simplified_name: 'Dawlance Hair Straightener DWHS-7031' },
  { brand: 'Dawlance', model: 'HAIR STRAIGHTENER (DWHS 7034)',                    simplified_name: 'Dawlance Hair Straightener DWHS-7034' },
  { brand: 'Dawlance', model: 'HAIR DRYER (DWHD 7081)',                          simplified_name: 'Dawlance Hair Dryer DWHD-7081' },
  { brand: 'Dawlance', model: 'DWHB - 475 W',                                   simplified_name: 'Dawlance Electric Heating Blanket 475W' },

  // ── Irons ────────────────────────────────────────────────────────────────
  { brand: 'Dawlance', model: 'DAWLANCE STEAM IRON DWSI-2217 T PURPLEm', simplified_name: 'Dawlance Steam Iron DWSI-2217 (Purple)' },
  { brand: 'Dawlance', model: 'DAWLANCE STEAM IRON DWSI-2217 C',         simplified_name: 'Dawlance Steam Iron DWSI-2217' },
  { brand: 'Dawlance', model: 'DRY IRON DWDI 1020 (WHITE)',               simplified_name: 'Dawlance Dry Iron DWDI-1020 (White)' },
  { brand: 'Dawlance', model: 'DRY IRON DWDI 1020 (Black)',               simplified_name: 'Dawlance Dry Iron DWDI-1020 (Black)' },

  // ── Ovens / Air Fryers ───────────────────────────────────────────────────
  { brand: 'Dawlance', model: 'Air Fryer DWAF 6322 D',       simplified_name: 'Dawlance Air Fryer DWAF-6322 (4L)' },
  { brand: 'Dawlance', model: 'DWAF 3374 B',                 simplified_name: 'Dawlance Air Fryer DWAF-3374' },
  { brand: 'Dawlance', model: 'MINI OVEN DWMO 2113 C',       simplified_name: 'Dawlance Mini Oven DWMO-2113' },
  { brand: 'Dawlance', model: 'DWMO 4520 CR',                simplified_name: 'Dawlance Microwave Oven DWMO-4520' },
  { brand: 'Dawlance', model: 'DWMO 5222 CR',                simplified_name: 'Dawlance Microwave Oven DWMO-5222' },
  { brand: 'Dawlance', model: 'DWMO-4215 CR',                simplified_name: 'Dawlance Microwave Oven DWMO-4215' },
  { brand: 'Dawlance', model: 'DWOT 2515CR (Oven Toaster)',  simplified_name: 'Dawlance Oven Toaster DWOT-2515' },
  { brand: 'Dawlance', model: 'DWTF-620 I',                  simplified_name: 'Dawlance Toaster Fan Oven DWTF-620' },
  { brand: 'Dawlance', model: 'DWTB-590 B',                  simplified_name: 'Dawlance Toaster Baking Oven DWTB-590' },
  { brand: 'Dawlance', model: 'DWTB-520 B',                  simplified_name: 'Dawlance Toaster Baking Oven DWTB-520' },
  { brand: 'Dawlance', model: 'DWTF-510 W Local',            simplified_name: 'Dawlance Toaster Fan Oven DWTF-510' },

  // ── Food Processors / Kitchen Tools ──────────────────────────────────────
  { brand: 'Dawlance', model: 'FOOD PROCESSOR DWFP-8270 B',         simplified_name: 'Dawlance Food Processor DWFP-8270' },
  { brand: 'Dawlance', model: 'FOOD PROCESSOR DWFP-5240 W',         simplified_name: 'Dawlance Food Processor DWFP-5240' },
  { brand: 'Dawlance', model: 'ELECTRIC KETTLE DWEK-7210',          simplified_name: 'Dawlance Electric Kettle DWEK-7210' },
  { brand: 'Dawlance', model: 'ELECTRIC KETTLE DWEK - 7100 local',  simplified_name: 'Dawlance Electric Kettle DWEK-7100' },
  { brand: 'Dawlance', model: 'ELECTRIC KETTLE DWEK-7200 local',    simplified_name: 'Dawlance Electric Kettle DWEK-7200' },
  { brand: 'Dawlance', model: 'MEAT MINCER DWMM-6001 W',            simplified_name: 'Dawlance Meat Mincer DWMM-6001' },
  { brand: 'Dawlance', model: 'DWSM 2971 Sandwich Maker Black',     simplified_name: 'Dawlance Sandwich Maker DWSM-2971 (Black)' },
  { brand: 'Dawlance', model: 'MULTI COOKER DWMC 3015',             simplified_name: 'Dawlance Multi Cooker DWMC-3015' },
  { brand: 'Dawlance', model: 'DWMC 9030-ZEUS (06 IN ONE CARTONS)', simplified_name: 'Dawlance Measuring Cup Set DWMC-9030' },
  { brand: 'Dawlance', model: 'DWMC 8030- ZEUS (06 IN ONE CARTONS)', simplified_name: 'Dawlance Measuring Cup Set DWMC-8030' },
  { brand: 'Dawlance', model: 'DWMGK 9030 - ZEUS (06 IN ONE CARTONS)', simplified_name: 'Dawlance Kitchen Tool Set DWMGK-9030' },
  { brand: 'Dawlance', model: 'DWMS 6240',                          simplified_name: 'Dawlance Stand Mixer DWMS-6240' },

  // ── Room Heaters ─────────────────────────────────────────────────────────
  { brand: 'Dawlance', model: 'DWHJ 4002 B', simplified_name: 'Dawlance Room Heater DWHJ-4002 (Black)' },
  { brand: 'Dawlance', model: 'DWHJ 8002 I', simplified_name: 'Dawlance Infrared Room Heater DWHJ-8002' },

  // ── Vacuum Cleaners ───────────────────────────────────────────────────────
  { brand: 'Dawlance', model: 'DRUM VACUUM CLEANER DWVC 7500', simplified_name: 'Dawlance Drum Vacuum Cleaner DWVC-7500' },
  { brand: 'Dawlance', model: 'VACUUM DWVC-6724 ENJ (BLUE)',   simplified_name: 'Dawlance Vacuum Cleaner DWVC-6724 (Blue)' },
  { brand: 'Dawlance', model: 'VACUUM DWVC-770 SMT (RED)',     simplified_name: 'Dawlance Vacuum Cleaner DWVC-770 (Red)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pattern-based fixes applied AFTER explicit ones
// These run on ALL Dawlance products and clean up common issues
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies pattern-based cleanup to a simplified_name string.
 * Returns null if no change is needed.
 */
function cleanSimplifiedName(name) {
  if (!name) return null;
  let n = name;

  // 1. Strip "Dawlance Home & Heating Appliances " prefix
  n = n.replace(/^Dawlance\s+Home\s*&\s*Heating\s+Appliances\s+/i, 'Dawlance ');

  // 2. Strip "Dawlance Personal Care Appliances " prefix
  n = n.replace(/^Dawlance\s+Personal\s+Care\s+Appliances\s+/i, 'Dawlance ');

  // 3. Strip carton count suffix like " (06 IN ONE CARTON)" or "(06 IN ONE CARTONS)"
  n = n.replace(/\s*\(\d+\s+IN\s+ONE\s+CARTONS?\)/gi, '');

  // 4. Strip trailing " Dawlance" or " DAWLANCE" (brand duplication)
  n = n.replace(/\s+Dawlance\s*$/i, '');

  // 5. Strip leading "DAWLANCE " when it appears after "Dawlance " (double brand)
  n = n.replace(/^(Dawlance\s+)DAWLANCE\s+/i, '$1');

  // 6. Strip trailing lowercase 'm' typo (e.g. "...PURPLEm")
  n = n.replace(/([A-Z])m$/, '$1');

  // 7. Trim excess whitespace
  n = n.replace(/\s{2,}/g, ' ').trim();

  return n !== name ? n : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be saved\n' : '🔧 LIVE RUN — changes will be saved\n');

  // Sign in
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }

  // Fetch all products
  let allProducts = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, brand, model, simplified_name')
      .range(from, from + PAGE - 1);
    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`Loaded ${allProducts.length} products\n`);

  // Build lookup: "brand||model" → product
  const byKey = new Map();
  for (const p of allProducts) byKey.set(`${p.brand}||${p.model}`, p);

  const updates = new Map(); // id → { simplified_name }

  // ── Apply explicit fixes ──────────────────────────────────────────────────
  let explicitHits = 0;
  for (const fix of EXPLICIT_FIXES) {
    const key = `${fix.brand}||${fix.model}`;
    const p = byKey.get(key);
    if (!p) {
      console.warn(`  ⚠  Not found: ${key}`);
      continue;
    }
    if (p.simplified_name === fix.simplified_name) continue; // already correct
    updates.set(p.id, { simplified_name: fix.simplified_name });
    console.log(`  ✏  [EXPLICIT] "${p.model}"\n       "${p.simplified_name}" → "${fix.simplified_name}"`);
    explicitHits++;
  }

  // ── Apply pattern-based fixes ─────────────────────────────────────────────
  let patternHits = 0;
  for (const p of allProducts) {
    if (updates.has(p.id)) continue; // already handled by explicit fix
    const cleaned = cleanSimplifiedName(p.simplified_name);
    if (!cleaned) continue;
    updates.set(p.id, { simplified_name: cleaned });
    console.log(`  ✏  [PATTERN] "${p.model}"\n       "${p.simplified_name}" → "${cleaned}"`);
    patternHits++;
  }

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`Total changes: ${updates.size} (${explicitHits} explicit + ${patternHits} pattern)`);

  if (DRY_RUN) {
    console.log('\n✅ Dry run complete. No changes saved.');
    return;
  }

  // ── Save changes ──────────────────────────────────────────────────────────
  let saved = 0;
  let failed = 0;
  for (const [id, patch] of updates) {
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) {
      console.error(`  ✗ Failed id=${id}:`, error.message);
      failed++;
    } else {
      saved++;
    }
  }

  console.log(`\n✅ Saved ${saved} updates. Failed: ${failed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
