# NU Display Admin & Kiosk Content Portal

A web portal and operations center for **Northwest University** campus digital signage across all 10 campus kiosks. Staff members can sign in to publish posters, build layout-protected slides with QR codes, and schedule Go-Live / Take-Down dates at `/portal`, while IT administrators can monitor screens and queue remote commands at `/admin/displays`.

---

## Stack

- **Vite 5** + **React 18** + **TypeScript** (`strict`)
- **Tailwind CSS 3** with custom Northwest University color tokens
- **Neon Postgres** (primary backend over HTTPS port `443` via `api/portal.js` & `vite.config.ts` dev middleware)
- **Supabase** (`@supabase/supabase-js`) optional Realtime backend + **`localStorage` fallback**
- **React Router 6** (`/login`, `/portal`, `/admin/content`, `/admin/displays`)

---

## Key Features

### 1. Staff Login & Per-Kiosk Ownership (`/login`)
- Email and password sign-in ([`src/pages/LoginPage.tsx`](src/pages/LoginPage.tsx)) backed by [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx) and [`src/services/auth.ts`](src/services/auth.ts).
- **2-tier role model**:
  - `super_admin` — Full control across all 10 campus kiosks and access to reassign kiosk ownership.
  - `kiosk_owner` — Direct publishing rights to their assigned kiosks; slides targeting another department's kiosk automatically enter the `pending_review` approval queue.
- **Kiosk Owners Directory & Assignment Modal** ([`src/components/KioskOwnersModal.tsx`](src/components/KioskOwnersModal.tsx)) for viewing and reassigning kiosk ownership.

### 2. Kiosk Content Portal (`/portal`)
- **4 Layout-Protected Campus Templates** ([`src/pages/ContentPortalPage.tsx`](src/pages/ContentPortalPage.tsx)):
  - *Chapel & Ministry Gathering* (`midnight`)
  - *Student Club / Campus Event* (`sky`)
  - *Eagle Athletics Game Day* (`navy-gold`)
  - *Faculty / Department Notice* (`evergreen`)
- **Brand & Layout Guardrails** ([`src/components/KioskSlidePreview.tsx`](src/components/KioskSlidePreview.tsx)): Locked header/footer chrome, locked Northwest University color themes, enforced character caps (`maxLength` on titles, subtitles, body copy, and event fields), and automatic single-path SVG QR code generation from the call-to-action URL.
- **Built-In Image Upload Checks** (`validateAndUploadMedia` in [`src/services/content.ts`](src/services/content.ts)):
  - Verifies supported formats (`PNG`, `JPG`, `WebP`, `GIF`, `SVG`) and enforces a **10 MB** max file size.
  - Inspects pixel dimensions and checks alignment against the **`9:16` vertical kiosk aspect ratio** (`1080×1920` recommended) before previewing or saving.
- **Publishing Schedule & Moderation**:
  - **Go-Live Date (`start_date`)** and **Take-Down Date (`end_date`)** controls plus per-slide rotation duration (`10s`, `15s`, `20s`, `30s`).
  - Automatic schedule state evaluation (`active`, `scheduled`, `expired`) and approval actions for `pending_review` slides.
- **Live Kiosk Playlist Simulator** ([`src/components/KioskPlaylistModal.tsx`](src/components/KioskPlaylistModal.tsx)): Interactive full-rotation preview filtered by any campus kiosk or all screens.

### 3. Campus Displays Operations Center (`/admin/displays`)
- Real-time monitoring cards ([`src/pages/DisplaysPage.tsx`](src/pages/DisplaysPage.tsx), [`src/components/DisplayCard.tsx`](src/components/DisplayCard.tsx)) showing display status (`online`, `offline`, `checking`), physical screen snapshots ([`src/components/ScreenshotPanel.tsx`](src/components/ScreenshotPanel.tsx)), security status alerts ([`src/components/SecurityEventsPanel.tsx`](src/components/SecurityEventsPanel.tsx)), recent events, and command history.
- Remote display command buttons (`reload`, `go_home`, `blackout`, `clear_blackout`, `emergency_message`, `clear_emergency`).

---

## Run Locally

```bash
npm install
npm run dev          # http://localhost:5173 (redirects / -> /portal or /login)
npm run build        # runs tsc -b && vite build -> dist/
```

If neither Neon (`DATABASE_URL`) nor Supabase (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) is configured, the Content Portal persists slides and demo staff rosters in `localStorage` and the Displays view runs in **Local mode** (client-side HEAD probe fallback).

---

## Configure Neon Postgres (Primary Backend)

This project connects to Neon over **HTTPS (`https://<host>/sql`, port `443`)** with zero extra database driver packages, so it works on campus networks where PostgreSQL port `5432` is blocked.

1. Create a Neon project and copy your pooled connection string.
2. Create a `.env` file in the project root (already ignored by `.gitignore`):
   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require
   ```
3. In the **Neon SQL Editor**, run the two setup scripts in order:
   - `1-schema.sql` — creates all 5 tables (`displays`, `display_commands`, `display_events`, `kiosk_content`, `kiosk_owners`), indexes, and `touch_updated_at()` trigger.
   - `2-sample-data.sql` — seeds sample displays, commands, events, and the 6 Northwest University staff accounts.
4. Start or restart the dev server (`npm run dev`). Vite loads `DATABASE_URL` in `vite.config.ts`, exposes `import.meta.env.VITE_NEON_CONFIGURED`, and mounts `/api/portal` and `/api/command` using `api/portal.js`.

### Optional: Supabase Configuration
You can also connect to Supabase by setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` and running the migrations in `supabase/migrations/` (`001_init.sql` through `014_auth_and_kiosk_owners.sql`). When `VITE_NEON_CONFIGURED` is active, services query `/api/portal` first and fall back to Supabase or `localStorage`.

