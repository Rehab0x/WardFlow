-- 환자별 중요사항 — 환자를 열 때 가장 먼저 눈에 들어와야 하는 메모.
--
-- 태그(tags)나 주의 표시(attention)로는 담기 어려운 문장을 적는 칸이다.
-- 지시오더와 마찬가지로 환자당 현재 내용 하나만 들고 있으면 되므로 컬럼으로 둔다.
--
-- 추가 전용이라 기존 데이터에 영향이 없고, 여러 번 실행해도 안전하다.
alter table public.patients
  add column if not exists important_notes text not null default '';

comment on column public.patients.important_notes is
  '환자별 중요사항 — 요약 탭 최상단에 표시';
