-- Audit log for cost_price changes made in the Pricing Governance admin tab.
-- Each row records who changed the cost of a product, from what value, to what value.

CREATE TABLE IF NOT EXISTS pricing_cost_changes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   text NOT NULL,
  brand        text,
  model        text,
  old_cost     numeric(12,2),          -- null if cost was not previously set
  new_cost     numeric(12,2),          -- null if cost was cleared
  changed_by   text,                   -- staff email
  changed_at   timestamptz DEFAULT now(),
  reason       text
);

CREATE INDEX IF NOT EXISTS pricing_cost_changes_product_idx    ON pricing_cost_changes (product_id);
CREATE INDEX IF NOT EXISTS pricing_cost_changes_changed_at_idx ON pricing_cost_changes (changed_at DESC);

ALTER TABLE pricing_cost_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users only" ON pricing_cost_changes;
CREATE POLICY "Authenticated users only" ON pricing_cost_changes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
