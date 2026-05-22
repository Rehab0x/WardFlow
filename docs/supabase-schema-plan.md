# Supabase Schema Plan

## Principles

- Supabase PostgreSQL is the source of truth.
- RLS must enforce access to patient data.
- Arrays are acceptable for display-only metadata, but access control and clinical child records should use relational tables.
- Use `uuid` primary keys.
- Use `created_at`, `updated_at`, and soft delete columns where relevant.
- Store dates as `date` where time does not matter, and `timestamptz` where time does matter.

## Extensions

```sql
create extension if not exists pgcrypto;
```

## Core Tables

### profiles

Linked to `auth.users`.
Profiles should be created by an `auth.users` trigger. The first profile becomes `admin` and `approved`; later profiles start as `doctor` and `pending`.

Columns:

- `id uuid primary key references auth.users(id) on delete cascade`
- `username text unique`
- `display_name text not null`
- `department text`
- `role text not null check (role in ('admin', 'doctor', 'nurse', 'therapist'))`
- `status text not null check (status in ('pending', 'approved', 'rejected'))`
- `modules text[] not null default array['wardflow']`
- `approved_by uuid references profiles(id)`
- `approved_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### patients

Columns:

- `id uuid primary key default gen_random_uuid()`
- `registration_number text not null`
- `name text not null`
- `birth_date date not null`
- `sex text not null check (sex in ('M', 'F'))`
- `room_bed text not null`
- `admission_date date not null`
- `discharge_date date`
- `attending_physician text`
- `patient_type text not null check (patient_type in ('admitted', 'consult'))`
- `status text not null check (status in ('active', 'discharged', 'archived'))`
- `created_by uuid not null references profiles(id)`
- `attention boolean not null default false`
- `tags text[] not null default '{}'`
- `chief_complaint text not null default ''`
- `onset text not null default ''`
- `present_illness text not null default ''`
- `past_history text not null default ''`
- `review_of_system text not null default ''`
- `physical_exam text not null default ''`
- `problem_list text[] not null default '{}'`
- `plan text not null default ''`
- `guardian_explanation text not null default ''`
- `etc text not null default ''`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `(status, room_bed)`
- `(created_by, status, room_bed)`
- `registration_number`
- `name`
- `tags gin`

### patient_shares

Columns:

- `patient_id uuid references patients(id) on delete cascade`
- `user_id uuid references profiles(id) on delete cascade`
- `access_level text not null check (access_level in ('read', 'write'))`
- `created_at timestamptz not null default now()`
- primary key `(patient_id, user_id)`

### notes

Columns:

- `id uuid primary key default gen_random_uuid()`
- `patient_id uuid not null references patients(id) on delete cascade`
- `content text not null`
- `type text not null check (type in ('progress', 'reminder'))`
- `alert_date date`
- `created_by uuid not null references profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `(patient_id, created_at desc)`
- `(alert_date)`

### schedules

Columns:

- `id uuid primary key default gen_random_uuid()`
- `patient_id uuid not null references patients(id) on delete cascade`
- `title text not null`
- `scheduled_date date not null`
- `scheduled_time time`
- `category text not null`
- `is_completed boolean not null default false`
- `notes text`
- `created_by uuid not null references profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `(patient_id, scheduled_date)`
- `(scheduled_date, is_completed)`

### medications

Columns:

- `id uuid primary key default gen_random_uuid()`
- `patient_id uuid not null references patients(id) on delete cascade`
- `category text not null check (category in ('hospital', 'personal', 'antibiotic'))`
- `drug_name text not null`
- `drug_base_name text not null default ''`
- `single_dose numeric`
- `schedule text not null default ''`
- `timing text`
- `days_remaining integer`
- `dosage text`
- `frequency text`
- `start_date date not null`
- `end_date date`
- `is_active boolean not null default true`
- `notes text`
- `created_by uuid not null references profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `(patient_id, is_active)`
- `(category, is_active)`
- `(patient_id, start_date desc)`

### lab_results

Columns:

- `id uuid primary key default gen_random_uuid()`
- `patient_id uuid not null references patients(id) on delete cascade`
- `test_date date not null`
- `category text not null`
- `source text not null check (source in ('manual', 'parsed', 'csv', 'xls'))`
- `raw_text text`
- `created_by uuid not null references profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `(patient_id, test_date desc)`
- `(patient_id, category)`
- unique partial index candidate: `(patient_id, test_date, category)` where `deleted_at is null`

### lab_items

Columns:

- `id uuid primary key default gen_random_uuid()`
- `lab_result_id uuid not null references lab_results(id) on delete cascade`
- `code text`
- `name text not null`
- `value_text text not null`
- `value_numeric numeric`
- `unit text not null default ''`
- `reference_min numeric`
- `reference_max numeric`
- `is_abnormal boolean not null default false`
- `hl_flag text check (hl_flag in ('H', 'L'))`
- `display_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- `(lab_result_id, display_order)`
- `(name)`
- `(code)`

### templates

Columns:

- `id uuid primary key default gen_random_uuid()`
- `owner_id uuid references profiles(id) on delete cascade`
- `field text not null`
- `name text not null`
- `content text not null`
- `scope text not null check (scope in ('personal', 'department', 'global'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### lab_categories

Columns:

- `id uuid primary key default gen_random_uuid()`
- `owner_id uuid references profiles(id) on delete cascade`
- `name text not null`
- `display_order integer not null`
- `items text[] not null default '{}'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### user_settings

Columns:

- `user_id uuid not null references profiles(id) on delete cascade`
- `key text not null`
- `value jsonb not null`
- `updated_at timestamptz not null default now()`
- primary key `(user_id, key)`

### backup_snapshots

Columns:

- `id uuid primary key default gen_random_uuid()`
- `owner_id uuid not null references profiles(id) on delete cascade`
- `kind text not null check (kind in ('manual', 'automatic', 'migration'))`
- `encrypted_data text not null`
- `record_counts jsonb not null`
- `content_hash text`
- `app_version text`
- `created_at timestamptz not null default now()`

Safety:

- Never update snapshots in place.
- Restore UI must show `record_counts`.
- Reject automatic promotion of a zero-patient snapshot over non-empty server data.

### audit_logs

Columns:

- `id uuid primary key default gen_random_uuid()`
- `actor_id uuid references profiles(id)`
- `entity_type text not null`
- `entity_id uuid`
- `action text not null`
- `before jsonb`
- `after jsonb`
- `created_at timestamptz not null default now()`

## RLS Model

Helper idea:

- Admin can read/write all WardFlow records.
- A user can read a patient if:
  - they created it, or
  - a `patient_shares` row exists for them, or
  - their role is `admin` or approved nurse with global ward access, depending on final policy.
- A user can write a patient if:
  - they created it, or
  - they have `patient_shares.access_level = 'write'`, or
  - they are admin.

Every child table should check access through its parent patient.

## Open Decisions

- Whether nurses should see all patients by default.
- Whether therapist access should be read-only or write-limited.
- Whether `registration_number` should be unique globally or unique per active patient only.
- Whether Lab category should remain denormalized on `lab_results` or move fully into display metadata.
- Whether patient names and identifiers need additional client-side encryption before Supabase.
