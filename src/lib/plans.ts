/**
 * Installment plan calculations — INTERNAL USE ONLY.
 * These ratios must NEVER be surfaced in customer-facing UI.
 * The customer only sees: advance amount (PKR), monthly amount (PKR), total (PKR).
 */

type PlanRatio = { markup: number; advRatio: number; installments: number };
type PlanRatioMap = Record<'2m' | '3m' | '6m' | '12m', PlanRatio>;

const _DEFAULT_PLANS: PlanRatioMap = {
  '2m':  { markup: 1.08, advRatio: 0.50, installments: 1  },
  '3m':  { markup: 1.13, advRatio: 0.45, installments: 2  },
  '6m':  { markup: 1.20, advRatio: 0.40, installments: 5  },
  '12m': { markup: 1.35, advRatio: 0.30, installments: 11 },
};

// Runtime-overridable ratios (set by settingsStore after loading from Supabase)
let _activeRatios: PlanRatioMap = { ..._DEFAULT_PLANS };

/** Called by settingsStore.load() to apply live plan rates from Supabase. */
export function setActivePlanRatios(r: PlanRatioMap) { _activeRatios = r; }

export function getActivePlanRatios(): PlanRatioMap  { return _activeRatios; }
export function getDefaultPlanRatios(): PlanRatioMap { return _DEFAULT_PLANS; }

/** Round to nearest 100 PKR */
function r100(n: number): number { return Math.round(n / 100) * 100; }

export type PlanKey = keyof PlanRatioMap;

export interface PlanBreakdown {
  months:          number;
  total:           number;
  advance:         number;
  monthly:         number;
  advancePct:      number;
  monthlyPayments: number;
}

export function calcPlan(retailPrice: number, plan: PlanKey): PlanBreakdown {
  const cfg          = _activeRatios[plan];
  const contractTotal = r100(retailPrice * cfg.markup);
  const advance      = r100(contractTotal * cfg.advRatio);
  const n            = cfg.installments;
  // Round UP so collection never falls short, then re-derive total from actual payments
  const monthly = n > 0 ? Math.ceil((contractTotal - advance) / n / 100) * 100 : 0;
  const total   = advance + monthly * n;
  return {
    months: plan === '2m' ? 2 : plan === '3m' ? 3 : plan === '6m' ? 6 : 12,
    total, advance, monthly,
    advancePct:      cfg.advRatio,
    monthlyPayments: n,
  };
}


export const PLAN_NAMES: Record<PlanKey, string> = {
  '2m':  '2 Payment Plan',
  '3m':  '3 Payment Plan',
  '6m':  '6 Payment Plan',
  '12m': '12 Payment Plan',
};
