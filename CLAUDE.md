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
│  ├── DB 스키마, 인덱스 설계 (Dexie.js)                    │
│  ├── 타입 시스템 설계 (types/)                            │
│  ├── 성능 아키텍처 (인덱싱, 프리페치, 코드 스플리팅)       │
│  ├── PWA 구성 (Service Worker, manifest)                  │
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
│  ├── 보안 검토: 환자 데이터 처리, PIN 보안                │
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
  - @Architect: `db/`, `types/`, 설정 파일, 프로젝트 구조
  - @Coder-UI: `components/`, `pages/`
  - @Coder-Logic: `services/`, `stores/`, `hooks/`, `utils/`
  - @Reviewer: `__tests__/`, TODO.md 이슈 섹션
- **인터페이스 우선**: 다른 에이전트의 코드에 의존할 때는 타입/인터페이스만 참조
- **충돌 방지**: 같은 파일을 두 에이전트가 동시에 수정하지 않도록 TODO.md에서 조율
- **환각 방지**: 불확실한 구현은 TODO.md에 `[?]` 표시 후 사용자에게 확인 요청

> 💡 **실전 팁**: Claude Code 단독 사용 시에는 위 역할을 순차적으로 전환하며 작업합니다.
> 예: "지금부터 @Architect 역할로 DB 스키마를 설계해줘" → "이제 @Coder-UI로 전환해서 환자 목록 컴포넌트를 만들어줘"

---

## 프로젝트 소개
WardFlow는 **모든 과의 입원환자를 담당하는 의사**를 위한 환자 관리 및 차팅 보조 PWA 앱이다. WardLink 플랫폼의 첫 번째 모듈로, 오프라인 우선(Offline-first) 아키텍처를 사용한다. **Desktop-First**로, 병원 컴퓨터에서 OCS/EMR과 병행하며 사용하고, 회진 시에는 모바일로 열람 및 간단 메모를 지원한다.

### 프로젝트 핵심 문서
| 파일 | 역할 |
|------|------|
| `CLAUDE.md` | Claude Code 가이드 — 기술 스택, 코딩 컨벤션, 설계 원칙 (이 파일) |
| `PRD.md` | 상세 기능 요구사항, 데이터 모델, 파싱 설계, 성능 요구사항 |
| `TODO.md` | 태스크 관리 Single Source of Truth — 진행 상태, 담당 배정 |

## 기술 스택
- **React 18+** with **TypeScript** (strict mode)
- **Vite** (빌드 도구)
- **React Router v6** (라우팅)
- **Zustand** (상태 관리 — 가볍고 보일러플레이트 최소)
- **Dexie.js** (IndexedDB 래퍼, 로컬 데이터베이스)
- **Tailwind CSS** + **shadcn/ui** (UI 컴포넌트)
- **Recharts** (Lab 추이 차트)
- **vite-plugin-pwa** (PWA / Service Worker)
- **Vitest** + **React Testing Library** (테스트)

