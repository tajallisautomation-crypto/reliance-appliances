-- Add amount_paid column to store exact cash received (for partial/advance payments)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid numeric(12,2) DEFAULT NULL;

-- Add trade_ins_json to store buyback/trade-in credits applied to the invoice
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS trade_ins_json jsonb DEFAULT NULL;
