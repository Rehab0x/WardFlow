# CLAUDE.md — WardFlow 프로젝트 가이드

> 이 파일은 Claude Code가 프로젝트 컨텍스트를 이해하기 위해 자동으로 읽는 파일입니다.

---

## ⚙️ 작업 규칙 (모든 작업에 적용)

### TODO.md — Single Source of Truth
- **모든 작업 시작 전** `TODO.md`를 확인하여 현재 진행 상황과 우선순위를 파악할 것
- **작업 완료 후** 반드시 `TODO.md`의 해당 항목 상태를 업데이트할 것
  - `[ ]` 미완료 → `[/]` 진행 중 → `[x]` 완료
- 새로운 태스크가 발생하면 적절한 Phase/섹션에 추가할 것
- 이슈나 결정 사항은 하단 "이슈 / 메모" 테이블에 기록할 것
- **TODO.md에 없는 작업은 하지 않는다** — 먼저 TODO.md에 추가 후 진행

### Subagent 팀 구조
이 프로젝트는 역할별 Subagent 팀 구조로 운영된다. 각 에이전트는 자신의 역할 범위 내에서만 작업하고, 역할 밖의 변경이 필요하면 해당 담당에게 위임한다.

```
┌─────────────────────────────────────────────────────────┐
│  👤 사용자 (프로젝트 오너)                                │
│  └── 요구사항 전달, 최종 의사결정, 피드백                  │
├─────────────────────────────────────────────────────────┤
│  🧑‍💼 @Manager — 프로젝트 매니저                          │
│  ├── TODO.md 관리 및 전체 진행 조율                       │
│  ├── 사용자와 소통, 요구사항 → 태스크 분해                 │
│  ├── 하위 에이전트에게 업무 배정 및 우선순위 결정           │
│  └── 작업 간 충돌 방지, 의존성 관리                       │
├─────────────────────────────────────────────────────────┤
│  🏗️ @Architect — 설계 담당                               │
│  ├── 전체 파일/폴더 구조 설계 및 유지                     │
│  ├── DB 스키마·RLS 설계 (Supabase), 리포지토리 계층          │
│  ├── 타입 시스템 설계 (types/)                            │
│  ├── 성능 아키텍처 (쿼리 스코프, 병렬 로드, 코드 스플리팅)   │
│  ├── PWA 구성 (Service Worker, manifest — 선택 활성화)      │
│  └── 기술 스택 의사결정                                   │
├─────────────────────────────────────────────────────────┤
│  💻 @Coder-UI — 프론트엔드/UI 구현                       │
│  ├── React 컴포넌트 구현 (components/)                    │
│  ├── 페이지 구현 (pages/)                                │
│  ├── 레이아웃, 반응형 디자인                              │
│  ├── Tailwind + shadcn/ui 스타일링                        │
│  └── UX 인터랙션 (토스트, 모달, 드래그 등)                │
├─────────────────────────────────────────────────────────┤
│  ⚙️ @Coder-Logic — 비즈니스 로직 구현                    │
│  ├── 서비스 레이어 (services/)                            │
│  ├── 파서 (Lab XLS, 투약 텍스트, CSV)                     │
│  ├── Zustand 스토어 (stores/)                             │
│  ├── 커스텀 훅 (hooks/)                                   │
│  ├── 알림 엔진, Briefing 집계                             │
│  └── 유틸리티 (utils/)                                    │
├─────────────────────────────────────────────────────────┤
│  🔍 @Reviewer — QA 및 코드 리뷰                          │
│  ├── 코드 리뷰: 타입 안전성, 컨벤션 준수                  │
│  ├── 성능 검증: 쿼리 성능, 렌더링 속도 측정               │
│  ├── 보안 검토: 환자 데이터 처리, RLS 정책                 │
│  ├── 테스트 작성 (Vitest + React Testing Library)         │
│  └── 오프라인/반응형 동작 검증                            │
└─────────────────────────────────────────────────────────┘
```

