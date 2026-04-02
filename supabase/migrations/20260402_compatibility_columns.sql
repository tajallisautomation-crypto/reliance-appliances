-- ============================================================
-- Compatibility Architecture — 2026-04-02
-- Adds structured solar/battery/inverter compatibility fields.
--
-- Rules enforced:
--   24V batteries only with inverters < 3.7 kW
--   48V batteries required for inverters > 4.0 kW
--   3.7–4.0 kW band is ambiguous → requires_compatibility_review = true
--
-- compatibility_status values:
--   'compatible'              → safe to recommend/bundle
--   'incompatible'            → MUST NOT appear together in any context
--   'uncertain_manual_review' → 3.7–4.0 kW band or unusual pairing — block until reviewed
--   'missing_data_blocked'    → data incomplete — treat as not recommendable
--   'not_applicable'          → product is not a solar/battery/inverter type
-- ============================================================

-- ── System role: what role does this product play in a solar system ────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS system_role text
    CHECK (system_role IN ('inverter', 'battery', 'panel', 'pump', 'system', 'accessory', 'none'));

-- ── Inverter fields ────────────────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS inverter_power_kw         numeric(6,2),
  ADD COLUMN IF NOT EXISTS inverter_type             text,   -- 'hybrid', 'off-grid', 'on-grid', 'grid-tie'
  ADD COLUMN IF NOT EXISTS supported_battery_voltages text[]; -- e.g. '{24}' or '{48}' or '{24,48}'

-- ── Battery fields ─────────────────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS battery_voltage           integer, -- 24 or 48 (volts)
  ADD COLUMN IF NOT EXISTS battery_capacity_kwh      numeric(6,2),
  ADD COLUMN IF NOT EXISTS battery_type              text;   -- 'lifepo4', 'tubular', 'agm', 'gel', 'lithium'

-- ── Compatibility classification ───────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS voltage_class             text
    CHECK (voltage_class IN ('24v', '48v', 'dual', 'unknown')),
  ADD COLUMN IF NOT EXISTS compatibility_group       text,   -- products sharing the same compatibility group can be paired
  ADD COLUMN IF NOT EXISTS compatible_inverter_min_kw numeric(6,2),
  ADD COLUMN IF NOT EXISTS compatible_inverter_max_kw numeric(6,2),
  ADD COLUMN IF NOT EXISTS compatibility_status      text    NOT NULL DEFAULT 'not_applicable'
    CHECK (compatibility_status IN (
      'compatible', 'incompatible', 'uncertain_manual_review',
      'missing_data_blocked', 'not_applicable'
    )),
  ADD COLUMN IF NOT EXISTS requires_compatibility_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compatibility_notes       text;   -- admin-visible explanation

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS products_system_role_idx
  ON public.products (system_role);

CREATE INDEX IF NOT EXISTS products_battery_voltage_idx
  ON public.products (battery_voltage);

CREATE INDEX IF NOT EXISTS products_compatibility_status_idx
  ON public.products (compatibility_status);

CREATE INDEX IF NOT EXISTS products_inverter_power_kw_idx
  ON public.products (inverter_power_kw);

-- ── Backfill: set system_role based on normalized_category ────────────────────
UPDATE public.products
  SET system_role = CASE
    WHEN normalized_category IN ('Solar Inverters') OR category ILIKE '%inverter%'
      THEN 'inverter'
    WHEN normalized_category IN ('Solar Batteries') OR category ILIKE '%solar battery%'
         OR category ILIKE '%lifepo4%' OR category ILIKE '%lithium battery%'
      THEN 'battery'
    WHEN normalized_category IN ('Solar Panels') OR category ILIKE '%solar panel%'
      THEN 'panel'
    WHEN category ILIKE '%solar water pump%'
      THEN 'pump'
    WHEN normalized_category IN ('Solar Systems') OR category ILIKE '%solar system%'
      THEN 'system'
    ELSE 'none'
  END
WHERE system_role IS NULL;

-- ── Backfill: set compatibility_status = 'not_applicable' for non-solar products
UPDATE public.products
  SET compatibility_status = 'not_applicable'
WHERE system_role = 'none'
  AND compatibility_status = 'not_applicable';

-- ── Backfill: flag solar/battery/inverter products that lack required data ────
-- These need admin review to populate inverter_power_kw / battery_voltage.
UPDATE public.products
  SET
    compatibility_status = 'missing_data_blocked',
    requires_compatibility_review = true,
    compatibility_notes = 'Inverter/battery product is missing power_kw or voltage data — cannot determine compatibility.'
WHERE system_role IN ('inverter', 'battery')
  AND (
    (system_role = 'inverter' AND inverter_power_kw IS NULL)
    OR
    (system_role = 'battery' AND battery_voltage IS NULL)
  )
  AND compatibility_status != 'not_applicable';

-- ── View: products requiring compatibility review ─────────────────────────────
CREATE OR REPLACE VIEW public.products_compatibility_review AS
  SELECT
    id,
    brand,
    model,
    category,
    normalized_category,
    system_role,
    inverter_power_kw,
    battery_voltage,
    compatibility_status,
    requires_compatibility_review,
    compatibility_notes,
    updated_at
  FROM public.products
  WHERE system_role IN ('inverter', 'battery')
    AND (requires_compatibility_review = true OR compatibility_status = 'missing_data_blocked')
  ORDER BY updated_at DESC;

-- Admin-only
ALTER VIEW public.products_compatibility_review OWNER TO postgres;

-- ── Verification ─────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name IN (
    'system_role', 'inverter_power_kw', 'inverter_type', 'supported_battery_voltages',
    'battery_voltage', 'battery_capacity_kwh', 'battery_type',
    'voltage_class', 'compatibility_group', 'compatible_inverter_min_kw',
    'compatible_inverter_max_kw', 'compatibility_status',
    'requires_compatibility_review', 'compatibility_notes'
  )
ORDER BY column_name;
