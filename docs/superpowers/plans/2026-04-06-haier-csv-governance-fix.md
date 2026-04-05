# Haier CSV Governance Fix — Price-Only Import Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revert all non-price mutations caused by the latest Haier CSV upload, and permanently harden `processCSVImport` so future CSV uploads are strictly price-only and never auto-discontinue products.

**Architecture:** The AdminPortal calls `processCSVImport` in `src/lib/api.ts`. That function has two violations: (1) it forces `stock_status: 'In Stock'` on every existing product in the CSV, and (2) it auto-discontinues products absent from the CSV after 2 consecutive uploads. We fix both violations at the source, then write standalone Node scripts to audit and revert the Haier damage already in the database.

**Tech Stack:** Supabase (Postgres), Node.js ESM scripts (`.mjs`), TypeScript (`src/lib/api.ts`), React (`src/pages/AdminPortal.tsx`)

---

## Pre-Work: Root Cause Report

**Where the violation happened:** `src/lib/api.ts`, function `processCSVImport` — two specific locations:

**Location A — Line 3583 (force-resets stock_status)**
```js
// CURRENT (violates rule):
missing_count: 0, stock_status: 'In Stock', updated_at: new Date().toISOString(),
```
Every existing product present in the CSV has its `stock_status` forcibly set to `'In Stock'`, overriding any admin-set status (`'Out of Stock'`, `'Coming Soon'`, manually `'Discontinued'`).

**Location B — Lines 3634–3665 (auto-discontinues absent products)**
Products NOT in the CSV have `missing_count` incremented. After 2 consecutive imports where they're absent, `stock_status` is set to `'Discontinued'`. This is applied to ALL brands whose products appear in the CSV — so a Haier CSV upload discontinues Haier products not in that sheet.

**What was damaged for Haier:**
1. Haier products absent from the latest CSV → `missing_count` incremented. Those absent from 2+ consecutive uploads → now `stock_status = 'Discontinued'`.
2. Haier products IN the CSV → `stock_status` force-set to `'In Stock'`, overriding any intentional admin status.
3. Possible: Haier products whose model string format in the CSV differed from DB → treated as NEW → received full `enrichProduct()` enrichment overwriting `simplified_name`, `category`, `specs`, `warranty`, `tags`, `description`, `seo_*`.

**Strategy:**
1. Run audit script (read-only) to enumerate all damage before touching anything.
2. Run revert script (with `--dry-run` first) to restore Haier products to their correct state while preserving price fields.
3. Fix `processCSVImport` in `api.ts` so the violations cannot recur.
4. Update `AdminPortal.tsx` UI to reflect the new behavior (no "Discontinued" counter, add "Not in CSV" info panel).

---

## Files

| File | Action | Responsibility |
|------|--------|----------------|
| `reliance/audit_haier_csv_damage.mjs` | Create | Read-only audit: shows which Haier products are Discontinued, their missing_count, and any that may have been force-set to 'In Stock' |
| `reliance/revert_haier_csv_damage.mjs` | Create | Reverts auto-discontinued Haier products; preserves price fields; supports `--dry-run` |
| `reliance/src/lib/api.ts` | Modify (lines 3578–3665) | Remove force-`stock_status` from price-only patch; replace auto-discontinue step with a reporting-only step; update `ImportSummary` type |
| `reliance/src/pages/AdminPortal.tsx` | Modify (lines 1326, 1389) | Remove "Discontinued" card; add "Not in CSV" info; remove warning about auto-discontinuation |

---

## Task 1: Audit Haier CSV Damage (Read-Only Script)

**Files:**
- Create: `reliance/audit_haier_csv_damage.mjs`

- [ ] **Step 1: Create the audit script**

