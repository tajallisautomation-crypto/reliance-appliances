-- ============================================================
-- Admin Orders, Enquiries & Site Settings — 2026-03-16
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── ORDERS — allow authenticated admin to read/update ────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_admin_read"   ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;

CREATE POLICY "orders_admin_read"
  ON public.orders FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "orders_admin_update"
  ON public.orders FOR UPDATE
  USING (auth.role() IN ('service_role', 'authenticated'));


-- ── ANALYTICS — allow authenticated admin to read ────────────
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_admin_read" ON public.analytics;

CREATE POLICY "analytics_admin_read"
  ON public.analytics FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));


-- ── SITE SETTINGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL DEFAULT '',
  label      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public read (so the frontend can load settings without auth)
DROP POLICY IF EXISTS "site_settings_public_read"  ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_insert" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON public.site_settings;

CREATE POLICY "site_settings_public_read"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "site_settings_admin_insert"
  ON public.site_settings FOR INSERT
  WITH CHECK (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "site_settings_admin_update"
  ON public.site_settings FOR UPDATE
  USING (auth.role() IN ('service_role', 'authenticated'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_site_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS site_settings_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_site_settings_updated_at();

-- Seed defaults (do not overwrite existing values)
INSERT INTO public.site_settings (key, value, label) VALUES
  ('consultation_threshold', '200000',        'Consultation Threshold (PKR)'),
  ('announcement_text',      '',              'Announcement Banner Text'),
  ('announcement_enabled',   'false',         'Announcement Banner Enabled'),
  ('plan_2m_markup',         '1.10',          '2-Month Plan Markup Multiplier'),
  ('plan_2m_advance',        '0.50',          '2-Month Plan Advance Ratio'),
  ('plan_3m_markup',         '1.15',          '3-Month Plan Markup Multiplier'),
  ('plan_3m_advance',        '0.45',          '3-Month Plan Advance Ratio'),
  ('plan_6m_markup',         '1.25',          '6-Month Plan Markup Multiplier'),
  ('plan_6m_advance',        '0.40',          '6-Month Plan Advance Ratio'),
  ('plan_12m_markup',        '1.40',          '12-Month Plan Markup Multiplier'),
  ('plan_12m_advance',       '0.30',          '12-Month Plan Advance Ratio')
ON CONFLICT (key) DO NOTHING;


-- ── VERIFICATION ──────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'analytics', 'site_settings')
ORDER BY tablename, cmd;

SELECT key, value FROM public.site_settings ORDER BY key;
