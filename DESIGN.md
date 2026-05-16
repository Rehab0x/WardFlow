# WardFlow 디자인 리뉴얼 — Clinical Calm v1

> 이 문서는 WardFlow의 디자인 시스템을 새로 정의합니다. Claude Code는 이 문서를 기준으로 작업하고, 새 화면을 만들 때도 여기 정의된 토큰·컴포넌트·룰만 사용합니다.

---

## 0. 한 문단 요약

기존 시안(cyan) 헤더 배너와 컬러 아이콘 원 중심의 디자인을 **무채색(zinc) 기반 + amber/red 의미색**의 클리닉 톤으로 전면 교체합니다. 카드를 세로로 5개 쌓던 대시보드는 **4개 스탯 + 2×2 섹션 카드** 그리드로 재구성하여 정보 밀도를 높입니다. 위계는 색이 아니라 **타이포·간격·모노스페이스**로 잡고, 상태색(amber/red)은 의미가 있을 때만 등장합니다.

---

## 1. 디자인 원칙

1. **색 폭주 금지** — 액센트 컬러를 만들지 않습니다. 시안/sky 계열은 완전히 제거. 의미 있는 상태(`amber`=주의, `red`=비정상/긴급)만 색을 갖습니다.
2. **데이터 행 우선** — 모든 임상 정보는 `[병실번호(mono)] [본문] [상태 pill]` 형태의 균일한 행 구조로 표현합니다.
3. **타이포 위계** — 색이 아니라 크기·굵기·간격으로 위계를 만듭니다. `font-weight`는 400/500 두 단계만. 600/700은 헤비해 보여서 금지.
4. **숫자는 mono** — 병실번호, D-day, 검사 수치, 시간, 카운트는 전부 `font-mono tabular-nums`. 시각 안정감의 70%가 여기서 옵니다.
5. **빈 상태도 구조** — `~없습니다` 텍스트만 두지 않습니다. 0건이어도 행 구조와 카운트(`0`)는 표시되어 의도된 화면처럼 보이게 합니다.

---

## 2. 컬러 시스템

### 사용 가능한 색 (Tailwind 클래스만)

#### Grayscale (zinc ramp — 유일한 무채색)
| 용도 | 클래스 |
|---|---|
| 페이지 배경 | `bg-zinc-50` |
| 카드 배경 | `bg-white` |
| Primary text | `text-zinc-900` |
| Body text | `text-zinc-700` |
| Secondary text | `text-zinc-500` |
| Hint/Tertiary text | `text-zinc-400` |
| Border (모든 경계선) | `border-zinc-200` |
| Hover 배경 | `bg-zinc-100` |

#### Semantic (amber/red — 의미 있을 때만)
| 의미 | 텍스트 | 배경(pill) | 텍스트(pill) |
|---|---|---|---|
| Warning (주의, D-day 임박, 약한 abnormal) | `text-amber-600` | `bg-amber-50` | `text-amber-700` |
| Danger (abnormal, 긴급, 강한 abnormal) | `text-red-600` | `bg-red-50` | `text-red-700` |
| Muted (D-day 안전 범위) | — | `bg-zinc-50` | `text-zinc-500` |

### 금지 색
- ❌ **`cyan`, `sky`, `blue`** — 기존 시안 banner 잔재. 절대 사용 금지.
- ❌ **`slate`** — zinc와 섞이면 톤이 흐트러집니다. zinc로 통일.
- ❌ **컬러 아이콘 원 (`bg-yellow-100 rounded-full`)** — 이모지 톤이라 금지.
- ❌ **그라데이션 / shadow / blur** — 어떤 효과도 사용하지 않습니다. 경계선은 항상 `border-zinc-200` 단색.

---

## 3. 타이포그래피

| 요소 | 클래스 |
|---|---|
| 페이지 제목 (H1, 예: "Today") | `text-[22px] font-medium leading-tight tracking-tight text-zinc-900` |
| 페이지 부제 (날짜·사용자) | `text-[12px] text-zinc-400` |
| 카드 제목 (H3) | `text-[12px] font-medium text-zinc-900` |
| Stat 카드 라벨 | `text-[11px] text-zinc-400` |
| Stat 카드 숫자 | `font-mono text-[22px] font-medium tracking-tight tabular-nums` |
| 데이터 행 본문 | `text-[12px] text-zinc-700` |
| 데이터 행 prefix (병실·시간) | `font-mono text-[10.5px] text-zinc-400 min-w-[38px]` |
| Status pill | `font-mono text-[10px] font-medium` |
| Body 내 메트릭 (Lab 수치) | `font-mono` + 의미색 |

