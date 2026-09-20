-- WardFlow — 알림 고도화 (TODO 3.2)
--
-- 지금까지 "알림"은 당일 alert_date를 가진 reminder 메모뿐이었다.
-- 여기서 두 가지를 추가한다.
--   1) alert_rules  : 사용자가 정의하는 규칙 (Lab 수치 임계값, 항생제 사용 일수)
--   2) alert_events : 규칙이 실제로 맞은 기록 = 알림 히스토리
--
-- 규칙과 알림은 **사용자 개인 것**이다. 같은 환자를 보는 다른 의사가 서로 다른
-- 임계값을 쓸 수 있어야 하므로 owner_id로 스코프하고, 그 위에 환자 접근 권한을
-- 한 번 더 건다(can_read_patient). 즉 내 규칙이라도 접근 권한이 없는 환자의
-- 알림은 읽을 수 없다.

-- ─────────────────────────────────────────────
-- alert_rules
-- ─────────────────────────────────────────────
create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,

  -- 'lab_threshold'      : lab_item 수치가 임계값을 넘으면
  -- 'antibiotic_duration': 항생제 사용 일수가 day_threshold 이상이면
  kind text not null check (kind in ('lab_threshold', 'antibiotic_duration')),

  -- lab_threshold 전용. lab_item은 표시명 기준(대소문자 무시)으로 매칭한다.
  lab_item text,
  comparator text check (comparator in ('lt', 'lte', 'gt', 'gte', 'abnormal')),
  threshold numeric,

  -- antibiotic_duration 전용
  day_threshold integer,

  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  is_enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 종류별로 필요한 필드가 채워졌는지 DB에서도 보장한다.
  constraint alert_rules_lab_fields check (
    kind <> 'lab_threshold'
    or (
      lab_item is not null
      and comparator is not null
      and (comparator = 'abnormal' or threshold is not null)
    )
  ),
  constraint alert_rules_antibiotic_fields check (
    kind <> 'antibiotic_duration' or day_threshold is not null
  )
);

-- ─────────────────────────────────────────────
-- alert_events (히스토리)
-- ─────────────────────────────────────────────
create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  -- 규칙이 지워져도 히스토리는 남는다 (무엇 때문에 떴는지는 rule_name에 보존).
  rule_id uuid references public.alert_rules(id) on delete set null,
  rule_name text not null,
  patient_id uuid not null references public.patients(id) on delete cascade,

  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,

  -- 같은 근거로 같은 알림이 반복 생성되지 않게 하는 키.
  -- 예) lab: rule|patient|lab_result|item,  antibiotic: rule|patient|medication
  dedupe_key text not null,

  triggered_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),

  constraint alert_events_owner_dedupe_unique unique (owner_id, dedupe_key)
);

-- ─────────────────────────────────────────────
-- 인덱스
-- ─────────────────────────────────────────────
create index if not exists alert_rules_owner_enabled_idx
  on public.alert_rules (owner_id, is_enabled);

create index if not exists alert_events_owner_triggered_idx
  on public.alert_events (owner_id, triggered_at desc);
create index if not exists alert_events_owner_ack_triggered_idx
  on public.alert_events (owner_id, acknowledged_at, triggered_at desc);
create index if not exists alert_events_patient_idx
  on public.alert_events (patient_id, triggered_at desc);

-- ─────────────────────────────────────────────
-- updated_at 트리거
-- ─────────────────────────────────────────────
drop trigger if exists alert_rules_set_updated_at on public.alert_rules;
create trigger alert_rules_set_updated_at before update on public.alert_rules
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.alert_rules enable row level security;
alter table public.alert_events enable row level security;

drop policy if exists "alert rules manage own" on public.alert_rules;
create policy "alert rules manage own"
on public.alert_rules for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid() and public.is_approved_profile(auth.uid()));

-- 내 알림이면서, 그 환자를 읽을 권한이 있을 때만 보인다.
drop policy if exists "alert events read own accessible" on public.alert_events;
create policy "alert events read own accessible"
on public.alert_events for select
to authenticated
using (
  owner_id = auth.uid()
  and public.can_read_patient(patient_id, auth.uid())
);

drop policy if exists "alert events write own accessible" on public.alert_events;
create policy "alert events write own accessible"
on public.alert_events for all
to authenticated
using (
  owner_id = auth.uid()
  and public.can_read_patient(patient_id, auth.uid())
)
with check (
  owner_id = auth.uid()
  and public.can_read_patient(patient_id, auth.uid())
  and public.is_approved_profile(auth.uid())
);
