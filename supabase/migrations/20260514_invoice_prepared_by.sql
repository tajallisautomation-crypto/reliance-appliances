-- Add prepared_by column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS prepared_by TEXT;
