// fix_microwave_capacity.mjs
// Queries all microwave products, resolves liter capacity from known lookup tables, updates specs.Capacity

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Known microwave capacities ───────────────────────────────────────────────
// Sources: official brand websites / spec sheets
const KNOWN_CAPS = {
  // Dawlance DW-1xx series (pattern: DW-1[capacity2digits][suffix])
  'DW-295':      '25L',
  'DW-297':      '25L',
  'DW-297 GSS':  '25L',
  'DW-115':      '15L',
  'DW-128':      '28L',
  'DW-128G':     '28L',
  'DW-131':      '31L',
  'DW-131 HP':   '31L',
  'DW-132':      '32L',
  'DW-132 S':    '32L',
  'DW-133':      '33L',
  'DW-133 G':    '33L',
  'DW-133 RG':   '33L',
  'DW-136':      '36L',
  'DW-136G':     '36L',
  'DW-142':      '42L',
  'DW-142HZP':   '42L',
  'DW-162':      '62L',
  'DW-162HZP':   '62L',
  'DW-210':      '20L',
  'DW-210 S PRO':'20L',
  'DW-210 SOLO': '20L',
  'DW-210 SOLO WHITE': '20L',
  'DW-220':      '20L',
  'DW-220 S':    '20L',
  'DW-374':      '25L',
  'DW-374 Champagne': '25L',
  'DW-374 Silver':    '25L',
  'DW-388':      '28L',
  'DW-393':      '33L',
  'DW-393 GSS':  '33L',
  'DW-395':      '30L',
  'DW-395 HCG':  '30L',
  'DW-530':      '30L',
  'DW-530 AF':   '30L',
  'DW-550':      '30L',
  'DW-550 AF':   '30L',
  'DW-560':      '30L',
  'DW-560 Inverter': '30L',
  // Dawlance MD series (small/basic microwaves)
  'MD-4':        '17L',
  'MD-4 White':  '17L',
  'MD-4 Black':  '17L',
  'MD-7':        '20L',
  'MD-10':       '25L',
  'MD-15':       '25L',
  'MD 15':       '25L',
  'MD 20 INV':   '25L',
  'MD-20 INV':   '25L',
  // Dawlance DWMO oven-microwave combos (capacity is in model: DWMO-4215 = 42L, etc.)
  'DWMO-2113':   '21L',
  'DWMO 2113 C': '21L',
  'DWMO-4215':   '42L',
  'DWMO-4215 CR':'42L',
  'DWMO-4520':   '45L',
  'DWMO-4520 CR':'45L',
  'DWMO-5222':   '52L',
  'DWMO-5222 CR':'52L',
  // Westpoint WF series (WF-8xx = standard microwaves ~20-25L)
  'WF-822':      '20L',
  '822':         '20L',
  'WF-823':      '20L',
  '823':         '20L',
  'WF-824':      '20L',
  '824':         '20L',
  'WF-825':      '20L',
  '825':         '20L',
  'WF-832':      '20L',
  '832':         '20L',
  'WF-851':      '20L',
  '851':         '20L',
  'WF-853':      '25L',
  '853':         '25L',
  'WF-7500':     '25L',
  '7500':        '25L',
};

function resolveCap(brand, model, name) {
  // 1. Try exact model match
  const modelTrimmed = model.trim();
  if (KNOWN_CAPS[modelTrimmed]) return KNOWN_CAPS[modelTrimmed];

  // 2. Try model with brand prefix (e.g. "Dawlance DW-295" → "DW-295")
  const withoutBrand = modelTrimmed.replace(new RegExp('^' + brand + '\\s*', 'i'), '').trim();
  if (KNOWN_CAPS[withoutBrand]) return KNOWN_CAPS[withoutBrand];

  // 3. Try partial key match (model starts with known prefix)
  for (const [key, cap] of Object.entries(KNOWN_CAPS)) {
    if (modelTrimmed.toUpperCase().startsWith(key.toUpperCase())) return cap;
    if (withoutBrand.toUpperCase().startsWith(key.toUpperCase())) return cap;
  }

  // 4. Extract from name (e.g. "Dawlance 23L Solo Microwave")
  const nameMatch = name.match(/(\d{2,3})\s*(?:L\b|LTR\b|Litr?e?\b)/i);
  if (nameMatch) {
    const l = parseInt(nameMatch[1]);
    if (l >= 10 && l <= 80) return l + 'L';
  }

  // 5. Dawlance DW-1xx pattern (DW-1[2-digit capacity][suffix])
  const dw1 = model.match(/DW[-\s]?1(\d{2})/i);
  if (dw1) {
    const l = parseInt(dw1[1]);
    if (l >= 10 && l <= 75) return l + 'L';
  }

  // 6. Haier HMN/HSL/HGN pattern
  const haier = model.match(/H[MGSLN][NL][-\s]?(\d{2})/i);
  if (haier) {
    const l = parseInt(haier[1]);
    if (l >= 15 && l <= 50) return l + 'L';
  }

  return null;
}

async function main() {
  await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

  const { data: rows, error } = await sb
    .from('products')
    .select('id, brand, model, simplified_name, category, specs')
    .ilike('category', '%microwave%');

  if (error) { console.error('Fetch error:', error); process.exit(1); }
  console.log(`Found ${rows.length} microwave products\n`);

  let updated = 0, skipped = 0, noCapacity = 0;

  for (const row of rows) {
    const existingCap = row.specs?.['Capacity'];
    const hasValidCap = existingCap && existingCap !== '' && existingCap !== 'N/A' && existingCap !== 'undefined';
    const cap = resolveCap(row.brand, row.model, row.simplified_name);

    if (cap && !hasValidCap) {
      const newSpecs = { ...(row.specs || {}), Capacity: cap };
      const { error: ue } = await sb.from('products').update({ specs: newSpecs }).eq('id', row.id);
      if (ue) { console.error(`  ✗ ${row.brand} ${row.model}: ${ue.message}`); }
      else { console.log(`  ✓ ${row.brand} ${row.model} → ${cap}`); updated++; }
    } else if (!cap) {
      console.log(`  ⚠ ${row.brand} ${row.model} — capacity unknown`);
      noCapacity++;
    } else {
      console.log(`  → ${row.brand} ${row.model} — already: ${existingCap}`);
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Already set: ${skipped}, Unknown: ${noCapacity}`);
}

main().catch(console.error);
