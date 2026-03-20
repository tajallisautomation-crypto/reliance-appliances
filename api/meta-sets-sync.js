/**
 * /api/meta-sets-sync
 *
 * Creates or UPDATES WhatsApp Business Catalog Product Sets so that
 * products appear under category tabs in WhatsApp Shopping.
 *
 * Key change from previous version:
 *  - Filters on custom_label_0 (plain category name, no special chars)
 *    instead of product_type — this is more reliably indexed by Meta.
 *  - UPDATES existing sets' filters (doesn't skip existing sets).
 *  - Deletes orphan sets no longer in our category list.
 *
 * Required Vercel env vars:
 *   META_ACCESS_TOKEN  — long-lived System User token from Meta Business Suite
 *   META_CATALOG_ID    — the numeric ID of your Commerce Manager catalog
 *
 * Trigger: POST /api/meta-sets-sync  (button in admin CatalogExportPanel)
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/catalog/guides/product-sets
 */

const META_API  = 'https://graph.facebook.com/v21.0';

// ── Category sets to maintain ─────────────────────────────────────────────────
// key   = exact value of custom_label_0 in the CSV feed (= p.category in DB)
// label = human-readable name shown as tab in WhatsApp
const SETS = [
  { category: 'Air Conditioners',   label: 'Air Conditioners'         },
  { category: 'Commercial AC',      label: 'Commercial Air Conditioners' },
  { category: 'Refrigerators',      label: 'Refrigerators'            },
  { category: 'Freezer',            label: 'Freezers'                 },
  { category: 'Washing Machines',   label: 'Washing Machines'         },
  { category: 'Water Dispensers',   label: 'Water Dispensers'         },
  { category: 'Televisions',        label: 'Televisions & LEDs'       },
  { category: 'Vacuum Cleaners',    label: 'Vacuum Cleaners'          },
  { category: 'Kitchen Appliances', label: 'Kitchen Appliances'       },
  { category: 'Small Appliances',   label: 'Small Appliances'         },
  { category: 'Solar Solutions',    label: 'Solar Solutions'          },
];

// Build filter JSON for a given category
// Uses custom_label_0 (eq = exact match) — most reliably indexed by Meta.
function buildFilter(category) {
  return JSON.stringify({
    custom_label_0: { eq: category },
  });
}

async function metaGet(path, token) {
  const url = `${META_API}/${path}&access_token=${token}`;
  const r   = await fetch(url);
  return r.json();
}

async function metaPost(path, body, token) {
  const r = await fetch(`${META_API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...body, access_token: token }).toString(),
  });
  return r.json();
}

async function metaDelete(path, token) {
  const r = await fetch(`${META_API}/${path}?access_token=${token}`, {
    method: 'DELETE',
  });
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const token     = process.env.META_ACCESS_TOKEN;
  const catalogId = process.env.META_CATALOG_ID;

  if (!token || !catalogId) {
    res.status(500).json({
      error: 'META_ACCESS_TOKEN and META_CATALOG_ID environment variables are required.',
      help:  'Add them in Vercel → Project Settings → Environment Variables.',
    });
    return;
  }

  // ── 1. Fetch all existing sets ─────────────────────────────────────────────
  let existingSets = [];
  try {
    // Paginate if needed (limit 100 should cover us)
    const data = await metaGet(
      `${catalogId}/product_sets?fields=id,name,filter&limit=100`,
      token
    );
    if (data.error) throw new Error(data.error.message);
    existingSets = data.data || [];
  } catch (err) {
    res.status(502).json({ error: `Failed to fetch existing sets: ${err.message}` });
    return;
  }

  // Index by name for quick lookup
  const byName = new Map(existingSets.map(s => [s.name, s]));
  const wantedLabels = new Set(SETS.map(s => s.label));

  const results = { created: [], updated: [], deleted: [], failed: [] };

  // ── 2. Create or UPDATE each desired set ──────────────────────────────────
  for (const { category, label } of SETS) {
    const filter       = buildFilter(category);
    const existing     = byName.get(label);

    if (existing) {
      // UPDATE: always re-apply the filter to ensure it's correct
      const data = await metaPost(
        `${existing.id}`,
        { name: label, filter },
        token
      );
      if (data.error) {
        results.failed.push({ name: label, op: 'update', error: data.error.message });
      } else {
        results.updated.push({ name: label, id: existing.id });
      }
    } else {
      // CREATE
      const data = await metaPost(
        `${catalogId}/product_sets`,
        { name: label, filter },
        token
      );
      if (data.error) {
        results.failed.push({ name: label, op: 'create', error: data.error.message });
      } else {
        results.created.push({ name: label, id: data.id });
      }
    }
  }

  // ── 3. Delete orphan sets (exist in Meta but not in our list) ─────────────
  for (const s of existingSets) {
    if (!wantedLabels.has(s.name)) {
      const data = await metaDelete(`${s.id}`, token);
      if (data.error) {
        results.failed.push({ name: s.name, op: 'delete', error: data.error.message });
      } else {
        results.deleted.push({ name: s.name, id: s.id });
      }
    }
  }

  res.status(200).json({
    catalogId,
    note: 'Sets filter on custom_label_0 (exact match). Ensure the catalog feed has been re-crawled by Meta after any changes.',
    created: results.created.length,
    updated: results.updated.length,
    deleted: results.deleted.length,
    failed:  results.failed.length,
    details: results,
  });
}
