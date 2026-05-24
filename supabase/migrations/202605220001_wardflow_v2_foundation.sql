create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null,
  department text,
  role text not null default 'doctor' check (role in ('admin', 'doctor', 'nurse', 'therapist')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  modules text[] not null default array['wardflow'],
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_approved_profile(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and status = 'approved'
  );
$$;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
      and status = 'approved'
  );
$$;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null,
  name text not null,
  birth_date date not null,
  sex text not null check (sex in ('M', 'F')),
  room_bed text not null,
  admission_date date not null,
  discharge_date date,
  attending_physician text,
  patient_type text not null check (patient_type in ('admitted', 'consult')),
  status text not null default 'active' check (status in ('active', 'discharged', 'archived')),
  created_by uuid not null references public.profiles(id),
  attention boolean not null default false,
  tags text[] not null default '{}',
  chief_complaint text not null default '',
  onset text not null default '',
  present_illness text not null default '',
  past_history text not null default '',
  review_of_system text not null default '',
  physical_exam text not null default '',
  problem_list text[] not null default '{}',
  plan text not null default '',
  guardian_explanation text not null default '',
  etc text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.patient_shares (
  patient_id uuid not null references public.patients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  access_level text not null check (access_level in ('read', 'write')),
  created_at timestamptz not null default now(),
  primary key (patient_id, user_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  content text not null,
  type text not null check (type in ('progress', 'reminder')),
  alert_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  title text not null,
  scheduled_date date not null,
  scheduled_time time,
  category text not null,
  is_completed boolean not null default false,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  category text not null check (category in ('hospital', 'personal', 'antibiotic')),
  drug_name text not null,
  drug_base_name text not null default '',
  single_dose numeric,
  schedule text not null default '',
  timing text,
  days_remaining integer,
  dosage text,
  frequency text,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  test_date date not null,
  category text not null,
  source text not null check (source in ('manual', 'parsed', 'csv', 'xls')),
  raw_text text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.lab_items (
  id uuid primary key default gen_random_uuid(),
  lab_result_id uuid not null references public.lab_results(id) on delete cascade,
  code text,
  name text not null,
  value_text text not null,
  value_numeric numeric,
  unit text not null default '',
  reference_min numeric,
  reference_max numeric,
  is_abnormal boolean not null default false,
  hl_flag text check (hl_flag in ('H', 'L')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  field text not null,
  name text not null,
  content text not null,
  scope text not null default 'personal' check (scope in ('personal', 'department', 'global')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lab_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  display_order integer not null,
  items text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists public.backup_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('manual', 'automatic', 'migration')),
  encrypted_data text not null,
  record_counts jsonb not null,
  content_hash text,
  app_version text,
  created_at timestamptz not null default now()
);

-- Legacy compatibility for the current backupService. v2 should move to backup_snapshots.
create table if not exists public.backups (
  user_key text primary key,
  encrypted_data text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_user boolean;
begin
  select not exists (select 1 from public.profiles) into is_first_user;

  insert into public.profiles (
    id,
    username,
    display_name,
    department,
    role,
    status,
    modules,
    approved_at
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    case when is_first_user then 'admin' else 'doctor' end,
    case when is_first_user then 'approved' else 'pending' end,
    case when is_first_user then array['wardflow'] else array[]::text[] end,
    case when is_first_user then now() else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.can_read_patient(patient_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patients
    where id = patient_id
      and deleted_at is null
      and (
        created_by = user_id
        or public.is_admin(user_id)
        or exists (
          select 1
          from public.patient_shares
          where patient_shares.patient_id = patients.id
            and patient_shares.user_id = user_id
        )
      )
  );
$$;

create or replace function public.can_write_patient(patient_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patients
    where id = patient_id
      and deleted_at is null
      and (
        created_by = user_id
        or public.is_admin(user_id)
        or exists (
          select 1
          from public.patient_shares
          where patient_shares.patient_id = patients.id
            and patient_shares.user_id = user_id
            and patient_shares.access_level = 'write'
        )
      )
  );
$$;

create index if not exists patients_status_room_bed_idx on public.patients (status, room_bed);
create index if not exists patients_created_by_status_room_bed_idx on public.patients (created_by, status, room_bed);
create index if not exists patients_registration_number_idx on public.patients (registration_number);
create index if not exists patients_name_idx on public.patients (name);
create index if not exists patients_tags_idx on public.patients using gin (tags);

create index if not exists notes_patient_created_at_idx on public.notes (patient_id, created_at desc);
create index if not exists notes_alert_date_idx on public.notes (alert_date);

create index if not exists schedules_patient_date_idx on public.schedules (patient_id, scheduled_date);
create index if not exists schedules_date_completed_idx on public.schedules (scheduled_date, is_completed);

create index if not exists medications_patient_active_idx on public.medications (patient_id, is_active);
create index if not exists medications_category_active_idx on public.medications (category, is_active);
create index if not exists medications_patient_start_date_idx on public.medications (patient_id, start_date desc);

create index if not exists lab_results_patient_test_date_idx on public.lab_results (patient_id, test_date desc);
create index if not exists lab_results_patient_category_idx on public.lab_results (patient_id, category);
create unique index if not exists lab_results_patient_test_date_category_active_uidx
  on public.lab_results (patient_id, test_date, category)
  where deleted_at is null;

create index if not exists lab_items_result_order_idx on public.lab_items (lab_result_id, display_order);
create index if not exists lab_items_name_idx on public.lab_items (name);
create index if not exists lab_items_code_idx on public.lab_items (code);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at before update on public.patients
  for each row execute function public.set_updated_at();
drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
drop trigger if exists schedules_set_updated_at on public.schedules;
create trigger schedules_set_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();
drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at before update on public.medications
  for each row execute function public.set_updated_at();
drop trigger if exists lab_results_set_updated_at on public.lab_results;
create trigger lab_results_set_updated_at before update on public.lab_results
  for each row execute function public.set_updated_at();
drop trigger if exists lab_items_set_updated_at on public.lab_items;
create trigger lab_items_set_updated_at before update on public.lab_items
  for each row execute function public.set_updated_at();
drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at before update on public.templates
  for each row execute function public.set_updated_at();
drop trigger if exists lab_categories_set_updated_at on public.lab_categories;
create trigger lab_categories_set_updated_at before update on public.lab_categories
  for each row execute function public.set_updated_at();
drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.patient_shares enable row level security;
alter table public.notes enable row level security;
alter table public.schedules enable row level security;
alter table public.medications enable row level security;
alter table public.lab_results enable row level security;
alter table public.lab_items enable row level security;
alter table public.templates enable row level security;
alter table public.lab_categories enable row level security;
alter table public.user_settings enable row level security;
alter table public.backup_snapshots enable row level security;
alter table public.backups enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles read approved users" on public.profiles;
create policy "profiles read approved users"
on public.profiles for select
to authenticated
using (public.is_approved_profile(auth.uid()) or id = auth.uid());

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles update admin only" on public.profiles;
create policy "profiles update admin only"
on public.profiles for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "patients read accessible" on public.patients;
create policy "patients read accessible"
on public.patients for select
to authenticated
using (public.can_read_patient(id, auth.uid()));

drop policy if exists "patients insert own" on public.patients;
create policy "patients insert own"
on public.patients for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_approved_profile(auth.uid())
);

drop policy if exists "patients update accessible writers" on public.patients;
create policy "patients update accessible writers"
on public.patients for update
to authenticated
using (public.can_write_patient(id, auth.uid()))
with check (public.can_write_patient(id, auth.uid()));

drop policy if exists "patient shares read related" on public.patient_shares;
create policy "patient shares read related"
on public.patient_shares for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin(auth.uid())
  or public.can_write_patient(patient_id, auth.uid())
);

drop policy if exists "patient shares manage owner or admin" on public.patient_shares;
create policy "patient shares manage owner or admin"
on public.patient_shares for all
to authenticated
using (
  public.is_admin(auth.uid())
  or public.can_write_patient(patient_id, auth.uid())
)
with check (
  public.is_admin(auth.uid())
  or public.can_write_patient(patient_id, auth.uid())
);

drop policy if exists "notes read accessible patient" on public.notes;
create policy "notes read accessible patient"
on public.notes for select
to authenticated
using (
  deleted_at is null
  and public.can_read_patient(patient_id, auth.uid())
);

drop policy if exists "notes write accessible patient" on public.notes;
create policy "notes write accessible patient"
on public.notes for all
to authenticated
using (
  public.can_write_patient(patient_id, auth.uid())
)
with check (
  public.can_write_patient(patient_id, auth.uid())
  and public.is_approved_profile(auth.uid())
);

drop policy if exists "schedules read accessible patient" on public.schedules;
create policy "schedules read accessible patient"
on public.schedules for select
to authenticated
using (
  deleted_at is null
  and public.can_read_patient(patient_id, auth.uid())
);

drop policy if exists "schedules write accessible patient" on public.schedules;
create policy "schedules write accessible patient"
on public.schedules for all
to authenticated
using (
  public.can_write_patient(patient_id, auth.uid())
)
with check (
  public.can_write_patient(patient_id, auth.uid())
  and public.is_approved_profile(auth.uid())
);

drop policy if exists "medications read accessible patient" on public.medications;
create policy "medications read accessible patient"
on public.medications for select
to authenticated
using (
  deleted_at is null
  and public.can_read_patient(patient_id, auth.uid())
);

drop policy if exists "medications write accessible patient" on public.medications;
create policy "medications write accessible patient"
on public.medications for all
to authenticated
using (
  public.can_write_patient(patient_id, auth.uid())
)
with check (
  public.can_write_patient(patient_id, auth.uid())
  and public.is_approved_profile(auth.uid())
);

drop policy if exists "lab results read accessible patient" on public.lab_results;
create policy "lab results read accessible patient"
on public.lab_results for select
to authenticated
using (
  deleted_at is null
  and public.can_read_patient(patient_id, auth.uid())
);

drop policy if exists "lab results write accessible patient" on public.lab_results;
create policy "lab results write accessible patient"
on public.lab_results for all
to authenticated
using (
  public.can_write_patient(patient_id, auth.uid())
)
with check (
  public.can_write_patient(patient_id, auth.uid())
  and public.is_approved_profile(auth.uid())
);

drop policy if exists "lab items read accessible lab result" on public.lab_items;
create policy "lab items read accessible lab result"
on public.lab_items for select
to authenticated
using (
  exists (
    select 1
    from public.lab_results
    where id = lab_items.lab_result_id
      and deleted_at is null
      and public.can_read_patient(patient_id, auth.uid())
  )
);

drop policy if exists "lab items write accessible lab result" on public.lab_items;
create policy "lab items write accessible lab result"
on public.lab_items for all
to authenticated
using (
  exists (
    select 1
    from public.lab_results
    where id = lab_items.lab_result_id
      and public.can_write_patient(patient_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.lab_results
    where id = lab_items.lab_result_id
      and public.can_write_patient(patient_id, auth.uid())
  )
);

drop policy if exists "templates read visible" on public.templates;
create policy "templates read visible"
on public.templates for select
to authenticated
using (
  scope = 'global'
  or owner_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "templates manage own or admin" on public.templates;
create policy "templates manage own or admin"
on public.templates for all
to authenticated
using (owner_id = auth.uid() or public.is_admin(auth.uid()))
with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "lab categories read visible" on public.lab_categories;
create policy "lab categories read visible"
on public.lab_categories for select
to authenticated
using (owner_id is null or owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "lab categories manage own or admin" on public.lab_categories;
create policy "lab categories manage own or admin"
on public.lab_categories for all
to authenticated
using (owner_id = auth.uid() or public.is_admin(auth.uid()))
with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "user settings manage own" on public.user_settings;
create policy "user settings manage own"
on public.user_settings for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "backup snapshots manage own" on public.backup_snapshots;
create policy "backup snapshots manage own"
on public.backup_snapshots for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "legacy backups manage by user key" on public.backups;
create policy "legacy backups manage by user key"
on public.backups for all
to authenticated
using (user_key = auth.uid()::text)
with check (user_key = auth.uid()::text);

drop policy if exists "audit logs admin read" on public.audit_logs;
create policy "audit logs admin read"
on public.audit_logs for select
to authenticated
using (public.is_admin(auth.uid()));
