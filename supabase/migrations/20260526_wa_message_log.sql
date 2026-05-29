-- WhatsApp message log
-- Records when admin sends a WhatsApp from the lifecycle engine,
-- quotation tool, or manually. Enables "last contacted" display
-- and prevents double-messaging.

create table if not exists public.wa_message_log (
  id             uuid primary key default gen_random_uuid(),
  flow_id        uuid references public.customer_lifecycle_flows(id) on delete set null,
  customer_phone text not null,
  customer_name  text,
  stage          text,
  message_type   text not null default 'lifecycle'
                 check (message_type in ('lifecycle','quotation','invoice','manual')),
  sent_by        uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists wa_message_log_phone_idx    on public.wa_message_log(customer_phone);
create index if not exists wa_message_log_flow_idx     on public.wa_message_log(flow_id);
create index if not exists wa_message_log_created_idx  on public.wa_message_log(created_at desc);

alter table public.wa_message_log enable row level security;

-- Staff can read all log entries
create policy "wa_log_staff_read" on public.wa_message_log
  for select using (
    exists (
      select 1 from public.staff_members m
      where m.id = auth.uid() and m.is_active = true
    )
  );

-- Staff can insert (log their own sends)
create policy "wa_log_staff_insert" on public.wa_message_log
  for insert with check (
    exists (
      select 1 from public.staff_members m
      where m.id = auth.uid() and m.is_active = true
    )
  );
