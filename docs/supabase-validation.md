# Supabase Validation Checklist

Current local state:

- `.env.local` is now in Supabase mode.
- `VITE_SUPABASE_URL` is set to the project URL shape, not the REST `/rest/v1` endpoint.
- `VITE_SUPABASE_ANON_KEY` is set locally.
- Supabase CLI is not installed on this machine.
- The foundation SQL migration has been applied manually through the Supabase SQL editor.
- First admin login and patient creation have been validated by the user.
- Static checks passed for the current migration/repository shape.
- Current route state: `/` is the authenticated Supabase-backed v2 shell, `/v2/app` redirects to `/`, and `/v2` remains the local design preview.

## Preflight Already Checked

- `npx vitest run` passes: 5 files, 67 tests.
- `npm run build` passes in normal local mode.
- `npm run build` passes with real local Supabase env values.
- Remote anon connectivity reaches the project and the user has confirmed the app can create patients after the profile/RLS setup was corrected.
- Main migration includes the expected core tables: `profiles`, `patients`, `patient_shares`, `notes`, `schedules`, `medications`, `lab_results`, `lab_items`, `templates`, `lab_categories`, `user_settings`, and `backup_snapshots`.
- Main migration enables RLS on core tables and includes the first-user admin trigger.
- Repository column selects for the core patient/briefing/write paths match the migration columns.

## Required Supabase Project Setup

1. Create or open the Supabase project.
2. Run `supabase/migrations/202605220001_wardflow_v2_foundation.sql`.
3. Add local env values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DATA_BACKEND=supabase
```

4. For fastest local validation, either disable email confirmation during testing or confirm the first auth user in Supabase before login.
5. Start the app and verify the console does not show missing-env fallback warnings.

Local status: steps 2 and 3 are complete for the current project.

Auth note: the app maps a username such as `admin` to `admin@wardflow.example.com` for Supabase Auth. If Supabase email confirmation is enabled, repeated test signups can hit "email rate limit exceeded". For local validation, turn off email confirmation temporarily or create/confirm the user from the Supabase Dashboard.

If a user was created before the migration was applied, delete that Auth user or create the matching `profiles` row after running the migration. The first-user admin trigger only runs when a new `auth.users` row is inserted.

Migration note: the foundation SQL is intended to be re-runnable during setup. Tables and indexes use `if not exists`, and setup triggers/policies are dropped before being recreated so a partially failed SQL Editor run can be retried.

Auth cache note: Supabase mode uses a separate persisted auth key from Dexie mode so an old local IndexedDB login cannot be treated as an authenticated Supabase session. After switching backend modes, refresh the browser and log in again.

## First Real E2E Pass

1. Register the first account.
2. Confirm it becomes `admin` and `approved`.
3. Log in with that account.
4. Open `/v2/app`.
5. Add a patient with full birth date, no C/C.
6. Confirm the patient appears in the rail and Today counts update.
7. Save charting with C/C and optional onset date.
8. Confirm detailed age and onset elapsed labels display correctly.
9. Add a reminder note for today.
10. Add a progress note.
11. Add a manual Lab row with one abnormal item.
12. Add an antibiotic.
13. Add a schedule for today.
14. Confirm Today queue shows reminder, abnormal Lab, antibiotic, and schedule without requiring a completion state.
15. Delete one note, one schedule, one antibiotic, and one Lab row.
16. Confirm optimistic UI updates and follow-up briefing refresh do not duplicate rows.
17. Edit patient identity and room.
18. Confirm rail, Today, workspace, and context rows reflect the updated name/room.
19. Discharge the patient.
20. Confirm the patient leaves active queues and appears in the collapsed discharged section.
21. Reopen the app or refresh the browser.
22. Confirm data persists from Supabase.
23. Edit the patient again and use the patient-delete action from the edit panel.
24. Confirm the hidden patient disappears from the active list and Today queues, then refresh and confirm it stays hidden.
25. Confirm the UI describes the action as a soft archive/list hide, not a permanent data purge.

## Admin And Safety Pass

1. Register a second user.
2. Confirm the second user starts as `pending`.
3. Approve the user from the admin account.
4. Confirm approved login works.
5. Confirm rejected/pending users cannot use the app.
6. Open Settings in Supabase mode.
7. Create a snapshot backup.
8. Preview the snapshot and confirm record counts match.
9. Confirm destructive restore is still blocked/not exposed.
10. Confirm `npm run types:supabase` is only run from a machine with Supabase CLI installed and linked to the intended project.

## Current Priority For Next Session

1. Repeat the first real E2E pass on the deployed build, not only local dev.
2. Spend extra time in Settings: admin approval, member management, charting settings persistence, Lab categories, AI settings, and Supabase snapshot preview.
3. Verify icon-only controls have usable hover tooltips in desktop and do not block touch usage on mobile.
4. Watch for any save/delete that feels slow enough to need a more explicit pending state.
5. Keep an eye on patient-list and Today queue duplication after rapid clinical writes.

## Stop Conditions

- Any RLS error on a normal approved-admin flow.
- Any missing-column or relationship error from Supabase.
- Any white screen on `/v2/app`.
- Any save that clears the user draft before the server write succeeds.
- Any patient-list or Today queue duplicate after a save/delete.
