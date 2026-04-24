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
