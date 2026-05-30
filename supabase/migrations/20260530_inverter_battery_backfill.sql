-- ============================================================
-- Inverter & battery structured field backfill — 2026-05-30
--
-- Mirrors the auto-detection logic in AdminPortal.tsx
-- (getInverterKw, getBatteryVoltage, getBatteryKwh) but runs
-- as a one-time SQL pass so all missing_data_blocked products
-- get their fields populated without manual admin entry.
--
-- After this migration, the CompatibilityReviewTab should show
-- only the products that genuinely cannot be auto-detected.
--
-- Safe to re-run: only updates rows where the target column is NULL.
-- ============================================================

-- ── 1. Inverter power (kW) ────────────────────────────────────────────────────
-- Detection order:
--   a. Explicit "kW" or "kVA" in any spec value
--   b. "kW"/"kVA" in simplified_name or model
--   c. PV-code: PV7000 → 7 kW, PV5000 → 5 kW, etc.
--   d. VA rating: "3600VA" → 3.6 kW (÷1000), "5000VA" → 5 kW

UPDATE public.products
SET inverter_power_kw = detected.kw
FROM (
  SELECT id, kw FROM (

    -- a. From spec values: explicit "kW" mention
    SELECT p.id,
      round(
        (regexp_match(
          (SELECT val FROM jsonb_each_text(p.specs) kv(key,val)
           WHERE kv.val ~* '\d+\.?\d*\s*k[wv]a?\b'
           ORDER BY (kv.val ~* 'kW') DESC LIMIT 1),
          '(\d+\.?\d*)\s*k[wv]a?\b'
        ))[1]::numeric
        -- divide by 1000 only for VA, not kW
        * CASE WHEN (SELECT val FROM jsonb_each_text(p.specs) kv(key,val)
                      WHERE kv.val ~* '\d+\.?\d*\s*k[wv]a?\b' LIMIT 1)
                     ~* 'kva\b' THEN 1 ELSE 1 END,
        2
      ) AS kw,
      1 AS priority
    FROM public.products p
    WHERE p.system_role = 'inverter'
      AND p.inverter_power_kw IS NULL
      AND p.specs IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_each_text(p.specs) kv(key,val)
        WHERE kv.val ~* '\d+\.?\d*\s*k[wv]a?\b'
      )

    UNION ALL

    -- b. From simplified_name or model: "3.6kW", "5kW", "8 kW"
    SELECT p.id,
      round(
        (regexp_match(
          coalesce(p.simplified_name, '') || ' ' || p.model,
          '(\d+\.?\d*)\s*kW\b'
        ))[1]::numeric,
        2
      ) AS kw,
      2 AS priority
    FROM public.products p
    WHERE p.system_role = 'inverter'
      AND p.inverter_power_kw IS NULL
      AND (coalesce(p.simplified_name, '') || ' ' || p.model) ~* '\d+\.?\d*\s*kW\b'

    UNION ALL

    -- c. PV-code: PV7000 = 7.0 kW, PV5000 = 5.0 kW
    SELECT p.id,
      round(
        (regexp_match(p.model, 'PV(\d{4,5})'))[1]::numeric / 1000,
        2
      ) AS kw,
      3 AS priority
    FROM public.products p
    WHERE p.system_role = 'inverter'
      AND p.inverter_power_kw IS NULL
      AND p.model ~* 'PV\d{4,5}'

    UNION ALL

    -- d. VA rating: "3600VA" → 3.6 kW (assume PF 1.0 for storage inverters)
    SELECT p.id,
      round(
        (regexp_match(
          coalesce(p.simplified_name, '') || ' ' || p.model,
          '(\d{3,5})\s*VA\b'
        ))[1]::numeric / 1000,
        2
      ) AS kw,
      4 AS priority
    FROM public.products p
    WHERE p.system_role = 'inverter'
      AND p.inverter_power_kw IS NULL
      AND (coalesce(p.simplified_name, '') || ' ' || p.model) ~* '\d{3,5}\s*VA\b'

  ) sub
  WHERE kw > 0 AND kw < 100   -- sanity guard
) AS detected
-- Take lowest-priority (most reliable) result per product
JOIN (
  SELECT id, min(priority) AS best_priority
  FROM (
    SELECT p2.id,
      CASE
        WHEN p2.specs IS NOT NULL AND EXISTS (
          SELECT 1 FROM jsonb_each_text(p2.specs) kv(key,val)
          WHERE kv.val ~* '\d+\.?\d*\s*k[wv]a?\b'
        ) THEN 1
        WHEN (coalesce(p2.simplified_name,'') || ' ' || p2.model) ~* '\d+\.?\d*\s*kW\b' THEN 2
        WHEN p2.model ~* 'PV\d{4,5}' THEN 3
        WHEN (coalesce(p2.simplified_name,'') || ' ' || p2.model) ~* '\d{3,5}\s*VA\b' THEN 4
        ELSE 99
      END AS priority
    FROM public.products p2
    WHERE p2.system_role = 'inverter' AND p2.inverter_power_kw IS NULL
  ) priorities
  GROUP BY id
) best ON best.id = detected.id AND detected.priority = best.best_priority
WHERE products.id = detected.id;

