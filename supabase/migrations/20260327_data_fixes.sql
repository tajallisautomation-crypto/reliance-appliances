-- ═══════════════════════════════════════════════════════════════
-- DATA FIXES — 2026-03-27
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. CROWN INVERTER DUPLICATES
--    Strategy: for each duplicate pair keep the row with the
--    higher cash_floor; merge gallery_urls from both; delete the
--    lower-priced row.
-- ──────────────────────────────────────────────────────────────

-- Preview duplicates first (run this SELECT before the DELETEs):
/*
SELECT brand, model, simplified_name, cash_floor, id
FROM   products
WHERE  brand ILIKE '%crown%'
  AND  category ILIKE '%solar inverter%'
ORDER  BY model, cash_floor DESC;
*/

-- Merge Crown inverter duplicates
DO $$
DECLARE
  r RECORD;
  keeper_id   text;
  dropper_id  text;
  merged_gallery jsonb;
BEGIN
  -- Loop over every model that has more than one Crown inverter row
  FOR r IN
    SELECT model, MAX(cash_floor) AS max_price
    FROM   products
    WHERE  brand ILIKE '%crown%'
      AND  category ILIKE '%solar inverter%'
    GROUP  BY model
    HAVING COUNT(*) > 1
  LOOP
    -- Identify the row to KEEP (highest price) and the one to DROP
    SELECT id INTO keeper_id
    FROM   products
    WHERE  brand ILIKE '%crown%'
      AND  category ILIKE '%solar inverter%'
      AND  model = r.model
    ORDER  BY cash_floor DESC
    LIMIT  1;

    SELECT id INTO dropper_id
    FROM   products
    WHERE  brand ILIKE '%crown%'
      AND  category ILIKE '%solar inverter%'
      AND  model = r.model
      AND  id <> keeper_id
    ORDER  BY cash_floor ASC
    LIMIT  1;

    -- Merge gallery_urls: union of both rows, de-duplicated
    SELECT COALESCE(
      (SELECT gallery_urls FROM products WHERE id = keeper_id),
      '[]'::jsonb
    ) ||
    COALESCE(
      (SELECT gallery_urls FROM products WHERE id = dropper_id),
      '[]'::jsonb
    )
    INTO merged_gallery;

    -- Remove duplicate URLs
    merged_gallery := (
      SELECT jsonb_agg(DISTINCT url)
      FROM   jsonb_array_elements_text(merged_gallery) AS url
    );

    -- Use thumbnail from dropper if keeper has none
    UPDATE products
    SET    gallery_urls = merged_gallery,
           thumbnail_url = COALESCE(
             NULLIF(thumbnail_url, ''),
             (SELECT NULLIF(thumbnail_url,'') FROM products WHERE id = dropper_id)
           )
    WHERE  id = keeper_id;

    -- Delete the duplicate
    DELETE FROM products WHERE id = dropper_id;

    RAISE NOTICE 'Crown inverter %: kept %, deleted %', r.model, keeper_id, dropper_id;
  END LOOP;
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 2. CROWN BATTERY DUPLICATES
--    Same strategy as inverters.
-- ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
  keeper_id   text;
  dropper_id  text;
  merged_gallery jsonb;
BEGIN
  FOR r IN
    SELECT model, MAX(cash_floor) AS max_price
    FROM   products
    WHERE  brand ILIKE '%crown%'
      AND  category ILIKE '%solar battery%'
    GROUP  BY model
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keeper_id
    FROM   products
    WHERE  brand ILIKE '%crown%'
      AND  category ILIKE '%solar battery%'
      AND  model = r.model
    ORDER  BY cash_floor DESC
    LIMIT  1;

    SELECT id INTO dropper_id
    FROM   products
    WHERE  brand ILIKE '%crown%'
      AND  category ILIKE '%solar battery%'
      AND  model = r.model
      AND  id <> keeper_id
    ORDER  BY cash_floor ASC
    LIMIT  1;

    SELECT COALESCE(
      (SELECT gallery_urls FROM products WHERE id = keeper_id), '[]'::jsonb
    ) ||
    COALESCE(
      (SELECT gallery_urls FROM products WHERE id = dropper_id), '[]'::jsonb
    )
    INTO merged_gallery;

    merged_gallery := (
      SELECT jsonb_agg(DISTINCT url)
      FROM   jsonb_array_elements_text(merged_gallery) AS url
    );

    UPDATE products
    SET    gallery_urls = merged_gallery,
           thumbnail_url = COALESCE(
             NULLIF(thumbnail_url, ''),
             (SELECT NULLIF(thumbnail_url,'') FROM products WHERE id = dropper_id)
           )
    WHERE  id = keeper_id;

    DELETE FROM products WHERE id = dropper_id;

    RAISE NOTICE 'Crown battery %: kept %, deleted %', r.model, keeper_id, dropper_id;
  END LOOP;
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 3. WRONG REFRIGERATOR CATEGORIES
--    The following models are NOT Side-by-Side or T-Door (French
--    Door) — they are standard No-Frost Top-Freezer Bottom-Ref
--    refrigerators. Fix their DB category accordingly.
-- ──────────────────────────────────────────────────────────────

-- Dawlance DTM-8365 INOX — wrongly listed as Side-by-Side
UPDATE products
SET    category = 'No-Frost Refrigerators'
WHERE  model    ILIKE '%DTM%8365%'
  AND  brand    ILIKE '%dawlance%';

-- Haier HRF-518 WIFFBGU1 — wrongly listed as Side-by-Side
UPDATE products
SET    category = 'No-Frost Refrigerators'
WHERE  model    ILIKE '%HRF-518%'
  AND  brand    ILIKE '%haier%';

-- Dawlance 7650 IOT — wrongly listed as T-Door / French Door
UPDATE products
SET    category = 'No-Frost Refrigerators'
WHERE  model    ILIKE '%7650%'
  AND  brand    ILIKE '%dawlance%';

-- Verify changes
SELECT brand, model, simplified_name, category
FROM   products
WHERE  (model ILIKE '%DTM%8365%' AND brand ILIKE '%dawlance%')
    OR (model ILIKE '%HRF-518%'  AND brand ILIKE '%haier%')
    OR (model ILIKE '%7650%'     AND brand ILIKE '%dawlance%');
