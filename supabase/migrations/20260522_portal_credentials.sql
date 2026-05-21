-- Portal credential management: admin-generated accounts + invoice-portal linking
-- Run after 20260519_appliance_warranty_fields.sql

-- ── 1. Link invoices to portal auth users ────────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS portal_user_id uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS invoices_portal_user_idx ON invoices(portal_user_id) WHERE portal_user_id IS NOT NULL;

-- ── 2. Admin-generated portal credentials ────────────────────────────────────
-- Stores temp passwords the admin generates to share with private-purchase customers.
-- Only accessible to authenticated (admin) users; not queried by customer portal.
CREATE TABLE IF NOT EXISTS portal_credentials (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL,
  temp_password text        NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  claimed_at    timestamptz,
  notes         text
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_credentials_email_idx ON portal_credentials(email);

ALTER TABLE portal_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_auth" ON portal_credentials;
CREATE POLICY "pc_auth" ON portal_credentials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 3. Unique index for appliance dedup by user + serial_no ─────────────────
-- Allows efficient upsert when auto-importing appliances from invoices.
CREATE UNIQUE INDEX IF NOT EXISTS ca_user_serial_idx
  ON customer_appliances (user_id, serial_no)
  WHERE serial_no IS NOT NULL;
