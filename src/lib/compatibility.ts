/**
 * compatibility.ts — Solar inverter/battery compatibility engine
 *
 * Business rules (non-negotiable):
 *  - 24V batteries only with inverters BELOW 3.7 kW
 *  - Inverters ABOVE 4.0 kW require 48V batteries
 *  - The 3.7–4.0 kW band is ambiguous → must force manual review
 *    UNLESS an explicit approved rule already exists in APPROVED_EDGE_RULES
 *  - Incompatible combinations: blocked everywhere (display, cart, package builder, exports)
 *  - Missing data: treated as missing_data_blocked — never guess
 *
 * Usage:
 *   import { checkCompatibility, filterCompatibleBatteries } from './compatibility';
 *
 *   const result = checkCompatibility({ inverterPowerKw: 3.6, batteryVoltage: 24 });
 *   // → { status: 'compatible', message: '3.6 kW inverter is compatible with 24V battery' }
 *
 *   const result = checkCompatibility({ inverterPowerKw: 3.8, batteryVoltage: 24 });
 *   // → { status: 'uncertain_manual_review', message: '...' }
 *
 *   const result = checkCompatibility({ inverterPowerKw: 5.0, batteryVoltage: 24 });
 *   // → { status: 'incompatible', message: '...' }
 */

// ── Compatibility status types ────────────────────────────────────────────────

export type CompatibilityStatus =
  | 'compatible'
  | 'incompatible'
  | 'uncertain_manual_review'
  | 'missing_data_blocked';

export interface CompatibilityResult {
  status:  CompatibilityStatus;
  message: string;
  /** Admin-visible notes for manual review / quarantine workflow */
  adminNote?: string;
}

// ── Voltage class definitions ─────────────────────────────────────────────────

export type VoltageClass = 24 | 48 | 'unknown';

/**
 * Recognized battery voltage values mapped to their VoltageClass.
 * Explicitly covers both numeric and string representations suppliers may use.
 */
export const BATTERY_VOLTAGE_MAP: Record<string, VoltageClass> = {
  '24':    24,
  '24v':   24,
  '24 v':  24,
  '48':    48,
  '48v':   48,
  '48 v':  48,
};

export function parseBatteryVoltage(raw: string | number | null | undefined): VoltageClass {
  if (raw === null || raw === undefined || raw === '') return 'unknown';
  const s = String(raw).toLowerCase().trim();
  return BATTERY_VOLTAGE_MAP[s] ?? 'unknown';
}

// ── Power boundary constants ──────────────────────────────────────────────────

/** Exclusive upper limit for 24V compatibility (inverters strictly below this) */
export const THRESHOLD_24V_MAX_KW = 3.7;

/** Exclusive lower limit for 48V required range (inverters strictly above this) */
export const THRESHOLD_48V_MIN_KW = 4.0;

/** Ambiguous band: [THRESHOLD_24V_MAX_KW, THRESHOLD_48V_MIN_KW] */
// Any inverter with kW in [3.7, 4.0] is in the ambiguous band.

// ── Approved edge-case rules ──────────────────────────────────────────────────
// These are explicit, manually verified exceptions within the 3.7–4.0 kW band.
// Each entry has been reviewed by a solar engineer and confirmed safe.
// Do NOT add entries here without documented supplier confirmation.

interface ApprovedEdgeRule {
  /** Matched by brand (case-insensitive prefix) */
  brand:    string;
  /** Matched by model (case-insensitive contains) */
  model:    string;
  /** Approved battery voltage for this specific model */
  approvedVoltage: 24 | 48;
  /** Reason / source of approval */
  note:     string;
}

export const APPROVED_EDGE_RULES: ApprovedEdgeRule[] = [
  // Crown Yorker 3.6kW is sold as a 24V system in Tajalli's standard package.
  // Manufacturer-confirmed: operates with 24V LiFePO4 at rated 3.6 kW output.
  {
    brand:           'crown',
    model:           'yorker',
    approvedVoltage: 24,
    note:            'Crown Yorker 3.6kW — manufacturer-confirmed 24V operation. Used in Tajalli standard 3.6kW package.',
  },
];

function _findApprovedEdgeRule(
  brand: string,
  model: string,
  batteryVoltage: 24 | 48,
): ApprovedEdgeRule | null {
  const b = brand.toLowerCase();
  const m = model.toLowerCase();
  for (const rule of APPROVED_EDGE_RULES) {
    if (b.includes(rule.brand) && m.includes(rule.model) && rule.approvedVoltage === batteryVoltage) {
      return rule;
    }
  }
  return null;
}

// ── Core compatibility check ───────────────────────────────────────────────────

export interface CompatibilityInput {
  /** Inverter rated power in kW. Null/undefined → missing_data_blocked */
  inverterPowerKw:  number | null | undefined;
  /** Battery voltage as number (24 or 48) or 'unknown'. Null/undefined → missing_data_blocked */
  batteryVoltage:   24 | 48 | 'unknown' | null | undefined;
  /** Optional: inverter brand for approved edge-rule lookup */
  inverterBrand?:   string;
  /** Optional: inverter model for approved edge-rule lookup */
  inverterModel?:   string;
}

