# WardFlow TODO.md

> ⚠️ **이 파일은 프로젝트의 Single Source of Truth입니다.**
> 모든 작업 시작 전 이 파일을 확인하고, 작업 완료 후 반드시 업데이트하세요.
>
> 상태: `[ ]` 미완료 | `[/]` 진행 중 | `[x]` 완료 | `[?]` 결정 대기 | ~~취소선~~ 취소·불필요 판단

---

## 📍 현재 상태 (2026-09-20)

**배포 중**: https://ward-flow.vercel.app · Supabase 단일 백엔드

> ⚠️ **적용 대기 중인 마이그레이션**: `supabase/migrations/202609200001_alert_rules_and_events.sql`
> Supabase SQL 에디터에서 실행해야 알림 기능(3.2)이 켜집니다. 적용 전까지는 조용히 비활성 상태로 동작합니다.

| Phase | 상태 | 비고 |
|------|------|------|
| Phase 1 Foundation | ✅ 완료 | 잔여는 수동 테스트 2건 (성능 측정, 반응형) |
| Phase 2 Smart Input | ✅ 완료 | 캘린더 뷰는 취소, 알림은 3.2로 통합 |
| Phase 3 WardAide AI | ✅ 완료 | 3.1 · 3.2 · 3.3 · 3.4 전부 — **실사용 검증 필요** |
| Phase 4 WardLink 통합 | ⬜ 미착수 | **착수 전 방향 상의 필요** |
| Phase 5 v2 리팩토링 | ✅ 완료 | 문서 동기화까지 완료 |

### 🔴 사용자 액션 필요 (다음 세션 시작 전)
1. **Supabase 마이그레이션 적용** — `supabase/migrations/202609200001_alert_rules_and_events.sql`
   Supabase SQL 에디터에 붙여넣고 실행. 적용 전까지 알림 기능만 조용히 꺼진 상태로 동작한다.
2. **설정 > AI 설정** — 텍스트 LLM API 키 (+ 음성 기능을 쓰려면 Whisper 키)

### 🟡 실사용 검증 대기 (코드는 완성, 실제로 확인 안 됨)
> 전부 mock 기반 테스트만 통과한 상태다. 실기기·실데이터에서 확인해야 하는 것들.

| 항목 | 확인할 것 | 관련 |
|------|----------|------|
| 알림 임계값 | 기본값(Na<130, K>5.5, Cr>2.0, 항생제 14일)이 실제 환자군에 맞는지. 너무 많이/적게 뜨는지 | 3.2 |
| 음성 질의 | 마이크 권한(특히 iOS Safari), 한국어 환자명 인식 정확도, 오인식 이름 보정이 실제로 되는지 | 3.3.1 |
| 간호사 대화 정리 | 타이핑 경로부터 확인(키 1개만 필요). 여러 환자 섞인 대화가 제대로 나뉘는지 | 3.3.2 |
| 근거연결 AI | 제안된 검색어가 쓸 만한지, 링크가 원하는 결과로 가는지 | 3.3.2 |
| Lab 참조범위 | 커스텀 참조범위가 서버 재계산 경로(`labs.repository.updateLabItemValue`)에 반영되는지 | 이슈 테이블 2026-09-19 |
| 첫 화면 성능 | 로그인 → 첫 화면 < 1초 (Supabase 왕복 포함). 기준 자체를 재확인할 필요 | 1.14 |
| 반응형 | Desktop / Tablet / Mobile 레이아웃 | 1.14 |

### 🟢 다음 세션에 할 일
1. 위 검증 결과 반영 (임계값 조정, 프롬프트 튜닝 등)
2. **Phase 4 WardLink 통합** — 착수 전 방향 상의 필요.
   공통 로그인 / 모듈 간 데이터 공유 / WardCare 연동 / EMR API 탐색은 범위가 크고
   WardCare 쪽 상태를 모르는 채로는 설계할 수 없다.
3. (선택) 잔여 개선 — 200줄 초과 컴포넌트 정리, lint 경고 15건(shadcn/ui fast-refresh 권고)

### 이번 세션(2026-09-19 ~ 20)에 한 일
v2 전면 전환 리팩토링(Phase 5) → 문서 동기화 → Lab 서버 API 보안 강화 →
AI 음성 질의 → 알림 고도화 → 간호사 대화 SOAP 분리 → 근거연결 AI.
상세 내역은 아래 이슈/메모 테이블의 2026-09-19 ~ 2026-09-20 항목 참고.

**지표**: 소스 39,732 → **26,731줄** (v1 제거로 크게 줄었다가 Phase 3 신규 기능으로 일부 증가) · 테스트 65 → **277건** · lint 에러 0 · 커밋 13개

---

## Phase 1: Foundation (MVP Core)

### 1.1 프로젝트 셋업 `@Architect`
- [x] Vite + React + TypeScript 프로젝트 초기화 → `package.json`, `vite.config.ts`
- [x] Tailwind CSS + shadcn/ui 설정 → `tailwind.config.ts`, `src/components/ui/`
- [x] ESLint + Prettier 설정 → `.eslintrc.cjs`, `.prettierrc`
- [x] Vitest 설정 → `vitest.config.ts`
- [x] 프로젝트 디렉토리 구조 생성 → PRD 기반 전체 폴더/파일

### 1.2 PWA 기본 구성 `@Architect`
- [x] vite-plugin-pwa 설정 → `vite.config.ts`
- [x] manifest 작성 (vite-plugin-pwa 자동 생성)
- [x] Service Worker 기본 캐싱 전략 → 앱 셸 프리캐시
- [x] 오프라인 상태 감지 훅 → `src/hooks/useOfflineStatus.ts` + Header 인디케이터

### 1.3 DB 스키마 및 인덱싱 `@Architect` ⚡ 성능 핵심
- [x] Dexie.js DB 인스턴스 생성 → `src/db/database.ts`
- [x] 복합 인덱스 스키마 정의 (PRD 7.3절 기반)
- [x] 시드 데이터 작성 (개발/테스트용) → `src/db/seed.ts`
- [x] DB 마이그레이션 전략 → `db.version(N).stores()` 인라인 방식으로 관리 (별도 파일 불필요)

### 1.4 레이아웃 및 라우팅 `@Coder-UI`
- [x] AppShell (반응형 — Desktop 사이드바 / Mobile 하단 네비) → `src/components/layout/AppShell.tsx`
- [x] Sidebar 네비게이션 → `src/components/layout/Sidebar.tsx`
  - [x] 환자 목록으로 재구성 (병실/이름/성별/나이 표시)
  - [x] 환자 카테고리 아코디언 (입원/컨설트/퇴원)
  - [x] 실시간 검색 기능 (병실번호/이름)
  - [x] 모바일 스와이프 제스처 (좌→우로 열기)
  - [x] 사용자 정보 카드 (역할별 아이콘 + 이름 + 역할 + 부서)
  - [x] 헤더 제거 및 사용자 정보 카드 최상단 배치
  - [x] 동적 사이드바 너비 (긴 부서명 대응)
  - [x] 모바일에서 헤더 아래 표시 (top-14, z-40)
  - [x] 환자 클릭 시 항상 개요 탭으로 이동
