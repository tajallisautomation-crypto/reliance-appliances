/**
 * Regression tests — solar compatibility engine
 *
 * Run with: npx vitest src/lib/__tests__/compatibility.test.ts
 *
 * These tests enforce the non-negotiable battery/inverter compatibility rules.
 * If any test breaks, the underlying rule was violated — do NOT disable the test.
 *
 * Business rules under test:
 *  - 24V batteries allowed only with inverters BELOW 3.7 kW
 *  - Inverters ABOVE 4.0 kW require 48V batteries
 *  - 3.7–4.0 kW band is ambiguous → uncertain_manual_review unless approved rule exists
 *  - Missing data → missing_data_blocked (never guess)
 *  - Crown Yorker 3.6kW + 24V is an approved edge case
 *  - Standard Tajalli packages must all be compatible
 */

import { describe, it, expect } from 'vitest';
import {
  checkCompatibility,
  filterCompatibleBatteries,
  isCompatible,
  requiresReview,
  validatePackage,
  parseBatteryVoltage,
  PACKAGE_COMPATIBILITY_REGISTRY,
  THRESHOLD_24V_MAX_KW,
  THRESHOLD_48V_MIN_KW,
  type BatteryOption,
} from '../compatibility';

// ─────────────────────────────────────────────────────────────────────────────
// A. Core threshold constants
// ─────────────────────────────────────────────────────────────────────────────

