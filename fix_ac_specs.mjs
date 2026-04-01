/**
 * fix_ac_specs.mjs
 * Corrects Heating and Inverter spec fields for all AC products
 * based on official catalog data from:
 *   - EcoStar AC New Lineup Flyer 2026 (Material folder)
 *   - Gree price list Feb-26
 *   - Dawlance split AC costing Feb-26
 *   - User confirmation: "All T3 models are Heat & Cool"
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

const HEAT_COOL = 'Yes — Heat & Cool (works in winter)';
const COOL_ONLY = 'No (cooling only)';
const INV_YES   = 'Yes';
const INV_NO    = 'No';

// Has T3 in model name (word boundary OR WT3 suffix)
const hasT3 = m => /\bT3\b/i.test(m) || /WT3/i.test(m);

// Determine corrections for a single AC product
function getCorrections(p) {
  const m = p.model || '';
  const brand = (p.brand || '').toLowerCase();
  const s = p.specs || {};
  let heating = s['Heating'];
  let inverter = s['Inverter'];
  let changed = false;

  // ── RULE 1: ANY brand, T3 in model → Heat & Cool ──────────────────────────
  if (hasT3(m) && heating !== HEAT_COOL) {
    heating = HEAT_COOL;
    changed = true;
  }

  // ── RULE 2: EcoStar — fix based on series code ────────────────────────────
  if (brand === 'ecostar') {
    // All ES-xx and EF-xx are inverter technology (ES10, ES12, EF6)
    if (inverter !== INV_YES) { inverter = INV_YES; changed = true; }

    // EMC = Emperor Cool Only (e.g. ES-12EMC1WS)
    const isCoolOnly = /EMC/i.test(m);
    const wantedHeat = isCoolOnly ? COOL_ONLY : HEAT_COOL;
    if (heating !== wantedHeat) { heating = wantedHeat; changed = true; }
  }

  // ── RULE 3: Gree — T3 already handled above; fix non-T3 inverter flag ─────
  // GS-xxPITH11W / GS-xxPITH14S = Cool Only Inverter (based on price list positioning)
  // GS-xxPIT10W = Cool Only Fixed Speed (older R410A model)
  // GS-xxAITH, GS-xxZITH = T3 (already handled above) → also Inverter
  if (brand === 'gree') {
    // Models with PITH14 or PITH11 = Cool Only Inverter
    if (/PITH1[14]/i.test(m)) {
      if (inverter !== INV_YES) { inverter = INV_YES; changed = true; }
      if (heating !== COOL_ONLY) { heating = COOL_ONLY; changed = true; }
    }
    // PIT10 = Cool Only Fixed Speed (old R410A)
    if (/PIT10/i.test(m)) {
      if (inverter !== INV_NO) { inverter = INV_NO; changed = true; }
      if (heating !== COOL_ONLY) { heating = COOL_ONLY; changed = true; }
    }
    // PITH15/16/17/18 = T3 (already HEAT_COOL from rule 1, but also Inverter)
    if (/PITH1[5678]/i.test(m)) {
      if (inverter !== INV_YES) { inverter = INV_YES; changed = true; }
    }
    // ZITH = T3 Inverter (already HEAT_COOL from rule 1)
    if (/ZITH/i.test(m)) {
      if (inverter !== INV_YES) { inverter = INV_YES; changed = true; }
    }
    // GF floor standing = Heat & Cool (FSU units)
    if (/^GF-/i.test(m)) {
      if (heating !== HEAT_COOL) { heating = HEAT_COOL; changed = true; }
    }
  }

  // ── RULE 4: Haier — LF series = Cool Only Inverter (already correct in DB) ─
  // HFP series: user said only LF is cool-only inverter for Haier
  // HSU-13HFP and HSU-19HFP are Cool Only Inverter per DB — leave as-is for now
  // HFTCA/HFTCD: Cool Only Inverter per DB — leave as-is for now

  if (!changed) return null;
  return { heating, inverter };
}

// Fetch all ACs
const { data: all, error } = await sb.from('products')
  .select('id, brand, model, specs, category, sub_category')
  .or('category.ilike.*air condition*,category.ilike.*ton air*');

if (error) { console.error('Fetch error:', error); process.exit(1); }
console.log(`Fetched ${all.length} AC products\n`);

let updated = 0, skipped = 0;
const errors = [];

for (const p of all) {
  const corrections = getCorrections(p);
  if (!corrections) { skipped++; continue; }

  const newSpecs = { ...(p.specs || {}), 'Heating': corrections.heating, 'Inverter': corrections.inverter };
  const { error: upErr } = await sb.from('products')
    .update({ specs: newSpecs })
    .eq('id', p.id);

  if (upErr) {
    errors.push(`${p.brand} ${p.model}: ${upErr.message}`);
  } else {
    console.log(`✓ ${p.brand.padEnd(10)} ${p.model.padEnd(40)} Heat:${corrections.heating.slice(0,3)} Inv:${corrections.inverter}`);
    updated++;
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`Updated: ${updated}  |  Skipped (no change): ${skipped}  |  Errors: ${errors.length}`);
if (errors.length) errors.forEach(e => console.error('  ERROR:', e));