/**
 * Determine whether an inverter and battery are compatible.
 *
 * Returns a structured result with status and human-readable message.
 * Never returns 'compatible' unless the combination is explicitly safe.
 */
export function checkCompatibility(input: CompatibilityInput): CompatibilityResult {
  const { inverterPowerKw, batteryVoltage, inverterBrand = '', inverterModel = '' } = input;

  // ── Missing data: block rather than guess ────────────────────────────────
  if (inverterPowerKw === null || inverterPowerKw === undefined) {
    return {
      status:    'missing_data_blocked',
      message:   'Inverter power rating is not set. Cannot determine compatibility.',
      adminNote: 'Set inverter_power_kw on this product before it can be recommended.',
    };
  }

  if (batteryVoltage === null || batteryVoltage === undefined || batteryVoltage === 'unknown') {
    return {
      status:    'missing_data_blocked',
      message:   'Battery voltage is not set. Cannot determine compatibility.',
      adminNote: 'Set battery_voltage (24 or 48) on this product before it can be recommended.',
    };
  }

  const kw = inverterPowerKw;
  const bv = batteryVoltage as 24 | 48;

  // ── 3.7–4.0 kW ambiguous band ────────────────────────────────────────────
  if (kw >= THRESHOLD_24V_MAX_KW && kw <= THRESHOLD_48V_MIN_KW) {
    // Check approved edge rules first
    const rule = _findApprovedEdgeRule(inverterBrand, inverterModel, bv);
    if (rule) {
      return {
        status:  'compatible',
        message: `${kw} kW inverter with ${bv}V battery — approved by manual review. (${rule.note})`,
      };
    }
    // No approved rule — force manual review
    return {
      status:    'uncertain_manual_review',
      message:   `${kw} kW inverter falls in the 3.7–4.0 kW ambiguous band. Compatibility with ${bv}V battery requires manual review.`,
      adminNote: `Inverter power ${kw} kW is in the 3.7–4.0 kW ambiguous compatibility band. Add an entry to APPROVED_EDGE_RULES in compatibility.ts after supplier confirmation.`,
    };
  }

  // ── 24V battery rules ────────────────────────────────────────────────────
  if (bv === 24) {
    if (kw < THRESHOLD_24V_MAX_KW) {
      return {
        status:  'compatible',
        message: `${kw} kW inverter is compatible with 24V battery (below ${THRESHOLD_24V_MAX_KW} kW threshold).`,
      };
    }
    // kW > 4.0 (the band was handled above)
    return {
      status:    'incompatible',
      message:   `${kw} kW inverter is incompatible with 24V battery. Inverters above ${THRESHOLD_48V_MIN_KW} kW require a 48V battery.`,
      adminNote: `Do not recommend this 24V battery with a ${kw} kW inverter. Remove this pairing from any package, bundle, or recommendation.`,
    };
  }

  // ── 48V battery rules ────────────────────────────────────────────────────
  if (bv === 48) {
    if (kw > THRESHOLD_48V_MIN_KW) {
      return {
        status:  'compatible',
        message: `${kw} kW inverter is compatible with 48V battery (above ${THRESHOLD_48V_MIN_KW} kW threshold).`,
      };
    }
    // kW < 3.7: 48V with a small inverter — technically possible but unusual
    // We allow it as compatible (48V can work with lower-power inverters in some configs)
    // but flag it for admin awareness if the gap is large.
    if (kw <= 2.0) {
      return {
        status:    'uncertain_manual_review',
        message:   `${kw} kW inverter with 48V battery — unusual pairing. Verify with supplier.`,
        adminNote: `A ${kw} kW inverter with a 48V battery is technically possible but atypical. Confirm with Crown/supplier before recommending.`,
      };
    }
    // 2.0 < kW < 3.7 with 48V: acceptable (48V is compatible across a wide range)
    return {
      status:  'compatible',
      message: `${kw} kW inverter is compatible with 48V battery.`,
    };
  }

  // Should never reach here
  return {
    status:    'missing_data_blocked',
    message:   'Unrecognized battery voltage value. Cannot determine compatibility.',
    adminNote: `batteryVoltage value "${batteryVoltage}" is not recognized. Use 24 or 48.`,
  };
}

// ── Batch filter for UI selectors ─────────────────────────────────────────────

export interface BatteryOption {
  id:             string;
  brand:          string;
  model:          string;
  batteryVoltage: 24 | 48 | 'unknown';
  /** Any other display fields */
  [key: string]: unknown;
}

/**
 * Filter a list of battery options to only those compatible with a given inverter.
 * Used in product selectors, MYOP, quote builder to prevent incompatible selections.
 *
 * Returns batteries that are 'compatible' only.
 * Batteries with 'uncertain_manual_review' or 'missing_data_blocked' are excluded.
 */
