-- ============================================================
-- Taxonomy Architecture — 2026-04-02
-- Adds two-layer taxonomy fields to the products table.
--
-- Layer 1 (original): verbatim supplier category preserved in original_category
-- Layer 2 (normalized): canonical taxonomy for browse, filters, SEO, comparison
--
-- taxonomy_status gates public visibility:
--   'live'       → visible in public catalog (default for known categories)
--   'review'     → visible to admin only (unknown/new category — needs mapping)
--   'quarantine' → blocked entirely (missing required fields)
-- ============================================================

-- ── Layer 1: preserve supplier source data ────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS original_category        text,
  ADD COLUMN IF NOT EXISTS original_subcategory     text;

-- ── Layer 2: normalized taxonomy ─────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS normalized_category      text,
  ADD COLUMN IF NOT EXISTS normalized_subcategory   text,
  ADD COLUMN IF NOT EXISTS category_family          text,
  ADD COLUMN IF NOT EXISTS comparison_group         text,
  ADD COLUMN IF NOT EXISTS frontend_browse_group    text,
  ADD COLUMN IF NOT EXISTS seo_category_slug        text,
  ADD COLUMN IF NOT EXISTS seo_subcategory_slug     text;

-- ── Taxonomy validation status ────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS taxonomy_status          text
    NOT NULL DEFAULT 'live'
    CHECK (taxonomy_status IN ('live', 'review', 'quarantine'));

-- ── Indexes for efficient filtering ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS products_taxonomy_status_idx
  ON public.products (taxonomy_status);

CREATE INDEX IF NOT EXISTS products_normalized_category_idx
  ON public.products (normalized_category);

CREATE INDEX IF NOT EXISTS products_frontend_browse_group_idx
  ON public.products (frontend_browse_group);

CREATE INDEX IF NOT EXISTS products_comparison_group_idx
  ON public.products (comparison_group);

-- ── Backfill: copy current category → original_category for all existing rows ─
-- (idempotent — only fills rows where original_category is NULL)
UPDATE public.products
  SET original_category = category
  WHERE original_category IS NULL
    AND category IS NOT NULL;

-- ── Backfill: mark existing products without taxonomy fields as 'live' ────────
-- These were imported before taxonomy validation existed; they are already live.
-- The taxonomy_status default already handles new rows; this is belt-and-suspenders.
UPDATE public.products
  SET taxonomy_status = 'live'
  WHERE taxonomy_status IS NULL;

-- ── View: products pending taxonomy review (admin dashboard helper) ───────────
CREATE OR REPLACE VIEW public.products_taxonomy_review AS
  SELECT
    id,
    brand,
    model,
    category,
    original_category,
    taxonomy_status,
    normalized_category,
    updated_at
  FROM public.products
  WHERE taxonomy_status IN ('review', 'quarantine')
  ORDER BY updated_at DESC;

-- Admin-only access to the review view
ALTER VIEW public.products_taxonomy_review OWNER TO postgres;

-- ── Verification ─────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name IN (
    'original_category', 'original_subcategory',
    'normalized_category', 'normalized_subcategory',
    'category_family', 'comparison_group',
    'frontend_browse_group', 'seo_category_slug', 'seo_subcategory_slug',
    'taxonomy_status'
  )
ORDER BY column_name;
