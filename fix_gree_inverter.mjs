/**
 * fix_gree_inverter.mjs
 *
 * Ensures all Gree AC products whose model name contains "PIT" or "Pular"
 * have `Inverter: "Yes"` in their specs (and correct tags/subcategory).
 *
 * Background: Gree PIT and Pular series are DC inverter ACs. Some rows were
 * imported with missing or incorrect inverter flags, causing them to appear
 * as fixed-speed units in search and filters.
 *
 * What it changes:
 *   specs.Inverter        → "Yes"
 *   specs.Compressor Type → "DC Inverter" (if not already set)
 *   tags                  → ensures "inverter ac" is present
 *   sub_category          → "DC Inverter AC" (if not already set to something specific)
 *
 * What it does NOT change:
 *   original_category, prices, images, descriptions, taxonomy_status
 *
 * Run:  node fix_gree_inverter.mjs [--dry-run]
 *       --dry-run  shows what would change without writing
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN           = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Model name patterns that identify Gree inverter lines
const INVERTER_PATTERNS = [/pit/i, /pular/i];

function isGreeInverterModel(model) {
  return INVERTER_PATTERNS.some(re => re.test(model || ''));
}

function ensureInverterTag(existing) {
  const tags = (existing || '').split(',').map(t => t.trim()).filter(Boolean);
  const key  = 'inverter ac';
  if (!tags.some(t => t.toLowerCase() === key)) tags.push(key);
  return tags.join(', ');
}

async function main() {
  console.log(`\n🔧 Gree Inverter Fix — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Auth required for RLS-protected upserts
  if (!DRY_RUN) {
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (authErr) { console.error('Auth error:', authErr.message); process.exit(1); }
    console.log('✓ Authenticated\n');
  }

  // Fetch all Gree ACs
  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, model, simplified_name, specs, tags, sub_category')
    .eq('brand', 'Gree')
    .ilike('category', '%air condition%');

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }

  console.log(`Fetched ${products.length} Gree AC products.\n`);

  const toUpdate = [];

  for (const p of products) {
    if (!isGreeInverterModel(p.model) && !isGreeInverterModel(p.simplified_name)) {
      console.log(`  skip  ${p.model} — not PIT/Pular`);
      continue;
    }

    const specs = typeof p.specs === 'object' && p.specs ? { ...p.specs } : {};
    let changed = false;

    // 1. Inverter flag
    if ((specs['Inverter'] || '').toLowerCase() !== 'yes') {
      specs['Inverter'] = 'Yes';
      changed = true;
    }

    // 2. Compressor type
    if (!specs['Compressor Type'] || specs['Compressor Type'].toLowerCase().includes('fixed')) {
      specs['Compressor Type'] = 'DC Inverter';
      changed = true;
    }

    // 3. Tags
    const newTags = ensureInverterTag(p.tags);
    const tagsChanged = newTags !== (p.tags || '').trim();

    // 4. sub_category
    const subChanged = !p.sub_category || p.sub_category.toLowerCase() === 'air conditioner';
    const newSub     = subChanged ? 'DC Inverter AC' : p.sub_category;

    if (!changed && !tagsChanged && !subChanged) {
      console.log(`  ✓ ok  ${p.model}`);
      continue;
    }

    const update = { id: p.id };
    if (changed)     update.specs       = specs;
    if (tagsChanged) update.tags        = newTags;
    if (subChanged)  update.sub_category = newSub;

    console.log(`  ✏  fix  ${p.model}`);
    if (changed)     console.log(`         specs.Inverter="${specs['Inverter']}", specs.Compressor Type="${specs['Compressor Type']}"`);
    if (tagsChanged) console.log(`         tags → "${newTags}"`);
    if (subChanged)  console.log(`         sub_category → "${newSub}"`);

    toUpdate.push(update);
  }

  console.log(`\n────────────────────────────────`);
  console.log(`To update: ${toUpdate.length}`);

  if (DRY_RUN) {
    console.log('[DRY RUN] No writes. Remove --dry-run to apply.');
    return;
  }

  if (toUpdate.length === 0) {
    console.log('Nothing to update.');
    return;
  }

  // Use .update().eq('id') rather than upsert to avoid NOT NULL constraint
  // failures on unspecified columns.
  let written = 0;
  for (const { id, ...fields } of toUpdate) {
    const { error: uErr } = await supabase.from('products').update(fields).eq('id', id);
    if (uErr) { console.error(`Update error for ${id}:`, uErr.message); }
    else       { written++; }
  }

  console.log(`\n✅ Done. Updated ${written} / ${toUpdate.length} Gree inverter products.`);
}

main().catch(err => { console.error(err); process.exit(1); });
