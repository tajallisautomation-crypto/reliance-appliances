import { UNIT_RATE_PKR } from './solarRules';
import { getActivePlanRatios } from './plans';

export type CustomerType = 'house' | 'apartment' | 'commercial';
export type DiscountType = 'percentage' | 'fixed';
export type ServiceStatus = 'included' | 'charged' | 'not_selected';

export interface AdvisoryBlock {
  title: string;
  body: string;
  color: 'blue' | 'green' | 'gray';
}

export interface FloorValidation {
  valid: boolean;
  floor: number;
  shortfall: number;
}

export interface TotalLine {
  qty: number;
  unitPrice: number;
}

export interface ServiceLine {
  service_name?: string;
  status: ServiceStatus;
  charged_amount: number;
}

export interface GrandTotalResult {
  subtotal: number;
  serviceTotal: number;
  discountAmt: number;
  grandTotal: number;
}

export interface WhatsAppSummaryInput {
  refNumber: string;
  docLabel: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  lines: Array<{ name: string; model: string; qty: number; unitPrice: number }>;
  services: ServiceLine[];
  discountAmt: number;
  grandTotal: number;
  instTotalPrice: number;
  instAdvanceAmt: number;
  instMonths: number;
  instMonthlyAmt: number;
}

function roundUp500(n: number): number {
  // Round to nearest integer first to eliminate floating-point artifacts
  // e.g. 90000 * 1.1 = 99000.00000000001 should be treated as 99000
  return Math.ceil(Math.round(n) / 500) * 500;
}

export function getAdvisoryBlock(customerType: CustomerType): AdvisoryBlock {
  if (customerType === 'apartment') {
    return {
      title: 'UPS / Backup Recommendation',
      body: 'For apartment customers, UPS backup is more practical than rooftop solar. Ask us for compatible inverter and battery sizing to cover load-shedding.',
      color: 'blue',
    };
  }
  if (customerType === 'house') {
    return {
      title: 'Solar Recommendation — Green Corridor',
      body: 'This purchase can be paired with a solar package to reduce monthly electricity costs. Ask us for a free solar proposal.',
      color: 'green',
    };
  }
  return {
    title: 'Commercial Advisory',
    body: 'For commercial customers, we recommend a solar ROI assessment and preventive maintenance plan. Contact us for B2B pricing.',
    color: 'gray',
  };
}

export function validateFloor(unitPrice: number, minPrice: number): FloorValidation {
  if (!minPrice || minPrice <= 0) {
    return { valid: true, floor: 0, shortfall: 0 };
  }
  const floor = roundUp500(minPrice * 1.10);
  if (unitPrice >= floor) {
    return { valid: true, floor, shortfall: 0 };
  }
  return { valid: false, floor, shortfall: floor - unitPrice };
}

export function calcGrandTotal(
  lines: TotalLine[],
  services: ServiceLine[],
  discountType: DiscountType,
  discountValue: number
): GrandTotalResult {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const serviceTotal = services
    .filter(s => s.status === 'charged')
    .reduce((s, svc) => s + svc.charged_amount, 0);
  const base = subtotal + serviceTotal;
  let discountAmt = 0;
  if (discountType === 'fixed') {
    discountAmt = Math.min(discountValue, base);
  } else {
    discountAmt = Math.round(base * discountValue / 100);
  }
  return {
    subtotal,
    serviceTotal,
    discountAmt,
    grandTotal: base - discountAmt,
  };
}

/** Sync fallback only — UI should use DB-fetched sequential number instead. */
export function generateRefNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `TJ-${year}-${rand}`;
}

