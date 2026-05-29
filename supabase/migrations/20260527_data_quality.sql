-- Data quality score — computed by the QC engine and persisted here so that:
--   1. High-conversion surfaces (homepage, bundles, solar calculator) can filter
--      by score without re-running the full scoring logic on every request.
--   2. Admin can sort/filter the entire catalog by quality score.
--   3. Reports can track quality improvement over time.
--
-- Score is 0–100. Threshold for public visibility is 40 (blocks only truly
-- broken products — no image + no price). The QC tab warns at score < 90.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS data_quality_score       numeric(5,2),
  ADD COLUMN IF NOT EXISTS data_quality_checked_at  timestamptz;

COMMENT ON COLUMN public.products.data_quality_score IS
  'QC score 0–100. Updated by the admin QC rescan. Products below 40 are hidden from homepage/bundles.';

CREATE INDEX IF NOT EXISTS products_data_quality_score_idx
  ON public.products (data_quality_score)
  WHERE data_quality_score IS NOT NULL;

-- ── Batch-update RPC ──────────────────────────────────────────────────────────
-- Called from the admin QC rescan. Accepts a JSON array of
-- {id, score, checked_at} objects and updates all in one round-trip.

CREATE OR REPLACE FUNCTION update_quality_scores(
  score_data jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.products p
  SET
    data_quality_score      = (entry.value ->> 'score')::numeric,
    data_quality_checked_at = (entry.value ->> 'checked_at')::timestamptz
  FROM jsonb_array_elements(score_data) AS entry
  WHERE p.id::text = (entry.value ->> 'id');
$$;

-- Only authenticated users should call this function
REVOKE ALL ON FUNCTION update_quality_scores(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_quality_scores(jsonb) TO authenticated;
