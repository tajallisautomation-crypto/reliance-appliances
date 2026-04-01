import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

const { data: rows, error } = await sb
  .from('products')
  .select('id,brand,model,simplified_name,category,specs,tags')
  .neq('stock_status','Discontinued')
  .order('category')
  .order('brand');

if (error) { console.error(error); process.exit(1); }

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function extractInches(text) {
  if (!text) return null;
  const m = text.match(/(\d{2,3})\s*(?:"|inch|Inch|INCH)/);
  return m ? parseInt(m[1]) : null;
}

// ── Category detection ────────────────────────────────────────────────────────

function catGroup(cat) {
  if (!cat) return 'other';
  const c = cat.toLowerCase();
  if (c.includes('air condition') || c.includes('ton air')) return 'ac';
  if (c.includes('refrigerat') || c.includes('fridge')) return 'fridge';
  if (c.includes('freezer')) return 'freezer';
  if (c.includes('washing') || c.includes('washer')) return 'washing';
  if (c.includes('microwave')) return 'microwave';
  if (c.includes('television') || c.includes(' led') || c.includes('smart tv') || c.includes('qled')) return 'tv';
  if (c.includes('solar')) return 'solar';
  if (c.includes('water dispenser')) return 'water';
  if (c.includes('kitchen') || c.includes('blender') || c.includes('food proc') || c.includes('air fry')) return 'kitchen';
  return 'other';
}

// Minimum required spec keys per category
const REQUIRED_SPECS = {
  ac:        ['capacity','energy','cooling','power','warranty'],
  fridge:    ['capacity','energy','warranty'],
  freezer:   ['capacity','energy','warranty'],
  washing:   ['capacity','wash','warranty'],
  microwave: ['capacity','power','warranty'],
  tv:        ['screen','resolution','warranty'],
  solar:     ['capacity','warranty'],
  water:     ['warranty'],
  kitchen:   ['warranty'],
};

// Issues collector
const issues = [];

function flag(p, type, detail) {
  issues.push({ id: p.id, brand: p.brand, model: p.model, simplified_name: p.simplified_name, category: p.category, type, detail });
}

for (const p of rows) {
  const name = (p.simplified_name || '').toLowerCase();
  const specs = p.specs || {};
  const specStr = JSON.stringify(specs).toLowerCase();
  const group = catGroup(p.category);

  // ── 1. TONNAGE MISMATCH (ACs) ─────────────────────────────────────────────
  if (group === 'ac') {
    const nameTon = extractTonnage(p.simplified_name) || extractTonnage(p.model);
    const specCapacity = specVal(specs, 'capacity', 'cooling capacity', 'tonnage', 'ton');
    const specTon = extractTonnage(specCapacity) || extractTonnage(specStr);

    if (nameTon && specTon && Math.abs(nameTon - specTon) > 0.1) {
      flag(p, 'TONNAGE_MISMATCH', `Name says ${nameTon}T but specs say ${specTon}T (spec: "${specCapacity}")`);
    }

    // No tonnage in name at all
    if (!nameTon && !name.includes('ton')) {
      flag(p, 'MISSING_SIZE_IN_NAME', 'AC name does not include tonnage');
    }

    // Insufficient AC specs — need at minimum: Capacity/Tonnage, Energy Rating, Cooling BTU/W, Warranty
    const missing = [];
    if (!specVal(specs,'capacity','tonnage','ton','cooling capacity','btu')) missing.push('Capacity/Tonnage');
    if (!specVal(specs,'energy','star','eev','seer','cop','efficiency')) missing.push('Energy Rating/SEER');
    if (!specVal(specs,'warranty')) missing.push('Warranty');
    if (!specVal(specs,'inverter','compressor','type','technology')) missing.push('Inverter/Technology type');
    if (missing.length) flag(p, 'INSUFFICIENT_SPECS', `Missing: ${missing.join(', ')}`);
  }

  // ── 2. REFRIGERATORS ─────────────────────────────────────────────────────
  if (group === 'fridge') {
    const specsCapacity = specVal(specs,'capacity','volume','litre','cu.ft','cubic');
    const cap = extractCapacityNumber(specsCapacity) || extractCapacityNumber(p.simplified_name);

    if (!cap) {
      flag(p, 'MISSING_SIZE_IN_NAME', 'Fridge name/specs has no capacity (L or Cu.Ft)');
    }

    const nameHasCap = /\d+\s*(L|litre|cu\.?ft|cubic)/i.test(p.simplified_name);
    if (cap && !nameHasCap) {
      flag(p, 'MISSING_SIZE_IN_NAME', `Capacity ${cap.val}${cap.unit} in specs but not in name`);
    }

    const missing = [];
    if (!specVal(specs,'capacity','volume','litre','cu.ft')) missing.push('Capacity');
    if (!specVal(specs,'energy','star','watt','power')) missing.push('Energy/Wattage');
    if (!specVal(specs,'warranty')) missing.push('Warranty');
    if (!specVal(specs,'frost','defrost','no-frost')) missing.push('Frost type');
    if (!specVal(specs,'compressor','inverter')) missing.push('Compressor type');
    if (missing.length) flag(p, 'INSUFFICIENT_SPECS', `Missing: ${missing.join(', ')}`);
  }

  // ── 3. FREEZERS ──────────────────────────────────────────────────────────
  if (group === 'freezer') {
    const specsCapacity = specVal(specs,'capacity','volume','litre','cu.ft','cubic');
    const cap = extractCapacityNumber(specsCapacity) || extractCapacityNumber(p.simplified_name);

    const nameHasCap = /\d+\s*(L|litre|cu\.?ft|cubic)/i.test(p.simplified_name);
    if (cap && !nameHasCap) {
      flag(p, 'MISSING_SIZE_IN_NAME', `Capacity ${cap.val}${cap.unit} in specs but not in name`);
    }
    if (!cap) {
      flag(p, 'MISSING_SIZE_IN_NAME', 'No capacity found in name or specs');
    }

    const missing = [];
    if (!specVal(specs,'capacity','volume','litre','cu.ft')) missing.push('Capacity');
    if (!specVal(specs,'energy','star','watt')) missing.push('Energy/Wattage');
    if (!specVal(specs,'warranty')) missing.push('Warranty');
    if (missing.length) flag(p, 'INSUFFICIENT_SPECS', `Missing: ${missing.join(', ')}`);
  }

  // ── 4. WASHING MACHINES ──────────────────────────────────────────────────
  if (group === 'washing') {
    const specsCapacity = specVal(specs,'capacity','load','drum','kg');
    const cap = extractCapacityNumber(specsCapacity) || extractCapacityNumber(p.simplified_name);

    const nameHasKg = /\d+(\.\d+)?\s*kg/i.test(p.simplified_name);
    if (cap && !nameHasKg) {
      flag(p, 'MISSING_SIZE_IN_NAME', `${cap.val}kg in specs but not in name`);
    }
    if (!cap) {
      flag(p, 'MISSING_SIZE_IN_NAME', 'No kg capacity found');
    }

    const missing = [];
    if (!specVal(specs,'capacity','load','kg')) missing.push('Load Capacity (kg)');
    if (!specVal(specs,'warranty')) missing.push('Warranty');
    if (!specVal(specs,'rpm','spin','speed')) missing.push('Spin Speed (RPM)');
    if (missing.length) flag(p, 'INSUFFICIENT_SPECS', `Missing: ${missing.join(', ')}`);
  }

  // ── 5. MICROWAVE OVENS ───────────────────────────────────────────────────
  if (group === 'microwave') {
    const specsCap = specVal(specs,'capacity','volume','litre','liter');
    const cap = extractCapacityNumber(specsCap) || extractCapacityNumber(p.simplified_name);

    const nameHasL = /\d+\s*(L|litre|liter|ltr)/i.test(p.simplified_name);
    if (cap && !nameHasL) {
      flag(p, 'MISSING_SIZE_IN_NAME', `${cap.val}L in specs but not in name`);
    }
    if (!cap) {
      flag(p, 'MISSING_SIZE_IN_NAME', 'No litre capacity in name or specs');
    }

    const missing = [];
    if (!specVal(specs,'capacity','litre','volume')) missing.push('Capacity (L)');
    if (!specVal(specs,'power','watt')) missing.push('Power (W)');
    if (!specVal(specs,'warranty')) missing.push('Warranty');
    if (!specVal(specs,'grill','convection','function','type')) missing.push('Oven type/functions');
    if (missing.length) flag(p, 'INSUFFICIENT_SPECS', `Missing: ${missing.join(', ')}`);
  }

  // ── 6. TELEVISIONS ───────────────────────────────────────────────────────
  if (group === 'tv') {
    const specsScreen = specVal(specs,'screen','display','inch','size');
    const inches = extractInches(specsScreen) || extractInches(p.simplified_name) || extractInches(p.model);

    const nameHasInch = /\d{2,3}\s*("|inch|")/i.test(p.simplified_name);
    if (inches && !nameHasInch) {
      flag(p, 'MISSING_SIZE_IN_NAME', `${inches}" in specs/model but not in simplified name`);
    }
    if (!inches) {
      flag(p, 'MISSING_SIZE_IN_NAME', 'No screen size found');
    }

    const missing = [];
    if (!specVal(specs,'screen','display','inch','size')) missing.push('Screen Size');
    if (!specVal(specs,'resolution','4k','hd','fhd','uhd')) missing.push('Resolution');
    if (!specVal(specs,'warranty')) missing.push('Warranty');
    if (!specVal(specs,'smart','android','webos','os','system')) missing.push('Smart OS/Platform');
    if (missing.length) flag(p, 'INSUFFICIENT_SPECS', `Missing: ${missing.join(', ')}`);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

const byType = {};
for (const i of issues) {
  if (!byType[i.type]) byType[i.type] = [];
  byType[i.type].push(i);
}

console.log(`\n${'='.repeat(80)}`);
console.log(`PRODUCT QUALITY AUDIT — ${new Date().toISOString().slice(0,10)}`);
console.log(`Total products audited: ${rows.length}   |   Issues found: ${issues.length}`);
console.log('='.repeat(80));

const order = ['TONNAGE_MISMATCH','MISSING_SIZE_IN_NAME','INSUFFICIENT_SPECS'];
for (const type of order) {
  const list = byType[type] || [];
  if (!list.length) continue;
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`${type.replace(/_/g,' ')}  (${list.length} products)`);
  console.log('─'.repeat(80));
  for (const i of list) {
    console.log(`  [${i.category}]  ${i.brand} — ${i.simplified_name || i.model}`);
    console.log(`    id: ${i.id}`);
    console.log(`    ⚠  ${i.detail}`);
  }
}

console.log(`\n${'='.repeat(80)}\nAudit complete.\n`);
