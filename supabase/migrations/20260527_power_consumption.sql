-- Power consumption in watts — applicable to ACs, refrigerators, freezers,
-- washing machines, water dispensers, and any appliance with a rated load.
-- Used for solar system sizing (total household load calculation).
-- Stored as integer watts for simplicity; NULL = unknown.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS power_consumption_w integer;

COMMENT ON COLUMN public.products.power_consumption_w IS
  'Rated power consumption in watts. Used for solar load calculations. NULL = not yet recorded.';

CREATE INDEX IF NOT EXISTS products_power_consumption_idx
  ON public.products (power_consumption_w)
  WHERE power_consumption_w IS NOT NULL;
