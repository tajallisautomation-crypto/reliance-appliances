/**
 * audit_images.mjs
 * Lists all images in Supabase bucket + all products, then shows match analysis.
 * Run: node audit_images.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function _norm(s) { return s.toLowerCase().replace(/[-_\s.]/g, ''); }

// ── 1. Scan entire bucket ─────────────────────────────────────────────────────
async function scanBucket() {
  const { data: rootItems, error } = await supabase.storage.from('product-images').list('', { limit: 500 });
  if (error) { console.error('Bucket list error:', error.message); process.exit(1); }

  const folders = rootItems.filter(i => !i.id && i.name !== '.emptyFolderPlaceholder').map(i => i.name);
  const rootFiles = rootItems.filter(i => i.id  && i.name !== '.emptyFolderPlaceholder').map(i => i.name);

  const byFolder = {};
  if (rootFiles.length) byFolder['(root)'] = rootFiles;

  for (const folder of folders) {
    const { data: files } = await supabase.storage.from('product-images').list(folder, { limit: 1000 });
    const names = (files || []).filter(f => f.name && f.name !== '.emptyFolderPlaceholder').map(f => f.name);
    byFolder[folder] = names;
  }
  return byFolder;
}

// ── 2. Build fileMap for a folder (same logic as resolveBrandImages) ───────────
function buildFileMap(folder, fileNames) {
  const fileMap = new Map();
  for (const name of fileNames) {
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const clean = stem.replace(/\s*\(\d+\)\s*$/i, '').trim();
    const m = clean.match(/^(.+)_([12])$/);
    if (!m) continue;
    const modelKey = m[1].toLowerCase();
    const isGallery = m[2] === '2';
    const mapKey = isGallery ? modelKey + '_2' : modelKey;
    const url = `${SUPABASE_URL}/storage/v1/object/public/product-images/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`;
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

// ── 3. Resolve image for a product model ─────────────────────────────────────
function resolveProductImages(fileMap, model) {
  if (fileMap.size === 0) return { thumbnail_url: '', gallery_urls: [] };
  const ml    = model.toLowerCase();
  const mlN   = _norm(model);
  const mlNum = model.replace(/[^0-9]/g, '');
  const candidates = [...new Set([ml, mlN, mlNum.length >= 4 ? mlNum : ''].filter(Boolean))];

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
  const gallery_urls = [];
  for (const c of candidates) {
    const g = findUrl(c, true);
    if (g && g !== thumbnail_url) { gallery_urls.push(g); break; }
  }
  return { thumbnail_url, gallery_urls };
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== BUCKET SCAN ===');
  const byFolder = await scanBucket();

  const allFolders = Object.keys(byFolder).sort();
  let totalImages = 0;
  for (const f of allFolders) {
    totalImages += byFolder[f].length;
    console.log(`  [${f}] (${byFolder[f].length} files)`);
    for (const name of byFolder[f]) console.log(`      ${name}`);
  }
  console.log(`\nTotal folders: ${allFolders.length}  |  Total image files: ${totalImages}`);

  // ── Build per-brand fileMaps ──────────────────────────────────────────────
  const brandFileMaps = {};
  for (const folder of allFolders) {
    if (folder === '(root)') continue;
    brandFileMaps[folder.toLowerCase()] = buildFileMap(folder, byFolder[folder]);
  }

  // ── Fetch products ─────────────────────────────────────────────────────────
  console.log('\n=== PRODUCTS ===');
  const { data: products, error: pe } = await supabase
    .from('products')
    .select('id, brand, model, thumbnail_url')
    .order('brand', { ascending: true });
  if (pe) { console.error('Products fetch error:', pe.message); process.exit(1); }
  console.log(`Total products: ${products.length}`);

  // ── Match analysis ─────────────────────────────────────────────────────────
  const matched   = [];
  const unmatched = [];
  const noFolder  = [];

  for (const p of products) {
    const brandKey = (p.brand || '').toLowerCase();
    const fileMap  = brandFileMaps[brandKey] ?? new Map();
    if (fileMap.size === 0) {
      noFolder.push(p);
      continue;
    }
    const { thumbnail_url } = resolveProductImages(fileMap, p.model || '');
    if (thumbnail_url) matched.push({ ...p, new_url: thumbnail_url });
    else               unmatched.push(p);
  }

  console.log(`\n=== MATCH SUMMARY ===`);
  console.log(`  With image (matched): ${matched.length}`);
  console.log(`  No matching image:    ${unmatched.length}`);
  console.log(`  No folder for brand:  ${noFolder.length}`);
  console.log(`  Match rate:           ${((matched.length / products.length) * 100).toFixed(1)}%`);

  if (unmatched.length) {
    console.log(`\n=== UNMATCHED PRODUCTS (brand folder exists but no image file match) ===`);
    for (const p of unmatched) {
      const brandKey = (p.brand || '').toLowerCase();
      const fileMap  = brandFileMaps[brandKey];
      const keys     = fileMap ? [...fileMap.keys()].filter(k => !k.endsWith('_2')).join(', ') : '';
      console.log(`  ${p.brand} | ${p.model} | available keys: [${keys}]`);
    }
  }

  if (noFolder.length) {
    console.log(`\n=== NO BUCKET FOLDER FOR BRAND ===`);
    const brands = [...new Set(noFolder.map(p => p.brand))].sort();
    console.log(`  Brands: ${brands.join(', ')}`);
    for (const p of noFolder) {
      console.log(`  ${p.brand} | ${p.model}`);
    }
  }

  // ── Images in bucket that are NOT used by any product ────────────────────
  console.log(`\n=== UNUSED BUCKET IMAGES (files in bucket that matched no product) ===`);
  const usedUrls = new Set(matched.map(p => p.new_url));
  let unusedCount = 0;
  for (const folder of allFolders) {
    if (folder === '(root)') continue;
    const fileMap = brandFileMaps[folder.toLowerCase()];
    if (!fileMap) continue;
    for (const [key, url] of fileMap) {
      if (!usedUrls.has(url) && !key.endsWith('_2')) {
        console.log(`  [${folder}] key="${key}" → ${url.split('/').pop()}`);
        unusedCount++;
      }
    }
  }
  console.log(`  Unused image count: ${unusedCount}`);

  // ── Current DB image status ───────────────────────────────────────────────
  const hasSupabaseImg = products.filter(p => p.thumbnail_url && p.thumbnail_url.includes('supabase')).length;
  const hasDriveImg    = products.filter(p => p.thumbnail_url && p.thumbnail_url.includes('drive.google')).length;
  const hasNoImg       = products.filter(p => !p.thumbnail_url).length;
  console.log(`\n=== CURRENT DB IMAGE STATUS ===`);
  console.log(`  Has Supabase image: ${hasSupabaseImg}`);
  console.log(`  Has Google Drive image: ${hasDriveImg}`);
  console.log(`  No image at all: ${hasNoImg}`);
}

main().catch(console.error);
