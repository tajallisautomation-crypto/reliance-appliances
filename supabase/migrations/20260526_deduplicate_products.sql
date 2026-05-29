-- ============================================================
-- CLEANUP: Remove duplicate products matched on brand + simplified_name
-- Keeps the most recently updated row per group (latest pricing/data).
-- Tie-break: shorter slug (canonical model code).
--
-- HOW TO USE:
--   1. Run as-is — preview shown, transaction rolls back safely.
--   2. Verify the preview matches what 20260526_find_duplicate_products.sql showed.
--   3. Change ROLLBACK → COMMIT on the last line and re-run to execute.
-- ============================================================

BEGIN;

-- ── Pick one keeper per duplicate group ──────────────────────
WITH keepers AS (
  SELECT DISTINCT ON (LOWER(brand), LOWER(simplified_name))
    id AS keeper_id
  FROM products
  WHERE EXISTS (
    SELECT 1 FROM products p2
    WHERE  p2.id <> products.id
      AND  LOWER(p2.brand)           = LOWER(products.brand)
      AND  LOWER(p2.simplified_name) = LOWER(products.simplified_name)
  )
  ORDER BY
    LOWER(brand),
    LOWER(simplified_name),
    updated_at   DESC,   -- most recently updated wins
    LENGTH(slug) ASC     -- tie-break: shorter/canonical slug
),

-- ── All non-keeper rows in those groups ──────────────────────
to_delete AS (
  SELECT p.id, p.slug, p.brand, p.model, p.simplified_name,
         p.stock_status, p.retail_price::numeric, p.updated_at
  FROM products p
  WHERE EXISTS (
    SELECT 1 FROM products p2
    WHERE  p2.id <> p.id
      AND  LOWER(p2.brand)           = LOWER(p.brand)
      AND  LOWER(p2.simplified_name) = LOWER(p.simplified_name)
  )
  AND p.id NOT IN (SELECT keeper_id FROM keepers)
)

-- ── Preview ───────────────────────────────────────────────────
SELECT id, slug, brand, model, simplified_name,
       stock_status, retail_price, updated_at
FROM   to_delete
ORDER  BY brand, simplified_name;

-- ── Delete ────────────────────────────────────────────────────
DELETE FROM products
WHERE id IN (
  WITH keepers AS (
    SELECT DISTINCT ON (LOWER(brand), LOWER(simplified_name))
      id AS keeper_id
    FROM products
    WHERE EXISTS (
      SELECT 1 FROM products p2
      WHERE  p2.id <> products.id
        AND  LOWER(p2.brand)           = LOWER(products.brand)
        AND  LOWER(p2.simplified_name) = LOWER(products.simplified_name)
    )
    ORDER BY
      LOWER(brand),
      LOWER(simplified_name),
      updated_at   DESC,
      LENGTH(slug) ASC
  )
  SELECT p.id
  FROM products p
  WHERE EXISTS (
    SELECT 1 FROM products p2
    WHERE  p2.id <> p.id
      AND  LOWER(p2.brand)           = LOWER(p.brand)
      AND  LOWER(p2.simplified_name) = LOWER(p.simplified_name)
  )
  AND p.id NOT IN (SELECT keeper_id FROM keepers)
);

-- Change to COMMIT once the preview looks correct
ROLLBACK;
