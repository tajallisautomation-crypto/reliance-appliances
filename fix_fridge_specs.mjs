/**
 * fix_fridge_specs.mjs
 * Updates defrost_type and related specs for Haier and Dawlance refrigerators.
 *
 * Rules:
 *  Haier  — all refs are Defrost EXCEPT:  HRF-622 IBS/ICG/IBG, HRF-578TSG/TBG,
 *            HRF-578TBGU1/TGG IOT, HRF-678 TGG  → No Frost
 *  Dawlance — all refs are Defrost EXCEPT: DSS-9055, DSS-9060, DMD-7950,
 *            DMD-9060, DTM-7650, DTM-8365  → No Frost
 *
 * Run:  node fix_fridge_specs.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// ── No-Frost model lists ──────────────────────────────────────────────────────

// Haier: match by substring (model names in DB include suffix codes)
const HAIER_NO_FROST_TOKENS = [
  'HRF-622 IBS',
  'HRF-622 ICG',
  'HRF-622 IBG',
  'HRF-578TSG',
  'HRF-578TBG',
  'HRF-578TBGU1',
  'HRF-678 TGG',
].map(m => m.toUpperCase().replace(/\s+/g, ' ').trim());

// Dawlance: match by the 4-digit series number contained anywhere in the model string.
// All 9055, 9060, 7950, 7650, 8365 Dawlance refs are No Frost.
const DAWLANCE_NO_FROST_NUMS = ['9055', '9060', '7950', '7650', '8365'];

// ── Additional spec details per Dawlance No-Frost model ──────────────────────

const DAWLANCE_EXTRA = {
  'DTM-7650': {
    door_type:         'Top Mount (Double Door)',
    cooling_system:    'Full No Frost',
    connectivity:      'IoT / WiFi',
    finish_options:    'Inox (Stainless Steel), Glass Door',
    karachi_note:      'No Frost units lose cold air faster during load shedding — consider cooling retention needs',
  },
  'DTM-8365': {
    door_type:         'Top Mount (Double Door)',
    cooling_system:    'Full No Frost',
    capacity:          '24 cu ft (approx.)',
    finish_options:    'Inox (Stainless Steel), Glass Door',
    karachi_note:      'No Frost units lose cold air faster during load shedding — consider cooling retention needs',
  },
  'DSS-9055': {
    door_type:         'Side-by-Side',
    cooling_system:    'No Frost',
    capacity:          '24 cu ft',
    finish_options:    'Inox (Stainless Steel), Glass Door',
    karachi_note:      'No Frost units lose cold air faster during load shedding — consider cooling retention needs',
  },
  'DSS-9060': {
    door_type:         'Side-by-Side',
    cooling_system:    'No Frost',
    capacity:          '22 cu ft',
    finish_options:    'Glass Door',
    karachi_note:      'No Frost units lose cold air faster during load shedding — consider cooling retention needs',
  },
  'DMD-7950': {
    door_type:         'Multi-Door / French Door (4-Door)',
    cooling_system:    'No Frost',
    capacity:          '22–24 cu ft (approx.)',
    karachi_note:      'No Frost units lose cold air faster during load shedding — consider cooling retention needs',
  },
  'DMD-9060': {
    door_type:         'Multi-Door / French Door (4-Door)',
    cooling_system:    'No Frost',
    karachi_note:      'No Frost units lose cold air faster during load shedding — consider cooling retention needs',
  },
};

// Normalise model string for lookup (upper-case, trim)
function norm(m) { return (m || '').toUpperCase().replace(/\s+/g, ' ').trim(); }

// Check if a model string matches no-frost criteria
function isNoFrost(brand, model) {
  const n = norm(model);
  if (brand.toLowerCase() === 'haier') {
    return HAIER_NO_FROST_TOKENS.some(t => n.includes(t));
  }
  if (brand.toLowerCase() === 'dawlance') {
    return DAWLANCE_NO_FROST_NUMS.some(num => n.includes(num));
  }
  return false;
}

// Get extra specs for Dawlance no-frost models (match by 4-digit series number)
const DAWLANCE_EXTRA_BY_NUM = Object.fromEntries(
  Object.entries(DAWLANCE_EXTRA).map(([k, v]) => [k.replace(/\D/g, ''), v])
);
function getExtra(model) {
  const n = norm(model);
  for (const [num, extras] of Object.entries(DAWLANCE_EXTRA_BY_NUM)) {
    if (n.includes(num)) return extras;
  }
  return {};
}

async function main() {
  // Sign in to get authenticated role (required for RLS write policies)
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
  console.log('Signed in as', ADMIN_EMAIL);

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Fetching Haier & Dawlance refrigerators…\n`);

  const { data, error } = await supabase
    .from('products')
    .select('id, brand, model, category, specs')
    .in('brand', ['Haier', 'Dawlance'])
    .ilike('category', '%refrigerat%');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Found ${data.length} refrigerator products.\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (const row of data) {
    const noFrost  = isNoFrost(row.brand, row.model);
    const defrostType = noFrost ? 'No Frost' : 'Defrost';
    const extra    = noFrost && row.brand.toLowerCase() === 'dawlance' ? getExtra(row.model) : {};

    const currentSpecs = row.specs || {};

    // Canonical values for the human-visible spec fields
    const correctDefrostField  = noFrost ? 'No Frost (Automatic)'          : 'Manual (Freezer)';
    const correctCoolingField  = noFrost ? 'No Frost (Fan-Forced Cooling)'  : 'Direct Cool (Manual Defrost)';

    const newSpecs = {
      ...currentSpecs,
      defrost_type:    defrostType,
      Defrost:         correctDefrostField,
      'Cooling System': correctCoolingField,
      ...extra,
    };

    // Check if anything actually needs changing
    const alreadyOk =
      currentSpecs.defrost_type      === defrostType &&
      currentSpecs['Defrost']         === correctDefrostField &&
      currentSpecs['Cooling System']  === correctCoolingField &&
      Object.entries(extra).every(([k, v]) => currentSpecs[k] === v);

    if (alreadyOk) {
      console.log(`  skip  ${row.brand} ${row.model} — already correct (${defrostType})`);
      skipped++;
      continue;
    }

    const changes = [];
    if (currentSpecs['Defrost'] !== correctDefrostField) changes.push(`Defrost: "${currentSpecs['Defrost']}" → "${correctDefrostField}"`);
    if (currentSpecs['Cooling System'] !== correctCoolingField) changes.push(`Cooling System: "${currentSpecs['Cooling System']}" → "${correctCoolingField}"`);
    if (currentSpecs.defrost_type !== defrostType) changes.push(`defrost_type: "${currentSpecs.defrost_type}" → "${defrostType}"`);
    console.log(`  ${DRY_RUN ? 'would' : 'UPDATE'} ${row.brand} ${row.model}`);
    changes.forEach(c => console.log(`          ${c}`));

    if (!DRY_RUN) {
      const { error: e } = await supabase
        .from('products')
        .update({ specs: newSpecs, updated_at: new Date().toISOString() })
        .eq('id', row.id);

      if (e) {
        console.error(`    ✗ ${row.brand} ${row.model}: ${e.message}`);
        failed++;
        continue;
      }
    }
    updated++;
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Updated : ${updated}`);
  console.log(`Skipped : ${skipped}`);
  if (failed) console.log(`Failed  : ${failed}`);
  if (DRY_RUN) console.log(`\n(Dry run — run without --dry-run to apply changes)`);
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
