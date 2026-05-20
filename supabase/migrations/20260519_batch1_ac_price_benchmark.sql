-- ============================================================
-- BATCH 1: Air Conditioner Price Benchmarking — 2026-05-19
-- Strategy: 1–1.5% below Daraz market price
-- Sources: ShandaarBuy original prices, Japan Electronics
--          originals, PriceOye (Daraz aggregator), AYS Online
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- DAWLANCE ACs — PRICE REDUCTIONS  (currently above Daraz)
-- ──────────────────────────────────────────────────────────────

-- Elegance X 15 (1 Ton) — Daraz ~109,999 → target 108,500 (1.4% below)
-- Includes both standard and "SPLIT" catalog variants
UPDATE products SET
  cash_floor   = 108500,
  retail_price = 108500
WHERE brand = 'Dawlance'
  AND model IN (
    'ELEGANCE X INVERTER 15',
    'SPLIT ELEGANCE X INVERTER 15'
  );

-- Elegance X 30 (1.5 Ton) — Daraz ~145,000 → target 143,000 (1.4% below)
UPDATE products SET
  cash_floor   = 143000,
  retail_price = 143000
WHERE brand = 'Dawlance'
  AND model IN (
    'ELEGANCE X INVERTER 30',
    'SPLIT ELEGANCE X INVERTER 30'
  );

-- Aura X 15 (1 Ton) — Daraz ~115,000 → target 113,500 (1.3% below)
UPDATE products SET
  cash_floor   = 113500,
  retail_price = 113500
WHERE brand = 'Dawlance'
  AND model IN (
    'AURA X INVERTER 15',
    'SPLIT AURA X INVERTER 15'
  );

-- Aura X 30 (1.5 Ton) — Daraz ~141,900 → target 139,500 (1.7% below)
UPDATE products SET
  cash_floor   = 139500,
  retail_price = 139500
WHERE brand = 'Dawlance'
  AND model IN (
    'AURA X INVERTER 30',
    'SPLIT AURA X INVERTER 30'
  );

-- Econo+ X 30 (1.5 Ton) — Daraz ~145,000 → target 143,000 (1.4% below)
UPDATE products SET
  cash_floor   = 143000,
  retail_price = 143000
WHERE brand = 'Dawlance'
  AND model IN (
    'ECONO+ X INVERTER 30',
    'SPLIT ECONO+ X INVERTER 30'
  );

-- Chrome+ 45 (2 Ton split) — Daraz ~213,100 → target 210,000 (1.5% below)
UPDATE products SET
  cash_floor   = 210000,
  retail_price = 210000
WHERE brand = 'Dawlance'
  AND model = 'Chrome+ Inverter 45 (Copper Stamp)';

-- ──────────────────────────────────────────────────────────────
-- DAWLANCE ACs — PRICE INCREASES  (more than 2% below Daraz)
-- ──────────────────────────────────────────────────────────────

-- Sprinter X 30 (1.5 Ton) — Daraz ~142,000 → target 140,500 (1.1% below)
UPDATE products SET
  cash_floor   = 140500,
  retail_price = 140500
WHERE brand = 'Dawlance'
  AND model IN (
    'SPRINTER X INVERTER 30',
    'SPLIT AC SPRINTER X INVERTER 30 T3'
  );

-- Elegance Pro 15 (1 Ton) — Daraz ~142,000 → target 140,500 (1.1% below)
UPDATE products SET
  cash_floor   = 140500,
  retail_price = 140500
WHERE brand = 'Dawlance'
  AND model IN (
    'Elegance Pro Inverter 15',
    'SPLIT ELEGANCE PRO INVERTER 15'
  );

-- Chillex 15 (1 Ton) — Daraz ~115,000 → target 113,500 (1.3% below)
UPDATE products SET
  cash_floor   = 113500,
  retail_price = 113500
WHERE brand = 'Dawlance'
  AND model = 'CHILLEX INVERTER 15';

-- Suave+ 30 White (1.5 Ton) — Daraz ~153,500 → target 151,500 (1.3% below)
UPDATE products SET
  cash_floor   = 151500,
  retail_price = 151500
WHERE brand = 'Dawlance'
  AND model = 'Suave+ Inverter 30 White';

-- Suave+ 30 Silver (1.5 Ton) — Daraz ~156,500 → target 154,500 (1.3% below)
UPDATE products SET
  cash_floor   = 154500,
  retail_price = 154500
WHERE brand = 'Dawlance'
  AND model = 'Suave+ Inverter 30 Silver';

-- ──────────────────────────────────────────────────────────────
-- HAIER ACs — small price increases  (slightly below Daraz range)
-- ──────────────────────────────────────────────────────────────

-- HSU-19HFC 1.5 Ton Flexis — Daraz ~143,499 → target 142,000 (1.0% below)
UPDATE products SET
  cash_floor   = 142000,
  retail_price = 142000
WHERE brand = 'Haier'
  AND model = 'HSU-19HFC';

-- ──────────────────────────────────────────────────────────────
-- ECOSTAR ACs — small price increases  (2–2.5% below Daraz)
-- ──────────────────────────────────────────────────────────────

-- 1 Ton T3 series (AR & NV) — Daraz ~126,300 → target 125,000 (1.0% below)
UPDATE products SET
  cash_floor   = 125000,
  retail_price = 125000
WHERE brand = 'EcoStar'
  AND model IN ('ES-12AR01WT3', 'ES-12NV01WT3');

-- 1.5 Ton T3 series (AR & NV) — Daraz ~156,800 → target 155,000 (1.1% below)
UPDATE products SET
  cash_floor   = 155000,
  retail_price = 155000
WHERE brand = 'EcoStar'
  AND model IN ('ES-18AR01WT3', 'ES-18NV01WT3');

-- 2.0 Ton T3 series (NV & AR) — Daraz ~210,500 → target 208,000 (1.2% below)
UPDATE products SET
  cash_floor   = 208000,
  retail_price = 208000
WHERE brand = 'EcoStar'
  AND model IN ('ES-24NV01WT3', 'ES-24AR01WT3');

COMMIT;

-- ============================================================
-- VERIFICATION QUERY — run after applying to confirm changes
-- ============================================================
-- SELECT brand, model, cash_floor, retail_price
-- FROM products
-- WHERE (brand = 'Dawlance' AND model IN (
--   'ELEGANCE X INVERTER 15','SPLIT ELEGANCE X INVERTER 15',
--   'ELEGANCE X INVERTER 30','SPLIT ELEGANCE X INVERTER 30',
--   'AURA X INVERTER 15','SPLIT AURA X INVERTER 15',
--   'AURA X INVERTER 30','SPLIT AURA X INVERTER 30',
--   'ECONO+ X INVERTER 30','SPLIT ECONO+ X INVERTER 30',
--   'Chrome+ Inverter 45 (Copper Stamp)',
--   'SPRINTER X INVERTER 30','SPLIT AC SPRINTER X INVERTER 30 T3',
--   'Elegance Pro Inverter 15','SPLIT ELEGANCE PRO INVERTER 15',
--   'CHILLEX INVERTER 15',
--   'Suave+ Inverter 30 White','Suave+ Inverter 30 Silver'
-- ))
-- OR (brand = 'Haier' AND model = 'HSU-19HFC')
-- OR (brand = 'EcoStar' AND model IN (
--   'ES-12AR01WT3','ES-12NV01WT3',
--   'ES-18AR01WT3','ES-18NV01WT3',
--   'ES-24NV01WT3','ES-24AR01WT3'
-- ))
-- ORDER BY brand, model;
