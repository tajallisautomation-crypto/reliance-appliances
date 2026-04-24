import { describe, it, expect } from 'vitest';
import {
  getAdvisoryBlock,
  validateFloor,
  calcGrandTotal,
  generateRefNumber,
  generateWhatsAppSummary,
  buildDetailedAdvisory,
} from '../invoiceLogic';

describe('getAdvisoryBlock', () => {
  it('apartment → UPS block', () => {
    const result = getAdvisoryBlock('apartment');
    expect(result.title).toMatch(/UPS/i);
    expect(result.body).toMatch(/apartment/i);
    expect(result.color).toBe('blue');
  });

  it('house → solar block', () => {
    const result = getAdvisoryBlock('house');
    expect(result.title).toMatch(/solar/i);
    expect(result.color).toBe('green');
  });

  it('commercial → commercial ROI block', () => {
    const result = getAdvisoryBlock('commercial');
    expect(result.title).toMatch(/commercial/i);
    expect(result.color).toBe('gray');
  });
});

describe('validateFloor', () => {
  it('price at floor → valid', () => {
    // min_price=90000 → floor = roundUp500(90000*1.1) = roundUp500(99000) = 99000
    const r = validateFloor(99000, 90000);
    expect(r.valid).toBe(true);
    expect(r.floor).toBe(99000);
    expect(r.shortfall).toBe(0);
  });

  it('price above floor → valid', () => {
    const r = validateFloor(115500, 90000);
    expect(r.valid).toBe(true);
    expect(r.floor).toBe(99000);
    expect(r.shortfall).toBe(0);
  });

  it('price below floor → invalid with shortfall', () => {
    const r = validateFloor(95000, 90000);
    expect(r.valid).toBe(false);
    expect(r.floor).toBe(99000);
    expect(r.shortfall).toBe(4000);
  });

  it('no min_price → always valid, floor = 0', () => {
    const r = validateFloor(50000, 0);
    expect(r.valid).toBe(true);
    expect(r.floor).toBe(0);
  });
});

describe('calcGrandTotal', () => {
  it('single product, no discount, no services', () => {
    const r = calcGrandTotal(
      [{ qty: 1, unitPrice: 115500 }],
      [],
      'percentage',
      0
    );
    expect(r.subtotal).toBe(115500);
    expect(r.serviceTotal).toBe(0);
    expect(r.discountAmt).toBe(0);
    expect(r.grandTotal).toBe(115500);
  });

  it('percentage discount applied to combined base', () => {
    const r = calcGrandTotal(
      [{ qty: 1, unitPrice: 115500 }],
      [],
      'percentage',
      7
    );
    expect(r.subtotal).toBe(115500);
    expect(r.discountAmt).toBe(8085);
    expect(r.grandTotal).toBe(107415);
  });

  it('charged service adds to total', () => {
    const r = calcGrandTotal(
      [{ qty: 1, unitPrice: 100000 }],
      [{ charged_amount: 3000, status: 'charged' as const }],
      'percentage',
      0
    );
    expect(r.subtotal).toBe(100000);
    expect(r.serviceTotal).toBe(3000);
    expect(r.grandTotal).toBe(103000);
  });

  it('multi-product with qty', () => {
    const r = calcGrandTotal(
      [
        { qty: 2, unitPrice: 50000 },
        { qty: 1, unitPrice: 30000 },
      ],
      [],
      'percentage',
      0
    );
    expect(r.subtotal).toBe(130000);
    expect(r.grandTotal).toBe(130000);
  });

  it('fixed discount subtracts flat amount', () => {
    const r = calcGrandTotal(
      [{ qty: 1, unitPrice: 100000 }],
      [],
      'fixed',
      5000
    );
    expect(r.discountAmt).toBe(5000);
    expect(r.grandTotal).toBe(95000);
  });

  it('included service does NOT add to total', () => {
    const r = calcGrandTotal(
      [{ qty: 1, unitPrice: 100000 }],
      [{ charged_amount: 3000, status: 'included' as const }],
      'percentage',
      0
    );
    expect(r.serviceTotal).toBe(0);
    expect(r.grandTotal).toBe(100000);
  });
});

