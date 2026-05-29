#!/usr/bin/env node
/**
 * scripts/update-platform-docs.mjs
 *
 * Auto-updates the AUTO-marked sections in PLATFORM_OVERVIEW.md by reading
 * actual project files — never rewrites manually-authored prose.
 *
 * Sections updated:
 *   AUTO:last-updated   — date + package version
 *   AUTO:routes-public  — discovered from app/ page.tsx files (Next.js App Router)
 *   AUTO:routes-admin   — discovered from app/ page.tsx files (Next.js App Router)
 *   AUTO:migrations     — listed from supabase/migrations/
 *   AUTO:file-inventory — views + components + lib file lists
 *   AUTO:dependencies   — from package.json
 *
 * Run manually:  node scripts/update-platform-docs.mjs
 * Auto-run:      fires via Claude Code PostToolUse hook on every Edit/Write
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dir, '..');

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeRead(p) {
  try { return readFileSync(p, 'utf-8'); } catch { return ''; }
}

/**
 * Replace everything between <!-- AUTO:name --> and <!-- /AUTO:name -->.
 * If the marker is absent, logs a warning and leaves doc unchanged.
 */
function updateSection(doc, name, content) {
  const open  = `<!-- AUTO:${name} -->`;
  const close = `<!-- /AUTO:${name} -->`;
  if (!doc.includes(open)) {
    console.warn(`  [skip] marker AUTO:${name} not found`);
    return doc;
  }
  const re = new RegExp(
    open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '[\\s\\S]*?' +
    close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'g'
  );
  return doc.replace(re, `${open}\n${content}\n${close}`);
}

// ── Route metadata lookup ─────────────────────────────────────────────────────
// Keep descriptions here; paths come from app/ discovery so new routes auto-appear.

const ROUTE_META = {
  '/':                                    { page: 'Home',            purpose: 'Main landing page' },
  '/products':                            { page: 'Products',        purpose: 'Full product catalogue with filters' },
  '/products/category/[categorySlug]':   { page: 'Products',        purpose: 'Category pre-filtered view' },
  '/products/[slug]':                    { page: 'ProductDetail',   purpose: 'Individual product page' },
  '/brands/[brandSlug]':                 { page: 'BrandProducts',   purpose: 'Brand-filtered product listing (SEO landing page)' },
  '/cart':                               { page: 'Cart',            purpose: 'Shopping cart' },
  '/checkout':                           { page: 'Checkout',        purpose: 'Order placement + payment selection' },
  '/installments':                       { page: 'Installments',    purpose: 'Installment plans, calculator, FAQs' },
  '/solar':                              { page: 'SolarPage',       purpose: 'Solar & UPS configurable packages' },
  '/solar-calculator':                   { page: 'SolarCalculator', purpose: 'Interactive solar sizing tool (3-step)' },
  '/solar/off-grid':                     { page: 'OffGridSolar',    purpose: 'Off-grid solar information' },
  '/tools':                              { page: 'ToolsPage',       purpose: 'Bill savings calc + UPS/battery calc' },
  '/services':                           { page: 'Services',        purpose: 'Service pricing + care plans' },
  '/green-corridor':                     { page: 'GreenCorridor',   purpose: 'Green energy strategy + bill-to-package calc' },
  '/partner':                            { page: 'Partner',         purpose: 'Partnership programme' },
  '/corporate':                          { page: 'Corporate',       purpose: 'B2B / commercial dedicated page' },
  '/portal':                             { page: 'Portal',          purpose: 'Customer self-service dashboard (auth gated)' },
  '/about':                              { page: 'About',           purpose: 'Company story + values' },
  '/contact':                            { page: 'Contact',         purpose: 'Phone, email, map' },
  '/search':                             { page: 'SearchResults',   purpose: 'Full search results' },
  '/compare':                            { page: 'ComparePage',     purpose: 'Side-by-side product comparison' },
  '/buying-guide':                       { page: 'BuyingGuide',     purpose: 'Appliance buying advice' },
  '/build-your-package':                 { page: 'MYOP',            purpose: 'Make Your Own Package builder' },
  '/referral':                           { page: 'Referral',        purpose: 'Refer & Earn programme' },
  '/support':                            { page: 'Support',         purpose: 'Customer support + complaints' },
  '/catalog':                            { page: '→ /admin',        purpose: 'Legacy bookmark redirect' },
  '/bundles':                            { page: 'BundlesPage',     purpose: '4 pre-configured bundle offers' },
  '/gallery':                            { page: 'Gallery',         purpose: 'Installation photo gallery' },
  '/policy/[type]':                      { page: 'PolicyPage',      purpose: '8 types: privacy / terms / warranty / refund / installment / care-plan / solar / service' },
  '/admin':                              { page: 'AdminPortal',     purpose: 'Admin CMS — Supabase staff auth (role-based)' },
  '/reports':                            { page: 'ReportsPortal',   purpose: 'BI analytics dashboard — Supabase staff auth (reports role)' },
};

const ADMIN_PATHS = new Set(['/admin', '/reports', '/catalog']);

// ── Next.js App Router route discovery ───────────────────────────────────────

/**
 * Walks app/ directory, finds every page.tsx, converts the directory path to a route.
 * Next.js conventions: [param] → [param], (group) segments are ignored.
 */
