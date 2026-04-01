import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

const { data } = await sb.from('products')
  .select('id,brand,model,category,specs,simplified_name,tags,cash_floor,stock_status')
  .ilike('category', '%ton%')
  .order('brand').order('model');

console.log(`\n=== AC FULL AUDIT (${data.length} products) ===\n`);

function row(p) {
  const inv  = p.specs?.Inverter === 'Yes' ? 'INV' : 'FIX';
  const heat = p.specs?.Heating?.startsWith('Yes') ? 'H&C' : 'CoolOnly';
  const t3   = p.specs?.['T3 Rating']?.startsWith('Yes') ? 'T3' : '  ';
  const heatTag = /heat/i.test((p.tags||'') + (p.simplified_name||'')) ? '✓tag' : '✗tag';
  return `  [${inv}][${heat}][${t3}][${heatTag}] ${p.model.padEnd(35)} cash:${String(p.cash_floor||0).padStart(7)}`;
}

const brands = [...new Set(data.map(p => p.brand))].sort();
for (const brand of brands) {
  const prods = data.filter(p => p.brand === brand);
  console.log(`── ${brand} (${prods.length}) ──`);
  prods.forEach(p => console.log(row(p)));
  console.log();
}

// Flag inconsistencies
console.log('\n=== INCONSISTENCIES TO REVIEW ===');
const issues = [];

for (const p of data) {
  const inv  = p.specs?.Inverter === 'Yes';
  const heat = p.specs?.Heating?.startsWith('Yes');
  const heatTag = /heat/i.test((p.tags||'') + (p.simplified_name||''));
  const m = (p.model||'').toLowerCase();

  // H&C product but no heat in tags/simplified_name
  if (heat && !heatTag) {
    issues.push(`[MISSING HEAT TAG] ${p.brand} ${p.model} (${p.id})`);
  }

  // Inverter in name but flagged as fixed speed
  if (/inverter|invertor/i.test(m) && !inv) {
    issues.push(`[INV_IN_NAME_BUT_FIX] ${p.brand} ${p.model} (${p.id})`);
  }

  // T3 in name but not flagged as T3 rated
  if (/\bt3\b/i.test(m) && !p.specs?.['T3 Rating']?.startsWith('Yes')) {
    issues.push(`[T3_IN_NAME_NO_FLAG] ${p.brand} ${p.model} (${p.id})`);
  }

  // No cash floor
  if (!p.cash_floor) {
    issues.push(`[ZERO_PRICE] ${p.brand} ${p.model} (${p.id})`);
  }
}

if (issues.length === 0) {
  console.log('  ✓ No inconsistencies found!');
} else {
  issues.forEach(i => console.log(' ', i));
}

console.log(`\nTotal: ${data.length} ACs | Issues: ${issues.length}`);
