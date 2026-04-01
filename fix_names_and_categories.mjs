import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function specVal(specs, ...keys) {
  for (const k of keys) {
    const hit = Object.entries(specs || {}).find(([key]) => key.toLowerCase().includes(k.toLowerCase()));
    if (hit) return hit[1];
  }
  return null;
}

function extractTonnage(text) {
  if (!text) return null;
  const m = text.match(/(\d+(?:\.\d+)?)\s*[Tt]on/);
  return m ? parseFloat(m[1]) : null;
}

function extractCapacityNumber(text) {
  if (!text) return null;
  const m = text.match(/(\d{1,3}(?:\.\d+)?)\s*(?:L|Litre|litre|liter|ltr)/i);
  if (m) return { val: parseFloat(m[1]), unit: 'L' };
  const c = text.match(/(\d{1,2}(?:\.\d+)?)\s*[Cc]u\.?\s*[Ff]t/);
  if (c) return { val: parseFloat(c[1]), unit: 'cuft' };
  const k = text.match(/(\d{1,2}(?:\.\d+)?)\s*[Kk][Gg]/);
  if (k) return { val: parseFloat(k[1]), unit: 'kg' };
  return null;
}

// ── 1. Fix known tonnage/category mismatches ──────────────────────────────────

const categoryFixes = [
  // Gree 4-ton listed under "2 Ton Air Conditioners"
  { id: 'gree-gf-48tfih', category: '4 Ton Air Conditioners' },
  // Gree 3-ton listed under "2 Ton Air Conditioners"
  { id: 'gree-gf-36tfih', category: '3 Ton Air Conditioners' },
  // Gree 4-ton listed under plain "Air Conditioners"
  { id: 'gree-gf-48tf',   category: '4 Ton Air Conditioners' },
  // EcoStar 4-ton listed under plain "Air Conditioners"
  { id: 'a3d541bd-9a0c-4c5e-a34c-cd178dd51296', category: '4 Ton Air Conditioners' },
  // Dawlance AC stored under "Refrigerators"
  { id: 'dawlance-frost-inverter-20', category: '2 Ton Air Conditioners' },
];

console.log('\n── Step 1: Category Fixes ────────────────────────────────────────────────────');
let okCat = 0, failCat = 0;
for (const fix of categoryFixes) {
  const { error } = await sb.from('products').update({ category: fix.category }).eq('id', fix.id);
  if (error) {
    console.error(`FAIL  ${fix.id}: ${error.message}`);
    failCat++;
  } else {
    console.log(`OK    ${fix.id} → category: "${fix.category}"`);
    okCat++;
  }
}
console.log(`Category fixes: ${okCat} OK, ${failCat} failed\n`);

// ── 2. Fetch products that need name fixes ─────────────────────────────────────

// Dawlance ACs missing tonnage in name
const { data: dawlanceACs } = await sb
  .from('products')
  .select('id, brand, model, simplified_name, specs')
  .eq('brand', 'Dawlance')
  .ilike('category', '%air condition%')
  .neq('stock_status', 'Discontinued');

// Dawlance freezers with capacity in specs but not in name
const { data: dawlanceFreezers } = await sb
  .from('products')
  .select('id, brand, model, simplified_name, specs')
  .eq('brand', 'Dawlance')
  .ilike('category', '%freezer%')
  .neq('stock_status', 'Discontinued');

// Westpoint WF-841 DG microwave
const { data: westpointMicros } = await sb
  .from('products')
  .select('id, brand, model, simplified_name, specs')
  .eq('brand', 'Westpoint')
  .ilike('model', '%841%')
  .neq('stock_status', 'Discontinued');

// ── 3. Build name patches ─────────────────────────────────────────────────────

const patches = [];