---

## Demo Staff Accounts

Defined in `src/types/auth.ts` (`DEFAULT_KIOSK_OWNERS`) and seeded in `2-sample-data.sql` / `supabase/migrations/014_auth_and_kiosk_owners.sql` (also selectable directly on `/login` for testing):

| Name | Email | Role | Assigned Kiosks | Demo Password |
|------|-------|------|-----------------|---------------|
| Hannah Vance | `admin@northwestu.edu` | `super_admin` | All 10 Campus Kiosks | `EagleAdmin2026!` |
| Pastor Marcus Sterling | `chapel@northwestu.edu` | `kiosk_owner` | `chapel-display` | `Chapel2026!` |
| Sarah Jenkins | `studentlife@northwestu.edu` | `kiosk_owner` | `pecota`, `nu-display` | `Pecota2026!` |
| Dr. Elena Rostova | `hsc@northwestu.edu` | `kiosk_owner` | `hsc1`, `hsc2`, `6710` | `Nursing2026!` |
| Jordan Miller | `admissions@northwestu.edu` | `kiosk_owner` | `barton-downstairs`, `barton-left-arrow`, `barton-right-arrow` | `Barton2026!` |
| Prof. David Chen | `business@northwestu.edu` | `kiosk_owner` | `feehall` | `FeeHall2026!` |

---

## Architecture

```
1-schema.sql                 — Neon Postgres schema (5 tables + indexes + trigger)
2-sample-data.sql            — Neon seed data (sample screens, commands, events, owners)
vite.config.ts               — Vite 5 config + /api/portal & /api/command dev middleware
api/
  portal.js                  — Serverless & dev handler (`handlePortalAction` via Neon HTTPS SQL API)
  portal.d.ts                — TypeScript declaration for api/portal.js
  command.js                 — Legacy Vercel command route
supabase/migrations/         — SQL migrations 001_init.sql through 014_auth_and_kiosk_owners.sql
src/
  App.tsx                    — Routes (/login, /portal, /admin/content, /admin/displays)
  context/
    AuthContext.tsx          — AuthProvider, session state, per-kiosk ownership checks
  pages/
    LoginPage.tsx            — Staff login & demo account selector
    ContentPortalPage.tsx    — Kiosk Content Portal (templates, uploader, schedule, moderation)
    DisplaysPage.tsx         — Campus Screens operations dashboard
  components/
    Shell.tsx                — Header nav, active user pill, sign-out
    KioskSlidePreview.tsx    — Protected 9:16 slide preview + single-path SVG QR code
    KioskPlaylistModal.tsx   — Multi-kiosk live playlist rotation simulator
    KioskOwnersModal.tsx     — Kiosk owners directory & ownership reassignment
    DisplayCard.tsx          — Display card, health metadata, remote commands
    ScreenshotPanel.tsx      — Live display snapshot viewer
    PowerManagement.tsx      — Screen power controls
    SecurityAlert.tsx        — Critical security alert banner
    SecurityBadge.tsx        — Security status badge
    SecurityEventsPanel.tsx  — Security audit event list
    CommandStatus.tsx        — Queued/executed command feedback
    DevControls.tsx          — Dev testing controls
    StatusBadge.tsx          — Online/offline/checking pill
    Button.tsx               — Shared button variants
    NuMark.tsx               — Northwest University crest/monogram
    icons.tsx                — Inline SVG icon set
  services/
    neon.ts                  — `isNeonConfigured()` & `callPortalApi()` helper for `/api/portal`
    content.ts               — Content CRUD, `validateAndUploadMedia()`, `getScheduleState()`
    auth.ts                  — Owner roster CRUD, email/password sign-in, session storage
    displays.ts              — `fetchDisplays()`, `writeHeartbeat()`
    commands.ts              — `fetchRecentCommands()`, `sendCommand()`
    events.ts                — `fetchRecentEvents()`, `logEvent()`
    alerts.ts                — Security event/alert queries
    heartbeat.ts             — Display heartbeat helpers
    supabase.ts              — Optional Supabase client + `isSupabaseConfigured()`
  hooks/
    useKioskContent.ts       — Content slides state & Neon/Supabase/local sync
    useDisplayStatus.ts      — Display polling (Neon/probe) & Supabase Realtime
    useDisplayCommands.ts    — Command history polling & Realtime
    useDisplayEvents.ts      — Event log polling & Realtime
    useDisplayHeartbeat.ts   — Display heartbeat hook
    useDisplayHeartbeatSimulator.ts — Local heartbeat simulator
    useSecurityEvents.ts     — Security events hook
  types/
    auth.ts                  — `UserRole`, `KioskOwnerProfile`, `DEFAULT_KIOSK_OWNERS`
    content.ts               — `KioskContentItem`, `DEFAULT_CAMPUS_DISPLAYS`, `INITIAL_SEED_CONTENT`
    display.ts               — `Display`, `EMPTY_ROSTER`
    command.ts               — `DisplayCommand`, `CommandType`
    event.ts                 — `DisplayEvent`, `EventType`
```

---

## Deploy to Vercel

1. Connect the repository to Vercel and add your environment variable:
   ```bash
   vercel env add DATABASE_URL
   ```
2. `vercel.json`, `serve.json`, and [`api/portal.js`](api/portal.js) are already configured so both React Router SPA routes and `POST /api/portal` serverless functions work in production.

---

## Phase 3 Plan

See `PHASE_3.md` for kiosk display client specifications.
