/**
 * solarRules.ts — Canonical solar business rules for Tajalli's platform.
 *
 * SINGLE SOURCE OF TRUTH for:
 *  - Karachi tariff assumptions
 *  - Battery cost fallback pricing
 *  - Bill-to-system-size thresholds
 *  - Per-system-size saving percentages
 *
 * All solar-facing pages (GreenCorridor, SolarCalculator) and admin tools
 * MUST import from here. Do not duplicate these values.
 *
 * When K-Electric tariff changes, update UNIT_RATE_PKR here only.
 * When package pricing changes, update SAVING_PCT_* here only.
 */

// ── Tariff & cost constants ───────────────────────────────────────────────────

/** Karachi average blended electricity rate (PKR per kWh).
 *  Based on K-Electric tariff slab averaging for 300–700 unit consumers. */
export const UNIT_RATE_PKR = 70;

/** Fallback battery cost when no catalog product is matched (PKR per kWh). */
export const BATTERY_PKR_PER_KWH = 65000;

// ── Bill-to-system-size thresholds ───────────────────────────────────────────
//
// These drive the GreenCorridor calculator matchedPackage selection.
// A user's monthly bill is the primary sizing signal.
//
//   < BILL_THRESHOLD_SMALL  →  3kW Starter
//   < BILL_THRESHOLD_LARGE  →  5kW Home Complete
//   ≥ BILL_THRESHOLD_LARGE  →  8kW Total Freedom

/** Monthly bill (PKR) below which we recommend the 3kW Starter package. */
export const BILL_THRESHOLD_SMALL = 15_000;

/** Monthly bill (PKR) above which we recommend the 8kW Total Freedom package. */
export const BILL_THRESHOLD_LARGE = 40_000;

// ── Per-system saving percentages ────────────────────────────────────────────
//
// Midpoints from each package's published bill-reduction range.
// Used in GreenCorridor calculator: monthlySaving = monthlyBill × pct (rounded to PKR 100).
//
//   3kW Starter:       50–65%  → midpoint 57.5%
//   5kW Home Complete: 65–80%  → midpoint 72.5%
//   8kW Total Freedom: 75–90%  → midpoint 82.5%

export const SAVING_PCT_3KW = 0.575;
export const SAVING_PCT_5KW = 0.725;
export const SAVING_PCT_8KW = 0.825;

/** Additional saving percentage when a battery is added to a solar package.
 *  Battery extends solar self-consumption into evening peak hours,
 *  further reducing grid draw and bill. */
export const SAVING_PCT_BATTERY_ADDON = 0.05;

// ── Voltage inference helper ──────────────────────────────────────────────────

/** Returns the expected battery voltage class for a given inverter kW rating.
 *  Mirrors the thresholds in src/lib/compatibility.ts.
 *  Use for display/documentation; always run checkCompatibility() for enforcement. */
export function expectedBatteryVoltage(inverterKw: number): 24 | 48 | 'ambiguous' {
  if (inverterKw < 3.7) return 24;
  if (inverterKw > 4.0) return 48;
  return 'ambiguous';
}
