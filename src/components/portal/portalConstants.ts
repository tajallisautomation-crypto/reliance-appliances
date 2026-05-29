export const TIERS = {
  bronze:   { label: 'Bronze',   emoji: '🥉', color: 'text-amber-700',  bg: 'bg-amber-100',  min: 0,     nextMin: 1000,  nextLabel: 'Silver'   },
  silver:   { label: 'Silver',   emoji: '🥈', color: 'text-gray-600',   bg: 'bg-gray-200',   min: 1000,  nextMin: 5000,  nextLabel: 'Gold'     },
  gold:     { label: 'Gold',     emoji: '🥇', color: 'text-yellow-700', bg: 'bg-yellow-100', min: 5000,  nextMin: 15000, nextLabel: 'Platinum' },
  platinum: { label: 'Platinum', emoji: '💎', color: 'text-purple-700', bg: 'bg-purple-100', min: 15000, nextMin: Infinity, nextLabel: null    },
} as const

export const TIER_BENEFITS: Record<string, string[]> = {
  bronze:   ['Loyalty point tracking', 'Order history access', 'Service scheduling via portal', 'Priority WhatsApp support'],
  silver:   ['All Bronze benefits', '5% discount on service visits', 'Early sale notifications', 'Scheduling priority'],
  gold:     ['All Silver benefits', '10% discount on service visits', 'Free annual AC service', 'Express same-city delivery'],
  platinum: ['All Gold benefits', '15% discount on service visits', 'Free annual service for all appliances', 'Dedicated account manager', 'Early access to new products'],
}

export const CATEGORY_ICONS: Record<string, string> = {
  'air-conditioners':  '❄️',
  'refrigerators':     '🧊',
  'freezers':          '🥶',
  'washing-machines':  '👕',
  'televisions':       '📺',
  'microwaves':        '📦',
  'water-dispensers':  '💧',
  'kitchen-appliances':'🍳',
  'small-appliances':  '🔌',
  'solar':             '☀️',
  'ups-inverters':     '🔋',
  'geysers':           '🚿',
}

export const APPLIANCE_CATEGORIES = [
  { value: 'air-conditioners',   label: 'Air Conditioner' },
  { value: 'refrigerators',      label: 'Refrigerator' },
  { value: 'freezers',           label: 'Deep Freezer' },
  { value: 'washing-machines',   label: 'Washing Machine' },
  { value: 'televisions',        label: 'Television' },
  { value: 'microwaves',         label: 'Microwave / Oven' },
  { value: 'water-dispensers',   label: 'Water Dispenser' },
  { value: 'kitchen-appliances', label: 'Kitchen Appliance' },
  { value: 'geysers',            label: 'Geyser / Water Heater' },
  { value: 'ups-inverters',      label: 'UPS / Inverter' },
  { value: 'solar',              label: 'Solar System' },
  { value: 'small-appliances',   label: 'Other Small Appliance' },
]

// Estimated running watts per category (for solar load calc)
export const LOAD_WATTS: Record<string, number> = {
  'air-conditioners':  1500,
  'refrigerators':     150,
  'freezers':          200,
  'washing-machines':  500,
  'televisions':       100,
  'microwaves':        1000,
  'water-dispensers':  100,
  'geysers':           2000,
  'kitchen-appliances':300,
  'small-appliances':  100,
}

// How many monthly installments (excluding advance) per plan key
export const INST_MONTHLY: Record<string, number> = {
  '2m': 1, '3m': 2, '6m': 5, '12m': 11,
}

// Service interval in days per category (undefined = no standard reminder)
export const SERVICE_INTERVAL: Partial<Record<string, number>> = {
  'air-conditioners': 365,
  'washing-machines': 365,
  'geysers':          365,
  'refrigerators':    730,
  'freezers':         730,
}

// Maps portal appliance category → ANNUAL_CARE_PLANS appliances[].category name
export const CATEGORY_TO_PLAN_CATEGORY: Record<string, string> = {
  'air-conditioners':   'Air Conditioners',
  'refrigerators':      'Refrigerators',
  'freezers':           'Freezers',
  'washing-machines':   'Washing Machines',
  'televisions':        'Televisions',
  'microwaves':         'Kitchen Appliances',
  'water-dispensers':   'Water Dispensers',
  'kitchen-appliances': 'Kitchen Appliances',
  'small-appliances':   'Small Appliances',
  'solar':              'Solar & UPS',
  'ups-inverters':      'Solar & UPS',
  'geysers':            'Small Appliances',
}

// Starting prices per plan tier per plan category (from ANNUAL_CARE_PLANS)
export const CARE_PLAN_STARTS: Record<string, { essential: number; plus: number; elite: number }> = {
  'Air Conditioners':  { essential: 7500,  plus: 16500, elite: 38350 },
  'Refrigerators':     { essential: 6000,  plus: 13500, elite: 31200 },
  'Freezers':          { essential: 6500,  plus: 14500, elite: 32500 },
  'Washing Machines':  { essential: 6000,  plus: 13500, elite: 30550 },
  'Televisions':       { essential: 4500,  plus: 9500,  elite: 24050 },
  'Solar & UPS':       { essential: 12000, plus: 24000, elite: 54600 },
  'Kitchen Appliances':{ essential: 3500,  plus: 7500,  elite: 17550 },
  'Water Dispensers':  { essential: 4500,  plus: 9500,  elite: 22750 },
  'Small Appliances':  { essential: 3000,  plus: 6500,  elite: 13650 },
}