describe('compatibility thresholds', () => {
  it('THRESHOLD_24V_MAX_KW is 3.7', () => {
    expect(THRESHOLD_24V_MAX_KW).toBe(3.7);
  });
  it('THRESHOLD_48V_MIN_KW is 4.0', () => {
    expect(THRESHOLD_48V_MIN_KW).toBe(4.0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. 24V battery rules
// ─────────────────────────────────────────────────────────────────────────────

describe('24V battery compatibility', () => {
  it('24V battery with 3.6 kW inverter → compatible', () => {
    const r = checkCompatibility({ inverterPowerKw: 3.6, batteryVoltage: 24 });
    expect(r.status).toBe('compatible');
  });

  it('24V battery with 2.0 kW inverter → compatible', () => {
    const r = checkCompatibility({ inverterPowerKw: 2.0, batteryVoltage: 24 });
    expect(r.status).toBe('compatible');
  });

  it('24V battery with 1.0 kW inverter → compatible', () => {
    const r = checkCompatibility({ inverterPowerKw: 1.0, batteryVoltage: 24 });
    expect(r.status).toBe('compatible');
  });

  it('24V battery with 3.69 kW inverter → still compatible (below 3.7 threshold)', () => {
    const r = checkCompatibility({ inverterPowerKw: 3.69, batteryVoltage: 24 });
    expect(r.status).toBe('compatible');
  });

  it('24V battery with 5.0 kW inverter → incompatible', () => {
    const r = checkCompatibility({ inverterPowerKw: 5.0, batteryVoltage: 24 });
    expect(r.status).toBe('incompatible');
  });

  it('24V battery with 8.0 kW inverter → incompatible', () => {
    const r = checkCompatibility({ inverterPowerKw: 8.0, batteryVoltage: 24 });
    expect(r.status).toBe('incompatible');
  });

  it('incompatible result includes admin note', () => {
    const r = checkCompatibility({ inverterPowerKw: 5.0, batteryVoltage: 24 });
    expect(r.adminNote).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. 48V battery rules
// ─────────────────────────────────────────────────────────────────────────────

describe('48V battery compatibility', () => {
  it('48V battery with 5.0 kW inverter → compatible', () => {
    const r = checkCompatibility({ inverterPowerKw: 5.0, batteryVoltage: 48 });
    expect(r.status).toBe('compatible');
  });

  it('48V battery with 8.0 kW inverter → compatible', () => {
    const r = checkCompatibility({ inverterPowerKw: 8.0, batteryVoltage: 48 });
    expect(r.status).toBe('compatible');
  });

  it('48V battery with 4.1 kW inverter → compatible', () => {
    const r = checkCompatibility({ inverterPowerKw: 4.1, batteryVoltage: 48 });
    expect(r.status).toBe('compatible');
  });

  it('48V battery with 3.0 kW inverter → compatible (48V works with lower power, not flagged)', () => {
    const r = checkCompatibility({ inverterPowerKw: 3.0, batteryVoltage: 48 });
    expect(r.status).toBe('compatible');
  });

  it('48V battery with very small 1.0 kW inverter → uncertain_manual_review (atypical pairing)', () => {
    const r = checkCompatibility({ inverterPowerKw: 1.0, batteryVoltage: 48 });
    expect(r.status).toBe('uncertain_manual_review');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. Ambiguous 3.7–4.0 kW band
// ─────────────────────────────────────────────────────────────────────────────

describe('3.7–4.0 kW ambiguous band', () => {
  it('3.7 kW + 24V → uncertain_manual_review (no approved rule)', () => {
    const r = checkCompatibility({ inverterPowerKw: 3.7, batteryVoltage: 24 });
    expect(r.status).toBe('uncertain_manual_review');
  });

  it('4.0 kW + 24V → uncertain_manual_review (no approved rule)', () => {
    const r = checkCompatibility({ inverterPowerKw: 4.0, batteryVoltage: 24 });
    expect(r.status).toBe('uncertain_manual_review');
  });

  it('3.8 kW + 48V → uncertain_manual_review (no approved rule in band)', () => {
    const r = checkCompatibility({ inverterPowerKw: 3.8, batteryVoltage: 48 });
    expect(r.status).toBe('uncertain_manual_review');
  });

  it('uncertain_manual_review result includes adminNote', () => {
    const r = checkCompatibility({ inverterPowerKw: 3.8, batteryVoltage: 24 });
    expect(r.adminNote).toBeTruthy();
    expect(r.adminNote).toContain('3.7');
  });

  it('Crown Yorker 3.6kW + 24V → compatible (approved edge rule)', () => {
    // 3.6kW is BELOW 3.7 threshold, so it's not in the ambiguous band.
    // This test confirms the approved package is compatible.
    const r = checkCompatibility({
      inverterPowerKw: 3.6,
      batteryVoltage: 24,
      inverterBrand: 'Crown',
      inverterModel: 'Yorker 3.6kW',
    });
    expect(r.status).toBe('compatible');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. Missing data handling
// ─────────────────────────────────────────────────────────────────────────────

describe('missing data → blocked', () => {
  it('null inverterPowerKw → missing_data_blocked', () => {
    const r = checkCompatibility({ inverterPowerKw: null, batteryVoltage: 24 });
    expect(r.status).toBe('missing_data_blocked');
  });

  it('undefined inverterPowerKw → missing_data_blocked', () => {
    const r = checkCompatibility({ inverterPowerKw: undefined, batteryVoltage: 48 });
    expect(r.status).toBe('missing_data_blocked');
  });

  it('unknown batteryVoltage → missing_data_blocked', () => {
    const r = checkCompatibility({ inverterPowerKw: 5.0, batteryVoltage: 'unknown' });
    expect(r.status).toBe('missing_data_blocked');
  });

  it('null batteryVoltage → missing_data_blocked', () => {
    const r = checkCompatibility({ inverterPowerKw: 5.0, batteryVoltage: null });
    expect(r.status).toBe('missing_data_blocked');
  });

  it('missing_data_blocked result always has adminNote', () => {
    const r = checkCompatibility({ inverterPowerKw: null, batteryVoltage: 24 });
    expect(r.adminNote).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F. Helper functions
// ─────────────────────────────────────────────────────────────────────────────

describe('isCompatible helper', () => {
  it('returns true for compatible pair', () => {
    expect(isCompatible({ inverterPowerKw: 3.6, batteryVoltage: 24 })).toBe(true);
  });

  it('returns false for incompatible pair', () => {
    expect(isCompatible({ inverterPowerKw: 5.0, batteryVoltage: 24 })).toBe(false);
  });

  it('returns false for missing data', () => {
    expect(isCompatible({ inverterPowerKw: null, batteryVoltage: 24 })).toBe(false);
  });

  it('returns false for ambiguous band (uncertain = not safe to approve)', () => {
    expect(isCompatible({ inverterPowerKw: 3.8, batteryVoltage: 24 })).toBe(false);
  });
});

describe('requiresReview helper', () => {
  it('returns true for ambiguous band', () => {
    expect(requiresReview({ inverterPowerKw: 3.8, batteryVoltage: 24 })).toBe(true);
  });

  it('returns true for missing data', () => {
    expect(requiresReview({ inverterPowerKw: null, batteryVoltage: 24 })).toBe(true);
  });

  it('returns false for clearly compatible pair', () => {
    expect(requiresReview({ inverterPowerKw: 5.0, batteryVoltage: 48 })).toBe(false);
  });

  it('returns false for clearly incompatible pair (no review needed — already blocked)', () => {
    // incompatible is definitive — no review needed, just blocked
    expect(requiresReview({ inverterPowerKw: 5.0, batteryVoltage: 24 })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G. filterCompatibleBatteries — UI selector guard
// ─────────────────────────────────────────────────────────────────────────────

describe('filterCompatibleBatteries', () => {
  const batteries: BatteryOption[] = [
    { id: 'bat-24v', brand: 'Crown', model: 'LiFePO4 2.4kWh', batteryVoltage: 24 },
    { id: 'bat-48v', brand: 'Crown', model: 'LiFePO4 5.12kWh', batteryVoltage: 48 },
    { id: 'bat-unk', brand: 'Unknown', model: 'Old Battery', batteryVoltage: 'unknown' },
  ];

  it('for 3.6kW inverter: both 24V and 48V batteries are compatible (unknown is blocked)', () => {
    // 3.6kW < 3.7kW threshold → 24V is allowed.
    // 3.6kW is also in range where 48V is acceptable (2.0 < 3.6 < 4.0, no ambiguous band for 48V here).
    // Only unknown-voltage battery is blocked (missing_data_blocked).
    const result = filterCompatibleBatteries(batteries, 3.6);
    expect(result.map(b => b.id)).toContain('bat-24v');
    expect(result.map(b => b.id)).toContain('bat-48v');
    expect(result.map(b => b.id)).not.toContain('bat-unk'); // missing data → blocked
  });

  it('for 5.0kW inverter: only 48V battery is compatible', () => {
    const result = filterCompatibleBatteries(batteries, 5.0);
    expect(result.map(b => b.id)).toContain('bat-48v');
    expect(result.map(b => b.id)).not.toContain('bat-24v');
    expect(result.map(b => b.id)).not.toContain('bat-unk');
  });

  it('for 3.8kW inverter: no batteries pass (ambiguous band → review required)', () => {
    const result = filterCompatibleBatteries(batteries, 3.8);
    // 3.8kW is in ambiguous band — uncertain_manual_review → not returned by filter
    // 24V + 3.8kW → uncertain (in band)
    // 48V + 3.8kW → uncertain (in band)
    // unknown → missing_data_blocked
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H. parseBatteryVoltage
// ─────────────────────────────────────────────────────────────────────────────

describe('parseBatteryVoltage', () => {
  it('parses "24" → 24', () => expect(parseBatteryVoltage('24')).toBe(24));
  it('parses "24v" → 24', () => expect(parseBatteryVoltage('24v')).toBe(24));
  it('parses "24 V" → 24', () => expect(parseBatteryVoltage('24 V')).toBe(24));
  it('parses "48" → 48', () => expect(parseBatteryVoltage('48')).toBe(48));
  it('parses 24 (number) → 24', () => expect(parseBatteryVoltage(24)).toBe(24));
  it('parses null → unknown', () => expect(parseBatteryVoltage(null)).toBe('unknown'));
  it('parses "" → unknown', () => expect(parseBatteryVoltage('')).toBe('unknown'));
  it('parses "12v" → unknown (not a recognized voltage)', () => expect(parseBatteryVoltage('12v')).toBe('unknown'));
});

// ─────────────────────────────────────────────────────────────────────────────
// I. validatePackage — full package composition
// ─────────────────────────────────────────────────────────────────────────────

describe('validatePackage', () => {
  it('valid 3.6kW 24V package → valid', () => {
    const r = validatePackage([
      { type: 'inverter', brand: 'Crown', model: 'Yorker 3.6kW', powerKw: 3.6 },
      { type: 'battery',  brand: 'Crown', model: 'LiFePO4 2.4kWh', batteryVoltage: 24 },
    ]);
    expect(r.valid).toBe(true);
    expect(r.status).toBe('compatible');
  });

  it('invalid 5kW + 24V package → invalid', () => {
    const r = validatePackage([
      { type: 'inverter', brand: 'Crown', model: '5kW Inverter', powerKw: 5.0 },
      { type: 'battery',  brand: 'Crown', model: 'LiFePO4 2.4kWh', batteryVoltage: 24 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.status).toBe('incompatible');
  });

  it('package without inverter → invalid (no_inverter)', () => {
    const r = validatePackage([
      { type: 'battery', brand: 'Crown', model: 'LiFePO4 5.12kWh', batteryVoltage: 48 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.status).toBe('no_inverter');
  });

  it('package without battery → invalid (no_battery)', () => {
    const r = validatePackage([
      { type: 'inverter', brand: 'Crown', model: '5kW Inverter', powerKw: 5.0 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.status).toBe('no_battery');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// J. Standard Tajalli packages — all must be pre-validated as compatible
// ─────────────────────────────────────────────────────────────────────────────

describe('PACKAGE_COMPATIBILITY_REGISTRY — all standard packages', () => {
  it('ups-3.6kw package → compatible', () => {
    expect(PACKAGE_COMPATIBILITY_REGISTRY['ups-3.6kw'].valid).toBe(true);
  });

  it('solar-3.6kw package → compatible', () => {
    expect(PACKAGE_COMPATIBILITY_REGISTRY['solar-3.6kw'].valid).toBe(true);
  });

  it('ups-5kw package → compatible', () => {
    expect(PACKAGE_COMPATIBILITY_REGISTRY['ups-5kw'].valid).toBe(true);
  });

  it('solar-5kw package → compatible', () => {
    expect(PACKAGE_COMPATIBILITY_REGISTRY['solar-5kw'].valid).toBe(true);
  });

  it('solar-8kw package → compatible', () => {
    expect(PACKAGE_COMPATIBILITY_REGISTRY['solar-8kw'].valid).toBe(true);
  });

  it('no standard package is incompatible', () => {
    for (const [id, result] of Object.entries(PACKAGE_COMPATIBILITY_REGISTRY)) {
      expect(result.status, `Package ${id} should not be incompatible`).not.toBe('incompatible');
    }
  });

  it('no standard package requires manual review', () => {
    for (const [id, result] of Object.entries(PACKAGE_COMPATIBILITY_REGISTRY)) {
      expect(result.status, `Package ${id} should not require manual review`).not.toBe('uncertain_manual_review');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K. Services catalog rules
// ─────────────────────────────────────────────────────────────────────────────

describe('services catalog business rules', () => {
  it('requiresSiteConsultation is false for orders at PKR 1,000,000', async () => {
    const { requiresSiteConsultation } = await import('../services');
    expect(requiresSiteConsultation(1_000_000)).toBe(false);
  });

  it('requiresSiteConsultation is true for orders above PKR 1,000,000', async () => {
    const { requiresSiteConsultation } = await import('../services');
    expect(requiresSiteConsultation(1_000_001)).toBe(true);
    expect(requiresSiteConsultation(2_000_000)).toBe(true);
  });

  it('DELIVERY_POLICY window is 48 hours', async () => {
    const { DELIVERY_POLICY } = await import('../services');
    expect(DELIVERY_POLICY.windowHours).toBe(48);
  });

  it('INSTALLMENT_POLICY requires advance before verification', async () => {
    const { INSTALLMENT_POLICY } = await import('../services');
    expect(INSTALLMENT_POLICY.advanceRequired).toBe(true);
    expect(INSTALLMENT_POLICY.advanceRequiredBefore).toBe('verification');
  });

  it('all services with installationProvider=brand_free have price.type=free', async () => {
    const { SERVICES_CATALOG } = await import('../services');
    for (const s of SERVICES_CATALOG) {
      if (s.installationProvider === 'brand_free') {
        expect(s.price.type, `${s.id} brand_free service should have price.type=free`).toBe('free');
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// L. Solar frame deduction (regression — must not change)
// ─────────────────────────────────────────────────────────────────────────────

describe('3.6kW solar frame deduction — regression', () => {
  it('3.6kW package frameDeduction is exactly 96000', async () => {
    const { PACKAGES } = await import('../../pages/SolarPage');
    const pkg36 = PACKAGES.find((p: { id: string }) => p.id === 'solar-3.6kw');
    expect(pkg36).toBeDefined();
    expect(pkg36!.frameDeduction).toBe(96000);
  });

  it('price without frame = total − 96000', async () => {
    const { PACKAGES } = await import('../../pages/SolarPage');
    const pkg36 = PACKAGES.find((p: { id: string }) => p.id === 'solar-3.6kw');
    expect(pkg36!.total - pkg36!.frameDeduction).toBe(pkg36!.total - 96000);
  });

  it('5kW frame deduction is not 96000 (different package has different deduction)', async () => {
    const { PACKAGES } = await import('../../pages/SolarPage');
    const pkg5 = PACKAGES.find((p: { id: string }) => p.id === 'solar-5kw');
    expect(pkg5!.frameDeduction).not.toBe(96000);
  });
});