## 프로젝트 구조
```
wardflow/
├── public/
│   ├── manifest.json
│   ├── icons/                    # PWA 아이콘들
│   └── sw.js                     # Service Worker (vite-plugin-pwa 자동 생성)
├── src/
│   ├── main.tsx                  # 앱 진입점
│   ├── App.tsx                   # 라우터 및 레이아웃
│   ├── components/
│   │   ├── ui/                   # shadcn/ui 기반 공통 컴포넌트
│   │   ├── patient/              # 환자 관련 컴포넌트
│   │   │   ├── PatientList.tsx
│   │   │   ├── PatientCard.tsx
│   │   │   ├── PatientDetail.tsx
│   │   │   └── PatientForm.tsx
│   │   ├── charting/             # 차팅 폼 (핵심)
│   │   │   ├── ChartingForm.tsx        # C/C ~ Etc 구조화된 입력 폼
│   │   │   ├── ResizableTextArea.tsx   # 높이 조절 가능한 텍스트 영역
│   │   │   ├── ProblemListEditor.tsx   # Problem List (리스트/텍스트 모드)
│   │   │   ├── TemplatePopup.tsx       # `/` 명령 템플릿 팝업
│   │   │   └── CopyToOCS.tsx           # 통합 복사 버튼 + 포맷터
│   │   ├── lab/                  # Lab 관련 컴포넌트
│   │   │   ├── LabTable.tsx
│   │   │   ├── LabChart.tsx
│   │   │   ├── LabParseInput.tsx
│   │   │   └── LabManualInput.tsx
│   │   ├── medication/           # 투약 관련
│   │   │   ├── MedicationList.tsx
│   │   │   ├── MedicationForm.tsx
│   │   │   ├── MedicationPasteInput.tsx  # OCS 처방 붙여넣기 파싱 UI
│   │   │   └── DrugInfoLink.tsx          # 네이버 의약품사전 링크 컴포넌트
│   │   ├── note/                 # 메모 관련
│   │   │   ├── NoteList.tsx
│   │   │   └── NoteEditor.tsx
│   │   ├── schedule/             # 일정 관련
│   │   │   ├── ScheduleView.tsx
│   │   │   └── ScheduleForm.tsx
│   │   ├── briefing/             # Morning Briefing
│   │   │   └── MorningBriefing.tsx
│   │   └── layout/               # 레이아웃
│   │       ├── Sidebar.tsx            # 데스크톱 좌측 사이드바 네비게이션
│   │       ├── BottomNav.tsx          # 모바일 하단 네비게이션
│   │       ├── Header.tsx
│   │       ├── MasterDetail.tsx       # 마스터-디테일 분할 뷰
│   │       └── AppShell.tsx           # 반응형 앱 셸
│   ├── db/
│   │   ├── database.ts           # Dexie DB 인스턴스 및 스키마 정의
│   │   ├── seed.ts               # 개발용 시드 데이터
│   │   └── migrations.ts         # DB 마이그레이션
│   ├── stores/
│   │   ├── usePatientStore.ts    # Zustand 환자 스토어
│   │   ├── useLabStore.ts
│   │   ├── useMedicationStore.ts
│   │   ├── useNoteStore.ts
│   │   ├── useScheduleStore.ts
│   │   ├── useAlertStore.ts
│   │   └── useBriefingStore.ts   # Morning Briefing 집계 캐시
│   ├── hooks/                    # 커스텀 훅
│   │   ├── usePatient.ts
│   │   ├── useLabs.ts
│   │   ├── usePrefetch.ts        # PIN 입력 중 데이터 프리페치
│   │   ├── useOfflineStatus.ts
│   │   └── usePinLock.ts
│   ├── services/
│   │   ├── parser/
│   │   │   ├── labParser.ts      # Lab 결과 스마트 파싱 (XLS BIFF + 텍스트)
│   │   │   ├── labCodeMap.ts     # 검사코드 → 항목명/카테고리/단위 매핑
│   │   │   ├── xlsReader.ts      # 구형 XLS(BIFF) 파일 읽기 (cp949)
│   │   │   ├── medParser.ts      # 투약 처방 텍스트 파싱 (OCS 복붙)
│   │   │   ├── csvParser.ts      # CSV 파싱
│   │   │   └── patterns.ts       # 파싱 정규식 패턴
│   │   ├── chartingFormatter.ts  # 차팅 → 클립보드 복사 포맷터
│   │   ├── templateService.ts    # 템플릿 관리 CRUD
│   │   ├── alertEngine.ts        # 알림 생성 로직
│   │   └── briefingService.ts    # Morning Briefing 데이터 집계
│   ├── utils/
│   │   ├── labReference.ts       # Lab 참조 범위 데이터
│   │   ├── dateUtils.ts
│   │   ├── formatters.ts
│   │   └── constants.ts
│   ├── types/
│   │   ├── patient.ts
│   │   ├── charting.ts           # 차팅 폼 관련 타입
│   │   ├── template.ts           # 템플릿 타입
│   │   ├── lab.ts
│   │   ├── medication.ts
│   │   ├── note.ts
│   │   ├── schedule.ts
│   │   └── alert.ts
│   └── pages/
│       ├── HomePage.tsx           # Morning Briefing 대시보드
│       ├── PatientListPage.tsx
│       ├── PatientDetailPage.tsx
│       ├── SchedulePage.tsx
│       ├── SettingsPage.tsx
│       └── PinLockPage.tsx
├── CLAUDE.md                      # 이 파일
├── PRD.md                         # 상세 요구사항
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── index.html
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
- 서버/DB 데이터: Dexie.js 직접 쿼리 (hooks로 래핑)
- Zustand 스토어는 `stores/` 디렉토리, 하나의 도메인당 하나의 스토어

### Dexie.js (IndexedDB)
- DB 스키마는 `db/database.ts`에서 한 곳에서 관리
- 버전 관리 필수 (db.version(N).stores(...))
- **모든 주요 쿼리 경로에 복합 인덱스 필수** — PRD 7.3절의 인덱싱 전략 참고
- `.where()` + 인덱스 사용 우선, `.filter()`는 인덱스 이후 보조 필터링에만
- `.toArray()` 후 JS에서 정렬/필터링 금지 (성능 저하 원인)
- 쿼리는 서비스 레이어 또는 커스텀 훅에서 수행
- 대량 데이터 입력은 `db.transaction()` 사용
- 읽기 전용 트랜잭션은 `db.transaction('r', ...)` 명시

### 파일/폴더 네이밍
- 컴포넌트: PascalCase (`PatientCard.tsx`)
- 유틸/훅/서비스: camelCase (`dateUtils.ts`, `usePatient.ts`)
- 타입 정의: camelCase (`patient.ts`)
- 상수: UPPER_SNAKE_CASE (`MAX_PIN_ATTEMPTS`)

## 주요 설계 원칙

### ⚡ 성능 (최우선)
로그인 후 첫 화면이 1초 이내에 표시되어야 한다. 이것이 이 프로젝트의 가장 중요한 UX 요구사항이다.

**필수 적용 사항**:
- Dexie.js 복합 인덱스 적극 활용 — 모든 주요 쿼리에 인덱스 매칭 필수
- PIN 입력 중 백그라운드 프리페치 — PIN 화면 마운트 시 주요 데이터 미리 로드
- 앱 셸 즉시 렌더 — 정적 UI 먼저, 데이터는 비동기 로드
- 점진적 로딩 — 1단계(목록) 즉시 → 2단계(상세) 백그라운드 → 3단계(차트) 온디맨드
- 코드 스플리팅 — `React.lazy()` + `Suspense`로 페이지별 분리
- Morning Briefing 데이터는 앱 시작 시 한번 집계 후 캐시

**금지 사항**:
- 전체 테이블 스캔 금지 — `.toArray()` 후 JS 필터링 대신 `.where()` + 인덱스 사용
- 첫 화면에서 불필요한 데이터 로드 금지 — 차트, 히스토리 등은 온디맨드
- 동기적 대량 DB 쓰기 금지 — `db.transaction()` 사용

### Offline-First
- 모든 데이터는 IndexedDB에 우선 저장
- 네트워크 상태와 무관하게 모든 기능 동작해야 함
- 오프라인 상태 UI 표시 (헤더에 인디케이터)

### 의료 데이터 시각화
- 비정상 수치는 반드시 시각적으로 구분 (빨간 배경 또는 뱃지)
- Lab 추이 차트에서 정상 범위를 회색 밴드로 표시
- 항생제 D-day는 눈에 잘 띄는 뱃지로 표시

### Desktop-First, Mobile-Friendly
- 주 사용 환경은 병원 데스크톱 컴퓨터 (OCS/EMR과 병행)
- 데스크톱: 사이드바 네비게이션 + 마스터-디테일 분할 뷰
- 모바일: 하단 네비게이션, 열람 중심 + 간단 메모 입력
- 반응형 브레이크포인트: Desktop ≥1024px / Tablet 768~1023px / Mobile <768px
- 모바일에서도 터치 타겟 최소 44x44px

### 보안 (MVP)
- PIN 잠금 화면 (앱 진입 시)
- 자동 잠금 (5분 기본, 설정 변경 가능)
- 환자 데이터 외부 전송 없음 (로컬 전용)

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

## 향후 확장 (참고만)
- WardAide: AI 어시스턴트 사이드바 (Phase 3)
- WardLink 통합: 공통 로그인, 모듈 간 데이터 공유 (Phase 4)
- SQLCipher 암호화, IPFS 백업, Shamir's Secret Sharing (Phase 4)
- Push Notification (서버 필요, Phase 4+)
