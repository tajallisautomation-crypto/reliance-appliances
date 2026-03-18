-- ============================================================
-- Reliance Platform Overhaul — 2026-03-15
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── REVIEWS TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        text        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name     text        NOT NULL,
  city              text,
  rating            smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           text        NOT NULL,
  verified_purchase boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for fast product-level lookups
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON public.reviews (product_id);

-- Row-level security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read published reviews
CREATE POLICY "reviews_public_read"
  ON public.reviews FOR SELECT
  USING (true);

-- Anyone (anonymous) can insert a review
CREATE POLICY "reviews_public_insert"
  ON public.reviews FOR INSERT
  WITH CHECK (true);

-- Only service role can update/delete (admin moderation)
CREATE POLICY "reviews_admin_update"
  ON public.reviews FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "reviews_admin_delete"
  ON public.reviews FOR DELETE
  USING (auth.role() = 'service_role');


-- ── PARTNER LEADS TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_leads (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    text        NOT NULL,
  contact_person  text        NOT NULL,
  phone           text        NOT NULL,
  email           text,
  category        text        NOT NULL,
  monthly_volume  text,
  website         text,
  message         text,
  status          text        NOT NULL DEFAULT 'new'
                              CHECK (status IN ('new', 'contacted', 'qualified', 'closed', 'rejected')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for status-based querying (admin pipeline)
CREATE INDEX IF NOT EXISTS partner_leads_status_idx ON public.partner_leads (status);
CREATE INDEX IF NOT EXISTS partner_leads_created_idx ON public.partner_leads (created_at DESC);

-- Row-level security
ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

-- Anonymous users can INSERT (submit the form)
CREATE POLICY "partner_leads_public_insert"
  ON public.partner_leads FOR INSERT
  WITH CHECK (true);

-- Only service role can read/update (admin CRM)
CREATE POLICY "partner_leads_admin_read"
  ON public.partner_leads FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "partner_leads_admin_update"
  ON public.partner_leads FOR UPDATE
  USING (auth.role() = 'service_role');


-- ── UPDATED_AT TRIGGER ───────────────────────────────────────
-- Auto-update updated_at on partner_leads changes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partner_leads_updated_at ON public.partner_leads;
CREATE TRIGGER partner_leads_updated_at
  BEFORE UPDATE ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── VERIFICATION ─────────────────────────────────────────────
-- Confirm tables exist:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('reviews', 'partner_leads')
ORDER BY table_name;
