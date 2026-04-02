import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY0MTcwMCwiZXhwIjoyMDg4MjE3NzAwfQ.eyCmrSFge7BKVj9CYXVeDjjEtVXQVUhpWIIpN1an65w';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const POWER_KEYS = [
  'running wattage',
  'running current',
  'power consumption',
  'wattage',
  'power',
  'input power',
  'rated power',
  'energy consumption',
];

// Categories of interest
const FOCUS_CATEGORIES = [
  'stabilizers', 'cvt', 'voltage stabilizer', 'ups', 'generator', 'generators',
  'air cooler', 'air coolers', 'iron', 'irons', 'water geyser', 'water geysers',
  'geyser', 'geysers', 'electric oven', 'ovens', 'oven', 'baking oven',
  'deep fryer', 'deep fryers', 'fryer', 'fryers',
  'rice cooker', 'rice cookers', 'blender', 'blenders', 'juicer', 'juicers',
  'food processor', 'food processors', 'kettle', 'kettles', 'toaster', 'toasters',
  'air fryer', 'air fryers', 'induction cooker', 'induction cookers',
  'hand mixer', 'hand mixers', 'stand mixer', 'stand mixers', 'mixer',
];

function hasPowerSpec(specs) {
  if (!specs || typeof specs !== 'object') return false;
  const keys = Object.keys(specs).map(k => k.toLowerCase().trim());
  return POWER_KEYS.some(pk => keys.includes(pk));
}

async function fetchAllProducts() {
  const allProducts = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('products')
      .select('id, category, brand, model, simplified_name, specs')
      .range(from, to);

    if (error) {
      console.error('Error fetching page', page, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allProducts.push(...data);
    console.log(`  Fetched page ${page + 1}: ${data.length} products (total so far: ${allProducts.length})`);
    if (data.length < pageSize) break;
    page++;
  }

  return allProducts;
}

async function main() {
  console.log('='.repeat(80));
  console.log('POWER SPECS AUDIT');
  console.log('='.repeat(80));
  console.log('Fetching all products...\n');

  const products = await fetchAllProducts();
  console.log(`\nTotal products fetched: ${products.length}\n`);

  // Separate missing from present
  const missing = [];
  const categoryStats = {};

  for (const p of products) {
    const cat = (p.category || 'UNKNOWN').trim();
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, missing: 0 };
    categoryStats[cat].total++;

    if (!hasPowerSpec(p.specs)) {
      categoryStats[cat].missing++;
      missing.push(p);
    }
  }

  // Group missing by category
  const missingByCategory = {};
  for (const p of missing) {
    const cat = (p.category || 'UNKNOWN').trim();
    if (!missingByCategory[cat]) missingByCategory[cat] = [];
    missingByCategory[cat].push(p);
  }

  // Sort categories: focus categories first, then alphabetical
  const focusSet = new Set(FOCUS_CATEGORIES.map(c => c.toLowerCase()));
  const sortedCats = Object.keys(missingByCategory).sort((a, b) => {
    const aFocus = focusSet.has(a.toLowerCase());
    const bFocus = focusSet.has(b.toLowerCase());
    if (aFocus && !bFocus) return -1;
    if (!aFocus && bFocus) return 1;
    return a.localeCompare(b);
  });

  // Print detailed missing list
  console.log('='.repeat(80));
  console.log('PRODUCTS MISSING ALL POWER SPECS');
  console.log('='.repeat(80));

  for (const cat of sortedCats) {
    const items = missingByCategory[cat];
    const isFocus = focusSet.has(cat.toLowerCase());
    const marker = isFocus ? ' *** FOCUS CATEGORY ***' : '';
    console.log(`\n--- Category: ${cat}${marker} (${items.length} missing) ---`);
    for (const p of items) {
      const specKeys = p.specs && typeof p.specs === 'object' ? Object.keys(p.specs) : [];
      const brand = p.brand || '(no brand)';
      const model = p.model || '(no model)';
      const name = p.simplified_name || '(no name)';
      const keysStr = specKeys.length > 0 ? specKeys.join(', ') : '(no specs)';
      console.log(`  Brand: ${brand} | Model: ${model} | Name: ${name}`);
      console.log(`    Spec keys: ${keysStr}`);
    }
  }

  // Summary table
  console.log('\n');
  console.log('='.repeat(80));
  console.log('SUMMARY TABLE — CATEGORIES WITH MISSING POWER SPECS');
  console.log('='.repeat(80));
  console.log(`${'Category'.padEnd(40)} ${'Missing'.padStart(10)} ${'Total'.padStart(10)} ${'% Missing'.padStart(12)}`);
  console.log('-'.repeat(76));

  // Sort summary by missing count desc
  const summaryRows = Object.entries(categoryStats)
    .filter(([, s]) => s.missing > 0)
    .sort((a, b) => b[1].missing - a[1].missing);

  for (const [cat, stats] of summaryRows) {
    const pct = ((stats.missing / stats.total) * 100).toFixed(1) + '%';
    const isFocus = focusSet.has(cat.toLowerCase()) ? ' *' : '';
    console.log(
      `${(cat + isFocus).padEnd(40)} ${String(stats.missing).padStart(10)} ${String(stats.total).padStart(10)} ${pct.padStart(12)}`
    );
  }

  const totalMissing = missing.length;
  const totalProducts = products.length;
  console.log('-'.repeat(76));
  console.log(`${'TOTAL'.padEnd(40)} ${String(totalMissing).padStart(10)} ${String(totalProducts).padStart(10)} ${((totalMissing/totalProducts)*100).toFixed(1).padStart(11)}%`);

  // Focus category highlight
  console.log('\n');
  console.log('='.repeat(80));
  console.log('FOCUS CATEGORIES BREAKDOWN (power-sensitive product types)');
  console.log('='.repeat(80));
  console.log(`${'Category'.padEnd(40)} ${'Missing'.padStart(10)} ${'Total'.padStart(10)}`);
  console.log('-'.repeat(64));

  let focusMissing = 0, focusTotal = 0;
  for (const [cat, stats] of Object.entries(categoryStats)) {
    if (focusSet.has(cat.toLowerCase())) {
      console.log(`${cat.padEnd(40)} ${String(stats.missing).padStart(10)} ${String(stats.total).padStart(10)}`);
      focusMissing += stats.missing;
      focusTotal += stats.total;
    }
  }
  if (focusTotal === 0) {
    console.log('  (none of the focus categories found in database)');
  } else {
    console.log('-'.repeat(64));
    console.log(`${'FOCUS TOTAL'.padEnd(40)} ${String(focusMissing).padStart(10)} ${String(focusTotal).padStart(10)}`);
  }

  console.log('\nDone.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
