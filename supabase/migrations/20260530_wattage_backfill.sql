-- ============================================================
-- Power consumption (wattage) backfill — 2026-05-30
--
-- 1. Add wattage_is_estimated flag (true = fallback/category default used,
--    false = exact value extracted from product specs or name).
-- 2. Extract wattage from existing specs JSON where possible.
-- 3. Fill remaining products with category/subcategory defaults.
--
-- Run order: safe to re-run. Only updates NULL rows.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS wattage_is_estimated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.wattage_is_estimated IS
  'true = category/type default used; false = extracted from product specs or name.';

-- ── Step 1: Extract from specs JSON ─────────────────────────────────────────
-- We look for these spec keys (case-insensitive):
--   "Power Consumption", "Power", "Wattage", "Rated Power", "Input Power",
--   "Maximum Power", "Power Input", "Running Watts", "Rated Wattage"
-- Value patterns: "1500W", "1.5kW", "1500 W", "1500 Watts"

UPDATE public.products
SET
  power_consumption_w  = CASE
    WHEN spec_val ~ '^\d+(\.\d+)?\s*kW?$' THEN
      round((regexp_replace(spec_val, '[^\d.]', '', 'g'))::numeric * 1000)::integer
    WHEN spec_val ~ '^\d+(\.\d+)?\s*[Ww](atts?)?$' THEN
      round((regexp_replace(spec_val, '[^\d.]', '', 'g'))::numeric)::integer
    ELSE NULL
  END,
  wattage_is_estimated = false
FROM (
  SELECT
    p.id,
    (
      SELECT val
      FROM jsonb_each_text(p.specs) AS kv(key, val)
      WHERE kv.key ~* '(^|\s)(power consumption|power input|rated power|input power|maximum power|running watts?|rated wattage|wattage|^power$)($|\s)'
        AND kv.val ~ '\d'
      ORDER BY
        CASE
          WHEN kv.key ~* 'power consumption' THEN 1
          WHEN kv.key ~* 'rated power'       THEN 2
          WHEN kv.key ~* 'wattage'           THEN 3
          WHEN kv.key ~* 'input power'       THEN 4
          WHEN kv.key ~* 'maximum power'     THEN 5
          ELSE 6
        END
      LIMIT 1
    ) AS spec_val
  FROM public.products p
  WHERE p.power_consumption_w IS NULL
    AND p.specs IS NOT NULL
    AND p.specs != '{}'::jsonb
) AS extracted
WHERE products.id = extracted.id
  AND extracted.spec_val IS NOT NULL
  AND (
    extracted.spec_val ~ '\d+(\.\d+)?\s*kW?$'
    OR extracted.spec_val ~ '\d+(\.\d+)?\s*[Ww](atts?)?$'
  );

-- ── Step 2: Extract wattage from product name / simplified_name ──────────────
-- Handles patterns like: "1500W", "1.5kW", "750 W", "2000W"
-- Only runs if not already populated by Step 1.

UPDATE public.products
SET
  power_consumption_w  = CASE
    WHEN (simplified_name || ' ' || model) ~ '\d+(\.\d+)?\s*kW\b' THEN
      round((regexp_replace(
        (regexp_match(simplified_name || ' ' || model, '(\d+(?:\.\d+)?)\s*kW\b'))[1],
        '[^\d.]', '', 'g'
      ))::numeric * 1000)::integer
    WHEN (simplified_name || ' ' || model) ~ '\d+\s*W\b' THEN
      round((regexp_replace(
        (regexp_match(simplified_name || ' ' || model, '(\d+)\s*W\b'))[1],
        '[^\d.]', '', 'g'
      ))::numeric)::integer
    ELSE NULL
  END,
  wattage_is_estimated = false
WHERE power_consumption_w IS NULL
  AND (
    (simplified_name || ' ' || model) ~ '\d+(\.\d+)?\s*kW\b'
    OR (simplified_name || ' ' || model) ~ '\d+\s*W\b'
  );

-- ── Step 3: Category/subcategory fallback defaults ────────────────────────────
-- Applied only where still NULL. Marked as estimated.
-- Sources: PAK manufacturer datasheets + IEC 62087 measurement standards.
-- AC values are minimum (start-up) load for inverter models.
-- Non-inverter ACs have higher draw — separate rows below.

UPDATE public.products
SET
  power_consumption_w  = defaults.watts,
  wattage_is_estimated = true
