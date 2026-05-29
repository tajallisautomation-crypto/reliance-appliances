#!/usr/bin/env node
/**
 * scripts/platform-truth-check.mjs
 *
 * Verifies PLATFORM_OVERVIEW.md claims against actual source code and files.
 * Run: node scripts/platform-truth-check.mjs
 *
 * Exit code 0 = all checks passed  |  Exit code 1 = one or more failures
 *
 * Each check reports:  ✓ PASS  /  ✗ FAIL  /  ⚠ WARN
 * Failures mean the doc says X but code says Y — someone needs to fix either the doc or the code.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dir, '..');

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeRead(p) {
  try { return readFileSync(p, 'utf-8'); } catch { return ''; }
}

const results = [];

function check(label, pass, detail = '') {
  const icon = pass === true ? '✓' : pass === 'warn' ? '⚠' : '✗';
  results.push({ label, pass, detail, icon });
  const line = `  ${icon} ${label}${detail ? `  — ${detail}` : ''}`;
  console.log(line);
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

// ── Source files ──────────────────────────────────────────────────────────────

const cartStore       = safeRead(resolve(ROOT, 'src/store/cartStore.ts'));
const compareStore    = safeRead(resolve(ROOT, 'src/store/compareStore.ts'));
const myopStore       = safeRead(resolve(ROOT, 'src/store/myopStore.ts'));
const adminAuthStore  = safeRead(resolve(ROOT, 'src/store/adminAuthStore.ts'));
const adminPortal     = safeRead(resolve(ROOT, 'src/views/AdminPortal.tsx'));
const rootLayout      = safeRead(resolve(ROOT, 'app/layout.tsx'));
const pkgJson         = safeRead(resolve(ROOT, 'package.json'));
const robotsTxt       = safeRead(resolve(ROOT, 'public/robots.txt'));
const overviewDoc     = safeRead(resolve(ROOT, 'PLATFORM_OVERVIEW.md'));
const migsDir         = resolve(ROOT, 'supabase/migrations');

function migExists(pattern) {
  if (!existsSync(migsDir)) return false;
  const re = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return readdirSync(migsDir).some(f => re.test(f));
}

function migContent(namePattern) {
  if (!existsSync(migsDir)) return '';
  const re = typeof namePattern === 'string' ? new RegExp(namePattern) : namePattern;
  const file = readdirSync(migsDir).find(f => re.test(f));
  return file ? safeRead(resolve(migsDir, file)) : '';
}

// ═════════════════════════════════════════════════════════════════════════════
// CHECKS
// ═════════════════════════════════════════════════════════════════════════════

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║         PLATFORM TRUTH CHECK — reliance.tajallis.com.pk     ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

// ── 1. Cart persistence ───────────────────────────────────────────────────────
section('Cart Store');

const cartUsesPersist = cartStore.includes("from 'zustand/middleware'") && cartStore.includes('persist(');
check('cartStore imports persist middleware', cartUsesPersist,
  cartUsesPersist ? "persist() wrapping confirmed" : "no persist() found — cart resets on refresh");

const cartStorageName = cartStore.match(/name:\s*['"]([^'"]+)['"]/)?.[1];
check('cartStore has named storage key', !!cartStorageName,
  cartStorageName ? `localStorage key = "${cartStorageName}"` : 'name: key missing from persist config');

const compareUsesPersist = compareStore.includes('persist(');
check('compareStore uses persist middleware', compareUsesPersist,
  compareUsesPersist ? 'Compare list survives refresh' : 'compareStore has no persist — compare list resets on refresh');

const myopUsesPersist = myopStore.includes('persist(');
check('myopStore uses persist middleware', myopUsesPersist,
  myopUsesPersist ? 'Package builder survives navigation and refresh' : 'myopStore has no persist — MYOP state lost on refresh');

// Check that non-struck prose doesn't make the stale claim (struck-through ~~text~~ is resolved, not stale)
const cartProse = overviewDoc.replace(/~~[^~]+~~/g, '');
const docSaysNoPersist = cartProse.includes('does not persist') || cartProse.includes('no persistence') || cartProse.includes('cart resets');
check('PLATFORM_OVERVIEW.md no longer claims cart does not persist', !docSaysNoPersist,
  docSaysNoPersist ? 'Doc still says cart has no persistence — update the Known Gaps section' : 'Doc is consistent');

// ── 2. Admin authentication ───────────────────────────────────────────────────
section('Admin Authentication');

const adminUsesStaffAuth = adminAuthStore.includes('staff_members') && adminAuthStore.includes('supabase.auth');
check('Admin uses Supabase staff_members auth (not env password gate)', adminUsesStaffAuth,
  adminUsesStaffAuth ? 'DB-backed staff auth confirmed' : 'staff_members table lookup not found in adminAuthStore');

const adminPortalUsesOldPass = adminPortal.includes('VITE_ADMIN_PASS') && !adminPortal.includes('useAdminAuthStore');
check('AdminPortal.tsx is NOT using legacy VITE_ADMIN_PASS gate', !adminPortalUsesOldPass,
  adminPortalUsesOldPass
    ? 'VITE_ADMIN_PASS still present and useAdminAuthStore absent — password gate still active'
    : 'Legacy password gate not sole auth path');

const staffRoles = adminAuthStore.match(/StaffRole\s*=\s*([^;]+)/)?.[1] ?? '';
check('StaffRole type is defined with granular roles', staffRoles.includes('owner') && staffRoles.includes('finance'),
  staffRoles ? `Roles: ${staffRoles.trim()}` : 'StaffRole type not found');

const staffMigExists = migExists(/staff_members/);
check('Migration for staff_members table exists', staffMigExists,
  staffMigExists ? 'Found 20260525_staff_members.sql or similar' : 'No migration file matching staff_members');

// Stale claim: "Password: `VITE_ADMIN_PASS`" or "fallback: `reliance2025`" as an active gate description
const docSaysOldAuth = overviewDoc.match(/Password:\s*`VITE_ADMIN_PASS`/) || overviewDoc.match(/fallback:\s*`reliance2025`/);
check('PLATFORM_OVERVIEW.md describes new staff auth (not just password)', !docSaysOldAuth,
  docSaysOldAuth ? 'Doc still describes admin as env-password-only — update admin section' : 'Doc is consistent');

// ── 3. Framework & Sitemap ────────────────────────────────────────────────────
section('Framework (Next.js 14)');

const isNextJs = pkgJson.includes('"next"') && pkgJson.includes('"next dev"') || pkgJson.includes('"dev": "next dev"');
check('Project uses Next.js (not Vite/CRA)', isNextJs,
  isNextJs ? 'next dependency + next dev script confirmed' : 'No Next.js found — framework check failed');

const appLayoutExists = existsSync(resolve(ROOT, 'app/layout.tsx'));
check('app/layout.tsx exists (Next.js App Router root layout)', appLayoutExists,
  appLayoutExists ? 'App Router confirmed' : 'No app/layout.tsx — may not be using App Router');

const hasNoReactHelmet = !pkgJson.includes('react-helmet');
check('react-helmet-async NOT in dependencies (Next.js metadata API used instead)', hasNoReactHelmet,
  hasNoReactHelmet ? 'Correct — Next.js metadata API is the SEO mechanism' : 'react-helmet is in package.json — confirm it is unused');

const layoutHasLocalBusiness = rootLayout.includes('LocalBusiness') && rootLayout.includes('application/ld+json');
check('app/layout.tsx injects LocalBusiness JSON-LD schema', layoutHasLocalBusiness,
  layoutHasLocalBusiness ? 'LocalBusiness schema present' : 'LocalBusiness schema missing from root layout');

const layoutHasPlausible = rootLayout.includes('plausible.io');
check('app/layout.tsx has Plausible analytics script', layoutHasPlausible,
  layoutHasPlausible ? 'Plausible confirmed' : 'Plausible script missing from layout');

const docSaysNextJs = overviewDoc.includes('Next.js 14') || overviewDoc.includes('Next.js');
check('PLATFORM_OVERVIEW.md describes Next.js (not Vite/SPA)', docSaysNextJs,
  docSaysNextJs ? 'Doc is consistent' : 'Doc still says Vite/React Router — update Section 2');

section('Sitemap');

const nativeSitemapExists = existsSync(resolve(ROOT, 'app/sitemap.ts'));
check('app/sitemap.ts exists (Next.js native sitemap generation)', nativeSitemapExists,
  nativeSitemapExists ? 'Dynamic sitemap via Next.js MetadataRoute.Sitemap confirmed' : 'No app/sitemap.ts — sitemap may be static only');

const sitemapFetchesProducts = nativeSitemapExists &&
  safeRead(resolve(ROOT, 'app/sitemap.ts')).includes('getProducts');
check('app/sitemap.ts fetches live product slugs from DB', sitemapFetchesProducts,
  sitemapFetchesProducts ? 'Product slugs included in sitemap' : 'sitemap.ts does not call getProducts — product pages may be missing from sitemap');

const robotsSitemapDirective = robotsTxt.match(/Sitemap:\s*(\S+)/)?.[1] ?? '';
const robotsSitemapIsCanonical = robotsSitemapDirective === 'https://reliance.tajallis.com.pk/sitemap.xml';
check('robots.txt Sitemap: directive points to canonical /sitemap.xml (not /api/sitemap.xml)', robotsSitemapIsCanonical,
  robotsSitemapDirective || 'Sitemap directive missing');

const vercelJson = safeRead(resolve(ROOT, 'vercel.json'));
const vercelHasSitemapRewrite = vercelJson.includes('/sitemap.xml') && vercelJson.includes('/api/sitemap.xml');
check('vercel.json does NOT intercept /sitemap.xml → /api/sitemap.xml', !vercelHasSitemapRewrite,
  vercelHasSitemapRewrite ? 'vercel.json rewrite is bypassing app/sitemap.ts — remove it' : 'No rewrite conflict — Next.js native sitemap is served');

const legacySitemapJs = safeRead(resolve(ROOT, 'api/sitemap.xml.js'));
const legacySitemapIsRedirect = legacySitemapJs.includes('308') || legacySitemapJs.includes('redirect') || legacySitemapJs.includes('RETIRED');
check('api/sitemap.xml.js is retired (redirect or stub, not canonical)', legacySitemapIsRedirect,
  legacySitemapIsRedirect ? 'Legacy sitemap correctly redirects to /sitemap.xml' : 'api/sitemap.xml.js still serves XML — two live sitemaps conflict');

const ogMetaGone = !existsSync(resolve(ROOT, 'api/og-meta.js'));
check('api/og-meta.js deleted (SPA-era, redundant with Next.js SSR)', ogMetaGone,
  ogMetaGone ? 'File deleted — Next.js generateMetadata serves OG tags to all clients including bots' : 'File still present — delete it; middleware.js was its only caller and that is also deleted');

const middlewareGone = !existsSync(resolve(ROOT, 'middleware.js'));
check('middleware.js deleted (SPA-era social-bot intercept, counterproductive with SSR)', middlewareGone,
  middlewareGone ? 'File deleted — Next.js SSR serves complete HTML to social bots directly' : 'File still present — SPA-era Edge Middleware intercepts social bots and replaces SSR output with simpler template; delete it');

// ── 4. Admin tabs ─────────────────────────────────────────────────────────────
section('Admin Portal Tabs');

const hasOpsTab = adminPortal.includes("tab === 'ops'") || adminPortal.includes('"ops"');
check("/admin#ops tab exists in src/views/AdminPortal.tsx", hasOpsTab,
  hasOpsTab ? 'OpsQueueTab rendering confirmed' : 'ops tab not found — either missing or uses different key');

const hasReferralsTab = adminPortal.includes("tab === 'referrals'") || adminPortal.includes('"referrals"');
check("/admin#referrals tab exists in AdminPortal.tsx", hasReferralsTab,
  hasReferralsTab ? 'ReferralAdminTab rendering confirmed' : 'referrals tab not found');

const hasReviewsTab = adminPortal.includes("tab === 'reviews'") || adminPortal.includes('"reviews"');
check("/admin#reviews tab exists in AdminPortal.tsx", hasReviewsTab,
  hasReviewsTab ? 'Reviews moderation tab confirmed' : 'reviews tab not found');

const hasLifecycleTab = adminPortal.includes("tab === 'lifecycle'");
check("/admin#lifecycle tab exists in AdminPortal.tsx", hasLifecycleTab,
  hasLifecycleTab ? 'LifecycleAdmin confirmed' : 'lifecycle tab not found');

const hasCompatibilityTab = adminPortal.includes("tab === 'compatibility'");
check("/admin#compatibility tab exists in AdminPortal.tsx", hasCompatibilityTab,
  hasCompatibilityTab ? 'CompatibilityReviewTab confirmed' : 'compatibility tab not found — may still be a gap');

// ── 5. Database migrations ────────────────────────────────────────────────────
section('Database Migrations (files present)');

const checks = [
  ['wa_message_log',            /wa_message_log/],
  ['installment_applications',  /installment_applications/],
  ['review_moderation',         /review_moderation/],
  ['staff_members',             /staff_members/],
  ['lifecycle_engine',          /lifecycle_engine/],
  ['bundle_seed',               /bundle_seed/],
  ['customer_portal_tables',    /customer_portal_tables/],
  ['bi_tables',                 /bi_tables/],
  ['referral_admin_rls',        /referral_admin_rls/],
];

for (const [name, re] of checks) {
  const found = migExists(re);
  check(`Migration exists: ${name}`, found,
    found ? '' : `No migration file matching /${re.source}/ — may not be deployed`);
}

// ── 6. Review moderation structure ───────────────────────────────────────────
section('Review Moderation');

const reviewMig = migContent(/review_moderation/);
const reviewHasStatus = reviewMig.includes('status') && reviewMig.includes("'pending'");
check('review_moderation migration adds status column to reviews', reviewHasStatus,
  reviewHasStatus ? "status in ('pending','approved','rejected')" : 'status column not found in migration');

const reviewHasBackfill = reviewMig.includes("set status = 'approved'");
check('Existing reviews back-filled as approved', reviewHasBackfill,
  reviewHasBackfill ? 'Back-fill UPDATE confirmed — no content disappears on deploy' : 'Back-fill missing — existing reviews will be hidden on deploy');

const apiTs = safeRead(resolve(ROOT, 'src/lib/api.ts'));
const hasFeaturedReviewsFn = apiTs.includes('getFeaturedReviews') && apiTs.includes("eq('is_featured', true)");
check('getFeaturedReviews() fetches DB reviews for homepage', hasFeaturedReviewsFn,
  hasFeaturedReviewsFn ? "Queries reviews WHERE status='approved' AND is_featured=true" : 'getFeaturedReviews not wired to DB — homepage still hardcoded');

const homeTsx = safeRead(resolve(ROOT, 'src/views/Home.tsx'));
const homeFetchesReviews = homeTsx.includes('getFeaturedReviews') && homeTsx.includes('liveReviews');
check('Home.tsx calls getFeaturedReviews and uses liveReviews state', homeFetchesReviews,
  homeFetchesReviews ? 'DB-driven with hardcoded REVIEWS constant as fallback' : 'Home.tsx not wired — homepage renders static reviews only');

const homepageMig = migContent(/reviews_homepage/);
const homepageMigHasServiceLabel = homepageMig.includes('service_label');
check('reviews_homepage migration adds service_label column', homepageMigHasServiceLabel,
  homepageMigHasServiceLabel ? 'service_label text column confirmed' : 'service_label missing from migration');

// ── 7. wa_message_log structure ───────────────────────────────────────────────
section('WhatsApp Message Log');

const waMig = migContent(/wa_message_log/);
const waHasTable  = waMig.includes('create table') && waMig.includes('wa_message_log');
const waHasRLS    = waMig.includes('enable row level security');
check('wa_message_log table definition present', waHasTable, waHasTable ? '' : 'Table DDL missing');
check('wa_message_log has RLS enabled', waHasRLS, waHasRLS ? '' : 'RLS not enabled — all staff can read/write without restriction');

// ── 8. installment_applications structure ─────────────────────────────────────
section('Installment Applications');

const instMig = migContent(/installment_applications/);
const instHasTable = instMig.includes('create table') && instMig.includes('installment_applications');
const instHasCNIC  = instMig.includes('customer_cnic') || instMig.includes('cnic');
check('installment_applications table definition present', instHasTable, instHasTable ? '' : 'Table DDL missing');
check('installment_applications includes CNIC fields', instHasCNIC, instHasCNIC ? '' : 'CNIC fields missing — required for credit check workflow');

// ═════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

const failures = results.filter(r => r.pass === false);
const warnings = results.filter(r => r.pass === 'warn');
const passes   = results.filter(r => r.pass === true);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`  ${passes.length} passed  ·  ${warnings.length} warnings  ·  ${failures.length} failed`);
console.log('══════════════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\nACTION REQUIRED:');
  for (const f of failures) {
    console.log(`  ✗ ${f.label}`);
    if (f.detail) console.log(`      ${f.detail}`);
  }
  console.log('');
  process.exit(1);
} else {
  console.log('\n  All checks passed. PLATFORM_OVERVIEW.md is consistent with the codebase.\n');
  process.exit(0);
}