### 규칙
- **두 가지 굵기만**: 400 (`font-normal`), 500 (`font-medium`). 600/700 금지.
- **Sentence case**: 영문은 `Today`, `Lab`처럼 첫 글자만. ALL CAPS 금지.
- **자간**: 큰 글자(`text-[22px]` 이상)는 `tracking-tight`.
- **숫자가 들어가는 모든 곳**: `font-mono tabular-nums`. 병실번호·D-day·시간·검사값·카운트 예외 없음.

---

## 4. 레이아웃 & 스페이싱

| 요소 | 값 |
|---|---|
| 헤더 높이 | `h-12` (48px) |
| 페이지 컨테이너 | `mx-auto max-w-5xl px-6 py-6` |
| Stat row | `grid grid-cols-4 gap-2` |
| Section card grid | `grid grid-cols-1 md:grid-cols-2 gap-2` |
| 카드 패딩 (Section) | `p-3.5` |
| 카드 패딩 (Stat) | `px-3 py-2.5` |
| 카드 모서리 (Section/Stat) | `rounded-lg` |
| 카드 모서리 (input, button) | `rounded-md` |
| 데이터 행 간격 | `space-y-px` (1px) — 의도된 빽빽함 |
| 데이터 행 패딩 | `py-0.5` |

### 헤더 구조
- `sticky top-0 z-30`
- 배경 `bg-white/85 backdrop-blur-md`
- 하단 `border-b border-zinc-200`
- 좌측: stethoscope 아이콘 + WardFlow 텍스트 (`text-[13px] font-medium`)
- 우측: 아이콘 버튼 5개 (`h-7 w-7 rounded-md`, hover 시 `bg-zinc-100`)
- **기존의 시안 banner는 완전히 제거합니다.**

---

## 5. 새로 만들 / 수정할 파일

### 신규 파일
- `src/components/dashboard/StatCard.tsx`
- `src/components/dashboard/SectionCard.tsx` (Row/Room/Time/Body/Pill/Metric 헬퍼 포함)

### 수정 파일
- `src/components/layout/Header.tsx` — 전면 교체
- `src/pages/TodaysNote.tsx` (또는 동등한 메인 페이지) — 전면 교체
- `src/components/layout/Sidebar.tsx` — 별도 작업 (이 문서 §9 참조, Phase 2)

### 제거/정리 대상
- 기존 헤더의 시안 그라데이션·banner 스타일
- 카드별 색 원형 아이콘 컨테이너 (`<div className="rounded-full bg-yellow-100 ...">` 같은 패턴)
- "오늘 알림이 없습니다" 등 평문 empty state — `<SectionCard>` 내부에서 카운트 `0`으로 처리

---

## 6. 컴포넌트 코드 (그대로 사용)

### 6.1 Header

`src/components/layout/Header.tsx`

```tsx
import { FileText, UserPlus, FlaskConical, Settings, LogOut, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-zinc-200 bg-white/85 px-4 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2 text-zinc-900">
        <Stethoscope className="h-4 w-4" strokeWidth={2} />
        <span className="text-[13px] font-medium tracking-tight">WardFlow</span>
      </Link>

      <nav className="flex items-center gap-0.5">
        <IconBtn aria-label="템플릿"><FileText className="h-4 w-4" /></IconBtn>
        <IconBtn aria-label="새 환자"><UserPlus className="h-4 w-4" /></IconBtn>
        <IconBtn aria-label="Lab"><FlaskConical className="h-4 w-4" /></IconBtn>
        <IconBtn aria-label="설정"><Settings className="h-4 w-4" /></IconBtn>
        <IconBtn aria-label="로그아웃"><LogOut className="h-4 w-4" /></IconBtn>
      </nav>
    </header>
  );
}

function IconBtn({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900",
        className,
      )}
    />
  );
}
```

기존 헤더가 가지고 있던 라우팅/액션(예: 새 환자 모달 열기, 로그아웃 핸들러 등)은 그대로 옮겨와서 `IconBtn`의 `onClick`에 연결합니다.

### 6.2 StatCard

`src/components/dashboard/StatCard.tsx`

```tsx
import { cn } from "@/lib/utils";

type Tone = "default" | "warning" | "danger";

const toneText: Record<Tone, string> = {
  default: "text-zinc-900",
  warning: "text-amber-600",
  danger: "text-red-600",
};

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div
        className={cn(
          "mt-0.5 font-mono text-[22px] font-medium leading-none tracking-tight tabular-nums",
          toneText[tone],
        )}
      >
        {value}
      </div>
    </div>
  );
}
```