- [x] BottomNav (모바일) → `src/components/layout/BottomNav.tsx`
- [x] Header → `src/components/layout/Header.tsx`
  - [x] 아이콘 버튼 툴팁 추가 (Today's Note, 설정, 로그아웃)
  - [x] 사용자 정보 제거 (Sidebar로 이동)
- [x] MasterDetail 분할 뷰 → 사이드바(환자목록) + 메인(상세) 구조로 이미 구현
- [x] React Router 라우팅 설정 → `src/App.tsx`
- [x] 코드 스플리팅 (lazy import) → 각 페이지
- [x] shadcn/ui 기본 컴포넌트 추가 (Button, Card, Input, Badge, Tabs, Tooltip)

### 1.5 성능 최적화 기반 `@Architect` ⚡
- [x] PIN 프리페치 훅 → `src/hooks/usePrefetch.ts` (잠금 중 환자+briefing 데이터 미리 로드)
- [x] React.lazy + Suspense 적용 → `src/App.tsx` (이미 적용됨)
- [x] Zustand 스토어 하이드레이션 → PIN 프리페치에서 처리 (잠금 해제 시 데이터 준비 완료)
- [x] Morning Briefing 집계 캐시 → briefingService.ts에서 매 접근 시 fetch (최신 데이터 보장)

### 1.6 PIN 잠금 `@Coder-UI` `@Coder-Logic`
- [x] PIN 잠금 오버레이 UI → `src/pages/PinLockPage.tsx` (숫자 패드, 4자리 자동검증, shake 애니메이션)
- [x] PIN 설정/변경/해제 → `src/pages/SettingsPage.tsx` (현재 PIN 확인 + 새 PIN + 확인)
- [x] 자동 잠금 타이머 → `src/hooks/usePinLock.ts` (Zustand persist, 활동 감지, 설정 가능 1~30분)
- [x] App.tsx ProtectedRoute에 PIN 오버레이 통합
- [x] Header 수동 잠금 버튼 (🔒, PIN 설정 시만 표시)
- [x] PIN 입력 중 프리페치 트리거 연동 (App.tsx에서 usePrefetch(isLocked) 연동 완료)

### 1.7 환자 CRUD `@Coder-Logic` `@Coder-UI`
- [x] Patient 타입 정의 → `src/types/patient.ts`
- [x] User 타입 정의 (다중 사용자 지원) → `src/types/user.ts`
- [x] Zustand 환자 스토어 (복합 인덱스 쿼리) → `src/stores/usePatientStore.ts`
  - [x] 의사별 환자 필터링 (createdBy + sharedWith)
  - [x] 역할별 권한 쿼리 (doctor/nurse/therapist/admin)
- [x] Zustand 인증 스토어 (persist) → `src/stores/useAuthStore.ts`
- [x] 권한 관리 유틸 → `src/utils/permissions.ts`
- [x] 로그인 페이지 → `src/pages/LoginPage.tsx`
  - [x] 개발용 시드 데이터 재로드 버튼 (개발 도구 섹션)
- [x] Protected Route 구현 → `src/App.tsx`
- [x] DB 스키마 v2 (users, authCredentials 테이블 추가, 마이그레이션)
- [x] 회원가입 + 관리자 승인 시스템
  - [x] User 타입 확장 (status, modules, approvedBy, approvedAt)
  - [x] DB 스키마 v6 (users에 status 인덱스, 기존 유저 마이그레이션)
  - [x] 회원가입 페이지 → `src/pages/RegisterPage.tsx` (이름/ID/비밀번호/진료과)
  - [x] useAuthStore register 액션 + 미승인 로그인 차단
  - [x] 관리자 승인 UI → `src/pages/SettingsPage.tsx` (역할 + 모듈 권한 부여)
  - [x] WardLink 모듈 권한 시스템 (wardflow, wardcare 확장 가능)
  - [x] 관리자 회원 관리 UI (전체 회원 테이블, 회원 삭제)
- [x] 환자 목록 페이지 → `src/pages/PatientListPage.tsx`
- [x] 환자 카드 컴포넌트 → `src/components/patient/PatientCard.tsx`
- [x] 환자 목록 (검색/필터/정렬) → `src/components/patient/PatientList.tsx`
- [x] 병실/침상 번호순 정렬 (자연스러운 숫자 정렬)
- [x] 성별 표시 형식 (M/F 영문)
- [x] 퇴원환자 관리
  - [x] 퇴원환자 사이드바 표시 (병실 제거, 퇴원일 표시, 퇴원일 역순 정렬)
  - [x] 재입원 기능 (퇴원환자를 다시 입원/컨설트 상태로 변경)
- [x] 환자 상세 페이지 (탭 구조: 개요/Lab/투약/차팅/메모) → `src/pages/PatientDetailPage.tsx`
  - [x] 헤더 (이름, 성별/나이, 생년월일, 입원일/D-day, 뱃지)
  - [x] 헤더 모바일 반응형 (줄바꿈, 정보 수정 버튼 아이콘만 표시)
  - [x] 5개 탭 구조
  - [x] 개요 탭 (Chief Complaint + Onset, Tags, 알림 박스, 현재 항생제)
  - [x] Onset 날짜 파싱 및 경과 기간 계산 → `src/utils/dateUtils.ts` (parseOnsetDate, calculateOnsetDuration)
  - [x] 상세 나이 계산 (년/월/일) → `src/utils/dateUtils.ts`
  - [x] 탭을 URL 쿼리 파라미터로 관리 (?tab=overview)
  - [x] 트리 구조 네비게이션 (Today's Note → 개요 → 다른 탭)
- [x] 환자 추가/수정/퇴원/재입원 처리 폼
  - [x] PatientForm 컴포넌트 (추가/수정 통합, 모달 방식)
  - [x] 기본 정보 입력 (이름, 생년월일, 성별, 병실/침상) - 등록번호 제거
  - [x] 입원 정보 (입원일, 담당 의사, 환자유형)
  - [x] 태그 기능 (추가/제거)
  - [x] 퇴원 처리 (퇴원일 입력 다이얼로그)
  - [x] 재입원 처리 (병실, 입원일, 환자유형 재설정)
  - [x] Toast 알림 (성공/실패 메시지)
  - [x] 헤더에 "새 환자 추가" 아이콘 버튼 (UserPlus)
  - [x] 사이드바에 "새 환자 추가" 버튼
  - [x] 환자 상세 페이지에 "정보 수정" 버튼 (모달)

### 1.8 차팅 폼 (핵심 기능) `@Coder-UI` `@Coder-Logic`
- [x] ChartingForm (C/C ~ Etc 구조화된 폼) → `src/components/charting/ChartingForm.tsx`
  - [x] 보호자 설명 필드 추가 (Plan과 Etc 사이)
  - [x] Problem List 번호 형식 4가지 지원 (#., #1., •, 없음)
  - [x] 개별 필드 복사 버튼 (각 필드별 Copy 아이콘)
  - [x] 템플릿 붙여넣기 버튼 (각 필드별 FileText 아이콘, 향후 구현 예정)
  - [x] 복사 성공 피드백 (녹색 체크 아이콘 1.5초)
- [x] ResizableTextArea (높이 조절 + 자동 확장) → `src/components/charting/ResizableTextArea.tsx`
- [x] ProblemListEditor (리스트/텍스트 이중 모드) → `src/components/charting/ProblemListEditor.tsx`
- [x] 📋 복사 포맷터 → `src/services/chartingFormatter.ts`
  - [x] formatChartingForCopy() — 전체 차팅 복사 (C/C), Onset)은 같은 줄, 나머지는 줄바꿈)
  - [x] formatSingleField() — 개별 필드 복사
  - [x] Problem List 번호 형식 처리
- [x] "전체 복사" 버튼 (기존 "OCS에 복사" 개명)
- [x] 복사 성공 토스트 알림
- [x] PatientDetailPage 탭 순서 변경 ("차팅" → "차트", 개요 다음 배치)
- [x] 템플릿 시스템 실제 구현 → `src/services/templateService.ts`, `src/stores/useTemplateStore.ts`, `src/components/charting/TemplatePopup.tsx`
- [x] Problem List 번호 형식 앱 설정 연동 → `useChartingSettingsStore` (persist) + SettingsPage 선택 UI

### 1.9 Lab 결과 관리 `@Coder-Logic` `@Coder-UI`
- [x] LabResult 타입 정의 → `src/types/lab.ts`
- [x] Lab 참조범위 데이터 → `src/utils/labReference.ts`
- [x] LAB_DISPLAY_ORDER (항목 순서 정의: CBC → Chemistry → Electrolyte → ESR/CRP → UA → Sediment)
- [x] Lab 결과 테이블 (시계열 형태, 비정상 색상 코딩) → `src/components/lab/LabTable.tsx`
  - [x] 시계열 테이블 (가로=날짜, 세로=항목)
  - [x] 참조치 대비 색상 코딩 (높음=빨강, 낮음=파랑)
  - [x] 셀 클릭 편집 기능 (모달)
  - [x] 항목명 클릭 시 추이 차트 표시
  - [x] Culture 결과 별도 섹션 (날짜별 탭 선택)
  - [x] Culture 결과 수동 추가/수정/삭제 (CRUD)
- [x] Lab 추이 차트 (Recharts) → `src/components/lab/LabChart.tsx`
  - [x] 비정상 값 색상 구분 (높음=빨강, 낮음=파랑)
  - [x] 참조범위 회색 밴드 표시
  - [x] 모바일 반응형 헤더
- [x] Lab 입력 방식 드롭다운 (붙여넣기/파일 업로드)
- [x] 환자 등록번호 필수 필드 추가 (외부 Lab 파일 매칭용)
  - [x] DB 스키마 v3 (registrationNumber 필수화, 인덱스 추가)
  - [x] PatientForm에 등록번호 필드 추가 (기본 정보 최상단)
  - [x] 시드 데이터 등록번호 추가 (p1~p4)
- [x] Culture 결과 시드 데이터 (Sputum, Blood)
- [x] Lab 수동 입력 폼 제거 (셀 편집으로 대체, import 제거 완료)
- [x] Lab 붙여넣기 파싱 (스프레드시트 형식) → Phase 2.1에서 구현 완료
- [x] Lab 파일 업로드 (XLS) → Phase 2.1 bulkLabImport에서 구현 완료

### 1.10 투약 관리 `@Coder-Logic` `@Coder-UI`
- [x] Medication 타입 정의 (timing 필드 포함) → `src/db/database.ts`
- [x] 투약 목록 표시 (항생제/처방약/지참약 구분) → `src/components/medication/MedicationList.tsx`
- [x] OCS 처방 붙여넣기 파싱 (timing 추출) → `src/components/medication/MedicationPasteInput.tsx`
- [x] 투약 파서 (정규식, timing 파싱) → `src/services/parser/medParser.ts`
- [x] 약물명 → 네이버 의약품사전 링크 (handleDrugClick)
- [x] 항생제 D-day 자동 계산 및 표시 (14일 이상 경고)
- [x] 투약 수정 모달 (MedicationForm: 하루 용량/용법/투약시간/타이밍)
- [x] 투약 삭제 (개별 + 카테고리별 전체 삭제)
- [x] 항생제 History 섹션 (종료된 항생제 표시, 수정/삭제 가능)
- [x] 항생제 endDate 자동 isActive 처리 (과거 종료일 → History로 자동 이동)

### 1.11 회진 메모 `@Coder-UI` `@Coder-Logic`
- [x] Note 타입 정의 → `src/types/note.ts` (이미 존재)
- [x] Zustand 메모 스토어 → `src/stores/useNoteStore.ts`
- [x] 메모 입력 에디터 (내용/태그/유형) → `src/components/note/NoteEditor.tsx`
- [x] 메모 목록 (시간순, 필터링) → `src/components/note/NoteList.tsx`
- [x] 태그 기능 (#TODO, #중요 등 - 추가/삭제/필터링)
- [x] 메모 유형별 필터링 (회진/경과/할 일)
- [x] 통합 컴포넌트 → `src/components/note/NoteTab.tsx`
- [x] Textarea UI 컴포넌트 → `src/components/ui/textarea.tsx`
- [x] PatientDetailPage 메모 탭 통합
- [x] 전체 환자 메모 검색 → Today's Note 검색바 (환자명/병실/메모 내용 검색)

### 1.12 Today's Note 대시보드 + 사이드바 플래그 `@Coder-Logic` `@Coder-UI`
- [x] Briefing 데이터 집계 서비스 → `src/services/briefingService.ts` (DB 직접 쿼리)
- [x] Today's Note 대시보드 UI → `src/pages/HomePage.tsx` (알림/항생제/Lab 3섹션)
- [x] 사이드바 플래그 시스템 → `src/hooks/useSidebarFlags.ts`
  - [x] 항생제 투여 환자 (노란색 박스 + 💊 아이콘)
  - [x] 오늘 알림 환자 (파란색 박스 + 🔔 아이콘)
  - [x] Attention 수동 체크 환자 (빨간색 박스 + ⚠️ 아이콘)
- [x] Patient.attention 필드 추가 + 개요 탭 토글 스위치
- ~~알림 엔진 → `src/services/alertEngine.ts`~~ / ~~Morning Briefing AI 분석~~
  → **3.2 알림 고도화로 일원화** (2.5·3.2·3.3.2에 같은 항목이 중복돼 있었음). `alertEngine.ts`는 만들어진 적 없음

### 1.13 반응형 (모바일) `@Coder-UI`
- [x] 전체 패딩/간격 모바일 대응 (p-3 sm:p-6 패턴)
  - [x] HomePage (Today's Note)
  - [x] PatientDetailPage (탭 콘텐츠)
  - [x] SettingsPage
  - [x] NoteTab
  - [x] PinLockPage (숫자 패드 크기 조정)
- [x] 탭 수평 스크롤 (5개 탭 overflow-x-auto)
- [x] BottomNav 개선 (환자 목록 버튼 추가 → 사이드바 열기)
- [x] 항생제 테이블 모바일 → 카드 리스트 (sm:hidden / hidden sm:block)
- [x] 기존 구현: 사이드바 스와이프, 헤더 반응형, 모바일 overlay

### 1.14 QA / 테스트 `@Reviewer`
- [x] 투약 파싱 정확도 테스트 → `src/services/parser/medParser.test.ts` (16 tests)
- [x] 날짜 유틸 테스트 → `src/utils/dateUtils.test.ts` (26 tests)
- [x] 차팅 포맷터 테스트 → `src/services/chartingFormatter.test.ts` (13 tests)
- ~~DB 인덱스 쿼리 성능 테스트 → `src/db/database.perf.test.ts`~~ — Dexie 제거로 삭제 (Phase 5.3)
- [x] 컴포넌트 렌더 스모크 테스트 → `PatientWorkspace.test.tsx`(탭 6개 + 전환), `TodayDashboard.test.tsx`, `ChartingTab.test.tsx` (Phase 5.9)
- [x] 미저장 변경 플래그 동작 테스트 → `unsavedState.test.tsx` (Phase 5.10)
- ~~PIN → 첫 화면 렌더 성능 측정~~ — PIN 잠금 제거로 대상 없음 (Phase 5.2)
- [ ] **로그인 → 첫 화면 렌더 성능 측정 (< 1초)** — 수동 측정. Supabase 왕복이 들어가므로 기준 재확인 필요
- ~~오프라인 동작 테스트 (Service Worker)~~ — 오프라인 우선 아키텍처 폐기, PWA도 기본 비활성. 필요해지면 Phase 4에서 재정의
- [ ] 반응형 레이아웃 테스트 — 수동 테스트 영역 (Desktop / Tablet / Mobile)

---

## Phase 2: Smart Input (Phase 1 완료 후)

### 2.1 Lab 스마트 파싱 `@Coder-Logic`
- [x] XLS(BIFF) 파일 리더 (cp949) — xlsx 라이브러리 사용 (SheetJS)
- [x] 검사코드 매핑 테이블 → `src/services/parser/labCodeMap.ts` (B-codes + D-codes + extractCleanName)
- [x] Lab 파싱 엔진 → `src/services/parser/labParser.ts` (XLS + 텍스트 붙여넣기)
- [x] 파싱 미리보기 UI → `src/components/lab/LabParseInput.tsx` (붙여넣기 + 파일 드래그앤드롭)
- [x] 텍스트 복사-붙여넣기 파싱 (탭구분 D-code 형식 지원, Low/High 플래그)
- [x] 병원 XLS 일괄 입력 서비스 → `src/services/bulkLabImport.ts` (자동화 에이전트 지원)
- [x] 병원 XLS 일괄 입력 UI → `src/components/lab/BulkLabImport.tsx` (헤더 FlaskConical 버튼)
- [x] Lab 카테고리 시스템 → `src/services/labCategoryService.ts` (CBC/LFT/Electrolyte/CRP/UA/HBs 등)
- [x] DB v5 labCategories 테이블 추가 → `src/db/database.ts`
- [x] 설정 페이지 Lab 카테고리 편집 UI → `src/pages/SettingsPage.tsx`
- [x] LabTable 카테고리 섹션 헤더 표시 (카테고리별 그룹화)

### 2.2 CSV/엑셀 업로드 `@Coder-Logic`
- [x] XLS 파일 업로드 (Phase 2.1에서 구현 완료)
- [x] 텍스트 붙여넣기 파싱 (Phase 2.1에서 구현 완료)
- ~~CSV 파서~~ — XLS + 붙여넣기로 충분, 불필요 판단

### 2.3 템플릿 시스템 `@Coder-UI` `@Coder-Logic`
- [x] Template 타입 정의 (templateService.ts 내 인라인 정의)
- [x] 템플릿 CRUD 서비스 → `src/services/templateService.ts`
- [x] 템플릿 팝업 다이얼로그 → `src/components/charting/TemplatePopup.tsx` (필드별 + 전체 필터, 저장/삭제)
- [x] 차팅 폼 FileText 버튼 연동 → `src/components/charting/ChartingForm.tsx`
- [x] 복사 포맷 커스텀 설정 UI → `useChartingSettingsStore` (persist) + SettingsPage
  - [x] Problem List 번호 형식 (#. / #1. / • / 없음)
  - [x] 섹션 간격 (빈 줄 / 줄바꿈만)
  - [x] 필드명 포함 여부 토글
  - [x] 빈 섹션 제외 토글
  - [x] 섹션 이름 커스텀 (C/C, PI, Plan 등 편집 + 기본값 리셋)

### 2.4 일정 관리 `@Coder-UI` `@Coder-Logic`
- [x] Schedule 타입 (DB에 이미 정의됨) + Zustand 스토어 → `src/stores/useScheduleStore.ts`
- [x] ScheduleSection 컴포넌트 → `src/components/schedule/ScheduleSection.tsx`
  - [x] 일정 추가 폼 (제목/날짜/시간/카테고리/메모)
  - [x] 일정 목록 (예정/과거/완료 분리)
  - [x] 완료 체크 토글 + 삭제
  - [x] 카테고리 뱃지 (외진/재활/검사/기타)
- [x] 환자 상세 개요 탭에 일정 섹션 통합
- [x] Today's Note에 오늘 일정 카드 추가 (briefingService 확장)
- [x] 일정 카테고리 커스텀 설정 → `useScheduleCategoryStore` (persist) + SettingsPage 편집 UI
  - [x] 카테고리 추가/수정/삭제 (이름 + 색상 10종)
  - [x] DB Schedule.category를 string으로 유연화
- ~~일정 페이지 → `src/pages/SchedulePage.tsx` (전체 환자 일정 캘린더뷰)~~
  — **사용자 결정 (2026-09-19): 캘린더 뷰 제거.** v2에서는 환자별 일정 탭 + Today 일정 카드로 대체

### 2.5 알림 고도화 → **3.2로 통합** (항목 중복 제거, 2026-09-19)
> 같은 내용이 1.12·2.5·3.2·3.3.2 네 군데에 흩어져 있어 3.2 한 곳으로 합쳤다.

---

## Phase 3: WardAide — AI

### 3.1 AI 기반 (멀티 LLM) `@Architect` `@Coder-Logic` — 완료
- [x] AI 멀티 LLM 설정 (Claude/GPT/Gemini/Grok, 모델 선택, API 키, 연결 테스트) → `src/stores/useAIStore.ts`
- [x] AI 통합 호출 서비스 (Anthropic + OpenAI호환 + Gemini API) → `src/services/aiService.ts`
- [x] AI SOAP 변환 (경과기록 → S/O/A/P, 개별 섹션 복사) → `src/components/ai/AIAssistButton.tsx`
- [x] AI Lab 요약 (최근 Lab → 임상 요약)
- [x] AI 인수인계 요약 (전체 환자 컨텍스트 → 인수인계 보고서)
- [x] AI 투약 체크 (투약 × Lab 교차 분석 → 안전성 알림)
- [x] AI 날짜 선택 (date picker + 퀵 버튼, 선택 날짜 기준 데이터)
- [x] 설정 페이지 AI 설정 UI

### 3.2 알림 고도화 `@Coder-Logic` (1.12 · 2.5 · 3.3.2의 알림 항목을 여기로 통합) — ✅ **구현 완료 (2026-09-20)**
> ⚠️ **마이그레이션 적용 필요**: `supabase/migrations/202609200001_alert_rules_and_events.sql`
> 적용 전까지 알림 기능은 조용히 비활성 상태로 동작한다(읽기는 빈 결과, 쓰기는 안내 메시지).
- [x] 스키마 설계 — `alert_rules`(규칙) + `alert_events`(히스토리), 둘 다 `owner_id` 스코프 + `can_read_patient` RLS 이중 방어
  - [x] `(owner_id, dedupe_key)` 유니크 제약으로 같은 근거의 중복 알림 차단
  - [x] 규칙 종류별 필수 필드를 DB CHECK 제약으로 보장
  - [x] 규칙을 지워도 히스토리는 남도록 `rule_id`는 `on delete set null` + `rule_name` 보존
- [x] 커스텀 알림 규칙 설정 — Lab 임계값(`< ≤ > ≥`, 참조범위 이탈) + 항생제 사용 일수
  - [x] 설정 > 알림 규칙 UI (추가/삭제/사용 토글, 자주 쓰는 규칙 4개 일괄 추가)
- [x] 규칙 평가 엔진 → `src/services/alertEngine.ts` (순수 함수, 테스트 14건)
  - [x] Lab: 검사 결과+항목 단위로 dedupe / 항생제: 약제 코스 단위로 dedupe(매일 반복 안 뜸)
  - [x] 평가 시점은 Today 로딩 시 — 서버 크론 없이 "열면 다시 판정" 모델
- [x] 알림 히스토리 — Today에 규칙 알림 섹션, 확인 처리/개별 삭제/확인분 일괄 정리
- [x] AI 기반 Morning Briefing 분석 → `analyzeBriefing()` + Today의 "AI 오늘 브리핑" 패널 (알림·할 일·항생제·Lab을 묶어 먼저 볼 환자 정리)
- [x] **마이그레이션 미적용 대비** — `42P01`(relation does not exist)을 감지해 읽기는 빈 결과로 degrade, 쓰기는 안내 메시지. 테스트 5건으로 고정

### 3.3 AI 추가 기능 — ✅ 완료

#### 3.3.1 AI 음성 질의 — 회진 중 자연어 조회 ✅ **완료 (2026-09-20)**

> "장영임님 소듐 요즘 어땠지?" 같은 음성 질문에 기존 Lab/투약 데이터를 조회해 텍스트+그래프로 답한다.
> 설계 배경/결정 사항은 `CLAUDE.md`의 "기능 스펙: AI 음성 질의" 섹션 참고. 새 DB 테이블 불필요 — read-only 조회 기능.
>
> **재사용 전제 충족 확인 (2026-09-19)**: `useLabStore.getLabTrendData()` ✅ / `LabChart.tsx` ✅ (Phase 5.4에서 v2로 포팅) /
> 플로팅 버튼 자리 `AppShell` ✅ / `aiService.callAI()`·`generateSOAP()` 패턴 ✅ → 아래 `[?]`만 정하면 바로 착수 가능.

- [x] Whisper API 키 저장 위치 결정 — **사용자 결정 (2026-09-20): `useAIStore`에 `whisperApiKey` 필드 추가**
  - 근거: 지금 필요한 건 필드 1개뿐이고, 설정 > AI 설정 한 곳에서 키를 모두 입력하는 편이 자연스럽다
  - AI 설정은 localStorage에만 저장되고 Supabase로 동기화하지 않는다(현행 유지) — API 키를 서버에 올리지 않는 기존 방침을 따른다
  - 구현 범위: **TODO 명세 전체** (녹음 → STT → 파싱 → 조회 → 텍스트/차트 응답)
- [x] STT 연동 → `src/services/sttService.ts`
  - [x] MediaRecorder로 오디오 녹음 (webm/opus)
  - [x] Whisper API 호출 (`prompt`에 의료 용어 힌트: "소듐, 칼륨, 크레아티닌, 항생제, 헤모글로빈")
  - [x] SettingsPage에 Whisper API 키 입력 UI 추가
- [x] 자연어 → 구조화 질의 파싱 → `aiService.ts`에 `parseVoiceQuery(transcript, patientNames)` 추가
  - [x] 시스템 프롬프트: 활성 환자 명단을 컨텍스트로 전달해 발음 오차 보정 매칭
  - [x] 출력 스키마: `{ patientName: string|null, queryType: 'lab'|'medication'|'unknown', item: string|null }`
  - [x] JSON 파싱 실패 대비 처리 (마크다운 코드펜스 제거 등)
- [x] 조회 로직 → `src/hooks/useVoiceQuery.ts` (신규 훅)
  - [x] patientName → patientId 매핑 (`usePatientStore.patients` exact match)
  - [x] `queryType === 'lab'` → 기존 `useLabStore.getLabTrendData()` 재사용
  - [x] `queryType === 'medication'` → 기존 `useMedicationStore` 조회
  - [x] 매칭 실패/`unknown` 시 안내 메시지 분기
- [x] UI 구현
  - [x] `src/components/voice/VoiceQueryButton.tsx` — 플로팅 마이크 버튼 (AppShell에 전역 배치, 특정 환자 페이지 비종속)
  - [x] `src/components/voice/VoiceQueryOverlay.tsx` — 녹음 중→STT 텍스트→답변(텍스트 + 기존 `LabChart` 재사용) 단계별 표시
  - [x] 녹음 실패/STT 실패/매칭 실패 각각 다른 에러 안내
- [x] 원본 음성/STT 텍스트 미저장 확인 (응답 생성 직후 폐기, DB 기록 없음)
- [x] 테스트 26건 — `aiService.voiceQuery.test.ts`(10: 코드펜스/프로즈 섞인 JSON 복구, 명단에 없는 이름 거부, 잘못된 필드 방어), `useVoiceQuery.test.ts`(9: Lab/투약 응답, 활성 환자만 명단 전달, 단계별 에러, reset 시 transcript 폐기, 마이크 해제), `sttService.test.ts`(7: 키 미설정, 한국어·의료 용어 프롬프트 전달, 401/429/5xx/네트워크/빈 결과 분기)

#### 3.3.2 기타 AI 추가 기능 (예정)

- [x] **근거연결 AI** ✅ (2026-09-20) — 환자 Problem List·투약·Lab을 보고 **검색 방향**을 제안
  - [x] `suggestEvidence()` — 확인할 임상 질문 + 영어 검색어/검색식 + 참고 기관(IDSA/KDIGO 등) + 주의점
  - [x] **인용을 만들지 않는다** — LLM은 문헌 검색을 못 하므로 논문 제목·저자·연도·DOI·PMID 생성을 프롬프트에서 금지. 실제 근거는 PubMed / Google Scholar / UpToDate 링크로 사용자가 직접 확인
  - [x] 환자 워크스페이스 요약 탭에 `EvidencePanel` 배치
  - [x] 테스트 13건 — `aiService.evidence.test.ts`(7), `EvidencePanel.test.tsx`(6, 링크 생성·면책 문구·실패 처리 포함)
- [x] **간호사 대화 → 환자별 SOAP 자동 분리** ✅ (2026-09-20)
  - [x] **입력 2가지를 동등 지원** — 녹음(Whisper) / **직접 입력**(전화 인계처럼 녹음이 어려울 때). 직접 입력은 Whisper 키 없이도 동작하며 기본 모드다 (사용자 요청)
  - [x] 세그멘테이션 프롬프트 → `aiService.segmentConversation()` — 한 대화에 섞인 여러 환자를 나누고 각각 S/O/A/P 생성. 대화에 없는 항목은 비워 두게 강제(추측 금지)
  - [x] 환자명 환각 차단 — 음성 질의와 동일하게 실제 활성 환자 명단에 있는 이름만 통과, 나머지는 `null`로 두고 사용자가 직접 선택
  - [x] 검토 UI — 환자별 SOAP 초안 편집, 환자 재지정, 선택한 것만 저장. 환자 미지정 조각은 선택 해제 상태로 시작
  - [x] 저장은 기존 메모 경로 재사용 (`handleAddNoteForPatient` 신설 — 선택 환자와 무관하게 저장)
  - [x] 대화 원문·음성 미저장 (사용자가 고른 SOAP 초안만 메모로 남음)
  - [x] 테스트 23건 — `aiService.conversation.test.ts`(9), `useConversationNotes.test.ts`(9), `ConversationInput.test.tsx`(5) (3.3.1 파이프라인 검증 후 재사용 예정 — STT/aiService 패턴 동일, 세그멘테이션 프롬프트만 신규)

### 3.4 Lab 서버 API 엔드포인트 — ✅ **완료** (2026-09-19)
> TODO에는 미착수로 남아 있었지만 `api/lab-import.ts`가 이미 프로덕션에 배포되어 동작 중이다.
- [x] `POST /api/lab-import` 서버 엔드포인트 → `api/lab-import.ts` + `src/services/server/storageLabImportApi.ts`
- [x] 호스팅 선택 — **Vercel Serverless**로 확정·구현
- [x] 흐름: Storage 스캔 → XLS 파싱 → 환자 매칭(등록번호) → Lab 저장
- [x] 인증: `LAB_IMPORT_API_KEY` 헤더 검증 (Vercel Production Secret으로 설정됨)
- [x] 처리 완료 파일 관리 — `deleteAfterProcessing` 옵션
- ~~백업 다운로드 → 복호화 → … → 재암호화 → 업로드~~
  — Dexie 암호화 백업 시절 설계. 지금은 Supabase에 직접 쓰므로 불필요
- [x] **rate limit 추가** → `src/services/server/rateLimit.ts` (슬라이딩 윈도우 60초/10회, 429 + `Retry-After`)
  - 인스턴스 메모리 기반이라 전역 상한은 보장하지 않음 — 한계를 코드 주석에 명시. 엄격한 제한이 필요해지면 Supabase/Upstash로 이전
- [x] **로그 마스킹** → `src/services/server/logMasking.ts` (이름/등록번호/ID/파일명/에러 메시지)
  - 응답 본문은 마스킹하지 않음 (인증된 호출자는 미매칭 행을 알아야 함), **로그에만** 적용
- [x] **인증 fail-closed 전환** — `LAB_IMPORT_API_KEY` 미설정 시 예전에는 인증을 통째로 건너뛰어 엔드포인트가 공개됐음. 이제 503으로 거부
- [x] 상수 시간 키 비교, 인증 실패는 rate limit 할당량을 소모하지 않도록 순서 조정
- [x] 내부 오류 원문이 응답에 노출되지 않도록 정리 (입력 검증 오류만 원문 유지)
- [x] 등록번호 매칭을 `lib/registrationNumber`로 통일 (서버 모듈에 남아 있던 3번째 중복 정의 제거)
- [x] 테스트 19건 — `rateLimit.test.ts`(4), `logMasking.test.ts`(6), `api/lab-import.test.ts`(9)

---

## Phase 4: WardLink Integration (Phase 3 완료 후)
- [ ] 공통 로그인 시스템
- [ ] 모듈 간 데이터 공유
- [ ] WardCare 연동
- [ ] EMR API 연동 탐색

---

## Phase 5: v2 전면 전환 리팩토링 (완료 — 2026-09-19)

> **배경**: `/` 는 이미 v2 셸(`V2AppPage`)로 동작하지만, v1 UI·라우트와 Dexie 이중 백엔드가 그대로 남아 있다.
> `docs/rebuild-plan.md` 10단계 중 9~10단계("Remove direct Dexie usage", "Dexie는 캐시로만")가 미완이었다.
> **사용자 결정 (2026-09-19)**: ① Dexie 완전 제거 — Supabase 전용 ② v1 전용 기능 중 **Lab 추이 차트 + AI 3종만 v2로 포팅** (캘린더/범용 알림/오프라인 인디케이터는 제거) ③ PIN 잠금 완전 제거.

### 5.1 v1 UI/라우트 제거 `@Coder-UI`
- [x] `App.tsx` 레거시 라우트 제거 (`/legacy`, `/legacy/settings`, `/patients/:patientId`, `/calendar`, `/v2` 프리뷰)
- [x] 레거시 페이지 삭제 → `HomePage.tsx`, `PatientDetailPage.tsx`, `SchedulePage.tsx`
- [x] 디자인 프리뷰 목업 삭제 → `src/pages/v2/V2PreviewPage.tsx` (가짜 데이터 + localStorage, 인증 없음)
- [x] 레거시 레이아웃 삭제 → `components/layout/{AppShell,Sidebar,Header,BottomNav}.tsx`
- [x] 레거시 도메인 컴포넌트 삭제 → `components/{dashboard,patient,note,schedule}/*`, `components/medication/*`, `components/charting/{ChartingForm,ProblemListEditor,ResizableTextArea}.tsx`, `components/lab/{LabTable,LabManualInput}.tsx`
- [x] 레거시 전용 스토어/훅 삭제 → `useGlobalAlertStore`, `useOfflineStatus`, `useSidebarFlags`
- [x] 삭제 후 import 도달성 재검증 (죽은 파일 0개)

### 5.2 PIN 잠금 제거 `@Coder-Logic`
- [x] `hooks/usePinLock.ts`, `pages/PinLockPage.tsx`, `components/settings/PinSettings.tsx` 삭제
- [x] `App.tsx` PIN 오버레이/`usePrefetch(isLocked)` 정리
- [x] `lib/settingsNavigation.ts`에서 PIN 섹션 제거 + 테스트 갱신
- [x] `db` PIN 자격증명 의존 제거

### 5.3 Dexie 이중 백엔드 제거 — Supabase 전용 `@Architect` ⚡
- [x] 스토어 분기 제거 (`if (useSupabaseBackend)`) → `usePatientStore`, `useNoteStore`, `useMedicationStore`, `useLabStore`, `useScheduleStore`, `useAuthStore`, `useTemplateStore`
- [x] 서비스 분기 제거 → `briefingService`, `bulkLabImport`, `labCategoryService`, `templateService`, `backupService`
- [x] 레거시 백업 경로 제거 → `services/backupService.ts` + `components/settings/LegacyBackupSettings.tsx` (Supabase 스냅샷만 유지)
- [x] `src/db/` 전체 삭제 (`database.ts`, `seed.ts`, `resetDb.ts`, `database.perf.test.ts`)
- [x] `db/database.ts`가 내보내던 앱 레벨 타입을 `src/types/`로 이관 (Patient, Medication, LabResult, Note, Schedule …)
- [x] `mappers/legacy*.mapper.ts` → `*View.mapper.ts`로 재명명 (도메인 ↔ 뷰모델 매퍼로 역할 명확화)
- [x] `config/backend.ts` 정리 — `dataBackend` 스위치 제거, Supabase 필수화
- [x] `main.tsx` 개발용 Dexie 헬퍼(`resetDatabase`/`seedDatabase`) 제거
- [x] `package.json`에서 `dexie`, `dexie-react-hooks` 제거
- [x] `.env.example`에서 `VITE_DATA_BACKEND` 제거

### 5.4 v1 전용 기능 v2로 포팅 `@Coder-UI` `@Coder-Logic`
- [x] Lab 추이 차트 → Lab 탭에서 항목명 클릭 시 `LabTrendDialog` (참조범위 회색 밴드 유지)
  - [x] recharts를 `React.lazy` 동적 청크로 분리 — `manualChunks`에 나열하면 엔트리 정적 그래프로 잡혀 `modulepreload`가 붙으므로 목록에서 제외 (첫 화면 −105kB gzip)
- [x] AI Lab 요약 → Lab 탭
- [x] AI 투약 체크 → 약제 탭
- [x] AI 인수인계 요약 → 환자 워크스페이스 **요약 탭** (`generateHandoff`가 환자 단위 API라 Today가 아닌 환자별 배치)
- [x] 기존 `services/aiService.ts` 함수 재사용, 공용 `AiActionPanel`로 통합 (버튼→로딩→에러→결과→복사/저장)

### 5.5 거대 파일 분해 (200줄 규칙) `@Coder-UI` `@Architect`
- [x] `PatientWorkspace.tsx` (2,380줄) → 탭 6개 + 폼 4개 + 섹션 2개 + 순수 로직 2개로 분리 (최대 287줄)
- [x] `AppPage.tsx` (1,825 → 371줄) → `useBriefingData` / `useClinicalWriters` / `usePatientWriters` + `features/app/*` 분리
- [x] `TodayDashboard.tsx` (624 → 138줄) → Metrics / TaskList / DomainSections / todayTasks 분리
- [x] 500줄 초과 잔여 파일 점검 — 남은 것은 모두 비컴포넌트 모듈 (`labParser` 684, `backupSnapshotService` 623, `labs.repository` 473, 생성 파일 `types/supabase.ts` 435)

### 5.6 검증 `@Reviewer`
- [x] `npm run type-check` 통과
- [x] `npx vitest run` 전체 통과 — **177 tests / 31 files** (기존 131 → Dexie 성능 테스트 10건 제거, 신규 38건 추가)
- [x] `npm run build` 통과
- [x] `npm run lint` **에러 0** (경고 15건은 shadcn/ui fast-refresh 권고 등 기존 항목)
- [x] 삭제된 기능에 대한 죽은 테스트 정리
- [x] 도달 불가 파일 0개 재확인 (import 그래프 검증)
- [x] 신규 테스트: `workspaceInput`(7), `workspaceData`(5), `todayTasks`(6), `patientDraft`(11), `optimisticBriefing`(5), `registrationNumber`(4)

### 5.7 문서 동기화 `@Manager`
- [x] `CLAUDE.md` 프로젝트 구조/기술 스택/설계 원칙을 현재 코드 기준으로 갱신 (Dexie → Supabase, v2 구조 반영)
- [x] `README.md` 기능/스택 갱신
- [x] `docs/handoff.md`에 v2 전환 완료 체크포인트 추가
- [x] `PRD.md` 갱신 — 7장(기술 요구사항)·8장(개발 페이즈)·9장(제약사항) 재작성
  - [x] 7.1 스택: Dexie → Supabase, 배포 대상 명시
  - [x] 7.2 PWA/오프라인 정책 재작성 (오프라인 우선 폐기 사유 + 재검토 시점)
  - [x] 7.3 Dexie 복합 인덱스 전략 → **Supabase 쿼리 전략**(컬럼 명시 select, 활성 환자 스코프, `.in()` 청크, RLS), 성능 지표를 네트워크 왕복 포함 기준으로 재조정, 쓰기 후 갱신 전략 추가
  - [x] 7.4 보안: Supabase Auth + RLS 기준으로 재작성, PIN·로컬 전용 항목 취소 표기
  - [x] 2.6 Today 대시보드 / 6.3 화면 구성을 v2 실제 레이아웃으로 갱신
  - [x] 8장 페이즈별 완료 상태 + 취소 항목 사유 반영, 9장 제약사항 정정
  - [x] 4장 머리말에 "스키마 원본은 `supabase/migrations/`" + `Alert` 미구현 명시

### 5.8 등록번호 중복 판정 통일 `@Architect` `@Coder-Logic`
> **사용자 결정 (2026-09-19)**: "4532"와 "0000004532"는 같은 환자이므로 환자 등록 시 **중복으로 판정해야 한다**.
> 기존에는 환자 등록(정확 일치)과 Lab import(앞자리 0 제거) 기준이 달라 같은 차트번호가 중복 통과됐다.
- [x] 공용 정규화 함수 신설 → `src/lib/registrationNumber.ts` (trim + 앞자리 0 제거)
- [x] `features/app/patientIndexes.ts` 인덱스 구축에 적용
- [x] `features/app/patientDraft.ts` 중복 검증에 적용
- [x] `services/bulkLabImport.ts` 환자 매칭을 공용 함수로 교체 (중복 정의 제거)
- [x] 단위 테스트 갱신/추가

### 5.9 차팅 탭 렌더 회귀 수정 `@Coder-Logic` `@Reviewer`
> 사용자 제보: 차팅 탭 진입 시 화면이 비어 있음. 5.4에서 차팅 설정 연동을 붙이며 들어간 회귀.
- [x] 원인 규명 — `useChartingSettingsStore((s) => s.getCopyFormat())`가 selector마다 새 객체를 반환해 `useSyncExternalStore` 무한 렌더 루프 (Maximum update depth exceeded)
- [x] `useChartingCopyFormat()` 훅 신설 — 원시값 단위 구독 + `useMemo`로 참조 고정
- [x] 전 스토어 selector 전수 점검 (`isConfigured()`는 boolean 반환이라 안전)
- [x] 회귀 테스트: `PatientWorkspace.test.tsx` 6개 탭 렌더 스모크 + 탭 전환 (수정 되돌리면 실패하는 것 확인)
- [x] `TodayDashboard.test.tsx` 렌더/필터/검색 스모크 추가
- [x] 접근성 개선: 지표 타일 그룹 `aria-label="오늘 지표"`, 할 일 필터 그룹 `aria-label="할 일 필터"`

### 5.10 미저장 변경 플래그 오탐 수정 `@Coder-UI` `@Reviewer`
> 사용자 제보: 환자 선택 → 요약 탭에서 다른 메뉴로 이동할 때마다 "저장하지 않은 변경이 있습니다" 경고가 뜨고, 요약 탭에 미저장 마크가 남아 있음. 실제로 고친 것은 없음.
- [x] 원인 규명 — `dirty`는 PatientWorkspace의 단일 boolean인데 ① 탭이 언마운트돼도 내려가지 않고 ② `useEffect(() => setTab(initialTab))`(딥링크)와 환자 전환은 `handleTabChange`를 거치지 않아 초기화를 건너뜀. 결과적으로 이전 탭/환자의 입력 상태를 요약 탭이 물려받음
- [x] 각 탭에 언마운트 cleanup 추가 — 플래그는 "현재 마운트된 탭"의 것
- [x] `PatientWorkspace`에서 환자 전환·외부 탭 변경 시 플래그 초기화
- [x] 회귀 테스트 `unsavedState.test.tsx` 6건 (오탐 4건 + 정상 경고 동작 2건)

### 5.11 TODO 정리 — 낡은 항목 정리 및 중복 제거 `@Manager`
> v2 전환으로 전제가 사라졌는데 남아 있던 항목들과, 네 군데에 흩어져 있던 알림 항목을 정리.
- [x] 알림 항목 4중 중복(1.12 · 2.5 · 3.2 · 3.3.2) → **3.2 한 곳으로 통합**
- [x] PIN 렌더 성능 측정 취소 → "로그인 → 첫 화면 < 1초"로 재정의
- [x] 오프라인 동작 테스트 취소 (오프라인 우선 아키텍처 폐기, PWA 기본 비활성)
- [x] 일정 캘린더 뷰 취소 (사용자 결정)
- [x] Dexie 성능 테스트 항목 취소, Phase 5에서 추가한 렌더 테스트 반영
- [x] **3.4 Lab 서버 API 실제 상태 반영** — 미착수로 적혀 있었으나 `api/lab-import.ts`가 이미 배포·동작 중. 잔여는 rate limit·로그 마스킹 2건
- [x] 3.3.1 음성 질의 재사용 전제 충족 여부 확인 표기
- [x] 문서 상단에 현재 상태 요약 추가, Phase 5 하위 섹션 번호순 재배치

---

## 이슈 / 메모
> 작업 중 발견된 이슈, 결정 사항, 보류 항목을 기록

| 날짜 | 이슈 | 상태 | 담당 |
|------|------|------|------|
| 2026-03-05 | Phase 1.1~1.3 완료. 프로젝트 셋업, PWA 구성, Dexie.js 복합 인덱스 스키마 완료. 빌드 및 타입 체크 성공. | ✅ 완료 | @Architect |
| 2026-03-06 | Phase 1.4 완료. shadcn/ui 컴포넌트(Button, Card, Input, Badge), 레이아웃(Header, Sidebar, BottomNav, AppShell) 구현 완료. Desktop-First 반응형 네비게이션 동작. | ✅ 완료 | @Coder-UI |
| 2026-03-06 | Phase 1.7 기본 완료. Zustand 환자 스토어, PatientCard, PatientList(검색/정렬), PatientListPage 구현 완료. 시드 데이터 로드 기능 추가. | ✅ 완료 | @Coder-Logic + @Coder-UI |
| 2026-03-07 | **UX 대폭 개선 완료**: ① 사이드바를 환자 목록으로 재설계 (병실/이름/M/F/나이 컴팩트 표시) ② 환자 카테고리 아코디언 (입원/컨설트/퇴원, 입원만 기본 펼침) ③ 실시간 검색 (병실번호/이름, 즉시 필터링) ④ 모바일 스와이프 제스처 (좌→우로 사이드바 열기) ⑤ 병실번호순 자연스러운 정렬 ⑥ 성별 M/F 영문 표시. Desktop/Mobile 모두 동작 확인. | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-07 | Sidebar.tsx 초기 onOpen props 누락으로 런타임 에러 발생 → 즉시 수정. | ✅ 해결 | @Coder-UI |
| 2026-03-08 | **로그인 및 권한 시스템 구축 완료**: ① User 타입 정의 (doctor/nurse/therapist/admin) ② DB v2 스키마 (users, authCredentials 테이블 추가, 기존 환자에 createdBy/sharedWith 추가) ③ 복합 인덱스 [createdBy+status+roomBed] 추가 ④ useAuthStore (Zustand persist) ⑤ 권한 관리 (canViewPatient, canEditPatient) ⑥ LoginPage 구현 ⑦ Protected Route ⑧ 의사별 환자 필터링 (doctor1은 p1, p2만 표시) ⑨ 시드 데이터 (4명 테스트 사용자). | ✅ 완료 | @Architect + @Coder-Logic |
| 2026-03-08 | **환자 상세 페이지 구현**: ① 5개 탭 구조 (개요/Lab/투약/차팅/메모) ② 헤더 (이름, 성별/나이, 생년월일+상세나이, 입원일+D-day, 뱃지) ③ 개요 탭 (진단명, Quick Stats) ④ calculateDetailedAge() 유틸 (44년 1개월 15일 형식). | ✅ 완료 | @Coder-UI |
| 2026-03-08 | **Header/Sidebar UI 최종 개선**: ① Header에 아이콘 버튼 툴팁 추가 (Today's Note, 앱 설정, 로그아웃) ② Tooltip 컴포넌트 추가 (@radix-ui/react-tooltip) ③ Sidebar 헤더 제거, 사용자 정보 카드를 최상단 배치 ④ 역할별 아이콘 (의사=청진기, 간호사=하트, 치료사=UserCog, 관리자=방패) ⑤ 한 줄 레이아웃 (아이콘 + 이름 + 역할 + 부서) ⑥ 동적 사이드바 너비 (부서명 4글자 초과 시 w-72, 이하 w-64) ⑦ 모바일 닫기 버튼을 사용자 카드 우측에 배치. WardFlow 로고 중복 제거. | ✅ 완료 | @Coder-UI |
| 2026-03-08 | **차팅 폼 핵심 기능 완료 (Phase 1.8)**: ① "차팅" 탭 → "차트"로 개명, 개요 다음 배치 ② 보호자 설명 필드 추가 (Plan-Etc 사이) ③ 복사 포맷 변경 (C/C), Onset) 같은 줄, 나머지 줄바꿈) ④ Problem List 번호 형식 4가지 (#., #1., •, 없음) ⑤ "전체 복사" 버튼 ⑥ 개별 필드 복사 버튼 (모든 필드에 Copy 아이콘, 툴팁) ⑦ 템플릿 붙여넣기 버튼 플레이스홀더 (FileText 아이콘) ⑧ 복사 성공 피드백 (녹색 체크 1.5초) ⑨ formatSingleField() 유틸 구현. | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-08 | **환자 CRUD 완료 (Phase 1.7)**: ① PatientForm 컴포넌트 (추가/수정 통합) ② 기본 정보/입원 정보 입력 ③ 태그 기능 ④ 퇴원 처리 다이얼로그 ⑤ Toast 알림 시스템 추가 (useToast, Toast, Toaster) ⑥ 헤더에 UserPlus 아이콘 버튼 ⑦ 사이드바에 "새 환자 추가" 버튼 ⑧ 환자 상세 페이지 "정보 수정" 버튼 ⑨ 로그인 페이지 자동 시드 데이터 로드. | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-09 | **Phase 1.7 추가 완료 - 퇴원환자 관리 및 UX 개선**: ① 퇴원환자 사이드바 표시 변경 (병실 제거, 퇴원일 표시, 퇴원일 역순 정렬) ② 재입원 기능 (퇴원환자 → 입원/컨설트 상태로 변경 가능) ③ 등록번호 필드 제거 ④ 환자 수정을 모달 방식으로 변경 (라우팅 문제 해결) ⑤ 개발용 시드 데이터 재로드 버튼 (로그인 페이지). | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-09 | **환자 상세 페이지 UX 개선 완료**: ① 개요 탭에 Chief Complaint + Onset 표시 (차팅 데이터 연동) ② Onset 날짜 파싱 및 경과 기간 자동 계산 (parseOnsetDate, calculateOnsetDuration) ③ 헤더 모바일 반응형 개선 (줄바꿈, 버튼 아이콘만 표시) ④ 모바일 사이드바 위치 수정 (헤더 아래 표시, z-index 조정) ⑤ 탭을 URL 쿼리 파라미터로 관리 (?tab=overview) ⑥ 트리 구조 네비게이션 (Today's Note → 개요 → 다른 탭) ⑦ 사이드바에서 환자 클릭 시 항상 개요 탭으로 이동. | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-13 | **Lab 결과 관리 핵심 기능 완료 (Phase 1.9)**: ① 시계열 테이블 구조 (가로=날짜, 세로=항목) ② 참조치 대비 색상 코딩 (높음=빨강, 낮음=파랑) ③ 항목명 클릭 → 추이 차트 (Recharts, 참조범위 회색 밴드) ④ 셀 클릭 편집 모달 (TODO: 저장 로직) ⑤ LAB_DISPLAY_ORDER (CBC → Chemistry → Electrolyte → ESR/CRP → UA → Sediment) ⑥ Culture 결과 별도 섹션 (날짜별 탭 선택, Specimen/Culture & ID/Sensitivity) ⑦ Lab 입력 드롭다운 (붙여넣기/파일 업로드, 파싱은 Phase 2.1) ⑧ 환자 등록번호 필수 필드 추가 (DB v3, 외부 Lab 파일 매칭용) ⑨ Culture 시드 데이터 2건 (Sputum, Blood). | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-13 | Lab 파싱 (스프레드시트 붙여넣기, XLS/CSV 업로드)은 Phase 2.1로 보류. 현재는 셀 편집 방식으로 데이터 입력. | 보류 → Phase 2.1 | @Coder-Logic |
| 2026-03-13 | 다음 작업: 투약 관리 (Phase 1.10) 또는 회진 메모 (Phase 1.11) | 대기 | @Coder-UI + @Coder-Logic |
| 2026-03-16 | **Phase 1.10~1.11 완료**: ① 투약 관리 완료 (항생제 History 수정 가능, endDate 자동 isActive 처리) ② 회진 메모 완료 (유형별/태그별 필터링, CRUD 전체 기능). Vite HMR 이슈로 인해 Edit 도구 실패 시 사용자 직접 수정 필요. | ✅ 완료 | @Coder-UI + @Coder-Logic || 2026-03-16 | **Phase 1.10~1.11 완료**: ① 투약 관리 완료 (항생제 History 수정/삭제, endDate 자동 isActive 처리, timing 필드 파싱) ② 회진 메모 완료 (유형별/태그별 필터링, CRUD, NoteTab 통합). **Edit 도구 실패 원인**: 사용자 IDE 파일 열람 중 자동 저장 충돌. 해결: 수정 시 IDE에서 파일 닫기. | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-17 | **회진 메모 날짜 지정 기능 추가**: ① 메모 작성/수정 시 날짜 선택 가능 (기본값: 오늘) ② 시간대 문제 해결 (UTC→로컬 시간으로 변경, toISOString() 제거) ③ Edit 도구 지속 실패로 general-purpose Agent 사용하여 파일 수정 성공. | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-17 | **메모 시스템 재설계 완료 (DB v4)**: ① Note 타입 변경 (tags 제거, type을 progress/reminder로 변경, alertDate 추가) ② Patient 타입에 tags 필드 추가 (환자 주의사항용) ③ NoteEditor/NoteList/NoteTab 모두 수정 ④ useNoteStore 타입 정의 개선 (NoteInput/NoteUpdateInput) ⑤ 시드 데이터 업데이트. **Today's Note 연동은 향후 작업**. | ✅ 완료 | @Architect + @Coder-UI + @Coder-Logic |
| 2026-03-19 | **Phase 1.8 템플릿 시스템 + Phase 2.1 Lab 스마트 파싱 완료**: ① 템플릿 CRUD 서비스 + Zustand 스토어 ② 차팅 폼 FileText 버튼 → TemplatePopup 다이얼로그 (필드별/전체 필터, 저장/삭제) ③ labCodeMap.ts D-codes 추가 (D-codes 병원 내부 코드: WBC~HBs) + extractCleanName() (한국어 긴 이름 → 짧은 영문명) ④ labParser.ts XLS 파서 (실제 병원 컬럼 구조 확인: col[5]=차트번호, [6]=접수일, [8]=검사코드, [10]=검사명, [11]=수치결과, [12]=문자결과(Culture), [13]=H/L, [15]=참고치) ⑤ LabParseInput.tsx 붙여넣기+파일 드래그앤드롭 UI ⑥ bulkLabImport.ts 순수 서비스 레이어 (자동화 에이전트 지원, 차트번호 매칭 + 앞자리 0 제거) ⑦ BulkLabImport.tsx 3단계 UI (업로드→미리보기→완료) ⑧ Lab 카테고리 시스템 (DB v5 labCategories, labCategoryService, SettingsPage 편집 UI) ⑨ LabTable 카테고리 섹션 헤더 표시. | ✅ 완료 | @Coder-Logic + @Coder-UI |
| 2026-03-19 | **Lab 테이블 UX 버그 수정 및 Culture CRUD 구현**: ① 카테고리 헤더 sticky 수정 (colSpan 방식 → 개별 td로 교체, 가로 스크롤 시 카테고리명 고정) ② AST/ALT/PLT 등 약칭 카테고리 매칭 수정 (buildDisplayOrderMap에서 " (" 이전 짧은 별칭도 등록) ③ UA 정성항목 비정상 하이라이팅 추가 (pH/S.G/Color 제외, 값 ≠ "-/neg/음성" 이면 빨간색) ④ Culture XLS 파싱 수정 (전체 문자결과 저장, \r\n 정규화) ⑤ 박윤종 환자 "not found" 레이스 컨디션 수정 (patientsLoading 가드 추가) ⑥ bulkLabImport upsert 구현 (재임포트 시 중복 방지: 같은 환자+날짜+카테고리 삭제 후 재추가) ⑦ Culture 결과 수동 CRUD (LabTable에 추가/수정/삭제 버튼, 날짜 수정 가능). | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-20 | **회원가입 + 관리자 승인 시스템 구현**: ① User 타입 확장 (status: pending/approved/rejected, modules: WardLinkModule[]) ② DB v6 스키마 (users에 status 인덱스, 기존 유저 approved 마이그레이션) ③ RegisterPage (이름/ID/비밀번호/비밀번호확인/진료과, 가입 신청 → pending) ④ useAuthStore register 액션 + 미승인 로그인 차단 (pending/rejected 메시지) ⑤ SettingsPage 관리자 승인 UI (대기 유저 목록, 역할 선택, WardLink 모듈 권한 부여, 승인/거절) ⑥ 관리자 회원 관리 UI (전체 회원 테이블: 이름/ID/진료과/역할/모듈/상태/가입일, 회원 삭제 기능) ⑦ LoginPage 회원가입 링크 ⑧ App.tsx /register 라우트 추가. WardLink 플랫폼 확장 대비 모듈 권한 시스템 설계. | ✅ 완료 | @Architect + @Coder-UI + @Coder-Logic |
| 2026-03-21 | **모바일 반응형 개선 (Phase 1.13)**: ① 전체 페이지 패딩 모바일 대응 (p-3 sm:p-6 패턴: HomePage, PatientDetail, Settings, NoteTab, PinLock) ② 탭 수평 스크롤 (overflow-x-auto, 5개 탭 모바일 대응) ③ BottomNav에 환자 목록 버튼 추가 (사이드바 열기 콜백) ④ 항생제 테이블 모바일 카드 리스트 (sm:hidden/hidden sm:block) ⑤ PIN 숫자 패드 크기 모바일 조정. | ✅ 완료 | @Coder-UI |
| 2026-03-21 | **PIN 잠금 시스템 구현 (Phase 1.6)**: ① usePinLock.ts (Zustand persist 스토어 + 자동 잠금 타이머 + 활동 감지 이벤트 + PIN DB 검증) ② PinLockPage.tsx (숫자 패드 UI, 4자리 자동 검증, shake 애니메이션, 키보드 입력 지원, 로그아웃 버튼) ③ App.tsx ProtectedRoute에 PIN 오버레이 통합 ④ SettingsPage PIN 설정/변경/해제 UI (현재 PIN 확인 + 자동 잠금 시간 1~30분 설정) ⑤ Header 수동 잠금 버튼 (PIN 설정 시만 표시). | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-21 | **Today's Note 대시보드 + 사이드바 플래그 시스템 구현**: ① briefingService.ts (DB 직접 쿼리로 전체 환자 알림/항생제/Lab 집계) ② HomePage.tsx 실제 대시보드 구현 (3개 카드: 오늘 알림, 항생제 현황 D-day, 최근 Lab + 비정상 항목 표시, 클릭→환자 상세 이동) ③ useSidebarFlags.ts 훅 (bulk DB 조회로 항생제/알림 플래그) ④ 사이드바 3색 플래그 (빨간=Attention ⚠️, 파란=알림 🔔, 노란=항생제 💊, 우선순위 적용) ⑤ Patient.attention 필드 추가 + 개요 탭 토글 스위치 ⑥ 시드 데이터 보강 (이영희 항생제 2건+Lab, 알림 메모 3건, 김철수 attention). | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-22 | **QA 테스트 + Phase 2 완료 + UI 개선**: ① Vitest 단위 테스트 55개 (medParser/dateUtils/chartingFormatter) ② 설정 페이지 재구성 (관리자 3섹션 → 1 Card+탭, 전체 Card 통일) ③ 의사별 환자 현황 탭 ④ 헤더 아이콘 순서/크기 최적화 ⑤ BottomNav 사이드바 닫기 연동 ⑥ Phase 1 잔여: PIN 프리페치 연동 완료, Problem List 설정 연동, Lab 수동입력 폼 정리 ⑦ Phase 2.2 CSV 불필요 판단 ⑧ Phase 2.3 차팅 복사 포맷 커스텀 설정 (섹션 간격/필드명 토글/섹션명 커스텀) ⑨ Phase 2.4 일정 관리 (useScheduleStore + ScheduleSection + Today's Note 일정 카드 + briefingService 확장) ⑩ 일정 카테고리 커스텀 설정 (useScheduleCategoryStore + SettingsPage 편집 UI, 색상 10종). 2.5 알림 고도화는 Phase 3로 이관. | ✅ 완료 | @Reviewer + @Coder-UI + @Coder-Logic |
| 2026-03-23 | **v1.0.0 Release + Vercel 배포**: ① 1.11 전체 환자 메모 검색 (Today's Note 하단 검색바) ② 1.14 DB 성능 테스트 10건 추가 (총 65 tests) ③ 1.3/1.5/1.9 잔여 항목 완료 ④ 1.4 MasterDetail 완료 ⑤ PatientListPage/PatientList/PatientCard 제거 (사이드바로 통합) ⑥ **디자인 전면 개선**: Primary 딥 티얼, 카드 rounded-xl+hover shadow, 헤더 딥 티얼+흰색 아이콘, WardFlow 로고 Righteous 폰트+그라데이션 ⑦ **AES-256 암호화 백업/복원**: 파일(.wardflow)+텍스트 클립보드 전송+매일 백업 알림 토글 ⑧ 헤더 아이콘 클릭 시 사이드바 자동 닫기 ⑨ Copyright Neokuns 고정 푸터 ⑩ **TypeScript 에러 63개→0개** (미사용 import 12개 제거, 타입 안전성 100%) ⑪ 불필요 파일 삭제 ⑫ **첫 가입자 자동 관리자 승인** (DB 비어있을 때 admin+approved 자동 부여, 가입 폼에 안내 배너) ⑬ 로그인 페이지 개발 도구/테스트 계정 `import.meta.env.DEV` 분기 (프로덕션 빌드에서 자동 제거) ⑭ .gitignore 정리 (*.wardflow, .claude/, WORK_LOG, *.xls, *.bak) ⑮ **GitHub 커밋 v1.0.0 태그 + Vercel 배포 완료** (git author Rehab0x 수정, force push). | ✅ 완료 | @Reviewer + @Coder-UI + @Coder-Logic + @Architect |
| 2026-03-25 | **v1.0.1 Release — 버그 수정 + UX 개선 + 캘린더**: ① Culture 파싱 개선 (CRE-Urine "No growth" 정상 분류, inferCategory에서 cre→cre- 좁힘, categoryFromMap 기반 Culture 판별) ② HbA1c 파싱 수정 (Culture 오분류 방지, textResult에서 첫 번째 숫자 추출, labCodeMap에 B1270/D0127000 추가) ③ Lab 차트 수정 (itemCode 없어도 itemName 폴백 매칭, 문자열 숫자 parseFloat 변환) ④ Lab 날짜 관리 (날짜 추가 버튼 + 날짜별 전체 삭제, LabTable onAddDate/onDeleteDate) ⑤ 사이드바 Menu 버튼 안정화 (터치 영역 44x44px, stopPropagation) ⑥ 환자 태그 디자인 (amber 색상 뱃지, 테두리+굵은 글씨) ⑦ Today's Note 항생제 종료 임박 표시 (오늘 종료=빨강, 내일 종료=주황 뱃지) ⑧ **캘린더 뷰** (SchedulePage 월간 달력, 일정+알림 메모 통합 표시, 날짜 클릭→상세 리스트, 이벤트→환자 이동, BottomNav+사이드바 접근) ⑨ **PWA 아이콘** (SVG 디자인 W+하트레이트, PNG 9종+apple-touch-icon+favicon, manifest 업데이트, apple meta tags) ⑩ useScheduleStore.fetchAll 추가. | ✅ 완료 | @Coder-UI + @Coder-Logic + @Architect |
| 2026-03-26 | **v1.0.2 Release — Lab 셀 편집 수정 + 서버 동기화**: ① **Lab 셀 편집 구현** (updateLabItemValue 스토어 함수 추가, Enter/저장 버튼으로 DB 반영, 비정상 플래그 자동 재계산) ② **빈 Lab 셀 값 추가** (Culture 레코드 건너뛰기, non-Culture 레코드에 item 추가, 해당 날짜에 레코드 없으면 새로 생성) ③ **Supabase 서버 동기화** (supabaseClient.ts, backups 테이블, AES 암호화→Base64→upsert, 동기화 키 기반 업로드/다운로드) ④ 설정 페이지 서버 동기화 UI (동기화 키+비밀번호 입력, 서버 확인/업로드/다운로드 버튼, 마지막 업로드 시간 표시) ⑤ **초기 로드 개선** (AppShell에서 fetchPatients 선행 호출, 환자 클릭 시 빈 화면 문제 완화). | ✅ 완료 | @Coder-Logic + @Coder-UI + @Architect |
| 2026-03-27 | **v1.0.3 Release — 다수 버그 수정 + UX 대폭 개선**: ① Lab 수정 시 H/L 색상 유지 (참조범위 기반 isAbnormal/hlFlag 재계산) ② Lab 값 삭제 시 `-` 표시 (아이템 제거) ③ Lab 차트 날짜 하루 밀림 수정 (toISOString→로컬 날짜) ④ HbA1c NGSP 값만 추출 (Culture 오분류 방지, B3120 카테고리 Chemistry) ⑤ 항생제 endDate 자동 비활성화 (fetchMedicationsByPatient+briefingService에서 만료 체크) ⑥ 사이드바 다중 카테고리 열림 (컨설트/퇴원 동시 표시) ⑦ 사이드바 환자 hover 시 Tag 툴팁 ⑧ Today's Note 오늘의 회진 섹션 (progress 메모 한줄 표시) ⑨ 알림 한줄 truncate ⑩ 항생제 현황 클릭→투약 탭 이동 (medication 오타 수정) ⑪ 사이드바 플래그 실시간 반영 (refreshSidebarFlags 글로벌 트리거) ⑫ Problem List 수정/순서변경 (인라인 편집, ArrowUp/Down) ⑬ Onset 복사 시 경과기간 괄호 제거 ⑭ 보호자 설명 필드 저장 수정 (initialData 누락) ⑮ UA Leukocyte B-code/D-code 추가 ⑯ Urine Sediment 카테고리 통일 + Crystal/Cast 추가 ⑰ Micro 접두사 NAME_ALIASES 매핑 ⑱ Today's Note 범용 알림 (추가/수정/삭제, 기간 설정, localStorage persist) ⑲ 서버 동기화 버튼 모바일 반응형 (flex-wrap) ⑳ 지참약 종료/현재 구분 (CircleOff→종료, RotateCcw→재활성화, 종료 목록) ㉑ 아이디 기억하기 체크박스 + 비밀번호 자동 포커스. | ✅ 완료 | @Coder-UI + @Coder-Logic + @Architect |
| 2026-03-29 | **v1.0.4 Release — 범용 알림 관리 + 캘린더 색상 + Lab 자동 Import + 백업 확장**: ① **범용 알림 관리 모달** (전체 목록 활성/만료 구분, 수정/삭제, 새 알림 추가) ② **범용 알림 캘린더 연동** (날짜 범위 내 모든 날에 도트/라벨 표시, Megaphone 아이콘) ③ **CRE Urine No growth Culture 분류** (textResult에 growth/sensitivity/resistant 포함 시 Culture 판별) ④ **백업 v7** (templates DB 테이블 + localStorage 설정 5종 포함: 차팅/일정카테고리/범용알림/캘린더색상/인증) ⑤ **항생제 현황 환자 그룹화** (데스크톱 rowSpan, 모바일 환자별 카드) ⑥ **모바일 환자 로딩 fallback** (store 없으면 DB 직접 조회 directPatient) ⑦ **Hook 순서 수정** (useMemo를 early return 전으로 이동) ⑧ **캘린더 색상 커스텀** (useCalendarColorStore persist, 10가지 프리셋, 설정 페이지 색상 picker) ⑨ **투약 bulk 저장** (bulkAddMedications: 단일 트랜잭션, refreshSidebarFlags 1회) ⑩ **Lab Import Inbox** (labImportInbox.ts 로컬 폴더 스캔, LabImportInbox.tsx UI, 폴더 핸들 IndexedDB 영구 저장) ⑪ **Supabase Storage inbox** (storageInbox.ts, StorageLabInbox.tsx, curl 업로드→WardFlow 가져오기) ⑫ **/lab-import 전용 페이지** (공개 라우트 PIN 불필요, 서버 데이터 다운로드 + Storage/로컬 듀얼 모드, autoRun) ⑬ **서버 동기화 키 localStorage persist** (설정 페이지 입력 시 자동 저장, lab-import에서 읽기). | ✅ 완료 | @Coder-UI + @Coder-Logic + @Architect |
| 2026-04-01 | **v1.0.5 Release — Phase 3 AI 기능 + Culture 재설계 + Lab 참조범위 + 설정 리뉴얼**: ① **AI 멀티 LLM 지원** (useAIStore: Claude/GPT/Gemini/Grok 4종, 모델 선택, API 키 관리, 연결 테스트) ② **AI SOAP 변환** (경과기록 메모 → S/O/A/P 구조화, 개별 섹션 복사 버튼, 환자 컨텍스트 자동 수집) ③ **AI Lab 요약** (최근 Lab 데이터 → 임상적 요약, 비정상 추이 분석) ④ **AI 인수인계 요약** (전체 환자 컨텍스트 → 인수인계 보고서: 진단/투약/Lab/메모/일정 통합) ⑤ **AI 투약 체크** (투약 × Lab 교차 분석 → 신기능/간기능/전해질 주의사항, 약물 상호작용) ⑥ **AI 날짜 선택** (date picker + 경과기록 있는 날짜 퀵 버튼, 선택 날짜 기준 SOAP/Lab 생성) ⑦ **Culture 모달 재설계** (Specimen 드롭다운 + Culture&ID + Sensitivity 3필드 구조) ⑧ **Culture 표시 재설계** (날짜별 그룹화, Specimen이 카드 제목, 하위 항목으로 분리) ⑨ **Lab 참조범위 설정** (useLabReferenceStore persist, 기본값+오버라이드, 설정 페이지 테이블 편집, 커스텀 항목 추가) ⑩ **LabTable 실시간 색상** (store 기반 참조범위 체크, DB 플래그 fallback) ⑪ **설정 페이지 리뉴얼** (데스크톱 좌측 사이드 네비 + 모바일 수평 탭, 10개 섹션 앵커 스크롤) ⑫ SOAP 프롬프트 개선 (Subjective 등 제목 제거, 파서에서도 자동 strip) ⑬ 경과기록 날짜 비교 UTC→로컬 수정 ⑭ 백업에 AI 설정 + Lab 참조범위 포함. | ✅ 완료 | @Architect + @Coder-UI + @Coder-Logic |
| 2026-04-03 | **v1.0.6 Release — Lab 파싱 간소화 + 질적 값 유지 + 최근 Lab 현황**: ① **OCS 붙여넣기 파싱 간소화** (검사명+값 2컬럼만으로 파싱 가능, parseTabLine 최소 2컬럼 지원, parseSpaceLine에 코드 없는 케이스 추가, buildItemFromNameValue 헬퍼, placeholder 간단 예시) ② **질적 Lab 값 유지** (PURE_NUMERIC regex로 순수 숫자만 판별, "1+", "2+", "trace" 등 문자열 그대로 저장, valueStr로 통일) ③ **최근 Lab 현황 카드** (getRecentLabStatus 서비스 추가, 활성 환자별 최신 Lab 날짜 집계, 날짜 그룹화 + 오래된 순 정렬, 빨강=없음/주황=3일+/초록=최근, BulkLabImport 업로드 단계 상단 표시) ④ **항생제 표시 변경** (D+N → N+1일, "사용 기간"이 임상적으로 더 의미있음, MedicationList+PatientDetailPage+HomePage 3곳 적용). Lab 파싱 자동화 동작 확인(정상), 서버 API 엔드포인트는 향후 논의로 보류. | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-03-18 | **개요 탭 알림 시스템 구현 및 날짜 버그 전면 수정**: ① 개요 탭 Quick Stats 카드(Lab/투약/메모 갯수) 제거 ② 개요 탭 최상단 알림 박스 추가 (C/C 위, 앰버 색상) — 오늘 알림 메모(reminder) + 오늘/어제 Lab 결과 유무 표시 ③ Lab 알림 표시 형식: "어제 (2026-03-17) Lab 결과가 있습니다." ④ **날짜 timezone 버그 전면 수정**: `formatDate()` 유틸을 `toISOString()` 대신 로컬 시간 기준으로 수정, `LabTable.tsx` 날짜 키 생성 시 toISOString() → formatDate() 교체, `LabManualInput.tsx` 기본값 및 저장 시 `parseLocalDate()` 적용 ⑤ Tags 카드 제목 "주의사항 (Tags)" → "Tags" 단순화 및 빈 상태 문구 수정. | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-05-16 | **Clinical Calm v1 디자인 시스템 마이그레이션 (Today's Note + Header)**: ① 신규 컴포넌트 `src/components/dashboard/StatCard.tsx` + `src/components/dashboard/SectionCard.tsx` (Row/Room/Time/Body/Pill/Metric 헬퍼) ② Header 시안 banner 제거 → `bg-white/85 backdrop-blur-md` + Stethoscope + WardFlow zinc 톤, 모바일 햄버거/오프라인 인디케이터/모든 핸들러 보존 ③ HomePage 전면 리팩터 (기존 Zustand/Dexie 로직 그대로, 렌더링만 교체): Today H1 + 4 StatCard + 2×2 SectionCard (알림/항생제/최근 Lab/일정), 항생제 D-day Pill tone (≤5 muted / 6-9 warning / ≥10 또는 isLongTerm danger), 빈 상태도 행 구조 유지 ④ `src/index.css` HSL 변수 cyan(199 89% 38%) → zinc-900(240 6% 10%) 재튜닝, 배경 zinc-50, ring zinc-400, body에 `font-feature-settings: 'tnum'` 추가 ⑤ indigo 액센트 시도 후 사용자 피드백으로 원상복구 (DESIGN.md v1 유지) ⑥ Header.tsx.bak, HomePage.tsx.bak 백업 보관 ⑦ 빌드/타입체크/테스트 65개 통과. ESLint 9 vs `.eslintrc.cjs` 불일치는 사전 이슈. | ✅ 완료 | @Coder-UI + @Coder-Logic |
| 2026-09-19 | **Phase 5 v2 전면 전환 리팩토링 완료**: ① v1 UI/라우트 전면 제거 (`HomePage`/`PatientDetailPage`/`SchedulePage`/`V2PreviewPage`/레거시 레이아웃·도메인 컴포넌트 삭제, `/`만 남김) ② `components/v2`·`pages/v2` → 정식 경로로 승격 (`AppShellV2`→`AppShell`, `V2AppPage`→`AppPage`) ③ **Dexie 완전 제거** (스토어 6 + 서비스 5의 `useSupabaseBackend` 분기 제거, `src/db/` 삭제, 앱 레벨 타입을 `src/types/`로 이관, `legacy*.mapper`→`*View.mapper` 재명명, `dexie`/`dexie-react-hooks`/`fake-indexeddb` 의존성 제거) ④ PIN 잠금 제거 (`usePinLock`/`PinLockPage`/`PinSettings`, 설정 네비에서 PIN·캘린더 색상 섹션 제거) ⑤ 레거시 백업 경로 제거 (Supabase 스냅샷만 유지) ⑥ **Lab 추이 차트 + AI 3종 포팅** (공용 `AiActionPanel` 신설, recharts는 lazy chunk로 분리) ⑦ **차팅 OCS 복사가 차팅 설정을 실제로 반영하도록 수정** (v2가 자체 포맷터를 쓰고 있어 설정이 무시되던 문제) ⑧ 거대 파일 분해 (`PatientWorkspace` 2,380→287, `AppPage` 1,825→371, `TodayDashboard` 624→138) ⑨ ESLint 9 정리 (`.eslintrc.cjs` 삭제, `any` 8곳 제거 → **에러 0**) ⑩ 신규 단위 테스트 33건 (총 154). 소스 39,732줄 → 23,060줄. type-check/test/build/lint 모두 통과. | ✅ 완료 | @Manager + @Architect + @Coder-UI + @Coder-Logic + @Reviewer |
| 2026-09-19 | **등록번호 중복 판정 통일 (Phase 5.8)**: 환자 등록(`validatePatientDraft`)은 정확 일치, Lab 일괄 입력(`bulkLabImport`)은 앞자리 0 제거로 기준이 달라 "4532"와 "0000004532"가 Lab에서는 같은 환자인데 등록 시에는 중복으로 걸리지 않았다. **사용자 결정: 중복으로 판정해야 함.** `src/lib/registrationNumber.ts`에 `normalizeRegistrationNumber()`(trim + 앞자리 0 제거, 전부 0이면 "0" 유지)를 신설하고 환자 인덱스·중복 검증·Lab import 매칭이 모두 이 함수를 쓰도록 통일. `bulkLabImport`의 중복 정의(raw/stripped 이중 인덱싱) 제거. 테스트 `registrationNumber.test.ts`(4건) 추가 + `patientDraft.test.ts` 갱신. | ✅ 완료 | @Architect + @Coder-Logic |
| 2026-09-19 | Lab 셀 편집 시 참조범위 기반 H/L 재계산이 서버(`labs.repository.updateLabItemValue`)에 있다. v1에서 스토어가 하던 계산 로직은 Dexie 제거와 함께 사라졌으므로, 참조범위 커스텀 설정(`useLabReferenceStore`)이 이 경로에 반영되는지 확인 필요. **사용자 결정: 배포 후 실사용하며 판단.** | 🔶 배포 후 확인 | @Reviewer |
| 2026-09-19 | **TODO 정리 (Phase 5.11)**: v2 전환으로 무의미해진 항목 5건 취소(PIN 렌더 측정·오프라인 테스트·캘린더 뷰·Dexie 성능 테스트·암호화 백업 경유 Lab import 흐름), 네 군데 중복이던 알림 항목을 3.2로 통합, **3.4 Lab 서버 API가 실제로는 이미 배포·동작 중임을 코드로 확인**해 상태 정정(잔여: rate limit·로그 마스킹), 3.3.1 음성 질의 재사용 전제 충족 확인, 문서 상단 현재 상태 요약 추가. | ✅ 완료 | @Manager |
| 2026-09-19 | **Lab 서버 API 보안 강화 (Phase 3.4 완료)**: ① **인증 fail-closed 전환** — `LAB_IMPORT_API_KEY` 미설정 시 인증을 건너뛰어 서비스 롤 권한의 쓰기 엔드포인트가 공개되던 구조를 503 거부로 변경 ② rate limit 추가(60초/10회, 429 + `Retry-After`, 인스턴스 메모리 한계 주석 명시) ③ 로그 마스킹(`logMasking.ts` — 이름/등록번호/ID/파일명/에러 숫자열). 응답은 그대로 두고 로그에만 적용 ④ 상수 시간 키 비교, 인증 실패가 정상 호출자 할당량을 깎지 않도록 순서 조정 ⑤ 내부 오류 원문 응답 노출 차단 ⑥ 서버 모듈에 남아 있던 등록번호 매칭 3번째 중복 정의를 `lib/registrationNumber`로 통일. 테스트 19건 추가 (총 196). | ✅ 완료 | @Coder-Logic + @Reviewer |
| 2026-09-20 | **AI 음성 질의 구현 (Phase 3.3.1)**: ① `useAIStore`에 `whisperApiKey` 추가(사용자 결정) + 설정 > AI 설정에 입력 UI, 키 없으면 마이크 버튼 자체를 숨김 ② `sttService.ts` — MediaRecorder 녹음 + Whisper API(한국어 + 의료 용어 프롬프트 힌트), 실패 지점을 `SttError.stage`로 구분해 UI가 다른 안내를 띄우도록 함 ③ `aiService.parseVoiceQuery()` — 활성 환자 명단을 컨텍스트로 넘겨 STT 이름 오인식 보정, **명단에 없는 이름은 코드에서 거부**(LLM 환각 차단), 코드펜스/프로즈 섞인 JSON 복구 ④ `useVoiceQuery.ts` — 녹음→STT→파싱→조회 전체 플로우, Lab은 `getLabTrendData()` + `LabChart` 재사용, 투약은 `useMedicationStore` 재사용 ⑤ `VoiceQueryButton`(플로팅) + `VoiceQueryOverlay`(단계별 표시, 차트는 lazy) ⑥ **원본 음성·STT 텍스트 미저장** — Blob은 변환 직후 폐기, transcript는 훅 state로만 유지하고 DB 기록 없음(테스트로 고정). 테스트 26건 추가 (총 222). | ✅ 완료 | @Architect + @Coder-Logic + @Coder-UI |
| 2026-09-20 | **알림 고도화 구현 (Phase 3.2)**: ① 마이그레이션 `202609200001_alert_rules_and_events.sql` — `alert_rules` + `alert_events`, `owner_id` 스코프 위에 `can_read_patient` RLS 이중 적용, `(owner_id, dedupe_key)` 유니크로 중복 알림 차단, 규칙 종류별 필수 필드 CHECK, 규칙 삭제해도 히스토리 보존 ② 평가 엔진 `alertEngine.ts`(순수 함수) — Lab 임계값 4종 + 참조범위 이탈, 항생제 사용 일수. Lab은 결과+항목 단위, 항생제는 약제 코스 단위로 dedupe해 매일 반복되지 않음 ③ 설정 > 알림 규칙 UI + 자주 쓰는 규칙 4개 일괄 추가 ④ Today 규칙 알림 섹션(확인/삭제/기록 정리) ⑤ AI 오늘 브리핑 패널(`analyzeBriefing`) ⑥ **마이그레이션 미적용 대비** — `42P01` 감지해 읽기는 빈 결과로 degrade, 쓰기는 안내. 평가용 Lab 조회는 최근 14일 + 컬럼 명시 + 활성 환자 스코프 + 청크 병렬. 테스트 19건 추가 (총 241). **⚠️ 사용자가 Supabase에 마이그레이션을 적용해야 기능이 켜짐.** | ✅ 완료 (마이그레이션 적용 대기) | @Architect + @Coder-Logic + @Coder-UI |
| 2026-09-20 | **간호사 대화 → 환자별 SOAP 분리 (Phase 3.3.2)**: ① **입력 2가지 동등 지원** — 녹음(Whisper)과 **직접 입력**. 전화 인계처럼 녹음이 어려운 경우를 위해 직접 입력을 기본 모드로 두고, Whisper 키가 없어도 동작하게 함(사용자 요청) ② `segmentConversation()` — 한 대화에 섞인 여러 환자를 나눠 각각 S/O/A/P 생성, 대화에 없는 항목은 비워 두게 프롬프트로 강제 ③ 환자명 환각 차단 — 활성 환자 명단에 있는 이름만 통과, 나머지는 검토 UI에서 직접 선택 ④ 검토 단계 — 초안 편집/환자 재지정/선택 저장, 미지정 조각은 선택 해제로 시작해 실수 저장 방지 ⑤ 저장 실패는 조각별로 표시하고 나머지는 계속 저장 ⑥ 대화 원문·음성 미저장. 테스트 23건 추가 (총 264). | ✅ 완료 | @Coder-Logic + @Coder-UI |
| 2026-09-20 | **근거연결 AI (Phase 3.3.2 완료 → Phase 3 전체 완료)**: 환자 Problem List·투약·Lab을 보고 확인할 임상 질문과 영어 검색식을 제안한다. **설계상 인용을 생성하지 않는다** — LLM은 문헌 검색을 할 수 없어 기억으로 인용을 쓰면 존재하지 않는 논문을 지어내고, 임상 도구에서 이는 위험하다. 프롬프트에서 논문 제목·저자·연도·DOI·PMID 생성을 명시적으로 금지하고, 대신 PubMed/Google Scholar/UpToDate 검색 링크를 만들어 실제 근거는 사용자가 직접 확인하게 했다. 화면에도 "AI는 논문을 검색하지 않습니다" 문구를 고정 표시하고 테스트로 잠갔다. 테스트 13건 추가 (총 277). | ✅ 완료 | @Coder-Logic + @Coder-UI |
