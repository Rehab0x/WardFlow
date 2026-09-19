# WardFlow

> 입원환자 담당 의사를 위한 환자 관리 및 차팅 보조 PWA 앱

## 프로젝트 소개

WardFlow는 **모든 과의 입원환자를 담당하는 의사**를 위한 환자 관리 시스템입니다. Supabase를 단일 데이터 소스로 사용하며, Desktop-First로 설계되어 병원 컴퓨터에서 OCS/EMR과 병행하며 사용하고, 회진 시에는 모바일로 열람 및 간단 메모를 지원합니다.

### 핵심 기능

- **Today 대시보드**: 오늘 할 일(알림/일정/항생제/비정상 Lab)을 우선순위로 정렬해 한눈에
- **환자 관리**: 입원/컨설트/퇴원 환자 사이드바, Attention 플래그, 태그 시스템
- **차팅 폼**: C/C ~ Etc 구조화된 입력, Problem List 편집/순서변경, 템플릿 시스템
- **통합 복사**: 차팅 내용을 한 번에 복사하여 OCS에 바로 붙여넣기
- **Lab 결과 관리**: XLS 스마트 파싱, 추이 차트, 비정상 수치 하이라이트, 셀 편집
- **투약 관리**: OCS 처방 붙여넣기 파싱, 항생제 D-day 자동 계산, 종료일 자동 비활성화
- **일정 관리**: 환자별 오늘 일정, 카테고리 커스텀
- **회원 시스템**: 회원가입 + 관리자 승인, 역할별 권한, 모듈 권한(WardLink 확장 대비)
- **AI 어시스턴트**: SOAP 변환, Lab 요약, 인수인계 요약, 투약 안전성 체크 (Claude/GPT/Gemini/Grok)
- **Lab 자동 Import**: Supabase Storage inbox + 로컬 폴더 (OpenClaw 연동)
- **데이터 백업**: AES-256 암호화 서버 스냅샷 + 복원 영향 미리보기

### 스크린샷

| Today's Note | 환자 상세 | Lab 테이블 |
|:---:|:---:|:---:|
| 대시보드 | 개요/차트/투약/Lab/메모 탭 | 시계열 + 추이 차트 |

## 기술 스택

- **Framework**: React 18 + TypeScript (strict mode)
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State**: Zustand (persist middleware)
- **Database / Auth**: Supabase (PostgreSQL + Auth + Storage, RLS 적용) — 단일 데이터 소스
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts (Lab 추이 차트, 온디맨드 lazy 로드)
- **PWA**: vite-plugin-pwa (`VITE_ENABLE_PWA=true`일 때 활성화)
- **Testing**: Vitest + React Testing Library
- **Deploy**: Vercel

## 시작하기

### 필수 요구사항

- Node.js 18+
- npm 또는 yarn
- Supabase 프로젝트 (`supabase/migrations/`의 SQL 적용 필요)

### 설치

```bash
# 패키지 설치
npm install

# 환경 변수 설정 — Supabase 연결 정보가 없으면 앱이 동작하지 않습니다
cp .env.example .env.local
# .env.local 에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 입력

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

### 개발 명령어

```bash
# 타입 체크
npm run type-check

# 린트
npm run lint

