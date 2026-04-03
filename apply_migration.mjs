/**
 * apply_migration.mjs
 *
 * Checks whether the 20260402_compatibility_columns.sql migration has been
 * applied to the production Supabase database, and if not, prints exact
 * instructions for applying it.
 *
 * Run:  node apply_migration.mjs
 *
 * The migration adds these columns to the `products` table:
 *   system_role, inverter_power_kw, inverter_type, supported_battery_voltages,
 *   battery_voltage, battery_capacity_kwh, battery_type,
 *   voltage_class, compatibility_group, compatible_inverter_min/max_kw,
 *   compatibility_status, requires_compatibility_review, compatibility_notes
 *
 * Also creates 4 indexes and the products_compatibility_review view.
 *
 * After confirming migration is applied, run:
 *   node backfill_solar_compatibility.mjs --dry-run
 *   node backfill_solar_compatibility.mjs
 *   node fix_gree_inverter.mjs --dry-run
 *   node fix_gree_inverter.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Columns added by the migration — we probe for these to detect migration state
const PROBE_COLUMNS = [
  'system_role',
  'inverter_power_kw',
  'battery_voltage',
  'compatibility_status',
  'requires_compatibility_review',
  'compatibility_notes',
];

async function checkColumn(column) {
  const { error } = await supabase
    .from('products')
    .select(column)
    .limit(1);
  // PostgREST returns a specific error code when the column does not exist
  if (error && (error.message.includes('column') || error.code === '42703' || error.message.includes('does not exist'))) {
    return false;
  }
  return true;
}

async function main() {
  console.log('\n⚡ Migration Check: 20260402_compatibility_columns.sql\n');
  console.log('Probing columns...\n');

  const results = {};
  for (const col of PROBE_COLUMNS) {
    const exists = await checkColumn(col);
    results[col] = exists;
    console.log(`  ${exists ? '✓' : '✗'} ${col}`);
  }

  const missing = Object.entries(results).filter(([, v]) => !v).map(([k]) => k);
  const applied = missing.length === 0;

  console.log('');

  if (applied) {
    console.log('✅ Migration is already applied. All columns exist.\n');
    console.log('Next steps:');
    console.log('  1. node backfill_solar_compatibility.mjs --dry-run   # preview backfill');
    console.log('  2. node backfill_solar_compatibility.mjs              # apply backfill');
    console.log('  3. node fix_gree_inverter.mjs --dry-run               # preview Gree fix');
    console.log('  4. node fix_gree_inverter.mjs                         # apply Gree fix');
    console.log('');
    return;
  }

  console.log(`❌ Migration NOT applied. Missing columns: ${missing.join(', ')}\n`);
  console.log('─────────────────────────────────────────────────────────────');
  console.log('HOW TO APPLY THE MIGRATION:');
  console.log('');
  console.log('Option A — Supabase Dashboard (recommended):');
  console.log('  1. Open https://supabase.com/dashboard/project/fdfjavyopbrfvwtjaerw/sql/new');
  console.log('  2. Open this file: supabase/migrations/20260402_compatibility_columns.sql');
  console.log('  3. Paste the entire contents into the SQL editor');
  console.log('  4. Click "Run"');
  console.log('  5. Re-run this script to confirm');
  console.log('');
  console.log('Option B — Supabase CLI:');
  console.log('  npx supabase db push');
  console.log('  (Requires SUPABASE_ACCESS_TOKEN and project ref configured)');
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');

  // Print the SQL so it can be copy-pasted immediately
  try {
    const __dir = dirname(fileURLToPath(import.meta.url));
    const sqlPath = join(__dir, 'supabase', 'migrations', '20260402_compatibility_columns.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    console.log('\nSQL to paste into Supabase dashboard:\n');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(sql);
    console.log('─────────────────────────────────────────────────────────────\n');
  } catch {
    console.log('(Could not read SQL file — open it manually from supabase/migrations/)');
  }

  process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