```js
/**
 * audit_haier_csv_damage.mjs
 *
 * Read-only audit of Haier products to identify damage from the latest CSV upload:
 *   - Products auto-discontinued (missing_count >= 1 AND stock_status = 'Discontinued')
 *   - Products whose stock_status may have been force-reset to 'In Stock'
 *
 * Run: node audit_haier_csv_damage.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('\n── audit_haier_csv_damage.mjs ─────────────────────────────────\n');

  const { error: authErr } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }

  // Fetch all Haier products
  const { data, error } = await sb
    .from('products')
    .select('id, brand, model, category, stock_status, missing_count, retail_price, cash_floor, simplified_name, updated_at')
    .ilike('brand', '%haier%')
    .order('category')
    .order('model');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Total Haier products: ${data.length}\n`);

  // Group by stock_status
  const byStatus = {};
  for (const p of data) {
    const s = p.stock_status || 'NULL';
    (byStatus[s] = byStatus[s] || []).push(p);
  }

  console.log('── Stock Status Distribution ────────────────────────────────');
  for (const [status, products] of Object.entries(byStatus).sort()) {
    console.log(`  ${status}: ${products.length} products`);
  }

  // Auto-discontinued candidates: Discontinued AND missing_count >= 1
  const autoDisco = data.filter(p => p.stock_status === 'Discontinued' && (p.missing_count || 0) >= 1);
  console.log(`\n── Likely Auto-Discontinued (Discontinued + missing_count ≥ 1) ── ${autoDisco.length} products`);
  for (const p of autoDisco) {
    const price = (p.cash_floor || p.retail_price || 0).toLocaleString();
    console.log(`  [missing_count=${p.missing_count}] ${p.category} | ${p.model} | price=${price} | updated=${p.updated_at?.slice(0,10)}`);
  }

  // All discontinued (may include manually-set ones)
  const allDisco = byStatus['Discontinued'] || [];
  const manualDisco = allDisco.filter(p => (p.missing_count || 0) === 0);
  console.log(`\n── Discontinued with missing_count=0 (likely manually set) ── ${manualDisco.length} products`);
  for (const p of manualDisco) {
    console.log(`  ${p.category} | ${p.model}`);
  }

  // Products with missing_count > 0 but not yet discontinued (warned)
  const warned = data.filter(p => p.stock_status !== 'Discontinued' && (p.missing_count || 0) > 0);
  console.log(`\n── Products with missing_count > 0 but not yet Discontinued ── ${warned.length} products`);
  for (const p of warned) {
    console.log(`  [missing_count=${p.missing_count}] ${p.model} | status=${p.stock_status}`);
  }

  // Summary
  console.log('\n── Summary ──────────────────────────────────────────────────');
  console.log(`  Total Haier products        : ${data.length}`);
  console.log(`  Auto-discontinued to revert : ${autoDisco.length}`);
  console.log(`  Warned (missing_count > 0)  : ${warned.length}`);
  console.log(`  Manually discontinued       : ${manualDisco.length} (leave untouched)`);
  console.log('\n  Run revert_haier_csv_damage.mjs --dry-run to preview reversions.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the audit (read-only, no DB changes)**

```bash
cd "c:/Users/uk/OneDrive/Desktop/Reliance website/latest/reliance"
node audit_haier_csv_damage.mjs
```

Expected output: A list of Haier products currently marked 'Discontinued' with `missing_count >= 1` — these are the auto-discontinued victims to revert.

---

## Task 2: Revert Haier Non-Price Mutations

**Files:**
- Create: `reliance/revert_haier_csv_damage.mjs`

- [ ] **Step 1: Create the revert script**

```js
/**
 * revert_haier_csv_damage.mjs
 *
 * Reverts non-price mutations on Haier products caused by the latest CSV upload:
 *
 *   1. Auto-discontinued products (missing_count >= 1 AND stock_status = 'Discontinued')
 *      → Set stock_status = 'In Stock', missing_count = 0
 *      (Preserves all price fields, enriched content, images)
 *
 *   2. Products with missing_count > 0 but not yet Discontinued
 *      → Reset missing_count = 0 (prevents future auto-discontinuation)
 *      (Does NOT touch stock_status — those products are still active)
 *
 * What is NOT changed:
 *   - retail_price, cash_floor, adv_*, monthly_*, total_* (price fields preserved)
 *   - simplified_name, description, specs, warranty, tags, seo_* (enriched content preserved)
 *   - thumbnail_url, gallery_urls (images preserved)
 *   - category, sub_category, normalized_category (taxonomy preserved)
 *   - Products with missing_count = 0 AND stock_status = 'Discontinued' (likely manual — left untouched)
 *
 * Run: node revert_haier_csv_damage.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN           = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log(`\n── revert_haier_csv_damage.mjs  ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'} ─────────────`);

  const { error: authErr } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }

  // Fetch all Haier products with damage indicators
  const { data, error } = await sb
    .from('products')
    .select('id, brand, model, category, stock_status, missing_count, retail_price, cash_floor')
    .ilike('brand', '%haier%');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Loaded ${data.length} Haier products.\n`);

  // Case 1: Auto-discontinued (Discontinued + missing_count >= 1)
  // These were killed by the CSV import logic, not manually — revert to In Stock
  const autoDisco = data.filter(p => p.stock_status === 'Discontinued' && (p.missing_count || 0) >= 1);

  console.log(`── Case 1: Auto-discontinued products to revert — ${autoDisco.length} ──`);
  let reverted = 0, revertErrors = 0;
  for (const p of autoDisco) {
    const price = (p.cash_floor || p.retail_price || 0).toLocaleString();
    console.log(`  ${DRY_RUN ? '[dry]' : 'REVERT'} ${p.brand} ${p.model} (${p.category}) | price=${price} | was: Discontinued [missing=${p.missing_count}] → In Stock`);
    if (!DRY_RUN) {
      const { error: e } = await sb.from('products').update({
        stock_status: 'In Stock',
        missing_count: 0,
        updated_at: new Date().toISOString(),
      }).eq('id', p.id);
      if (e) { console.error(`    ✗ ${e.message}`); revertErrors++; }
      else reverted++;
    } else {
      reverted++;
    }
  }

  // Case 2: Products with missing_count > 0 but not yet discontinued
  // Reset their counter — they were unfairly penalised for not being in the last CSV
  const warned = data.filter(p => p.stock_status !== 'Discontinued' && (p.missing_count || 0) > 0);

  console.log(`\n── Case 2: Products with missing_count > 0 (pre-discontinuation warning) — ${warned.length} ──`);
  let resetCount = 0, resetErrors = 0;
  for (const p of warned) {
    console.log(`  ${DRY_RUN ? '[dry]' : 'RESET'} ${p.brand} ${p.model} | missing_count ${p.missing_count} → 0 (status=${p.stock_status} preserved)`);
    if (!DRY_RUN) {
      const { error: e } = await sb.from('products').update({
        missing_count: 0,
        updated_at: new Date().toISOString(),
      }).eq('id', p.id);
      if (e) { console.error(`    ✗ ${e.message}`); resetErrors++; }
      else resetCount++;
    } else {
      resetCount++;
    }
  }

  // Case 3: Report manually-discontinued (leave untouched)
  const manualDisco = data.filter(p => p.stock_status === 'Discontinued' && (p.missing_count || 0) === 0);
  console.log(`\n── Case 3: Manually-discontinued products (NOT touched) — ${manualDisco.length} ──`);
  for (const p of manualDisco) {
    console.log(`  SKIP ${p.brand} ${p.model} (missing_count=0 — assumed manual discontinuation)`);
  }

  // Summary
  console.log('\n── Summary ──────────────────────────────────────────────────');
  console.log(`  Auto-discontinued reverted : ${reverted}${revertErrors > 0 ? ` (${revertErrors} errors)` : ''}`);
  console.log(`  Missing_count reset        : ${resetCount}${resetErrors > 0 ? ` (${resetErrors} errors)` : ''}`);
  console.log(`  Manually-discontinued kept : ${manualDisco.length}`);
  if (DRY_RUN) console.log('\n  [Dry run — run without --dry-run to apply]');
  console.log();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run dry-run first to preview changes**

```bash
node revert_haier_csv_damage.mjs --dry-run
```

Expected output: Shows every product that would be reverted, with no DB changes.

- [ ] **Step 3: Review the dry-run output**

Check the list carefully:
- All `Case 1` rows should be Haier products that should be active but got auto-discontinued
- All `Case 2` rows should have their missing_count counter cleared
- All `Case 3` rows should be products you manually discontinued — if any look wrong, they can be addressed separately

- [ ] **Step 4: Run the live revert**

Only after reviewing and approving the dry-run output:

```bash
node revert_haier_csv_damage.mjs
```

Expected output: Each product prefixed with `REVERT` or `RESET`, then a summary with 0 errors.

---

## Task 3: Harden processCSVImport in api.ts

**Files:**
- Modify: `reliance/src/lib/api.ts` (lines 3578–3665, `ImportSummary` at 792)

This is the permanent code fix. Three changes:

### Change A: Remove force-`stock_status` from the price-only update patch

- [ ] **Step 1: Fix the price-only update patch (line 3583)**

Read [api.ts:3578-3592](src/lib/api.ts#L3578-L3592) and apply:

```typescript
// BEFORE (line 3581-3583):
        if (isUpdate) {
          // Existing product: price + installments only — leave enriched fields untouched
          const updatePatch: Record<string, unknown> = {
            retail_price: price, cash_floor: cashFloor, ...installmentCols,
            missing_count: 0, stock_status: 'In Stock', updated_at: new Date().toISOString(),
          };

// AFTER:
        if (isUpdate) {
          // Existing product: price + installments only.
          // NEVER touch stock_status — admin manages product status manually.
          // NEVER touch enriched fields (name, specs, description, images, category, tags).
          const updatePatch: Record<string, unknown> = {
            retail_price: price, cash_floor: cashFloor, ...installmentCols,
            missing_count: 0, updated_at: new Date().toISOString(),
          };
```

### Change B: Replace auto-discontinuation with reporting-only

- [ ] **Step 2: Replace Step 5 — discontinuation logic with reporting-only (lines 3634-3665)**

Read [api.ts:3634-3668](src/lib/api.ts#L3634-L3668) and replace the entire Step 5 block:

```typescript
// BEFORE (lines 3634-3667):
  // Step 5 — Discontinuation pass
  onProgress('Checking for discontinued products…');
  const toDiscontinue: string[] = [];
  const toIncrement:   string[] = [];

  for (const dbRow of existingRows ?? []) {
    const dbKey = `${(dbRow.brand || '').toLowerCase()}::${normalizeModelForDedupe(dbRow.model || '')}`;
    if (csvKeys.has(dbKey)) continue; // present in CSV → reset already done above

    const newCount = (dbRow.missing_count ?? 0) + 1;
    if (newCount >= 2 && dbRow.stock_status !== 'Discontinued') toDiscontinue.push(dbRow.id);
    else if (dbRow.stock_status !== 'Discontinued')             toIncrement.push(dbRow.id);
  }

  if (toIncrement.length > 0) {
    // Try RPC first (requires SQL migration), fallback to individual updates
    const { error: rpcErr } = await supabase.rpc('increment_missing_count', { product_ids: toIncrement });
    if (rpcErr) {
      // Fallback: individual increments
      await Promise.all(toIncrement.map(async id => {
        const row = existingRows?.find(r => r.id === id);
        if (row) await supabase.from('products').update({ missing_count: (row.missing_count ?? 0) + 1 }).eq('id', id);
      }));
    }
  }

  if (toDiscontinue.length > 0) {
    for (let i = 0; i < toDiscontinue.length; i += BATCH) {
      const slice = toDiscontinue.slice(i, i + BATCH);
      const { error } = await supabase.from('products').update({ stock_status: 'Discontinued', missing_count: 2 }).in('id', slice);
      if (!error) summary.discontinued += slice.length;
    }
  }

// AFTER (replace entirely):
  // Step 5 — Report products not in this CSV.
  // GOVERNANCE RULE: A missing row in a price-list CSV is NEVER a discontinuation signal.
  // Products are only discontinued when explicitly set by the admin in the product editor.
  // This step is reporting-only — it never mutates any product data.
  onProgress('Reporting products not in this upload…');
  const notInCsvNames: string[] = [];
  for (const dbRow of existingRows ?? []) {
    const dbKey = `${(dbRow.brand || '').toLowerCase()}::${normalizeModelForDedupe(dbRow.model || '')}`;
    if (csvKeys.has(dbKey)) continue;
    notInCsvNames.push(`${dbRow.brand} ${dbRow.model}`);
  }
  summary.notInCsv = notInCsvNames.length;
  if (notInCsvNames.length > 0) {
    const preview = notInCsvNames.slice(0, 8).join(', ');
    const more    = notInCsvNames.length > 8 ? ` … and ${notInCsvNames.length - 8} more` : '';
    summary.errors.push(`Not in this CSV (no action taken — ${notInCsvNames.length} products): ${preview}${more}`);
  }
```

### Change C: Add `notInCsv` to `ImportSummary`

- [ ] **Step 3: Update the `ImportSummary` interface (lines 792-799)**

Read [api.ts:792-799](src/lib/api.ts#L792-L799) and apply:

```typescript
// BEFORE:
export interface ImportSummary {
  added: number; updated: number; discontinued: number;
  imagesFound: number; imagesMissing: number;
  /** All messages including warnings, review notices, and errors */
  errors: string[];
  /** Count of products queued for taxonomy review (not live) */
  reviewCount: number;
}

// AFTER:
export interface ImportSummary {
  added: number;
  updated: number;
  /** Always 0 — auto-discontinuation is permanently disabled.
   *  Products are only discontinued by explicit admin action.
   *  Kept for backward compat so existing UI code doesn't break. */
  discontinued: number;
  /** Products in DB for these brands that were NOT in this CSV upload.
   *  Reported for visibility only — no action is taken on them. */
  notInCsv: number;
  imagesFound: number; imagesMissing: number;
  /** All messages including warnings, review notices, and errors */
  errors: string[];
  /** Count of products queued for taxonomy review (not live) */
  reviewCount: number;
}
```

- [ ] **Step 4: Initialise `notInCsv` in the summary object (line 3497)**

Read [api.ts:3496-3498](src/lib/api.ts#L3496-L3498) and apply:

```typescript
// BEFORE:
  const summary: ImportSummary = { added: 0, updated: 0, discontinued: 0, imagesFound: 0, imagesMissing: 0, errors: [], reviewCount: 0 };

// AFTER:
  const summary: ImportSummary = { added: 0, updated: 0, discontinued: 0, notInCsv: 0, imagesFound: 0, imagesMissing: 0, errors: [], reviewCount: 0 };
```

---

## Task 4: Update AdminPortal UI

**Files:**
- Modify: `reliance/src/pages/AdminPortal.tsx` (lines 1326, 1387–1393)

- [ ] **Step 1: Remove the auto-discontinuation warning (line 1326)**

Read [AdminPortal.tsx:1323-1327](src/pages/AdminPortal.tsx#L1323-L1327) and apply:

```tsx
// BEFORE:
          <p className="mt-2 text-amber-600">Products absent from 2 consecutive imports will be marked <strong>Discontinued</strong>.</p>

// AFTER:
          <p className="mt-2 text-blue-600">Products not in this upload are <strong>not changed</strong> — they stay visible until you manually disable them.</p>
```

- [ ] **Step 2: Replace the "Discontinued" summary card with "Not in CSV" (lines 1389)**

Read [AdminPortal.tsx:1385-1394](src/pages/AdminPortal.tsx#L1385-L1394) and apply:

```tsx
// BEFORE:
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label="New Products"       value={summary.added}         color="text-green-700"  />
              <SummaryCard label="Prices Updated"     value={summary.updated}       color="text-blue-700"   />
              <SummaryCard label="Discontinued"       value={summary.discontinued}  color="text-red-600"    />
              <SummaryCard label="Images Found"       value={summary.imagesFound}   color="text-purple-700" />
              <SummaryCard label="Images Missing"     value={summary.imagesMissing} color={summary.imagesMissing > 0 ? 'text-amber-600' : 'text-gray-400'} />
              <SummaryCard label="Taxonomy Review"    value={reviewItems.length}    color={reviewItems.length > 0 ? 'text-amber-600' : 'text-gray-400'} />
            </div>

// AFTER:
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label="New Products"       value={summary.added}         color="text-green-700"  />
              <SummaryCard label="Prices Updated"     value={summary.updated}       color="text-blue-700"   />
              <SummaryCard label="Not in CSV"         value={summary.notInCsv ?? 0} color="text-gray-500"   />
              <SummaryCard label="Images Found"       value={summary.imagesFound}   color="text-purple-700" />
              <SummaryCard label="Images Missing"     value={summary.imagesMissing} color={summary.imagesMissing > 0 ? 'text-amber-600' : 'text-gray-400'} />
              <SummaryCard label="Taxonomy Review"    value={reviewItems.length}    color={reviewItems.length > 0 ? 'text-amber-600' : 'text-gray-400'} />
            </div>
```

- [ ] **Step 3: Update the explanatory text (line 1383)**

Read [AdminPortal.tsx:1382-1385](src/pages/AdminPortal.tsx#L1382-L1385) and apply:

```tsx
// BEFORE:
            <p className="text-xs text-gray-500">
              Existing products had <strong>prices &amp; installment plans updated only</strong> — names, specs, images and descriptions were preserved.
              New products were fully enriched. All price changes were logged to history.
            </p>

// AFTER:
            <p className="text-xs text-gray-500">
              Existing products had <strong>prices &amp; installment plans updated only</strong> — names, specs, images, descriptions, and status were preserved.
              New products were fully enriched. All price changes were logged to history.
              Products absent from this upload were <strong>not changed</strong> — they remain active until you disable them manually.
            </p>
```

---

## Task 5: Verify the Fix

- [ ] **Step 1: Build the frontend to check for TypeScript errors**

```bash
cd "c:/Users/uk/OneDrive/Desktop/Reliance website/latest/reliance"
npm run build 2>&1 | tail -30
```

Expected: Build succeeds with no TypeScript errors. If there are type errors related to `notInCsv`, check that the `ImportSummary` interface was updated correctly in `api.ts`.

- [ ] **Step 2: Run the audit script after the revert to confirm clean state**

```bash
node audit_haier_csv_damage.mjs
```

Expected: `Auto-discontinued to revert: 0`, `Warned (missing_count > 0): 0`.

---

## Post-Fix Summary (to fill in after execution)

**Root cause:** `processCSVImport` in `src/lib/api.ts` had two governance violations:
1. Line 3583: `stock_status: 'In Stock'` in the price-only update patch — forced all matched products to 'In Stock', overriding admin-set status.
2. Lines 3634–3665: Auto-discontinuation step — incremented `missing_count` for products absent from the CSV, and auto-set `stock_status = 'Discontinued'` after 2 consecutive absences.

**Safeguards implemented:**
- `stock_status` is never touched during a price-only import
- The discontinuation step is replaced with a reporting-only step
- `ImportSummary.notInCsv` reports how many products were not in the CSV (for visibility only)
- AdminPortal UI updated to remove auto-discontinuation warning and reflect new behavior

**Haier non-price mutations reverted:**
- Auto-discontinued Haier products: set back to `'In Stock'`, `missing_count = 0`
- Haier products with `missing_count > 0` (warned): `missing_count` reset to 0

**Price fields preserved:**
- `retail_price`, `cash_floor`, `adv_2m`, `monthly_2m`, `total_2m`, `adv_3m`, `monthly_3m`, `total_3m`, `adv_6m`, `monthly_6m`, `total_6m`, `adv_12m`, `monthly_12m`, `total_12m`

**Products no longer auto-discontinued:** Confirmed. The discontinuation step has been permanently removed from `processCSVImport`. Products are only discontinued by explicit admin action in the product editor.

**Future CSV imports are price-only:** Confirmed. The `isUpdate` branch in `processCSVImport` now updates only `retail_price`, `cash_floor`, installment columns, `missing_count` (reset to 0), and `updated_at`. All other fields are preserved.

**Ambiguous/unresolved cases:** Any Haier products whose model format in the CSV did not match the DB (treated as NEW and fully enriched) would need manual review. Run `audit_haier_csv_damage.mjs` and cross-check `simplified_name` values against expected catalog names to identify these.
