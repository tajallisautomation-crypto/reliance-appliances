# Sales Ledger, Installment CRM & Website Intelligence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a manual sales ledger (cash + installment), installment collection tracker with WhatsApp shortcuts, and website intelligence layer (activity ticker, product badges, price history, buying guide ranking) all backed by Supabase.

**Architecture:** Four Supabase tables (`customers`, `sales`, `installment_schedules`, `installment_payments`) plus two read-only views (`product_stats`, `ticker_events`). Admin components live in `src/components/admin/`. Website reads only from views — never raw sales tables. Product stats are fetched in batch by parent pages and passed as optional props to ProductCard.

**Tech Stack:** Supabase (Postgres + RLS), React + TypeScript, Tailwind CSS, Recharts (already installed), XLSX (already installed), Lucide icons, jsPDF (already installed).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/20260420_sales_ledger.sql` | Tables, views, RLS policies |
| Create | `src/lib/salesApi.ts` | Types + CRUD for all 4 tables + views |
| Create | `src/components/admin/SalesTab.tsx` | Ledger sub-tab: entry form + table |
| Create | `src/components/admin/CollectionsTab.tsx` | Payment schedule + mark paid + WhatsApp |
| Create | `src/components/admin/SalesAnalyticsTab.tsx` | Revenue charts + export |
| Create | `src/components/ActivityTicker.tsx` | Homepage activity ticker |
| Modify | `src/pages/AdminPortal.tsx` | Add 'sales' tab (type, nav, render) |
| Modify | `src/components/products/ProductCard.tsx` | Best Seller / Trending badges + sold count |
| Modify | `src/pages/ProductDetail.tsx` | Social proof line + most popular plan hint |
| Modify | `src/pages/Home.tsx` | Mount ActivityTicker |
| Modify | `src/pages/BuyingGuide.tsx` | Sort recommendations by units_sold_all |

---

## Task 1: SQL Migration

**Files:**
- Create: `supabase/migrations/20260420_sales_ledger.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ── customers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  phone      text NOT NULL,
  cnic       text,
  area       text,
  created_at timestamptz DEFAULT now()
);

-- ── sales ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date      date        NOT NULL DEFAULT CURRENT_DATE,
  sale_type      text        NOT NULL CHECK (sale_type IN ('cash','installment')),
  product_id     uuid        REFERENCES products(id) ON DELETE SET NULL,
  product_name   text        NOT NULL,
  customer_id    uuid        REFERENCES customers(id) ON DELETE SET NULL,
  customer_name  text,
  customer_phone text,
  customer_area  text,
  list_price     integer     NOT NULL,
  discount_pct   numeric(5,2) NOT NULL DEFAULT 0,
  discount_amt   integer     NOT NULL DEFAULT 0,
  final_price    integer     NOT NULL,
  plan_key       text        NOT NULL DEFAULT 'cash',
  advance_paid   integer,
  notes          text,
  created_by     text,
  created_at     timestamptz DEFAULT now()
);

-- ── installment_schedules ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installment_schedules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     uuid    NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  due_date    date    NOT NULL,
  amount_due  integer NOT NULL,
  status      text    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  penalty_amt integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ── installment_payments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installment_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid    NOT NULL REFERENCES installment_schedules(id) ON DELETE CASCADE,
  sale_id     uuid    NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  paid_date   date    NOT NULL DEFAULT CURRENT_DATE,
  amount_paid integer NOT NULL,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- ── product_stats view ───────────────────────────────────────────────
CREATE OR REPLACE VIEW product_stats AS
SELECT
  p.id AS product_id,
  p.category,
  COUNT(s.id)
    FILTER (WHERE s.sale_date >= CURRENT_DATE - INTERVAL '30 days') AS units_sold_30d,
  COUNT(s.id)
    FILTER (WHERE s.sale_date >= CURRENT_DATE - INTERVAL '90 days') AS units_sold_90d,
  COUNT(s.id) AS units_sold_all,
  (SELECT s2.final_price FROM sales s2
   WHERE s2.product_id = p.id
   ORDER BY s2.sale_date DESC, s2.created_at DESC LIMIT 1) AS last_sold_price,
  MIN(s.final_price) AS min_sold_price,
  CASE
    WHEN COUNT(s.id) FILTER (WHERE s.sale_date >= CURRENT_DATE - INTERVAL '90 days') = 0 THEN 0
    ELSE ROUND(
      (COUNT(s.id) FILTER (WHERE s.sale_date >= CURRENT_DATE - INTERVAL '30 days')::numeric * 3) /
      COUNT(s.id) FILTER (WHERE s.sale_date >= CURRENT_DATE - INTERVAL '90 days')::numeric, 2)
  END AS trending_score,
  (SELECT plan_key FROM sales s3 WHERE s3.product_id = p.id
   GROUP BY plan_key ORDER BY COUNT(*) DESC LIMIT 1) AS most_popular_plan,
  COALESCE(
    (SELECT json_agg(ph ORDER BY ph->>'month')
     FROM (
       SELECT json_build_object(
         'month', TO_CHAR(DATE_TRUNC('month', sale_date), 'YYYY-MM'),
         'price', ROUND(AVG(final_price))
       ) AS ph
       FROM sales WHERE product_id = p.id
       GROUP BY DATE_TRUNC('month', sale_date)
     ) monthly),
    '[]'::json
  ) AS price_history
FROM products p
LEFT JOIN sales s ON s.product_id = p.id
GROUP BY p.id, p.category;

-- ── ticker_events view (no PII — area + product only) ────────────────
CREATE OR REPLACE VIEW ticker_events AS
SELECT
  s.sale_date,
  s.product_name,
  s.customer_area AS area,
  p.category,
  s.plan_key
FROM sales s
JOIN products p ON p.id = s.product_id
WHERE s.customer_area IS NOT NULL
  AND s.sale_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY s.sale_date DESC, s.created_at DESC;

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_customers"             ON customers             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_sales"                 ON sales                 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_installment_schedules" ON installment_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_installment_payments"  ON installment_payments  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT ON product_stats TO anon;
GRANT SELECT ON ticker_events  TO anon;
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Open Supabase → SQL Editor → paste the file contents → Run.
Expected: no errors. Check Table Editor to confirm 4 new tables exist.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260420_sales_ledger.sql
git commit -m "feat(db): sales ledger tables, product_stats and ticker_events views"
```

---

## Task 2: salesApi.ts

**Files:**
- Create: `src/lib/salesApi.ts`

- [ ] **Step 1: Write the file**

```typescript
import { supabase } from './supabase';
import { calcPlan } from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SalesCustomer {
  id: string;
  name: string;
  phone: string;
  cnic?: string | null;
  area?: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  sale_date: string;
  sale_type: 'cash' | 'installment';
  product_id: string | null;
  product_name: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_area: string | null;
  list_price: number;
  discount_pct: number;
  discount_amt: number;
  final_price: number;
  plan_key: string;
  advance_paid: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  customer?: SalesCustomer;
}

