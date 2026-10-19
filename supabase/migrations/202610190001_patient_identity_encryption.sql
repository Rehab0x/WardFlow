-- 환자 식별정보 암호화 — 1단계 (TODO 2.19)
--
-- 이름 · 등록번호 · 생년월일을 DB에 평문으로 두지 않는다.
-- 앱(기기)이 AES-GCM으로 암호화한 값만 identity_ciphertext에 저장하고,
-- 서버 Lab import가 환자를 찾을 수 있도록 등록번호의 HMAC 조회키만 registration_hmac에 둔다.
-- 암호 키는 기기에서 만들어지며, DB에는 사용자 암호문구/복구 코드로 감싼 형태로만 들어온다.
--
-- 이 단계는 추가 전용이다. 기존 평문 컬럼은 nullable로만 바꾸고 지우지 않는다.
-- 앱이 기존 환자를 모두 암호화한 뒤 2단계(202610190002)에서 평문 컬럼을 삭제한다.
-- 여러 번 실행해도 안전하다.

alter table public.patients
  add column if not exists identity_ciphertext text,
  add column if not exists registration_hmac text;

alter table public.patients alter column registration_number drop not null;
alter table public.patients alter column name drop not null;
alter table public.patients alter column birth_date drop not null;

create index if not exists patients_registration_hmac_idx
  on public.patients (registration_hmac);

comment on column public.patients.identity_ciphertext is
  '이름·등록번호·생년월일 암호문 (v1.<iv>.<ct>, AES-GCM, AAD=환자 id). 키는 기기에만 있다';
comment on column public.patients.registration_hmac is
  'HMAC-SHA256(조회키, 정규화한 등록번호) hex — 서버 Lab import 매칭용';

-- ─────────────────────────────────────────────
-- 키 금고 — 사용자당 하나
-- ─────────────────────────────────────────────
create table if not exists public.patient_identity_vaults (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  version integer not null default 1,
  kdf_salt text not null,
  kdf_iterations integer not null,
  -- 마스터 키를 암호문구로 감싼 값
  passphrase_wrapped_key text not null,
  -- 마스터 키를 복구 코드로 감싼 값
  recovery_wrapped_key text not null,
  -- 기기에 저장해 둔 키가 이 금고의 키인지 확인용 (조회키로 만든 고정 문자열의 HMAC)
  key_check text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists patient_identity_vaults_set_updated_at on public.patient_identity_vaults;
create trigger patient_identity_vaults_set_updated_at before update on public.patient_identity_vaults
for each row execute function public.set_updated_at();

alter table public.patient_identity_vaults enable row level security;

drop policy if exists "patient identity vaults manage own" on public.patient_identity_vaults;
create policy "patient identity vaults manage own"
on public.patient_identity_vaults for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
