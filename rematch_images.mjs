/**
 * rematch_images.mjs
 * Applies the improved image-matching logic to all products and updates the DB.
 * Run: node rematch_images.mjs [--dry-run]
 *
 * Changes vs old logic:
 *   1. _norm() now strips '/' — fixes Haier combined-variant models (HRF-458IPRA / IPGA)
 *   2. Pre-slash candidate added — fixes color/variant models (HSU-13HFS/G/S, HDF-345INV/IG)
 *   3. _2 fallback for thumbnail — fixes products with only gallery images (HD60-50, 55S80/81EUX)
 */

import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const SUPABASE_URL  = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── helpers (mirrors api.ts logic) ───────────────────────────────────────────
function _norm(s) {
  return s.toLowerCase()
    .replace(/invertor/g, 'inverter')
    .replace(/[-_\s./]/g, '');
}

function buildFileMap(folder, fileNames) {
  const fileMap = new Map();
  for (const name of fileNames) {
    const dot  = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const clean = stem.replace(/\s*\(\d+\)\s*$/i, '').trim();
    const m = clean.match(/^(.+)_([12])$/);
    if (!m) continue;
    const modelKey  = m[1].toLowerCase();
    const isGallery = m[2] === '2';
    const mapKey    = isGallery ? modelKey + '_2' : modelKey;
    const { data }  = supabase.storage.from('product-images').getPublicUrl(`${folder}/${name}`);
    const url       = data.publicUrl;
    if (!fileMap.has(mapKey)) fileMap.set(mapKey, url);
    const numOnly = modelKey.replace(/[^0-9]/g, '');
    if (numOnly && numOnly !== modelKey && numOnly.length >= 3) {
      const numKey = isGallery ? numOnly + '_2' : numOnly;
      if (!fileMap.has(numKey)) fileMap.set(numKey, url);
    }
    const normKey = isGallery ? _norm(modelKey) + '_2' : _norm(modelKey);
    if (normKey !== mapKey && !fileMap.has(normKey)) fileMap.set(normKey, url);
  }
  return fileMap;
}

