-- Add service_label to reviews for the homepage "What Our Customers Say" section.
-- Admins fill this in when featuring a review (e.g. "Inverter AC on Installments").
-- Seed the 6 hardcoded homepage reviews as featured/approved so the homepage
-- doesn't go blank on first deploy if no real reviews exist yet.

alter table public.reviews
  add column if not exists service_label text;

-- Allow product_id to be NULL for general/service testimonials not tied to a specific product
alter table public.reviews
  alter column product_id drop not null;

-- Seed homepage reviews (idempotent: only inserts if no featured reviews exist yet)
-- product_id is NULL — these are general service testimonials, not product-specific
do $$
begin
  if not exists (select 1 from public.reviews where is_featured = true limit 1) then
    insert into public.reviews
      (product_id, customer_name, city, rating, comment, verified_purchase, status, is_featured, service_label)
    values
      (null, 'M. Tariq',  'Gulshan-e-Iqbal', 5,
       'AC delivered and installed the same day. Professional team, clean work. Installment plan was fully transparent — no hidden charges.',
       true, 'approved', true, 'Inverter AC on Installments'),
      (null, 'Fatima K.', 'North Karachi',    5,
       'Excellent installation. Team explained everything clearly and followed up after the job. Haven''t paid a full electricity bill since.',
       true, 'approved', true, 'Solar Inverter Setup'),
      (null, 'Asad M.',   'Federal B Area',   5,
       'Ordered through WhatsApp — delivery was fast, packaging intact, product original. Will definitely buy again.',
       true, 'approved', true, 'Haier Refrigerator'),
      (null, 'Sara R.',   'Nazimabad',        5,
       'UPS and battery for my salon — no more load-shedding problems. Team understood exactly what we needed and set it up perfectly.',
       true, 'approved', true, 'Salon Backup Package'),
      (null, 'Imran A.',  'North Nazimabad',  5,
       'Bought two products together, saved on delivery and installation. Everything works perfectly. Tajalli''s is my go-to now.',
       true, 'approved', true, 'AC + Washing Machine Bundle'),
      (null, 'Hina Z.',   'Korangi',          5,
       'Very smooth from start to finish. Good price, same-day delivery, team even helped with the wall bracket setup.',
       true, 'approved', true, 'Smart TV Delivery');
  end if;
end $$;
