-- Price audit log: records every automated price comparison + adjustment
CREATE TABLE IF NOT EXISTS price_audit_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           uuid NOT NULL,           -- groups all rows from one audit run
  sku              text NOT NULL,           -- product id
  brand            text,
  model            text,
  category         text,
  previous_price   numeric(12,2),          -- retail_price before any adjustment
  reference_price  numeric(12,2),          -- market reference / distributor price
  adjusted_price   numeric(12,2),          -- computed adjusted price (null if no change)
  source_url       text,                   -- where reference price was obtained
  reason           text,                   -- e.g. 'site > reference by 12%'
  action           text NOT NULL           -- 'no_change' | 'flagged' | 'adjusted'
                   CHECK (action IN ('no_change','flagged','adjusted')),
  applied          boolean DEFAULT false,  -- whether the adjustment was written to products
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_audit_log_run_id_idx  ON price_audit_log (run_id);
CREATE INDEX IF NOT EXISTS price_audit_log_action_idx  ON price_audit_log (action);
CREATE INDEX IF NOT EXISTS price_audit_log_created_idx ON price_audit_log (created_at DESC);

ALTER TABLE price_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users only" ON price_audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
