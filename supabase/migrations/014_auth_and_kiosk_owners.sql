-- ============================================================================
-- 014_auth_and_kiosk_owners.sql — Kiosk Owner Authentication & Permissions
--
-- Creates `public.kiosk_owners` mapping staff email accounts to their role
-- ('super_admin' or 'kiosk_owner') and the array of kiosk IDs they own.
-- Also adds `owner_email` and `owner_name` to `public.displays`.
-- ============================================================================

create table if not exists public.kiosk_owners (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  email             text unique not null,
  full_name         text not null,
  department        text not null default 'Campus Staff',
  role              text not null default 'kiosk_owner'
                    check (role in ('super_admin', 'kiosk_owner')),
  assigned_displays text[] not null default '{}'::text[],
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.displays
  add column if not exists owner_email text,
  add column if not exists owner_name text;

alter table public.kiosk_owners enable row level security;

drop policy if exists "kiosk_owners_select_all" on public.kiosk_owners;
create policy "kiosk_owners_select_all"
  on public.kiosk_owners for select
  to anon, authenticated
  using (true);

drop policy if exists "kiosk_owners_write_auth" on public.kiosk_owners;
create policy "kiosk_owners_write_auth"
  on public.kiosk_owners for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.kiosk_owners to anon, authenticated;

-- Seed initial Northwest University Kiosk Owners across the 10 campus kiosks
insert into public.kiosk_owners (email, full_name, department, role, assigned_displays) values
  ('admin@northwestu.edu',
   'Hannah Vance',
   'Campus Communications & IT (Product Owner)',
   'super_admin',
   array['nu-display','feehall','hsc1','hsc2','pecota','6710','barton-downstairs','barton-left-arrow','barton-right-arrow','chapel-display']),

  ('chapel@northwestu.edu',
   'Pastor Marcus Sterling',
   'Campus Ministries',
   'kiosk_owner',
   array['chapel-display']),

  ('studentlife@northwestu.edu',
   'Sarah Jenkins',
   'Student Life & SwoopShop',
   'kiosk_owner',
   array['pecota','nu-display']),

  ('hsc@northwestu.edu',
   'Dr. Elena Rostova',
   'Buntain College of Nursing & Health Sciences',
   'kiosk_owner',
   array['hsc1','hsc2','6710']),

  ('admissions@northwestu.edu',
   'Jordan Miller',
   'Undergraduate Admissions',
   'kiosk_owner',
   array['barton-downstairs','barton-left-arrow','barton-right-arrow']),

  ('business@northwestu.edu',
   'Prof. David Chen',
   'College of Business',
   'kiosk_owner',
   array['feehall'])
on conflict (email) do update set
  full_name         = excluded.full_name,
  department        = excluded.department,
  role              = excluded.role,
  assigned_displays = excluded.assigned_displays,
  updated_at        = now();

-- Backfill owner_email and owner_name on public.displays
update public.displays set owner_email = 'studentlife@northwestu.edu', owner_name = 'Sarah Jenkins' where id in ('pecota', 'nu-display');
update public.displays set owner_email = 'chapel@northwestu.edu',      owner_name = 'Pastor Marcus Sterling' where id = 'chapel-display';
update public.displays set owner_email = 'hsc@northwestu.edu',         owner_name = 'Dr. Elena Rostova' where id in ('hsc1', 'hsc2', '6710');
update public.displays set owner_email = 'admissions@northwestu.edu',  owner_name = 'Jordan Miller' where id in ('barton-downstairs', 'barton-left-arrow', 'barton-right-arrow');
update public.displays set owner_email = 'business@northwestu.edu',    owner_name = 'Prof. David Chen' where id = 'feehall';

