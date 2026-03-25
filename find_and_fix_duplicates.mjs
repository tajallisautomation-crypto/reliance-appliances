// find_and_fix_duplicates.mjs
// Finds and removes duplicate products in freezers, refrigerators, and washing machines.
// Dedup strategy: same model number (normalized) within same brand → keep the one with:
//   1. More complete specs (more keys)
//   2. If equal, keep the one with a thumbnail
//   3. If equal, keep the most recently updated (or first by id as fallback)
// Deletes the inferior duplicate(s).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeModel(m) {
  return (m || '').toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s\-]/g, '')
    .trim();
}

function scoreProduct(p) {
  let s = 0;
  s += Object.keys(p.specs || {}).length * 3;           // more specs = better
  s += p.thumbnail_url ? 10 : 0;                        // has image = better
  s += (p.description || '').length > 100 ? 5 : 0;     // has description = better
  s += p.featured ? 5 : 0;                              // featured = keep
  s += p.stock_status === 'In Stock' ? 3 : 0;
  return s;
}

async function findAndFixDups(categoryFilter, label) {
  const { data: rows, error } = await sb.from('products')
    .select('id, brand, model, simplified_name, category, specs, thumbnail_url, description, featured, stock_status, slug')
    .ilike('category', categoryFilter);

  if (error) { console.error('Error:', error); return; }
  console.log(`\n═══ ${label} — ${rows.length} products ═══`);

  // Group by brand + normalized model
  const groups = {};
  for (const r of rows) {
    const key = `${(r.brand||'').toLowerCase()}::${normalizeModel(r.model)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const dupGroups = Object.entries(groups).filter(([,v]) => v.length > 1);
  console.log(`Found ${dupGroups.length} duplicate groups:`);

  let deleted = 0;
  for (const [key, prods] of dupGroups) {
    // Sort best → worst
    prods.sort((a, b) => scoreProduct(b) - scoreProduct(a));
    const keep = prods[0];
    const toDelete = prods.slice(1);

    console.log(`\n  Group: ${key} (${prods.length} copies)`);
    console.log(`    KEEP   [${keep.id}] "${keep.simplified_name}" score=${scoreProduct(keep)}`);
    for (const d of toDelete) {
      console.log(`    DELETE [${d.id}] "${d.simplified_name}" score=${scoreProduct(d)}`);
      const { error: de } = await sb.from('products').delete().eq('id', d.id);
      if (de) console.error(`      ✗ Delete failed: ${de.message}`);
      else { console.log(`      ✓ Deleted`); deleted++; }
    }
  }

  if (dupGroups.length === 0) console.log('  No duplicates found.');
  else console.log(`\n  Total deleted: ${deleted}`);
}

async function main() {
  await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

  await findAndFixDups('%freezer%', 'FREEZERS');
  await findAndFixDups('%refrigerat%', 'REFRIGERATORS');
  await findAndFixDups('%washing%', 'WASHING MACHINES');
  await findAndFixDups('%spinner%', 'SPINNERS');

  console.log('\n✅ Done.');
}

main().catch(console.error);
