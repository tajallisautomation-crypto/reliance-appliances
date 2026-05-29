#!/usr/bin/env node
/**
 * Build-time guard: ensures the internal admin WhatsApp number never
 * appears in customer-facing source files.
 *
 * Admin number variants we check for:
 *   923354266238  (E.164 without +)
 *   +923354266238
 *   03354266238
 *   0335-4266238
 *   335-4266238
 *   3354266238
 *
 * Also checks for direct calls to waAdmin() or waCorporate() in
 * public-facing pages (app/ excluding app/admin/).
 *
 * Exit 0 = clean. Exit 1 = violation found (breaks CI / build).
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

// ── Patterns ──────────────────────────────────────────────────────────────────
const ADMIN_PATTERNS = [
  /\+?923354266238/g,
  /03354266238/g,
  /0335[-\s]?4266238/g,
  /335[-\s]?4266238/g,
];

const ADMIN_FUNC_PATTERNS = [
  /\bwaAdmin\s*\(/g,
  /\bwaCorporate\s*\(/g,
];

// ── Directories to scan (public-facing only) ──────────────────────────────────
const SCAN_DIRS = [
  join(ROOT, 'src', 'views'),
  join(ROOT, 'src', 'components'),
  join(ROOT, 'src', 'lib'),
];

// app/ is scanned but the admin subtree is excluded
const APP_DIR   = join(ROOT, 'app');
const APP_EXCL  = join(ROOT, 'app', 'admin');

const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

// ── File walker ───────────────────────────────────────────────────────────────
function* walk(dir, exclude) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (exclude && full.startsWith(exclude)) continue;
    if (entry.isDirectory()) { yield* walk(full, exclude); continue; }
    if (EXTS.has(entry.name.slice(entry.name.lastIndexOf('.')))) yield full;
  }
}

// ── Scan ──────────────────────────────────────────────────────────────────────
let violations = 0;

function checkFile(filePath) {
  let src;
  try { src = readFileSync(filePath, 'utf8'); } catch { return; }

  const rel = relative(ROOT, filePath);

  // Skip config.ts itself — WA_ADMIN is legitimately defined there
  if (rel.endsWith(join('src', 'lib', 'config.ts'))) return;
  // Skip whatsapp.ts — waAdmin/waCorporate are defined (but not called) there
  if (rel.endsWith(join('src', 'lib', 'whatsapp.ts'))) return;

  for (const pattern of ADMIN_PATTERNS) {
    pattern.lastIndex = 0;
    const m = pattern.exec(src);
    if (m) {
      const line = src.slice(0, m.index).split('\n').length;
      console.error(`FAIL  ${rel}:${line}  — admin number literal: ${m[0]}`);
      violations++;
    }
  }

  for (const pattern of ADMIN_FUNC_PATTERNS) {
    pattern.lastIndex = 0;
    const m = pattern.exec(src);
    if (m) {
      const line = src.slice(0, m.index).split('\n').length;
      console.error(`FAIL  ${rel}:${line}  — admin-only function call: ${m[0].trim()}`);
      violations++;
    }
  }
}

for (const dir of SCAN_DIRS) {
  try {
    for (const f of walk(dir)) checkFile(f);
  } catch { /* dir may not exist in all setups */ }
}

try {
  for (const f of walk(APP_DIR, APP_EXCL)) checkFile(f);
} catch { /* app/ may not exist */ }

// ── Result ────────────────────────────────────────────────────────────────────
if (violations === 0) {
  console.log('✓  check-no-admin-number: no admin number found in public-facing files.');
  process.exit(0);
} else {
  console.error(`\n✗  ${violations} violation(s) found. Admin number must not appear in customer-facing files.`);
  process.exit(1);
}
