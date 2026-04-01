import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

const { data: rows, error } = await sb
  .from('products')
  .select('id,brand,model,simplified_name,category,specs,warranty')
  .neq('stock_status', 'Discontinued');

if (error) { console.error(error); process.exit(1); }

// ── Warranty rules per brand × category group ─────────────────────────────────

function catGroup(cat) {
  if (!cat) return 'other';
  const c = cat.toLowerCase();
  if (c.includes('air condition') || c.includes('ton air')) return 'ac';
  if (c.includes('washing') || c.includes('washer')) return 'washing';
  if (c.includes('freezer')) return 'freezer';
  if (c.includes('dishwasher')) return 'dishwasher';
  return 'other';
}

function warrantyFor(brand, group) {
  const b = (brand || '').toLowerCase();
  if (group === 'ac') {
    if (b === 'dawlance') return '6 Years Parts, 12 Years Compressor';
    if (b === 'ecostar')  return '5 Years Parts, 10 Years Compressor';
    if (b === 'gree')     return '10 Years Compressor';
    if (b === 'haier')    return '5 Years Parts, 10 Years Compressor (Fastest Service)';
  }
  if (group === 'washing') {
    if (b === 'dawlance') return '10 Years Motor Warranty';
    if (b === 'haier')    return '10 Years Motor Warranty';
  }
  if (group === 'freezer') {
    if (b === 'dawlance') return '12 Years Compressor Warranty';
  }
  if (group === 'dishwasher') {
    if (b === 'dawlance') return '10 Years Motor Warranty';
  }
  return null;
}

// ── Build patches ─────────────────────────────────────────────────────────────

const patches = [];

for (const p of rows) {
  const group = catGroup(p.category);
  if (group === 'other') continue;

  const correctWarranty = warrantyFor(p.brand, group);
  if (!correctWarranty) continue;

  const specs = p.specs || {};
  const currentSpecWarranty = Object.entries(specs).find(([k]) => k.toLowerCase().includes('warranty'));
  const warrantyInSpecs = currentSpecWarranty?.[1] || '';

  // Need to patch if:
  // 1. product-level warranty field is missing/wrong, OR
  // 2. specs.Warranty is missing/wrong
  const needsProductField = !p.warranty || !p.warranty.toLowerCase().includes('year');
  const needsSpecField = !warrantyInSpecs || !warrantyInSpecs.toLowerCase().includes('year');

  if (!needsProductField && !needsSpecField) continue; // already fine

  // Build new specs with Warranty added/updated
  const newSpecs = { ...specs };
  if (currentSpecWarranty) {
    // update in place with same key
    newSpecs[currentSpecWarranty[0]] = correctWarranty;
  } else {
    newSpecs['Warranty'] = correctWarranty;
  }

  patches.push({
    id: p.id,
    warranty: correctWarranty,
    specs: newSpecs,
    _debug: `${p.brand} [${group}] — ${p.simplified_name || p.model}`,
  });
}

console.log(`\nPatching ${patches.length} products...\n`);

let ok = 0, fail = 0;
for (const patch of patches) {
  const { error: err } = await sb
    .from('products')
    .update({ warranty: patch.warranty, specs: patch.specs })
    .eq('id', patch.id);
  if (err) {
    console.error(`FAIL  ${patch.id}: ${err.message}`);
    fail++;
  } else {
    console.log(`OK    ${patch._debug}`);
    ok++;
  }
}

console.log(`\nDone. ${ok} updated, ${fail} failed.\n`);