### 작업 흐름 (Workflow)
```
1. 사용자 요청 접수
   └→ @Manager가 요구사항 분석 → TODO.md에 태스크 추가/업데이트

2. 태스크 배정
   └→ @Manager가 태스크별 담당 에이전트 지정 (TODO.md의 @태그)

3. 설계 (새 기능인 경우)
   └→ @Architect가 구조/스키마/타입 설계 → 관련 파일 생성
   └→ 설계 완료 → TODO.md 업데이트

4. 구현
   └→ @Coder-UI / @Coder-Logic이 병렬 작업
   └→ 의존성이 있으면 @Architect 설계 완료 후 진행
   └→ 구현 완료 → TODO.md 업데이트

5. 검증
   └→ @Reviewer가 코드 리뷰 + 테스트 + 성능 측정
   └→ 이슈 발견 시 TODO.md 이슈 테이블에 기록 → 해당 담당에게 수정 요청

6. 완료
   └→ @Manager가 최종 확인 → TODO.md 항목 [x] 처리
```

### 에이전트 간 규칙
- **단일 책임**: 각 에이전트는 자기 역할 범위의 파일만 수정한다
  - @Architect: `data/`, `domain/`, `mappers/`, `types/`, `supabase/migrations/`, 설정 파일, 프로젝트 구조
  - @Coder-UI: `components/`, `pages/`
  - @Coder-Logic: `services/`, `stores/`, `hooks/`, `features/`, `utils/`, `lib/`
  - @Reviewer: `*.test.ts(x)`, TODO.md 이슈 섹션
- **인터페이스 우선**: 다른 에이전트의 코드에 의존할 때는 타입/인터페이스만 참조
- **충돌 방지**: 같은 파일을 두 에이전트가 동시에 수정하지 않도록 TODO.md에서 조율
- **환각 방지**: 불확실한 구현은 TODO.md에 `[?]` 표시 후 사용자에게 확인 요청

> 💡 **실전 팁**: Claude Code 단독 사용 시에는 위 역할을 순차적으로 전환하며 작업합니다.
> 예: "지금부터 @Architect 역할로 DB 스키마를 설계해줘" → "이제 @Coder-UI로 전환해서 환자 목록 컴포넌트를 만들어줘"

---

## 프로젝트 소개
WardFlow는 **모든 과의 입원환자를 담당하는 의사**를 위한 환자 관리 및 차팅 보조 웹앱이다. WardLink 플랫폼의 첫 번째 모듈로, **Supabase를 단일 데이터 소스**로 사용한다. **Desktop-First**로, 병원 컴퓨터에서 OCS/EMR과 병행하며 사용하고, 회진 시에는 모바일로 열람 및 간단 메모를 지원한다.

### 프로젝트 핵심 문서
| 파일 | 역할 |
|------|------|
| `CLAUDE.md` | Claude Code 가이드 — 기술 스택, 코딩 컨벤션, 설계 원칙 (이 파일) |
| `PRD.md` | 상세 기능 요구사항, 데이터 모델, 파싱 설계 |
| `TODO.md` | 태스크 관리 Single Source of Truth — 진행 상태, 담당 배정 |
| `DESIGN.md` | Clinical Calm 디자인 시스템 |
| `docs/rebuild-plan.md` | v2 재구축 계획 (Supabase 전환 설계) |
| `docs/handoff.md` | 세션 간 인수인계 로그 / 체크포인트 |
| `docs/supabase-*.md` | Supabase 스키마 계획 · 타입 생성 · 검증 체크리스트 |

## 기술 스택
- **React 18+** with **TypeScript** (strict mode)
- **Vite** (빌드 도구)
- **React Router v6** (라우팅)
- **Zustand** (상태 관리 — 가볍고 보일러플레이트 최소)
- **Supabase** (PostgreSQL + Auth + Storage) — **단일 데이터 소스**
- **Tailwind CSS** + **shadcn/ui** (UI 컴포넌트)
- **Recharts** (Lab 추이 차트 — 온디맨드 lazy 로드)
- **vite-plugin-pwa** (PWA / Service Worker, `VITE_ENABLE_PWA=true`일 때만)
- **Vitest** + **React Testing Library** (테스트)