**Tone 사용 룰**: `value > 0`이고 사용자 주의가 필요한 카운트(예: 알림, abnormal lab 수)에만 `warning` 또는 `danger` 사용. 그 외 카운트는 `default`.

### 6.3 SectionCard (+ 헬퍼들)

`src/components/dashboard/SectionCard.tsx`

```tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionCard({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count?: string | number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3.5">
      <header className="mb-2.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.8} />
        <h3 className="text-[12px] font-medium text-zinc-900">{title}</h3>
        {count !== undefined && (
          <span className="ml-auto font-mono text-[11px] text-zinc-400">{count}</span>
        )}
      </header>
      <div className="space-y-px">{children}</div>
    </section>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 py-0.5 text-[12px]">{children}</div>;
}

export function Room({ children }: { children: React.ReactNode }) {
  return <span className="min-w-[38px] font-mono text-[10.5px] text-zinc-400">{children}</span>;
}

export function Time({ children }: { children: React.ReactNode }) {
  return <span className="min-w-[38px] font-mono text-[10.5px] text-zinc-400">{children}</span>;
}

export function Body({ children }: { children: React.ReactNode }) {
  return <span className="min-w-0 flex-1 truncate text-zinc-700">{children}</span>;
}

export function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warning" | "danger" | "muted";
}) {
  const styles = {
    default: "bg-zinc-100 text-zinc-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    muted: "bg-zinc-50 text-zinc-500",
  }[tone];
  return (
    <span className={cn("rounded-full px-1.5 py-px font-mono text-[10px] font-medium", styles)}>
      {children}
    </span>
  );
}

export function Metric({
  value,
  tone = "default",
}: {
  value: string;
  tone?: "default" | "warning" | "danger";
}) {
  const c = {
    default: "text-zinc-700",
    warning: "text-amber-600",
    danger: "text-red-600",
  }[tone];
  return <span className={cn("font-mono", c)}>{value}</span>;
}
```

#### Pill tone 결정 룰 (항생제 D-day 예시)
- `D ≤ 5`: `muted` (안전)
- `D 6–9`: `warning` (검토 필요)
- `D ≥ 10`: `danger` (장기 사용, 재평가 필요)

#### Metric tone 결정 룰 (Lab 값)
- 정상 범위: `default`
- 경계 abnormal: `warning`
- 명확한 abnormal: `danger`
- 화살표 `↑/↓`는 값과 함께 같은 색으로.

### 6.4 TodaysNote 페이지

`src/pages/TodaysNote.tsx`

```tsx
import { Bell, Pill as PillIcon, FlaskConical, CalendarDays } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  SectionCard,
  Row,
  Room,
  Time,
  Body,
  Pill,
  Metric,
} from "@/components/dashboard/SectionCard";

export function TodaysNote() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const timeStr = today.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // TODO: 기존 Zustand store / Dexie hook 연결
  // const { admittedCount, consultCount, antibioticCount, alerts, antibiotics, recentLabs, schedules } = useDashboardData();

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* Page header */}
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h1 className="text-[22px] font-medium leading-tight tracking-tight text-zinc-900">
            Today
          </h1>
          <p className="mt-0.5 text-[12px] text-zinc-400">{dateStr} · 김근태</p>
        </div>
        <div className="font-mono text-[11px] text-zinc-400">{timeStr}</div>
      </div>

      {/* Stats */}
      <div className="mb-2 grid grid-cols-4 gap-2">
        <StatCard label="입원" value={12} />
        <StatCard label="컨설트" value={3} />
        <StatCard label="항생제" value={4} />
        <StatCard label="알림" value={5} tone="warning" />
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <SectionCard icon={Bell} title="알림" count={5}>
          <Row><Room>412-A</Room><Body>CT 결과 확인</Body><Pill tone="warning">오늘</Pill></Row>
          <Row><Room>415-A</Room><Body>수술 동의서</Body><Pill tone="danger">D-1</Pill></Row>
          <Row><Room>418-A</Room><Body>보호자 면담</Body></Row>
        </SectionCard>

        <SectionCard icon={PillIcon} title="항생제" count={4}>
          <Row><Room>412-A</Room><Body>Ceftriaxone</Body><Pill tone="warning">D6</Pill></Row>
          <Row><Room>415-A</Room><Body>Pip/Tazo</Body><Pill tone="danger">D10</Pill></Row>
          <Row><Room>418-A</Room><Body>Vancomycin</Body><Pill tone="muted">D3</Pill></Row>
        </SectionCard>

        <SectionCard icon={FlaskConical} title="최근 Lab" count="2일">
          <Row><Room>412-A</Room><Body>CRP <Metric tone="danger" value="14.2 ↑" /></Body></Row>
          <Row><Room>415-A</Room><Body>Hb <Metric tone="danger" value="7.8 ↓" /></Body></Row>
          <Row><Room>418-A</Room><Body>eGFR <Metric tone="warning" value="52" /></Body></Row>
        </SectionCard>

        <SectionCard icon={CalendarDays} title="일정" count={3}>
          <Row><Time>09:00</Time><Body>아침 컨퍼런스</Body></Row>
          <Row><Time>14:00</Time><Body>412호 가족 면담</Body></Row>
          <Row><Time>17:00</Time><Body>컨설트 회신</Body></Row>
        </SectionCard>
      </div>

      {/* Memo search */}
      <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
        <input
          type="text"
          placeholder="환자명, 병실번호 또는 메모 내용으로 검색"
          className="w-full bg-transparent text-[12px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
```

