# WardFlow TODO.md

> ⚠️ **이 파일은 프로젝트의 Single Source of Truth입니다.**
> 모든 작업 시작 전 이 파일을 확인하고, 작업 완료 후 반드시 업데이트하세요.
>
> 상태: `[ ]` 미완료 | `[/]` 진행 중 | `[x]` 완료

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
- [ ] 알림 엔진 → `src/services/alertEngine.ts` (Morning Briefing AI용, Phase 3)
- [ ] Morning Briefing AI 분석 → Phase 3 (WardAide)

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
- [x] DB 인덱스 쿼리 성능 테스트 (50명 환자 기준 < 300ms) → `src/db/database.perf.test.ts` (10 tests)
- [ ] PIN → 첫 화면 렌더 성능 측정 (< 500ms) — 수동 테스트 영역
- [ ] 오프라인 동작 테스트 — 수동 테스트 영역 (Service Worker)
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
- [ ] 일정 페이지 → `src/pages/SchedulePage.tsx` (전체 환자 일정 캘린더뷰, 향후)

### 2.5 알림 고도화 `@Coder-Logic` → Phase 3로 이관
- [ ] 커스텀 알림 규칙 설정 (Lab 수치 기반 등)
- [ ] 알림 히스토리 (과거 알림 열람/삭제)
- [ ] AI 기반 알림 분석 (WardAide 연동)

---

## Phase 3: WardAide — AI (Phase 2 완료 후)
- [ ] AI 사이드바 UI
- [ ] 로컬 DB 자연어 쿼리 (자연어 → Dexie 쿼리)
- [ ] Lab 추이 분석 AI
- [ ] Renal dose 가이드

---

## Phase 4: WardLink Integration (Phase 3 완료 후)
- [ ] 공통 로그인 시스템
- [ ] 모듈 간 데이터 공유
- [ ] WardCare 연동
- [ ] EMR API 연동 탐색

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
| 2026-03-18 | **개요 탭 알림 시스템 구현 및 날짜 버그 전면 수정**: ① 개요 탭 Quick Stats 카드(Lab/투약/메모 갯수) 제거 ② 개요 탭 최상단 알림 박스 추가 (C/C 위, 앰버 색상) — 오늘 알림 메모(reminder) + 오늘/어제 Lab 결과 유무 표시 ③ Lab 알림 표시 형식: "어제 (2026-03-17) Lab 결과가 있습니다." ④ **날짜 timezone 버그 전면 수정**: `formatDate()` 유틸을 `toISOString()` 대신 로컬 시간 기준으로 수정, `LabTable.tsx` 날짜 키 생성 시 toISOString() → formatDate() 교체, `LabManualInput.tsx` 기본값 및 저장 시 `parseLocalDate()` 적용 ⑤ Tags 카드 제목 "주의사항 (Tags)" → "Tags" 단순화 및 빈 상태 문구 수정. | ✅ 완료 | @Coder-UI + @Coder-Logic |
