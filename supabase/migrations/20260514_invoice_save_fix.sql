-- Fix invoice save failures
--
-- Three issues that cause updateInvoiceInSupabase to fail:
-- 1. discount_pct numeric(5,2) overflows when a fixed PKR discount > 999 is stored
-- 2. inst_first_date column may be missing (used in SELECT but never created by migration)
-- 3. prepared_by column may be missing if 20260514_invoice_prepared_by.sql was not run
--
-- Safe to run multiple times (IF NOT EXISTS / idempotent ALTER).

-- 1. Widen discount_pct so fixed-amount discounts (e.g. PKR 5000) don't overflow
ALTER TABLE invoices
  ALTER COLUMN discount_pct TYPE numeric(12,2);

-- 2. Add inst_first_date for installment first payment date
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS inst_first_date date;

-- 3. Add prepared_by in case 20260514_invoice_prepared_by.sql was not yet run
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS prepared_by text;
