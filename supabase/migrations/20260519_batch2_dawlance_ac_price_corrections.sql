-- ============================================================
-- BATCH 2: Dawlance AC Price Corrections — 2026-05-19
-- Strategy: 1–1.5% below ShandaarBuy market price (Daraz proxy)
-- Sources: ShandaarBuy (single/sale prices = Daraz-level reference)
--          Japan Electronics (sold-out & original prices)
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- CRUISE PLUS — both 1T and 1.5T models above ShandaarBuy market
-- ──────────────────────────────────────────────────────────────

-- Cruise Plus 15 (1T) — ShandaarBuy market ~110,000 → target 108,500 (1.4% below)
UPDATE products SET
  cash_floor   = 108500,
  retail_price = 108500
WHERE brand = 'Dawlance'
  AND model IN (
    'Cruise Plus Inverter 15',
    'CRUISE PLUS INVERTOR 15'
  );

-- Cruise Plus 30 (1.5T) — ShandaarBuy market ~130,000 → target 128,000 (1.5% below)
UPDATE products SET
  cash_floor   = 128000,
  retail_price = 128000
WHERE brand = 'Dawlance'
  AND model IN (
    'Cruise Plus Inverter 30',
    'CRUISE PLUS INVERTOR 30'
  );

-- ──────────────────────────────────────────────────────────────
-- CHILLEX 30 (1.5T) — slightly above ShandaarBuy 133,000
-- ──────────────────────────────────────────────────────────────

-- Chillex 30 — ShandaarBuy market ~133,000 → target 131,000 (1.5% below)
UPDATE products SET
  cash_floor   = 131000,
  retail_price = 131000
WHERE brand = 'Dawlance'
  AND model = 'CHILLEX INVERTER 30';

-- ──────────────────────────────────────────────────────────────
-- POWERCON X 30 — all 1.5T variants above ShandaarBuy 140,000
-- ──────────────────────────────────────────────────────────────

-- Powercon X 30 (1.5T, all variants) — ShandaarBuy market ~140,000 → target 138,000 (1.4% below)
UPDATE products SET
  cash_floor   = 138000,
  retail_price = 138000
WHERE brand = 'Dawlance'
  AND model IN (
    'POWERCON X INVERTER 30',
    'POWERCON X INVERTER 30 T3 Dawlance',
    'SPLIT AC POWERCON SERIES 30'
  );

-- ──────────────────────────────────────────────────────────────
-- HYPER T3 30 — both variants significantly above market
-- ──────────────────────────────────────────────────────────────

-- Hyper T3 White 30 (1.5T) — ShandaarBuy sold-out ~159,000 → target 156,500 (1.6% below)
UPDATE products SET
  cash_floor   = 156500,
  retail_price = 156500
WHERE brand = 'Dawlance'
  AND model = 'HYPER T3 INVERTER 30 - R32 (White)';

-- Hyper T3 Silver 30 (1.5T) — ShandaarBuy sold-out ~162,000 → target 159,500 (1.5% below)
UPDATE products SET
  cash_floor   = 159500,
  retail_price = 159500
WHERE brand = 'Dawlance'
  AND model = 'HYPER T3 INVERTER 30 - R32 (Matt Silver)';

-- ──────────────────────────────────────────────────────────────
-- MEGA FLEX — both 1T and 1.5T above market
-- ──────────────────────────────────────────────────────────────

-- Mega Flex 15 (1T) — ShandaarBuy market ~115,000 → target 113,500 (1.3% below)
UPDATE products SET
  cash_floor   = 113500,
  retail_price = 113500
WHERE brand = 'Dawlance'
  AND model IN (
    'Mega Flex Inverter 15',
    'Mega Flex Inverter 15 Dawlance'
  );

-- Mega Flex 30 (1.5T) — ShandaarBuy ~151,000 / JE ~155,000 → target 152,500 (1.6% below 155,000)
UPDATE products SET
  cash_floor   = 152500,
  retail_price = 152500
WHERE brand = 'Dawlance'
  AND model IN (
    'Mega Flex Inverter 30',
    'Mega Flex Inverter 30 Dawlance'
  );

-- ──────────────────────────────────────────────────────────────
-- MAGNA T3 30 — all White/Textured variants above ShandaarBuy 153,000
-- ──────────────────────────────────────────────────────────────

-- Magna T3 30 (1.5T, all White variants) — ShandaarBuy market ~153,000 → target 150,500 (1.6% below)
UPDATE products SET
  cash_floor   = 150500,
  retail_price = 150500
WHERE brand = 'Dawlance'
  AND model IN (
    'MAGNA INVERTER 30 - R32 (White)',
    'MAGNA INVERTER 30 - R32 (White Textured)',
    'Magna T3 Inv 30 Milky White Textured Daw'
  );

-- ──────────────────────────────────────────────────────────────
-- T3-SERIES 15 (1T) — Inspire Pro, Powercon, Sprinter variants
-- ShandaarBuy market ~115,000 for all T3 1T models
-- ──────────────────────────────────────────────────────────────

-- T3 15 (1T) models — ShandaarBuy market ~115,000 → target 113,500 (1.3% below)
UPDATE products SET
  cash_floor   = 113500,
  retail_price = 113500
WHERE brand = 'Dawlance'
  AND model IN (
    'INSPIRE PRO T3 INVERTER 15',
    'POWERCON T3 INVERTER 15',
    'SPRINTER T3 INVERTER 15'
  );

-- ──────────────────────────────────────────────────────────────
-- PRIMA PURSENSE 30 (1.5T) — above ShandaarBuy 175,500 sale
-- ──────────────────────────────────────────────────────────────

-- Prima PurSense 30 — ShandaarBuy sale ~175,500 / JE ~180,000 → target 177,500 (1.4% below 180,000)
UPDATE products SET
  cash_floor   = 177500,
  retail_price = 177500
WHERE brand = 'Dawlance'
  AND model IN (
    'Prima PurSense Inverter 30',
    'Prima PurSense Inverter 30 Dawlance'
  );

COMMIT;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- SELECT brand, model, cash_floor, retail_price
-- FROM products
-- WHERE brand = 'Dawlance'
--   AND model IN (
--     'Cruise Plus Inverter 15','CRUISE PLUS INVERTOR 15',
--     'Cruise Plus Inverter 30','CRUISE PLUS INVERTOR 30',
--     'CHILLEX INVERTER 30',
--     'POWERCON X INVERTER 30','POWERCON X INVERTER 30 T3 Dawlance','SPLIT AC POWERCON SERIES 30',
--     'HYPER T3 INVERTER 30 - R32 (White)','HYPER T3 INVERTER 30 - R32 (Matt Silver)',
--     'Mega Flex Inverter 15','Mega Flex Inverter 15 Dawlance',
--     'Mega Flex Inverter 30','Mega Flex Inverter 30 Dawlance',
--     'MAGNA INVERTER 30 - R32 (White)','MAGNA INVERTER 30 - R32 (White Textured)','Magna T3 Inv 30 Milky White Textured Daw',
--     'INSPIRE PRO T3 INVERTER 15','POWERCON T3 INVERTER 15','SPRINTER T3 INVERTER 15',
--     'Prima PurSense Inverter 30','Prima PurSense Inverter 30 Dawlance'
--   )
-- ORDER BY model;
