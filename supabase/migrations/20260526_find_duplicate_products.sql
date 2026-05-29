-- ============================================================
-- DIAGNOSTIC: Find ALL duplicate products by simplified_name
-- Groups by brand + simplified_name — the canonical match key.
-- Shows every product in each duplicate group as a separate row.
-- ============================================================

-- Step 1: All products that share a brand + simplified_name with another product
SELECT
  LOWER(p.brand)      AS brand,
  p.simplified_name,
  p.id,
  p.slug,
  p.model,
  p.stock_status,
  p.retail_price::numeric,
  p.updated_at
FROM products p
WHERE EXISTS (
  SELECT 1 FROM products p2
  WHERE  p2.id <> p.id
    AND  LOWER(p2.brand) = LOWER(p.brand)
    AND  LOWER(p2.simplified_name) = LOWER(p.simplified_name)
)
ORDER BY LOWER(p.brand), LOWER(p.simplified_name), p.updated_at ASC;


-- Step 2: Summary — how many duplicate groups and total rows affected
SELECT
  COUNT(DISTINCT LOWER(brand) || '|' || LOWER(simplified_name))  AS duplicate_groups,
  COUNT(*)                                                         AS total_rows_involved
FROM products p
WHERE EXISTS (
  SELECT 1 FROM products p2
  WHERE  p2.id <> p.id
    AND  LOWER(p2.brand) = LOWER(p.brand)
    AND  LOWER(p2.simplified_name) = LOWER(p.simplified_name)
);
