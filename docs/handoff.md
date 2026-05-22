# WardFlow Rebuild Handoff

Last updated: 2026-05-22

## Current Git State

- Branch: `main`
- Latest commit pushed to GitHub: `3326058 feat: scaffold supabase backend and v2 preview`
- Remote: `https://github.com/Rehab0x/WardFlow.git`
- Local verification before push:
  - `npm.cmd run type-check` passed
  - `npm.cmd run build` passed
  - `npm.cmd run lint` does not pass yet because of pre-existing legacy lint issues

## What Was Added

- Supabase migration foundation:
  - `supabase/migrations/202605220001_wardflow_v2_foundation.sql`
  - Core tables: `profiles`, `patients`, `patient_shares`, `notes`, `schedules`, `medications`, `lab_results`, `lab_items`, `templates`, `lab_categories`, `user_settings`, `backup_snapshots`, legacy `backups`, `audit_logs`
  - RLS policies and helper functions are included
  - First registered user becomes `admin` and `approved`; later users become pending doctors
- Supabase client and backend switch:
  - `.env.example`
  - `src/config/backend.ts`
  - `src/lib/supabase.ts`
  - `src/services/supabaseClient.ts`
- Typed domain/data layer:
  - `src/domain/*`
  - `src/mappers/*`
  - `src/data/*`
  - `src/types/supabase.ts`
- Existing stores now support both modes:
  - Default: IndexedDB/Dexie
  - Supabase: set `VITE_DATA_BACKEND=supabase`
- New design preview route:
  - `/v2`
  - Components live under `src/components/v2`
  - Preview page: `src/pages/v2/V2PreviewPage.tsx`
- Build config:
  - Vite dev server no longer auto-opens the browser
  - PWA is disabled by default unless `VITE_ENABLE_PWA=true`

## Start On A New Machine

```bash
git clone https://github.com/Rehab0x/WardFlow.git
cd WardFlow
npm install
cp .env.example .env.local
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Set `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DATA_BACKEND=supabase
VITE_ENABLE_PWA=false
```

Then verify:

```bash
npm run type-check
npm run build
npm run dev
```

Open:

- Main app: `http://localhost:3000`
- v2 design preview: `http://localhost:3000/v2`

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/202605220001_wardflow_v2_foundation.sql` in the Supabase SQL editor or through the Supabase CLI.
3. Add the deployed app origin to Supabase Auth URL settings if needed.
4. Create the first account from the app. That account should become the approved admin automatically.
5. Additional accounts will be pending until approved in `profiles`.

## Deployment Notes

For Vercel or another static host, set these environment variables:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_DATA_BACKEND=supabase
VITE_ENABLE_PWA=false
```

If `VITE_DATA_BACKEND` is missing, the app stays in the old IndexedDB mode.

## Known Risks / Remaining Work

- This is not a full rewrite yet. It is a bridge layer that keeps the existing app working while adding a Supabase backend option.
- Auth flow is minimally adapted. Username login in Supabase mode maps non-email usernames to `username@wardflow.local`.
- PIN lock is disabled in Supabase mode because the old PIN credential model lived in IndexedDB.
- Lint still needs a legacy cleanup pass.
- The `/v2` route is a design preview, not the final rebuilt app shell.
- Migration from old Dexie data to Supabase is not implemented yet.
- Supabase-generated TypeScript types should eventually replace the hand-written `src/types/supabase.ts`.

## Recommended Next Steps

1. Confirm the deployed build with `VITE_DATA_BACKEND=supabase`.
2. Run the migration in Supabase and create the first admin account.
3. Test patient CRUD, notes, schedules, medications, lab import, and today briefing in Supabase mode.
4. Decide which legacy screens to replace first with the v2 layout.
5. Add Dexie-to-Supabase migration/export flow before clinical use.
6. Clean up legacy mojibake text and lint warnings.

## Useful Files

- Rebuild plan: `docs/rebuild-plan.md`
- Supabase schema plan: `docs/supabase-schema-plan.md`
- Design plan: `docs/design-plan.md`
- Handoff: `docs/handoff.md`
