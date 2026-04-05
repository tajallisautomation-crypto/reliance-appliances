/**
 * audit_haier_csv_damage.mjs
 *
 * Read-only audit of Haier products to identify damage from the latest CSV upload:
 *   - Products auto-discontinued (missing_count >= 1 AND stock_status = 'Discontinued')
 *   - Products with missing_count > 0 but not yet discontinued (pre-discontinuation warning)
 *   - Products manually discontinued (missing_count = 0) — will NOT be touched by revert
 *
 * Run: node audit_haier_csv_damage.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('\n── audit_haier_csv_damage.mjs ─────────────────────────────────\n');

  const { error: authErr } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }

  // Fetch all Haier products
  const { data, error } = await sb
    .from('products')
    .select('id, brand, model, category, stock_status, missing_count, retail_price, cash_floor, simplified_name, updated_at')
    .ilike('brand', '%haier%')
    .order('category')
    .order('model');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Total Haier products: ${data.length}\n`);

  // ── Stock status distribution ─────────────────────────────────────────────
  const byStatus = {};
  for (const p of data) {
    const s = p.stock_status || 'NULL';
    (byStatus[s] = byStatus[s] || []).push(p);
  }

  console.log('── Stock Status Distribution ────────────────────────────────');
  for (const [status, products] of Object.entries(byStatus).sort()) {
    console.log(`  ${status}: ${products.length} products`);
  }

  // ── Case 1: Auto-discontinued (Discontinued AND missing_count >= 1) ───────
  // These are victims of the CSV import's auto-discontinuation logic
  const autoDisco = data.filter(p =>
    p.stock_status === 'Discontinued' && (p.missing_count || 0) >= 1
  );

  console.log(`\n── Case 1: Likely Auto-Discontinued (Discontinued + missing_count ≥ 1) ── ${autoDisco.length} products`);
  if (autoDisco.length === 0) {
    console.log('  ✅ None — no auto-discontinued Haier products found.');
  } else {
    for (const p of autoDisco) {
      const price = (p.cash_floor || p.retail_price || 0).toLocaleString();
      console.log(`  ⚠️  [missing=${p.missing_count}] ${p.category} | ${p.model} | price=PKR ${price} | updated=${p.updated_at?.slice(0, 10)}`);
    }
  }

  // ── Case 2: Products warned (missing_count > 0, not yet discontinued) ─────
  // These will be auto-discontinued on the NEXT CSV import — reset their counter
  const warned = data.filter(p =>
    p.stock_status !== 'Discontinued' && (p.missing_count || 0) > 0
  );

  console.log(`\n── Case 2: Pre-Discontinuation Warning (missing_count > 0, still active) ── ${warned.length} products`);
  if (warned.length === 0) {
    console.log('  ✅ None.');
  } else {
    for (const p of warned) {
      console.log(`  ⚠️  [missing=${p.missing_count}] ${p.model} | status=${p.stock_status} | ${p.category}`);
    }
  }

  // ── Case 3: Manually discontinued (Discontinued, missing_count = 0) ───────
  // These should NOT be touched — assume intentionally disabled by admin
  const manualDisco = data.filter(p =>
    p.stock_status === 'Discontinued' && (p.missing_count || 0) === 0
  );

  console.log(`\n── Case 3: Manually Discontinued (missing_count = 0) — will NOT be reverted ── ${manualDisco.length} products`);
  for (const p of manualDisco) {
    console.log(`  ℹ️  ${p.category} | ${p.model}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n── Summary ──────────────────────────────────────────────────');
  console.log(`  Total Haier products        : ${data.length}`);
  console.log(`  Auto-discontinued to revert : ${autoDisco.length}  ← will be restored to In Stock`);
  console.log(`  Missing_count to reset      : ${warned.length}     ← counter will be cleared`);
  console.log(`  Manually-discontinued kept  : ${manualDisco.length} ← untouched`);

  if (autoDisco.length > 0 || warned.length > 0) {
    console.log('\n  ➜  Run: node revert_haier_csv_damage.mjs --dry-run');
    console.log('     Then: node revert_haier_csv_damage.mjs\n');
  } else {
    console.log('\n  ✅ No damage detected — nothing to revert.\n');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
