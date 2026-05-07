-- ============================================================
-- Business Intelligence tables for Reports Portal
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Monthly operating expense tracker ────────────────────
CREATE TABLE IF NOT EXISTS bi_expenses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  month       date        NOT NULL,        -- YYYY-MM-01 (first of month)
  category    text        NOT NULL
              CHECK (category IN (
                'rent','utilities','staff_salaries','marketing',
                'logistics','maintenance','purchase_costs','other'
              )),
  amount      numeric(12,2) NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (month, category)
);

ALTER TABLE bi_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bi_expenses_all" ON bi_expenses;
CREATE POLICY "bi_expenses_all" ON bi_expenses FOR ALL USING (true) WITH CHECK (true);

-- ── 2. Product cost / COGS entries ──────────────────────────
CREATE TABLE IF NOT EXISTS bi_product_costs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name   text        NOT NULL,
  product_id     text,
  category       text,
  cost_price     numeric(12,2) NOT NULL,
  effective_date date        NOT NULL DEFAULT CURRENT_DATE,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE bi_product_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bi_product_costs_all" ON bi_product_costs;
CREATE POLICY "bi_product_costs_all" ON bi_product_costs FOR ALL USING (true) WITH CHECK (true);

-- ── 3. Monthly business targets ─────────────────────────────
CREATE TABLE IF NOT EXISTS bi_targets (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  month                date        NOT NULL UNIQUE,
  revenue_target       numeric(12,2),
  order_target         integer,
  solar_lead_target    integer,
  new_customer_target  integer,
  notes                text,
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE bi_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bi_targets_all" ON bi_targets;
CREATE POLICY "bi_targets_all" ON bi_targets FOR ALL USING (true) WITH CHECK (true);

-- ── 4. Offline / untracked sales ────────────────────────────
CREATE TABLE IF NOT EXISTS bi_offline_sales (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date   date        NOT NULL,
  amount      numeric(12,2) NOT NULL,
  category    text,
  description text,
  channel     text        CHECK (channel IN ('walk_in','whatsapp','phone','referral','other')),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE bi_offline_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bi_offline_sales_all" ON bi_offline_sales;
CREATE POLICY "bi_offline_sales_all" ON bi_offline_sales FOR ALL USING (true) WITH CHECK (true);

-- ── 5. Open-read policies for BI portal ─────────────────────
-- Consistent with the existing orders_admin_read pattern (USING true).
-- These tables are admin-only by client-side password gate.

DROP POLICY IF EXISTS "solar_leads_bi_read"    ON solar_leads;
CREATE POLICY "solar_leads_bi_read"
  ON solar_leads FOR SELECT USING (true);

DROP POLICY IF EXISTS "invoices_bi_read"       ON invoices;
CREATE POLICY "invoices_bi_read"
  ON invoices FOR SELECT USING (true);

DROP POLICY IF EXISTS "invoice_lines_bi_read"  ON invoice_lines;
CREATE POLICY "invoice_lines_bi_read"
  ON invoice_lines FOR SELECT USING (true);

DROP POLICY IF EXISTS "analytics_bi_read"      ON analytics;
CREATE POLICY "analytics_bi_read"
  ON analytics FOR SELECT USING (true);

DROP POLICY IF EXISTS "partner_leads_bi_read"  ON partner_leads;
CREATE POLICY "partner_leads_bi_read"
  ON partner_leads FOR SELECT USING (true);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bi_expenses_month_idx      ON bi_expenses (month DESC);
CREATE INDEX IF NOT EXISTS bi_targets_month_idx       ON bi_targets (month DESC);
CREATE INDEX IF NOT EXISTS bi_offline_sales_date_idx  ON bi_offline_sales (sale_date DESC);
CREATE INDEX IF NOT EXISTS bi_product_costs_name_idx  ON bi_product_costs (product_name);
