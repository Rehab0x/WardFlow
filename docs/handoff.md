# WardFlow Rebuild Handoff

Last updated: 2026-05-25

## Current Git State

- Branch: `main`
- Latest session commit: `Harden settings and Supabase safety flows`
- Remote: `https://github.com/Rehab0x/WardFlow.git`
- Local verification before push:
  - `npm.cmd run type-check` passed on 2026-05-25
  - `npm.cmd run build` passed on 2026-05-25
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

- Main route `/` now runs the Supabase-backed v2 shell when `VITE_DATA_BACKEND=supabase` and Supabase env vars are present. `/v2/app` redirects to `/`; `/v2` remains the design preview.
- This is still a staged rewrite. The v2 shell is now usable against Supabase, while some legacy routes and fallback services remain in the repository.
- Auth flow is minimally adapted. Username login in Supabase mode maps non-email usernames to `username@wardflow.example.com`.
- PIN lock is disabled in Supabase mode because the old PIN credential model lived in IndexedDB.
- Lint still needs a legacy cleanup pass.
- The `/v2` route is still a design preview, but it now has stateful patient selection, charting drafts, notes, schedules, interaction saves, patient add/discharge/restore, mobile patient drawer behavior, and localStorage preview persistence.
- v2 preview manually added Lab, antibiotics, notes, and today schedules can now be removed individually without resetting the full preview state.
- v2 preview patient headers now support basic patient info editing; briefing rows are normalized from the current patient list so name/room changes propagate through Today, Overview, Lab, medication, notes, and schedule displays.
- v2 Today queue now supports priority/room sorting, a next-patient open action, mobile search, and body scroll locking while the mobile patient drawer is open.
- v2 patient workspace now shows a persistent unsaved-tab bar, and Lab/antibiotic/schedule draft rows have explicit clear actions so partial input can be discarded without changing tabs or resetting the full preview.
- v2 Overview now includes an "인계 요약 복사" bar that combines patient identity, C/C, problems, PI, plan, reminders, schedules, antibiotics, Lab, notes, and saved review counts into a single clipboard-ready summary.
- v2 Today now surfaces a compact preview-change summary and skips redundant localStorage writes when the persisted preview payload has not changed.
- Supabase briefing and Lab import patient reads now use active-patient scoped repository calls. IndexedDB briefing also avoids per-patient schedule loops and scopes medication reads to active patient IDs before antibiotic filtering.
- v2 preview patient add/edit now captures full birth date instead of birth year only. Patient headers show detailed age, and charting onset can be left blank/free-text or entered as a date to display calendar-style elapsed onset such as "onset 후 1년 2개월 3일째" beside C/C and in handoff copy.
- v2 age/onset labels are centralized in `src/components/v2/clinical/dateLabels.ts`; mobile patient banner uses detailed age, while the patient rail keeps compact age with detailed age in the accessible/title text.
- v2 Overview and right-side context rows now deep-link into their target workspace tabs without extra data reads; Today search results also show compact sex/age and attention state.
- v2 preview patient add/edit now trims submitted patient identifiers, blocks occupied admitted rooms, shows a compact validation summary, supports Ctrl/Cmd+Enter submit, and uses edit-aware close labels.
- v2 patient rail keeps discharged patients collapsed by default, while automatically expanding them during search/filter or when a discharged patient is selected.
- v2 new-patient creation now asks about unsaved workspace changes only when the user actually submits and moves to the new charting tab; cancelling the add panel preserves the existing dirty workspace.
- v2 patient rail filters, discharged toggle, mobile bottom nav, and mobile search now expose pressed/expanded state for assistive tech.
- v2 date/time helpers now share the same input formatter/parser across preview and workspace code; manual Lab dates, antibiotic start dates, and today schedule times are normalized before preview state is stored.
- v2 preview persistence now prunes empty per-patient interaction state and skips immediately re-saving the default state after a reset, so "초기화" actually clears localStorage until the next meaningful preview change.
- v2 patient rail and Today now mark patients with unsynced preview changes, and Today includes a "변경 환자" section that opens the affected patient directly.
- v2 Today changed-patient rows now show the changed domains per patient, and the preview action bar can copy a compact text export of the current preview changes.
- v2 Today, top bar, mobile shell, and patient rail labels were normalized to clean Korean text, including search placeholders, mobile nav, task filters, and patient-row accessibility labels.
- v2 patient workspace header, workspace tabs, and copy bar labels were normalized; patient add/edit now previews the detailed age immediately from the birth date input.
- v2 Lab/medication/schedule review queues now use clearer per-action save labels, amber pending-row selection, and explicit input accessibility labels for quick entry forms.
- v2 shared clinical rows and quick-entry forms were tightened for narrow widths, preserving detail text while making Lab, antibiotic, and note entry controls wrap more predictably on mobile.
- v2 quick-entry keyboard handling now ignores Enter while Korean IME composition is active, charting fields have explicit labels, and schedule times normalize compact input such as `1400` to `14:00`.
- v2 preview persistence now skips the initial hydration rewrite, normalizes saved review/completed arrays before localStorage writes, validates restored patient/tab references, and includes discharged patients in changed-patient summaries.
- v2 preview quick-add data now uses stronger generated IDs and blocks duplicate manual notes, Lab rows, antibiotics, and today schedules both in the workspace UI and preview state handlers.
- Supabase client creation now tolerates missing env vars in local preview by falling back to Dexie mode, and Supabase repositories use explicit column selects for patients, profiles, notes, schedules, medications, Labs, and backup summaries to keep transferred payloads predictable as tables grow.
- There is no existing clinical dataset to migrate in this rebuild, so the current v2 direction is clean Supabase-first data creation rather than a Dexie-to-Supabase transfer flow.
- Supabase-first support now includes repositories for templates, Lab display categories, and user settings. Existing template and Lab category services switch to Supabase in Supabase backend mode while preserving Dexie behavior for the legacy mode.
- A protected `/v2/app` route now mounts the v2 shell against the real auth/patient store and briefing service. It is an integration scaffold for repository-backed v2, currently focused on patient list, Today, patient selection, attention toggling, discharge/restore, and deep-linking into workspace tabs while detailed tab writes are still being wired.
- Core v2 shell labels in `AppShellV2`, `TopBar`, `PatientRail`, `PatientRow`, `WorkspaceHeader`, and `WorkspaceTabs` were rewritten with clean Korean text to remove remaining mojibake from the first viewport.
- `/v2/app` now wires workspace writes through existing stores for charting save, quick notes/reminders, manual Lab entry, antibiotic entry/removal, and today schedule entry/removal. `PatientWorkspace` was simplified and rewritten with clean Korean labels to restore type safety after legacy mojibake made partial edits brittle.
- `/v2/app` now has an in-shell patient creation panel. New patients are created through `usePatientStore` without asking for C/C, duplicate registration numbers and occupied admitted rooms are blocked, and successful creation opens the new patient directly on the charting tab.
- `/v2/app` and `PatientWorkspace` were rechecked after the integration pass: broken Korean fallback strings and malformed JSX labels were replaced, charting save now waits for the repository-backed write before clearing the dirty state, and `index.html` metadata/title were normalized so Vite production builds do not fail on malformed HTML.
- Legacy Dexie fallback sidebar flags now query medications and reminders by the visible patient IDs instead of scanning all active antibiotics or all reminder notes, matching the scoped-query direction used by the Supabase repositories.
- Legacy IndexedDB backup/export/import and the old single-row server backup flow are now blocked in Supabase backend mode so an empty local cache cannot be treated as authoritative server data. The replacement path should be the `backup_snapshots` flow with restore preview.
- Supabase snapshot backup service was added. It collects server-side patients, notes, schedules, medications, Lab results/items, templates, Lab categories, and user settings through RLS-scoped Supabase reads, encrypts the payload client-side, stores immutable `backup_snapshots`, and can decrypt a selected snapshot for record-count preview before any restore work exists. Settings now shows a Supabase v2 snapshot card in Supabase backend mode.
- Snapshot preview now compares snapshot record counts with current server counts and marks zero-patient snapshot over non-empty server data as blocked. Current counts use Supabase count-only queries rather than downloading rows. Actual destructive restore remains intentionally unopened until the preview/safety UI is complete.
- `/v2/app` and `AppShellV2` were re-normalized after another mojibake pass. Workspace write actions now share a visible error banner so failed charting, note, Lab, antibiotic, schedule, attention, or discharge writes do not fail silently, and failed draft saves remain dirty instead of clearing the user input.
- v2 first-screen components were normalized again across `TopBar`, `PatientRail`, and `TodayDashboard`. Search labels, mobile controls, patient filters, Today metrics, task filters/sorts, empty states, and dashboard sections now use clean Korean labels throughout the v2 route surface.
- v2 patient workspace, patient row, workspace header, workspace tabs, and copy bar were rewritten with clean Korean labels and valid JSX. Charting and quick-entry forms still save explicitly, keeping Supabase writes tied to user save actions rather than every keystroke.
- `/v2/app` patient creation, write error messages, mobile shell labels, and the right-side context panel were normalized to clean Korean text. `PatientWorkspace` now mounts the context panel on wide screens so patient-specific Today items stay visible without extra navigation.
- Supabase patient-ID scoped repository reads now run chunked patient queries in parallel for notes, schedules, medications, and Lab summaries. This keeps payloads bounded by explicit column selects while reducing wait time when the active patient list grows past one Supabase `.in()` chunk.
- `/v2/app` patient edit now stays inside the v2 shell instead of navigating to the legacy patient detail page. The shared add/edit panel still excludes C/C, previews detailed age from birth date, supports Ctrl/Cmd+Enter submit, and preserves duplicate registration/occupied room checks with edit-aware exclusions.
- Repository-backed store fallback errors for patients, notes, medications, Lab, and schedules were localized so v2 write banners do not fall back to generic English messages in common failure paths.
- `/v2/app` now protects unsaved workspace edits when switching patients, opening Today, adding a patient, opening settings, or logging out. Patient add/edit panels also protect dirty form input on close/Escape, focus the first field on open, expose dialog semantics, and disable close while saving.
- `/v2/app` initial data loading now fetches patient list and Today briefing in parallel after auth is available, reducing first-screen wait without changing repository payload shape. Patient discharge/restore actions now ask for explicit confirmation.
- v2 charting supports Ctrl/Cmd+Enter save, and quick Lab/antibiotic/note/schedule forms support Enter save while ignoring Korean IME composition events.
- v2 write failures now pass through a shared user-facing error formatter so Supabase constraint/RLS/network details do not leak into banners. Patient, note, medication, Lab, schedule, and auth stores use the same formatter, while explicit login/approval/permission messages are preserved.
- v2 quick-entry save buttons now show per-form saving state and block duplicate Enter/click submissions. Row delete buttons show their own pending state so slow Supabase deletes are visible and cannot be double-fired.
- `PatientWorkspace` no longer exposes unused preview-only review-save props. The preview page stops passing those callbacks, keeping the real workspace surface focused on explicit charting, note, Lab, antibiotic, and schedule writes.
- v2 workspace back navigation now respects unsaved draft guards in both `/v2` preview and `/v2/app`. Attention and discharge/restore header actions expose pending state so slow Supabase writes cannot be double-fired.
- `/v2/app` patient add/edit now uses real form submission, trims submitted identifiers, restricts registration numbers to digits, validates birth dates between 1900 and today, and shows inline age/validation feedback before saving.
- v2 mobile patient drawer now exposes dialog semantics and the mobile patient banner has a clearer accessible label. Today also shows a compact "갱신 중" loading pill while patient or briefing data is refreshing.
- `/v2/app` clinical writes now refresh only the Today briefing instead of re-fetching the full patient list after every note, Lab, antibiotic, or schedule write. Charting and attention writes rely on the store's local patient update, while add/archive still refresh the patient set when the active list can change.
- `/v2/app` tracks the last successful briefing refresh time, shows it in the Today subtitle, and quietly refreshes stale data when the tab/window regains focus after 60 seconds, unless there are unsaved workspace edits.
- `/v2/app` patient edit and discharge/restore actions now also pass through the unsaved workspace guard before opening the edit panel or changing patient status.
- `/v2/app` now applies optimistic briefing updates after successful note, antibiotic, Lab, and today-schedule creates plus note/antibiotic/schedule deletes. This makes the current workspace and Today queue react immediately while the background briefing refresh confirms the server state. Lab deletes wait for the refresh because Lab summaries do not include individual result IDs.
- `useScheduleStore.addSchedule` now returns the saved schedule ID in both Supabase and Dexie modes, allowing v2 to show newly created schedule rows immediately without waiting for a full briefing round-trip.
- `/v2/app` optimistic updates now also cover patient summary/identity changes. New patients increment Today counts immediately, patient edit updates names/rooms across existing Today/workspace rows, and discharge removes that patient's briefing items while the full patient refresh confirms server state.
- `/v2/app` avoids duplicate full-refresh requests by sharing an in-flight refresh per authenticated user. If auth changes, the guard does not reuse the previous user's refresh.
- `/v2/app` now releases quick-entry save/delete pending states as soon as the write succeeds and queues the briefing confirmation refresh in the background, making Supabase latency less visible while preserving server reconciliation.
- `/v2/app` now coalesces overlapping briefing refreshes per authenticated user. Rapid note/Lab/antibiotic/schedule saves share the in-flight refresh and run at most one final follow-up refresh, so optimistic UI confirmation does not stampede Supabase.
- Today patient summary counts in `/v2/app` are derived from the local patient store rather than the briefing payload, keeping active/admitted/consult counts aligned immediately after patient add/edit/discharge.
- Successful optimistic local updates clear stale briefing errors; server confirmation failures can still surface afterward through the normal Today error path.
- Supabase Lab item edits now hydrate only the changed Lab result instead of reloading every Lab for that patient, keeping inline Lab edits bounded to one result row plus its items.
- Sidebar flag refreshes are now debounced and skipped when no legacy sidebar listener is mounted, reducing extra note/antibiotic flag reads after rapid Supabase writes.
- `/v2/app` patient creation now starts with an empty birth date instead of a fake default date, forcing explicit 생년월일 entry before save.
- v2 workspace drafts are more stable across background refreshes: charting initial data is memoized, quick-entry drafts reset on patient switch, and unmounting the workspace clears stale unsaved state.
- v2 Today dashboard derived queues, filters, counts, and sorted sections are memoized so ordinary shell re-renders do not repeatedly sort the same briefing rows.
- Mobile patient drawer add-patient actions now respect the unsaved-change guard before closing the drawer.
- v2 quick-entry forms now validate manual Lab dates, antibiotic start dates, and schedule time text before saving, and the real `/v2/app` write handlers also reject invalid Lab/antibiotic dates instead of silently falling back to today.
- v2 quick-entry saves and row deletes now retain the user's draft on failed writes while avoiding unhandled promise noise; the shared write banner remains the visible failure surface.
- v2 quick-entry values are trimmed before repository writes so manual Lab names, units, antibiotic names, dosage/frequency, and schedule title/category do not create whitespace-only duplicates.
- Shared v2 row/metric/section components are memoized, and the shell selected-patient lookup/handlers are stabilized to reduce avoidable rerenders in the patient rail and Today workspace.
- Patient add/edit date inputs now include browser-level min/max bounds in addition to the existing validation.
- CopyBar now clears its feedback timeout on unmount and reuses a single reset timer, avoiding stale copy/failure state updates after navigation.
- v2 workspace tab rows now memoize per-patient Lab, antibiotic, note, schedule, handoff, and queue derivations from the shared briefing payload, reducing repeated filter work during shell rerenders.
- The right-side v2 context panel now memoizes patient-scoped reminders, notes, antibiotics, Labs, schedules, and derived task counts instead of sorting/filtering every render.
- The v2 patient rail now uses stable filter/reset/toggle handlers, memoized filter options, memoized patient groups, and a memoized row wrapper so `PatientRow` memoization is actually useful when only unrelated shell state changes.
- v2 Today metric filter handlers, date label formatting, and search-state calculation are stabilized so dashboard rerenders do less incidental work.
- `/v2/app` selected/editing patient lookup, navigation guards, refresh helpers, status text, and panel submit helpers are memoized where appropriate to keep child props steadier under frequent optimistic updates.
- Today briefing Lab summaries in Supabase mode now use a thin summary query that fetches only result identity/date/category plus Lab item name/abnormal/flag fields, avoiding full Lab item hydration when the dashboard only needs counts and abnormal labels.
- Manual Supabase Lab creation now composes the returned Lab result from insert responses instead of doing an extra hydrate query after inserting items, saving one network round trip per manual Lab save.
- Briefing fetches now return immediately when there are no active patients, avoiding unnecessary note/medication/Lab/schedule queries in a fresh install or empty ward state.
- v2 patient summary counts and workspace tab badges now use single-pass counters instead of repeated array filters.
- v2 patient rail grouping now filters and classifies patients in one pass before sorting each visible group, reducing repeated list scans during search/filter changes.
- v2 Today task filter counts and urgent/soon summaries now run as single-pass reductions over the built task rows.
- Supabase Today briefing no longer reads full patient charting rows just to attach patient identity. It now uses a thin active-patient briefing row with only id, name, room, type, and status.
- `patients.repository` now also exposes a patient shell row query with identity/list fields plus C/C/onset, giving the v2 shell a future path away from loading every patient's full charting body for the left rail.
- Store update helpers now centralize id-based upsert/replace/remove behavior so patient, note, medication, Lab, and schedule writes do not accidentally duplicate rows after optimistic or follow-up fetch flows.
- Patient, note, and medication fetches now preserve the previous array reference when the fetched ids and update stamps are unchanged, reducing avoidable rerenders after stale-focus refreshes or coalesced briefing confirmations.
- Lab and schedule fetches intentionally keep replacing fetched lists because their legacy shapes do not always carry reliable update stamps; those stores only use id-based upsert/remove for write paths.
- Store upsert/replace helpers now also preserve the previous array when the same id and update stamp return again, reducing reference churn after repeated Supabase confirmations.
- `/v2/app` builds a memoized patient list index for summary counts, registration-number lookup, occupied-room lookup, and search text so add/edit validation and search do not repeatedly scan and normalize the full patient array.
- `/v2/app` optimistic note, antibiotic, Lab summary, and schedule inserts now share an id/key-based briefing upsert helper instead of constructing duplicate-removal arrays separately in each handler.
- `/v2/app` and the v2 patient rail now defer expensive search filtering during typing, keeping input keystrokes immediate while larger patient lists settle in the background.
- Patient list indexes now keep an id map for selected/editing patient lookup, and `usePatientStore.fetchPatientById` can hydrate one patient on demand. This leaves a path to load thin list rows first and full charting rows only when opened.
- Patient rail indicator derivation now uses the memoized patient id map and only creates entries for patients that actually have queue flags, avoiding one empty indicator object per patient on every briefing update.
- `usePatientStore` now maintains a `patientById` map alongside the array so store-level patient lookup no longer needs repeated array scans, while patient rail search text is precomputed when the patient list changes instead of rebuilt on every query.
- `usePatientStore.fetchPatients` and `fetchPatientById` now share in-flight promises, preventing duplicate patient-list or single-patient Supabase reads when initial load, focus refresh, and future lazy hydration overlap.
- `/v2/app` patient edit now includes a confirmed patient-delete action. The delete path uses the existing patient store archive/soft-delete behavior, removes the patient from local briefing state, clears selection if needed, and queues the normal server confirmation refresh.
- Icon-only controls in the v2 top bar and patient workspace header now expose hover tooltips and clearer aria labels for actions such as patient search, patient add, settings, logout, attention toggle, patient edit, and discharge/restore.
- Settings user management now explains the Supabase approval flow, shows loading/error states for admin reads, clarifies that Supabase member "delete" only moves the profile to rejected, and surfaces snapshot restore-block/warning checks in the backup preview UI.
- Lab category settings now show load/save/error/dirty states, block duplicate category or item additions, keep failed saves visible, and normalize trimmed category/item data before persisting to Supabase or Dexie.
- Supabase user-setting auto-save now exposes per-setting save state. Charting copy settings, schedule categories, calendar colors, and Lab reference settings show "저장 중/저장됨/저장 실패" in Settings instead of failing only in the console.
- Schedule category settings now edit through a validated draft, block blank or duplicate labels, normalize colors/labels before replacing the store, and only apply changes when the user saves or resets. Hydrated Supabase schedule-category settings also pass through the same normalization path.
- Lab reference overrides now ignore non-finite numeric values and clear an override when both bounds are empty/invalid, preventing NaN/Infinity from leaking into persisted user settings.
- Settings auto-save status now clears on auth/user changes and exposes polite live-region status text with a saved-time tooltip.
- Supabase user-settings hydration now uses store-level normalization for charting copy settings, calendar colors, schedule categories, and Lab reference overrides. Malformed JSON values no longer directly overwrite persisted local store state.
- Charting, calendar color, and Lab reference stores now expose replace/normalize paths for hydrated settings, with tests covering invalid problem-list styles, separators, section labels, color keys, and reference override values.
- Store tests now cover schedule-category normalization/default fallback and Lab reference finite-number sanitization.
- AI settings now trim API keys before storing, validate model selections against the active provider, expose pressed state on provider buttons, show key length, and surface failed connection-test errors through toast instead of only inline text.
- Backup settings were split into a thin backend switcher plus `SupabaseBackupSettings` and `LegacyBackupSettings`, so Supabase snapshot backup UI and legacy IndexedDB backup/import UI can evolve independently while keeping the existing snapshot formatter tests on the public wrapper export.
- Admin settings now split member access management and patient ownership into `AdminMemberAccess` and `AdminPatientOwnership`, with shared role/module option metadata in `adminAccessOptions`. The main admin settings component now focuses on loading state, actions, and tab orchestration.
- Remaining Settings sections were split into single-purpose files. `WorkSettings.tsx` now re-exports `ChartingSettings`, `ScheduleCategorySettings`, `CalendarColorSettings`, and `AISettings`; `LabSettings.tsx` now re-exports `LabCategorySettings`, `LabReferenceSettings`, and `LabImportSettings`; admin approval was extracted into `AdminApprovalPanel`.

