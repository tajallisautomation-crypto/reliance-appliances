-- Add discount_mode column to invoices
-- Distinguishes percentage discounts from fixed-PKR discounts.
-- Without this the app had to guess from discount_pct > 100, which fails
-- for fixed discounts of PKR 100 or less.
--
-- Safe to run multiple times (IF NOT EXISTS / idempotent).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS discount_mode text DEFAULT 'percentage'
    CHECK (discount_mode IN ('percentage', 'fixed') OR discount_mode IS NULL);

-- Back-fill existing rows: any row where discount_pct > 100 was a fixed
-- PKR amount stored in the old widened numeric column.
UPDATE invoices
  SET discount_mode = 'fixed'
  WHERE discount_mode IS NULL OR discount_mode = 'percentage'
    AND discount_pct > 100;
