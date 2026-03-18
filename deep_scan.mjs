/**
 * deep_scan.mjs
 * Recursively lists ALL files in the product-images bucket including subfolders.
 * Also tries to find what bucket file each unmatched product could map to.
 */
import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

function norm(s) { return s.toLowerCase().replace(/[-_\s./()]/g, ''); }

// Recursively list all files under a path
async function listAll(path = '') {
  const { data, error } = await sb.storage.from('product-images').list(path, { limit: 1000 });
  if (error || !data) return [];
  const results = [];
  for (const item of data) {
    if (!item.name || item.name === '.emptyFolderPlaceholder') continue;
    const fullPath = path ? `${path}/${item.name}` : item.name;
    if (!item.id) {
      // It's a subfolder — recurse
      console.error(`  [subfolder found] ${fullPath}`);
      const sub = await listAll(fullPath);
      results.push(...sub);
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

// Get all files
console.log('Deep scanning all bucket files...');
const allFiles = await listAll('');
console.log(`Total files found: ${allFiles.length}`);
console.log('');

// Show files that DON'T match the _1/_2 pattern (skipped by current parser)
const nonStandard = allFiles.filter(f => {
  const base = f.split('/').pop();
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const clean = stem.replace(/\s*\(\d+\)\s*$/i, '').trim();
  return !clean.match(/^(.+)_([12])$/);
});
if (nonStandard.length > 0) {
  console.log(`=== NON-STANDARD FILES (skipped by parser): ${nonStandard.length} ===`);
  nonStandard.forEach(f => console.log('  ' + f));
} else {
  console.log('All files follow _1/_2 naming convention.');
}

// Fetch unmatched products
const { data: products } = await sb.from('products')
  .select('id, brand, model, simplified_name, thumbnail_url')
  .order('brand').order('model');

const unmatched = products.filter(p => !p.thumbnail_url || !p.thumbnail_url.includes('supabase'));

console.log(`\nUnmatched products: ${unmatched.length}`);
console.log('\n=== FUZZY MATCH ATTEMPT ===');
console.log('Trying to find bucket files for each unmatched product...\n');

// Build full stem list per brand folder
const byFolder = {};
for (const f of allFiles) {
  const parts = f.split('/');
  const folder = parts[0];
  const base = parts[parts.length - 1];
  const dot = base.lastIndexOf('.');
  const stem = (dot > 0 ? base.slice(0, dot) : base).replace(/\s*\(\d+\)\s*$/i, '').trim();
  const m = stem.match(/^(.+)_([12])$/);
  if (!m) continue;
  if (!byFolder[folder]) byFolder[folder] = [];
  byFolder[folder].push({ stem, modelKey: m[1], suffix: m[2], path: f });
}

for (const p of unmatched) {
  const folder = p.brand.toLowerCase();
  const files = byFolder[folder] || [];
  if (files.length === 0) { console.log(`  ${p.brand} | ${p.model} → NO FOLDER`); continue; }

  const mn = norm(p.model);
  const mnPreSlash = p.model.includes('/') ? norm(p.model.split('/')[0].trim()) : mn;

  // Try various fuzzy strategies
  let best = null;
  let strategy = '';

  // 1. Exact norm match
  const exact = files.find(f => norm(f.modelKey) === mn && f.suffix === '1');
  const exact2 = files.find(f => norm(f.modelKey) === mn);
  if (exact) { best = exact; strategy = 'exact-norm-_1'; }
  else if (exact2) { best = exact2; strategy = 'exact-norm-_2'; }

  // 2. Pre-slash norm match
  if (!best && mnPreSlash !== mn) {
    const ps = files.find(f => norm(f.modelKey) === mnPreSlash && f.suffix === '1');
    const ps2 = files.find(f => norm(f.modelKey) === mnPreSlash);
    if (ps) { best = ps; strategy = 'pre-slash-_1'; }
    else if (ps2) { best = ps2; strategy = 'pre-slash-_2'; }
  }

  // 3. Bucket key contains product norm (bucket is more specific)
  if (!best) {
    const sub = files.find(f => f.suffix === '1' && norm(f.modelKey).includes(mn) && mn.length >= 4);
    const sub2 = files.find(f => norm(f.modelKey).includes(mn) && mn.length >= 4);
    if (sub) { best = sub; strategy = 'bucket-contains-product'; }
    else if (sub2) { best = sub2; strategy = 'bucket-contains-product-_2'; }
  }

  // 4. Product norm contains bucket key (product is more specific)
  if (!best) {
    const rev = files.find(f => f.suffix === '1' && mn.includes(norm(f.modelKey)) && norm(f.modelKey).length >= 5);
    const rev2 = files.find(f => mn.includes(norm(f.modelKey)) && norm(f.modelKey).length >= 5);
    if (rev) { best = rev; strategy = 'product-contains-bucket'; }
    else if (rev2) { best = rev2; strategy = 'product-contains-bucket-_2'; }
  }

  // 5. Longest common subsequence score — find the file key with most chars in common
  if (!best && mn.length >= 4) {
    let topScore = 0;
    let topFile = null;
    for (const f of files) {
      const fk = norm(f.modelKey);
      // Count matching chars in order (simple prefix overlap)
      let score = 0;
      for (let i = 0; i < Math.min(mn.length, fk.length); i++) {
        if (mn[i] === fk[i]) score++;
        else break;
      }
      if (score > topScore && score >= 3) {
        topScore = score;
        topFile = f;
      }
    }
    if (topFile) { best = topFile; strategy = `prefix-${topScore}chars`; }
  }

  if (best) {
    console.log(`  ✓ ${p.brand} | ${p.model}`);
    console.log(`      → [${strategy}] ${best.modelKey}_${best.suffix}.* = ${best.path}`);
  } else {
    console.log(`  ✗ ${p.brand} | ${p.model} (${p.simplified_name}) — NO MATCH FOUND`);
  }
}