export const CARE_PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:               { label: 'Active',              color: 'text-green-700',  bg: 'bg-green-100'  },
  expiring_soon:        { label: 'Expiring Soon',        color: 'text-amber-700',  bg: 'bg-amber-100'  },
  expired:              { label: 'Expired',              color: 'text-red-700',    bg: 'bg-red-100'    },
  pending_inspection:   { label: 'Pending Inspection',   color: 'text-blue-700',   bg: 'bg-blue-100'   },
  inspection_required:  { label: 'Inspection Required',  color: 'text-purple-700', bg: 'bg-purple-100' },
  not_eligible:         { label: 'Not Eligible',         color: 'text-gray-600',   bg: 'bg-gray-100'   },
  cancelled:            { label: 'Cancelled',            color: 'text-gray-500',   bg: 'bg-gray-100'   },
}

export const BANK = {
  bank:    'Meezan Bank',
  account: '01060101874794',
  iban:    'PK33MEZN0001060101874794',
  branch:  'F.B Area Branch, Karachi',
  title:   "Tajalli's Home Collection / Tajalli's Home & Commercial Solutions",
}

// ── Product-type pricing tiers ────────────────────────────────────────────────
// More accurate pricing based on product capacity / type rather than just category.

export const CARE_PLAN_SUB_TIERS: Record<string, {
  label: string;
  prices: { essential: number; plus: number; elite: number };
}> = {
  // Air Conditioners
  ac_1t:   { label: '1 Ton AC',         prices: { essential: 5500,  plus: 13000, elite: 30000 } },
  ac_1_5t: { label: '1.5 Ton AC',       prices: { essential: 7500,  plus: 16500, elite: 38500 } },
  ac_2t:   { label: '2 Ton AC',         prices: { essential: 9500,  plus: 20500, elite: 46500 } },
  ac_2_5t: { label: '2.5 Ton+ AC',      prices: { essential: 11000, plus: 24000, elite: 54000 } },
  // Refrigerators
  fridge_small:  { label: 'Small Fridge (≤9 Cu.Ft)',    prices: { essential: 4500, plus: 10000, elite: 23000 } },
  fridge_medium: { label: 'Medium Fridge (10–14 Cu.Ft)', prices: { essential: 6000, plus: 13500, elite: 31200 } },
  fridge_large:  { label: 'Large Fridge (15+ Cu.Ft)',   prices: { essential: 7500, plus: 16500, elite: 38500 } },
  // Washing Machines
  wm_semi: { label: 'Semi-Automatic Washing Machine', prices: { essential: 4500, plus: 10000, elite: 23000 } },
  wm_auto: { label: 'Fully-Automatic Washing Machine', prices: { essential: 6000, plus: 13500, elite: 31200 } },
}

/**
 * Detect the care-plan sub-tier key from the appliance's category and model number.
 * Returns null when the sub-tier cannot be determined — callers fall back to CARE_PLAN_STARTS.
 */
export function detectCarePlanSubTier(category: string, model: string): string | null {
  const m   = model.toUpperCase();
  const cat = category.toLowerCase();

  // Air Conditioners — detect tonnage from standard 2-digit BTU prefix in model
  if (cat === 'air-conditioners' || cat.includes('air condition')) {
    if (/(?:^|[-\s_])09(?:\d{3})?(?:$|[-\s_/])/.test(m)) return 'ac_1t';
    if (/(?:^|[-\s_])12(?:\d{3})?(?:$|[-\s_/])/.test(m)) return 'ac_1t';
    if (/(?:^|[-\s_])18(?:\d{3})?(?:$|[-\s_/])/.test(m)) return 'ac_1_5t';
    if (/(?:^|[-\s_])24(?:\d{3})?(?:$|[-\s_/])/.test(m)) return 'ac_2t';
    if (/(?:^|[-\s_])30(?:\d{3})?(?:$|[-\s_/])/.test(m)) return 'ac_2_5t';
  }

  // Refrigerators — detect from capacity digits in common Pakistani model numbers
  // e.g. Haier HR-138EBS (≈13.8 cu.ft), Dawlance 9160 (≈16 cu.ft), PEL PRAS-22 (≈22 cu.ft)
  if (cat === 'refrigerators' || cat.includes('refrigerat')) {
    // Dawlance 9-series: last 2 digits ≈ cu.ft
    const dawlance9 = m.match(/^9(\d{2})/);
    if (dawlance9) {
      const cuft = parseInt(dawlance9[1], 10);
      if (cuft <= 9)  return 'fridge_small';
      if (cuft <= 14) return 'fridge_medium';
      return 'fridge_large';
    }
    // Haier HR-XXX series: 3-digit number ≈ cu.ft × 10
    const haierHR = m.match(/HR[-\s]?(\d{3})/);
    if (haierHR) {
      const cuft = Math.round(parseInt(haierHR[1], 10) / 10);
      if (cuft <= 9)  return 'fridge_small';
      if (cuft <= 14) return 'fridge_medium';
      return 'fridge_large';
    }
    // Generic: look for explicit capacity text in notes/model
    if (/\b([6-9])\s*cu/i.test(model))  return 'fridge_small';
    if (/\b(1[0-4])\s*cu/i.test(model)) return 'fridge_medium';
    if (/\b(1[5-9]|2\d)\s*cu/i.test(model)) return 'fridge_large';
  }

  // Washing Machines — semi-auto vs fully-auto
  if (cat === 'washing-machines' || cat.includes('washing')) {
    if (/SWM|SEMI|TWIN\s*TUB/.test(m)) return 'wm_semi';
    if (/AWM|FULLY|WM[-\s]|AUTO/.test(m)) return 'wm_auto';
    // Haier pattern: HWMS = semi, HWM = fully auto
    if (/HWMS/.test(m)) return 'wm_semi';
    if (/HWM[^S]|^HWM\d/.test(m)) return 'wm_auto';
  }

  return null;
}
