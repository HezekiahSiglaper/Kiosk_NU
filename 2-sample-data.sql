-- ============================================================================
-- 2-sample-data.sql
--
-- Registers all 10 real Northwest University campus displays, sample commands,
-- events, and the 6 staff kiosk owner accounts in Neon Postgres.
-- Run in Neon SQL Editor after 1-schema.sql. Safe to run more than once.
-- ============================================================================

-- Remove any legacy demo-* placeholder rows if present
delete from public.displays where id like 'demo-%';

-- 1. Register all 10 Northwest University campus kiosks
insert into public.displays
  (id, name, location, orientation, notes, public_url, approved_url,
   status, last_seen, current_page, software_version, power_state,
   device_info, owner_email, owner_name)
values
  ('nu-display',
   'Main NU Display',
   'Campus',
   'Portrait 1080×1920',
   'Full-screen hero display at the campus main entrance.',
   'https://nu-display.vercel.app',
   'https://nu-display.vercel.app',
   'online', now(), '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'studentlife@northwestu.edu', 'Sarah Jenkins'),

  ('pecota',
   'Pecota Student Center',
   'Pecota Student Center',
   'Portrait 1080×1920',
   'Digital signage inside the Pecota Student Center, near the SwoopShop.',
   'https://pecota.vercel.app',
   'https://pecota.vercel.app',
   'online', now(), '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'studentlife@northwestu.edu', 'Sarah Jenkins'),

  ('chapel-display',
   'Chapel Display',
   'Butterfield Chapel',
   'Portrait 1080×1920',
   'Chapel digital signage. Shows the Reach Church experience on Mondays and the regular chapel rotation on other days.',
   'https://chapel-ten.vercel.app',
   'https://chapel-ten.vercel.app',
   'online', now(), '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'chapel@northwestu.edu', 'Pastor Marcus Sterling'),

  ('feehall',
   'Fee Hall Display',
   'Fee Hall',
   'Portrait 1080×1920',
   'Digital signage in the Fee Hall lobby.',
   'https://display-web-feehall.vercel.app',
   'https://display-web-feehall.vercel.app',
   'online', now(), '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'business@northwestu.edu', 'Prof. David Chen'),

  ('hsc1',
   'HSC Display 1',
   'Health & Sciences Center',
   'Portrait 1080×1920',
   'First digital signage screen in the Health & Sciences Center.',
   'https://display-web-hsc1.vercel.app',
   'https://display-web-hsc1.vercel.app',
   'online', now(), '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'hsc@northwestu.edu', 'Dr. Elena Rostova'),

  ('hsc2',
   'HSC Display 2',
   'Health & Sciences Center',
   'Portrait 1080×1920',
   'Second digital signage screen in the Health & Sciences Center.',
   'https://display-web-hsc2.vercel.app',
   'https://display-web-hsc2.vercel.app',
   'online', now(), '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'hsc@northwestu.edu', 'Dr. Elena Rostova'),

  ('6710',
   '6710 PA Display',
   '6710 Building',
   'Portrait 1080×1920',
   'School of PA Medicine digital signage in the 6710 building.',
   'https://6710.vercel.app',
   'https://6710.vercel.app',
   'online', now(), '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'hsc@northwestu.edu', 'Dr. Elena Rostova'),

  ('barton-downstairs',
   'Barton Downstairs',
   'Barton Hall',
   'Upstairs (2nd floor)',
   'Main lobby. Wayfinding card with up arrow tells visitors to go up one floor.',
   'https://display-barton-downstairs.vercel.app',
   'https://display-barton-downstairs.vercel.app',
   'online', now(), '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'admissions@northwestu.edu', 'Jordan Miller'),

  ('barton-left-arrow',
   'Barton Left Arrow',
   'Barton Hall',
   'Left arrow',
   '2nd floor lobby. Points visitors to the Admissions Office on the left.',
   'https://display-barton-left-arrow.vercel.app',
   'https://display-barton-left-arrow.vercel.app',
   'online', now(), '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'admissions@northwestu.edu', 'Jordan Miller'),

  ('barton-right-arrow',
   'Barton Right Arrow',
   'Barton Hall',
   'Right arrow',
   '2nd floor lobby. Points visitors to the Admissions Office on the right.',
   'https://display-barton-right-arrow.vercel.app',
   'https://display-barton-right-arrow.vercel.app',
   'online', now(), '/', '1.0.0', 'on',
   '{"os": "Android", "browser": "Chrome", "screen_w": 1080, "screen_h": 1920}',
   'admissions@northwestu.edu', 'Jordan Miller')
on conflict (id) do update set
  name         = excluded.name,
  location     = excluded.location,
  orientation  = excluded.orientation,
  notes        = excluded.notes,
  approved_url = excluded.approved_url,
  public_url   = excluded.public_url,
  owner_email  = excluded.owner_email,
  owner_name   = excluded.owner_name;

-- 2. Sample commands targeting real NU displays
insert into public.display_commands (display_id, command, created_at, executed_at)
select 'nu-display', 'reload', now() - interval '30 minutes', now() - interval '29 minutes'
where not exists (select 1 from public.display_commands where display_id = 'nu-display');

insert into public.display_commands (display_id, command, created_at, executed_at)
select 'chapel-display', 'reload', now() - interval '15 minutes', now() - interval '14 minutes'
where not exists (select 1 from public.display_commands where display_id = 'chapel-display');

-- 3. Sample display events
insert into public.display_events (display_id, event_type, message, created_at)
select * from (values
  ('nu-display',     'heartbeat', 'Main NU Display healthy',       now() - interval '20 seconds'),
  ('chapel-display', 'heartbeat', 'Chapel Display healthy',        now() - interval '35 seconds'),
  ('pecota',         'heartbeat', 'Pecota Student Center healthy', now() - interval '45 seconds'),
  ('feehall',        'heartbeat', 'Fee Hall Display healthy',      now() - interval '1 minute')
) as v(display_id, event_type, message, created_at)
where not exists (select 1 from public.display_events where display_id in ('nu-display', 'chapel-display', 'pecota', 'feehall'));

-- 4. Seed Kiosk Owners across the 10 NU displays
insert into public.kiosk_owners (email, full_name, department, role, assigned_displays) values
  ('admin@northwestu.edu',       'Hannah Vance',           'Campus Communications & IT (Product Owner)', 'super_admin', array['nu-display','feehall','hsc1','hsc2','pecota','6710','barton-downstairs','barton-left-arrow','barton-right-arrow','chapel-display']),
  ('chapel@northwestu.edu',      'Pastor Marcus Sterling', 'Campus Ministries',                          'kiosk_owner', array['chapel-display']),
  ('studentlife@northwestu.edu', 'Sarah Jenkins',          'Student Life & SwoopShop',                   'kiosk_owner', array['pecota','nu-display']),
  ('hsc@northwestu.edu',         'Dr. Elena Rostova',      'Buntain College of Nursing & Health Sciences', 'kiosk_owner', array['hsc1','hsc2','6710']),
  ('admissions@northwestu.edu',  'Jordan Miller',          'Undergraduate Admissions',                   'kiosk_owner', array['barton-downstairs','barton-left-arrow','barton-right-arrow']),
  ('business@northwestu.edu',    'Prof. David Chen',       'College of Business',                        'kiosk_owner', array['feehall'])
on conflict (email) do update set
  full_name         = excluded.full_name,
  department        = excluded.department,
  role              = excluded.role,
  assigned_displays = excluded.assigned_displays,
  updated_at        = now();
