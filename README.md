# WardFlow

> 입원환자 담당 의사를 위한 환자 관리 및 차팅 보조 PWA 앱

## 프로젝트 소개

WardFlow는 **모든 과의 입원환자를 담당하는 의사**를 위한 오프라인 우선(Offline-first) 환자 관리 시스템입니다. Desktop-First로 설계되어 병원 컴퓨터에서 OCS/EMR과 병행하며 사용하고, 회진 시에는 모바일로 열람 및 간단 메모를 지원합니다.

### 핵심 기능

- **환자 관리**: 입원환자 목록, 상세 정보, 차팅 폼 (C/C ~ Etc)
- **📋 통합 복사**: 차팅 내용을 한 번에 복사하여 OCS에 바로 붙여넣기
- **Lab 결과 관리**: 스마트 파싱(XLS 업로드), 추이 차트, 비정상 수치 하이라이트
- **투약 관리**: OCS 처방 붙여넣기 파싱, 항생제 D-day 자동 계산
- **Morning Briefing**: 오늘의 알림, 일정, Lab 요약을 한눈에
- **오프라인 우선**: 네트워크 없이도 모든 기능 동작

### 성능 목표 ⚡

- **로그인 → 첫 화면**: < 500ms
- **환자 목록 로딩**: < 300ms (50명 기준)
- **환자 상세 전환**: < 200ms

## 기술 스택

- **Framework**: React 18 + TypeScript (strict mode)
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State**: Zustand
- **Local DB**: Dexie.js (IndexedDB wrapper with compound indexes)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa
- **Testing**: Vitest + React Testing Library

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
npm run test:ui
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
│   │   └── layout/     # 레이아웃
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

## 핵심 문서

| 파일 | 설명 |
|------|------|
| [CLAUDE.md](./CLAUDE.md) | Claude Code 개발 가이드 — 기술 스택, 코딩 컨벤션, 설계 원칙 |
| [PRD.md](./PRD.md) | 상세 기능 요구사항, 데이터 모델, 파싱 설계 |
| [TODO.md](./TODO.md) | 태스크 관리 Single Source of Truth |

## 개발 현황

현재 **Phase 1: Foundation (MVP Core)** 진행 중

- [x] 프로젝트 셋업 (Vite + React + TS + Tailwind)
- [x] PWA 기본 구성
- [x] Dexie.js 복합 인덱스 스키마 설계
- [x] 기본 타입 정의 및 유틸리티
- [ ] 레이아웃 및 라우팅
- [ ] 환자 CRUD
- [ ] 차팅 폼
- [ ] Lab 결과 관리
- [ ] 투약 관리
- [ ] Morning Briefing

상세한 진행 상황은 [TODO.md](./TODO.md)를 참고하세요.

## 성능 최적화 전략

### Dexie.js 복합 인덱스
- `[status+roomBed]`: 활성 환자 병실순 조회
- `[patientId+testDate]`: 환자별 Lab 추이
- `[patientId+isActive]`: 환자별 현재 투약
- `[isAntibiotic+isActive]`: 항생제 D-day 계산

### 로딩 최적화
- PIN 입력 중 백그라운드 프리페치
- 앱 셸 즉시 렌더 (정적 UI 우선)
- 점진적 로딩 (목록 → 상세 → 차트)
- 코드 스플리팅 (`React.lazy()` + `Suspense`)

## 라이선스

MIT License

## 문의

프로젝트 관련 문의는 Issue를 통해 부탁드립니다.