-- ── 2. Inverter type detection ────────────────────────────────────────────────
-- Only set where inverter_type is NULL after above pass.

UPDATE public.products
SET inverter_type = CASE
  WHEN (coalesce(simplified_name,'') || ' ' || model || ' ' ||
        coalesce(sub_category,'')) ~* 'hybrid'               THEN 'hybrid'
  WHEN (coalesce(simplified_name,'') || ' ' || model || ' ' ||
        coalesce(sub_category,'')) ~* 'grid.?tie|on.?grid'   THEN 'on-grid'
  WHEN (coalesce(simplified_name,'') || ' ' || model || ' ' ||
        coalesce(sub_category,'')) ~* 'off.?grid'            THEN 'off-grid'
  WHEN (coalesce(simplified_name,'') || ' ' || model) ~* 'mppt|solar|pv'
                                                              THEN 'hybrid'
  ELSE 'off-grid'   -- UPS/battery inverters default to off-grid
END
WHERE system_role = 'inverter'
  AND inverter_type IS NULL;

-- ── 3. Battery voltage ────────────────────────────────────────────────────────
-- Look for 24V or 48V in spec keys whose key name contains "volt",
-- then fall back to any spec value containing "24V" or "48V",
-- then fall back to name/model.

UPDATE public.products
SET battery_voltage = detected.voltage
FROM (
  SELECT p.id, detected_v AS voltage FROM (

    -- a. Spec key matching "volt" (most reliable)
    SELECT p.id,
      (regexp_match(
        (SELECT val FROM jsonb_each_text(p.specs) kv(key,val)
         WHERE kv.key ~* '\bvolt' AND kv.val ~ '\b(24|48)\b'
         LIMIT 1),
        '\b(24|48)\b'
      ))[1]::integer AS detected_v,
      1 AS priority
    FROM public.products p
    WHERE p.system_role = 'battery'
      AND p.battery_voltage IS NULL
      AND p.specs IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_each_text(p.specs) kv(key,val)
        WHERE kv.key ~* '\bvolt' AND kv.val ~ '\b(24|48)\b'
      )

    UNION ALL

    -- b. Any spec value containing "24V" or "48V"
    SELECT p.id,
      (regexp_match(
        (SELECT val FROM jsonb_each_text(p.specs) kv(key,val)
         WHERE kv.val ~* '\b(24|48)\s*[Vv]\b'
         LIMIT 1),
        '\b(24|48)\b'
      ))[1]::integer AS detected_v,
      2 AS priority
    FROM public.products p
    WHERE p.system_role = 'battery'
      AND p.battery_voltage IS NULL
      AND p.specs IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_each_text(p.specs) kv(key,val)
        WHERE kv.val ~* '\b(24|48)\s*[Vv]\b'
      )

    UNION ALL

    -- c. Name or model
    SELECT p.id,
      (regexp_match(
        coalesce(p.simplified_name,'') || ' ' || p.model,
        '\b(24|48)\s*[Vv]\b'
      ))[1]::integer AS detected_v,
      3 AS priority
    FROM public.products p
    WHERE p.system_role = 'battery'
      AND p.battery_voltage IS NULL
      AND (coalesce(p.simplified_name,'') || ' ' || p.model) ~* '\b(24|48)\s*[Vv]\b'

  ) sub
  WHERE detected_v IN (24, 48)
) AS detected
-- Take best result per product
JOIN (
  SELECT DISTINCT ON (id) id
  FROM (
    SELECT id, 1 AS p FROM public.products
    WHERE system_role = 'battery' AND battery_voltage IS NULL
      AND specs IS NOT NULL AND EXISTS (
        SELECT 1 FROM jsonb_each_text(specs) kv(key,val)
        WHERE kv.key ~* '\bvolt' AND kv.val ~ '\b(24|48)\b'
      )
    UNION ALL
    SELECT id, 2 AS p FROM public.products
    WHERE system_role = 'battery' AND battery_voltage IS NULL
  ) x ORDER BY id, p
) dedup ON dedup.id = detected.id
WHERE products.id = detected.id;

-- ── 4. Battery capacity (kWh) ─────────────────────────────────────────────────
-- From spec key matching capacity/energy/kwh, or from product name.

