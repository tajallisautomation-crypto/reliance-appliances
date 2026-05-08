import { UNIT_RATE_PKR } from './solarRules';

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

/** Caller must handle DB unique constraint violation on rare same-day collision. */
export function generateRefNumber(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `TJ-${date}-${rand}`;
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

export function buildDetailedAdvisory(
  customerType: CustomerType,
  lines: AdvisoryLine[]
): DetailedAdvisory | null {
  if (customerType === 'commercial') return null;

  const totalKwh = lines.reduce((s, l) => s + l.kwhPerMonth * l.qty, 0);
  const hasSolar = lines.some(l =>
    /solar|inverter/i.test(l.category)
  );

  if (customerType === 'apartment') {
    const paras: string[] = [];
    paras.push(
      'UPS / inverter backup is usually more practical than rooftop solar for your address. ' +
      'A 1–1.2 kVA inverter with 1× tall-tubular battery typically runs one freezer + 3 fans + lights for ~3–4 hrs of load-shed.'
    );

    for (const l of lines) {
      const cat = l.category.toLowerCase();
      if (/freezer|refrigerator|fridge/i.test(cat) || /freezer|fridge/i.test(l.name)) {
        const isInverter = /inverter/i.test(l.name) || /inverter/i.test(cat) || /inverter/i.test(l.keySpec ?? '');
        if (isInverter) {
          paras.push(
            `This is an inverter ${/freezer/i.test(l.name) ? 'freezer' : 'refrigerator'} — ` +
            `energy-efficient and well-suited for future solar or UPS integration. Ask us to size a compatible backup.`
          );
        } else {
          paras.push(
            `A standard ${/freezer/i.test(l.name) ? 'freezer' : 'refrigerator'} draws ~${l.kwhPerMonth || 30}–${(l.kwhPerMonth || 30) + 10} units/mo. ` +
            `Upgrading to an inverter model can cut consumption by up to 40%.`
          );
        }
      } else if (/air.?condition|\bac\b/i.test(cat)) {
        paras.push(
          `Air conditioners are high-load appliances. A 1.5-ton inverter AC draws ~${l.kwhPerMonth || 120} units/mo under typical use. ` +
          `A 3–5 kVA UPS/inverter would be needed for uninterrupted cooling during load-shedding.`
        );
      }
    }

    return { sectionLabel: 'FOR APARTMENT CUSTOMERS', color: 'blue', paragraphs: paras };
  }

  // house
  const paras: string[] = [];
  const PKRfmt = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;
  if (!hasSolar) {
    const dailyKwh = totalKwh / 30;
    // Round up to nearest 0.5 kW, minimum 1 kW (5 peak sun hours for Karachi)
    let systemKw = Math.max(1, Math.ceil((dailyKwh / 5) * 2) / 2);

    // Tiered equipment cost per kW (user-defined pricing)
    let equipCostPerKw: number;
    if (systemKw <= 2) equipCostPerKw = 200_000;
    else if (systemKw <= 3) equipCostPerKw = 180_000;
    else equipCostPerKw = 160_000;

    const equipCost = Math.round(systemKw * equipCostPerKw);
    const structCost = Math.round(systemKw * 1000 * 30); // PKR 30/Watt
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
      const paybackYrs = monthlyBillSaving > 0 ? (totalSetupCost / (monthlyBillSaving * 12)).toFixed(1) : null;
      paras.push(
        `Est. monthly savings: ~${PKRfmt(monthlyBillSaving)} on your KE bill${paybackYrs ? ` · Payback ~${paybackYrs} yrs` : ''}. Cash & 2–12 month options.`
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
      paras.push(
        isInverter
          ? `Inverter ACs are solar-ready and pair well with hybrid systems. ` +
            `A ${l.kwhPerMonth || 120}-unit/month load from this AC can be largely offset by a 2–3kW panel array.`
          : `Standard ACs have high inrush current. Consider upgrading to an inverter model before adding solar for best ROI.`
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