function resolveProductImages(fileMap, model) {
  if (fileMap.size === 0) return { thumbnail_url: '', gallery_urls: [] };
  const ml    = model.toLowerCase();
  const mlN   = _norm(model);
  const mlNum = model.replace(/[^0-9]/g, '');

  const slashIdx   = model.indexOf('/');
  const mlPreSlash  = slashIdx > 0 ? model.slice(0, slashIdx).trim().toLowerCase() : '';
  const mlPreSlashN = mlPreSlash ? _norm(mlPreSlash) : '';

  const candidates = [...new Set([
    ml, mlN, mlPreSlash, mlPreSlashN, mlNum.length >= 4 ? mlNum : '',
  ].filter(Boolean))];

  const findUrl = (baseKey, galleryVariant) => {
    const key = galleryVariant ? baseKey + '_2' : baseKey;
    if (fileMap.has(key)) return fileMap.get(key);
    for (const [k, v] of fileMap) {
      if (!k.startsWith(baseKey)) continue;
      const next = k[baseKey.length];
      if (next !== undefined && !/[-_. ]/.test(next)) continue;
      if (galleryVariant ? k.endsWith('_2') : !k.endsWith('_2')) return v;
    }
    return '';
  };

  let thumbnail_url = '';
  for (const c of candidates) {
    thumbnail_url = findUrl(c, false);
    if (thumbnail_url) break;
  }
  if (!thumbnail_url && mlN.length >= 5) {
    for (const [k, v] of fileMap) {
      if (!k.endsWith('_2') && _norm(k).includes(mlN)) { thumbnail_url = v; break; }
    }
  }
  // Reverse-substring: product norm contains the bucket key norm (8+ chars required)
  if (!thumbnail_url) {
    const allNorms = [mlN, mlPreSlashN].filter(Boolean);
    for (const [k, v] of fileMap) {
      if (k.endsWith('_2')) continue;
      const nk = _norm(k);
      if (nk.length >= 8 && allNorms.some(n => n.includes(nk))) { thumbnail_url = v; break; }
    }
  }
  // _2 fallback
  if (!thumbnail_url) {
    for (const c of candidates) {
      const g = findUrl(c, true);
      if (g) { thumbnail_url = g; break; }
    }
    if (!thumbnail_url && mlN.length >= 5) {
      for (const [k, v] of fileMap) {
        if (k.endsWith('_2') && _norm(k.slice(0, -2)).includes(mlN)) { thumbnail_url = v; break; }
      }
    }
  }

  const gallery_urls = [];
  for (const c of candidates) {
    const g = findUrl(c, true);
    if (g && g !== thumbnail_url) { gallery_urls.push(g); break; }
  }
  return { thumbnail_url, gallery_urls };
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no DB writes) ===' : '=== LIVE RUN ===');

  // 1. Scan bucket
  console.log('\nScanning bucket...');
  const { data: rootItems, error: re } = await supabase.storage.from('product-images').list('', { limit: 500 });
  if (re) { console.error('Bucket error:', re.message); process.exit(1); }
  const folders = rootItems.filter(i => !i.id && i.name !== '.emptyFolderPlaceholder').map(i => i.name);
  const brandFileMaps = {};
  for (const folder of folders) {
    const { data: files } = await supabase.storage.from('product-images').list(folder, { limit: 1000 });
    const names = (files || []).filter(f => f.name && f.name !== '.emptyFolderPlaceholder').map(f => f.name);
    brandFileMaps[folder.toLowerCase()] = buildFileMap(folder, names);
    console.log(`  [${folder}] ${names.length} files → ${brandFileMaps[folder.toLowerCase()].size} keys`);
  }

  // 2. Fetch all products
  console.log('\nFetching products...');
  const { data: products, error: pe } = await supabase
    .from('products')
    .select('id, brand, model, thumbnail_url')
    .order('brand', { ascending: true });
  if (pe) { console.error('Products error:', pe.message); process.exit(1); }
  console.log(`Total products: ${products.length}`);

  // 3. Match and update
  let found = 0, missing = 0, updated = 0, errors = 0, skipped = 0;
  const unmatched = [];

  const BATCH = 50;
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    await Promise.all(batch.map(async p => {
      const brandKey = (p.brand || '').toLowerCase();
      const fileMap  = brandFileMaps[brandKey] ?? new Map();
      const { thumbnail_url, gallery_urls } = resolveProductImages(fileMap, p.model || '');

      if (thumbnail_url) {
        found++;
        if (thumbnail_url === p.thumbnail_url) { skipped++; return; } // no change needed
        if (!DRY_RUN) {
          const { error } = await supabase
            .from('products')
            .update({ thumbnail_url, gallery_urls })
            .eq('id', p.id);
          if (error) { console.error(`  ERR ${p.brand} ${p.model}: ${error.message}`); errors++; return; }
        }
        updated++;
        console.log(`  ✓ ${p.brand} | ${p.model}`);
        if (DRY_RUN) console.log(`      → ${thumbnail_url.split('/').pop()}`);
      } else {
        missing++;
        unmatched.push(`${p.brand} | ${p.model}`);
      }
    }));
  }

  console.log('\n=== RESULTS ===');
  console.log(`  Matched:   ${found} / ${products.length}`);
  console.log(`  Updated:   ${updated} (DB writes)`);
  console.log(`  Skipped:   ${skipped} (already correct)`);
  console.log(`  Missing:   ${missing} (no image in bucket)`);
  console.log(`  Errors:    ${errors}`);
  console.log(`  Match rate: ${((found / products.length) * 100).toFixed(1)}%`);

  if (unmatched.length) {
    console.log(`\n=== STILL UNMATCHED (${unmatched.length}) ===`);
    unmatched.forEach(u => console.log('  ' + u));
  }
}

main().catch(console.error);