function discoverRoutes(appDir) {
  if (!existsSync(appDir)) return [];
  const routes = [];

  function walk(dir, segments) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
        const path = segments.length === 0 ? '/' : '/' + segments.join('/');
        const meta = ROUTE_META[path] ?? {
          page: '*(new — add to ROUTE_META in script)*',
          purpose: '*(undocumented)*',
        };
        routes.push({ path, ...meta });
      } else if (entry.isDirectory()) {
        // Skip route groups like (marketing) — they don't add path segments
        const seg = entry.name.startsWith('(') ? null : entry.name;
        walk(
          join(dir, entry.name),
          seg ? [...segments, seg] : segments
        );
      }
    }
  }

  walk(appDir, []);
  // Sort: root first, then alphabetical
  return routes.sort((a, b) =>
    a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)
  );
}

// ── Other parsers ─────────────────────────────────────────────────────────────

function listMigrations(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(f => {
      const dm = f.match(/^(\d{4})(\d{2})(\d{2})/);
      const date = dm ? `${dm[1]}-${dm[2]}-${dm[3]}` : '—';
      const label = f.replace(/^\d{8}_/, '').replace(/\.sql$/, '').replace(/_/g, ' ');
      return { file: f, date, label };
    });
}

function listFilesDeep(dir, prefix, exts) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullName = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...listFilesDeep(join(dir, entry.name), fullName, exts));
    } else if (exts.some(e => entry.name.endsWith(e))) {
      out.push(fullName.replace(/\.(tsx|ts)$/, ''));
    }
  }
  return out.sort();
}

function listFiles(dir, exts = ['.tsx', '.ts']) {
  return listFilesDeep(dir, '', exts).map(f => f.replace(/^\//, ''));
}

// ── Build section content ─────────────────────────────────────────────────────

function buildRoutesTable(routes) {
  return (
    '| Route | Page | Purpose |\n' +
    '|-------|------|---------|' +
    routes.map(r => `\n| \`${r.path}\` | ${r.page} | ${r.purpose} |`).join('')
  );
}

function buildMigrationsTable(migs) {
  return (
    '| Date | Description | File |\n' +
    '|------|-------------|------|' +
    migs.map(m => `\n| ${m.date} | ${m.label} | \`${m.file}\` |`).join('')
  );
}

function buildFileInventory(views, libFiles, compFiles) {
  const block = (title, items) =>
    `**${title}**\n\n` + items.map(f => `- \`${f}\``).join('\n');
  return [
    block(`Views (${views.length}) — \`src/views/\``, views),
    block(`Library (${libFiles.length}) — \`src/lib/\``, libFiles),
    block(`Components (${compFiles.length}) — \`src/components/\``, compFiles),
  ].join('\n\n');
}

function buildDepsTable(pkg) {
  const rows = Object.entries(pkg.dependencies ?? {})
    .map(([k, v]) => `| \`${k}\` | \`${v}\` |`)
    .join('\n');
  return (
    `**Package name:** \`${pkg.name ?? '?'}\`  \n` +
    `**Version:** \`${pkg.version ?? '?'}\`\n\n` +
    '| Package | Version |\n' +
    '|---------|---------|' +
    '\n' + rows
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const docPath  = resolve(ROOT, 'PLATFORM_OVERVIEW.md');
const pkgPath  = resolve(ROOT, 'package.json');
const appDir   = resolve(ROOT, 'app');
const migsDir  = resolve(ROOT, 'supabase', 'migrations');
const viewsDir = resolve(ROOT, 'src', 'views');
const libDir   = resolve(ROOT, 'src', 'lib');
const compsDir = resolve(ROOT, 'src', 'components');

if (!existsSync(docPath)) {
  console.error('[platform-docs] PLATFORM_OVERVIEW.md not found — nothing to update.');
  process.exit(0);
}

let doc = readFileSync(docPath, 'utf-8');

let pkg = {};
try { pkg = JSON.parse(safeRead(pkgPath)); } catch { /* ignore */ }

const today = new Date().toISOString().split('T')[0];
const allRoutes    = discoverRoutes(appDir);
const publicRoutes = allRoutes.filter(r => !ADMIN_PATHS.has(r.path));
const adminRoutes  = allRoutes.filter(r =>  ADMIN_PATHS.has(r.path));
const migrations   = listMigrations(migsDir);
const views        = listFiles(viewsDir);
const libFiles     = listFiles(libDir);
const compFiles    = listFilesDeep(compsDir, '', ['.tsx', '.ts']).map(f => f.replace(/^\//, ''));

// Apply updates
doc = updateSection(doc, 'last-updated',
  `**Version ${pkg.version ?? '?'} · Last updated: ${today}**  \n` +
  `**Domain:** reliance.tajallis.com.pk · **Stack:** Next.js 14 + Supabase + Vercel`
);
doc = updateSection(doc, 'routes-public',  buildRoutesTable(publicRoutes));
doc = updateSection(doc, 'routes-admin',   buildRoutesTable(adminRoutes));
doc = updateSection(doc, 'migrations',     buildMigrationsTable(migrations));
doc = updateSection(doc, 'file-inventory', buildFileInventory(views, libFiles, compFiles));
doc = updateSection(doc, 'dependencies',   buildDepsTable(pkg));

writeFileSync(docPath, doc, 'utf-8');

const counts = {
  routes:     allRoutes.length,
  migrations: migrations.length,
  views:      views.length,
  components: compFiles.length,
};
console.log(
  `[platform-docs] ✓ Updated ${today} — ` +
  `${counts.routes} routes · ${counts.migrations} migrations · ` +
  `${counts.views} views · ${counts.components} components`
);
