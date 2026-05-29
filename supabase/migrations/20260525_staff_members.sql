-- Admin staff access control
-- Insert rows here (via Supabase dashboard or service-role client) to grant
-- a Supabase Auth user access to the admin portal.
-- Roles: owner > admin > sales | finance | service | reports

create table if not exists public.staff_members (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  role        text not null default 'admin'
              check (role in ('owner', 'admin', 'sales', 'finance', 'service', 'reports')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.staff_members enable row level security;

-- Staff can read their own record (used by adminAuthStore to verify access)
create policy "staff_members_self_read" on public.staff_members
  for select using (auth.uid() = id);

-- All writes go through service-role only (Supabase dashboard / server scripts)
-- No client-side insert/update/delete policies → blocked by default

-- Owner can read ALL staff members
create policy "staff_members_owner_read" on public.staff_members
  for select using (
    exists (
      select 1 from public.staff_members m
      where m.id = auth.uid() and m.role = 'owner' and m.is_active = true
    )
  );

-- Owner can update any staff member (role, name, is_active)
create policy "staff_members_owner_update" on public.staff_members
  for update using (
    exists (
      select 1 from public.staff_members m
      where m.id = auth.uid() and m.role = 'owner' and m.is_active = true
    )
  );

-- RPC: add or restore a staff member by email (security definer to access auth.users)
create or replace function public.upsert_staff_by_email(
  p_email text,
  p_name  text,
  p_role  text
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
begin
  if not exists (
    select 1 from public.staff_members
    where id = auth.uid() and role = 'owner' and is_active = true
  ) then
    raise exception 'Unauthorized';
  end if;

  if p_role not in ('owner','admin','sales','finance','service','reports') then
    raise exception 'Invalid role: %', p_role;
  end if;

  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;

  if v_uid is null then
    raise exception 'No account found for %. They must sign up first.', p_email;
  end if;

  insert into public.staff_members (id, email, name, role, is_active)
  values (v_uid, p_email, p_name, p_role, true)
  on conflict (id) do update
    set email     = excluded.email,
        name      = excluded.name,
        role      = excluded.role,
        is_active = true;

  return json_build_object('ok', true, 'id', v_uid);
end;
$$;