export interface InstallmentSchedule {
  id: string;
  sale_id: string;
  due_date: string;
  amount_due: number;
  status: 'pending' | 'paid' | 'overdue';
  penalty_amt: number;
  created_at: string;
  sale?: Sale & { customer?: SalesCustomer };
}

export interface InstallmentPayment {
  id: string;
  schedule_id: string;
  sale_id: string;
  paid_date: string;
  amount_paid: number;
  notes: string | null;
  created_at: string;
}

export interface ProductStat {
  product_id: string;
  category: string;
  units_sold_30d: number;
  units_sold_90d: number;
  units_sold_all: number;
  last_sold_price: number | null;
  min_sold_price: number | null;
  trending_score: number;
  most_popular_plan: string | null;
  price_history: { month: string; price: number }[];
}

export interface TickerEvent {
  sale_date: string;
  product_name: string;
  area: string;
  category: string;
  plan_key: string;
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function getCustomers(): Promise<SalesCustomer[]> {
  const { data } = await supabase.from('customers').select('*').order('name');
  return (data ?? []) as SalesCustomer[];
}

export async function findCustomerByPhone(phone: string): Promise<SalesCustomer | null> {
  const { data } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle();
  return data as SalesCustomer | null;
}

export async function upsertCustomer(c: Omit<SalesCustomer, 'id' | 'created_at'> & { id?: string }): Promise<SalesCustomer> {
  const { data, error } = await supabase.from('customers').upsert(c).select().single();
  if (error) throw new Error(error.message);
  return data as SalesCustomer;
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export async function getSales(opts: { limit?: number; offset?: number } = {}): Promise<Sale[]> {
  let q = supabase
    .from('sales')
    .select('*, customer:customers(*)')
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (opts.limit)  q = q.limit(opts.limit);
  if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
  const { data } = await q;
  return (data ?? []) as Sale[];
}

export async function upsertSale(sale: Partial<Sale>): Promise<Sale> {
  const { customer, ...row } = sale as Sale & { customer?: SalesCustomer };
  const { data, error } = await supabase.from('sales').upsert(row).select().single();
  if (error) throw new Error(error.message);
  return data as Sale;
}

export async function deleteSale(id: string): Promise<void> {
  await supabase.from('sales').delete().eq('id', id);
}

// ── Schedule generation ───────────────────────────────────────────────────────

/** Generate installment_schedules rows for a sale. Call after upsertSale. */
export async function createSchedule(saleId: string, saleDate: string, finalPrice: number, planKey: string): Promise<void> {
  const plan = calcPlan(finalPrice, planKey);
  const rows = [];
  for (let i = 0; i < plan.monthlyPayments; i++) {
    const d = new Date(saleDate);
    d.setMonth(d.getMonth() + i + 1);
    rows.push({
      sale_id:    saleId,
      due_date:   d.toISOString().slice(0, 10),
      amount_due: plan.monthly,
      status:     'pending',
      penalty_amt: 0,
    });
  }
  if (rows.length > 0) {
    const { error } = await supabase.from('installment_schedules').insert(rows);
    if (error) throw new Error(error.message);
  }
}

// ── Schedules ─────────────────────────────────────────────────────────────────

export async function getAllSchedules(): Promise<(InstallmentSchedule & { sale: Sale & { customer?: SalesCustomer } })[]> {
  const { data } = await supabase
    .from('installment_schedules')
    .select('*, sale:sales(*, customer:customers(*))')
    .order('due_date', { ascending: true });
  return (data ?? []) as (InstallmentSchedule & { sale: Sale & { customer?: SalesCustomer } })[];
}

export async function getSchedulesForSale(saleId: string): Promise<InstallmentSchedule[]> {
  const { data } = await supabase
    .from('installment_schedules')
    .select('*')
    .eq('sale_id', saleId)
    .order('due_date');
  return (data ?? []) as InstallmentSchedule[];
}

export async function markSchedulePaid(
  scheduleId: string,
  saleId: string,
  payment: { paid_date: string; amount_paid: number; notes?: string }
): Promise<void> {
  const { error: payErr } = await supabase.from('installment_payments').insert({
    schedule_id: scheduleId,
    sale_id:     saleId,
    paid_date:   payment.paid_date,
    amount_paid: payment.amount_paid,
    notes:       payment.notes ?? null,
  });
  if (payErr) throw new Error(payErr.message);
  const { error: schedErr } = await supabase
    .from('installment_schedules').update({ status: 'paid', penalty_amt: 0 }).eq('id', scheduleId);
  if (schedErr) throw new Error(schedErr.message);
}

/** Recalculate penalty and overdue status for all pending schedules past due date. */
export async function refreshOverdueSchedules(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: pending } = await supabase
    .from('installment_schedules')
    .select('id, due_date, amount_due')
    .eq('status', 'pending')
    .lt('due_date', today);
  if (!pending?.length) return;
  const updates = pending.map(r => {
    const days = Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86_400_000);
    return supabase.from('installment_schedules').update({
      status:      'overdue',
      penalty_amt: Math.round(r.amount_due * 0.01 * days),
    }).eq('id', r.id);
  });
  await Promise.all(updates);
}

// ── Stats (website-facing views) ──────────────────────────────────────────────

export async function getProductStatsBatch(productIds: string[]): Promise<ProductStat[]> {
  if (!productIds.length) return [];
  const { data } = await supabase
    .from('product_stats')
    .select('*')
    .in('product_id', productIds);
  return (data ?? []) as ProductStat[];
}

export async function getProductStat(productId: string): Promise<ProductStat | null> {
  const { data } = await supabase
    .from('product_stats').select('*').eq('product_id', productId).maybeSingle();
  return data as ProductStat | null;
}

export async function getTopProductStats(limit = 10): Promise<ProductStat[]> {
  const { data } = await supabase
    .from('product_stats')
    .select('*')
    .order('units_sold_all', { ascending: false })
    .limit(limit);
  return (data ?? []) as ProductStat[];
}

export async function getTickerEvents(limit = 60): Promise<TickerEvent[]> {
  const { data } = await supabase
    .from('ticker_events').select('*').limit(limit);
  return (data ?? []) as TickerEvent[];
}

// ── Sales analytics helpers ───────────────────────────────────────────────────

