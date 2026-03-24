-- ============================================================
-- Off-Grid Solar Leads — 2026-03-25
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.solar_leads (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  phone         text        NOT NULL,
  city          text        NOT NULL DEFAULT 'Karachi',
  monthly_bill  integer     NOT NULL,
  backup_hours  integer     NOT NULL DEFAULT 8,
  system_kw     integer     NOT NULL,
  battery_kwh   numeric     NOT NULL,
  est_savings   integer     NOT NULL,
  status        text        NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new', 'contacted', 'quoted', 'closed')),
  proposal_url  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS solar_leads_status_idx  ON public.solar_leads (status);
CREATE INDEX IF NOT EXISTS solar_leads_created_idx ON public.solar_leads (created_at DESC);

ALTER TABLE public.solar_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a solar inquiry
CREATE POLICY "solar_leads_public_insert"
  ON public.solar_leads FOR INSERT
  WITH CHECK (true);

-- Only authenticated admin can read / update
CREATE POLICY "solar_leads_admin_read"
  ON public.solar_leads FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "solar_leads_admin_update"
  ON public.solar_leads FOR UPDATE
  USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "solar_leads_admin_delete"
  ON public.solar_leads FOR DELETE
  USING (auth.role() IN ('service_role', 'authenticated'));
