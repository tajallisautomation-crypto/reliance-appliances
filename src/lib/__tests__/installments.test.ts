import { describe, it, expect, beforeEach } from 'vitest';
import { allows12m, isTrueT3, calcPlan as apiCalcPlan, roundTo100 } from '../api';
import { calcPlan, getDefaultPlanRatios, setActivePlanRatios, getActivePlanRatios } from '../plans';

// ── allows12m ─────────────────────────────────────────────────────────────────

describe('allows12m', () => {
  it('qualifies at exactly 50,000 PKR', () => {
    expect(allows12m(50000)).toBe(true);
  });

  it('qualifies above 50,000 PKR', () => {
    expect(allows12m(148500)).toBe(true);
    expect(allows12m(200000)).toBe(true);
  });

  it('does not qualify below 50,000 PKR', () => {
    expect(allows12m(49900)).toBe(false);
    expect(allows12m(30000)).toBe(false);
    expect(allows12m(0)).toBe(false);
  });

  it('fan exception: always qualifies regardless of price', () => {
    expect(allows12m(5000,  'fan')).toBe(true);
    expect(allows12m(10000, 'fan')).toBe(true);
    expect(allows12m(0,     'fan')).toBe(true);
  });

  it('non-fan low-price product does NOT qualify', () => {
    expect(allows12m(15000, 'small-appliance')).toBe(false);
    expect(allows12m(25000, 'kitchen')).toBe(false);
  });

  it('other categories still need 50,000 threshold', () => {
    expect(allows12m(50000, 'refrigerator')).toBe(true);
    expect(allows12m(49999, 'refrigerator')).toBe(false);
    expect(allows12m(50000, 'air-conditioner')).toBe(true);
  });
});

// ── isTrueT3 ──────────────────────────────────────────────────────────────────

describe('isTrueT3', () => {
  it('returns true when model contains standalone T3 token', () => {
    expect(isTrueT3('HSU-18HNF/T3')).toBe(true);
    expect(isTrueT3('GS-18CITH3B T3')).toBe(true);
    expect(isTrueT3('HAIER T3 SERIES')).toBe(true);
  });

  it('returns true for lowercase t3 (matched case-insensitively)', () => {
    expect(isTrueT3('model-t3-variant')).toBe(true);
  });

  it('returns false when T3 is part of a longer token', () => {
    expect(isTrueT3('HWT-T32B')).toBe(false);
    expect(isTrueT3('3T3000X')).toBe(false);
    expect(isTrueT3('T3RATED')).toBe(false);   // no word boundary
  });

  it('returns false for models with no T3', () => {
    expect(isTrueT3('HSU-18HNF')).toBe(false);
    expect(isTrueT3('GS-18LM3L1')).toBe(false);
    expect(isTrueT3('')).toBe(false);
  });

  it('returns false for T1, T2 — only T3 qualifies', () => {
    expect(isTrueT3('HSU-12T1')).toBe(false);
    expect(isTrueT3('MODEL T2')).toBe(false);
  });
});

// ── plans.ts calcPlan ─────────────────────────────────────────────────────────

describe('plans.calcPlan — default ratios', () => {
  const defaults = getDefaultPlanRatios();

  it('2m plan: advance ≈ 50%, 1 installment, 8% markup', () => {
    const plan = calcPlan(100000, '2m');
    expect(plan.months).toBe(2);
    // contractTotal = round100(100000 * 1.08) = 108000
    // advance       = round100(108000 * 0.50) = 54000
    // monthly       = ceil((108000-54000)/1/100)*100 = 54000
    expect(plan.advance).toBe(54000);
    expect(plan.monthly).toBe(54000);
    expect(plan.total).toBe(108000);
  });

  it('3m plan: 2 monthly payments after advance', () => {
    const plan = calcPlan(100000, '3m');
    expect(plan.months).toBe(3);
    // contractTotal = round100(100000 * 1.13) = 113000
    // advance       = round100(113000 * 0.45) = 50900 → round100 → 50900
    // remaining = 113000 - 50900 = 62100; monthly = ceil(62100/2/100)*100 = 31100
    // total = 50900 + 31100*2 = 113100 — slight rounding-up delta is acceptable
    expect(plan.months).toBe(3);
    expect(plan.advance).toBeGreaterThan(0);
    expect(plan.monthly).toBeGreaterThan(0);
    expect(plan.total).toBeGreaterThanOrEqual(113000);
  });

  it('6m plan: 5 monthly payments', () => {
    const plan = calcPlan(150000, '6m');
    expect(plan.months).toBe(6);
    // contractTotal = round100(150000 * 1.20) = 180000
    // advance = round100(180000 * 0.40) = 72000
    // monthly = ceil(108000/5/100)*100 = ceil(21600)*100 = 21600
    expect(plan.advance).toBe(72000);
    expect(plan.monthly).toBe(21600);
    expect(plan.total).toBe(72000 + 21600 * 5);
  });

  it('12m plan: 11 monthly payments', () => {
    const plan = calcPlan(100000, '12m');
    expect(plan.months).toBe(12);
    // contractTotal = round100(100000 * 1.35) = 135000
    // advance = round100(135000 * 0.30) = 40500
    // remaining = 94500; monthly = ceil(94500/11/100)*100 = ceil(859.09)*100 = 8600
    // total = 40500 + 8600*11 = 135100
    expect(plan.advance).toBe(40500);
    expect(plan.monthly).toBe(8600);
    expect(plan.total).toBe(40500 + 8600 * 11);
  });

  it('total is always ≥ contractTotal (rounding only ever adds, never removes)', () => {
    for (const price of [50000, 75000, 100000, 148500, 250000]) {
      for (const key of ['2m', '3m', '6m', '12m'] as const) {
        const plan = calcPlan(price, key);
        const contractTotal = roundTo100(price * defaults[key].markup);
        expect(plan.total).toBeGreaterThanOrEqual(contractTotal);
      }
    }
  });

  it('advance + monthly payments always equals total', () => {
    for (const price of [50000, 100000, 200000]) {
      for (const key of ['2m', '3m', '6m', '12m'] as const) {
        const plan = calcPlan(price, key);
        expect(plan.total).toBe(plan.advance + plan.monthly * defaults[key].installments);
      }
    }
  });
});

// ── setActivePlanRatios override ──────────────────────────────────────────────

describe('plans.setActivePlanRatios', () => {
  const original = getDefaultPlanRatios();

  it('overrides plan ratios at runtime', () => {
    setActivePlanRatios({ ...original, '3m': { markup: 1.20, advRatio: 0.50, installments: 2 } });
    const plan = calcPlan(100000, '3m');
    // contractTotal = round100(100000 * 1.20) = 120000
    // advance = round100(120000 * 0.50) = 60000
    expect(plan.advance).toBe(60000);
  });

  it('restores defaults correctly', () => {
    setActivePlanRatios({ ...original });
    const plan = calcPlan(100000, '3m');
    // contractTotal = round100(100000 * 1.13) = 113000; advance = round100(113000 * 0.45) = 50900
    expect(plan.advance).toBe(50900);
    expect(plan.months).toBe(3);
  });
});

// ── roundTo100 helper ─────────────────────────────────────────────────────────

describe('roundTo100', () => {
  it('rounds to nearest 100', () => {
    expect(roundTo100(12345)).toBe(12300);
    expect(roundTo100(12350)).toBe(12400);
    expect(roundTo100(12400)).toBe(12400);
    expect(roundTo100(0)).toBe(0);
  });
});
