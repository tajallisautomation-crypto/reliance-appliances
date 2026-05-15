-- Store a fully custom per-row installment payment schedule on the invoice.
-- When present, the PDF generators use these rows instead of auto-computing
-- from inst_months / inst_monthly_amt / inst_first_date.
-- Row shape: { no, label, dueDate, amount }  (no=0 is the advance slot)
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS inst_schedule_json jsonb;