export function filterCompatibleBatteries(
  batteries: BatteryOption[],
  inverterPowerKw: number,
  inverterBrand = '',
  inverterModel = '',
): BatteryOption[] {
  return batteries.filter(bat => {
    const result = checkCompatibility({
      inverterPowerKw,
      batteryVoltage:  bat.batteryVoltage,
      inverterBrand,
      inverterModel,
    });
    return result.status === 'compatible';
  });
}

/**
 * Returns true only if the inverter/battery combination is definitively compatible.
 * Use this as a hard guard before allowing a combination into any cart, quote, or export.
 */
export function isCompatible(input: CompatibilityInput): boolean {
  return checkCompatibility(input).status === 'compatible';
}

/**
 * Returns true if the combination requires admin review before it can be used.
 */
export function requiresReview(input: CompatibilityInput): boolean {
  const s = checkCompatibility(input).status;
  return s === 'uncertain_manual_review' || s === 'missing_data_blocked';
}

// ── Package composition validator ─────────────────────────────────────────────

export interface PackageComponent {
  type:           'inverter' | 'battery' | 'panel' | 'other';
  brand:          string;
  model:          string;
  powerKw?:       number;   // inverters
  batteryVoltage?: 24 | 48 | 'unknown'; // batteries
}

export interface PackageValidationResult {
  valid:    boolean;
  status:   CompatibilityStatus | 'no_inverter' | 'no_battery' | 'ok';
  message:  string;
  details:  CompatibilityResult | null;
}

/**
 * Validate an entire package composition (inverter + battery + optional panels).
 * Returns a structured result safe to show in UI or block in cart/checkout.
 */
export function validatePackage(components: PackageComponent[]): PackageValidationResult {
  const inverter = components.find(c => c.type === 'inverter');
  const battery  = components.find(c => c.type === 'battery');

  if (!inverter) {
    return { valid: false, status: 'no_inverter', message: 'No inverter in this package.', details: null };
  }
  if (!battery) {
    return { valid: false, status: 'no_battery', message: 'No battery in this package.', details: null };
  }

  const details = checkCompatibility({
    inverterPowerKw:  inverter.powerKw ?? null,
    batteryVoltage:   battery.batteryVoltage ?? 'unknown',
    inverterBrand:    inverter.brand,
    inverterModel:    inverter.model,
  });

  return {
    valid:   details.status === 'compatible',
    status:  details.status,
    message: details.message,
    details,
  };
}

// ── Standard package compositions (Tajalli's current packages) ────────────────
// These are pre-validated at design time. Kept here as reference truth.
// If a package component changes, re-run validatePackage() and update this list.

export const PACKAGE_COMPATIBILITY_REGISTRY: Record<string, PackageValidationResult> = {
  'ups-3.6kw': validatePackage([
    { type: 'inverter', brand: 'Crown', model: 'Yorker 3.6kW', powerKw: 3.6 },
    { type: 'battery',  brand: 'Crown', model: 'LiFePO4 2.4kWh', batteryVoltage: 24 },
  ]),
  'solar-3.6kw': validatePackage([
    { type: 'inverter', brand: 'Crown', model: 'Yorker 3.6kW', powerKw: 3.6 },
    { type: 'battery',  brand: 'Crown', model: 'LiFePO4 2.4kWh', batteryVoltage: 24 },
    { type: 'panel',    brand: 'Crown', model: 'Bi-Facial 620W ×6' },
  ]),
  'ups-5kw': validatePackage([
    { type: 'inverter', brand: 'Crown', model: '5kW Inverter', powerKw: 5.0 },
    { type: 'battery',  brand: 'Crown', model: 'LiFePO4 5.12kWh', batteryVoltage: 48 },
  ]),
  'solar-5kw': validatePackage([
    { type: 'inverter', brand: 'Crown', model: '5kW Inverter', powerKw: 5.0 },
    { type: 'battery',  brand: 'Crown', model: 'LiFePO4 5.12kWh', batteryVoltage: 48 },
    { type: 'panel',    brand: 'Crown', model: 'Bi-Facial 620W ×8' },
  ]),
  'solar-8kw': validatePackage([
    { type: 'inverter', brand: 'Crown', model: '8kW Hybrid Inverter', powerKw: 8.0 },
    { type: 'battery',  brand: 'Crown', model: 'LiFePO4 5.12kWh', batteryVoltage: 48 },
    { type: 'panel',    brand: 'Crown', model: 'Bi-Facial 620W ×14' },
  ]),
  'solar-12kw': validatePackage([
    { type: 'inverter', brand: 'Ziewnic', model: 'RouX Ultra 12kW', powerKw: 12.0 },
    { type: 'battery',  brand: 'Crown', model: 'LiFePO4 5.12kWh', batteryVoltage: 48 },
    { type: 'panel',    brand: 'Crown', model: 'Bi-Facial 620W ×20' },
  ]),
};
