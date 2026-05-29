-- Review moderation: add status + featured flag to reviews table.
-- Unmoderated reviews are status='pending' and hidden from public product pages.
-- Admin approves/rejects from the admin portal Reviews tab.

alter table public.reviews
  add column if not exists status      text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists is_featured boolean not null default false,
  add column if not exists admin_note  text;

-- Back-fill existing reviews as approved so nothing disappears on deploy
update public.reviews set status = 'approved' where status = 'pending';

create index if not exists reviews_status_idx    on public.reviews(status);
create index if not exists reviews_featured_idx  on public.reviews(is_featured) where is_featured = true;
