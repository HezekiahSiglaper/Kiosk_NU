-- ============================================================================
-- 2-sample-data.sql
--
-- Sample screens, commands, events, kiosk owners, and sample portal slides
-- so the dashboard and Content Portal have data to show immediately.
-- Run in Neon SQL Editor after 1-schema.sql. Safe to run more than once.
-- ============================================================================

insert into public.displays
  (id, name, location, orientation, notes, public_url, approved_url,
   status, last_seen, current_page, software_version, power_state,
   device_info, owner_email, owner_name)
values
  ('demo-lobby', 'Demo Lobby Screen', 'Main lobby', 'Portrait 1080×1920',
   'Online and healthy.',
   'https://example.com/lobby', 'https://example.com',
   'online', now() - interval '20 seconds', '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'studentlife@northwestu.edu', 'Sarah Jenkins'),

  ('demo-hallway', 'Demo Hallway Screen', 'Second floor hallway', 'Portrait 1080×1920',
   'Online, touched a minute ago.',
   'https://example.com/hallway', 'https://example.com',
   'online', now() - interval '10 seconds', '/events', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'admissions@northwestu.edu', 'Jordan Miller'),

  ('demo-chapel', 'Demo Chapel Screen', 'Chapel entrance', 'Landscape 1920×1080',
   'Offline for two hours.',
   'https://example.com/chapel', 'https://example.com',
   'offline', now() - interval '2 hours', '/', '1.0.0', 'on', null,
   'chapel@northwestu.edu', 'Pastor Marcus Sterling'),

  ('demo-library', 'Demo Library Screen', 'Library', 'Portrait 1080×1920',
   'Turned off from the dashboard.',
   'https://example.com/library', 'https://example.com',
   'online', now() - interval '25 seconds', '/', '1.0.0', 'off',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'business@northwestu.edu', 'Prof. David Chen')
on conflict (id) do nothing;

update public.displays set last_touch = now() - interval '1 minute'
where id = 'demo-hallway';

-- One command already run by the screen, one still waiting.
insert into public.display_commands (display_id, command, created_at, executed_at)
select 'demo-lobby', 'reload', now() - interval '30 minutes', now() - interval '29 minutes'
where not exists (select 1 from public.display_commands where display_id = 'demo-lobby');

insert into public.display_commands (display_id, command, payload, created_at)
select 'demo-chapel', 'emergency_message', '{"message": "Building closed today"}', now() - interval '1 hour'
where not exists (select 1 from public.display_commands where display_id = 'demo-chapel');

insert into public.display_events (display_id, event_type, message, created_at)
select * from (values
  ('demo-lobby',   'heartbeat',      null,                      now() - interval '20 seconds'),
  ('demo-hallway', 'focus_lost',     'Visibility=true Focus=false', now() - interval '5 minutes'),
  ('demo-chapel',  'offline',        'No heartbeat for 2 hours',  now() - interval '1 hour 55 minutes'),
  ('demo-library', 'power_off',      'Turned off from the dashboard', now() - interval '3 hours')
) as v(display_id, event_type, message, created_at)
where not exists (select 1 from public.display_events where display_id like 'demo-%');

-- Seed Kiosk Owners
insert into public.kiosk_owners (email, full_name, department, role, assigned_displays) values
  ('admin@northwestu.edu',       'Hannah Vance',           'Campus Communications & IT', 'super_admin', array['demo-lobby','demo-hallway','demo-chapel','demo-library','nu-display','feehall','hsc1','hsc2','pecota','6710','barton-downstairs','barton-left-arrow','barton-right-arrow','chapel-display']),
  ('chapel@northwestu.edu',      'Pastor Marcus Sterling', 'Campus Ministries',          'kiosk_owner', array['demo-chapel','chapel-display']),
  ('studentlife@northwestu.edu', 'Sarah Jenkins',          'Student Life & SwoopShop',   'kiosk_owner', array['demo-lobby','pecota','nu-display']),
  ('hsc@northwestu.edu',         'Dr. Elena Rostova',      'Buntain College of Nursing', 'kiosk_owner', array['hsc1','hsc2','6710']),
  ('admissions@northwestu.edu',  'Jordan Miller',          'Undergraduate Admissions',   'kiosk_owner', array['demo-hallway','barton-downstairs','barton-left-arrow','barton-right-arrow']),
  ('business@northwestu.edu',    'Prof. David Chen',       'College of Business',        'kiosk_owner', array['demo-library','feehall'])
on conflict (email) do update set
  full_name         = excluded.full_name,
  department        = excluded.department,
  role              = excluded.role,
  assigned_displays = excluded.assigned_displays,
  updated_at        = now();