export async function getSalesAnalytics(): Promise<{
  byMonth: { month: string; cash: number; installment: number; revenue: number }[];
  byCategory: { category: string; units: number; revenue: number }[];
  topProducts: { product_name: string; units: number; revenue: number }[];
  planPopularity: { plan: string; count: number }[];
  avgDiscountPct: number;
  totalOutstanding: number;
  overdueAmount: number;
}> {
  const [salesRes, schedRes] = await Promise.all([
    supabase.from('sales').select('*'),
    supabase.from('installment_schedules').select('amount_due, penalty_amt, status'),
  ]);
  const sales  = (salesRes.data  ?? []) as Sale[];
  const scheds = (schedRes.data  ?? []) as Pick<InstallmentSchedule, 'amount_due' | 'penalty_amt' | 'status'>[];

  // by month
  const monthMap = new Map<string, { cash: number; installment: number; revenue: number }>();
  for (const s of sales) {
    const m = s.sale_date.slice(0, 7);
    if (!monthMap.has(m)) monthMap.set(m, { cash: 0, installment: 0, revenue: 0 });
    const row = monthMap.get(m)!;
    row.revenue += s.final_price;
    if (s.sale_type === 'cash') row.cash++; else row.installment++;
  }
  const byMonth = [...monthMap.entries()]
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  // by category
  const catMap = new Map<string, { units: number; revenue: number }>();
  for (const s of sales) {
    const c = s.product_name || 'Unknown';
    // We don't have category on sale; use product_name as fallback — full category breakdown available via product_stats
    if (!catMap.has(c)) catMap.set(c, { units: 0, revenue: 0 });
    catMap.get(c)!.units++;
    catMap.get(c)!.revenue += s.final_price;
  }
  // top products
  const topProducts = [...catMap.entries()]
    .sort(([,a],[,b]) => b.units - a.units)
    .slice(0, 10)
    .map(([product_name, v]) => ({ product_name, ...v }));
  const byCategory = topProducts;

  // plan popularity
  const planMap = new Map<string, number>();
  for (const s of sales) {
    planMap.set(s.plan_key, (planMap.get(s.plan_key) ?? 0) + 1);
  }
  const planPopularity = [...planMap.entries()].map(([plan, count]) => ({ plan, count }));

  const avgDiscountPct = sales.length
    ? sales.reduce((acc, s) => acc + s.discount_pct, 0) / sales.length
    : 0;

  const totalOutstanding = scheds
    .filter(s => s.status !== 'paid')
    .reduce((acc, s) => acc + s.amount_due + s.penalty_amt, 0);
  const overdueAmount = scheds
    .filter(s => s.status === 'overdue')
    .reduce((acc, s) => acc + s.amount_due + s.penalty_amt, 0);

  return { byMonth, byCategory, topProducts, planPopularity, avgDiscountPct, totalOutstanding, overdueAmount };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/salesApi.ts
git commit -m "feat(api): sales ledger CRUD, schedule generation, product stats and ticker queries"
```

---

## Task 3: SalesTab.tsx (Admin Ledger)

**Files:**
- Create: `src/components/admin/SalesTab.tsx`

- [ ] **Step 1: Create `src/components/admin/` directory and write the file**

```tsx
import React, { useState, useEffect, useDeferredValue } from 'react';
import { supabase } from '@/lib/supabase';
import { calcPlan, fmtPKR, getProducts, type Product } from '@/lib/api';
import {
  upsertCustomer, upsertSale, createSchedule, deleteSale, getSales, findCustomerByPhone,
  type Sale, type SalesCustomer,
} from '@/lib/salesApi';
import { Plus, Pencil, Trash2, Search, X, Loader2, ChevronDown, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

const PLAN_KEYS = ['2m', '3m', '6m', '12m'] as const;
const PLAN_LABELS: Record<string, string> = { '2m':'2 Payments','3m':'3 Payments','6m':'6 Payments','12m':'12 Payments' };
const MONTHLY_PAYMENTS: Record<string, number> = { '2m':1,'3m':2,'6m':5,'12m':11 };

function today() { return new Date().toISOString().slice(0, 10); }

interface FormState {
  id?: string;
  sale_date: string;
  sale_type: 'cash' | 'installment';
  product_id: string;
  product_name: string;
  list_price: string;
  discount_pct: string;
  discount_amt: string;
  final_price: string;
  customer_area: string;
  // cash
  customer_name: string;
  customer_phone: string;
  // installment
  customer_id: string;
  inst_name: string;
  inst_phone: string;
  inst_cnic: string;
  inst_area: string;
  plan_key: string;
  advance_paid: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  sale_date: today(), sale_type: 'cash',
  product_id: '', product_name: '', list_price: '',
  discount_pct: '0', discount_amt: '0', final_price: '',
  customer_area: '',
  customer_name: '', customer_phone: '',
  customer_id: '', inst_name: '', inst_phone: '', inst_cnic: '', inst_area: '',
  plan_key: '6m', advance_paid: '', notes: '',
};

export default function SalesTab() {
  const [sales,    setSales]    = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM);
  const [prodSearch, setProdSearch] = useState('');
  const [showProdDrop, setShowProdDrop] = useState(false);
  const [search,   setSearch]   = useState('');
  const dSearch                 = useDeferredValue(search);
  const [filterType, setFilterType] = useState<'all'|'cash'|'installment'>('all');
  const [lookingUp, setLookingUp] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    loadSales();
    getProducts().then(setProducts);
  }, []);

  async function loadSales() {
    setLoading(true);
    const data = await getSales({ limit: 200 });
    setSales(data);
    setLoading(false);
  }

  // ── Field helpers ──────────────────────────────────────────────────

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => {
      const next = { ...prev, [k]: v };

      // Keep discount_pct and discount_amt in sync
      const list = parseFloat(next.list_price) || 0;
      if (k === 'discount_pct') {
        const pct = parseFloat(v as string) || 0;
        next.discount_amt  = String(Math.round(list * pct / 100));
        next.final_price   = String(list - Math.round(list * pct / 100));
      }
      if (k === 'discount_amt') {
        const amt = parseFloat(v as string) || 0;
        next.discount_pct  = list > 0 ? String(Math.round((amt / list) * 10000) / 100) : '0';
        next.final_price   = String(list - amt);
      }
      if (k === 'list_price') {
        const pct = parseFloat(next.discount_pct) || 0;
        const fp  = parseFloat(v as string) || 0;
        next.discount_amt  = String(Math.round(fp * pct / 100));
        next.final_price   = String(fp - Math.round(fp * pct / 100));
      }
      if (k === 'final_price' && k !== 'list_price') {
        // manual override — recalc pct
        const fp = parseFloat(v as string) || 0;
        const amt = list - fp;
        next.discount_amt  = String(Math.max(0, amt));
        next.discount_pct  = list > 0 ? String(Math.round((Math.max(0, amt) / list) * 10000) / 100) : '0';
      }
      // auto-fill advance when plan/final_price changes
      if ((k === 'plan_key' || k === 'final_price') && next.sale_type === 'installment') {
        const fp = parseFloat(next.final_price) || 0;
        if (fp > 0 && next.plan_key && next.plan_key !== 'cash') {
          const plan = calcPlan(fp, next.plan_key);
          next.advance_paid = String(plan.advance);
        }
      }
      return next;
    });
  }

  function selectProduct(p: Product) {
    setForm(prev => ({
      ...prev,
      product_id:   p.id,
      product_name: `${p.brand} ${p.model}`,
      list_price:   String(p.price.cash_floor || p.price.retail || 0),
      final_price:  String(p.price.cash_floor || p.price.retail || 0),
      discount_pct: '0',
      discount_amt: '0',
    }));
    setProdSearch(`${p.brand} ${p.model}`);
    setShowProdDrop(false);
  }

  async function lookupCustomer() {
    if (!form.inst_phone) return;
    setLookingUp(true);
    const c = await findCustomerByPhone(form.inst_phone);
    if (c) {
      setForm(prev => ({ ...prev, customer_id: c.id, inst_name: c.name, inst_cnic: c.cnic ?? '', inst_area: c.area ?? '' }));
    }
    setLookingUp(false);
  }

  function editSale(s: Sale) {
    setForm({
      id:            s.id,
      sale_date:     s.sale_date,
      sale_type:     s.sale_type,
      product_id:    s.product_id ?? '',
      product_name:  s.product_name,
      list_price:    String(s.list_price),
      discount_pct:  String(s.discount_pct),
      discount_amt:  String(s.discount_amt),
      final_price:   String(s.final_price),
      customer_area: s.customer_area ?? '',
      customer_name: s.customer_name ?? '',
      customer_phone: s.customer_phone ?? '',
      customer_id:   s.customer_id ?? '',
      inst_name:     s.customer?.name ?? '',
      inst_phone:    s.customer?.phone ?? '',
      inst_cnic:     s.customer?.cnic ?? '',
      inst_area:     s.customer?.area ?? '',
      plan_key:      s.plan_key,
      advance_paid:  String(s.advance_paid ?? ''),
      notes:         s.notes ?? '',
    });
    setProdSearch(s.product_name);
  }

  // ── Save ──────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let customerId = form.customer_id || null;

      if (form.sale_type === 'installment') {
        const c = await upsertCustomer({
          ...(customerId ? { id: customerId } : {}),
          name:  form.inst_name,
          phone: form.inst_phone,
          cnic:  form.inst_cnic || null,
          area:  form.inst_area || null,
        });
        customerId = c.id;
      }

      const isNew = !form.id;
      const saved = await upsertSale({
        ...(form.id ? { id: form.id } : {}),
        sale_date:      form.sale_date,
        sale_type:      form.sale_type,
        product_id:     form.product_id || null,
        product_name:   form.product_name,
        customer_id:    customerId,
        customer_name:  form.sale_type === 'cash' ? form.customer_name : null,
        customer_phone: form.sale_type === 'cash' ? form.customer_phone : null,
        customer_area:  form.sale_type === 'installment' ? form.inst_area : form.customer_area,
        list_price:     parseInt(form.list_price) || 0,
        discount_pct:   parseFloat(form.discount_pct) || 0,
        discount_amt:   parseInt(form.discount_amt) || 0,
        final_price:    parseInt(form.final_price) || 0,
        plan_key:       form.sale_type === 'cash' ? 'cash' : form.plan_key,
        advance_paid:   form.sale_type === 'installment' ? parseInt(form.advance_paid) || null : null,
        notes:          form.notes || null,
        created_by:     user?.email ?? null,
      });

      if (isNew && form.sale_type === 'installment') {
        await createSchedule(saved.id, saved.sale_date, saved.final_price, saved.plan_key);
      }

      setForm(EMPTY_FORM); setProdSearch('');
      await loadSales();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sale? This will also remove its payment schedule.')) return;
    await deleteSale(id);
    setSales(prev => prev.filter(s => s.id !== id));
  }

  // ── Plan preview ──────────────────────────────────────────────────

  const planPreview = (() => {
    if (form.sale_type !== 'installment' || !form.final_price || !form.plan_key) return null;
    const fp = parseInt(form.final_price) || 0;
    if (!fp) return null;
    return calcPlan(fp, form.plan_key);
  })();

  // ── Product search dropdown ────────────────────────────────────────

  const filteredProds = prodSearch
    ? products.filter(p => `${p.brand} ${p.model} ${p.simplified_name ?? ''}`.toLowerCase().includes(prodSearch.toLowerCase())).slice(0, 8)
    : [];

  // ── Ledger filter ─────────────────────────────────────────────────

  const filtered = sales.filter(s => {
    if (filterType !== 'all' && s.sale_type !== filterType) return false;
    if (dSearch) {
      const q = dSearch.toLowerCase();
      const name = (s.customer_name || s.customer?.name || '').toLowerCase();
      return name.includes(q)
        || (s.customer_phone || s.customer?.phone || '').includes(q)
        || s.product_name.toLowerCase().includes(q);
    }
    return true;
  });

  // ── Export ────────────────────────────────────────────────────────

  function exportExcel() {
    const rows = filtered.map(s => ({
      Date:         s.sale_date,
      Type:         s.sale_type,
      Customer:     s.customer?.name || s.customer_name || '',
      Phone:        s.customer?.phone || s.customer_phone || '',
      Area:         s.customer_area || s.customer?.area || '',
      Product:      s.product_name,
      'List Price': s.list_price,
      'Discount %': s.discount_pct,
      'Discount Rs': s.discount_amt,
      'Final Price': s.final_price,
      Plan:         s.plan_key,
      Advance:      s.advance_paid ?? '',
      Notes:        s.notes ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, `sales_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  return (
    <div className="space-y-6">
      {/* ── Entry Form ── */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-bold text-gray-900 text-sm">{form.id ? 'Edit Sale' : 'Record New Sale'}</h3>

        {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

        {/* Row 1: date + type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sale Date</label>
            <input type="date" value={form.sale_date} onChange={e => setField('sale_date', e.target.value)}
              max={today()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sale Type</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['cash','installment'] as const).map(t => (
                <button key={t} type="button"
                  className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${form.sale_type === t ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setField('sale_type', t)}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: product search */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
          <input value={prodSearch}
            onChange={e => { setProdSearch(e.target.value); setField('product_name', e.target.value); setShowProdDrop(true); }}
            onFocus={() => setShowProdDrop(true)}
            placeholder="Search product…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          {showProdDrop && filteredProds.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {filteredProds.map(p => (
                <li key={p.id}>
                  <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex items-center gap-2"
                    onMouseDown={() => selectProduct(p)}>
                    <span className="font-medium">{p.brand} {p.model}</span>
                    <span className="text-gray-400 text-xs ml-auto">PKR {fmtPKR(p.price.cash_floor)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Row 3: prices + discount */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">List Price</label>
            <input type="number" value={form.list_price} onChange={e => setField('list_price', e.target.value)}
              placeholder="0" min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Discount %</label>
            <input type="number" value={form.discount_pct} onChange={e => setField('discount_pct', e.target.value)}
              placeholder="0" min="0" max="100" step="0.01"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Discount Rs</label>
            <input type="number" value={form.discount_amt} onChange={e => setField('discount_amt', e.target.value)}
              placeholder="0" min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Final Price</label>
            <input type="number" value={form.final_price} onChange={e => setField('final_price', e.target.value)}
              placeholder="0" min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Area / Neighbourhood</label>
            <input value={form.sale_type === 'installment' ? form.inst_area : form.customer_area}
              onChange={e => form.sale_type === 'installment' ? setField('inst_area', e.target.value) : setField('customer_area', e.target.value)}
              placeholder="e.g. North Nazimabad"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>

        {/* Cash customer fields */}
        {form.sale_type === 'cash' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
              <input value={form.customer_name} onChange={e => setField('customer_name', e.target.value)}
                placeholder="Optional"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={form.customer_phone} onChange={e => setField('customer_phone', e.target.value)}
                placeholder="Optional"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
        )}

        {/* Installment customer + plan */}
        {form.sale_type === 'installment' && (
          <>
            <div className="border border-gray-100 rounded-xl p-3 space-y-3 bg-gray-50">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Customer</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <div className="flex gap-1">
                    <input value={form.inst_phone} onChange={e => setField('inst_phone', e.target.value)}
                      onBlur={lookupCustomer} placeholder="03xx-xxxxxxx"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    {lookingUp && <Loader2 className="w-4 h-4 animate-spin text-orange-400 self-center" />}
                    {!lookingUp && form.customer_id && <Check className="w-4 h-4 text-green-500 self-center" />}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                  <input value={form.inst_name} onChange={e => setField('inst_name', e.target.value)}
                    placeholder="Required"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CNIC</label>
                  <input value={form.inst_cnic} onChange={e => setField('inst_cnic', e.target.value)}
                    placeholder="xxxxx-xxxxxxx-x"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Installment Plan</label>
              <div className="flex gap-2">
                {PLAN_KEYS.map(k => (
                  <button key={k} type="button"
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${form.plan_key === k ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}
                    onClick={() => setField('plan_key', k)}>{PLAN_LABELS[k]}</button>
                ))}
              </div>
            </div>

            {planPreview && (
              <div className="bg-orange-50 rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Advance</p>
                  <p className="font-bold text-gray-900 text-sm">PKR {fmtPKR(planPreview.advance)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Monthly ×{planPreview.monthlyPayments}</p>
                  <p className="font-bold text-gray-900 text-sm">PKR {fmtPKR(planPreview.monthly)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total</p>
                  <p className="font-bold text-gray-900 text-sm">PKR {fmtPKR(planPreview.total)}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <input value={form.notes} onChange={e => setField('notes', e.target.value)}
            placeholder="Optional"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {form.id ? 'Update Sale' : 'Record Sale'}
          </button>
          {form.id && (
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setProdSearch(''); }}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          )}
        </div>
      </form>

      {/* ── Ledger Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer, phone or product…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <div className="flex gap-2">
            {(['all','cash','installment'] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg capitalize ${filterType === t ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}>{t}</button>
            ))}
          </div>
          <button onClick={exportExcel} className="px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Export</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">No sales recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Final Price</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap">{s.sale_date}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.customer?.name || s.customer_name || '—'}</p>
                      {(s.customer?.area || s.customer_area) && (
                        <p className="text-[10px] text-gray-400">{s.customer?.area || s.customer_area}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{s.product_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${s.sale_type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {s.sale_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">PKR {fmtPKR(s.final_price)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.plan_key.toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => editSale(s)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/SalesTab.tsx
git commit -m "feat(admin): sales ledger tab — entry form with live discount sync, product search, installment plan preview, and ledger table"
```

---

## Task 4: CollectionsTab.tsx

**Files:**
- Create: `src/components/admin/CollectionsTab.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useState, useEffect } from 'react';
import { fmtPKR } from '@/lib/api';
import {
  getAllSchedules, markSchedulePaid, refreshOverdueSchedules,
  type InstallmentSchedule, type Sale, type SalesCustomer,
} from '@/lib/salesApi';
import { waOpenSafe } from '@/lib/whatsapp';
import { MessageCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

type ScheduleRow = InstallmentSchedule & { sale: Sale & { customer?: SalesCustomer } };

interface PayForm { paid_date: string; amount_paid: string; notes: string; }

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  paid:    'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

function today() { return new Date().toISOString().slice(0, 10); }

export default function CollectionsTab() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying,    setPaying]    = useState<string | null>(null);
  const [payForm,   setPayForm]   = useState<PayForm>({ paid_date: today(), amount_paid: '', notes: '' });
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'overdue'|'paid'>('pending');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    await refreshOverdueSchedules();
    const data = await getAllSchedules();
    setSchedules(data);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleMarkPaid(sched: ScheduleRow) {
    setErr(''); setSaving(true);
    try {
      await markSchedulePaid(sched.id, sched.sale_id, {
        paid_date:   payForm.paid_date,
        amount_paid: parseInt(payForm.amount_paid) || sched.amount_due,
        notes:       payForm.notes || undefined,
      });
      setPaying(null);
      setPayForm({ paid_date: today(), amount_paid: '', notes: '' });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  }

  function buildWhatsApp(sched: ScheduleRow): string {
    const c    = sched.sale?.customer;
    const name = c?.name || 'Customer';
    const prod = sched.sale?.product_name || 'your product';
    const amt  = fmtPKR(sched.amount_due);
    const pen  = sched.penalty_amt > 0 ? ` A late penalty of PKR ${fmtPKR(sched.penalty_amt)} applies.` : '';
    const msg  = `Dear ${name}, your installment of PKR ${amt} for ${prod} was due on ${sched.due_date}.${pen} Kindly arrange payment at your earliest. — Reliance`;
    const phone = c?.phone?.replace(/\D/g, '') || '';
    const intlPhone = phone.startsWith('0') ? '92' + phone.slice(1) : phone;
    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
  }

  const displayed = filterStatus === 'all'
    ? schedules
    : schedules.filter(s => s.status === filterStatus);

  // Overdue float to top within displayed
  const sorted = [...displayed].sort((a, b) => {
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (b.status === 'overdue' && a.status !== 'overdue') return  1;
    return a.due_date.localeCompare(b.due_date);
  });

  const totalOutstanding = schedules
    .filter(s => s.status !== 'paid')
    .reduce((acc, s) => acc + s.amount_due + s.penalty_amt, 0);
  const overdueAmt = schedules
    .filter(s => s.status === 'overdue')
    .reduce((acc, s) => acc + s.amount_due + s.penalty_amt, 0);
  const dueThisWeek = (() => {
    const end = new Date(); end.setDate(end.getDate() + 7);
    return schedules.filter(s => s.status === 'pending' && new Date(s.due_date) <= end)
      .reduce((acc, s) => acc + s.amount_due, 0);
  })();

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Outstanding', value: `PKR ${fmtPKR(totalOutstanding)}`, color: 'text-gray-900' },
          { label: 'Overdue',           value: `PKR ${fmtPKR(overdueAmt)}`,       color: 'text-red-600'  },
          { label: 'Due This Week',     value: `PKR ${fmtPKR(dueThisWeek)}`,      color: 'text-amber-600'},
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + refresh */}
      <div className="flex gap-2 items-center">
        {(['all','overdue','pending','paid'] as const).map(f => (
          <button key={f} onClick={() => setFilterStatus(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize ${filterStatus === f ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            {f} {f !== 'all' && `(${schedules.filter(s => s.status === f).length})`}
          </button>
        ))}
        <button onClick={handleRefresh} disabled={refreshing}
          className="ml-auto p-2 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
      ) : sorted.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">No scheduled payments found.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(sched => {
            const c = sched.sale?.customer;
            return (
              <div key={sched.id} className={`bg-white rounded-xl border p-4 ${sched.status === 'overdue' ? 'border-red-200' : 'border-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{c?.name || '—'}</p>
                      {c?.area && <span className="text-[10px] text-gray-400">{c.area}</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[sched.status]}`}>{sched.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{sched.sale?.product_name}</p>
                    <div className="flex gap-4 mt-1.5">
                      <span className="text-xs text-gray-400">Due: <span className="font-medium text-gray-700">{sched.due_date}</span></span>
                      <span className="text-xs text-gray-400">Amount: <span className="font-bold text-gray-900">PKR {fmtPKR(sched.amount_due)}</span></span>
                      {sched.penalty_amt > 0 && (
                        <span className="text-xs text-red-500">+ PKR {fmtPKR(sched.penalty_amt)} penalty</span>
                      )}
                    </div>
                  </div>
                  {sched.status !== 'paid' && (
                    <div className="flex gap-2 shrink-0">
                      <a href={buildWhatsApp(sched)} target="_blank" rel="noreferrer"
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-200">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <button onClick={() => { setPaying(sched.id); setPayForm({ paid_date: today(), amount_paid: String(sched.amount_due + sched.penalty_amt), notes: '' }); }}
                        className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg border border-orange-200">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Mark paid inline form */}
                {paying === sched.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    {err && <p className="text-xs text-red-500">{err}</p>}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Paid Date</label>
                        <input type="date" value={payForm.paid_date} max={today()}
                          onChange={e => setPayForm(p => ({ ...p, paid_date: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Amount Received</label>
                        <input type="number" value={payForm.amount_paid}
                          onChange={e => setPayForm(p => ({ ...p, amount_paid: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Notes</label>
                        <input value={payForm.notes}
                          onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleMarkPaid(sched)} disabled={saving}
                        className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Confirm Payment
                      </button>
                      <button onClick={() => setPaying(null)}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/CollectionsTab.tsx
git commit -m "feat(admin): installment collections tab — overdue flags, penalty display, mark-paid flow, WhatsApp shortcut"
```

---

## Task 5: SalesAnalyticsTab.tsx

**Files:**
- Create: `src/components/admin/SalesAnalyticsTab.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getSalesAnalytics, fmtPKR as fmtPKRImport } from '@/lib/salesApi';
import { fmtPKR } from '@/lib/api';
import { Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const PLAN_LABELS: Record<string, string> = { cash:'Cash', '2m':'2 Payments', '3m':'3 Payments', '6m':'6 Payments', '12m':'12 Payments' };
const PIE_COLORS = ['#f97316','#3b82f6','#10b981','#8b5cf6','#f59e0b'];
const BAR_COLORS = { cash: '#10b981', installment: '#f97316' };

export default function SalesAnalyticsTab() {
  const [data,    setData]    = useState<Awaited<ReturnType<typeof getSalesAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSalesAnalytics().then(d => { setData(d); setLoading(false); });
  }, []);

  function exportSummary() {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byMonth),       'Revenue by Month');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.topProducts),   'Top Products');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.planPopularity),'Plan Popularity');
    XLSX.writeFile(wb, `sales_summary_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
  );
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue',     value: `PKR ${fmtPKR(data.byMonth.reduce((a,m) => a + m.revenue, 0))}` },
          { label: 'Total Outstanding', value: `PKR ${fmtPKR(data.totalOutstanding)}` },
          { label: 'Overdue',           value: `PKR ${fmtPKR(data.overdueAmount)}`,  red: true },
          { label: 'Avg Discount',      value: `${data.avgDiscountPct.toFixed(1)}%` },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className={`text-base font-black ${k.red ? 'text-red-600' : 'text-gray-900'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue by month */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-gray-900 text-sm">Revenue by Month</h4>
          <button onClick={exportSummary} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
        {data.byMonth.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byMonth} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`PKR ${fmtPKR(v)}`, '']} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cash"        name="Cash"        fill={BAR_COLORS.cash}        radius={[4,4,0,0]} />
              <Bar dataKey="installment" name="Installment" fill={BAR_COLORS.installment} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Top 10 products */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h4 className="font-bold text-gray-900 text-sm mb-4">Top Products by Units Sold</h4>
          {data.topProducts.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No data yet</p>
          ) : (
            <div className="space-y-2">
              {data.topProducts.map((p, i) => (
                <div key={p.product_name} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-400 w-4">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{p.product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="h-1.5 bg-orange-400 rounded-full" style={{ width: `${Math.round(p.units / data.topProducts[0].units * 100)}%` }} />
                      <span className="text-[10px] text-gray-400 shrink-0">{p.units} sold</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-700 tabular-nums">PKR {fmtPKR(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plan popularity */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h4 className="font-bold text-gray-900 text-sm mb-4">Plan Popularity</h4>
          {data.planPopularity.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.planPopularity} dataKey="count" nameKey="plan"
                  cx="50%" cy="50%" outerRadius={70} label={({ plan, percent }) => `${PLAN_LABELS[plan]||plan} ${(percent*100).toFixed(0)}%`}
                  labelLine={false}>
                  {data.planPopularity.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [v, PLAN_LABELS[name] || name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/SalesAnalyticsTab.tsx
git commit -m "feat(admin): sales analytics tab — revenue chart, top products, plan popularity, export"
```

---

## Task 6: Wire Admin Portal

**Files:**
- Modify: `src/pages/AdminPortal.tsx`

- [ ] **Step 1: Add imports at the top of AdminPortal.tsx** (after existing imports, around line 35)

```tsx
import SalesTab           from '@/components/admin/SalesTab';
import CollectionsTab     from '@/components/admin/CollectionsTab';
import SalesAnalyticsTab  from '@/components/admin/SalesAnalyticsTab';
```

- [ ] **Step 2: Update AdminTab type and VALID_TABS** (line ~7483)

Replace:
```tsx
type AdminTab = 'products' | 'images' | 'import' | 'tools' | 'qc' | 'reviews' | 'leads' | 'orders' | 'enquiries' | 'quotation' | 'settings' | 'schema' | 'audit' | 'catalog' | 'solar' | 'compatibility';
const VALID_TABS: AdminTab[] = ['products','images','import','tools','qc','reviews','leads','orders','enquiries','quotation','settings','schema','audit','catalog','solar','compatibility'];
```
With:
```tsx
type AdminTab = 'products' | 'images' | 'import' | 'tools' | 'qc' | 'reviews' | 'leads' | 'orders' | 'enquiries' | 'quotation' | 'settings' | 'schema' | 'audit' | 'catalog' | 'solar' | 'compatibility' | 'sales';
const VALID_TABS: AdminTab[] = ['products','images','import','tools','qc','reviews','leads','orders','enquiries','quotation','settings','schema','audit','catalog','solar','compatibility','sales'];
```

- [ ] **Step 3: Add 'Sales' tab button in nav** (find the tab nav section, add after the 'orders' tab button)

Search for the button that sets `tab === 'orders'` in the tab nav. Add immediately after it:

```tsx
<button onClick={() => changeTab('sales')}
  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${tab === 'sales' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}>
  <ShoppingBag className="w-4 h-4" /> Sales
</button>
```

- [ ] **Step 4: Add tab render case** (in the tab conditional render block, before the fallback `<>`)

Add before the final `else` block (which renders the products tab):
```tsx
) : tab === 'sales' ? (
  <SalesPageTabs />
```

- [ ] **Step 5: Add SalesPageTabs wrapper component** (at the bottom of AdminPortal.tsx, before the export)

```tsx
function SalesPageTabs() {
  const [sub, setSub] = useState<'ledger'|'collections'|'analytics'>('ledger');
  return (
    <div>
      <div className="flex gap-2 mb-4 border-b border-gray-100 pb-3">
        {([['ledger','Ledger'],['collections','Collections'],['analytics','Analytics']] as const).map(([k,label]) => (
          <button key={k} onClick={() => setSub(k)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${sub === k ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'ledger'      && <SalesTab />}
      {sub === 'collections' && <CollectionsTab />}
      {sub === 'analytics'   && <SalesAnalyticsTab />}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminPortal.tsx
git commit -m "feat(admin): wire sales tab into admin portal — ledger, collections, analytics sub-tabs"
```

---

## Task 7: ProductCard Badges

**Files:**
- Modify: `src/components/products/ProductCard.tsx`

- [ ] **Step 1: Add `stats` prop and badge rendering**

In `ProductCard.tsx`, update the Props interface and add badge logic. The stats are passed in from the parent page.

Replace:
```tsx
interface Props { product: Product; }

export default function ProductCard({ product: p }: Props) {
```
With:
```tsx
import type { ProductStat } from '@/lib/salesApi';

interface Props { product: Product; stats?: ProductStat; }

export default function ProductCard({ product: p, stats }: Props) {
```

- [ ] **Step 2: Add badge computation** (after existing `savingsPct` computation)

```tsx
  const isBestSeller = (stats?.units_sold_all ?? 0) > 0 && (stats?.units_sold_all ?? 0) >= 5;
  const isTrending   = (stats?.trending_score ?? 0) > 1.5;
  const soldThisMonth = stats?.units_sold_30d ?? 0;
```

- [ ] **Step 3: Add badges in the badge div** (inside the `<div className="absolute top-2 left-2 ...">`)

Add after the `p.featured` badge and before the savings badge:
```tsx
          {isBestSeller && (
            <span className="inline-flex items-center gap-0.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              🏆 Best Seller
            </span>
          )}
          {!isBestSeller && isTrending && (
            <span className="inline-flex items-center gap-0.5 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              ↑ Trending
            </span>
          )}
          {soldThisMonth >= 3 && (
            <span className="inline-flex items-center bg-gray-800/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {soldThisMonth} sold this month
            </span>
          )}
```

- [ ] **Step 4: Update Products.tsx to load and pass stats**

In `src/pages/Products.tsx`, after products load, fetch stats in batch:

Find the products load effect. After `setProducts(data)`, add:
```tsx
import { getProductStatsBatch, type ProductStat } from '@/lib/salesApi';

// In component state:
const [statsMap, setStatsMap] = useState<Record<string, ProductStat>>({});

// After products load (in the same effect, after setProducts):
if (data.length > 0) {
  getProductStatsBatch(data.map(p => p.id)).then(stats => {
    setStatsMap(Object.fromEntries(stats.map(s => [s.product_id, s])));
  });
}
```

Then in the ProductCard render:
```tsx
<ProductCard key={p.id} product={p} stats={statsMap[p.id]} />
```

- [ ] **Step 5: Do the same for Home.tsx featured products**

In `src/pages/Home.tsx`, after featured products load:
```tsx
import { getProductStatsBatch, type ProductStat } from '@/lib/salesApi';

// State:
const [statsMap, setStatsMap] = useState<Record<string, ProductStat>>({});

// After setFeatured(data):
if (data.length > 0) {
  getProductStatsBatch(data.map((p: Product) => p.id)).then(stats => {
    setStatsMap(Object.fromEntries(stats.map(s => [s.product_id, s])));
  });
}
```

Then in ProductCard renders:
```tsx
<ProductCard key={p.id} product={p} stats={statsMap[p.id]} />
```

- [ ] **Step 6: Commit**

```bash
git add src/components/products/ProductCard.tsx src/pages/Products.tsx src/pages/Home.tsx
git commit -m "feat(ui): product card best seller and trending badges, sold-this-month counter"
```

---

## Task 8: ProductDetail Social Proof & Most Popular Plan

**Files:**
- Modify: `src/pages/ProductDetail.tsx`

- [ ] **Step 1: Add state and fetch**

After existing imports, add:
```tsx
import { getProductStat, type ProductStat } from '@/lib/salesApi';
```

In the component, add state:
```tsx
const [salesStat, setSalesStat] = useState<ProductStat | null>(null);
```

In the existing product load effect, after `setProduct(data)`:
```tsx
getProductStat(data.id).then(setSalesStat);
```

- [ ] **Step 2: Add "most popular plan" hint under plan selector**

Find the installment plan selector section. Add directly after the plan buttons:
```tsx
{salesStat?.most_popular_plan && salesStat.most_popular_plan !== 'cash' && (
  <p className="text-xs text-brand-600 mt-1">
    <span className="font-semibold">{PLAN_LABELS[salesStat.most_popular_plan]}</span> chosen by most buyers
  </p>
)}
```

- [ ] **Step 3: Add social proof line near CTA**

Find the "Add to Cart" / WhatsApp button area. Add immediately before the button:
```tsx
{(salesStat?.units_sold_all ?? 0) >= 3 && (
  <p className="text-xs text-gray-500 mb-3">
    <span className="font-semibold text-gray-700">{salesStat!.units_sold_all}</span> people bought this
  </p>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProductDetail.tsx
git commit -m "feat(ui): product detail — most popular plan hint and social proof sold count"
```

---

## Task 9: ActivityTicker Component

**Files:**
- Create: `src/components/ActivityTicker.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState, useEffect, useRef } from 'react';
import { getTickerEvents, type TickerEvent } from '@/lib/salesApi';

// Categories classified as "high-growth" for weighted selection (target 30%)
const HIGH_GROWTH_CATS = new Set(['solar', 'solar-energy', 'ev', 'inverters', 'batteries']);

/** Weighted shuffle: 70% core appliances, 30% high-growth. Randomised each render. */
function buildLoop(events: TickerEvent[]): TickerEvent[] {
  const core  = events.filter(e => !HIGH_GROWTH_CATS.has(e.category));
  const hg    = events.filter(e =>  HIGH_GROWTH_CATS.has(e.category));
  const total = Math.min(events.length, 30);
  const hgCount = Math.round(total * 0.3);
  const coreCount = total - hgCount;

  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  const pick    = <T,>(arr: T[], n: number): T[] => shuffle(arr).slice(0, n);

  return shuffle([...pick(core, coreCount), ...pick(hg, hgCount)]);
}

function formatEvent(e: TickerEvent): string {
  const cat = e.category || '';
  const isSolar = HIGH_GROWTH_CATS.has(cat);
  const verb = isSolar ? 'New solar installation' : 'Delivered';
  return `${verb}: ${e.product_name} to ${e.area}`;
}

export default function ActivityTicker() {
  const [events, setEvents]       = useState<TickerEvent[]>([]);
  const [loop,   setLoop]         = useState<TickerEvent[]>([]);
  const [idx,    setIdx]          = useState(0);
  const [visible,setVisible]      = useState(false);
  const [paused, setPaused]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getTickerEvents(60).then(data => {
      if (data.length >= 3) {
        setEvents(data);
        setLoop(buildLoop(data));
        setVisible(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!visible || paused || loop.length === 0) return;
    const delay = 30_000 + Math.random() * 30_000; // 30–60s
    timerRef.current = setTimeout(() => {
      setIdx(i => (i + 1) % loop.length);
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [idx, visible, paused, loop]);

  if (!visible || loop.length === 0) return null;

  const current = loop[idx];

  return (
    <div
      className="relative bg-gray-900 text-white overflow-hidden select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
        <span className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <p className="text-xs sm:text-sm font-medium flex-1 min-w-0">
          <span className="text-green-400 font-bold mr-1.5">Recent Delivery —</span>
          <span className="truncate">{formatEvent(current)}</span>
        </p>
        <span className="text-[10px] text-gray-500 shrink-0 hidden sm:block">
          Join 14,000+ happy households
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ActivityTicker.tsx
git commit -m "feat(ui): activity ticker — weighted recent deliveries loop, pause on hover, 30-60s interval"
```

---

## Task 10: Wire Home.tsx

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Import and mount ActivityTicker**

Add import:
```tsx
import ActivityTicker from '@/components/ActivityTicker';
```

Find the outermost return structure in `Home.tsx`. Place `<ActivityTicker />` immediately after the `<OfferBannerSlider />` (or the hero section, whichever comes first in the render output):

```tsx
<OfferBannerSlider />
<ActivityTicker />
```

If there's no OfferBannerSlider at the top level, place it after `<Navbar />` and before the main content div.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat(home): mount activity ticker below offer banner"
```

---

## Task 11: BuyingGuide — Sort by Sales Rank

**Files:**
- Modify: `src/pages/BuyingGuide.tsx`

- [ ] **Step 1: Fetch stats and sort recommendations**

Add import:
```tsx
import { getProductStatsBatch, type ProductStat } from '@/lib/salesApi';
```

After products load (find the `getProducts()` call and its `.then()`):
```tsx
// After setProducts(data) or equivalent:
if (loadedProducts.length > 0) {
  getProductStatsBatch(loadedProducts.map((p: Product) => p.id)).then(stats => {
    const statMap = Object.fromEntries(stats.map(s => [s.product_id, s]));
    // Sort products in-place: by units_sold_all desc, then by cash_floor asc
    const sorted = [...loadedProducts].sort((a, b) => {
      const ua = statMap[a.id]?.units_sold_all ?? 0;
      const ub = statMap[b.id]?.units_sold_all ?? 0;
      if (ub !== ua) return ub - ua;
      return (a.price?.cash_floor ?? 0) - (b.price?.cash_floor ?? 0);
    });
    setProducts(sorted);
    // Tag best sellers for "Most Sold" label (top 3 per category)
    setStatsMap(statMap);
  });
}
```

Add `statsMap` state:
```tsx
const [statsMap, setStatsMap] = useState<Record<string, ProductStat>>({});
```

- [ ] **Step 2: Add "Most Sold" tag on product recommendations**

Where BuyingGuide renders a product card or recommendation item, add:
```tsx
{(statsMap[p.id]?.units_sold_all ?? 0) >= 5 && (
  <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">Most Sold</span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/BuyingGuide.tsx
git commit -m "feat(buying-guide): sort recommendations by units sold, Most Sold tag on bestsellers"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| `customers`, `sales`, `installment_schedules`, `installment_payments` tables | Task 1 |
| `product_stats` view | Task 1 |
| `ticker_events` view (no PII) | Task 1 |
| RLS — admin write, anon read on views | Task 1 |
| CRUD for all tables | Task 2 |
| Schedule auto-generation on installment sale | Task 2 (`createSchedule`) |
| Penalty: 1%/day on amount_due | Task 2 (`refreshOverdueSchedules`) |
| Entry form — backdate, discount ↔ amount sync | Task 3 |
| Product search typeahead | Task 3 |
| Installment plan preview in form | Task 3 |
| Customer phone lookup / create | Task 3 |
| Ledger table with filter + export | Task 3 |
| Collections summary strip | Task 4 |
| Overdue float to top | Task 4 |
| Mark Paid inline form (backdatable) | Task 4 |
| WhatsApp pre-filled message | Task 4 |
| Penalty display | Task 4 |
| Revenue by month bar chart | Task 5 |
| Top 10 products | Task 5 |
| Plan popularity pie | Task 5 |
| Export monthly summary | Task 5 |
| Admin `sales` tab wired | Task 6 |
| Best Seller / Trending badges | Task 7 |
| Sold-this-month counter (≥3 threshold) | Task 7 |
| Most popular plan hint on product detail | Task 8 |
| Social proof sold count (≥3 threshold) | Task 8 |
| Activity ticker — area not name | Task 9 |
| "Recent Delivery" framing | Task 9 |
| 70/30 weighted loop | Task 9 |
| 30–60s randomized interval | Task 9 |
| Pause on hover | Task 9 |
| Ticker mounted on homepage | Task 10 |
| Buying guide sorted by sales rank | Task 11 |
| "Most Sold" tag replaces "Staff Pick" | Task 11 |

All spec requirements covered. No gaps found.

### Type Consistency

- `ProductStat` defined in `salesApi.ts`, imported consistently in Tasks 7, 8, 11
- `TickerEvent` defined in `salesApi.ts`, used in Task 9
- `Sale`, `SalesCustomer`, `InstallmentSchedule` defined in `salesApi.ts`, used in Tasks 3, 4
- `calcPlan` imported from `@/lib/api` in Tasks 2 and 3
- `fmtPKR` imported from `@/lib/api` throughout

No inconsistencies found.