## Recent Verification

- `npm run type-check` passed on 2026-05-25 after the backup settings split.
- `npx vitest run src/lib/settingsNavigation.test.ts src/components/settings/WorkSettings.test.ts src/components/settings/BackupSettings.test.ts src/lib/adminPatients.test.ts src/lib/adminAccess.test.ts src/lib/errorMessages.test.ts src/stores/useAIStore.test.ts src/stores/useScheduleCategoryStore.test.ts src/stores/useLabReferenceStore.test.ts src/stores/useCalendarColorStore.test.ts src/stores/useChartingSettingsStore.test.ts src/stores/useSettingsSyncStatusStore.test.ts src/services/backupSnapshotService.test.ts` passed on 2026-05-25.
- `npm run build` passed on 2026-05-25 after the backup settings split.
- `npm run type-check`, the same 13-file focused Vitest run, and `npm run build` passed again on 2026-05-25 after the admin member/patient ownership split.
- `npm run type-check`, the 13-file focused Vitest run, and `npm run build` passed again on 2026-05-25 after finishing the remaining Settings component splits.
- `/v2/app` Supabase write-path validation started with store-level coverage because the in-app browser execution tool was unavailable in this session. New tests cover Supabase patient fetch/create/update/archive plus note, Lab, antibiotic, and today-schedule add/delete paths used by the v2 shell.
- `npm run type-check`, `npx vitest run` over the 15 focused files including the new Supabase write-path tests, and `npm run build` passed on 2026-05-25.
- Settings UI behavior now has React Testing Library coverage for admin member search/status filters/role-module actions, patient ownership search/status filters/empty state, and schedule category add/save behavior.
- `npm run type-check`, `npx vitest run` over the 16 focused files including Settings UI and Supabase write-path tests, and `npm run build` passed on 2026-05-25.
- Supabase snapshot restore preview diff/impact rows were added and verified with `npm run type-check`, `npx vitest run` over the 16 focused Settings/Supabase files, and `npm run build` on 2026-05-25.
- Supabase backup settings now separate snapshot list/create/preview loading states, show list refresh, selected snapshot counts, empty/error states, trimmed password handling, and clearer per-action pending labels.
- Supabase backup snapshots can now be deleted from Settings after explicit confirmation. The repository/service layer exposes a delete path, and the UI clears preview/password/selection state after successful deletion.
- Backup snapshot errors are now normalized through a service-level formatter so password/decryption, RLS/permission, network, missing snapshot, and invalid snapshot-format failures show Korean user-facing messages in Settings.
- Backup snapshot preview now validates missing snapshot/password inputs before decrypting, trims passwords at the service boundary, and normalizes partially malformed snapshot table arrays before counting records.
- Backup snapshot tests now also cover formatted snapshot errors.
- Lab Import settings now explicitly explains that legacy IndexedDB server-backup sync is disabled in Supabase mode while import writes use the logged-in account permissions.
- AI store tests now cover API-key trimming/config checks and invalid-model fallback.
- Admin Settings now uses the shared user-facing error formatter for load/approve/reject/deactivate failures, exposes a manual refresh action, last-refresh time, summary counts, loading labels, aria-pressed tabs, and clearer member deactivate labels.
- Admin patient ownership now builds a user id map, sorts owner groups by active count/name, labels unknown owners, shows role/status badges, admitted/consult/attention counts, active-empty state, patient registration hover details, and sorted active/discharged patient rows.
- Shared error message formatting now has focused tests covering explicit permission messages, Supabase/RLS technical fallback, network fallback, empty errors, and non-technical pass-through messages.
- Settings auto-save status now versions pending saves so a slower previous request cannot overwrite the visible state of a newer save; focused tests cover stale completion handling and status clearing.
- Legacy backup actions now wrap file/text/server failures with the shared user-facing error formatter and show pending labels for text backup/restore and restore actions.
- Admin member management now supports editing approved members' role/module access, re-approving pending or rejected users from the member table, filtering by status, searching by member metadata, and resetting unsaved access drafts.
- Supabase and legacy auth stores now share normalized role/module handling for approval and access updates; Supabase exposes a profile access update repository path guarded by admin role checks.
- Admin access helper tests cover role/module normalization, draft-change detection, module toggling, status counts, and member search/filter behavior.
- Admin patient ownership grouping/counting/filtering is now covered by pure helpers and tests; the patient ownership tab supports active/attention/discharged/all filters plus patient search.
- The Settings auto-save status badge has been extracted into `src/components/settings/AutoSaveStatus.tsx`, keeping the shared "저장 중/저장됨/저장 실패" display out of the large settings page.
- The full Admin Settings section has been extracted into `src/components/settings/AdminSettings.tsx`, including approval, member access, and patient ownership panels. `SettingsPage.tsx` now imports the admin section instead of carrying the full admin workflow inline.
- The Settings backup section has been extracted into `src/components/settings/BackupSettings.tsx`, covering both Supabase snapshots and legacy file/text/server backup UI. Snapshot option/count formatting helpers are exported and covered by focused tests.
- Lab category, Lab reference, and Lab Import settings have been extracted into `src/components/settings/LabSettings.tsx`, leaving `SettingsPage.tsx` focused on the settings shell plus smaller non-Lab sections.
- Charting copy, schedule category, calendar color, and AI settings have been extracted into `src/components/settings/WorkSettings.tsx`. Schedule draft label normalization/validation helpers are exported and covered by focused tests.
- PIN lock settings have been extracted into `src/components/settings/PinSettings.tsx`, and settings route section ids/group order are centralized in `src/lib/settingsNavigation.ts` with tests.
- Settings sidebar/mobile navigation has been extracted into `src/components/settings/SettingsNavigation.tsx`, while `settingsNavigation` now also builds visible section descriptors from admin/PIN/backend state.
- Backup snapshot restore-check tests now cover missing-Lab and empty-clinical-data warning cases used by the Settings preview UI.
- Supabase snapshot restore preview now builds per-record-type impact rows comparing snapshot counts against current server counts. Each impact includes snapshot/current counts, delta, level, and message, while the preview summary keeps zero-patient-over-non-empty-server restores blocked.
- Supabase backup Settings preview now renders the restore impact grid with warning/danger styling and a compact delta label, so admins can see which data domains would shrink or grow before any destructive restore path is opened.
- Patient delete policy is now explicitly soft-archive only in the v2 app. The edit panel labels the action as hiding the patient from lists, the confirmation explains that clinical records remain in Supabase, and `patientDeletionPolicy` has focused tests.
- Supabase type generation now has a documented path in `docs/supabase-types.md` plus an `npm run types:supabase` script. The local machine still lacks the Supabase CLI, so `src/types/supabase.ts` remains manually maintained until the CLI can generate it from the linked project.
- This rebuild is starting from an empty clinical dataset. Keep migration tooling focused on schema/bootstrap and safety snapshots, not Dexie-to-Supabase patient transfer.
- Today briefing and sidebar flag Supabase reads should remain scoped to accessible active patient IDs to avoid broad table scans.

