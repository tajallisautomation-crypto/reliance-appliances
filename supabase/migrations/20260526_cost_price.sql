-- Cost price column for margin tracking
-- Nullable — only fill in for products where supplier/purchase cost is known.
-- Used by admin to calculate gross margin and enforce pricing floors.

alter table public.products
  add column if not exists cost_price numeric(12,2);

comment on column public.products.cost_price is
  'Supplier / landed cost in PKR. Used to compute gross margin. Never exposed to public.';
