-- ============================================================
-- BATCH 3: Gree ACs + Remaining Dawlance — 2026-05-19
-- Sources: ShandaarBuy (single/original prices = Daraz proxy)
--          AYS Online (competing retailer ≈ Daraz market)
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- GREE — CHARMO NON-INVERTER (significantly above ShandaarBuy market)
-- ──────────────────────────────────────────────────────────────

-- Charmo 1T (12CM11) — ShandaarBuy market ~123,900 → target 122,000 (1.5% below)
UPDATE products SET
  cash_floor   = 122000,
  retail_price = 122000
WHERE brand = 'Gree'
  AND model IN ('12CM11', 'GS-12CM11 White');

-- Charmo 1.5T (18CM11) — ShandaarBuy market ~153,900 → target 151,500 (1.6% below)
UPDATE products SET
  cash_floor   = 151500,
  retail_price = 151500
WHERE brand = 'Gree'
  AND model IN ('18CM11', 'GS-18CM11 White');

-- ──────────────────────────────────────────────────────────────
-- GREE — PITH14 TURBO/PLUS 1.5T (above ShandaarBuy original 172,890)
-- ──────────────────────────────────────────────────────────────

-- GS-18PITH14 Turbo/Plus/Xtream — ShandaarBuy original (Daraz) ~172,890 → target 170,000 (1.7% below)
UPDATE products SET
  cash_floor   = 170000,
  retail_price = 170000
WHERE brand = 'Gree'
  AND model = 'GS-18PITH14 /Turbo/Plus Xtream Gray/Silver';

-- ──────────────────────────────────────────────────────────────
-- GREE — PITH15/16/17/18 T3 1.5T (above AYS Online ~167,500–174,900)
-- ──────────────────────────────────────────────────────────────

-- T3 White (1.5T) — AYS market ~167,500 → target 165,000 (1.5% below)
UPDATE products SET
  cash_floor   = 165000,
  retail_price = 165000
WHERE brand = 'Gree'
  AND model IN (
    'GS-18PITH15/16/17/18 - T3 White',
    'GS-18PITH15/16/17/18W - T3'
  );

-- T3 Grey/G variants (1.5T) — AYS market ~174,900 → target 172,000 (1.7% below)
UPDATE products SET
  cash_floor   = 172000,
  retail_price = 172000
WHERE brand = 'Gree'
  AND model IN (
    'GS-18PITH15/16/17/18G - T3',
    'GS-18PITH 16 Turbo /18 Pro - T3 Grey'
  );

-- ──────────────────────────────────────────────────────────────
-- GREE — AITH21 T3 1.5T (above AYS Online ~196,500)
-- ──────────────────────────────────────────────────────────────

-- GS-18AITH21 T3 (1.5T) — AYS market ~196,500 → target 194,000 (1.3% below)
UPDATE products SET
  cash_floor   = 194000,
  retail_price = 194000
WHERE brand = 'Gree'
  AND model IN (
    'GS-18AITH21 - T3 White/Black',
    'GS-18AITH21W/B - T3'
  );

-- ──────────────────────────────────────────────────────────────
-- GREE — AITH24W T3 1.5T (above AYS Online ~242,500)
-- ──────────────────────────────────────────────────────────────

-- GS-18AITH24W T3 — AYS market ~242,500 → target 239,000 (1.4% below)
UPDATE products SET
  cash_floor   = 239000,
  retail_price = 239000
WHERE brand = 'Gree'
  AND model IN (
    'GS-18AITH24W - T3 White/Silver',
    'GS-18AITH24W - T3 White/Silver'
  );

-- ──────────────────────────────────────────────────────────────
-- DAWLANCE — SPRINTER X / POWERCON X 1T variants (above ShandaarBuy market)
-- ──────────────────────────────────────────────────────────────

-- Sprinter X 15 (non-T3, 1T) — ~5% above market; align with SPRINTER X INVERTER 15
-- Target 117,000 (similar to verified 118,890 ShandaarBuy original)
UPDATE products SET
  cash_floor   = 117000,
  retail_price = 117000
WHERE brand = 'Dawlance'
  AND model IN ('Sprinter X 15', 'Powercon X 15');

-- Sprinter X 15 T3 / Powercon X 15 T3 — ShandaarBuy market ~115,000 → target 113,500 (1.3% below)
UPDATE products SET
  cash_floor   = 113500,
  retail_price = 113500
WHERE brand = 'Dawlance'
  AND model IN ('Sprinter X 15 T3', 'Powercon X 15 T3');

COMMIT;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- SELECT brand, model, cash_floor, retail_price
-- FROM products
-- WHERE (brand = 'Gree' AND model IN (
--   '12CM11','GS-12CM11 White','18CM11','GS-18CM11 White',
--   'GS-18PITH14 /Turbo/Plus Xtream Gray/Silver',
--   'GS-18PITH15/16/17/18 - T3 White','GS-18PITH15/16/17/18W - T3',
--   'GS-18PITH15/16/17/18G - T3','GS-18PITH 16 Turbo /18 Pro - T3 Grey',
--   'GS-18AITH21 - T3 White/Black','GS-18AITH21W/B - T3',
--   'GS-18AITH24W - T3 White/Silver'
-- ))
-- OR (brand = 'Dawlance' AND model IN (
--   'Sprinter X 15','Powercon X 15','Sprinter X 15 T3','Powercon X 15 T3'
-- ))
-- ORDER BY brand, model;