# 테스트
npm run test
npm run test:watch
```

## 프로젝트 구조

레이어는 **UI → stores → data(repository) → Supabase** 한 방향으로 흐릅니다.

```
wardflow/
├── api/lab-import.ts    # Vercel 서버리스 — Storage inbox XLS 처리
├── supabase/migrations/ # DB 스키마 + RLS 정책
├── docs/                # 재구축 계획, 인수인계, Supabase 문서
├── src/
│   ├── pages/           # AppPage(메인 셸), Login, Register, Settings, LabImport
│   ├── components/
│   │   ├── layout/      # AppShell, TopBar, PatientRail
│   │   ├── today/       # Today 대시보드
│   │   ├── workspace/   # 환자 워크스페이스 (탭/폼/섹션)
│   │   ├── clinical/    # 공용 임상 UI 프리미티브
│   │   ├── patient/ lab/ charting/ ai/ settings/ ui/
│   ├── features/app/    # AppPage 전용 순수 로직 (인덱스/검증/낙관적 업데이트)
│   ├── hooks/           # useBriefingData, useClinicalWriters, usePatientWriters
│   ├── data/            # Supabase 리포지토리 (모든 DB 접근 지점)
│   ├── domain/ mappers/ # 도메인 타입 ↔ 뷰모델 변환
│   ├── stores/          # Zustand 스토어
│   ├── services/        # 파서, 브리핑 집계, AI, 백업
│   ├── types/ utils/ lib/ config/
├── CLAUDE.md            # Claude Code 가이드
├── PRD.md               # 상세 요구사항
├── DESIGN.md            # 디자인 시스템
└── TODO.md              # 태스크 관리
```

## 개발 현황

**v2 (2026-09-19)** — Supabase 전용 전환 + v1 UI 제거 리팩토링 완료

### v2 전환 요약
- v1 UI/라우트 전면 제거 — 단일 앱 셸(`/`)로 통합
- Dexie/IndexedDB 이중 백엔드 제거 → **Supabase 단일 데이터 소스**
- PIN 잠금 제거 (Supabase Auth 세션으로 대체)
- Lab 추이 차트 · AI 3종(Lab 요약/인수인계/투약 체크)을 새 워크스페이스로 포팅
- 거대 파일 분해: `PatientWorkspace` 2,380줄 → 탭·폼 단위, `AppPage` 1,825줄 → 페이지 + 훅 3개
- 차팅 OCS 복사가 **설정 > 차팅 설정**을 실제로 반영하도록 연결
- 소스 코드 39.7k줄 → 23k줄, lint 에러 0

### 완료된 기능
- 회원가입 + 로그인 + 관리자 승인 (Supabase Auth + RLS)
- 환자 CRUD (입원/협진/퇴원/재입원/삭제)
- Today 대시보드 (할 일 우선순위 정렬, 필터, 검색)
- 환자 워크스페이스 6탭 (요약/차팅/Lab/약제/메모/일정)
- 차팅 폼 + 템플릿 + OCS 통합 복사 (포맷 커스텀 설정)
- Lab: XLS 스마트 파싱, 일괄 입력, 수치 표 인라인 편집, 추이 차트, Culture
- 투약: OCS 붙여넣기 파싱, 항생제 D-day
- AI: SOAP 변환, Lab 요약, 인수인계 요약, 투약 안전성 체크 (Claude/GPT/Gemini/Grok)
- Lab Import Inbox (Supabase Storage + 로컬 폴더)
- 암호화 백업 스냅샷 + 복원 영향 미리보기

### 예정
- 알림 고도화 (커스텀 규칙, 히스토리)
- AI 음성 질의 (회진 중 자연어 조회) — `CLAUDE.md` 기능 스펙 참고
- 근거연결 AI (가이드라인/논문 추천)
- WardLink 통합 (공통 로그인, WardCare 연동)

상세한 진행 상황은 [TODO.md](./TODO.md)를 참고하세요.

## 성능 최적화 전략

### 쿼리
- 모든 DB 접근은 `src/data/*.repository.ts`를 거치며, **컬럼을 명시해서 select** 합니다
- Today 브리핑·사이드바 조회는 **활성 환자 ID로 스코프**하고, `.in()` 청크로 나눠 병렬 실행합니다
- 작은 임상 데이터 쓰기 후에는 Today 브리핑만 낙관적으로 갱신하고, 서버 확인 갱신은 합쳐서 한 번만 실행합니다

### 로딩
- 초기 로드는 환자 목록 + Today 브리핑을 병렬로 가져옵니다
- 앱 셸 즉시 렌더 (정적 UI 우선)
- 점진적 로딩 (목록 → 탭 진입 시 상세 → 차트 온디맨드)
- 코드 스플리팅 (`React.lazy()` + `Suspense`) — Recharts(≈380kB)는 Lab 추이 차트를 열 때만 로드합니다
- 포커스 복귀 시 60초 이상 지난 데이터만 조용히 갱신하며, 미저장 작업이 있으면 건너뜁니다

## 라이선스

Private — All rights reserved

## 문의

프로젝트 관련 문의는 Issue를 통해 부탁드립니다.
