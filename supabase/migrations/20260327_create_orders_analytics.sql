-- ============================================================
-- Create orders and analytics tables (missing from prior migrations)
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── ORDERS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name    text        NOT NULL,
  customer_phone   text        NOT NULL,
  customer_email   text,
  customer_address text,
  products         jsonb       NOT NULL DEFAULT '[]',
  total_amount     numeric     NOT NULL DEFAULT 0,
  payment_method   text        NOT NULL DEFAULT 'cash',
  installment_plan text,
  advance_paid     numeric     DEFAULT 0,
  monthly_amount   numeric     DEFAULT 0,
  notes            text,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','confirmed','processing','delivered','cancelled')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_phone_idx      ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an order (anon INSERT)
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
CREATE POLICY "orders_public_insert"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Customer lookup by phone (for Portal page)
DROP POLICY IF EXISTS "orders_customer_select" ON public.orders;
CREATE POLICY "orders_customer_select"
  ON public.orders FOR SELECT
  USING (true);

-- Admin read/update
DROP POLICY IF EXISTS "orders_admin_read"   ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;

CREATE POLICY "orders_admin_read"
  ON public.orders FOR SELECT
  USING (true);

CREATE POLICY "orders_admin_update"
  ON public.orders FOR UPDATE
  USING (auth.role() IN ('service_role', 'authenticated'));


-- ── ANALYTICS TABLE (used for contact form + enquiries) ───────
CREATE TABLE IF NOT EXISTS public.analytics (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event            text        NOT NULL,
  customer_name    text,
  customer_phone   text,
  customer_email   text,
  subject          text,
  message          text,
  meta             jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_event_idx      ON public.analytics (event);
CREATE INDEX IF NOT EXISTS analytics_created_at_idx ON public.analytics (created_at DESC);

ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert an event (contact form, page views)
DROP POLICY IF EXISTS "analytics_public_insert" ON public.analytics;
CREATE POLICY "analytics_public_insert"
  ON public.analytics FOR INSERT
  WITH CHECK (true);

-- Only admin can read
DROP POLICY IF EXISTS "analytics_admin_read" ON public.analytics;
CREATE POLICY "analytics_admin_read"
  ON public.analytics FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));


-- ── AUTO updated_at TRIGGER FOR ORDERS ───────────────────────
CREATE OR REPLACE FUNCTION public.set_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_orders_updated_at();


-- ── VERIFICATION ──────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('orders', 'analytics')
ORDER BY table_name;
