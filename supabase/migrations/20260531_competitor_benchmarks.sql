-- ============================================================
-- Competitor benchmark capture — 2026-05-31
--
-- Stores manually-entered competitor price observations.
-- These are used to:
--   1. Inform pricing decisions in the Pricing Governance tab.
--   2. Calculate Tajalli's price position (cheaper/parity/more expensive).
--   3. Generate suggested selling prices based on desired margin vs. market.
--
-- All entries are manual at this stage. Staff with pricing access
-- can add entries from the admin portal.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.competitor_benchmarks (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id        uuid        REFERENCES public.products(id) ON DELETE SET NULL,
  -- Denorm product info for display even if product is later deleted
  product_brand     text,
  product_model     text,
  product_category  text,

  competitor_name   text        NOT NULL,
  competitor_url    text,                 -- URL or reference
  competitor_price  numeric(12,2) NOT NULL,
  price_date        date        NOT NULL DEFAULT current_date,
  confidence        text        NOT NULL DEFAULT 'high'
    CHECK (confidence IN ('high','medium','low')),

  notes             text,
  screenshot_url    text,

  -- Suggested Tajalli price based on this observation
  suggested_ta_price numeric(12,2),

  -- Margin impact at suggested price (only meaningful if product.cost_price exists)
  margin_at_suggested numeric(6,2),

  recorded_by       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.competitor_benchmarks IS
  'Manually-entered competitor price observations. Used for pricing governance and market position analysis.';

-- Auto-update
CREATE OR REPLACE FUNCTION update_competitor_benchmarks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_competitor_benchmarks_updated_at ON public.competitor_benchmarks;
CREATE TRIGGER trg_competitor_benchmarks_updated_at
  BEFORE UPDATE ON public.competitor_benchmarks
  FOR EACH ROW EXECUTE FUNCTION update_competitor_benchmarks_updated_at();

CREATE INDEX IF NOT EXISTS cb_product_id_idx  ON public.competitor_benchmarks (product_id);
CREATE INDEX IF NOT EXISTS cb_price_date_idx  ON public.competitor_benchmarks (price_date DESC);
CREATE INDEX IF NOT EXISTS cb_competitor_idx  ON public.competitor_benchmarks (competitor_name);

-- RLS
ALTER TABLE public.competitor_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read competitor benchmarks"
  ON public.competitor_benchmarks FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff manage competitor benchmarks"
  ON public.competitor_benchmarks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── View: latest benchmark per product ───────────────────────────────────────
CREATE OR REPLACE VIEW public.latest_competitor_benchmarks AS
  SELECT DISTINCT ON (cb.product_id, cb.competitor_name)
    cb.*,
    p.cash_floor     AS tajalli_cash,
    p.retail_price   AS tajalli_retail,
    p.cost_price     AS tajalli_cost,
    CASE
      WHEN p.cash_floor IS NOT NULL AND p.cash_floor > 0
      THEN round(((p.cash_floor - cb.competitor_price) / cb.competitor_price) * 100, 1)
      ELSE NULL
    END AS price_diff_pct   -- positive = we are more expensive, negative = we are cheaper
  FROM public.competitor_benchmarks cb
  LEFT JOIN public.products p ON p.id = cb.product_id
  ORDER BY cb.product_id, cb.competitor_name, cb.price_date DESC, cb.created_at DESC;

ALTER VIEW public.latest_competitor_benchmarks OWNER TO postgres;