> ⚠️ **Dexie.js / IndexedDB는 사용하지 않는다.** 2026-09-19 리팩토링에서 이중 백엔드를 제거하고
> Supabase 전용으로 전환했다. 앱 실행에는 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`가 필수다.

## 프로젝트 구조

레이어는 **UI → stores → data(repository) → Supabase** 한 방향으로 흐른다.
`domain/`은 서버 스키마에 맞춘 도메인 타입, `types/`는 화면에서 쓰는 뷰모델 타입이며
둘 사이는 `mappers/*View.mapper.ts`가 변환한다.

```
wardflow/
├── api/
│   └── lab-import.ts             # Vercel 서버리스 — Storage inbox XLS 처리
├── public/                       # PWA 아이콘, manifest
├── supabase/migrations/          # DB 스키마 + RLS 정책 SQL
├── docs/                         # 재구축 계획, 인수인계, Supabase 문서
├── src/
│   ├── main.tsx                  # 앱 진입점
│   ├── App.tsx                   # 라우터 (/, /login, /register, /settings, /lab-import)
│   ├── pages/
│   │   ├── AppPage.tsx           # 메인 셸 — Today ↔ 환자 워크스페이스 오케스트레이션
│   │   ├── LoginPage.tsx  RegisterPage.tsx  SettingsPage.tsx  LabImportPage.tsx
│   ├── components/
│   │   ├── layout/               # AppShell, TopBar, PatientRail, PatientRow
│   │   ├── today/                # TodayDashboard + Metrics/TaskList/DomainSections/todayTasks
│   │   ├── workspace/            # 환자 워크스페이스 (핵심)
│   │   │   ├── PatientWorkspace.tsx   # 탭 셸
│   │   │   ├── WorkspaceHeader.tsx  WorkspaceTabs.tsx  ContextPanel.tsx
│   │   │   ├── tabs/             # Overview / Charting / Lab / Medication / Notes / Schedule
│   │   │   ├── forms/            # 항생제·투약·표준 Lab 항목 입력 폼
│   │   │   ├── sections/         # Culture, 최근 Lab 섹션
│   │   │   ├── controls.tsx      # Input/SaveButton/RemoveButton/ChartField 등 공용 컨트롤
│   │   │   ├── types.ts          # 워크스페이스 props/draft 타입
│   │   │   ├── workspaceData.ts  # 복사문구·Lab 표·SOAP 컨텍스트 빌더 (순수 함수)
│   │   │   └── workspaceInput.ts # 날짜/시간 검증, IME 처리 (순수 함수)
│   │   ├── clinical/             # ClinicalRow, DataSection, MetricTile, CopyBar, dateLabels
│   │   ├── patient/              # AddPatientPanel, PatientStatusDialog
│   │   ├── lab/                  # LabChart, LabParseInput, BulkLabImport, Import inbox
│   │   ├── charting/TemplatePopup.tsx
│   │   ├── ai/AiActionPanel.tsx  # AI 호출 공용 패널 (버튼→로딩→결과→복사/저장)
│   │   ├── settings/             # 설정 섹션별 컴포넌트
│   │   └── ui/                   # shadcn/ui 기반 공통 컴포넌트
│   ├── features/app/             # AppPage 전용 순수 로직
│   │   ├── patientIndexes.ts     # 환자 목록 인덱스/검색/사이드바 인디케이터
│   │   ├── patientDraft.ts       # 환자 입력 draft 검증
│   │   └── optimisticBriefing.ts # Today 브리핑 낙관적 업데이트
│   ├── hooks/
│   │   ├── useBriefingData.ts    # Today 로딩/갱신 정책 (중복 요청 합치기, stale 갱신)
│   │   ├── useClinicalWriters.ts # 임상 데이터 쓰기 핸들러
│   │   ├── usePatientWriters.ts  # 환자 추가/수정/삭제/퇴원 핸들러
│   │   └── useSupabaseUserSettingsSync.ts
│   ├── data/                     # Supabase 리포지토리 (모든 DB 접근은 여기서만)
│   ├── domain/                   # 서버 스키마 기준 도메인 타입
│   ├── mappers/                  # 도메인 ↔ 뷰모델 / Supabase row 변환
│   ├── stores/                   # Zustand 스토어 (도메인당 1개)
│   ├── services/
│   │   ├── parser/               # labParser, labCodeMap, medParser
│   │   ├── briefingService.ts    # Today 집계 (활성 환자 ID로 스코프된 병렬 쿼리)
│   │   ├── bulkLabImport.ts      # 병원 XLS 일괄 입력
│   │   ├── aiService.ts          # 멀티 LLM 호출 (Claude/GPT/Gemini/Grok)
│   │   ├── chartingFormatter.ts  # 차팅 → OCS 복사 포맷터
│   │   ├── backupSnapshotService.ts
│   │   └── labCategoryService.ts  templateService.ts  labImportInbox.ts  storageInbox.ts
│   ├── lib/                      # supabase 클라이언트, 에러 메시지, 정책 헬퍼
│   ├── types/                    # 화면용 뷰모델 타입 + 생성된 supabase.ts
│   ├── utils/                    # dateUtils, labReference, cn
│   └── config/backend.ts         # Supabase 환경 변수
├── CLAUDE.md  PRD.md  TODO.md  DESIGN.md  README.md
├── eslint.config.js              # ESLint 9 flat config (.eslintrc.cjs 없음)
├── package.json  tsconfig.json  tailwind.config.ts  vite.config.ts  vitest.config.ts
└── .env.example
```

## 코딩 컨벤션

### TypeScript
- `strict: true` 필수
- `any` 사용 금지 — 반드시 타입 정의
- 인터페이스는 `types/` 디렉토리에 모아서 관리
- enum 대신 `const` assertion 또는 union type 사용

### React
- 함수형 컴포넌트 + Hooks만 사용 (class component 금지)
- 컴포넌트 파일명은 PascalCase: `PatientCard.tsx`
- 훅 파일명은 camelCase + use 접두사: `usePatient.ts`
- Props 타입은 컴포넌트와 같은 파일에 정의: `interface PatientCardProps { ... }`
- 한 컴포넌트 파일은 200줄 이하 유지 — 넘으면 분리

### 스타일
- Tailwind CSS utility class 사용
- 인라인 style 지양
- 반응형: `sm:`, `md:`, `lg:` 브레이크포인트 사용
- 색상은 Tailwind 기본 팔레트 활용 (커스텀 필요 시 tailwind.config.ts 확장)

### 상태 관리
- 로컬 UI 상태: `useState` / `useReducer`
- 앱 전역 상태: Zustand 스토어
- 서버 데이터: `data/*.repository.ts` → Zustand 스토어 → 컴포넌트 (아래 "Supabase 데이터 접근" 참고)
- Zustand 스토어는 `stores/` 디렉토리, 하나의 도메인당 하나의 스토어

### Supabase 데이터 접근
- **모든 DB 접근은 `src/data/*.repository.ts`에서만 한다.** 컴포넌트/페이지/훅에서 `supabase` 클라이언트를 직접 부르지 않는다
- 스토어(Zustand)는 "현재 화면이 들고 있는 데이터"를 담당하고, 읽기/쓰기 자체는 리포지토리에 위임한다
- 리포지토리는 **컬럼을 명시해서 select** 한다 (`select('*')` 금지) — 테이블이 커져도 전송량이 예측 가능해야 한다
- 환자 목록 기반 조회는 **활성 환자 ID로 스코프**하고, `.in()` 청크(`data/chunk.ts`)로 나눠 병렬 실행한다
- 접근 제어는 **Supabase RLS가 최종 방어선**이다. 프론트엔드 필터링만으로 권한을 판단하지 않는다
- 쓰기 실패는 `lib/errorMessages.ts`의 `formatUserFacingError()`를 거쳐 사용자 문구로 변환한다 (RLS/제약조건 원문 노출 금지)
- 파괴적 작업(삭제/복원)은 실행 전 영향받는 레코드 수를 보여준다

### 파일/폴더 네이밍
- 컴포넌트: PascalCase (`PatientCard.tsx`)
- 유틸/훅/서비스: camelCase (`dateUtils.ts`, `usePatient.ts`)
- 타입 정의: camelCase (`patient.ts`)
- 상수: UPPER_SNAKE_CASE (`DEFAULT_LAB_CATEGORIES`)

## 주요 설계 원칙

### ⚡ 성능 (최우선)
로그인 후 첫 화면이 1초 이내에 표시되어야 한다. 이것이 이 프로젝트의 가장 중요한 UX 요구사항이다.

**필수 적용 사항**:
- 앱 셸 즉시 렌더 — 정적 UI 먼저, 데이터는 비동기 로드
- 초기 로드는 환자 목록 + Today 브리핑을 **병렬로** 가져온다 (`useBriefingData`)
- 점진적 로딩 — 1단계(목록) 즉시 → 2단계(상세) 탭 진입 시 → 3단계(차트) 온디맨드
- 코드 스플리팅 — `React.lazy()` + `Suspense`. Recharts(≈380kB)는 Lab 추이 차트를 실제로 열 때만 로드한다
- 쓰기 후에는 Today 브리핑만 낙관적으로 갱신하고, 서버 확인 갱신은 합쳐서 한 번만 실행한다

**금지 사항**:
- `select('*')` 금지 — 필요한 컬럼만 명시한다
- 전체 테이블 스캔 금지 — 활성 환자 ID로 스코프된 쿼리를 쓴다
- 첫 화면에서 불필요한 데이터 로드 금지 — 차트, 히스토리 등은 온디맨드
- 작은 임상 데이터 쓰기마다 전체 환자 목록을 다시 불러오지 않는다

### 데이터 정책 (Supabase 단일 소스)
- **Supabase PostgreSQL이 유일한 진실의 원천**이다. 로컬 캐시를 권위 있는 백업으로 취급하지 않는다
- 브라우저 저장소는 UI 편의 상태(로그인 ID 기억, 설정 persist)에만 쓴다
- 오프라인 편집은 v2 기준 범위 밖이다. 네트워크 오류는 쓰기 배너로 명확히 드러낸다
- 백업은 `backup_snapshots` 기반 암호화 스냅샷 + 복원 미리보기 경로만 사용한다

### 의료 데이터 시각화
- 비정상 수치는 반드시 시각적으로 구분 (빨간 배경 또는 뱃지)
- Lab 추이 차트에서 정상 범위를 회색 밴드로 표시
- 항생제 D-day는 눈에 잘 띄는 뱃지로 표시

### Desktop-First, Mobile-Friendly
- 주 사용 환경은 병원 데스크톱 컴퓨터 (OCS/EMR과 병행)
- 데스크톱: 사이드바 네비게이션 + 마스터-디테일 분할 뷰
- 모바일: 환자 목록 드로어 + 하단 액션, 열람 중심 + 간단 메모 입력
- 반응형 브레이크포인트: Desktop ≥1024px / Tablet 768~1023px / Mobile <768px
- 모바일에서도 터치 타겟 최소 44x44px

### 보안
- 인증은 **Supabase Auth**. 신규 가입자는 승인 대기(`pending`) 상태이며 관리자 승인 후 로그인 가능
- 첫 가입자는 DB 트리거로 `admin` + `approved` 자동 부여
- 환자 접근 권한은 **RLS 정책**으로 강제한다
- AI API 키는 사용자별 설정에 저장되며 환자 데이터는 사용자가 명시적으로 AI 기능을 실행할 때만 전송된다
- PIN 잠금은 2026-09-19 리팩토링에서 제거되었다 (IndexedDB 자격증명 모델에 의존했기 때문)

## 커맨드

### 작업 관리
```bash
cat TODO.md              # 현재 진행 상황 확인 (모든 작업 시작 전 필수)
```

### 개발
```bash
npm run dev          # 개발 서버 시작 (Vite)
npm run build        # 프로덕션 빌드
npm run preview      # 프로덕션 빌드 프리뷰
npm run lint         # ESLint 실행
npm run type-check   # TypeScript 타입 체크
```

### 테스트
```bash
npm run test         # Vitest 실행
npm run test:watch   # Vitest 와치 모드
npm run test:ui      # Vitest UI
```

## 의료 도메인 참고사항

### Lab 참조 범위
`utils/labReference.ts`에 주요 항목의 정상 범위를 정의한다. 병원마다 차이가 있으므로, 설정에서 커스텀할 수 있어야 한다.

### Lab 파싱 (병원 XLS 형식)
- 병원 OCS에서 내보내는 Lab 결과지는 `.xls` (BIFF/Compound Document) 형식
- 인코딩: CP949 (Korean)
- 검사코드 체계: B/A + 4~5자리 (예: B2500=Total Protein, B1050=WBC)
- `≤` 기호는 `d"`, `≥`는 `e"`로 인코딩되어 있음
- 참조범위는 세 가지 형태: `6.60 ~ 8.30` (범위), `≤40` (상한), 서술형
- `services/parser/labCodeMap.ts`에 검사코드→항목명 매핑 정의
- 상세 파싱 설계는 PRD.md 5장 참고

### 항생제 D-day 계산
- 시작일로부터 오늘까지의 일수
- 표시: "D+7" 형태
- 14일 이상 시 경고 알림 자동 생성

### 투약 파싱 (OCS 복붙 형식)
- 포맷: `(잔여일수) 약물명[TAB]1회투약량[TAB]투약시간`
- 정규식: `/^\((\d+)\)\s+(.+?)\t([\d.]+)\t(.+)$/`
- `(숫자)` → 잔여일수 (참고용 저장, 표시에서는 제거)
- 투약량 후행 0 제거: `1.0000` → `1`, `0.5000` → `0.5`
- 약물명에서 기본명 추출 (용량/괄호 제거): "페로스핀정10mg(메틸페니데이트염산염)" → "페로스핀정"
- 약물명 클릭 → 네이버 지식백과 의약품사전 링크: `https://terms.naver.com/search.naver?query={기본명}`
- 대안: 의약품안전나라 `https://nedrug.mfds.go.kr/searchDrug?searchYn=true&typeName=&itemName={기본명}`

### 용어
- OCS: 병원 처방전달시스템 (Order Communication System)
- EMR: 전자의무기록 (Electronic Medical Record)
- 외진: 타과 협진 (consultation)
- 회진: 병동 환자 진찰 (rounding)

## 기능 스펙: AI 음성 질의 (Phase 3.3.1) — ✅ 구현 완료 (2026-09-20)

> 회진 중 "장영임님 소듐 요즘 어땠지?" 같은 질문을 음성으로 하면, 텍스트/그래프로 즉시 답하는 기능.
> 체크리스트는 `TODO.md` 3.3.1 참고. 여기는 설계 배경과 결정 사항만 기록한다.

### 데이터 흐름
```
마이크 녹음 (MediaRecorder)
  → Whisper API로 STT 변환
  → aiService.parseVoiceQuery(transcript, 활성 환자명단) — LLM이 JSON으로 구조화
     { patientName, queryType: 'lab'|'medication'|'unknown', item }
  → patientName으로 usePatientStore에서 환자 ID 조회 (exact match)
  → queryType === 'lab'        → useLabStore.getLabTrendData(patientId, itemCode, itemName) → <LabChart/>
  → queryType === 'medication' → useMedicationStore 조회 → 텍스트 리스트
  → 화면에 답변 표시 (텍스트 + 필요시 그래프)
```

### 설계 결정 사항
- **새 DB 테이블 불필요.** 기존 `labResults`, `medications` 테이블을 그대로 조회하는 순수 read-only 계층이다.
- **환자 매칭은 LLM에게 위임한다.** STT가 이름을 부정확하게 인식할 수 있으므로(예: "장영임"→"장영일"), `parseVoiceQuery` 호출 시 현재 활성 환자 명단 전체를 컨텍스트로 함께 넘겨 LLM이 가장 가까운 이름으로 매칭하게 한다. 매칭 실패 시 `patientName: null` → UI에서 "환자를 특정할 수 없습니다" 안내.
- **원본 음성/STT 텍스트는 저장하지 않는다.** 답변 생성 직후 폐기하며 DB에 기록하지 않는다 (사용자 요구사항 — Firebase 버전에서 겪은 데이터 부담을 반복하지 않기 위함).
- **STT는 Whisper API를 사용한다.** Web Speech API보다 의료 용어 인식 정확도가 높고, `prompt` 파라미터로 도메인 용어 힌트("소듐, 칼륨, 크레아티닌, 항생제, 헤모글로빈" 등)를 줄 수 있다. 개인 사용 기준 비용은 무시할 수준.
- **UI는 앱 전역에서 접근 가능해야 한다.** 회진 중엔 특정 환자 상세 페이지에 있지 않을 수 있으므로, 특정 환자 페이지에 종속되지 않고 `AppShell`에 플로팅 마이크 버튼으로 배치한다.

### 신규 파일
- `src/services/sttService.ts` — Whisper API 호출 래퍼
- `src/hooks/useVoiceQuery.ts` — 녹음→STT→파싱→조회 전체 플로우 관리
- `src/components/voice/VoiceQueryButton.tsx` — 플로팅 마이크 버튼
- `src/components/voice/VoiceQueryOverlay.tsx` — 결과 표시 오버레이
- `aiService.ts`에 `parseVoiceQuery()` 추가 — 기존 `generateSOAP()` 패턴(시스템 프롬프트 + JSON 출력) 그대로 따를 것

### 재사용 — 신규 구현 불필요
- `useLabStore.getLabTrendData()` — Lab 추이 조회
- `LabChart.tsx` — 그래프 렌더링
- `useMedicationStore` — 투약 조회
- `useAIStore` / `callAI()` — 기존 멀티 LLM 호출 인터페이스

### Whisper API 키 관리 — 결정됨
`useAIStore`에 provider와 무관한 **`whisperApiKey` 필드**를 두고, 설정 > AI 설정에서 함께 입력받는다.
텍스트 LLM 키와 마찬가지로 **localStorage에만 저장하고 Supabase로 동기화하지 않는다.**
키가 없으면 플로팅 마이크 버튼 자체를 렌더하지 않는다 (`useVoiceQueryReady`).

### 구현 시 추가된 안전장치
- **환자명 환각 차단**: LLM이 돌려준 이름이라도 `normalizeVoiceQuery()`에서 **실제 활성 환자 명단에 있는 값만** 통과시킨다. 없으면 `patientName: null` → "환자를 특정할 수 없습니다"
- **JSON 파싱 방어**: 코드펜스(```json), 앞뒤 설명 문장이 섞여 와도 복구한다. 실패 시 사용자 문구로 변환
- **실패 지점 구분**: `SttError.stage`(`permission` / `recording` / `transcription` / `config`)로 나눠 UI가 다른 안내를 띄운다
- **미저장 보장**: 오디오 Blob은 변환 직후 참조를 놓고, transcript는 훅 state로만 유지하다 `reset()`에서 사라진다. DB에 쓰지 않는다 (테스트로 고정)

---

## 향후 확장 (참고만)
- WardAide: AI 어시스턴트 사이드바 (Phase 3)
- WardLink 통합: 공통 로그인, 모듈 간 데이터 공유 (Phase 4)
- SQLCipher 암호화, IPFS 백업, Shamir's Secret Sharing (Phase 4)
- Push Notification (서버 필요, Phase 4+)
