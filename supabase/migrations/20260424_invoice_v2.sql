-- ── 1. Drop & recreate doc_type constraint to include new type ─────────────
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_doc_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_doc_type_check
  CHECK (doc_type IN (
    'quotation',
    'invoice',
    'installment-invoice',
    'installment_payment_receipt'
  ));

-- ── 2. New columns on invoices ─────────────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS customer_type  text CHECK (customer_type IN ('house','apartment','commercial')),
  ADD COLUMN IF NOT EXISTS customer_area  text,
  ADD COLUMN IF NOT EXISTS sale_type      text CHECK (sale_type IN ('cash','installment')),
  ADD COLUMN IF NOT EXISTS service_level  text CHECK (service_level IN ('supply_only','supply_install','full_service')),
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS service_total  numeric(12,2),
  ADD COLUMN IF NOT EXISTS linked_invoice_id uuid REFERENCES invoices(id);

-- ── 3. New columns on invoice_lines ───────────────────────────────────────
ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS brand               text,
  ADD COLUMN IF NOT EXISTS min_price           numeric(12,2),
  ADD COLUMN IF NOT EXISTS approved_floor_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS override_reason     text,
  ADD COLUMN IF NOT EXISTS key_specs_json      jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS warranty_json       jsonb DEFAULT '{}'::jsonb;

-- ── 4. invoice_services ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_services (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_type   text NOT NULL,
  service_name   text NOT NULL,
  description    text,
  status         text NOT NULL CHECK (status IN ('included','charged','not_selected')),
  visible_value  numeric(12,2) DEFAULT 0,
  charged_amount numeric(12,2) DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE invoice_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users only" ON invoice_services;
CREATE POLICY "Authenticated users only" ON invoice_services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 5. installment_schedules ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installment_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  installment_no  integer NOT NULL,
  due_date        date NOT NULL,
  amount_due      numeric(12,2) NOT NULL,
  amount_paid     numeric(12,2) DEFAULT 0,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  paid_at         timestamptz,
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT installment_schedules_uniq_no UNIQUE (invoice_id, installment_no)
);

ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users only" ON installment_schedules;
CREATE POLICY "Authenticated users only" ON installment_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 6. price_overrides ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_overrides (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       uuid REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_line_id  uuid REFERENCES invoice_lines(id) ON DELETE CASCADE,
  product_id       text,
  floor_price      numeric(12,2) NOT NULL,
  attempted_price  numeric(12,2) NOT NULL,
  approved_price   numeric(12,2) NOT NULL,
  reason           text NOT NULL,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT price_overrides_must_link CHECK (
    invoice_id IS NOT NULL OR invoice_line_id IS NOT NULL
  )
);

ALTER TABLE price_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users only" ON price_overrides;
CREATE POLICY "Authenticated users only" ON price_overrides
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 7. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS invoice_services_invoice_id_idx      ON invoice_services (invoice_id);
CREATE INDEX IF NOT EXISTS installment_schedules_invoice_id_idx ON installment_schedules (invoice_id);
CREATE INDEX IF NOT EXISTS price_overrides_invoice_id_idx       ON price_overrides (invoice_id);
