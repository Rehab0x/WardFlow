-- ============================================================
-- Lab 데이터 초기화 — 저장된 검사 결과를 전부 지우고 다시 시작한다
-- ============================================================
--
-- ⚠️ 되돌릴 수 없다. 실행 전에 아래를 확인할 것.
--    1) STEP 1을 먼저 실행해 **몇 건이 지워지는지** 눈으로 확인한다
--    2) 남겨야 할 것이 있으면 STEP 2-B(사용자 한정)를 쓴다
--    3) 걱정되면 설정 > 백업에서 스냅샷을 먼저 만든다
--
-- 지워지는 것 : lab_results, lab_items (검사 결과와 그 안의 항목)
-- 남는 것     : 환자, 메모, 투약, 일정, 차팅, 알림 규칙, 백업 스냅샷
--
-- lab_items는 lab_result_id에 ON DELETE CASCADE가 걸려 있어
-- lab_results만 지우면 항목은 따라서 사라진다.
--
-- 실행 위치: Supabase 대시보드 > SQL Editor
-- (SQL Editor는 RLS를 우회하므로 **모든 사용자의** Lab이 대상이 된다.
--  혼자 쓰는 인스턴스면 STEP 2-A, 여러 명이 쓰면 STEP 2-B를 쓸 것)


-- ============================================================
-- STEP 1 — 먼저 이것만 실행해서 규모를 확인한다
-- ============================================================

select
  (select count(*) from public.lab_results)                             as 검사_건수,
  (select count(*) from public.lab_results where deleted_at is not null) as 그중_삭제표시됨,
  (select count(*) from public.lab_items)                               as 항목_건수,
  (select count(distinct patient_id) from public.lab_results)           as 환자_수,
  (select min(test_date) from public.lab_results)                       as 가장_오래된_검사일,
  (select max(test_date) from public.lab_results)                       as 가장_최근_검사일;

-- 소유자별로 몇 건인지 (여러 명이 쓰는 경우 STEP 2-B 대상 확인용)
select
  pr.display_name                as 소유자,
  pr.username                    as 아이디,
  count(lr.id)                   as 검사_건수,
  count(distinct lr.patient_id)  as 환자_수
from public.lab_results lr
join public.patients p  on p.id = lr.patient_id
join public.profiles pr on pr.id = p.created_by
group by pr.display_name, pr.username
order by 검사_건수 desc;


-- ============================================================
-- STEP 2-A — 전부 지운다 (혼자 쓰는 인스턴스)
-- ============================================================
-- STEP 1 숫자를 확인한 뒤, 아래 블록의 주석을 풀고 실행한다.

-- begin;
--   delete from public.lab_results;   -- lab_items는 cascade로 함께 삭제
-- commit;


-- ============================================================
-- STEP 2-B — 특정 사용자의 환자 것만 지운다 (여러 명이 쓰는 경우)
-- ============================================================
-- 'my-username'을 STEP 1에서 확인한 아이디로 바꾼 뒤 주석을 푼다.

-- begin;
--   delete from public.lab_results
--   where patient_id in (
--     select p.id
--     from public.patients p
--     join public.profiles pr on pr.id = p.created_by
--     where pr.username = 'my-username'
--   );
-- commit;


-- ============================================================
-- STEP 3 — 지워졌는지 확인 (0이 나와야 한다)
-- ============================================================

-- select
--   (select count(*) from public.lab_results) as 남은_검사,
--   (select count(*) from public.lab_items)   as 남은_항목;


-- ============================================================
-- STEP 4 (선택) — Lab에서 생성된 알림 기록도 정리
-- ============================================================
-- 알림 이벤트는 Lab 결과를 참조하지만 외래키가 아니라서 그대로 남는다.
-- 지워진 검사 때문에 생겼던 알림을 기록에서도 치우려면 실행한다.
-- (항생제 기간 알림은 'abx|'로 시작하므로 남는다)

-- begin;
--   delete from public.alert_events where dedupe_key like 'lab|%';
-- commit;


-- ============================================================
-- 다시 넣기 전에
-- ============================================================
-- XLS를 같은 파일로 다시 올릴 계획이면, 앱의 Lab 수신함에서
-- "처리 기록 지우기"를 눌러야 한다. 처리 완료 표시는 브라우저
-- localStorage에 있어서 이 SQL로는 지워지지 않는다.
--   설정 경로: Lab XLS 일괄 입력 > Storage 수신함 > 처리 기록 지우기
