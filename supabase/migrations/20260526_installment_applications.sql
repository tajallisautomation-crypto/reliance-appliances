-- Installment application & approval workflow
-- Customers submit applications via the portal; admin reviews and approves/rejects.

create table if not exists public.installment_applications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete set null,
  customer_name    text not null,
  customer_phone   text not null,
  customer_email   text,
  customer_cnic    text,
  guarantor_name   text,
  guarantor_phone  text,
  guarantor_cnic   text,
  product_interest text not null,
  requested_amount numeric(12,2),
  requested_months int  check (requested_months in (6,12,18,24,36)),
  employment_type  text check (employment_type in ('salaried','business','retired','other')),
  monthly_income   numeric(12,2),
  status           text not null default 'pending'
                   check (status in ('pending','approved','rejected','converted')),
  admin_note       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.installment_applications enable row level security;

-- Authenticated customers insert their own applications
create policy "inst_app_customer_insert" on public.installment_applications
  for insert with check (auth.uid() = user_id);

-- Customers read their own applications
create policy "inst_app_customer_read" on public.installment_applications
  for select using (auth.uid() = user_id);

-- Staff (any active member) can read all applications
create policy "inst_app_staff_read" on public.installment_applications
  for select using (
    exists (
      select 1 from public.staff_members m
      where m.id = auth.uid() and m.is_active = true
    )
  );

-- Staff can update status + admin_note
create policy "inst_app_staff_update" on public.installment_applications
  for update using (
    exists (
      select 1 from public.staff_members m
      where m.id = auth.uid() and m.is_active = true
    )
  );
