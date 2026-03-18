-- ============================================================
-- Products Admin RLS + Specs Column — 2026-03-19
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Ensure specs column exists as JSONB ──────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '{}';

-- ── Products RLS — authenticated admin can write ─────────────
-- (Public SELECT policy assumed to already exist)

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_admin_insert" ON public.products;
DROP POLICY IF EXISTS "products_admin_update" ON public.products;
DROP POLICY IF EXISTS "products_admin_delete" ON public.products;

CREATE POLICY "products_admin_insert"
  ON public.products FOR INSERT
  WITH CHECK (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "products_admin_update"
  ON public.products FOR UPDATE
  USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "products_admin_delete"
  ON public.products FOR DELETE
  USING (auth.role() IN ('service_role', 'authenticated'));


-- ── VERIFICATION ─────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products'
ORDER BY cmd;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'specs';
