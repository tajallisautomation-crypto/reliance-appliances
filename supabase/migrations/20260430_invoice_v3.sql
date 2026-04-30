-- ── 1. Expand doc_type to include service_receipt ───────────────────────────
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_doc_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_doc_type_check
  CHECK (doc_type IN (
    'quotation',
    'invoice',
    'installment-invoice',
    'installment_payment_receipt',
    'service_receipt'
  ));

-- ── 2. New columns on invoices ─────────────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS custom_charges_json  jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS guarantor_name        text,
  ADD COLUMN IF NOT EXISTS guarantor_phone       text,
  ADD COLUMN IF NOT EXISTS guarantor_cnic        text,
  ADD COLUMN IF NOT EXISTS cnic_verified         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes                 text;

-- ── 3. Enhance installment_schedules for payment tracking ─────────────────
ALTER TABLE installment_schedules
  ADD COLUMN IF NOT EXISTS payment_method  text CHECK (payment_method IN ('cash','bank_transfer','cheque','online') OR payment_method IS NULL),
  ADD COLUMN IF NOT EXISTS receipt_ref     text,
  ADD COLUMN IF NOT EXISTS notes           text,
  ADD COLUMN IF NOT EXISTS paid_date       date;

-- ── 4. Add advance row (installment_no = 0) support ───────────────────────
-- The unique constraint already allows installment_no = 0 alongside 1..N
-- No schema change needed; app inserts advance as installment_no = 0

-- ── 5. View: installment ledger (per invoice summary) ─────────────────────
CREATE OR REPLACE VIEW installment_ledger AS
SELECT
  i.id               AS invoice_id,
  i.ref_number,
  i.customer_name,
  i.customer_phone,
  i.created_at       AS sale_date,
  i.inst_total_price AS contract_total,
  i.inst_advance_amt AS advance_due,
  i.inst_months,
  i.inst_monthly_amt,
  i.payment_status,
  COALESCE(SUM(s.amount_paid) FILTER (WHERE s.status = 'paid'), 0)                AS total_collected,
  COALESCE(i.inst_total_price, 0)
    - COALESCE(SUM(s.amount_paid) FILTER (WHERE s.status = 'paid'), 0)             AS balance_outstanding,
  COUNT(s.id) FILTER (WHERE s.status = 'pending')                                 AS pending_slots,
  COUNT(s.id) FILTER (WHERE s.status = 'overdue')                                 AS overdue_slots,
  COUNT(s.id) FILTER (WHERE s.status = 'paid')                                    AS paid_slots
FROM invoices i
LEFT JOIN installment_schedules s ON s.invoice_id = i.id
WHERE i.doc_type = 'installment-invoice'
GROUP BY i.id, i.ref_number, i.customer_name, i.customer_phone,
         i.created_at, i.inst_total_price, i.inst_advance_amt,
         i.inst_months, i.inst_monthly_amt, i.payment_status;

-- ── 6. Index for ledger queries ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS invoices_doc_type_installment_idx
  ON invoices (doc_type, created_at DESC)
  WHERE doc_type = 'installment-invoice';

CREATE INDEX IF NOT EXISTS installment_schedules_status_idx
  ON installment_schedules (invoice_id, status);
