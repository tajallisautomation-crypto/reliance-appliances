/**
 * fix_prices.mjs
 * Corrects inflated cash_floor values that were written with a 1.2× markup.
 * Divides each cash_floor by 1.2 to recover the original retail_price,
 * then recalculates cash_floor = roundUp500(retail_price) and all installment columns.
 *
 * Run:  node fix_prices.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const roundUp500  = n => Math.ceil(n / 500) * 500;
const roundTo100  = n => Math.round(n / 100) * 100;

const PLAN_CONFIG = {
  '2m':  { markup: 0.10, advancePct: 0.50, installments: 1  },
  '3m':  { markup: 0.15, advancePct: 0.45, installments: 2  },
  '6m':  { markup: 0.25, advancePct: 0.40, installments: 5  },
  '12m': { markup: 0.40, advancePct: 0.30, installments: 11 },
};

function calcPlan(basePrice, key) {
  const c = PLAN_CONFIG[key];
  const total   = roundTo100(basePrice * (1 + c.markup));
  const advance = roundTo100(total * c.advancePct);
  const monthly = roundTo100((total - advance) / c.installments);
  return { advance, monthly, total };
}

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Fetching all products…`);

  const { data, error } = await supabase
    .from('products')
    .select('id, brand, model, retail_price, cash_floor, category');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Found ${data.length} products.\n`);

  let fixed = 0, skipped = 0;

  for (const row of data) {
    const storedCash = Number(row.cash_floor || row.retail_price || 0);
    if (!storedCash) { skipped++; continue; }

    // Recover original price: stored value was roundUp500(price * 1.2)
    // Best estimate: divide by 1.2 then re-round
    const recoveredRetail = storedCash / 1.2;
    const correctCash = roundUp500(recoveredRetail);

    // Skip if price is already correct (wasn't inflated)
    if (correctCash === storedCash) { skipped++; continue; }

    const p2  = calcPlan(correctCash, '2m');
    const p3  = calcPlan(correctCash, '3m');
    const p6  = calcPlan(correctCash, '6m');
    const show12m = correctCash >= 50000;
    const p12 = show12m ? calcPlan(correctCash, '12m') : null;

    const update = {
      cash_floor:   correctCash,
      adv_2m:       p2.advance,  monthly_2m:  p2.monthly,  total_2m:  p2.total,
      adv_3m:       p3.advance,  monthly_3m:  p3.monthly,  total_3m:  p3.total,
      adv_6m:       p6.advance,  monthly_6m:  p6.monthly,  total_6m:  p6.total,
      adv_12m:      p12?.advance  ?? null,
      monthly_12m:  p12?.monthly  ?? null,
      total_12m:    p12?.total    ?? null,
      updated_at:   new Date().toISOString(),
    };

    console.log(
      `${DRY_RUN ? '[dry]' : 'FIX '} ${row.brand} ${row.model} — ` +
      `stored: ${storedCash.toLocaleString()} → corrected: ${correctCash.toLocaleString()}`
    );

    if (!DRY_RUN) {
      const { error: e } = await supabase.from('products').update(update).eq('id', row.id);
      if (e) { console.error(`  ✗ ${e.message}`); continue; }
    }
    fixed++;
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Products corrected : ${fixed}`);
  console.log(`Already correct    : ${skipped}`);
  if (DRY_RUN) console.log(`(Dry run — run without --dry-run to apply)`);
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
