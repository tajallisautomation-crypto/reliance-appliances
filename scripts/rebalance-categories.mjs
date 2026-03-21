/**
 * Category Rebalancer — one-shot migration + ongoing utility.
 *
 * Rules: every DB category must have 10–40 products.
 * Run:  node scripts/rebalance-categories.mjs
 *
 * New category taxonomy:
 *  Air Conditioners  → 1 Ton Air Conditioners / 1.5 Ton Air Conditioners / 2 Ton Air Conditioners
 *  Refrigerators     → Small Refrigerators / Medium Refrigerators / Large Refrigerators
 *  Washing Machines  → Automatic Washing Machines / Semi-Automatic Washing Machines
 *  Kitchen Appliances→ Kitchen Food Processors / Kitchen Blenders & Juicers /
 *                      Kitchen Cooking Appliances / Kitchen Breakfast & Beverages
 *  Small Appliances  → Personal Care Appliances / Home & Heating Appliances
 *  Freezer           → Freezers  (rename for consistency)
 *  Solar Solutions   → Solar Solutions  (no change)
 *  Televisions       → Televisions  (no change)
 *  Water Dispensers  → Water Dispensers  (no change)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Category rules ─────────────────────────────────────────────────────────────

function computeNewCategory(p) {
  const s   = (p.simplified_name || '').toLowerCase();
  const m   = (p.model           || '').toLowerCase();
  const cat = (p.category        || '').toLowerCase();
  const brand = (p.brand         || '').toLowerCase();
  const specs = p.specs || {};

  // ── Identify broad group ────────────────────────────────────────────────────

  const MISCAT_AC = ['duke', 'ario t3', 'emperor', 'nova t3', 'prince t3',
                     'floor standing', 'commercial ac', 'cool only'];
  const isMiscatAC = MISCAT_AC.includes(cat) ||
    (cat === 'televisions' && brand === 'gree');   // Gree CM11 ACs wrongly in TVs

  const isUSBWasher = cat === 'usb' && brand === 'ecostar';

  if (isMiscatAC)                     return acCategory(s, m, specs);
  if (isUSBWasher)                    return washerCategory(s, m);
  if (cat.includes('air condition'))  return acCategory(s, m, specs);
  if (cat.includes('refrigerat'))     return fridgeCategory(s, m, specs);
  if (cat === 'freezer')              return 'Freezers';
  if (cat === 'freezers')             return 'Freezers';
  if (cat.includes('washing'))        return washerCategory(s, m);
  if (cat === 'kitchen appliances')   return kitchenCategory(s, m);
  if (cat === 'small appliances')     return smallCategory(s, m);
  if (cat.includes('solar'))          return 'Solar Solutions';
  if (cat === 'televisions')          return 'Televisions';
  if (cat.includes('water dispenser'))return 'Water Dispensers';

  return null; // Unknown — leave unchanged
}

// ── AC: split by tonnage ───────────────────────────────────────────────────────
function acCategory(s, m, specs) {
  // 1. Try numeric spec
  const ton = parseFloat(specs['Tonnage'] || specs['tonnage'] || specs['Capacity'] || '0');
  if (ton > 0) {
    if (ton <= 1.3) return '1 Ton Air Conditioners';
    if (ton <= 1.7) return '1.5 Ton Air Conditioners';
    return '2 Ton Air Conditioners';
  }

  // 2. Simplified name patterns
  if (/\b(0\.75|0\.8|0\.9|1\.0|1\.2)\s*ton|\b1\s*ton(?!\s*\.5)/i.test(s)) return '1 Ton Air Conditioners';
  if (/1\.5\s*ton|1\.5ton/i.test(s))  return '1.5 Ton Air Conditioners';
  if (/1\.7\s*ton|2\.0\s*ton|2\s*ton|floor\s*stand|cassette|commercial|\b3\s*ton|\b4\s*ton/i.test(s))
    return '2 Ton Air Conditioners';

  // 3. Model number heuristics (EcoStar ES-12/18/24, Gree GS-12/18/24, Haier HSU-12/18/24)
  if (/-12[a-z]|^es-?12|^gs-?12|^gf-?12|^hsu-?12|^dc-?12|\b12[a-z]{2}/i.test(m)) return '1 Ton Air Conditioners';
  if (/-18[a-z]|^es-?18|^gs-?18|^gf-?18|^hsu-?18|^dc-?18|\b18[a-z]{2}/i.test(m)) return '1.5 Ton Air Conditioners';
  if (/-24[a-z]|-36|-48|^es-?24|^gs-?24|^gf-?24|^gf-?36|^gf-?48|^hsu-?24|^hpu-/i.test(m)) return '2 Ton Air Conditioners';

  return '1.5 Ton Air Conditioners'; // Safe default
}

// ── Refrigerator: split by Cu.Ft ──────────────────────────────────────────────
function fridgeCategory(s, m, specs) {
  // 1. Parse Cu.Ft from simplified_name
  const cf = s.match(/\b(\d+(?:\.\d+)?)\s*cu\.?\s*ft\b|\b(\d+)\s*cubic\b/i);
  if (cf) {
    const n = parseFloat(cf[1] || cf[2]);
    if (n <= 12) return 'Small Refrigerators';
    if (n <= 17) return 'Medium Refrigerators';
    return 'Large Refrigerators';
  }

  // 2. Specs capacity
  const cap = parseFloat(specs['Capacity'] || specs['capacity'] || '0');
  if (cap > 0) {
    if (cap <= 12) return 'Small Refrigerators';
    if (cap <= 17) return 'Medium Refrigerators';
    return 'Large Refrigerators';
  }

  // 3. Name clues → large
  if (/glass\s*door|inverter\s*avante|avante\+|kenwood|homage/i.test(s)) return 'Large Refrigerators';

  return 'Medium Refrigerators';
}

// ── Washing machine: split by type ────────────────────────────────────────────
function washerCategory(s, m) {
  if (/twin\s*tub|semi.?auto|spinner|esw-/i.test(s + ' ' + m)) return 'Semi-Automatic Washing Machines';
  return 'Automatic Washing Machines';
}

// ── Kitchen: split by product type ────────────────────────────────────────────
function kitchenCategory(s, m) {
  // Food processors first (before blender catches "food processor")
  if (/kitchen\s*(chef|robot)|food\s*(factory|process)|meat\s*minc|minc|chopper|slicer|fries\s*cut|vegetable\s*sl/i.test(s))
    return 'Kitchen Food Processors';

  // Cooking appliances
  if (/\boven\b|air\s*fr|microwave|pressure\s*cook|slow\s*cook|hot\s*plate|ceramic\s*cook|deep\s*fr|rice\s*cook|convect|rotisserie|induction/i.test(s))
    return 'Kitchen Cooking Appliances';

  // Blenders, juicers, mixers
  if (/blender|juicer|mixer|beater|citrus|hand\s*mix|grinder/i.test(s))
    return 'Kitchen Blenders & Juicers';

  // Breakfast & beverages
  if (/kettle|toaster|sandwich|coffee|roti|egg\s*boil|water\s*boil|pizza|scale|dough/i.test(s))
    return 'Kitchen Breakfast & Beverages';

  return 'Kitchen Cooking Appliances'; // Fallback
}

// ── Small appliances: split by type ───────────────────────────────────────────
function smallCategory(s, m) {
  if (/hair\s*(dry|straight|crimp|curl|clip)|epilator|facial|face\s*steam|foot\s*massag|baby|bottle|weight\s*scale|digital\s*weight|insect\s*kill/i.test(s))
    return 'Personal Care Appliances';

  // Everything else: irons, heaters, humidifiers, vacuum, garment steamers
  return 'Home & Heating Appliances';
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching all products…');
  const { data, error } = await supabase
    .from('products')
    .select('id, brand, model, simplified_name, category, specs');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }

  const products = data || [];
  console.log(`Loaded ${products.length} products.`);

  // Compute changes
  const changes = [];
  const skipped = [];

  for (const p of products) {
    const newCat = computeNewCategory(p);
    if (!newCat) { skipped.push(p); continue; }
    if (newCat !== p.category) changes.push({ id: p.id, from: p.category, to: newCat, brand: p.brand, model: p.model });
  }

  console.log(`\nChanges needed: ${changes.length}`);
  console.log(`Unchanged: ${products.length - changes.length - skipped.length}`);
  if (skipped.length) console.log(`Skipped (unknown cat): ${skipped.length} — ${[...new Set(skipped.map(p => p.category))].join(', ')}`);

  // Show preview
  const preview = {};
  for (const c of changes) {
    const key = `${c.from} → ${c.to}`;
    preview[key] = (preview[key] || 0) + 1;
  }
  console.log('\nCategory migrations:');
  Object.entries(preview).sort((a,b) => b[1]-a[1]).forEach(([k,n]) => console.log(`  ${String(n).padStart(4)}  ${k}`));

  if (!changes.length) { console.log('\nNothing to update.'); return; }

  // Apply in batches of 50
  console.log('\nApplying updates…');
  const BATCH = 50;
  let done = 0, errs = 0;
  for (let i = 0; i < changes.length; i += BATCH) {
    const batch = changes.slice(i, i + BATCH);
    await Promise.all(batch.map(async c => {
      const { error: e } = await supabase.from('products').update({ category: c.to }).eq('id', c.id);
      if (e) { console.error(`  ERR ${c.brand} ${c.model}: ${e.message}`); errs++; }
      else done++;
    }));
    process.stdout.write(`  ${done}/${changes.length}\r`);
  }
  console.log(`\nDone. Updated: ${done}  Errors: ${errs}`);

  // Final count per category
  const { data: final } = await supabase.from('products').select('category');
  const counts = {};
  (final || []).forEach(r => { counts[r.category] = (counts[r.category]||0)+1; });
  console.log('\nFinal category counts:');
  Object.entries(counts).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => {
    const flag = n < 10 ? ' ⚠ UNDER 10' : n > 40 ? ' ⚠ OVER 40' : '';
    console.log(`  ${String(n).padStart(4)}  ${c}${flag}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