**중요**: 위 코드의 하드코딩된 값(`12`, `3`, `412-A`, `Ceftriaxone` 등)은 모두 **기존 Zustand store와 Dexie hook에서 가져온 실제 데이터로 교체**해야 합니다. 데이터 fetching 로직은 기존 로직을 그대로 사용하고, *렌더링만* 위 구조로 바꿉니다.

### 데이터 0건 처리
빈 상태도 구조를 유지합니다:

```tsx
<SectionCard icon={Bell} title="알림" count={alerts.length}>
  {alerts.length === 0 ? (
    <Row><Body><span className="text-zinc-400">없음</span></Body></Row>
  ) : (
    alerts.map(a => (
      <Row key={a.id}>
        <Room>{a.roomBed}</Room>
        <Body>{a.message}</Body>
        {a.urgency && <Pill tone={a.urgency}>{a.urgencyLabel}</Pill>}
      </Row>
    ))
  )}
</SectionCard>
```

---

## 7. 마이그레이션 단계 (Claude Code 작업 순서)

### Step 1: 의존성 확인
- [ ] `lucide-react` 설치 확인 (shadcn 기본 포함)
- [ ] `@/lib/utils`의 `cn` 헬퍼 존재 확인
- [ ] Tailwind에 `font-mono` 폰트 정의 확인 (없으면 `tailwind.config.js`에 추가)

### Step 2: 새 컴포넌트 생성
- [ ] `src/components/dashboard/StatCard.tsx` 생성 (§6.2)
- [ ] `src/components/dashboard/SectionCard.tsx` 생성 (§6.3)

### Step 3: Header 교체
- [ ] 기존 `Header.tsx` 백업 (`Header.tsx.bak`)
- [ ] §6.1 코드로 교체
- [ ] 기존 핸들러/라우팅 로직을 `IconBtn`에 연결
- [ ] 시안 banner 관련 스타일·이미지·svg 자산 제거
- [ ] 모바일 햄버거 메뉴는 별도 유지 (있다면)

### Step 4: TodaysNote 페이지 리팩터
- [ ] 기존 페이지 파일 백업
- [ ] §6.4 코드로 교체
- [ ] 기존 Zustand selector / Dexie query 그대로 연결
- [ ] 카드별 데이터 매핑:
  - 알림 → `useAlerts()`
  - 항생제 → `useActiveAntibiotics()` (D-day 계산 결과 활용)
  - 최근 Lab → `useRecentLabs(2)` (2일치)
  - 일정 → `useTodaysSchedules()`
- [ ] 0건 처리 패턴 적용 (§6.4 하단)

### Step 5: 전역 스타일 정리
- [ ] `index.css` / `globals.css`에서 cyan 관련 변수·클래스 제거
- [ ] 배경색을 `bg-zinc-50`으로 통일
- [ ] body font에 `font-feature-settings: "tnum"` 추가 (전역 tabular-nums 보장은 선택)

