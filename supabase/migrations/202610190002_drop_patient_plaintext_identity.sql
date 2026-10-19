-- 환자 식별정보 암호화 — 2단계 (TODO 2.19)
--
-- ⚠️ 1단계(202610190001)를 적용하고, 앱에서 암호를 설정해
--    기존 환자가 모두 암호화된 것을 확인한 뒤에만 적용한다.
--    암호화되지 않은 환자가 하나라도 있으면 아무것도 바꾸지 않고 중단한다.
--
-- 하는 일
-- 1. 평문 이름 · 등록번호 · 생년월일 컬럼과 그 인덱스 삭제
-- 2. 예전 알림 기록(alert_events)의 제목/본문 앞에 붙어 있던 환자 이름(·병실) 제거
--    (지금 앱은 이름을 저장하지 않고 화면에서 붙인다)
--
-- 참고: Supabase 자체 백업(PITR/일일 백업)에는 보존 기간 동안 이전 평문이 남는다.

do $$
begin
  if exists (select 1 from public.patients where identity_ciphertext is null) then
    raise exception
      'patients 중 암호화되지 않은 행이 있습니다. 앱에서 잠금을 해제해 암호화를 마친 뒤 다시 실행하세요.';
  end if;
end
$$;

drop index if exists public.patients_registration_number_idx;
drop index if exists public.patients_name_idx;

alter table public.patients drop column if exists registration_number;
alter table public.patients drop column if exists name;
alter table public.patients drop column if exists birth_date;

-- 예전 형식: title  = '<이름> · <항목> <값>'
--           message = '<병실> <이름> · <항목> ...'
update public.alert_events
set
  title = regexp_replace(title, '^[^·]*·\s*', ''),
  message = regexp_replace(message, '^[^·]*·\s*', '')
where title like '%·%';
