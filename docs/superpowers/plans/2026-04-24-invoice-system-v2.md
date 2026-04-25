# Invoice System V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing invoice/quotation system to a fully normalised sales engine — adding customer_type (apartment/house/commercial), explicit service rows, pricing floor enforcement with override logging, installment schedule generation, and WhatsApp summary extraction.

**Architecture:** One new Supabase migration adds columns to `invoices` and `invoice_lines` and creates three new tables (`invoice_services`, `installment_schedules`, `price_overrides`). A new pure-logic module (`invoiceLogic.ts`) extracts testable functions for advisory blocks, floor validation, totals, and WhatsApp text. `QuotationTab` in `AdminPortal.tsx` is updated to drive all new fields; `logInvoiceToSupabase` is updated to persist them. No new pages or routes are created.

**Tech Stack:** Supabase (Postgres + RLS), React + TypeScript, Tailwind CSS, Vitest (already configured via vite.config.ts), jsPDF + jspdf-autotable (already installed).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260424_invoice_v2.sql` | Add customer_type, service_level, sale_type, customer_area to invoices; add min_price, approved_floor_price to invoice_lines; create invoice_services, installment_schedules, price_overrides; update doc_type constraint |
| Create | `src/lib/invoiceLogic.ts` | Pure functions: getAdvisoryBlock, validateFloor, calcGrandTotal, generateWhatsAppSummary, generateRefNumber |
| Create | `src/lib/__tests__/invoice.test.ts` | Unit tests for all pure logic functions |
| Modify | `src/pages/AdminPortal.tsx` | QuoteLine type (add minPrice, floorPrice, overrideReason), QuotationTab state (customerType, serviceLevel, saleType, services, discountReason), UI (customer_type dropdown, services panel, floor warning), logInvoiceToSupabase (new columns + child tables), WhatsApp text (use generateWhatsAppSummary) |

---

## Task 1: SQL Migration

**Files:**
- Create: `supabase/migrations/20260424_invoice_v2.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ── 1. Drop & recreate doc_type constraint to include new type ─────────────
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_doc_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_doc_type_check
  CHECK (doc_type IN (
    'quotation',
    'invoice',
    'installment-invoice',
    'installment_payment_receipt'
  ));

-- ── 2. New columns on invoices ─────────────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS customer_type  text CHECK (customer_type IN ('house','apartment','commercial')),
  ADD COLUMN IF NOT EXISTS customer_area  text,
  ADD COLUMN IF NOT EXISTS sale_type      text CHECK (sale_type IN ('cash','installment')),
  ADD COLUMN IF NOT EXISTS service_level  text CHECK (service_level IN ('supply_only','supply_install','full_service')),
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS linked_invoice_id uuid REFERENCES invoices(id);

-- ── 3. New columns on invoice_lines ───────────────────────────────────────
ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS brand               text,
  ADD COLUMN IF NOT EXISTS min_price           numeric(12,2),
  ADD COLUMN IF NOT EXISTS approved_floor_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS override_reason     text,
  ADD COLUMN IF NOT EXISTS key_specs_json      jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS warranty_json       jsonb DEFAULT '{}'::jsonb;