describe('generateRefNumber', () => {
  it('matches TJ-YYYYMMDD-NNNN format', () => {
    const ref = generateRefNumber();
    expect(ref).toMatch(/^TJ-\d{8}-\d{6}$/);
  });

  it('generates different refs on successive calls', () => {
    const refs = Array.from({ length: 10 }, () => generateRefNumber());
    const unique = new Set(refs);
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe('generateWhatsAppSummary', () => {
  it('includes customer name and grand total', () => {
    const text = generateWhatsAppSummary({
      refNumber: 'TJ-20260424-1234',
      docLabel: 'Invoice',
      customerName: 'Ali Turab',
      customerPhone: '0346-4719017',
      customerAddress: 'Apt 315, Saima Jinnah',
      lines: [{ name: 'Dawlance Vertical Freezer', model: 'VF-1035WB GD', qty: 1, unitPrice: 107415 }],
      services: [],
      discountAmt: 8085,
      grandTotal: 107415,
      instTotalPrice: 0,
      instAdvanceAmt: 0,
      instMonths: 0,
      instMonthlyAmt: 0,
    });
    expect(text).toContain('Ali Turab');
    expect(text).toContain('107,415');
    expect(text).toContain('TJ-20260424-1234');
  });

  it('includes charged service in summary', () => {
    const text = generateWhatsAppSummary({
      refNumber: 'TJ-20260424-5678',
      docLabel: 'Invoice',
      customerName: 'Test',
      customerPhone: '',
      customerAddress: '',
      lines: [{ name: 'AC', model: 'HSU-18', qty: 1, unitPrice: 100000 }],
      services: [{ service_name: 'Installation', status: 'charged' as const, charged_amount: 3500 }],
      discountAmt: 0,
      grandTotal: 103500,
      instTotalPrice: 0,
      instAdvanceAmt: 0,
      instMonths: 0,
      instMonthlyAmt: 0,
    });
    expect(text).toContain('Installation');
    expect(text).toContain('3,500');
  });

  it('includes installment plan when instMonths > 0', () => {
    const text = generateWhatsAppSummary({
      refNumber: 'TJ-20260424-9999',
      docLabel: 'Installment Invoice',
      customerName: 'Buyer',
      customerPhone: '',
      customerAddress: '',
      lines: [{ name: 'Fridge', model: 'RFB-25', qty: 1, unitPrice: 150000 }],
      services: [],
      discountAmt: 0,
      grandTotal: 150000,
      instTotalPrice: 187500,
      instAdvanceAmt: 37500,
      instMonths: 6,
      instMonthlyAmt: 25000,
    });
    expect(text).toContain('25,000');
    expect(text).toContain('6');
  });
});

describe('buildDetailedAdvisory', () => {
  const emptyLines: Parameters<typeof buildDetailedAdvisory>[1] = [];

  const freezerInverter = { name: 'Dawlance Inverter Freezer', category: 'Deep Freezers', kwhPerMonth: 30, qty: 1 };
  const freezerStandard = { name: 'PEL Freezer', category: 'Deep Freezers', kwhPerMonth: 45, qty: 1 };
  const acInverter      = { name: 'Haier 1-Ton Inverter AC', category: 'Air Conditioners', kwhPerMonth: 90, qty: 1 };
  const acStandard      = { name: 'PEL Split AC', category: 'Air Conditioners', kwhPerMonth: 150, qty: 1 };
  const solarInverter   = { name: 'Inverex 3.6kW Inverter', category: 'Solar Inverter', kwhPerMonth: 0, qty: 1 };

  it('returns null for commercial customers', () => {
    expect(buildDetailedAdvisory('commercial', emptyLines)).toBeNull();
  });

  it('apartment: sectionLabel and color are correct', () => {
    const result = buildDetailedAdvisory('apartment', emptyLines);
    expect(result?.sectionLabel).toBe('FOR APARTMENT CUSTOMERS');
    expect(result?.color).toBe('blue');
  });

  it('apartment: first paragraph mentions 1–1.2 kVA and 3–4 hrs', () => {
    const result = buildDetailedAdvisory('apartment', emptyLines);
    expect(result?.paragraphs[0]).toMatch(/1–1\.2 kVA/);
    expect(result?.paragraphs[0]).toMatch(/3–4 hrs/);
  });

  it('apartment with inverter freezer: mentions inverter freezer and UPS integration', () => {
    const result = buildDetailedAdvisory('apartment', [freezerInverter]);
    const allText = result!.paragraphs.join(' ');
    expect(allText).toMatch(/inverter freezer/i);
    expect(allText).toMatch(/solar or UPS/i);
  });

  it('apartment with standard freezer: mentions inverter model and 40%', () => {
    const result = buildDetailedAdvisory('apartment', [freezerStandard]);
    const allText = result!.paragraphs.join(' ');
    expect(allText).toMatch(/inverter model/i);
    expect(allText).toMatch(/40%/);
  });

  it('apartment with AC: mentions kVA and load-shedding', () => {
    const result = buildDetailedAdvisory('apartment', [acInverter]);
    const allText = result!.paragraphs.join(' ');
    expect(allText).toMatch(/kVA/i);
    expect(allText).toMatch(/load-shedding/i);
  });

  it('house: sectionLabel and color are correct', () => {
    const result = buildDetailedAdvisory('house', emptyLines);
    expect(result?.sectionLabel).toBe('FOR HOUSE / INDEPENDENT UNIT CUSTOMERS');
    expect(result?.color).toBe('green');
  });

  it('house with high-kWh appliance (≥50 units): mentions kW hybrid and PKR saving', () => {
    const highLoad = { name: 'Haier 2-Ton AC', category: 'Air Conditioners', kwhPerMonth: 100, qty: 1 };
    const result = buildDetailedAdvisory('house', [highLoad]);
    const allText = result!.paragraphs.join(' ');
    expect(allText).toMatch(/kW hybrid/i);
    expect(allText).toMatch(/PKR/);
  });

  it('house with low kWh (<50): generic solar pitch', () => {
    const lowLoad = { name: 'LED TV', category: 'Electronics', kwhPerMonth: 10, qty: 1 };
    const result = buildDetailedAdvisory('house', [lowLoad]);
    const allText = result!.paragraphs.join(' ');
    expect(allText).toMatch(/A solar package can significantly/);
  });

  it('house with solar product: skips generic solar pitch', () => {
    const result = buildDetailedAdvisory('house', [solarInverter]);
    const allText = result!.paragraphs.join(' ');
    expect(allText).not.toMatch(/A solar package can significantly/);
  });

  it('house with inverter freezer: mentions solar-compatible', () => {
    const result = buildDetailedAdvisory('house', [freezerInverter]);
    const allText = result!.paragraphs.join(' ');
    expect(allText).toMatch(/solar-compatible/i);
  });

  it('house with inverter AC: mentions solar-ready', () => {
    const result = buildDetailedAdvisory('house', [acInverter]);
    const allText = result!.paragraphs.join(' ');
    expect(allText).toMatch(/solar-ready/i);
  });

  it('house with standard AC: mentions high inrush current', () => {
    const result = buildDetailedAdvisory('house', [acStandard]);
    const allText = result!.paragraphs.join(' ');
    expect(allText).toMatch(/high inrush current/i);
  });

  it('house with empty lines: fallback paragraph about solar pitch', () => {
    const result = buildDetailedAdvisory('house', emptyLines);
    const allText = result!.paragraphs.join(' ');
    expect(allText).toMatch(/A solar package can significantly/);
  });

  it('apartment: does not return null', () => {
    expect(buildDetailedAdvisory('apartment', emptyLines)).not.toBeNull();
  });

  it('house: does not return null', () => {
    expect(buildDetailedAdvisory('house', emptyLines)).not.toBeNull();
  });
});