### Step 6: 빌드 & 검증
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run dev`로 시각 확인
- [ ] 모바일 뷰포트(<768px)에서 stat은 `grid-cols-2`, sections는 `grid-cols-1`로 자연스럽게 떨어지는지 확인

---

## 8. 모바일 반응형

| 영역 | 모바일(<768px) | 데스크톱(≥768px) |
|---|---|---|
| Stat row | `grid-cols-2` | `grid-cols-4` |
| Section cards | `grid-cols-1` | `grid-cols-2` |
| 페이지 패딩 | `px-4 py-4` | `px-6 py-6` |
| 헤더 | 그대로 유지 | 그대로 유지 |

Stat row의 모바일 처리는 `TodaysNote.tsx`에서 `grid-cols-2 md:grid-cols-4`로 명시:

```tsx
<div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
```

---

## 9. 후속 작업 (Phase 2 이후)

이번 PR에서는 다루지 않지만, 같은 디자인 시스템으로 이어서 적용할 영역:

### 9.1 Sidebar
- 의사 프로필: 이니셜 아바타(`h-7 w-7 rounded-full bg-zinc-100 text-zinc-700`)
- 환자 행: `flex gap-2 py-1`, 병실번호 mono prefix + 이름 + 우측 attention dot
- Attention dot: `h-1.5 w-1.5 rounded-full`, 색은 `bg-amber-500`(주의) / `bg-red-500`(긴급)
- 섹션 헤더(입원/컨설트/퇴원): chevron + 라벨 + mono 카운트 우측 정렬, collapsible

### 9.2 환자 상세 페이지
- 헤더에 환자 메타(이름, 병실, 진단명, 입원일) 한 줄
- 탭(개요/Lab/투약/메모)은 `border-b border-zinc-200` 위에 active 탭은 `border-b-2 border-zinc-900`
- 탭 내부는 SectionCard 톤 그대로

### 9.3 Lab 테이블
- 셀: `text-[12px] font-mono tabular-nums`
- abnormal 셀: `bg-amber-50 text-amber-700` (경계) / `bg-red-50 text-red-700` (강한 abnormal)
- 컬럼 헤더: `text-[10.5px] text-zinc-400 font-medium uppercase tracking-wide`는 사용 금지 — `text-[11px] text-zinc-500`로 sentence case

### 9.4 다크 모드
- 이번 PR에서는 다루지 않음. 다크 모드 도입 시 별도 PR.
- 다크 모드용 토큰 매핑은 추후 `DESIGN.md`에 §10으로 추가.

---

## 10. 확장 룰 (앞으로 새 화면 만들 때)

새로운 페이지나 컴포넌트를 만들 때 따라야 할 룰:

1. **이 문서 §2의 색 외에는 사용하지 마세요.** 새 색이 필요하다고 느낀다면, 95% 확률로 기존 색의 위계 차이로 풀 수 있습니다.
2. **데이터 행은 항상 `[prefix(mono)] [Body] [상태]` 형태로.** prefix는 병실, 시간, 날짜, 환자 ID 중 하나입니다.
3. **숫자가 보이는 모든 곳에 `font-mono tabular-nums`.** 예외 없음.
4. **새 컴포넌트는 zinc 그라데이션과 amber/red 의미색만으로 만들어보고, 그래도 부족하면 PR에서 논의.**
5. **shadow / gradient / blur / cyan / blue / slate 금지.**
6. **`font-weight`는 400 또는 500만.**
7. **카드 모서리는 `rounded-lg`, 작은 요소는 `rounded-md`, pill은 `rounded-full`.**
8. **새 페이지의 H1은 `text-[22px] font-medium tracking-tight`.** Today, Patients, Settings 같은 짧은 영문 단어 우선, 한글은 부제로.

---

## 11. 변경 요약 (커밋 메시지용)

```
refactor(ui): Clinical Calm 디자인 시스템 적용 (v2)

- 시안 banner 헤더 제거, 무채색(zinc) 베이스로 통일
- Today's Note 대시보드: 세로 5장 카드 → 4 stat + 2x2 sections 그리드
- 신규: StatCard, SectionCard (+Row/Room/Time/Body/Pill/Metric)
- amber/red만 의미색으로 사용. cyan/sky/blue 제거
- 숫자/병실번호/D-day/Lab 값에 font-mono tabular-nums 강제
- 빈 상태도 구조 유지 (count=0)
```

---

## 부록 A. Claude Code에게 작업 의뢰할 때 템플릿

> `DESIGN.md`를 읽고 WardFlow 디자인 시스템을 v2(Clinical Calm)로 마이그레이션해줘. §7 마이그레이션 단계의 Step 1~6을 순서대로 진행하고, 각 단계마다 결과를 보여줘. 기존 데이터 fetching 로직(Zustand, Dexie)은 그대로 두고 렌더링만 새 컴포넌트로 교체해. Step 4 끝나면 한 번 멈춰서 스크린샷 확인 후 진행할게.

