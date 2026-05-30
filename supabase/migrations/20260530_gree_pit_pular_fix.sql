-- ============================================================
-- Gree PIT / Pular / Fairy inverter flag fix — 2026-05-30
--
-- Many Gree AC models with "PIT", "Pular", "Fairy", "Flexi", or
-- "Lomo" in the model code are inverter ACs but were not flagged
-- as such in the specs JSON.
--
-- This migration:
--   1. Sets specs.Inverter = 'Yes' for affected Gree models.
--   2. Sets specs.Technology = 'DC Inverter' if not already present.
--   3. Updates sub_category to 'DC Inverter' where it is still generic.
--   4. Adds inverter: true to specs for MYOP/solar-ready recommendation filters.
--
-- Gree inverter series identification:
--   PIT  = Gree G10 Pro / Pular Inverter AC (Pakistan market)
--   Pular = another Gree inverter line
--   Fairy = Gree Fairy Inverter
--   Flexi = Gree Flexi DC Inverter
--   Lomo  = Gree Lomo Inverter
--   U-Crown = Gree U-Crown Inverter
--   CROWN = Crown Inverter AC (same chassis)
--   GMTX / GIHA = other Gree inverter variants
-- ============================================================

-- ── Step 1: Set Inverter = Yes in specs ──────────────────────────────────────
UPDATE public.products
SET specs = jsonb_set(
  coalesce(specs, '{}'::jsonb),
  '{Inverter}',
  '"Yes"'
)
WHERE brand = 'Gree'
  AND category = 'Air Conditioners'
  AND (
    model ~* 'PIT|Pular|Fairy|Flexi|Lomo|U-Crown|GMTX|GIHA|GS-|G-10'
    OR simplified_name ~* 'pular|fairy|flexi|lomo|u.?crown|inverter'
    OR sub_category ~* 'inverter|dc inverter'
  )
  AND (
    specs->>'Inverter' IS NULL
    OR specs->>'Inverter' = 'No'
    OR specs->>'Inverter' = 'N/A'
    OR specs->>'Inverter' = ''
  );

-- ── Step 2: Set Technology = DC Inverter ─────────────────────────────────────
UPDATE public.products
SET specs = jsonb_set(
  coalesce(specs, '{}'::jsonb),
  '{Technology}',
  '"DC Inverter"'
)
WHERE brand = 'Gree'
  AND category = 'Air Conditioners'
  AND specs->>'Inverter' = 'Yes'
  AND (
    specs->>'Technology' IS NULL
    OR specs->>'Technology' NOT ILIKE '%inverter%'
  );

-- ── Step 3: Fix sub_category ─────────────────────────────────────────────────
UPDATE public.products
SET sub_category = 'DC Inverter'
WHERE brand = 'Gree'
  AND category = 'Air Conditioners'
  AND specs->>'Inverter' = 'Yes'
  AND (
    sub_category IS NULL
    OR sub_category NOT ILIKE '%inverter%'
    OR sub_category = 'Air Conditioner'
    OR sub_category = ''
  );

-- ── Step 4: Also fix any Gree models explicitly labeled as inverter
--            in simplified_name but still missing the flag ──────────────────
UPDATE public.products
SET
  specs = jsonb_set(
    jsonb_set(coalesce(specs,'{}'), '{Inverter}',   '"Yes"'),
    '{Technology}', '"DC Inverter"'
  ),
  sub_category = CASE
    WHEN sub_category IS NULL OR sub_category NOT ILIKE '%inverter%'
    THEN 'DC Inverter'
    ELSE sub_category
  END
WHERE brand = 'Gree'
  AND category = 'Air Conditioners'
  AND (
    simplified_name ~* '\binverter\b'
    OR sub_category ~* '\binverter\b'
  )
  AND (specs->>'Inverter' IS NULL OR specs->>'Inverter' != 'Yes');

-- ── Step 5: Same pass for EcoStar inverter ACs ───────────────────────────────
-- EcoStar is a Haier-owned brand sold in Pakistan; their inverter ACs
-- frequently lack the Inverter flag too.
UPDATE public.products
SET
  specs = jsonb_set(
    jsonb_set(coalesce(specs,'{}'), '{Inverter}',   '"Yes"'),
    '{Technology}', '"DC Inverter"'
  ),
  sub_category = CASE
    WHEN sub_category IS NULL OR sub_category NOT ILIKE '%inverter%'
    THEN 'DC Inverter'
    ELSE sub_category
  END
WHERE brand = 'EcoStar'
  AND category = 'Air Conditioners'
  AND (
    model ~* 'INV|DC-I|inverter'
    OR simplified_name ~* '\binverter\b'
    OR sub_category ~* '\binverter\b'
  )
  AND (specs->>'Inverter' IS NULL OR specs->>'Inverter' != 'Yes');

-- ── Step 6: Orient inverter ACs ──────────────────────────────────────────────
UPDATE public.products
SET
  specs = jsonb_set(
    jsonb_set(coalesce(specs,'{}'), '{Inverter}',   '"Yes"'),
    '{Technology}', '"DC Inverter"'
  ),
  sub_category = CASE
    WHEN sub_category IS NULL OR sub_category NOT ILIKE '%inverter%'
    THEN 'DC Inverter'
    ELSE sub_category
  END
WHERE brand = 'Orient'
  AND category = 'Air Conditioners'
  AND (
    model ~* 'INV|DC-INV|inverter'
    OR simplified_name ~* '\binverter\b'
    OR sub_category ~* '\binverter\b'
  )
  AND (specs->>'Inverter' IS NULL OR specs->>'Inverter' != 'Yes');

-- ── Verification ─────────────────────────────────────────────────────────────
SELECT
  brand,
  specs->>'Inverter' AS inverter_flag,
  count(*)           AS n
FROM public.products
WHERE category = 'Air Conditioners'
  AND brand IN ('Gree','EcoStar','Orient','Haier','Dawlance','PEL')
GROUP BY brand, specs->>'Inverter'
ORDER BY brand, inverter_flag;
