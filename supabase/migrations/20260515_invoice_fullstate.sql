-- Persist all invoice editor fields so reprints and edits are fully pre-filled.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS is_existing_customer boolean,
  ADD COLUMN IF NOT EXISTS stock_status          text,
  ADD COLUMN IF NOT EXISTS show_ntn              boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_eta          text,
  ADD COLUMN IF NOT EXISTS validity_hours        integer DEFAULT 48,
  ADD COLUMN IF NOT EXISTS advance_mode          text DEFAULT 'pct'
    CHECK (advance_mode IN ('pct','fixed') OR advance_mode IS NULL),
  ADD COLUMN IF NOT EXISTS advance_fixed_amt     numeric(12,2),
  ADD COLUMN IF NOT EXISTS balance_note          text DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS cash_pay_schedule_json jsonb;
