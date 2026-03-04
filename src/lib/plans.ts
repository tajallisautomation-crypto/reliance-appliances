/**
 * Installment plan calculations — INTERNAL USE ONLY.
 * These ratios must NEVER be surfaced in customer-facing UI.
 * The customer only sees: advance amount (PKR), monthly amount (PKR), total (PKR).
 */

const _PLANS = {
  '2m':  { markup: 1.10, advRatio: 0.50, installments: 1  },
  '3m':  { markup: 1.15, advRatio: 0.45, installments: 2  },
  '6m':  { markup: 1.25, advRatio: 0.40, installments: 5  },
  '12m': { markup: 1.40, advRatio: 0.30, installments: 11 },
} as const;

/** Round to nearest 100 PKR */
function r100(n: number): number { return Math.round(n / 100) * 100; }

export type PlanKey = keyof typeof _PLANS;

export interface PlanBreakdown {
  months:   number;
  total:    number;
  advance:  number;
  monthly:  number;
}

export function calcPlan(retailPrice: number, plan: PlanKey): PlanBreakdown {
  const cfg     = _PLANS[plan];
  const total   = r100(retailPrice * cfg.markup);
  const advance = r100(total * cfg.advRatio);
  const monthly = cfg.installments > 0 ? r100((total - advance) / cfg.installments) : 0;
  return {
    months:  parseInt(plan) || (plan === '2m' ? 2 : plan === '3m' ? 3 : plan === '6m' ? 6 : 12),
    total, advance, monthly,
  };
}

export function calcAllPlans(retailPrice: number): Record<PlanKey, PlanBreakdown> {
  return {
    '2m':  calcPlan(retailPrice, '2m'),
    '3m':  calcPlan(retailPrice, '3m'),
    '6m':  calcPlan(retailPrice, '6m'),
    '12m': calcPlan(retailPrice, '12m'),
  };
}

export const PLAN_NAMES: Record<PlanKey, string> = {
  '2m':  '2 Month Plan',
  '3m':  '3 Month Plan',
  '6m':  '6 Month Plan',
  '12m': '12 Month Plan',
};
