/**
 * dedup_bucket.mjs
 * Scans the Supabase Storage bucket "product-images", finds duplicate files
 * (same normalised name, different case/extension), confirms they share the
 * same file size, then deletes the duplicate — keeping the alphabetically
 * first filename.
 *
 * Run:  node dedup_bucket.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const BUCKET            = 'product-images';

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Strip extension and lowercase — the "canonical key" for dedup comparison
function canonicalKey(filename) {
  return filename.replace(/\.[^.]+$/, '').toLowerCase();
}

async function listFolder(folder) {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 });
  if (error) { console.error(`  ✗ list("${folder}"):`, error.message); return []; }
  return (data || []).filter(f => f.name && f.name !== '.emptyFolderPlaceholder');
}

async function getFileSize(path) {
  // Download as blob to check actual byte size
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return -1;
  return data.size;
}

async function deleteFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) { console.error(`  ✗ delete("${path}"):`, error.message); return false; }
  return true;
}

async function main() {
  console.log(`\n🔍  Scanning bucket "${BUCKET}"${DRY_RUN ? ' [DRY RUN — no deletions]' : ''}…\n`);

  // 1. List root to get folders
  const rootItems = await listFolder('');
  const folders = rootItems.filter(i => !i.metadata); // folders have no metadata object
  // fallback: treat everything as potential folder
  const folderNames = folders.length
    ? folders.map(f => f.name)
    : rootItems.map(f => f.name);

  console.log(`Found ${folderNames.length} folders: ${folderNames.join(', ')}\n`);

  let totalDups = 0;
  let totalDeleted = 0;

  for (const folder of folderNames) {
    const files = await listFolder(folder);
    if (!files.length) continue;

    // Group by canonical key (name without ext, lowercased)
    const groups = new Map(); // canonicalKey → [{ name, size, path }]
    for (const f of files) {
      const key = canonicalKey(f.name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({
        name: f.name,
        size: f.metadata?.size ?? -1,
        path: `${folder}/${f.name}`,
      });
    }

    // Find groups with more than one file
    const dupGroups = [...groups.entries()].filter(([, g]) => g.length > 1);
    if (!dupGroups.length) {
      console.log(`  ✓ ${folder}/ — no duplicates (${files.length} files)`);
      continue;
    }

    console.log(`\n  📁 ${folder}/ — ${dupGroups.length} duplicate group(s):`);

    for (const [key, group] of dupGroups) {
      totalDups += group.length - 1;

      // Sort so we keep the alphabetically first (deterministic)
      group.sort((a, b) => a.name.localeCompare(b.name));
      const [keep, ...candidates] = group;

      console.log(`\n    Key: "${key}"`);
      console.log(`    Keep  : ${keep.path} (size on record: ${keep.size >= 0 ? keep.size + 'B' : 'unknown'})`);

      for (const dup of candidates) {
        // Confirm same size before deleting (skip if sizes differ — not true duplicates)
        let keepSize = keep.size;
        let dupSize  = dup.size;

        if (keepSize < 0 || dupSize < 0) {
          // sizes not in metadata — download to compare
          console.log(`    Checking sizes via download…`);
          [keepSize, dupSize] = await Promise.all([
            keepSize < 0 ? getFileSize(keep.path) : Promise.resolve(keepSize),
            dupSize  < 0 ? getFileSize(dup.path)  : Promise.resolve(dupSize),
          ]);
        }

        console.log(`    Delete: ${dup.path} (size: ${dupSize >= 0 ? dupSize + 'B' : 'unknown'})`);

        if (keepSize !== dupSize) {
          console.log(`    ⚠️  SIZES DIFFER (keep=${keepSize}B, dup=${dupSize}B) — SKIPPING, not confirmed identical`);
          totalDups--; // don't count as actionable dup
          continue;
        }

        if (DRY_RUN) {
          console.log(`    [dry-run] would delete ${dup.path}`);
        } else {
          const ok = await deleteFile(dup.path);
          if (ok) {
            console.log(`    ✅ Deleted ${dup.path}`);
            totalDeleted++;
          }
        }
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Duplicate files found : ${totalDups}`);
  if (!DRY_RUN) {
    console.log(`Deleted               : ${totalDeleted}`);
  } else {
    console.log(`(Dry run — run without --dry-run to delete)`);
  }
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