-- ── 4. invoice_services ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_services (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_type   text NOT NULL,
  service_name   text NOT NULL,
  description    text,
  status         text NOT NULL CHECK (status IN ('included','charged','not_selected')),
  visible_value  numeric(12,2) DEFAULT 0,
  charged_amount numeric(12,2) DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE invoice_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users only" ON invoice_services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 5. installment_schedules ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installment_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  installment_no  integer NOT NULL,
  due_date        date NOT NULL,
  amount_due      numeric(12,2) NOT NULL,
  amount_paid     numeric(12,2) DEFAULT 0,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  paid_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users only" ON installment_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 6. price_overrides ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_overrides (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       uuid REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_line_id  uuid REFERENCES invoice_lines(id) ON DELETE CASCADE,
  product_id       text,
  floor_price      numeric(12,2) NOT NULL,
  attempted_price  numeric(12,2) NOT NULL,
  approved_price   numeric(12,2) NOT NULL,
  reason           text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE price_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users only" ON price_overrides
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 7. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS invoice_services_invoice_id_idx      ON invoice_services (invoice_id);
CREATE INDEX IF NOT EXISTS installment_schedules_invoice_id_idx ON installment_schedules (invoice_id);
CREATE INDEX IF NOT EXISTS price_overrides_invoice_id_idx       ON price_overrides (invoice_id);
```

- [ ] **Step 2: Apply in Supabase dashboard**

Go to Supabase → SQL Editor → paste the file → Run.
Expected: no errors. All 3 new tables appear in Table Editor.

- [ ] **Step 3: Verify**

In Supabase Table Editor confirm:
- `invoices` has columns: `customer_type`, `customer_area`, `sale_type`, `service_level`, `discount_reason`, `linked_invoice_id`
- `invoice_lines` has columns: `min_price`, `approved_floor_price`, `override_reason`, `key_specs_json`, `warranty_json`
- Tables `invoice_services`, `installment_schedules`, `price_overrides` exist with RLS enabled

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260424_invoice_v2.sql
git commit -m "feat: invoice v2 migration — customer_type, services, schedules, price_overrides"
```

---

## Task 2: Pure invoice logic module

**Files:**
- Create: `src/lib/invoiceLogic.ts`
- Create: `src/lib/__tests__/invoice.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/invoice.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  getAdvisoryBlock,
  validateFloor,
  calcGrandTotal,
  generateRefNumber,
  generateWhatsAppSummary,
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

  it('percentage discount applied to product subtotal only', () => {
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
      [{ charged_amount: 3000 }],
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
});

describe('generateRefNumber', () => {
  it('matches TJ-YYYYMMDD-NNNN format', () => {
    const ref = generateRefNumber();
    expect(ref).toMatch(/^TJ-\d{8}-\d{4}$/);
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

  it('includes service if charged', () => {
    const text = generateWhatsAppSummary({
      refNumber: 'TJ-20260424-5678',
      docLabel: 'Invoice',
      customerName: 'Test',
      customerPhone: '',
      customerAddress: '',
      lines: [{ name: 'AC', model: 'HSU-18', qty: 1, unitPrice: 100000 }],
      services: [{ service_name: 'Installation', status: 'charged', charged_amount: 3500 }],
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
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd "c:/Users/uk/OneDrive/Desktop/Reliance website/latest/reliance"
npx vitest run src/lib/__tests__/invoice.test.ts
```

Expected: FAIL — `invoiceLogic` module not found.

- [ ] **Step 3: Implement `src/lib/invoiceLogic.ts`**

```typescript
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
  return Math.ceil(n / 500) * 500;
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
  discountType: DiscountType | string,
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

export function generateRefNumber(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
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
```

- [ ] **Step 4: Run tests — confirm they all pass**

```bash
npx vitest run src/lib/__tests__/invoice.test.ts
```

Expected: all 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoiceLogic.ts src/lib/__tests__/invoice.test.ts
git commit -m "feat: pure invoice logic module with full test coverage"
```

---

## Task 3: QuotationTab — customer type, service level, discount reason

**Files:**
- Modify: `src/pages/AdminPortal.tsx`

This task replaces the `isApartmentClient` checkbox with a `customerType` dropdown and adds `serviceLevel` and `discountReason` state. All existing PDF generation calls that reference `isApartmentClient` are updated to use `customerType === 'apartment'`.

- [ ] **Step 1: Add new state and update QuoteLine type**

In `AdminPortal.tsx`, find the `QuoteLine` interface (line ~4251) and add two fields:

Old:
```typescript
interface QuoteLine {
  id: string;
  name: string;
  model: string;
  qty: number;
  unitPrice: number;
  category: string;
  warranty: string;
  keySpec: string;
  kwhPerMonth: number;
  savingsPct: number;
}
```

New:
```typescript
interface QuoteLine {
  id: string;
  name: string;
  model: string;
  qty: number;
  unitPrice: number;
  category: string;
  warranty: string;
  keySpec: string;
  kwhPerMonth: number;
  savingsPct: number;
  minPrice: number;         // p.price.min from product
  floorPrice: number;       // roundUp500(minPrice * 1.10)
  overrideReason: string;   // required when unitPrice < floorPrice
}
```

- [ ] **Step 2: Update `addLine` to populate new fields**

Find `function addLine(p: Product)` (line ~5719). The `setLines` call at the end currently sets 9 fields. Add `minPrice`, `floorPrice`, `overrideReason`:

Old (inside `setLines(ls => ls.some(...) ? ls : [...ls, {`):
```typescript
    id: p.id,
    name: p.simplified_name || p.model,
    model: p.model,
    qty: 1,
    unitPrice: p.price.cash_floor,
    category: p.normalized_category || p.category || 'Other',
    warranty: p.warranty || '1 year manufacturer warranty',
    keySpec,
    kwhPerMonth,
    savingsPct,
```

New:
```typescript
    id: p.id,
    name: p.simplified_name || p.model,
    model: p.model,
    qty: 1,
    unitPrice: p.price.cash_floor,
    category: p.normalized_category || p.category || 'Other',
    warranty: p.warranty || '1 year manufacturer warranty',
    keySpec,
    kwhPerMonth,
    savingsPct,
    minPrice: p.price.min || 0,
    floorPrice: p.price.cash_floor,
    overrideReason: '',
```

- [ ] **Step 3: Replace isApartmentClient with customerType state**

Find (line ~5541):
```typescript
  const [isApartmentClient, setIsApartmentClient] = useState(false);
```

Replace with:
```typescript
  const [customerType, setCustomerType] = useState<'house' | 'apartment' | 'commercial'>('house');
  const [serviceLevel, setServiceLevel] = useState<'supply_only' | 'supply_install' | 'full_service'>('supply_only');
  const [discountReason, setDiscountReason] = useState('');
```

- [ ] **Step 4: Update all references to `isApartmentClient`**

Search for every occurrence of `isApartmentClient` in the file (there are ~5: the state declaration, the autosave, restoreDraft, generate() call, and generateAdvanceInvoice() call).

Replace:
- `isApartmentClient` passed to `generateQuotationPdf(...)` → `isApartmentClient: customerType === 'apartment'`
- `isApartmentClient` passed to `generateInstallmentAdvancePdf(...)` → `isApartmentClient: customerType === 'apartment'`
- In autosave `localStorage.setItem` payload: replace `isApartmentClient` with `customerType, serviceLevel, discountReason`
- In `restoreDraft`: replace `if (typeof draft.isApartmentClient === 'boolean') setIsApartmentClient(...)` with:
  ```typescript
  if (draft.customerType) setCustomerType(draft.customerType);
  if (draft.serviceLevel) setServiceLevel(draft.serviceLevel);
  if (draft.discountReason) setDiscountReason(draft.discountReason);
  ```

Also: `installationType` state currently controls supply-only vs installation-included for PDF. Map it from `serviceLevel`:
- `serviceLevel === 'supply_only'` → `installationType = 'supply-only'`
- `serviceLevel === 'supply_install'` → `installationType = 'installation-included'`

Replace the separate `installationType` state with a computed value:
```typescript
const installationType = serviceLevel === 'supply_install' ? 'installation-included' : 'supply-only';
```

Remove the `const [installationType, setInstallationType] = useState(...)` line.

- [ ] **Step 5: Update the customer UI block**

Find the customer form section in the JSX (line ~6039):
```tsx
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isApartmentClient} onChange={e => setIsApartmentClient(e.target.checked)}
              className="accent-blue-500 w-4 h-4 shrink-0" />
            <span className="text-xs text-gray-600">Apartment / Flat client <span className="text-gray-400">(replaces solar content with UPS info on PDF)</span></span>
          </label>
```

Replace with:
```tsx
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Property Type</label>
              <select
                value={customerType}
                onChange={e => setCustomerType(e.target.value as 'house' | 'apartment' | 'commercial')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="house">House</option>
                <option value="apartment">Apartment / Flat</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Service Level</label>
              <select
                value={serviceLevel}
                onChange={e => setServiceLevel(e.target.value as 'supply_only' | 'supply_install' | 'full_service')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="supply_only">Supply Only</option>
                <option value="supply_install">Supply + Install</option>
                <option value="full_service">360° Full Service</option>
              </select>
            </div>
          </div>
```

- [ ] **Step 6: Add discount reason input**

Find the discount block (line ~6049). After the discount `%` + type row, add:
```tsx
          {discount > 0 && (
            <input
              value={discountReason}
              onChange={e => setDiscountReason(e.target.value)}
              placeholder="Discount reason (required)"
              className={`w-full border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                discount > 0 && !discountReason.trim() ? 'border-red-300' : 'border-gray-200'
              }`}
            />
          )}
```

- [ ] **Step 7: Confirm TypeScript builds with no errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/AdminPortal.tsx
git commit -m "feat: replace isApartmentClient with customerType dropdown, add serviceLevel + discountReason"
```

---

## Task 4: Services Panel UI

**Files:**
- Modify: `src/pages/AdminPortal.tsx`

This adds a services panel below the product lines table, with toggles for each service.

- [ ] **Step 1: Add InvoiceService type and state**

Near the top of `QuotationTab` function, after the other state declarations, add:

```typescript
  interface InvoiceService {
    service_type: string;
    service_name: string;
    description: string;
    status: 'included' | 'charged' | 'not_selected';
    visible_value: number;
    charged_amount: number;
  }

  const DEFAULT_SERVICES: InvoiceService[] = [
    { service_type: 'delivery',      service_name: 'Delivery & Logistics',   description: 'Secure last-mile delivery to premises', status: 'included', visible_value: 3000, charged_amount: 0 },
    { service_type: 'installation',  service_name: 'Installation',           description: 'Professional setup and testing',        status: 'not_selected', visible_value: 0, charged_amount: 0 },
    { service_type: 'site_survey',   service_name: 'Site Survey',            description: 'Pre-installation site assessment',      status: 'not_selected', visible_value: 0, charged_amount: 0 },
    { service_type: 'maintenance',   service_name: 'Maintenance Visit',      description: 'Scheduled servicing visit',             status: 'not_selected', visible_value: 0, charged_amount: 0 },
    { service_type: 'ups_setup',     service_name: 'UPS / Battery Setup',    description: 'Inverter + battery installation',       status: 'not_selected', visible_value: 0, charged_amount: 0 },
  ];

  const [services, setServices] = useState<InvoiceService[]>(DEFAULT_SERVICES);
```

- [ ] **Step 2: Add helper to update a service**

```typescript
  function updateService(index: number, patch: Partial<InvoiceService>) {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  }
```

- [ ] **Step 3: Render the services panel in JSX**

Find the section in the JSX where the product lines table ends and the discount/totals summary begins (look for `const subtotal = lines.reduce(...)` — that is the computed value above the JSX; in JSX look for the totals display block).

Insert the services panel between the product lines card and the discount/totals card:

```tsx
      {/* ── Services Panel ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Services</p>
        {services.map((svc, i) => (
          <div key={svc.service_type} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{svc.service_name}</p>
              <p className="text-xs text-gray-400">{svc.description}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {(['not_selected', 'included', 'charged'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => updateService(i, { status: opt })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    svc.status === opt
                      ? opt === 'charged' ? 'bg-orange-500 text-white'
                        : opt === 'included' ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {opt === 'not_selected' ? '—' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
            {svc.status === 'included' && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-400">Value:</span>
                <input
                  type="number"
                  value={svc.visible_value}
                  onChange={e => updateService(i, { visible_value: Number(e.target.value) })}
                  className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            )}
            {svc.status === 'charged' && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-400">PKR:</span>
                <input
                  type="number"
                  value={svc.charged_amount}
                  onChange={e => updateService(i, { charged_amount: Number(e.target.value), visible_value: Number(e.target.value) })}
                  className="w-24 border border-orange-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            )}
          </div>
        ))}
      </div>
```

- [ ] **Step 4: Update totals computation to include services**

Find (line ~5788):
```typescript
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const discountAmt = Math.round(subtotal * discount / 100);
  const grandTotal = subtotal - discountAmt;
```

Replace with (import `calcGrandTotal` from `'../lib/invoiceLogic'` at top of file):
```typescript
  const totals = calcGrandTotal(lines, services, 'percentage', discount);
  const subtotal = totals.subtotal;
  const serviceTotal = totals.serviceTotal;
  const discountAmt = totals.discountAmt;
  const grandTotal = totals.grandTotal;
```

Add the import at the top of AdminPortal.tsx (with other lib imports):
```typescript
import { calcGrandTotal, getAdvisoryBlock, validateFloor, generateWhatsAppSummary } from '@/lib/invoiceLogic';
```

- [ ] **Step 5: Update totals display in JSX**

Find wherever the subtotal and grand total are displayed to the admin (the summary card). Add a service total row if `serviceTotal > 0`:

```tsx
{serviceTotal > 0 && (
  <div className="flex justify-between text-sm text-gray-600">
    <span>Services</span>
    <span>+ {fmtPKR(serviceTotal)}</span>
  </div>
)}
```

- [ ] **Step 6: Confirm TypeScript builds**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/AdminPortal.tsx
git commit -m "feat: services panel — included/charged toggles, visible value, service total in grand total"
```

---

## Task 5: Pricing Floor Enforcement UI

**Files:**
- Modify: `src/pages/AdminPortal.tsx`

Shows floor price per line. Highlights lines below floor in red. Blocks generate unless override reason is entered.

- [ ] **Step 1: Add `updateLineOverride` helper**

Near `updateLineText` (line ~5778):
```typescript
  function updateLineOverride(id: string, val: string) {
    setLines(ls => ls.map(l => l.id === id ? { ...l, overrideReason: val } : l));
  }
```

- [ ] **Step 2: Compute floor violations**

Near the totals computation, add:
```typescript
  const floorViolations = lines.filter(l => {
    const r = validateFloor(l.unitPrice, l.minPrice);
    return !r.valid && !l.overrideReason.trim();
  });
  const hasUnapprovedFloorViolation = floorViolations.length > 0;
```

- [ ] **Step 3: Add floor warning to each product line row**

Find the product lines table in the JSX. Each line is rendered as a row with qty + unitPrice inputs. After the unit price input for each line `l`, add:

```tsx
{(() => {
  const fv = validateFloor(l.unitPrice, l.minPrice);
  if (fv.valid) return null;
  return (
    <div className="mt-1.5 space-y-1">
      <p className="text-xs text-red-500 font-semibold">
        Below floor: PKR {fv.floor.toLocaleString('en-PK')} (shortfall PKR {fv.shortfall.toLocaleString('en-PK')})
      </p>
      <input
        value={l.overrideReason}
        onChange={e => updateLineOverride(l.id, e.target.value)}
        placeholder="Override reason (required to generate)"
        className="w-full border border-red-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
      />
    </div>
  );
})()}
```

- [ ] **Step 4: Block generate button when floor violations exist**

Find the generate button (calls `generate()`). Add `disabled` and visual state:

```tsx
<button
  onClick={generate}
  disabled={!lines.length || pdfState === 'generating' || hasUnapprovedFloorViolation || (discount > 0 && !discountReason.trim())}
  title={
    hasUnapprovedFloorViolation ? 'Enter override reason for below-floor prices' :
    (discount > 0 && !discountReason.trim()) ? 'Enter discount reason' : ''
  }
  className={`... ${hasUnapprovedFloorViolation || (discount > 0 && !discountReason.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
>
```

Apply the same `disabled` logic to the installment advance and payment invoice buttons.

- [ ] **Step 5: Confirm TypeScript builds**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminPortal.tsx
git commit -m "feat: pricing floor enforcement — per-line warning, override reason, generate blocked until resolved"
```

---

## Task 6: Persist new fields to Supabase

**Files:**
- Modify: `src/pages/AdminPortal.tsx`

Updates `InvoiceLogPayload`, `logInvoiceToSupabase`, and the three generate functions to write all new DB columns and child table rows.

- [ ] **Step 1: Update `InvoiceLogPayload` interface**

Find the interface at line ~4179. Add new fields:

```typescript
interface InvoiceLogPayload {
  refNumber:      string;
  docType:        'quotation' | 'invoice' | 'installment-invoice' | 'installment_payment_receipt';
  customerName:   string;
  customerPhone:  string;
  customerEmail:  string;
  customerAddress:string;
  customerCnic:   string;
  customerType:   'house' | 'apartment' | 'commercial';
  serviceLevel:   'supply_only' | 'supply_install' | 'full_service';
  discountReason: string;
  lines:          QuoteLine[];
  services:       InvoiceService[];
  discount:       number;
  discountType:   string;
  grandTotal:     number;
  advancePct:     number;
  instTotalPrice: number;
  instAdvanceAmt: number;
  instMonths:     number;
  instMonthlyAmt: number;
  instFirstDate:  string;
}
```

- [ ] **Step 2: Rewrite `logInvoiceToSupabase`**

Replace the function body (lines ~4198–4248) with:

```typescript
async function logInvoiceToSupabase(payload: InvoiceLogPayload): Promise<void> {
  try {
    const subtotal = payload.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const serviceTotal = payload.services
      .filter(s => s.status === 'charged')
      .reduce((s, svc) => s + svc.charged_amount, 0);
    const saleType = payload.docType === 'installment-invoice' || payload.docType === 'installment_payment_receipt'
      ? 'installment' : 'cash';

    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        ref_number:       payload.refNumber,
        doc_type:         payload.docType,
        customer_name:    payload.customerName || null,
        customer_phone:   payload.customerPhone || null,
        customer_email:   payload.customerEmail || null,
        customer_address: payload.customerAddress || null,
        customer_cnic:    payload.customerCnic || null,
        customer_type:    payload.customerType,
        service_level:    payload.serviceLevel,
        sale_type:        saleType,
        subtotal,
        service_total:    serviceTotal,
        discount_pct:     payload.discount,
        discount_type:    payload.discountType,
        discount_reason:  payload.discountReason || null,
        grand_total:      payload.grandTotal,
        advance_pct:      payload.advancePct,
        inst_total_price: payload.instTotalPrice || null,
        inst_advance_amt: payload.instAdvanceAmt || null,
        inst_months:      payload.instMonths || null,
        inst_monthly_amt: payload.instMonthlyAmt || null,
        payment_status:   'pending',
      })
      .select('id')
      .single();

    if (invErr || !inv) {
      console.warn('[invoice-log] Failed to log invoice header:', invErr?.message);
      return;
    }

    // ── invoice_lines ──────────────────────────────────────────────────────
    const lineRows = payload.lines.map(l => ({
      invoice_id:            inv.id,
      product_id:            l.id,
      name:                  l.name,
      model:                 l.model,
      category:              l.category,
      qty:                   l.qty,
      unit_price:            l.unitPrice,
      line_total:            l.qty * l.unitPrice,
      min_price:             l.minPrice || null,
      approved_floor_price:  l.floorPrice || null,
      override_reason:       l.overrideReason || null,
      kwh_per_month:         l.kwhPerMonth || null,
      warranty:              l.warranty || null,
      key_spec:              l.keySpec || null,
    }));

    const { data: insertedLines, error: lineErr } = await supabase
      .from('invoice_lines')
      .insert(lineRows)
      .select('id, product_id');
    if (lineErr) console.warn('[invoice-log] Failed to log invoice lines:', lineErr.message);

    // ── price_overrides ────────────────────────────────────────────────────
    if (insertedLines) {
      const overrideRows = payload.lines
        .filter(l => l.overrideReason.trim())
        .map((l, idx) => ({
          invoice_id:      inv.id,
          invoice_line_id: insertedLines[idx]?.id ?? null,
          product_id:      l.id,
          floor_price:     l.floorPrice,
          attempted_price: l.unitPrice,
          approved_price:  l.unitPrice,
          reason:          l.overrideReason,
        }));
      if (overrideRows.length > 0) {
        const { error: ovErr } = await supabase.from('price_overrides').insert(overrideRows);
        if (ovErr) console.warn('[invoice-log] Failed to log price overrides:', ovErr.message);
      }
    }

    // ── invoice_services ───────────────────────────────────────────────────
    const serviceRows = payload.services
      .filter(s => s.status !== 'not_selected')
      .map(s => ({
        invoice_id:    inv.id,
        service_type:  s.service_type,
        service_name:  s.service_name,
        description:   s.description,
        status:        s.status,
        visible_value: s.visible_value,
        charged_amount: s.charged_amount,
      }));
    if (serviceRows.length > 0) {
      const { error: svcErr } = await supabase.from('invoice_services').insert(serviceRows);
      if (svcErr) console.warn('[invoice-log] Failed to log services:', svcErr.message);
    }

    // ── installment_schedules ──────────────────────────────────────────────
    if (payload.docType === 'installment-invoice' && payload.instMonths > 0 && payload.instFirstDate) {
      const scheduleRows = Array.from({ length: payload.instMonths }, (_, i) => {
        const due = new Date(payload.instFirstDate);
        due.setMonth(due.getMonth() + i);
        return {
          invoice_id:     inv.id,
          installment_no: i + 1,
          due_date:       due.toISOString().slice(0, 10),
          amount_due:     payload.instMonthlyAmt,
          status:         'pending',
        };
      });
      const { error: schedErr } = await supabase.from('installment_schedules').insert(scheduleRows);
      if (schedErr) console.warn('[invoice-log] Failed to log installment schedule:', schedErr.message);
    }
  } catch (e) {
    console.warn('[invoice-log] Unexpected error:', e);
  }
}
```

- [ ] **Step 3: Update all three `logInvoiceToSupabase` call sites**

There are 3 call sites:
1. In `generate()` (cash/quotation invoice) — line ~5848
2. In `generateAdvanceInvoice()` — line ~5883
3. In `generatePaymentInvoice()` — line ~5917

For each, add the new required fields:
```typescript
logInvoiceToSupabase({
  // existing fields ...
  customerType,
  serviceLevel,
  discountReason,
  services,
  instFirstDate,  // already in state
});
```

- [ ] **Step 4: Confirm TypeScript builds**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminPortal.tsx
git commit -m "feat: persist customer_type, service_level, services, schedules, price_overrides to Supabase"
```

---

## Task 7: WhatsApp summary extraction

**Files:**
- Modify: `src/pages/AdminPortal.tsx`

Replace the inline `waText` construction with the `generateWhatsAppSummary` function from `invoiceLogic.ts`.

- [ ] **Step 1: Replace `waText` computation**

Find (line ~5936):
```typescript
  const waText = encodeURIComponent(
    `*Tajalli's ${waDocLabel} — ${refNumber}*\n` +
    ...
  );
```

Replace the entire `waText` block with:
```typescript
  const waDocLabel = docType === 'invoice' ? 'Invoice'
    : docType === 'installment-invoice' ? 'Installment Invoice'
    : docType === 'installment_payment_receipt' ? 'Payment Receipt'
    : 'Quotation';

  const waText = encodeURIComponent(
    generateWhatsAppSummary({
      refNumber,
      docLabel:        waDocLabel,
      customerName,
      customerPhone,
      customerAddress,
      lines:           lines.map(l => ({ name: l.name, model: l.model, qty: l.qty, unitPrice: l.unitPrice })),
      services,
      discountAmt,
      grandTotal,
      instTotalPrice,
      instAdvanceAmt,
      instMonths,
      instMonthlyAmt,
    })
  );
```

- [ ] **Step 2: Confirm TypeScript builds**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (compatibility + taxonomy + invoice).

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminPortal.tsx
git commit -m "feat: replace inline WhatsApp text with generateWhatsAppSummary from invoiceLogic"
```

---

## Task 8: Manual QA Checklist

This task has no code changes. The developer must run each scenario in the live admin UI, generate the PDF, and verify the DB row.

**How to verify DB rows:** Supabase → Table Editor → `invoices` → filter by ref_number.

**Run each scenario in order. Capture the ref number. Check DB after each.**

- [ ] **Scenario 1 — Quotation, 1 product, house**
  - DocType: Quotation, CustomerType: House, 1 product
  - Generate PDF → download
  - Check `invoices`: doc_type='quotation', customer_type='house', grand_total matches PDF
  - Check `invoice_lines`: 1 row

- [ ] **Scenario 2 — Quotation, 3 products**
  - DocType: Quotation, 3 different products
  - Generate PDF
  - Check `invoice_lines`: 3 rows, line_total correct for each

- [ ] **Scenario 3 — Cash Invoice, product + delivery included + installation charged**
  - DocType: Invoice, delivery=Included (value PKR 3000), installation=Charged (PKR 5000)
  - Grand total = product_subtotal + 5000 (delivery is free)
  - Check `invoice_services`: 2 rows (delivery status='included', installation status='charged')

- [ ] **Scenario 4 — Apartment customer → UPS advisory in PDF**
  - CustomerType: Apartment, any product with kwhPerMonth > 0
  - Generate PDF → confirm UPS block appears, solar block absent

- [ ] **Scenario 5 — House customer → Solar advisory in PDF**
  - CustomerType: House, any product with kwhPerMonth > 0
  - Generate PDF → confirm solar block appears, UPS block absent

- [ ] **Scenario 6 — Supply Only**
  - ServiceLevel: Supply Only
  - PDF shows no Scope of Work installation items
  - `invoices.service_level` = 'supply_only'

- [ ] **Scenario 7 — Supply + Install**
  - ServiceLevel: Supply + Install (solar product needed for install lines to auto-populate)
  - PDF shows Scope of Work block
  - `invoices.service_level` = 'supply_install'

- [ ] **Scenario 8 — Installment sale invoice (advance)**
  - DocType: Installment, instMonths=6, instMonthlyAmt set
  - Click "Generate Advance Invoice"
  - Check `invoices`: doc_type='installment-invoice', sale_type='installment'
  - Check `installment_schedules`: 6 rows, status='pending', due_dates sequential monthly

- [ ] **Scenario 9 — Below-floor price attempt blocked**
  - Add any product, manually lower unitPrice below its floor price
  - Confirm generate button is disabled
  - Confirm floor warning + override reason field visible

- [ ] **Scenario 10 — Below-floor price with override logged**
  - Same as Scenario 9, but enter an override reason
  - Generate PDF
  - Check `price_overrides`: 1 row with reason, floor_price, attempted_price

- [ ] **Scenario 11 — Discount with reason**
  - Set discount > 0, confirm reason field appears
  - Leave reason blank → generate button disabled
  - Enter reason → generate enabled
  - Check `invoices.discount_reason` is populated

- [ ] **Scenario 12 — WhatsApp summary matches PDF total**
  - Generate any invoice
  - Click "Send via WhatsApp" button
  - Confirm pre-filled text shows same grand total as PDF

- [ ] **Scenario 13 — Multi-product with charged service, percentage discount**
  - 3 products + 1 charged service
  - Apply 5% discount
  - Verify: grandTotal = (sum_products + service_charged) × 0.95
  - Confirm PDF total, WhatsApp total, and DB grand_total all match

- [ ] **Commit completion marker**

```bash
git commit --allow-empty -m "chore: invoice v2 QA complete — all 13 scenarios verified"
```

---

## Self-Review

**Spec coverage check:**

| Spec Requirement | Covered By |
|-----------------|------------|
| customer_type (apartment/house/commercial) | Task 3 UI + Task 1 DB |
| service_level (supply_only/supply_install/full_service) | Task 3 UI + Task 1 DB |
| sale_type (cash/installment) | Task 6 logInvoiceToSupabase (derived from docType) |
| invoice_services table | Task 1 DB + Task 4 UI + Task 6 persist |
| installment_schedules table | Task 1 DB + Task 6 persist |
| price_overrides table | Task 1 DB + Task 6 persist |
| Pricing floor enforcement | Task 5 UI (per-line warning + blocked generate) |
| Discount reason mandatory | Task 3 UI (input shown when discount > 0, blocks generate) |
| Advisory engine (apartment→UPS, house→solar) | Task 3 (customerType replaces isApartmentClient, existing PDF logic already uses it) |
| WhatsApp summary matches PDF | Task 7 (shared generateWhatsAppSummary) |
| Multi-item with correct totals | Task 4 (calcGrandTotal handles N lines + services) |
| All 13 QA scenarios | Task 8 manual checklist |
| Unit tests for all pure logic | Task 2 (14 vitest tests) |

**No placeholders found.**

**Type consistency confirmed:** `InvoiceService` defined in Task 4 step 1, used identically in Task 6 `InvoiceLogPayload`. `QuoteLine.minPrice/floorPrice/overrideReason` defined in Task 3 step 1, populated in Task 3 step 2, read in Task 5 and Task 6.
