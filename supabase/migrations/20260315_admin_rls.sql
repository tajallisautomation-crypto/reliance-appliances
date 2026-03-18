-- ============================================================
-- Admin RLS Fix — 2026-03-15
-- Allows authenticated users (admin panel) to read and update
-- partner_leads and delete reviews.
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── PARTNER LEADS — allow authenticated admin to read/update ─
DROP POLICY IF EXISTS "partner_leads_admin_read"   ON public.partner_leads;
DROP POLICY IF EXISTS "partner_leads_admin_update" ON public.partner_leads;

CREATE POLICY "partner_leads_admin_read"
  ON public.partner_leads FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "partner_leads_admin_update"
  ON public.partner_leads FOR UPDATE
  USING (auth.role() IN ('service_role', 'authenticated'));


-- ── REVIEWS — allow authenticated admin to update/delete ─────
-- (Public SELECT already exists from platform_overhaul migration)
DROP POLICY IF EXISTS "reviews_admin_update" ON public.reviews;
DROP POLICY IF EXISTS "reviews_admin_delete" ON public.reviews;

CREATE POLICY "reviews_admin_update"
  ON public.reviews FOR UPDATE
  USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "reviews_admin_delete"
  ON public.reviews FOR DELETE
  USING (auth.role() IN ('service_role', 'authenticated'));


-- ── VERIFICATION ─────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('reviews', 'partner_leads')
ORDER BY tablename, cmd;
