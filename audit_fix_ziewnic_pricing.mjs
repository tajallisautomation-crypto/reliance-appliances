/**
 * audit_fix_ziewnic_pricing.mjs
 *
 * Audits and fixes Ziewnic product pricing in the database.
 *
 * Ziewnic products were originally inserted at:
 *   cash_floor = retail_price = catalogPrice × 1.10 (10% above catalog)
 *
 * Pricing strategy for Ziewnic:
 *   - retail_price = catalog_price × RETAIL_MARKUP (recommended selling price)
 *   - cash_floor   = catalog_price × CASH_MARKUP   (minimum cash price, slightly lower than retail)
 *
 * Recommended strategy (adjust RETAIL_MARKUP and CASH_MARKUP to match your actual pricing):
 *   - RETAIL_MARKUP = 1.20 (20% above catalog)
 *   - CASH_MARKUP   = 1.15 (15% above catalog — 5% cash discount vs retail)
 *
 * USAGE:
 *   AUDIT ONLY (no changes):    node audit_fix_ziewnic_pricing.mjs
 *   APPLY FIX (writes to DB):   node audit_fix_ziewnic_pricing.mjs --fix
 *
 * Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Pricing strategy ──────────────────────────────────────────────────────────
// 10% markup on all Ziewnic products. retail_price = cash_floor = catalog × 1.10.
const MARKUP = 1.10;

// Round to nearest PKR 500 (same as insert_ziewnic_all.mjs)
const round500 = n => Math.round(n / 500) * 500;

// ── Complete catalog prices from insert_ziewnic_all.mjs + price list 2026 ─────
// Key = DB slug, value = dealer/catalog price (PKR).
// Generic slugs (e.g. ziewnic-pv5000) are mapped to the matching named product.
const CATALOG_PRICES = {
  // ── Batteries ──
  'ziewnic-12v-100ah-li-vietnam':         62000,   // 12.8V 100AH BYD Vietnam
  'ziewnic-12-8v-100ah':                  62000,   // same product, generic slug
  'ziewnic-25v-100ah-li-china':          134000,   // 25.6V 100AH CATL/BYD China
  'ziewnic-25v-100ah-li-vietnam':        163000,   // 25.6V 100AH BYD Premium Vietnam
  'ziewnic-25-6v-100ah':                 163000,   // generic slug → BYD Premium Vietnam
  'ziewnic-51v-100ah-li-china':          223000,   // 51.2V 100AH CATL/BYD China
  'ziewnic-51v-100ah-li-vietnam':        258000,   // 51.2V 100AH BYD Premium Vietnam
  'ziewnic-51-2v-100ah':                 258000,   // generic slug → BYD Premium Vietnam
  'ziewnic-51v-280ah-li-vietnam':        680000,   // 51.2V 280AH BYD High Capacity
  'ziewnic-51-2v-280ah':                 680000,   // generic slug

  // ── Roux IP54 (European, China) ──
  'ziewnic-roux-ip54-pv7000':            134000,   // 4.7kW
  'ziewnic-roux-ip54-pv9000':            167000,   // 6.7kW
  'ziewnic-roux-ip54-pv15000':           345000,   // 11.7kW
  'ziewnic-pv7000':                      110000,   // generic — maps to Dual PV7000 by price
  'ziewnic-pv9000':                      167000,   // generic — maps to Roux IP54 PV9000
  'ziewnic-pv15000':                     345000,   // generic — maps to Roux IP54 PV15000

  // ── Lenox IP65 (European, China) ──
  'ziewnic-lenox-ip65-pv8000':           230000,   // 6kW
  'ziewnic-lenox-ip65-pv10500':          320000,   // 8kW
  'ziewnic-lenox-ip65-pv15600':          580000,   // 12kW
  'ziewnic-pv8000':                      230000,   // generic → Lenox IP65 PV8000
  'ziewnic-pv10500':                     320000,   // generic → Lenox IP65 PV10500
  'ziewnic-pv15600':                     580000,   // generic → Lenox IP65 PV15600

  // ── Voltronics 7th Gen Dual MPPT (Taiwan) ──
  'ziewnic-voltronics-7g-pv11000':       240000,   // 9kW
  'ziewnic-voltronics-7g-pv14000':       305000,   // 11kW
  'ziewnic-pv11000':                     240000,   // generic → V7G PV11000
  'ziewnic-pv14000':                     305000,   // generic → V7G PV14000

  // ── Voltronics 6th Gen 3-Chopper (Taiwan) ──
  'ziewnic-voltronics-6g-pv4000':         83000,   // 3.2kW
  'ziewnic-voltronics-6g-pv6500':        105000,   // 4.5kW
  'ziewnic-voltronics-6g-pv8500':        125000,   // 6.5kW
  'ziewnic-pv4000':                       83000,   // generic → V6G PV4000
  'ziewnic-pv8500':                      125000,   // generic → V6G PV8500

  // ── Voltronics 5th Gen High PV Surge (Taiwan) ──
  'ziewnic-voltronics-5g-pv6500':        113000,   // 4.5kW
  'ziewnic-voltronics-5g-pv8500':        138000,   // 6.5kW
  'ziewnic-voltronics-5g-pv13000':       258000,   // 10.5kW
  'ziewnic-pv6500':                      113000,   // generic → V5G PV6500
  'ziewnic-pv13000':                     258000,   // generic → V5G PV13000

  // ── Axpert Twin Premium Plus (Dual AC Output) ──
  'ziewnic-axpert-twin-pv5000':           95000,   // 4.2kW
  'ziewnic-axpert-twin-pv7000':          110000,   // 6.2kW

  // ── Parallel Series (Dual AC Sources) ──
  'ziewnic-parallel-pv10000':            255000,   // 8kW
  'ziewnic-parallel-pv12000':            295000,   // 11kW
  'ziewnic-pv10000':                     255000,   // generic → Parallel PV10000
  'ziewnic-pv12000':                     250000,   // generic → Dual MPPT IP54 PV12000

  // ── Dual Series 100A MPPT (Wi-Fi) ──
  'ziewnic-dual-pv2500':                  70000,   // 1.6kW
  'ziewnic-dual-pv5000':                  95000,   // 3.5kW
  'ziewnic-dual-pv7000':                 110000,   // 5.5kW
  'ziewnic-pv2500':                       70000,   // generic → Dual PV2500
  'ziewnic-pv5000':                       95000,   // generic → Dual PV5000

  // ── Voltronics 6th Gen Basic (Taiwan) ──
  'ziewnic-6g-basic-pv3000':              67000,   // 2.2kW
  'ziewnic-6g-basic-pv4500':              77000,   // 3.2kW
  'ziewnic-pv3000':                       67000,   // generic → V6G Basic PV3000
  'ziewnic-pv4500':                       77000,   // generic → V6G Basic PV4500

  // ── Marvel 5G / Z6 European (Hybrid Parallel) ──
  'ziewnic-marvel-5g-pv8500':            145000,   // 7kW Marvel 5G
  'ziewnic-marvel-5g-european-pv8500':   145000,   // same, alternate slug
  'ziewnic-z6-european-pv8500':          145000,   // 7kW Z6 European
  'ziewnic-z6-european-pv-8500-parallel':145000,   // same, alternate slug

  // ── Solar Converters (Grid-Tied, Taiwan) ──
  'ziewnic-converter-pv7000':             42000,   // 5kW
  'ziewnic-converter-pv10000':            52000,   // 7kW

  // ── Roux Lite 6th Gen (Taiwan) ──
  'ziewnic-roux-lite-pv6000':            115000,   // 4.2kW
  'ziewnic-roux-lite-pv8000':            135000,   // 6.2kW
  'ziewnic-pv6000':                      115000,   // generic → Roux Lite PV6000

  // ── Roux Mini IP54 (Taiwan) ──
  'ziewnic-roux-mini-ip54-pv5000':        85000,   // 3.5kW

  // ── Dual MPPT IP54 High Power (Taiwan) ──
  'ziewnic-dual-mppt-ip54-pv12000':      250000,   // 8.5kW
  'ziewnic-dual-mppt-ip54-pv15000':      310000,   // 10.5kW
};

async function main() {
  const applyFix = process.argv.includes('--fix');

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Ziewnic Pricing Audit' + (applyFix ? ' + FIX' : ' (READ-ONLY)'));
  console.log('═══════════════════════════════════════════════════════════\n');

  // Admin auth (needed for updates through RLS)
  const { error: authErr } = await sb.auth.signInWithPassword({
    email: process.env.ADMIN_EMAIL || 'tajallisautomation@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'Hammad123!',
  });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }

  // Fetch all Ziewnic products from DB
  const { data, error } = await sb
    .from('products')
    .select('id, slug, brand, model, simplified_name, retail_price, cash_floor, stock_status')
    .eq('brand', 'Ziewnic')
    .order('model');

  if (error) { console.error('DB error:', error); process.exit(1); }
  if (!data?.length) { console.log('No Ziewnic products found in DB.'); process.exit(0); }

  console.log(`Found ${data.length} Ziewnic products.\n`);

  let issues = 0;
  const updates = [];

  for (const p of data) {
    const catalogPrice = CATALOG_PRICES[p.slug];
    const recRetail    = catalogPrice ? round500(catalogPrice * MARKUP) : null;
    const recCashFloor = catalogPrice ? round500(catalogPrice * MARKUP) : null;

    const currentRetail = p.retail_price ?? 0;
    const currentCash   = p.cash_floor ?? 0;

    // Flags
    const missingCatalog  = !catalogPrice;
    const retailEqCash    = currentRetail === currentCash;
    const lowMarkup       = catalogPrice && currentRetail < catalogPrice * 1.05;
    const veryLow         = currentRetail < 5000;
    const mismatch        = catalogPrice && (
      Math.abs(currentRetail - recRetail) > 1000 ||
      Math.abs(currentCash   - recCashFloor) > 1000
    );

    const hasIssue = lowMarkup || veryLow || mismatch;
    if (hasIssue) issues++;

    console.log(`${hasIssue ? '⚠️ ' : '✅ '} ${p.model || p.simplified_name}`);
    console.log(`   Slug:           ${p.slug}`);
    console.log(`   Stock:          ${p.stock_status}`);
    console.log(`   Current retail: PKR ${currentRetail.toLocaleString()}`);
    console.log(`   Current cash:   PKR ${currentCash.toLocaleString()}`);
    if (catalogPrice) {
      console.log(`   Catalog price:  PKR ${catalogPrice.toLocaleString()}`);
      console.log(`   Rec price:      PKR ${recRetail.toLocaleString()} (${(MARKUP*100).toFixed(0)}% markup)`);
    } else {
      console.log(`   ⚠️  No catalog price on record — verify and add to CATALOG_PRICES`);
    }
    if (retailEqCash) console.log(`   ℹ️  retail_price = cash_floor (no cash discount applied)`);
    if (lowMarkup)    console.log(`   ❌ Current markup < 5% — below minimum`);
    if (veryLow)      console.log(`   ❌ Price appears unrealistically low`);
    if (mismatch && catalogPrice) console.log(`   ❌ Prices differ from recommended by > PKR 1,000`);
    console.log('');

    if (mismatch && catalogPrice) {
      updates.push({ id: p.id, retail_price: recRetail, cash_floor: recCashFloor });
    }
  }

  console.log(`\nSummary: ${issues} products with pricing issues out of ${data.length}`);
  console.log(`${updates.length} products would be updated by --fix\n`);

  if (!applyFix) {
    if (updates.length > 0) {
      console.log('Run with --fix to apply recommended corrections.');
    } else {
      console.log('No automatic fixes needed. Review any flagged items manually.');
    }
    console.log('\n═══════════════════════════════════════════════════════════\n');
    return;
  }

  // Apply fixes
  if (updates.length === 0) {
    console.log('No automatic price fixes needed.');
    return;
  }

  console.log('Applying pricing fixes...\n');
  let fixed = 0;

  for (const u of updates) {
    const { error: uErr } = await sb
      .from('products')
      .update({ retail_price: u.retail_price, cash_floor: u.cash_floor })
      .eq('id', u.id);

    if (uErr) {
      console.error(`  ❌ Failed to update ${u.id}: ${uErr.message}`);
    } else {
      fixed++;
      console.log(`  ✅ Updated ${u.id}: retail=${u.retail_price.toLocaleString()}, cash=${u.cash_floor.toLocaleString()}`);
    }
  }

  console.log(`\n✅ Fixed ${fixed}/${updates.length} products.`);
  console.log('\n⚠️  NOTE: Run the installment recalculation script after price changes');
  console.log('to regenerate adv_3m, monthly_3m, total_3m etc. columns in the DB.\n');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(err => { console.error(err); process.exit(1); });
