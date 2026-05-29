-- Allow staff members to read and manage all referral_earnings rows.
-- Without this, RLS blocks admin from seeing any commissions.

create policy "re_staff_read" on public.referral_earnings
  for select using (
    exists (select 1 from public.staff_members m where m.id = auth.uid() and m.is_active = true)
  );

create policy "re_staff_write" on public.referral_earnings
  for all using (
    exists (select 1 from public.staff_members m where m.id = auth.uid() and m.is_active = true)
  );
