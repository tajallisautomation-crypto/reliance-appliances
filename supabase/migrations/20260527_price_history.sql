-- Price history: populated by CSV import (processCSVImport in api.ts, step 4b).
-- Every import appends one row per product with the price at import time.
-- This table is queried by getPriceHistory() for the pricing governance timeline.

CREATE TABLE IF NOT EXISTS price_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   text NOT NULL,
  brand        text,
  model        text,
  category     text,
  retail_price numeric(12,2) NOT NULL,
  imported_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_history_product_idx    ON price_history (product_id);
CREATE INDEX IF NOT EXISTS price_history_imported_at_idx ON price_history (imported_at DESC);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users only" ON price_history;
CREATE POLICY "Authenticated users only" ON price_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
