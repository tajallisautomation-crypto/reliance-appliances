// find_near_duplicates.mjs
// Aggressive near-duplicate finder using stripped alphanumeric model matching

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Strip everything non-alphanumeric (catches HRF-246EBS == HRF246EBS == HRF 246 EBS)
function stripped(m) {
  return (m || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Normalize simplified name for comparison
function normName(n) {
  return (n || '').toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function scoreProduct(p) {
  let s = 0;
  s += Object.keys(p.specs || {}).length * 3;
  s += p.thumbnail_url ? 10 : 0;
  s += (p.description || '').length > 100 ? 5 : 0;
  s += p.featured ? 5 : 0;
  s += p.stock_status === 'In Stock' ? 3 : 0;
  return s;
}

async function findAndFix(categoryFilter, label) {
  const { data: rows, error } = await sb.from('products')
    .select('id, brand, model, simplified_name, category, specs, thumbnail_url, description, featured, stock_status')
    .ilike('category', categoryFilter);

  if (error) { console.error('Error:', error); return; }
  console.log(`\n═══ ${label} — ${rows.length} products ═══`);

  // Group by brand + stripped model
  const byModel = {};
  for (const r of rows) {
    const key = `${(r.brand||'').toLowerCase()}::${stripped(r.model)}`;
    if (!byModel[key]) byModel[key] = [];
    byModel[key].push(r);
  }

  // Also group by brand + normalized simplified_name
  const byName = {};
  for (const r of rows) {
    const key = `${(r.brand||'').toLowerCase()}::${normName(r.simplified_name)}`;
    if (!byName[key]) byName[key] = [];
    byName[key].push(r);
  }

  const dupsByModel = Object.entries(byModel).filter(([,v]) => v.length > 1);
  const dupsByName  = Object.entries(byName ).filter(([,v]) => v.length > 1);

  // Merge: collect unique IDs that are in any dup group
  const allDupIds = new Set();
  const dupGroupMap = new Map(); // leadId -> [allIds]

  for (const [, prods] of [...dupsByModel, ...dupsByName]) {
    const ids = prods.map(p => p.id).sort();
    const key = ids.join(',');
    if (!dupGroupMap.has(key)) dupGroupMap.set(key, prods);
    ids.forEach(id => allDupIds.add(id));
  }

  console.log(`Found ${dupGroupMap.size} duplicate groups (${allDupIds.size} total products affected):`);

  let deleted = 0;
  for (const [, prods] of dupGroupMap) {
    prods.sort((a, b) => scoreProduct(b) - scoreProduct(a));
    const keep = prods[0];
    const toDelete = prods.slice(1);

    console.log(`\n  ★ KEEP   [${keep.id}] "${keep.simplified_name}" (score ${scoreProduct(keep)})`);
    for (const d of toDelete) {
      console.log(`  ✗ DELETE [${d.id}] "${d.simplified_name}" (score ${scoreProduct(d)})`);
      const { error: de } = await sb.from('products').delete().eq('id', d.id);
      if (de) console.error(`    Error: ${de.message}`);
      else { deleted++; }
    }
  }

  if (dupGroupMap.size === 0) console.log('  No near-duplicates found.');
  else console.log(`\n  Total deleted: ${deleted}`);
}

async function main() {
  await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

  await findAndFix('%freezer%',    'FREEZERS');
  await findAndFix('%refrigerat%', 'REFRIGERATORS');
  await findAndFix('%washing%',    'WASHING MACHINES');

  console.log('\n✅ Done.');
}

main().catch(console.error);
