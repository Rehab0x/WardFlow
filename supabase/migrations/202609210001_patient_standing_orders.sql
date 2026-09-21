-- 환자별 지시오더(standing orders) 보관 칸.
--
-- 처방할 때마다 다시 적어 넣는 내용이라 환자 첫 화면(요약 탭)에 둔다.
-- 차팅 필드들과 성격이 같아(환자당 현재 내용 하나) patients에 컬럼으로 붙인다.
--
-- 추가 전용이라 기존 데이터에 영향이 없고, 여러 번 실행해도 안전하다.
alter table public.patients
  add column if not exists standing_orders text not null default '';

comment on column public.patients.standing_orders is
  '환자 지시오더 — 요약 탭에서 편집, 템플릿으로 붙여넣는다';
