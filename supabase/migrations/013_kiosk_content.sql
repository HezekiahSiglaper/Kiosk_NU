-- ============================================================================
-- 013_kiosk_content.sql — Non-technical Kiosk Content Portal schema
--
-- Creates `public.kiosk_content` for announcements, posters/flyers, events,
-- and media slides targeted at specific campus kiosks or ['all'], with
-- start/end scheduling and Draft / Pending Review / Published workflow.
-- ============================================================================

create table if not exists public.kiosk_content (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  subtitle          text,
  body              text,
  content_type      text not null default 'announcement'
                    check (content_type in ('announcement', 'poster', 'event', 'media')),
  theme             text not null default 'midnight'
                    check (theme in ('midnight', 'navy-gold', 'evergreen', 'sky')),
  media_url         text,
  event_date        text,
  event_time        text,
  event_location    text,
  cta_label         text,
  cta_url           text,
  target_displays   text[] not null default array['all']::text[],
  start_date        text,
  end_date          text,
  duration_seconds  integer not null default 12 check (duration_seconds between 5 and 120),
  status            text not null default 'published'
                    check (status in ('draft', 'pending_review', 'published', 'archived')),
  author_name       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_kiosk_content_status on public.kiosk_content(status);
create index if not exists idx_kiosk_content_created on public.kiosk_content(created_at desc);

alter table public.kiosk_content enable row level security;

drop policy if exists "kiosk_content_select_all" on public.kiosk_content;
create policy "kiosk_content_select_all"
  on public.kiosk_content for select
  to anon, authenticated
  using (true);

drop policy if exists "kiosk_content_insert_all" on public.kiosk_content;
create policy "kiosk_content_insert_all"
  on public.kiosk_content for insert
  to anon, authenticated
  with check (true);

drop policy if exists "kiosk_content_update_all" on public.kiosk_content;
create policy "kiosk_content_update_all"
  on public.kiosk_content for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "kiosk_content_delete_all" on public.kiosk_content;
create policy "kiosk_content_delete_all"
  on public.kiosk_content for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on public.kiosk_content to anon, authenticated;

-- Enable Supabase Realtime on kiosk_content
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kiosk_content'
  ) then
    alter publication supabase_realtime add table public.kiosk_content;
  end if;
end $$;

-- Storage bucket for uploaded posters / flyers
insert into storage.buckets (id, name, public)
values ('kiosk-media', 'kiosk-media', true)
on conflict (id) do nothing;

drop policy if exists "kiosk_media_read" on storage.objects;
create policy "kiosk_media_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'kiosk-media');

drop policy if exists "kiosk_media_write" on storage.objects;
create policy "kiosk_media_write"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'kiosk-media');

