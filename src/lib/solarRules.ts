/**
 * solarRules.ts — Canonical solar business rules for Tajalli's platform.
 *
 * SINGLE SOURCE OF TRUTH for:
 *  - Karachi tariff assumptions
 *  - Panel specs and installation cost rates
 *  - Battery cost fallback pricing and chemistry defaults
 *  - Bill-to-system-size thresholds
 *  - Per-system-size saving percentages
 *  - Net metering eligibility thresholds
 *  - Inverter price fallback
 *
 * All solar-facing pages (GreenCorridor, SolarCalculator) and admin tools
 * MUST import from here. Do not duplicate these values.
 *
 * When K-Electric tariff changes, update UNIT_RATE_PKR here only.
 * When package pricing changes, update SAVING_PCT_* here only.
 * When panel spec changes, update PANEL_WATTS and PANEL_PRICE_PER_W here only.
 */

// ── Tariff & cost constants ───────────────────────────────────────────────────

/** Karachi average blended electricity rate (PKR per kWh).
 *  Based on K-Electric tariff slab averaging for 300–700 unit consumers.
 *  Label in UI as "Karachi planning average" — not a guarantee of actual rate. */
export const UNIT_RATE_PKR = 70;

/** Fallback battery cost when no catalog product is matched (PKR per kWh). */
export const BATTERY_PKR_PER_KWH = 65000;

/** Fallback inverter cost when no catalog product is matched (PKR per kW). */
export const INVERTER_PKR_PER_KW = 55_000;

// ── Panel specification ───────────────────────────────────────────────────────

/** Standard panel size for all Tajalli packages: Crown Bi-Facial 620W.
 *  Used in panel count calculations and PDF line items. */
export const PANEL_WATTS = 620;

/** Flat per-panel price (PKR) — canonical pricing across all calculators. */
export const PANEL_PRICE_PKR = 30_000;

/** Panel cost fallback per watt — derived from flat per-panel price. */
export const PANEL_PRICE_PER_W = PANEL_PRICE_PKR / PANEL_WATTS;

// ── Installation cost rates ───────────────────────────────────────────────────

/** Solar system wiring & electrical equipment cost (PKR per watt). */
export const WIRING_PER_W = 12;

/** Solar installation labor cost (PKR per watt). */
export const LABOR_PER_W = 6;

/** Elevated galvanized steel frame surcharge (PKR per panel). 14-gauge, anti-rust coated. */
export const ELEVATED_FRAME_PER_PANEL = 17_500;

/** Elevated frame surcharge (PKR per watt) — derived from per-panel price. */
export const ELEVATED_FRAME_PER_W = ELEVATED_FRAME_PER_PANEL / PANEL_WATTS;

/** UPS system wiring & electrical equipment cost (PKR per watt). */
export const UPS_WIRING_PER_W = 9;

/** UPS installation labor cost (PKR per watt). */
export const UPS_LABOR_PER_W = 3;

// ── Battery chemistry default ─────────────────────────────────────────────────

/** Default battery chemistry for all standard Green Corridor packages.
 *  All packages include LiFePO4 as standard — Tall Tubular is not default. */
export const DEFAULT_BATTERY_CHEMISTRY: 'lithium' | 'tubular' = 'lithium';

/** Default battery chemistry label for UI display. */
export const DEFAULT_BATTERY_CHEMISTRY_LABEL = 'LiFePO₄ (Lithium Iron Phosphate)';

// ── Net metering ──────────────────────────────────────────────────────────────

/** K-Electric minimum system size for net metering approval (kW). */
export const NET_METERING_MIN_KW = 10;

/** One-time K-Electric net metering hardware + DISCO application fee (PKR). */
export const NET_METERING_COST_PKR = 250_000;

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

/** Monthly bill (PKR) above which we recommend the 6kW Advanced package (between 5kW and 8kW). */
export const BILL_THRESHOLD_6KW = 45_000;

/** Monthly bill (PKR) above which we recommend the 7kW Premium package. */
export const BILL_THRESHOLD_7KW = 60_000;

/** Monthly bill (PKR) above which we recommend the 8kW Total Freedom package. */
export const BILL_THRESHOLD_8KW = 75_000;

/** Monthly bill (PKR) above which we recommend the 10kW Ultimate package (net metering zone). */
export const BILL_THRESHOLD_INDUSTRIAL = 80_000;

// ── Per-system saving percentages ────────────────────────────────────────────
//
// Midpoints from each package's published bill-reduction range.
// Used in GreenCorridor calculator: monthlySaving = monthlyBill × pct (rounded to PKR 100).
// All packages now include battery; battery addon is always applied.
//
//   3kW Starter:       55–70%  → midpoint 62.5%  (base 57.5% + 5% battery)
//   5kW Home Complete: 70–85%  → midpoint 77.5%  (base 72.5% + 5% battery)
//   8kW Total Freedom: 75–90%  → midpoint 82.5%  (always battery-inclusive)

export const SAVING_PCT_3KW  = 0.575;
export const SAVING_PCT_5KW  = 0.725;
export const SAVING_PCT_6KW  = 0.775; // 75–80% midpoint
export const SAVING_PCT_7KW  = 0.800; // 80–85% midpoint
export const SAVING_PCT_8KW  = 0.825;
export const SAVING_PCT_10KW = 0.850; // 85–90% midpoint (net-metering eligible)
export const SAVING_PCT_12KW = 0.875;

/** Additional saving percentage from battery storage (LiFePO4 peak shaving).
 *  Battery charges on solar during the day and covers the evening K-Electric
 *  peak, further reducing grid draw. All Green Corridor packages include this. */
export const SAVING_PCT_BATTERY_ADDON = 0.05;

// ── Installment eligibility thresholds ───────────────────────────────────────

/** Systems above this kW are cash only. */
export const INSTALLMENT_MAX_KW = 5;

/** Packages above this price are cash only. */
export const INSTALLMENT_MAX_PKR = 700_000;

/** Packages above this price allow max 2 monthly payments. */
export const INSTALLMENT_2PAY_THRESHOLD = 500_000;

/** Packages above this price allow max 6 monthly payments. */
export const INSTALLMENT_6PAY_THRESHOLD = 150_000;

// ── Voltage inference helper ──────────────────────────────────────────────────

/** Returns the expected battery voltage class for a given inverter kW rating.
 *  Mirrors the thresholds in src/lib/compatibility.ts.
 *  Use for display/documentation; always run checkCompatibility() for enforcement. */
export function expectedBatteryVoltage(inverterKw: number): 24 | 48 | 'ambiguous' {
  if (inverterKw < 3.7) return 24;
  if (inverterKw > 4.0) return 48;
  return 'ambiguous';
}

/** Round a PKR amount to the nearest 100. */
export function roundTo100(n: number): number {
  return Math.round(n / 100) * 100;
}
