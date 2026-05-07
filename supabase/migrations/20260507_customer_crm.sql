-- customer_notes: staff CRM notes per customer, keyed by phone
CREATE TABLE IF NOT EXISTS customer_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text     NOT NULL,
  note        text        NOT NULL,
  created_by  text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_notes_phone_idx
  ON customer_notes (customer_phone, created_at DESC);
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON customer_notes
  FOR ALL USING (auth.role() = 'authenticated');