export function generateWhatsAppSummary(input: WhatsAppSummaryInput): string {
  const PKR = (n: number) => n.toLocaleString('en-PK');
  const lines: string[] = [];

  lines.push(`*Tajalli's ${input.docLabel} — ${input.refNumber}*`);
  lines.push('━━━━━━━━━━━━━━━━━━━━');

  if (input.customerName) lines.push(`*Customer:* ${input.customerName}`);
  if (input.customerPhone) lines.push(`*Phone:* ${input.customerPhone}`);
  if (input.customerAddress) lines.push(`*Address:* ${input.customerAddress}`);

  lines.push('');
  lines.push('*Items:*');
  for (const l of input.lines) {
    const modelSuffix = l.model && l.model !== l.name ? ` (${l.model})` : '';
    lines.push(`• ${l.name}${modelSuffix} × ${l.qty} — PKR ${PKR(l.qty * l.unitPrice)}`);
  }

  const chargedServices = input.services.filter(s => s.status === 'charged');
  if (chargedServices.length > 0) {
    lines.push('');
    lines.push('*Services:*');
    for (const s of chargedServices) {
      lines.push(`• ${s.service_name ?? 'Service'} — PKR ${PKR(s.charged_amount)}`);
    }
  }

  if (input.discountAmt > 0) {
    lines.push(`\nDiscount: - PKR ${PKR(input.discountAmt)}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`*Total: PKR ${PKR(input.grandTotal)}*`);

  if (input.instMonths > 0) {
    lines.push('');
    lines.push('*Installment Plan:*');
    lines.push(`Installment Total: PKR ${PKR(input.instTotalPrice)}`);
    lines.push(`Advance: PKR ${PKR(input.instAdvanceAmt)}`);
    lines.push(`Monthly: PKR ${PKR(input.instMonthlyAmt)} × ${input.instMonths} months`);
  }

  lines.push('');
  lines.push('_tajallis.com.pk_');

  return lines.join('\n');
}

export interface AdvisoryLine {
  name: string;
  category: string;
  kwhPerMonth: number;
  qty: number;
  keySpec?: string;
}

export interface DetailedAdvisory {
  sectionLabel: string;         // "FOR APARTMENT CUSTOMERS"
  color: 'blue' | 'green' | 'gray';
  paragraphs: string[];         // each string is one paragraph block
}

/** Extract AC tonnage from product name / keySpec. Returns null if not found. */
function extractAcTon(name: string, keySpec?: string): number | null {
  const text = `${name} ${keySpec ?? ''}`;
  const m = text.match(/(\d+\.?\d*)\s*t(?:on|onne)?(?:\b|[^a-zA-Z])/i);
  return m ? parseFloat(m[1]) : null;
}

/** Running power draw (kW) for an AC unit by tonnage and type. */
function acRunKw(ton: number, isInverter: boolean): number {
  // Inverter running watts: 1T≈800W, 1.5T≈1200W, 2T≈1600W, 2.5T≈2000W
  // Standard fixed-speed ≈ 30% more + high inrush
  const kw = 0.5 + ton * 0.52;
  return Math.round(kw * (isInverter ? 1 : 1.3) * 10) / 10;
}

/** Monthly kWh for an AC unit (Pakistani summer, 8 h/day avg).
 *  Inverter: 1T≈180, 1.5T≈250, 2T≈320. Non-inverter ×1.40. */
function acKwhMonth(ton: number, isInverter: boolean): number {
  const base = Math.round(ton * 140 + 40);
  return Math.round(base * (isInverter ? 1 : 1.4));
}

export function buildDetailedAdvisory(
  customerType: CustomerType,
  lines: AdvisoryLine[]
): DetailedAdvisory | null {
  if (customerType === 'commercial') return null;

  const totalKwh = lines.reduce((s, l) => s + l.kwhPerMonth * l.qty, 0);
  const hasSolar = lines.some(l => /solar|inverter/i.test(l.category));

  if (customerType === 'apartment') {
    const UPS_COST_PER_KW = 120_000;
    const PKRfmtUps = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;

    // Estimate peak running power per product type
    let peakKw = 0;
    for (const l of lines) {
      const cat = l.category.toLowerCase();
      if (/air.?condition|\bac\b/i.test(cat)) {
        const ton = extractAcTon(l.name, l.keySpec) ?? 1.5;
        const isInv = /inverter/i.test(l.name) || /inverter/i.test(cat) || /inverter/i.test(l.keySpec ?? '');
        peakKw += acRunKw(ton, isInv) * l.qty;
      } else if (/deep.?freez|vertical.?freez|chest.?freez/i.test(cat) || /freezer/i.test(l.name)) {
        peakKw += 0.25 * l.qty;
      } else if (/refrigerator|fridge/i.test(cat) || /fridge/i.test(l.name)) {
        peakKw += 0.15 * l.qty;
      } else if (l.kwhPerMonth > 0) {
        peakKw += (l.kwhPerMonth / 30 / 8) * l.qty;
      }
    }
    const upsKw = Math.max(1, Math.ceil(peakKw * 2) / 2);
    const upsCost = upsKw * UPS_COST_PER_KW;
    const hasAC = lines.some(l => /air.?condition|\bac\b/i.test(l.category));

    const paras: string[] = [];
    paras.push(
      `UPS / inverter backup suits apartments better than rooftop solar. ` +
      `A ${upsKw} kVA system covers your load during load-shed. ` +
      `Est. ${PKRfmtUps(upsCost)} installed (${upsKw} kW × PKR 120,000/kW) — ask us for a free sizing quote.`
    );

    for (const l of lines) {
      const cat = l.category.toLowerCase();
      if (/freezer|refrigerator|fridge/i.test(cat) || /freezer|fridge/i.test(l.name)) {
        const isInverter = /inverter/i.test(l.name) || /inverter/i.test(cat) || /inverter/i.test(l.keySpec ?? '');
        const isFreezer = /deep.?freez|vertical.?freez/i.test(cat) || /freezer/i.test(l.name);
        const itemKw = isFreezer ? 0.25 : 0.15;
        const itemCost = itemKw * UPS_COST_PER_KW;
        const label = isFreezer ? 'freezer' : 'refrigerator';
        if (isInverter) {
          paras.push(
            `Your inverter ${label} is UPS-ready — ` +
            `low inrush current means a ${itemKw} kW UPS (est. ${PKRfmtUps(itemCost)}) handles it comfortably.`
          );
        } else {
          paras.push(
            `A standard ${label} draws ~${l.kwhPerMonth || (isFreezer ? 90 : 70)}–${(l.kwhPerMonth || (isFreezer ? 90 : 70)) + 15} units/mo. ` +
            `Switching to an inverter model cuts this by ~35% and reduces UPS sizing.`
          );
        }
      } else if (/air.?condition|\bac\b/i.test(cat)) {
        const ton = extractAcTon(l.name, l.keySpec) ?? 1.5;
        const isInv = /inverter/i.test(l.name) || /inverter/i.test(cat) || /inverter/i.test(l.keySpec ?? '');
        const runKw = acRunKw(ton, isInv);
        const cost = runKw * UPS_COST_PER_KW;
        const tonLabel = ton === 1 ? '1-ton' : ton === 1.5 ? '1.5-ton' : ton === 2 ? '2-ton' : `${ton}-ton`;
        const typeLabel = isInv ? 'inverter' : 'standard';
        paras.push(
          `Your ${tonLabel} ${typeLabel} AC requires ~${runKw} kW running load. ` +
          `UPS backup: ${runKw} kW × PKR 120,000/kW = est. ${PKRfmtUps(cost)} installed.` +
          (isInv ? '' : ' Inverter ACs use ~30% less power and are easier to back up.')
        );
      }
    }

    if (!hasAC && paras.length === 1) {
      paras.push(
        `A basic 1 kW UPS (est. ${PKRfmtUps(UPS_COST_PER_KW)}) typically runs a freezer + fans + lights for 3–4 hrs.`
      );
    }

    return { sectionLabel: 'FOR APARTMENT CUSTOMERS', color: 'blue', paragraphs: paras };
  }

  // house
  const paras: string[] = [];
  const PKRfmt = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;
  if (!hasSolar) {
    const dailyKwh = totalKwh / 30;
    let systemKw = Math.max(1, Math.ceil((dailyKwh / 5) * 2) / 2);

    let equipCostPerKw: number;
    if (systemKw <= 2) equipCostPerKw = 200_000;
    else if (systemKw <= 3) equipCostPerKw = 180_000;
    else equipCostPerKw = 160_000;

    const equipCost = Math.round(systemKw * equipCostPerKw);
    const structCost = Math.round(systemKw * 1000 * 30);
    const totalSetupCost = equipCost + structCost;

    const monthlyGen = Math.round(systemKw * 5 * 30);
    const offsetUnits = totalKwh > 0 ? Math.min(totalKwh, monthlyGen) : monthlyGen;
    const monthlyBillSaving = Math.round(offsetUnits * UNIT_RATE_PKR);

    if (totalKwh >= 30) {
      paras.push(
        `Your appliances draw ~${totalKwh} kWh/month. A ${systemKw}kW hybrid solar system is recommended — ` +
        `generating ~${monthlyGen} kWh/month to cover this load.`
      );
      paras.push(
        `Setup cost: ${PKRfmt(equipCost)} equipment + ${PKRfmt(structCost)} structure = ${PKRfmt(totalSetupCost)} total.`
      );
      const paybackYrsNum = monthlyBillSaving > 0 ? totalSetupCost / (monthlyBillSaving * 12) : null;
      const paybackYrs = paybackYrsNum !== null && paybackYrsNum <= 4 ? paybackYrsNum.toFixed(1) : null;
      paras.push(
        `Est. monthly savings: ~${PKRfmt(monthlyBillSaving)} on your KE bill${paybackYrs ? ` · Payback ~${paybackYrs} yrs` : ''}. Cash & 2–12 month installment options.`
      );
      const _plan12 = getActivePlanRatios()['12m'];
      const instAdvance = Math.round(totalSetupCost * _plan12.advRatio);
      const instMonthly = Math.ceil((totalSetupCost - instAdvance) / _plan12.installments / 100) * 100;
      paras.push(
        `Inst. plan: ${PKRfmt(instAdvance)} advance + ${PKRfmt(instMonthly)}/month × ${_plan12.installments} months.`
      );
    } else {
      paras.push(
        'A solar package can significantly reduce your electricity bill. ' +
        `1kW system costs ~${PKRfmt(200_000 + 30_000)} (equipment + structure). ` +
        'Ask us for a free proposal.'
      );
    }
  }

  for (const l of lines) {
    const cat = l.category.toLowerCase();
    if (/freezer|refrigerator|fridge/i.test(cat) || /freezer|fridge/i.test(l.name)) {
      const isInverter = /inverter/i.test(l.name) || /inverter/i.test(cat);
      if (isInverter) {
        paras.push(
          `This inverter ${/freezer/i.test(l.name) ? 'freezer' : 'refrigerator'} is solar-compatible — ` +
          `low inrush current and stable load make it ideal for pairing with a hybrid or off-grid solar setup.`
        );
      }
    } else if (/air.?condition|\bac\b/i.test(cat)) {
      const isInverter = /inverter/i.test(l.name) || /inverter/i.test(cat);
      const ton = extractAcTon(l.name, l.keySpec) ?? 1.5;
      const runKw = acRunKw(ton, isInverter);
      const kwhMo = l.kwhPerMonth || acKwhMonth(ton, isInverter);
      const tonLabel = ton === 1 ? '1-ton' : ton === 1.5 ? '1.5-ton' : ton === 2 ? '2-ton' : `${ton}-ton`;
      const solarKw = Math.max(2, Math.round(runKw * 1.5 * 2) / 2);
      const upsCost = Math.round(runKw * 120_000);
      paras.push(
        isInverter
          ? `Your ${tonLabel} inverter AC draws ~${kwhMo} units/month and ~${runKw} kW running load. ` +
            `A ${solarKw}–${solarKw + 1}kW hybrid solar array offsets most of this. ` +
            `For load-shed UPS only: ${runKw} kW × PKR 120,000/kW = est. PKR ${upsCost.toLocaleString('en-PK')} installed.`
          : `Standard ${tonLabel} ACs have high inrush current (~${Math.round(runKw * 3)}kW surge) — upgrade to inverter before adding solar. ` +
            `UPS backup: ~${runKw} kW × PKR 120,000/kW = est. PKR ${upsCost.toLocaleString('en-PK')} installed.`
      );
    }
  }

  if (paras.length === 0) {
    paras.push(
      'Solar energy can offset a significant portion of your monthly electricity bill. ' +
      'Ask us for a free sizing proposal tailored to your home. ' +
      'We install 1.5kW–10kW hybrid and off-grid systems with 2–12 month installment options.'
    );
  }

  return { sectionLabel: 'FOR HOUSE / INDEPENDENT UNIT CUSTOMERS', color: 'green', paragraphs: paras };
}
