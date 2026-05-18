-- Store multiple discount entries per invoice (type, mode, amount, reason each)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discounts_json jsonb DEFAULT NULL;
