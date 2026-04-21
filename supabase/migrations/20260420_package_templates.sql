-- Package templates
-- Admin-curated bundles that can be loaded into the invoice generator in one click.
-- Each template stores the full line array as JSONB so no join is needed on load.

CREATE TABLE IF NOT EXISTS package_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  category_tag  text,                       -- e.g. 'solar', 'kitchen', 'home-starter'
  lines         jsonb NOT NULL DEFAULT '[]',-- QuoteLine[] serialised
  discount      numeric(5,2) DEFAULT 0,
  discount_type text DEFAULT 'Promotional',
  is_active     boolean DEFAULT true,
  sort_order    int DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pkg_templates_active_idx ON package_templates (is_active, sort_order);

ALTER TABLE package_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users only" ON package_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
