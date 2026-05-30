-- Add payment_date column to invoices table.
-- Used to record the date payment was actually received (separate from created_at).
-- Displayed on the invoice PDF in the INVOICE DETAILS meta block.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_date date;
