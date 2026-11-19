-- ============================================================================
-- 1-schema.sql (Neon Schema for NU Display Admin + Kiosk Content Portal)
--
-- Creates all 5 tables in one file:
--   1. public.displays         (campus screens & heartbeat status)
--   2. public.display_commands (remote commands queue)
--   3. public.display_events   (audit & activity log)
--   4. public.kiosk_content    (uploaded posters, templates & schedules)
--   5. public.kiosk_owners     (staff login roles & per-kiosk ownership)
--
-- Safe to run more than once in the Neon SQL Editor.
-- ============================================================================

-- 1. One row per campus screen.
create table if not exists public.displays (
  id                    text primary key,
  name                  text not null,
  location              text not null,
  orientation           text,
  notes                 text,
  public_url            text not null default '',
  current_page          text,
  current_url           text,
  status                text not null default 'offline'
                          check (status in ('online', 'offline', 'checking')),
  last_seen             timestamptz,
  last_touch            timestamptz,
  response_time         integer,
  screenshot_url        text,
  screenshot_updated_at timestamptz,
  software_version      text,
  is_blackout           boolean not null default false,
  emergency_message     text,
  approved_url          text not null default '',
  is_secure             boolean not null default true,
  security_status       text not null default 'secure'
                          check (security_status in ('secure', 'warning', 'critical')),
  security_message      text,
  is_visible            boolean,
  has_focus             boolean,
  power_state           text check (power_state in ('on', 'off')),
  power_changed_at      timestamptz,
  device_info           jsonb,
  kiosk_id              text,
  last_kiosk_id         text,
  last_origin           text,
  owner_email           text,
  owner_name            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_displays_touch on public.displays;
create trigger trg_displays_touch
before update on public.displays
for each row execute function public.touch_updated_at();

create index if not exists displays_status_idx on public.displays (status);
create index if not exists displays_last_seen_idx on public.displays (last_seen desc);
create index if not exists displays_screenshot_updated_at_idx
  on public.displays (screenshot_updated_at desc);
create index if not exists displays_power_state_idx on public.displays (power_state);
create index if not exists displays_security_status_idx
  on public.displays (security_status) where security_status <> 'secure';

-- 2. Commands from the dashboard to a screen (reload, blackout, ...).
create table if not exists public.display_commands (
  id           uuid primary key default gen_random_uuid(),
  display_id   text not null references public.displays(id) on delete cascade,
  command      text not null check (command in (
                 'reload', 'go_home', 'blackout', 'emergency_message',
                 'clear_blackout', 'clear_emergency', 'power_off', 'power_on'
               )),
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  executed_at  timestamptz
);

create index if not exists display_commands_display_idx
  on public.display_commands (display_id, created_at desc);
create index if not exists display_commands_pending_idx
  on public.display_commands (display_id) where executed_at is null;

-- 3. Append-only log (heartbeats, security warnings, power changes, ...).
create table if not exists public.display_events (
  id          uuid primary key default gen_random_uuid(),
  display_id  text references public.displays(id) on delete set null,
  event_type  text not null,
  message     text,
  created_at  timestamptz not null default now()
);

create index if not exists display_events_recent_idx
  on public.display_events (created_at desc);
create index if not exists display_events_display_idx
  on public.display_events (display_id, created_at desc);

-- 4. Kiosk Content Portal slides (uploaded posters, templates, schedules).
create table if not exists public.kiosk_content (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  subtitle          text,
  body              text,
  content_type      text not null default 'poster'
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
  duration_seconds  integer not null default 15 check (duration_seconds between 5 and 120),
  status            text not null default 'published'
                    check (status in ('draft', 'pending_review', 'published', 'archived')),
  author_name       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_kiosk_content_status on public.kiosk_content(status);
create index if not exists idx_kiosk_content_created on public.kiosk_content(created_at desc);

-- 5. Kiosk Owners & Staff Permissions.
create table if not exists public.kiosk_owners (
  id                uuid primary key default gen_random_uuid(),
  email             text unique not null,
  full_name         text not null,
  department        text not null default 'Campus Staff',
  role              text not null default 'kiosk_owner'
                    check (role in ('super_admin', 'kiosk_owner')),
  assigned_displays text[] not null default '{}'::text[],
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