UPDATE public.products
SET battery_capacity_kwh = detected.kwh
FROM (
  SELECT p.id,
    coalesce(
      -- From capacity-type spec key
      (SELECT (regexp_match(kv.val, '(\d+\.?\d*)\s*kWh'))[1]::numeric
       FROM jsonb_each_text(p.specs) kv(key,val)
       WHERE kv.key ~* '(capacity|energy|kwh|storage)'
         AND kv.val ~* '\d+\.?\d*\s*kWh'
       LIMIT 1),
      -- From product name
      (regexp_match(
        coalesce(p.simplified_name,'') || ' ' || p.model,
        '(\d+\.?\d*)\s*kWh'
      ))[1]::numeric,
      -- From Ah × V (24V or 48V): calculate kWh
      CASE
        WHEN p.battery_voltage IS NOT NULL THEN (
          SELECT
            round(
              (regexp_match(kv.val, '(\d+\.?\d*)\s*Ah'))[1]::numeric
              * p.battery_voltage / 1000,
              2
            )
          FROM jsonb_each_text(p.specs) kv(key,val)
          WHERE kv.val ~* '\d+\.?\d*\s*Ah'
          LIMIT 1
        )
        ELSE NULL
      END
    ) AS kwh
  FROM public.products p
  WHERE p.system_role = 'battery'
    AND p.battery_capacity_kwh IS NULL
) AS detected
WHERE products.id = detected.id
  AND detected.kwh IS NOT NULL
  AND detected.kwh > 0
  AND detected.kwh < 500;   -- sanity guard

-- ── 5. Battery type detection ─────────────────────────────────────────────────
UPDATE public.products
SET battery_type = CASE
  WHEN (coalesce(simplified_name,'') || ' ' || model || ' ' ||
        coalesce(battery_type,'')) ~* 'lifepo4|lithium iron|lfp'    THEN 'lifepo4'
  WHEN (coalesce(simplified_name,'') || ' ' || model) ~* 'lithium'  THEN 'lithium'
  WHEN (coalesce(simplified_name,'') || ' ' || model) ~* 'tubular'  THEN 'tubular'
  WHEN (coalesce(simplified_name,'') || ' ' || model) ~* '\bagm\b'  THEN 'agm'
  WHEN (coalesce(simplified_name,'') || ' ' || model) ~* '\bgel\b'  THEN 'gel'
  ELSE 'tubular'   -- Pakistan market default
END
WHERE system_role = 'battery'
  AND battery_type IS NULL;

-- ── 6. supported_battery_voltages for inverters ───────────────────────────────
UPDATE public.products
SET supported_battery_voltages = CASE
  WHEN (coalesce(simplified_name,'') || ' ' || model) ~* '24.*48|48.*24|dual' THEN ARRAY['24','48']
  WHEN inverter_power_kw < 3.7   THEN ARRAY['24']
  WHEN inverter_power_kw >= 4.0  THEN ARRAY['48']
  ELSE ARRAY['24','48']   -- 3.7–4.0 kW band: list both, uncertain
END
WHERE system_role = 'inverter'
  AND supported_battery_voltages IS NULL
  AND inverter_power_kw IS NOT NULL;

-- ── 7. voltage_class for batteries ───────────────────────────────────────────
UPDATE public.products
SET voltage_class = CASE
  WHEN battery_voltage = 24  THEN '24v'
  WHEN battery_voltage = 48  THEN '48v'
  ELSE 'unknown'
END
WHERE system_role = 'battery'
  AND voltage_class IS NULL
  AND battery_voltage IS NOT NULL;

-- ── 8. Re-run compatibility classification ────────────────────────────────────
-- Now that fields are populated, resolve missing_data_blocked products.

-- Inverters that now have power_kw → run compatibility rule
UPDATE public.products
SET
  compatibility_status = CASE
    WHEN inverter_power_kw < 3.7   THEN 'compatible'
    WHEN inverter_power_kw > 4.0   THEN 'compatible'
    WHEN inverter_power_kw BETWEEN 3.7 AND 4.0 THEN 'uncertain_manual_review'
    ELSE 'compatible'
  END,
  requires_compatibility_review = (inverter_power_kw BETWEEN 3.7 AND 4.0),
  compatibility_notes = CASE
    WHEN inverter_power_kw BETWEEN 3.7 AND 4.0
      THEN 'kW in 3.7–4.0 band — either 24V or 48V battery may be required. Manual review needed.'
    ELSE NULL
  END
WHERE system_role = 'inverter'
  AND inverter_power_kw IS NOT NULL
  AND compatibility_status = 'missing_data_blocked';

-- Batteries that now have voltage → mark compatible
UPDATE public.products
SET
  compatibility_status = 'compatible',
  requires_compatibility_review = false,
  compatibility_notes = NULL,
  compatible_inverter_min_kw = CASE WHEN battery_voltage = 48 THEN 4.0 ELSE 0.5  END,
  compatible_inverter_max_kw = CASE WHEN battery_voltage = 24 THEN 3.7 ELSE 100.0 END
WHERE system_role = 'battery'
  AND battery_voltage IS NOT NULL
  AND compatibility_status = 'missing_data_blocked';

-- ── Verification ─────────────────────────────────────────────────────────────
SELECT
  system_role,
  compatibility_status,
  count(*) AS n,
  count(*) FILTER (WHERE inverter_power_kw IS NOT NULL) AS has_kw,
  count(*) FILTER (WHERE battery_voltage IS NOT NULL)   AS has_voltage,
  round(avg(inverter_power_kw),2)                       AS avg_kw
FROM public.products
WHERE system_role IN ('inverter','battery')
GROUP BY system_role, compatibility_status
ORDER BY system_role, compatibility_status;
