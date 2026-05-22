# WardFlow v2 Rebuild Plan

## Goal

WardFlow v2 keeps the proven clinical workflow from the current app, but changes the data model and product shell so Supabase is the source of truth and IndexedDB is no longer able to overwrite server data by accident.

The rebuild should be conservative: preserve core workflows, parsers, and domain decisions where they still work, while replacing the storage, auth, backup, and main navigation foundations.

## Keep

- React, Vite, TypeScript, Tailwind, React Router.
- Existing clinical domain concepts:
  - patients
  - charting fields
  - lab results
  - medications
  - notes and reminders
  - schedules
  - templates
- Lab and medication parser logic, after adding tests around current expected formats.
- AI assistant entry points, but behind a cleaner service boundary.
- Manual encrypted export/import as an emergency recovery path.
- Supabase Storage inbox concept for imported lab files, after access control is reviewed.

## Replace

- Dexie/IndexedDB as the primary database.
- Local username/password auth and local user approval flow.
- Single-row encrypted Supabase backup overwrite behavior.
- Direct `db.*` calls from pages, stores, hooks, and services.
- Current layout and visual system.
- Broken mojibake Korean strings.

## New Architecture

### Source of Truth

Supabase PostgreSQL is the canonical database. All durable patient data must be persisted there first.

### Local Storage

IndexedDB may remain only for:

- read cache
- temporary offline mutation queue
- file system handles
- non-critical UI cache

Local cache must never be treated as an authoritative backup. If local cache is empty, it must not clear server data.

### Data Access

Create a repository layer so UI code does not call Supabase or Dexie directly.

Suggested structure:

```text
src/
  lib/
    supabase.ts
  data/
    patients.repository.ts
    notes.repository.ts
    medications.repository.ts
    labs.repository.ts
    schedules.repository.ts
    templates.repository.ts
    settings.repository.ts
  domain/
    patient.ts
    note.ts
    medication.ts
    lab.ts
    schedule.ts
  mappers/
    patient.mapper.ts
    lab.mapper.ts
```

### State

Zustand should hold UI state and currently loaded views, not act as the database abstraction. Repository functions should be responsible for reads and writes.

## Migration Strategy

1. Build Supabase schema and RLS policies.
2. Add generated Supabase database types.
3. Add repository layer while keeping old Dexie stores temporarily.
4. Move authentication to Supabase Auth.
5. Migrate patient CRUD first.
6. Migrate notes and schedules.
7. Migrate medications.
8. Migrate labs using normalized `lab_results` and `lab_items`.
9. Add IndexedDB/local backup import to Supabase migration tool.
10. Remove direct Dexie usage from app flows.
11. Keep Dexie only for cache/offline queue if needed.

## Minimal v2 Scope

The first usable v2 should include:

- Login/logout with Supabase Auth.
- Approved user profile and role.
- Patient list, create, update, discharge, archive.
- Patient detail workspace.
- Charting fields and copy-to-OCS output.
- Notes and reminders.
- Medication list, medication paste import, antibiotic tracking.
- Lab paste/file import, table view, abnormal flags, trend view.
- Today dashboard.
- Manual export/import.
- Server-side snapshot backup with restore preview.

Defer until after v2 baseline:

- Full offline editing.
- Realtime multi-user collaboration.
- Complex audit UI.
- Cross-module WardLink integration.
- Advanced AI features beyond existing entry points.

## Safety Rules

- Any destructive server operation must show affected record counts before running.
- A backup snapshot with zero patients cannot auto-promote over a non-empty server state.
- Imports should run in preview mode before commit.
- Patient deletes should be soft deletes unless an admin explicitly purges.
- All patient access must be enforced by Supabase RLS, not only frontend filtering.

## Implementation Milestones

### Milestone 1: Foundation

- Add Supabase schema migration files.
- Add generated DB type placeholder and env-based Supabase client.
- Add repository interfaces.
- Add test fixtures for current parser behavior.

### Milestone 2: Auth and Patients

- Replace local auth with Supabase Auth.
- Add profiles and approval flow.
- Create profiles from `auth.users` with a database trigger so email confirmation settings do not break registration.
- Make the first registered profile `admin` and `approved`; later profiles start as `doctor` and `pending`.
- Implement patient CRUD through Supabase.
- Add RLS tests or SQL policy review checklist.

### Milestone 3: Core Clinical Data

- Migrate notes, schedules, medications, labs.
- Implement normalized lab storage.
- Replace direct `db.*` calls in stores/pages for migrated modules.

### Milestone 4: Backup and Migration

- Add snapshot backup table and UI.
- Add restore preview.
- Add old WardFlow backup import to Supabase.
- Add local IndexedDB export rescue screen where possible.

### Milestone 5: New UI

- Replace app shell, sidebar, Today dashboard, patient workspace.
- Fix all Korean strings.
- Add compact desktop and mobile-first review flows.