console.log('── Step 2: AC Name Fixes (add tonnage) ───────────────────────────────────────');
for (const p of (dawlanceACs || [])) {
  const name = p.simplified_name || '';
  // Skip if tonnage already present
  if (/\d+(\.\d+)?\s*[Tt]on/i.test(name)) continue;

  // Get tonnage from specs
  const capSpec = specVal(p.specs, 'capacity', 'tonnage', 'cooling capacity', 'ton');
  const ton = extractTonnage(capSpec) || extractTonnage(JSON.stringify(p.specs || {}));
  if (!ton) {
    console.log(`  SKIP (no tonnage found in specs): ${p.id} — "${name}"`);
    continue;
  }

  // Insert tonnage before the word "Inverter" or "Air Conditioner" if not already there
  // Pattern: "Dawlance X123 Split Air Conditioner" → "Dawlance X123 1.5 Ton Split Air Conditioner"
  let newName = name;
  const tonStr = ton === Math.floor(ton) ? `${ton} Ton` : `${ton} Ton`;

  // Try to insert before "Inverter" or "Air Conditioner" or at end
  if (name.match(/\bInverter\b/i)) {
    newName = name.replace(/\bInverter\b/i, `${tonStr} Inverter`);
  } else if (name.match(/\bAir Conditioner\b/i)) {
    newName = name.replace(/\bAir Conditioner\b/i, `${tonStr} Air Conditioner`);
  } else if (name.match(/\bSplit\b/i)) {
    newName = name.replace(/\bSplit\b/i, `${tonStr} Split`);
  } else {
    newName = `${name} (${tonStr})`;
  }

  if (newName !== name) {
    console.log(`  PATCH: "${name}" → "${newName}"`);
    patches.push({ id: p.id, simplified_name: newName, _debug: `AC tonnage: ${p.id}` });
  }
}

console.log('\n── Step 3: Freezer Name Fixes (add capacity L) ──────────────────────────────');
for (const p of (dawlanceFreezers || [])) {
  const name = p.simplified_name || '';
  // Skip if capacity already in name
  if (/\d+\s*(L|litre|cu\.?ft|cubic)/i.test(name)) continue;

  const capSpec = specVal(p.specs, 'capacity', 'volume', 'litre', 'cu.ft', 'cubic');
  const cap = extractCapacityNumber(capSpec);
  if (!cap) {
    console.log(`  SKIP (no capacity in specs): ${p.id} — "${name}"`);
    continue;
  }

  // Insert capacity before the last word or before "Chest"/"Upright"/"Deep"
  let newName = name;
  const capStr = cap.unit === 'L' ? `${cap.val}L` : `${cap.val} ${cap.unit}`;

  // Insert before "Chest Freezer" or "Deep Freezer" or at end before color
  if (name.match(/\bChest Freezer\b/i)) {
    newName = name.replace(/\bChest Freezer\b/i, `${capStr} Chest Freezer`);
  } else if (name.match(/\bDeep Freezer\b/i)) {
    newName = name.replace(/\bDeep Freezer\b/i, `${capStr} Deep Freezer`);
  } else if (name.match(/\bFreezer\b/i)) {
    newName = name.replace(/\bFreezer\b/i, `${capStr} Freezer`);
  } else {
    newName = `${name} ${capStr}`;
  }

  // Clean double spaces
  newName = newName.replace(/\s{2,}/g, ' ').trim();

  if (newName !== name) {
    console.log(`  PATCH: "${name}" → "${newName}"`);
    patches.push({ id: p.id, simplified_name: newName, _debug: `Freezer capacity: ${p.id}` });
  }
}

console.log('\n── Step 4: Westpoint Microwave Fix ──────────────────────────────────────────');
for (const p of (westpointMicros || [])) {
  const name = p.simplified_name || '';
  if (/\d+\s*(L|litre|liter|ltr)/i.test(name)) continue;

  const capSpec = specVal(p.specs, 'capacity', 'volume', 'litre', 'liter');
  const cap = extractCapacityNumber(capSpec);
  if (!cap) {
    console.log(`  SKIP (no capacity in specs): ${p.id} — "${name}"`);
    continue;
  }

  const capStr = `${cap.val}L`;
  let newName = name;
  if (name.match(/\bMicrowave\b/i)) {
    newName = name.replace(/\bMicrowave\b/i, `${capStr} Microwave`);
  } else {
    newName = `${name} ${capStr}`;
  }
  newName = newName.replace(/\s{2,}/g, ' ').trim();

  if (newName !== name) {
    console.log(`  PATCH: "${name}" → "${newName}"`);
    patches.push({ id: p.id, simplified_name: newName, _debug: `Microwave: ${p.id}` });
  }
}

// ── 5. Apply name patches ─────────────────────────────────────────────────────

console.log(`\n── Applying ${patches.length} name patches... ─────────────────────────────────`);
let okName = 0, failName = 0;
for (const patch of patches) {
  const { error } = await sb
    .from('products')
    .update({ simplified_name: patch.simplified_name })
    .eq('id', patch.id);
  if (error) {
    console.error(`FAIL  ${patch.id}: ${error.message}`);
    failName++;
  } else {
    console.log(`OK    ${patch._debug}`);
    okName++;
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`Category fixes:  ${okCat} updated, ${failCat} failed`);
console.log(`Name patches:    ${okName} updated, ${failName} failed`);
console.log('='.repeat(70) + '\n');
