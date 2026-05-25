-- Customer lifecycle engine
-- AC buyers (and any high-value category) enter a tracked CRM journey:
--   installation_pending → day7_check → month3_service →
--   presummer_clean → annual_care_plan → solar_offer → completed
--
-- Also extends customer_profiles with segment + purchase tracking.

-- ─── Lifecycle flows ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_lifecycle_flows (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name     text        NOT NULL DEFAULT '',
  customer_phone    text        NOT NULL,
  product_name      text        NOT NULL,
  product_category  text        NOT NULL DEFAULT 'air-conditioners',
  purchase_date     date        NOT NULL DEFAULT CURRENT_DATE,
  installation_date date,
  current_stage     text        NOT NULL DEFAULT 'installation_pending'
                                  CHECK (current_stage IN (
                                    'installation_pending', 'day7_check',
                                    'month3_service', 'presummer_clean',
                                    'annual_care_plan', 'solar_offer', 'completed'
                                  )),
  stage_updated_at  timestamptz NOT NULL DEFAULT now(),
  next_action_at    date,
  linked_invoice_id text,
  staff_notes       text        NOT NULL DEFAULT '',
  segment           text        NOT NULL DEFAULT 'new_customer'
                                  CHECK (segment IN (
                                    'new_customer', 'repeat_buyer',
                                    'high_value', 'at_risk', 'solar_prospect'
                                  )),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clf_stage_action_idx
  ON customer_lifecycle_flows (current_stage, next_action_at);

CREATE INDEX IF NOT EXISTS clf_phone_idx
  ON customer_lifecycle_flows (customer_phone);

ALTER TABLE customer_lifecycle_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clf_auth" ON customer_lifecycle_flows
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Extend customer_profiles (only if table exists) ─────────────────────────
DO $$ BEGIN
  ALTER TABLE customer_profiles
    ADD COLUMN IF NOT EXISTS segment           text    NOT NULL DEFAULT 'new_customer'
                                                 CHECK (segment IN (
                                                   'new_customer', 'repeat_buyer',
                                                   'high_value', 'at_risk', 'solar_prospect'
                                                 )),
    ADD COLUMN IF NOT EXISTS purchase_count    integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_purchase_date date;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'customer_profiles not found — run 20260518_customer_portal_tables.sql first to get segment/purchase columns';
END $$;

-- ─── View: customers needing action today or overdue ─────────────────────────
CREATE OR REPLACE VIEW lifecycle_action_queue AS
SELECT
  id, customer_name, customer_phone, product_name, product_category,
  purchase_date, installation_date, current_stage, next_action_at, segment,
  staff_notes, linked_invoice_id,
  CURRENT_DATE - next_action_at AS days_overdue
FROM customer_lifecycle_flows
WHERE current_stage <> 'completed'
  AND next_action_at IS NOT NULL
  AND next_action_at <= CURRENT_DATE + INTERVAL '3 days'
ORDER BY next_action_at ASC;
