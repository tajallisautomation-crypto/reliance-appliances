-- Extend payment_status allowed values to include 'advance_paid'.
-- The app uses 'advance_paid' for installment invoices where the advance
-- has been collected but monthly payments are still outstanding.
-- Safe to run multiple times (constraint drop is IF EXISTS).

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_status_check;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_payment_status_check
  CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'advance_paid'));
