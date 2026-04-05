/**
 * revert_haier_csv_damage.mjs
 *
 * Reverts non-price mutations on Haier products caused by the latest CSV upload.
 *
 * ── What this script fixes ───────────────────────────────────────────────────
 *
 *   Case 1 — Auto-discontinued products:
 *     stock_status = 'Discontinued' AND missing_count >= 1
 *     → Set stock_status = 'In Stock', missing_count = 0
 *     The CSV import auto-discontinued these by incrementing missing_count for
 *     products absent from the sheet — this is now a permanently removed behavior.
 *
 *   Case 2 — Products with missing_count > 0 but still active:
 *     stock_status != 'Discontinued' AND missing_count > 0
 *     → Reset missing_count = 0 (stock_status untouched)
 *     These were unfairly penalised; without the counter reset they would have
 *     been auto-discontinued on the next CSV upload.
 *
 * ── What this script does NOT touch ─────────────────────────────────────────
 *
 *   - retail_price, cash_floor, adv_*, monthly_*, total_*   (price fields preserved)
 *   - simplified_name, description, specs, warranty, tags, seo_*  (enrichment preserved)
 *   - thumbnail_url, gallery_urls                            (images preserved)
 *   - category, sub_category, normalized_category            (taxonomy preserved)
 *   - Products with missing_count = 0 AND stock_status = 'Discontinued'
 *     (assumed manually discontinued by admin — not reverted)
 *
 * Run: node revert_haier_csv_damage.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN           = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log(`\n── revert_haier_csv_damage.mjs  ${DRY_RUN ? '[DRY RUN — no DB changes]' : '[LIVE — writing to DB]'} ────`);
  if (DRY_RUN) {
    console.log('   Pass no arguments to apply the changes for real.\n');
  } else {
    console.log('   Pass --dry-run to preview without making changes.\n');
  }

  const { error: authErr } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }

  // Fetch all Haier products with the fields we need to evaluate damage
  const { data, error } = await sb
    .from('products')
    .select('id, brand, model, category, stock_status, missing_count, retail_price, cash_floor')
    .ilike('brand', '%haier%');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Loaded ${data.length} Haier products.\n`);

  // ── Case 1: Auto-discontinued (Discontinued + missing_count >= 1) ─────────
  const autoDisco = data.filter(p =>
    p.stock_status === 'Discontinued' && (p.missing_count || 0) >= 1
  );

  console.log(`── Case 1: Revert Auto-Discontinued → In Stock (${autoDisco.length} products) ──`);

  let reverted = 0;
  let revertErrors = 0;

  for (const p of autoDisco) {
    const price = (p.cash_floor || p.retail_price || 0).toLocaleString();
    const label = `${p.brand} ${p.model} (${p.category})`;
    console.log(`  ${DRY_RUN ? '[dry] would revert' : 'REVERT'} ${label} | price=PKR ${price} | Discontinued [missing=${p.missing_count}] → In Stock`);

    if (!DRY_RUN) {
      const { error: e } = await sb.from('products').update({
        stock_status: 'In Stock',
        missing_count: 0,
        updated_at: new Date().toISOString(),
      }).eq('id', p.id);

      if (e) {
        console.error(`    ✗ Error: ${e.message}`);
        revertErrors++;
      } else {
        console.log(`    ✓ Reverted`);
        reverted++;
      }
    } else {
      reverted++; // count for dry-run summary
    }
  }

  if (autoDisco.length === 0) {
    console.log('  ✅ None found — nothing to revert in Case 1.');
  }

  // ── Case 2: Products with missing_count > 0 but not yet discontinued ──────
  const warned = data.filter(p =>
    p.stock_status !== 'Discontinued' && (p.missing_count || 0) > 0
  );

  console.log(`\n── Case 2: Reset missing_count for Active Products (${warned.length} products) ──`);

  let resetCount = 0;
  let resetErrors = 0;

  for (const p of warned) {
    const label = `${p.brand} ${p.model}`;
    console.log(`  ${DRY_RUN ? '[dry] would reset' : 'RESET'} ${label} | missing_count ${p.missing_count} → 0 (status="${p.stock_status}" preserved)`);

    if (!DRY_RUN) {
      const { error: e } = await sb.from('products').update({
        missing_count: 0,
        updated_at: new Date().toISOString(),
      }).eq('id', p.id);

      if (e) {
        console.error(`    ✗ Error: ${e.message}`);
        resetErrors++;
      } else {
        resetCount++;
      }
    } else {
      resetCount++;
    }
  }

  if (warned.length === 0) {
    console.log('  ✅ None found — nothing to reset in Case 2.');
  }

  // ── Case 3: Manually-discontinued — report but do NOT touch ───────────────
  const manualDisco = data.filter(p =>
    p.stock_status === 'Discontinued' && (p.missing_count || 0) === 0
  );

  console.log(`\n── Case 3: Manually-Discontinued (NOT touched) — ${manualDisco.length} products ──`);
  for (const p of manualDisco) {
    console.log(`  SKIP ${p.brand} ${p.model} (${p.category}) — missing_count=0, assumed intentional`);
  }
  if (manualDisco.length === 0) {
    console.log('  None.');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n── Summary ──────────────────────────────────────────────────');
  if (DRY_RUN) {
    console.log(`  Would revert auto-discontinued : ${reverted}`);
    console.log(`  Would reset missing_count      : ${resetCount}`);
    console.log(`  Would leave untouched          : ${manualDisco.length} (manual)`);
    console.log('\n  Run without --dry-run to apply these changes.\n');
  } else {
    console.log(`  Reverted auto-discontinued : ${reverted}${revertErrors > 0 ? `  (${revertErrors} errors ✗)` : '  ✓'}`);
    console.log(`  Reset missing_count        : ${resetCount}${resetErrors > 0 ? `  (${resetErrors} errors ✗)` : '  ✓'}`);
    console.log(`  Manually-discontinued kept : ${manualDisco.length}`);
    if (revertErrors + resetErrors > 0) {
      console.log('\n  ⚠️  Some updates failed — check errors above.\n');
    } else {
      console.log('\n  ✅ All done. Run audit_haier_csv_damage.mjs to confirm clean state.\n');
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
