# WardFlow

> 입원환자 담당 의사를 위한 환자 관리 및 차팅 보조 PWA 앱

## 프로젝트 소개

WardFlow는 **모든 과의 입원환자를 담당하는 의사**를 위한 오프라인 우선(Offline-first) 환자 관리 시스템입니다. Desktop-First로 설계되어 병원 컴퓨터에서 OCS/EMR과 병행하며 사용하고, 회진 시에는 모바일로 열람 및 간단 메모를 지원합니다.

### 핵심 기능

- **Today's Note 대시보드**: 오늘의 알림/회진/항생제 현황/Lab 요약/일정을 한눈에
- **환자 관리**: 입원/컨설트/퇴원 환자 사이드바, Attention 플래그, 태그 시스템
- **차팅 폼**: C/C ~ Etc 구조화된 입력, Problem List 편집/순서변경, 템플릿 시스템
- **통합 복사**: 차팅 내용을 한 번에 복사하여 OCS에 바로 붙여넣기
- **Lab 결과 관리**: XLS 스마트 파싱, 추이 차트, 비정상 수치 하이라이트, 셀 편집
- **투약 관리**: OCS 처방 붙여넣기 파싱, 항생제 D-day 자동 계산, 종료일 자동 비활성화
- **일정 관리**: 캘린더 뷰, 카테고리별 일정 관리
- **회원 시스템**: 회원가입 + 관리자 승인, 역할별 권한, 모듈 권한(WardLink 확장 대비)
- **데이터 백업**: AES-256 암호화 파일/텍스트 백업, Supabase 서버 동기화
- **PWA**: 앱처럼 설치 가능, 오프라인 동작

### 스크린샷

| Today's Note | 환자 상세 | Lab 테이블 |
|:---:|:---:|:---:|
| 대시보드 | 개요/차트/투약/Lab/메모 탭 | 시계열 + 추이 차트 |

## 기술 스택

- **Framework**: React 18 + TypeScript (strict mode)
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State**: Zustand (persist middleware)
- **Local DB**: Dexie.js (IndexedDB wrapper with compound indexes)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa
- **Server Sync**: Supabase (optional, AES-256 encrypted)
- **Testing**: Vitest + React Testing Library
- **Deploy**: Vercel

## 시작하기

### 필수 요구사항

- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 패키지 설치
npm install

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

```
wardflow/
├── src/
│   ├── components/      # React 컴포넌트
│   │   ├── ui/         # shadcn/ui 공통 컴포넌트
│   │   ├── patient/    # 환자 관련
│   │   ├── charting/   # 차팅 폼
│   │   ├── lab/        # Lab 결과
│   │   ├── medication/ # 투약
│   │   ├── note/       # 회진 메모
│   │   ├── schedule/   # 일정
│   │   └── layout/     # 레이아웃 (Header, Sidebar, AppShell)
│   ├── db/             # Dexie.js 스키마 및 시드
│   ├── stores/         # Zustand 스토어
│   ├── hooks/          # 커스텀 훅
│   ├── services/       # 비즈니스 로직
│   │   └── parser/     # Lab/투약 파서
│   ├── utils/          # 유틸리티
│   ├── types/          # TypeScript 타입 정의
│   └── pages/          # 페이지 컴포넌트
├── CLAUDE.md           # Claude Code 가이드
├── PRD.md              # 상세 요구사항
└── TODO.md             # 태스크 관리
```

## 개발 현황

**v1.0.3** (2026-03-27) — Phase 1~2 완료, 실사용 가능

### Phase 1: Foundation (MVP Core) — 완료
- [x] 프로젝트 셋업 (Vite + React + TS + Tailwind + PWA)
- [x] Dexie.js DB 스키마 + 복합 인덱스
- [x] 레이아웃 (데스크톱 사이드바 + 모바일 하단 네비 + 반응형)
- [x] 회원가입 + 로그인 + 관리자 승인 시스템
- [x] 환자 CRUD (입원/컨설트/퇴원/재입원)
- [x] 차팅 폼 (C/C~Etc, Problem List, 템플릿)
- [x] Lab 결과 관리 (XLS 파싱, 추이 차트, 셀 편집, Culture)
- [x] 투약 관리 (OCS 붙여넣기, 항생제 D-day, 지참약 종료/재활성화)
- [x] 회진 메모 (경과/알림, 날짜 지정)
- [x] Today's Note 대시보드 (알림/회진/항생제/Lab/일정)
- [x] PIN 잠금 + 프리페치
- [x] 사이드바 플래그 (Attention/알림/항생제, 실시간 반영)
- [x] 모바일 반응형
- [x] QA 테스트 65건

### Phase 2: Smart Input — 완료
- [x] Lab 스마트 파싱 (XLS BIFF/cp949, 검사코드 매핑, 일괄 업로드)
- [x] Lab 카테고리 시스템 (커스텀 카테고리 편집)
- [x] 템플릿 시스템 (CRUD, 필드별 적용)
- [x] 차팅 복사 포맷 커스텀 설정
- [x] 일정 관리 (캘린더 뷰, 카테고리 커스텀)
- [x] 데이터 백업/복원 (AES-256, 파일/텍스트/서버 동기화)

### Phase 3: WardAide — AI (예정)
- [ ] AI 사이드바 UI
- [ ] 로컬 DB 자연어 쿼리
- [ ] Lab 추이 분석 AI
- [ ] 알림 고도화 (커스텀 규칙, 히스토리)

### Phase 4: WardLink Integration (예정)
- [ ] CouchDB/PouchDB 자동 동기화
- [ ] 공통 로그인 시스템
- [ ] WardCare 모듈 연동

상세한 진행 상황은 [TODO.md](./TODO.md)를 참고하세요.

## 성능 최적화 전략

### Dexie.js 복합 인덱스
- `[status+roomBed]`: 활성 환자 병실순 조회
- `[patientId+testDate]`: 환자별 Lab 추이
- `[patientId+isActive]`: 환자별 현재 투약
- `[isAntibiotic+isActive]`: 항생제 D-day 계산
- `[patientId+category]`: Lab 카테고리별 조회

### 로딩 최적화
- PIN 입력 중 백그라운드 프리페치
- 앱 셸 즉시 렌더 (정적 UI 우선)
- 점진적 로딩 (목록 → 상세 → 차트)
- 코드 스플리팅 (`React.lazy()` + `Suspense`)

## 라이선스

Private — All rights reserved

## 문의

프로젝트 관련 문의는 Issue를 통해 부탁드립니다.
