-- 1일 필요열량 계산기 입력값을 환자별로 보관한다.
--
-- 키·체중은 계산기 밖에서도 쓸 값이라(용량 계산 등) 각자 컬럼으로 두고,
-- 계수 선택과 박스 on/off는 계산기 화면 상태라 함께 붙인다.
--
-- 전부 추가 전용이고 기본값이 있어, 기존 행과 여러 번 실행에 안전하다.
alter table public.patients
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists nutrition_enabled boolean not null default false,
  add column if not exists nutrition_activity_factor text not null default '',
  add column if not exists nutrition_injury_factor text not null default '';

comment on column public.patients.height_cm is '키(cm). 필요열량 계산 등에 사용';
comment on column public.patients.weight_kg is '체중(kg). 필요열량 계산 등에 사용';
comment on column public.patients.nutrition_enabled is '요약 탭 필요열량 박스를 켜 둔 환자인지';
