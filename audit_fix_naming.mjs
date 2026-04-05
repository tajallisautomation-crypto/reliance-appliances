/**
 * audit_fix_naming.mjs — Issues F & K
 *
 * Issue F: Product naming normalization
 *   - Finds products with empty, blank, or clearly malformed simplified_name
 *   - Flags simplified_names that still contain "WF-" prefix (Westpoint only)
 *   - Flags names that start with a model number instead of the brand
 *   - Flags names longer than 80 chars (likely DB noise)
 *
 * Issue K: Category / subcategory naming consistency
 *   - Finds products where the `category` field uses inconsistent title-case,
 *     legacy capitalization, or names that differ from the canonical display set
 *   - Flags products where normalized_category is empty/null but category could
 *     be resolved to a known canonical category
 *
 * USAGE:
 *   AUDIT ONLY:   node audit_fix_naming.mjs
 *   APPLY FIXES:  node audit_fix_naming.mjs --fix
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_KEY (or uses embedded anon key)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const FIX_MODE = process.argv.includes('--fix');

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Canonical category display names (mirrors CANONICAL_DISPLAY in api.ts) ────
const CANONICAL_DISPLAY = {
  air_conditioner:   'Air Conditioner',
  refrigerator:      'Refrigerator',
  washing_machine:   'Washing Machine',
  spinner:           'Spin Dryer',
  freezer:           'Freezer',
  television:        'Television',
  solar_panel:       'Solar Panel',
  solar_inverter:    'Solar Inverter',
  solar_battery:     'Solar Battery',
  air_fryer:         'Air Fryer',
  air_cooler:        'Air Cooler',
  air_purifier:      'Air Purifier',
  microwave:         'Microwave Oven',
  oven:              'Electric Oven',
  kettle:            'Electric Kettle',
  toaster:           'Bread Toaster',
  sandwich_maker:    'Sandwich Maker',
  hand_blender:      'Hand Blender',
  blender:           'Blender',
  juicer:            'Juicer',
  food_processor:    'Food Processor',
  chopper:           'Food Chopper',
  rice_cooker:       'Rice Cooker',
  iron:              'Electric Iron',
  fan:               'Fan',
  water_dispenser:   'Water Dispenser',
  water_heater:      'Water Heater',
  vacuum:            'Vacuum Cleaner',
  induction:         'Induction Cooker',
  hot_plate:         'Hot Plate',
};

// Category aliases — normalizes messy DB category values to canonical display names
// Add entries as you discover inconsistencies in your data
const CATEGORY_ALIASES = {
  'air conditioner':     'Air Conditioner',
  'air conditioners':    'Air Conditioner',
  'ac':                  'Air Conditioner',
  'split ac':            'Air Conditioner',
  'split a/c':           'Air Conditioner',
  'refrigerators':       'Refrigerator',
  'fridge':              'Refrigerator',
  'washing machines':    'Washing Machine',
  'washing machine':     'Washing Machine',
  'wm':                  'Washing Machine',
  'semi-automatic washing machine': 'Washing Machine',
  'automatic washing machine':      'Washing Machine',
  'top load washing machine':       'Washing Machine',
  'front load washing machine':     'Washing Machine',
  'spin dryer':          'Spin Dryer',
  'spinner':             'Spin Dryer',
  'freezers':            'Freezer',
  'deep freezer':        'Freezer',
  'chest freezer':       'Freezer',
  'televisions':         'Television',
  'tv':                  'Television',
  'led tv':              'Television',
  'microwave oven':      'Microwave Oven',
  'microwaves':          'Microwave Oven',
  'air fryers':          'Air Fryer',
  'electric kettle':     'Electric Kettle',
  'kettles':             'Electric Kettle',
  'bread toaster':       'Bread Toaster',
  'sandwich toaster':    'Sandwich Maker',
  'hand blenders':       'Hand Blender',
  'blenders':            'Blender',
  'water dispensers':    'Water Dispenser',
  'electric iron':       'Electric Iron',
  'irons':               'Electric Iron',
  'fans':                'Fan',
  'ceiling fan':         'Fan',
  'pedestal fan':        'Fan',
  'exhaust fan':         'Fan',
};

function normalizeCategory(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
  // If it's already a canonical display value, return as-is
  const canonical = Object.values(CANONICAL_DISPLAY).find(v => v.toLowerCase() === lower);
  if (canonical) return canonical;
  return null; // unknown — leave unchanged
}

// Strip " WF-XXXX" suffix/infix from Westpoint simplified_name values
function stripWF(name) {
  return name
    .replace(/\s+WF-\d+/gi, '')   // " WF-4981" at end or middle
    .replace(/\s{2,}/g, ' ')       // collapse double spaces
    .trim();
}

function isNameMalformed(name, brand) {
  if (!name || name.trim().length === 0) return 'empty';
  const n = name.trim();
  // Too long
  if (n.length > 90) return 'too_long';
  // Westpoint WF- prefix still present
  if (/WF-\d/i.test(n)) return 'has_wf_prefix';
  // Name is just a model number (all caps alphanumeric, no spaces or too short)
  if (/^[A-Z0-9]{3,15}$/.test(n) && n === n.toUpperCase()) return 'model_only';
  // Name doesn't start with brand (for known major brands)
  const knownBrands = ['haier','gree','dawlance','pel','westpoint','orient','samsung','lg','tcl','hisense','sony','canon','sharp','panasonic','crown','ecostar','waves','kenwood','pure','ikon','toyo'];
  const brandLower = (brand || '').toLowerCase();
  if (knownBrands.includes(brandLower) && !n.toLowerCase().startsWith(brandLower)) {
    // Exception: if it starts with a known series name like "Thunder" or "Pearl"
    return 'no_brand_prefix';
  }
  return null;
}

async function main() {
  console.log(`\n${'─'.repeat(70)}`);
  console.log('  audit_fix_naming.mjs   mode:', FIX_MODE ? '🔧 FIX' : '🔍 AUDIT ONLY');
  console.log(`${'─'.repeat(70)}\n`);

  // Authenticate as admin
  const { error: authErr } = await sb.auth.signInWithPassword({
    email: process.env.ADMIN_EMAIL || 'tajallisautomation@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'Hammad123!',
  });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }

  // Fetch all products
  let allProducts = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb
      .from('products')
      .select('id, brand, model, category, normalized_category, simplified_name')
      .range(from, from + PAGE - 1)
      .order('brand', { ascending: true });
    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Loaded ${allProducts.length} products.\n`);

  // ── Issue F: Naming audit ─────────────────────────────────────────────────
  const namingIssues = [];
  for (const p of allProducts) {
    const issue = isNameMalformed(p.simplified_name, p.brand);
    if (issue) {
      namingIssues.push({ id: p.id, brand: p.brand, model: p.model, simplified_name: p.simplified_name, issue });
    }
  }

  console.log(`── Issue F: Naming problems — ${namingIssues.length} products ─────────────────`);
  const byIssue = {};
  for (const p of namingIssues) {
    (byIssue[p.issue] = byIssue[p.issue] || []).push(p);
  }
  for (const [issue, items] of Object.entries(byIssue)) {
    console.log(`\n  [${issue}] (${items.length} products):`);
    for (const p of items.slice(0, 10)) {
      console.log(`    ${p.brand} ${p.model} → "${p.simplified_name}"`);
    }
    if (items.length > 10) console.log(`    … and ${items.length - 10} more`);
  }

  // ── Issue K: Category audit ───────────────────────────────────────────────
  const catIssues = [];
  for (const p of allProducts) {
    const normalized = normalizeCategory(p.category);
    const hasNormCat = p.normalized_category && p.normalized_category.trim().length > 0;
    if (normalized && normalized !== p.category) {
      catIssues.push({ id: p.id, brand: p.brand, model: p.model, old_cat: p.category, new_cat: normalized, has_norm_cat: hasNormCat });
    }
  }

  console.log(`\n── Issue K: Category naming — ${catIssues.length} products need fix ───────────`);
  // Group by old→new
  const catMap = {};
  for (const p of catIssues) {
    const key = `"${p.old_cat}" → "${p.new_cat}"`;
    (catMap[key] = catMap[key] || []).push(p);
  }
  for (const [mapping, items] of Object.entries(catMap)) {
    console.log(`  ${mapping}: ${items.length} products`);
  }

  // ── Issue F: Westpoint WF- prefix in simplified_name ─────────────────────
  const wfIssues = namingIssues.filter(p => p.issue === 'has_wf_prefix');
  console.log(`\n── Issue F (auto-fix): ${wfIssues.length} Westpoint names with WF- suffix to strip ─`);
  for (const p of wfIssues.slice(0, 5)) {
    const fixed_name = stripWF(p.simplified_name);
    console.log(`  "${p.simplified_name}" → "${fixed_name}"`);
  }
  if (wfIssues.length > 5) console.log(`  … and ${wfIssues.length - 5} more`);

  if (!FIX_MODE) {
    console.log(`\n  Run with --fix to apply both category normalizations and WF- name fixes.\n`);
    return;
  }

  // ── Apply Westpoint WF- name fixes ───────────────────────────────────────
  console.log(`\nApplying ${wfIssues.length} WF- simplified_name fixes…`);
  let wfFixed = 0, wfErrors = 0;
  for (const p of wfIssues) {
    const new_name = stripWF(p.simplified_name);
    if (new_name === p.simplified_name) { wfErrors++; continue; }
    const { error } = await sb.from('products').update({ simplified_name: new_name }).eq('id', p.id);
    if (error) {
      console.error(`  ✗ ${p.brand} ${p.model}: ${error.message}`);
      wfErrors++;
    } else {
      wfFixed++;
      if (wfFixed <= 10 || wfFixed % 50 === 0) {
        console.log(`  ✓ [${wfFixed}] "${p.simplified_name}" → "${new_name}"`);
      }
    }
  }
  console.log(`  WF- fixes done. Fixed: ${wfFixed}  Errors: ${wfErrors}`);

  // ── Apply category fixes ──────────────────────────────────────────────────
  console.log(`\nApplying ${catIssues.length} category fixes…`);
  let fixed = 0, errors = 0;
  for (const p of catIssues) {
    const { error } = await sb
      .from('products')
      .update({ category: p.new_cat })
      .eq('id', p.id);
    if (error) {
      console.error(`  ✗ ${p.brand} ${p.model}: ${error.message}`);
      errors++;
    } else {
      fixed++;
      if (fixed <= 20 || fixed % 100 === 0) {
        console.log(`  ✓ [${fixed}] ${p.brand} ${p.model}: "${p.old_cat}" → "${p.new_cat}"`);
      }
    }
  }
  console.log(`\nDone. Category fixes: ${fixed}  Errors: ${errors}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
