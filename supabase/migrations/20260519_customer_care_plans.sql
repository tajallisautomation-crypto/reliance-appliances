-- Annual care plan subscriptions per registered appliance.
-- Run after 20260518_customer_portal_tables.sql and 20260519_appliance_warranty_fields.sql.

CREATE TABLE IF NOT EXISTS customer_care_plans (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appliance_id      uuid        REFERENCES customer_appliances(id) ON DELETE SET NULL,
  plan_tier         text        NOT NULL CHECK (plan_tier IN ('essential', 'plus', 'elite')),
  status            text        NOT NULL DEFAULT 'pending_inspection'
                                  CHECK (status IN (
                                    'pending_inspection', 'inspection_required', 'active',
                                    'expiring_soon', 'expired', 'not_eligible', 'cancelled'
                                  )),
  activated_at      date,
  expires_at        date,
  annual_price      numeric(12,2),
  replacement_used  boolean     NOT NULL DEFAULT false,
  notes             text        NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS care_plans_user_idx
  ON customer_care_plans (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS care_plans_appliance_idx
  ON customer_care_plans (appliance_id);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_care_plan_updated ON customer_care_plans;
CREATE TRIGGER trg_care_plan_updated
  BEFORE UPDATE ON customer_care_plans
  FOR EACH ROW EXECUTE FUNCTION _touch_updated_at();

-- RLS
ALTER TABLE customer_care_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ccp_self"  ON customer_care_plans;
DROP POLICY IF EXISTS "ccp_admin" ON customer_care_plans;

CREATE POLICY "ccp_self" ON customer_care_plans
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "ccp_admin" ON customer_care_plans
  FOR ALL USING (auth.role() = 'service_role');