FROM (VALUES
  -- ── Air Conditioners ── inverter ACs (lower draw)
  ('Air Conditioners', '0.75 ton',  550),
  ('Air Conditioners', '1 ton',     730),
  ('Air Conditioners', '1.5 ton',   1100),
  ('Air Conditioners', '2 ton',     1600),
  ('Air Conditioners', '2.5 ton',   2100),
  ('Air Conditioners', '3 ton',     2800),
  -- ── Refrigerators ──
  ('Refrigerators',    'small',     90),
  ('Refrigerators',    'medium',    130),
  ('Refrigerators',    'large',     160),
  ('Refrigerators',    'inverter',  55),
  -- ── Freezers ──
  ('Freezers',         'small',     120),
  ('Freezers',         'medium',    150),
  ('Freezers',         'large',     200),
  -- ── Washing Machines ──
  ('Washing Machines', 'top load',  500),
  ('Washing Machines', 'front load',2000),
  ('Washing Machines', 'semi auto', 350),
  -- ── Televisions ──
  ('Televisions',      '32',        40),
  ('Televisions',      '43',        65),
  ('Televisions',      '50',        80),
  ('Televisions',      '55',        90),
  ('Televisions',      '65',        130),
  ('Televisions',      '75',        180),
  -- ── Water Dispensers ──
  ('Water Dispensers', 'hot cold',  500),
  ('Water Dispensers', 'cold',      100),
  ('Water Dispensers', 'normal',    80)
) AS defaults(cat, subtype, watts)
WHERE products.power_consumption_w IS NULL
  AND products.category = defaults.cat
  AND (
    -- Match on subtype hints in model/name/sub_category
    CASE defaults.subtype
      WHEN '0.75 ton'   THEN (products.simplified_name || ' ' || products.model) ~* '0\.75\s*ton|9000\s*btu|0\.75t'
      WHEN '1 ton'      THEN (products.simplified_name || ' ' || products.model) ~* '\b1\s*ton|\b12000\s*btu|1\.0\s*ton'
      WHEN '1.5 ton'    THEN (products.simplified_name || ' ' || products.model) ~* '1\.5\s*ton|18000\s*btu|1\.5t'
      WHEN '2 ton'      THEN (products.simplified_name || ' ' || products.model) ~* '\b2\s*ton|24000\s*btu|2\.0\s*ton'
      WHEN '2.5 ton'    THEN (products.simplified_name || ' ' || products.model) ~* '2\.5\s*ton|30000\s*btu'
      WHEN '3 ton'      THEN (products.simplified_name || ' ' || products.model) ~* '\b3\s*ton|36000\s*btu'
      WHEN 'inverter'   THEN (products.simplified_name || ' ' || products.model || ' ' || products.sub_category) ~* 'inverter'
      WHEN 'small'      THEN (products.simplified_name || ' ' || products.model) ~* '\b[5-9]\s*cu|1[0-2]\s*cu|[0-9]\s*cubic'
      WHEN 'medium'     THEN (products.simplified_name || ' ' || products.model) ~* '1[3-7]\s*cu|medium'
      WHEN 'large'      THEN (products.simplified_name || ' ' || products.model) ~* '1[8-9]\s*cu|2\d\s*cu|large'
      WHEN 'top load'   THEN (products.simplified_name || ' ' || products.model || ' ' || products.sub_category) ~* 'top.?load|top load|automatic'
      WHEN 'front load' THEN (products.simplified_name || ' ' || products.model || ' ' || products.sub_category) ~* 'front.?load'
      WHEN 'semi auto'  THEN (products.simplified_name || ' ' || products.model || ' ' || products.sub_category) ~* 'semi.?auto'
      WHEN '32'   THEN (products.simplified_name || ' ' || products.model) ~* '\b32[^0-9]'
      WHEN '43'   THEN (products.simplified_name || ' ' || products.model) ~* '\b43[^0-9]'
      WHEN '50'   THEN (products.simplified_name || ' ' || products.model) ~* '\b50[^0-9]'
      WHEN '55'   THEN (products.simplified_name || ' ' || products.model) ~* '\b55[^0-9]'
      WHEN '65'   THEN (products.simplified_name || ' ' || products.model) ~* '\b65[^0-9]'
      WHEN '75'   THEN (products.simplified_name || ' ' || products.model) ~* '\b75[^0-9]'
      WHEN 'hot cold' THEN (products.simplified_name || ' ' || products.model || ' ' || products.sub_category) ~* 'hot.*cold|heating'
      WHEN 'cold'     THEN (products.simplified_name || ' ' || products.model || ' ' || products.sub_category) ~* '\bcold\b|\bchilling\b'
      WHEN 'normal'   THEN TRUE
      ELSE FALSE
    END
  );

-- ── Step 4: Broad category fallback for anything still NULL ──────────────────
-- Very rough — only for niche categories. Still marked estimated.

UPDATE public.products
SET
  power_consumption_w  = defaults.watts,
  wattage_is_estimated = true
FROM (VALUES
  ('Air Conditioners',   1100),   -- 1.5T default
  ('Refrigerators',      130),
  ('Freezers',           150),
  ('Washing Machines',   500),
  ('Televisions',        80),
  ('Water Dispensers',   400),
  ('Kitchen Appliances', 800),
  ('Small Appliances',   600)
) AS defaults(cat, watts)
WHERE products.power_consumption_w IS NULL
  AND products.category = defaults.cat
  AND products.is_active = true;

-- ── Verification ────────────────────────────────────────────────────────────
SELECT
  category,
  count(*) FILTER (WHERE power_consumption_w IS NOT NULL)     AS has_wattage,
  count(*) FILTER (WHERE power_consumption_w IS NULL)          AS still_null,
  count(*) FILTER (WHERE wattage_is_estimated = false
                     AND power_consumption_w IS NOT NULL)      AS exact,
  count(*) FILTER (WHERE wattage_is_estimated = true)          AS estimated,
  round(avg(power_consumption_w) FILTER
        (WHERE power_consumption_w IS NOT NULL))               AS avg_w
FROM public.products
WHERE is_active = true
GROUP BY category
ORDER BY category;