## Current 2026-05-25 Checkpoint

- Supabase env values are set locally and the user has applied the foundation migration.
- First admin login works, patient creation works after the RLS/profile setup was corrected, and the user reported the core app flow is broadly functional.
- The main app route has been moved onto the v2 shell; `/v2/app` redirects to `/`.
- Settings has been reshaped into a left settings sidebar plus right content panel and is wired to the existing admin, charting, Lab, AI, and backup sections.
- Recent verification: `npx vitest run src/lib/settingsNavigation.test.ts src/components/settings/WorkSettings.test.ts src/components/settings/BackupSettings.test.ts src/lib/adminPatients.test.ts src/lib/adminAccess.test.ts src/lib/errorMessages.test.ts src/stores/useAIStore.test.ts src/stores/useScheduleCategoryStore.test.ts src/stores/useLabReferenceStore.test.ts src/stores/useCalendarColorStore.test.ts src/stores/useChartingSettingsStore.test.ts src/stores/useSettingsSyncStatusStore.test.ts src/services/backupSnapshotService.test.ts`, `npm run type-check`, and `npm run build` pass after the PIN/settings-navigation extraction pass.
- Git status at handoff time was clean on `main...origin/main`.

## Recommended Next Steps

1. Do a manual deployed-app smoke test in Supabase mode: login, add/edit/delete patient, discharge/restore, charting save, note save/delete, Lab save/delete, antibiotic save/delete, schedule save/delete, refresh, and relogin.
2. Tighten Settings behavior after real use. Prioritize admin approval/member management, Supabase snapshot backup preview, charting templates, Lab category/reference settings, and any controls that still look like legacy IndexedDB behavior.
3. Add a small admin-facing explanation for pending user approval if the current Settings admin tab is not discoverable enough.
4. Keep patient delete as a soft-archive/hide action in normal workflows. Add an admin-only purge only if a later compliance requirement explicitly needs it.
5. Install/link Supabase CLI in a trusted environment and run `npm run types:supabase` to replace `src/types/supabase.ts` with generated schema types.
6. Continue removing remaining legacy/mojibake strings only where they are visible in the Supabase v2 flow. Legacy routes can be cleaned later unless they leak into the current app.
7. Add focused tests for the highest-risk v2/Supabase flows: patient create/update/archive mapping, RLS-friendly repository errors, backup snapshot restore checks, and briefing optimistic update helpers.
8. Consider loading thin patient shell rows first and hydrating full charting rows on patient open, using the repository path already added for patient shell rows.
9. Keep performance work scoped to real bottlenecks: active-patient scoped reads, explicit column selects, chunked parallel queries, and avoiding full patient-list refreshes after small clinical writes.

Use `docs/supabase-validation.md` for the current Supabase validation checklist. Local Supabase env is set, the foundation migration has been applied, and the user has confirmed admin login plus patient creation. The next useful validation should happen against the deployed build and should focus on repeated real workflow use rather than schema bootstrap.

## Useful Files

- Rebuild plan: `docs/rebuild-plan.md`
- Supabase schema plan: `docs/supabase-schema-plan.md`
- Supabase validation checklist: `docs/supabase-validation.md`
- 2026-05-25 worklog: `docs/worklog-2026-05-25.md`
- Design plan: `docs/design-plan.md`
- Handoff: `docs/handoff.md`
