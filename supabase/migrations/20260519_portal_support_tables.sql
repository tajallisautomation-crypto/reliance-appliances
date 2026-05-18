-- Support tickets, payment proofs, and warranty claims for the customer portal.
-- Run after 20260518_customer_portal_tables.sql.

-- ─── Support tickets ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_ref      text        UNIQUE,           -- human-readable e.g. TKT-A1B2C3D4
  order_id        text,
  appliance_id    uuid        REFERENCES customer_appliances(id) ON DELETE SET NULL,
  category        text        NOT NULL
                                CHECK (category IN (
                                  'warranty_claim', 'product_defect', 'delivery_issue',
                                  'installation_issue', 'payment_issue', 'wrong_product',
                                  'service_request', 'complaint', 'other'
                                )),
  priority        text        NOT NULL DEFAULT 'medium'
                                CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  subject         text        NOT NULL,
  description     text        NOT NULL,
  status          text        NOT NULL DEFAULT 'open'
                                CHECK (status IN (
                                  'open', 'in_review', 'waiting_customer',
                                  'assigned', 'resolved', 'rejected'
                                )),
  resolution_note text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-generate a human-readable ticket reference on INSERT
CREATE OR REPLACE FUNCTION _gen_ticket_ref()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ticket_ref IS NULL THEN
    NEW.ticket_ref := 'TKT-' || UPPER(SUBSTRING(MD5(NEW.id::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_ref ON support_tickets;
CREATE TRIGGER trg_ticket_ref
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION _gen_ticket_ref();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION _touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_support_updated ON support_tickets;
CREATE TRIGGER trg_support_updated
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION _touch_updated_at();

CREATE INDEX IF NOT EXISTS support_tickets_user_idx
  ON support_tickets (user_id, created_at DESC);

-- ─── Payment proofs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_proofs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id         text,
  payment_method   text        NOT NULL
                                 CHECK (payment_method IN ('easypaisa', 'jazzcash', 'bank', 'cash', 'other')),
  amount           numeric(12,2) NOT NULL,
  txn_date         date        NOT NULL,
  reference_number text        NOT NULL DEFAULT '',
  notes            text        NOT NULL DEFAULT '',
  status           text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_proofs_user_idx
  ON payment_proofs (user_id, created_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "st_self"  ON support_tickets;
DROP POLICY IF EXISTS "pp_self"  ON payment_proofs;
DROP POLICY IF EXISTS "st_admin" ON support_tickets;
DROP POLICY IF EXISTS "pp_admin" ON payment_proofs;

CREATE POLICY "st_self"  ON support_tickets
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "pp_self"  ON payment_proofs
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admin (service_role) sees everything
CREATE POLICY "st_admin" ON support_tickets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pp_admin" ON payment_proofs  FOR ALL USING (auth.role() = 'service_role');
