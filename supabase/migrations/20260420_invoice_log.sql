-- Invoice log tables
-- Stores every generated quotation / invoice / installment invoice for audit + history

CREATE TABLE IF NOT EXISTS invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_number       text UNIQUE NOT NULL,
  doc_type         text NOT NULL CHECK (doc_type IN ('quotation','invoice','installment-invoice')),
  customer_name    text,
  customer_phone   text,
  customer_email   text,
  customer_address text,
  customer_cnic    text,
  subtotal         numeric(12,2),
  discount_pct     numeric(5,2),
  discount_type    text,
  grand_total      numeric(12,2),
  advance_pct      numeric(5,2),
  inst_total_price numeric(12,2),
  inst_advance_amt numeric(12,2),
  inst_months      int,
  inst_monthly_amt numeric(12,2),
  payment_status   text NOT NULL DEFAULT 'pending'
                   CHECK (payment_status IN ('pending','partial','paid','overdue')),
  notes            text,
  created_at       timestamptz DEFAULT now(),
  created_by       uuid REFERENCES auth.users ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL REFERENCES invoices ON DELETE CASCADE,
  product_id     text,
  name           text,
  model          text,
  category       text,
  qty            int,
  unit_price     numeric(12,2),
  line_total     numeric(12,2),
  kwh_per_month  numeric(8,2),
  warranty       text,
  key_spec       text
);

-- Indexes for the history dashboard filters
CREATE INDEX IF NOT EXISTS invoices_created_at_idx    ON invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_customer_phone_idx ON invoices (customer_phone);
CREATE INDEX IF NOT EXISTS invoices_payment_status_idx ON invoices (payment_status);
CREATE INDEX IF NOT EXISTS invoices_doc_type_idx      ON invoices (doc_type);

-- RLS: only authenticated users (admins) can read/write
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users only" ON invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users only" ON invoice_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
