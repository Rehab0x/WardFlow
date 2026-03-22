# WardFlow PRD (Product Requirements Document)

> WardLink 프로젝트의 첫 번째 모듈 — 입원환자 담당 의사를 위한 환자 관리 및 차팅 보조 도구

## 1. 프로젝트 개요

### 1.1 비전
WardFlow는 **모든 과의 입원환자를 담당하는 의사**가 병동 업무를 효율적으로 수행할 수 있도록 돕는 **Offline-first PWA** 앱이다. 컴퓨터에서 처방 및 차팅을 하면서 환자 정보를 정리하고, 회진 시에는 모바일로 열람하며, 정리한 내용을 OCS/EMR에 바로 붙여넣을 수 있도록 하는 것이 핵심 목표다.

### 1.2 상위 프로젝트
WardFlow는 **WardLink** 플랫폼의 하위 모듈이다.
- **WardLink**: 환자정보 저장 및 공유 플랫폼 (뼈대)
- **WardFlow**: 의사용 모듈 ← 현재 개발 대상
- WardCare (병동), WardAct (재활/검사실), WardDesk (원무/행정), WardAide (AI) → 추후 개발

### 1.3 MVP 타겟 사용자
- **Primary**: 입원환자를 담당하는 모든 과 전공의/전문의
- **Secondary**: 같은 병동의 다른 의료진
- 환경: 주 작업은 **데스크톱(병원 컴퓨터)**에서 처방/차팅과 병행하며, 회진 시에는 **모바일**로 열람 및 간단 메모

### 1.4 성공 지표
- ⚡ **로그인 → 첫 화면 표시 500ms 이내** (최우선 목표)
- 환자 정보 조회 3초 이내
- 아침 회진 준비 시간 50% 단축 (기존 30분 → 15분 목표)
- 차팅 내용 정리 → OCS 붙여넣기까지 원클릭
- 오프라인에서도 모든 핵심 기능 동작

---

## 2. 핵심 기능 (MVP Scope)

### 2.1 환자 목록 관리 (Patient List)
**유저 스토리**:
- "내가 담당하는 환자 목록을 한눈에 보고 싶다."
- "새 환자가 입원하면 빠르게 등록하고, 퇴원하면 목록에서 정리하고 싶다."

**기능 요구사항**:
- 환자 목록 조회 (카드형 / 리스트형 토글)
- 환자 추가 / 수정 / 퇴원처리 (soft delete — 퇴원 환자 아카이브)
- 환자 카드에 표시할 정보: 이름, 나이/성별, 진단명(C/C), 입원일, 병실/침대, 담당의, 주요 태그
- 검색 및 필터: 이름, 병실, 진단명, 태그 기반
- 정렬: 병실순(기본), 입원일순, 이름순

### 2.2 환자 정보 입력 폼 (Patient Charting Form) ⭐ 핵심 기능
**유저 스토리**:
- "새 환자 입원 시 구조화된 폼에 맞춰 정보를 채워 넣고 싶다."
- "정리한 차팅 내용을 한 번에 복사해서 OCS에 바로 붙여넣고 싶다."
- "자주 쓰는 문구는 템플릿으로 빠르게 입력하고 싶다."

**폼 필드 구성**:
```
[기본 정보 섹션]
  병실번호:        [ 텍스트 필드 ]
  환자 이름:       [ 텍스트 필드 ]
  생년월일:        [ 날짜 필드 ]

[차팅 섹션] — OCS 복사 대상 영역
  Chief Complaint:  [ 텍스트 필드 (한 줄) ]
  Onset:            [ 텍스트 필드 (한 줄) ]
  Present Illness:  [ 리사이즈 가능 텍스트 영역 ]
  Past History:     [ 리사이즈 가능 텍스트 영역 ]
  Review of System: [ 리사이즈 가능 텍스트 영역 ]
  Physical Exam:    [ 리사이즈 가능 텍스트 영역 ]
  Problem List:     [ 리사이즈 가능 텍스트 영역 ] 또는 [ 개별 필드 추가 방식 ]
  Plan:             [ 리사이즈 가능 텍스트 영역 ]
  Etc:              [ 리사이즈 가능 텍스트 영역 ]
```

**텍스트 영역 동작**:
- 모든 텍스트 영역은 드래그로 높이 조절 가능 (CSS `resize: vertical`)
- 내용이 길어지면 자동으로 영역 확장되는 auto-grow 옵션 제공
- 각 텍스트 영역 상단에 레이블 고정 표시

**Problem List 특수 동작** (두 가지 모드 중 선택 가능):
- 모드 A: 텍스트 영역에 자유 텍스트로 작성
- 모드 B: 개별 항목을 하나씩 추가하는 리스트 형태 (+ 버튼으로 항목 추가, 드래그로 순서 변경, × 버튼으로 삭제)

**템플릿 기능**:
- 각 텍스트 영역에 `/` 또는 단축키를 입력하면 템플릿 목록 팝업
- 사용자가 자주 쓰는 문구를 템플릿으로 저장 가능
- 예시: `/neuro` 입력 → 신경과 ROS 템플릿 자동 삽입
- 전역 템플릿 + 필드별 템플릿 구분 관리

**📋 통합 복사 (Copy to OCS) — 핵심 UX**:
- 차팅 섹션(C/C ~ Etc) 상단 또는 우측에 **"📋 복사"** 버튼 배치
- 클릭 시 C/C부터 Etc까지의 내용을 아래 포맷으로 클립보드에 복사:
```
[Chief Complaint]
환자가 입력한 C/C 내용

[Onset]
입력한 Onset 내용

[Present Illness]
입력한 PI 내용

[Past History]
입력한 PH 내용

[Review of System]
입력한 ROS 내용

[Physical Exam]
입력한 PE 내용

[Problem List]
1. 문제1
2. 문제2

[Plan]
입력한 Plan 내용

[Etc]
입력한 기타 내용
```
- 복사 포맷은 설정에서 커스텀 가능 (구분자 스타일, 빈 섹션 포함/제외 등)
- 복사 성공 시 토스트 알림: "차팅 내용이 클립보드에 복사되었습니다"
- 빈 필드는 복사 시 자동 제외 (옵션으로 변경 가능)
### 2.3 환자 상세 정보 (Patient Detail)
**유저 스토리**:
- "환자를 클릭하면 바로 핵심 정보가 보여야 한다."
- "Lab 결과 추이를 차트로 보고 싶다."

**기능 요구사항**:
- 탭 구조의 상세 뷰:
  - **Summary**: 기본정보 + 주요 진단 + 현재 이슈 요약
  - **Labs**: Lab 결과 테이블 + 추이 차트 (전해질, CBC, LFT, RFT 등)
  - **Medications**: 현재 투약 목록 (항생제 D-day 자동 계산 포함)
  - **Notes**: 회진 메모 / 경과 기록 (시간순)
  - **Schedule**: 외진, 재활치료, 검사 일정
- 각 탭은 독립적으로 로딩, 오프라인 캐시 지원

### 2.4 Lab 결과 관리
**유저 스토리**:
- "OCS에서 Lab 결과를 복사해서 붙여넣으면, 자동으로 파싱되어 저장되면 좋겠다."
- "전해질 추이를 차트로 보면서 이상 수치는 빨간색으로 표시해줬으면 한다."

**기능 요구사항**:
- **스마트 파싱**: OCS/EMR에서 복사한 텍스트를 붙여넣으면 자동으로 항목별 파싱
  - 지원 포맷: 일반 텍스트(탭/공백 구분), CSV
  - 파싱 실패 시 수동 매핑 UI 제공
- **수동 입력**: 개별 Lab 항목 직접 입력
- **CSV/엑셀 업로드**: 일괄 데이터 업로드
- **추이 차트**: 시계열 라인 차트 (비정상 수치 하이라이트)
- **참조 범위**: 주요 Lab 항목별 정상 범위 내장, 범위 벗어나면 시각적 경고

### 2.5 투약 관리 (Medications)
**유저 스토리**:
- "OCS에서 처방 목록을 복사해서 붙여넣으면 자동으로 파싱되면 좋겠다."
- "항생제를 며칠째 쓰고 있는지 자동으로 계산해줬으면 한다."
- "약물명을 클릭하면 바로 약물 정보를 볼 수 있었으면 한다."

**투약 데이터 붙여넣기 파싱**:

OCS에서 복사한 투약 텍스트 형식:
```
(6) 페로스핀정10mg(메틸페니데이트염산염)	1.0000	아침 식전
(6) 솝튼정	1.0000	아침,점심,저녁 식후30분
(6) 바로판(10mg/1정)	2.0000	아침,점심,저녁 식후30분
(6) 마그밀정	1.0000	아침, 저녁 식후30분
(6) 트라조돈염산염정50mg	1.0000	취침전
(6) 모사미르정(5.29mg/1정)	1.0000	아침, 저녁 식후30분
(6) 메디락DS장용캡슐	1.0000	아침, 저녁 식후30분
(6) 쿠에티아핀정25mg	0.5000	취침전
```

파싱 규칙:
```
포맷: (잔여일수) 약물명[TAB]1회투약량[TAB]투약시간

(6)                          → 잔여일수 (daysRemaining) — 저장은 하되, 목록에서는 제거하고 표시
페로스핀정10mg(메틸페니데이트염산염) → 약물명 (drugName)
1.0000                       → 1회 투약량 (singleDose) — 소수점 정리: 1.0000 → 1, 0.5000 → 0.5
아침 식전                     → 투약 시간/빈도 (schedule)
```

파싱 로직:
1. 줄 단위 분리
2. 정규식: `/^\((\d+)\)\s+(.+?)\t([\d.]+)\t(.+)$/`
3. `(숫자)` → daysRemaining (잔여일수, 참고용 저장)
4. 약물명 → drugName (괄호 포함 전체 보존)
5. 투약량 → singleDose (후행 0 제거: `parseFloat()`)
6. 투약시간 → schedule
7. 파싱 결과 미리보기 테이블 → 사용자 확인 후 일괄 저장

**붙여넣기 UI**:
- 투약 탭 상단에 **"📋 처방 붙여넣기"** 버튼
- 클릭 시 텍스트 영역 팝업 → 붙여넣기 → "파싱" 버튼
- 파싱 결과를 테이블로 미리보기 (약물명 | 1회량 | 투약시간)
- 각 행 수정 가능 → "저장" 클릭 시 일괄 등록
- 기존 투약 목록과 중복 감지 (같은 약물명이면 경고)

**약물 정보 링크 (네이버 의약품사전)**:
- 투약 목록에서 약물명 클릭 시 네이버 지식백과 의약품사전으로 이동
- URL 형식: `https://terms.naver.com/search.naver?query={drugBaseName}`
- 약물명에서 용량/제형 정보를 정리하여 검색어 생성
  - 예: "페로스핀정10mg(메틸페니데이트염산염)" → 검색어: "페로스핀정"
  - 예: "바로판(10mg/1정)" → 검색어: "바로판"
  - 정리 로직: 약물명에서 숫자+mg, 숫자+정, 괄호 내 용량 등을 제거한 기본명 추출
- 새 탭에서 열기
- 대안 링크: 의약품안전나라 `https://nedrug.mfds.go.kr/searchDrug?searchYn=true&typeName=&itemName={drugBaseName}` (설정에서 선택 가능)

**기타 기능 요구사항**:
- 현재 투약 목록 표시 (약물명, 1회량, 투약시간, 잔여일수)
- 항생제 D-day 자동 계산 및 표시 (시작일 기준)
- 투약 변경/중단 이력
- 항생제는 별도 색상(Purple 계열)으로 구분
- 항생제 여부는 수동 태그 또는 향후 약물 DB 연동으로 자동 분류

### 2.6 Morning Briefing
**유저 스토리**:
- "아침에 앱을 열면, 오늘 주의해야 할 사항이 한눈에 보였으면 한다."
- "항생제 D-day가 14일 넘은 환자, 오늘 외진 있는 환자 등을 놓치고 싶지 않다."

**기능 요구사항**:
- 대시보드 형태의 Today's Note
- 섹션 구성:
  - 🔔 **알림**: 비정상 Lab 결과, 항생제 장기사용 경고, 사용자 설정 알림
  - 📋 **오늘의 일정**: 외진 예정, 재활치료 스케줄, 예정된 검사
  - 📊 **Lab 요약**: 금일 새 Lab 결과 목록 및 이상치 하이라이트
  - 📝 **메모**: 전날 회진 시 작성한 To-do 항목
- 우선순위에 따라 정렬 (위험도 높은 순)

### 2.7 회진 메모 (Rounding Notes)
**유저 스토리**:
- "회진 중 스마트폰에서 빠르게 메모를 남기고 싶다."
- "메모는 시간순으로 보이고, 나중에 검색도 되면 좋겠다."

**기능 요구사항**:
- 간편 메모 입력 (환자 상세 → Notes 탭)
- 자동 타임스탬프
- 태그 기능 (#TODO, #중요, #consult 등)
- 전체 환자 메모 검색

---

## 3. 데이터 입력 방식 (우선순위순)

### 3.1 Lab 데이터 입력
| 순서 | 방식 | MVP 포함 | 설명 |
|------|------|----------|------|
| 1 | XLS 파일 업로드 | ✅ | 병원 OCS에서 내보낸 .xls Lab 결과지 직접 업로드 파싱 |
| 2 | 수동 입력 | ✅ | 직접 타이핑, 모든 필드 대응 |
| 3 | 복사-붙여넣기 스마트 파싱 | ✅ | OCS/EMR 텍스트 자동 파싱 |
| 4 | CSV/엑셀 업로드 | ✅ | 정형화된 일괄 데이터 업로드 |
| 5 | EMR API 연동 | ❌ (v2) | 추후 OCS/EMR 직접 연동 |

### 3.2 투약 데이터 입력
| 순서 | 방식 | MVP 포함 | 설명 |
|------|------|----------|------|
| 1 | OCS 처방 붙여넣기 파싱 | ✅ | `(잔여일수) 약물명[TAB]1회량[TAB]투약시간` 형식 자동 파싱 |
| 2 | 수동 입력 | ✅ | 개별 약물 직접 입력 |

---

## 4. 데이터 모델 (핵심 엔티티)

### 4.1 Patient (환자)
```
{
  id: string (UUID),
  
  // 기본 정보
  name: string,
  birthDate: Date,
  sex: 'M' | 'F',
  registrationNumber?: string,      // 등록번호 (선택)
  roomBed: string,                   // 병실-침대 (예: "301-1")
  admissionDate: Date,
  dischargeDate?: Date,
  attendingPhysician: string,        // 담당 전문의
  tags: string[],                    // 사용자 태그 (예: "연하곤란", "욕창", "MRSA")
  status: 'active' | 'discharged',

  // 차팅 (Charting) — C/C ~ Etc
  chiefComplaint: string,            // Chief Complaint
  onset: string,                     // Onset
  presentIllness: string,            // Present Illness (길어질 수 있음)
  pastHistory: string,               // Past History
  reviewOfSystem: string,            // Review of System
  physicalExam: string,              // Physical Exam
  problemList: string[] | string,    // Problem List (리스트 or 자유 텍스트)
  plan: string,                      // Plan
  etc: string,                       // Etc (기타)

  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 LabResult (검사 결과)
```
{
  id: string (UUID),
  patientId: string (FK),
  testDate: Date,
  category: string,                  // 예: 'Chemistry', 'CBC', 'UA'
  items: [{
    name: string,                    // 예: 'Na', 'K', 'Cr', 'WBC'
    value: number,
    unit: string,
    referenceMin?: number,
    referenceMax?: number,
    isAbnormal: boolean
  }],
  source: 'manual' | 'parsed' | 'csv',
  rawText?: string,                  // 파싱 원본 텍스트 보관
  createdAt: Date
}
```

### 4.3 Medication (투약)
```
{
  id: string (UUID),
  patientId: string (FK),

  // OCS 파싱 원본 데이터
  drugName: string,                  // 약물명 전체 (예: "페로스핀정10mg(메틸페니데이트염산염)")
  drugBaseName: string,              // 검색용 기본명 (예: "페로스핀정")
  singleDose: number,               // 1회 투약량 (예: 1, 0.5, 2)
  schedule: string,                  // 투약시간 (예: "아침,점심,저녁 식후30분")
  daysRemaining?: number,            // OCS 잔여일수 (파싱 시점 기준, 참고용)

  // 관리 데이터
  startDate: Date,
  endDate?: Date,
  isAntibiotic: boolean,             // 항생제 여부 (수동 태그)
  isActive: boolean,
  notes?: string,

  // 네이버 의약품사전 링크
  naverSearchUrl: string,            // 자동 생성: https://terms.naver.com/search.naver?query={drugBaseName}...

  createdAt: Date,
  updatedAt: Date
}
```

### 4.4 Note (메모)
```
{
  id: string (UUID),
  patientId: string (FK),
  content: string,
  tags: string[],                    // #TODO, #중요, #consult 등
  type: 'rounding' | 'progress' | 'todo',
  createdAt: Date,
  updatedAt: Date
}
```

### 4.5 Schedule (일정)
```
{
  id: string (UUID),
  patientId: string (FK),
  title: string,                     // 예: "정형외과 외진", "작업치료"
  scheduledDate: Date,
  scheduledTime?: string,
  category: 'consultation' | 'rehabilitation' | 'test' | 'other',
  isCompleted: boolean,
  notes?: string,
  createdAt: Date
}
```

### 4.6 Alert (알림)
```
{
  id: string (UUID),
  patientId: string (FK),
  type: 'lab_abnormal' | 'antibiotic_duration' | 'schedule' | 'custom',
  severity: 'info' | 'warning' | 'critical',
  title: string,
  message: string,
  isRead: boolean,
  triggeredAt: Date,
  readAt?: Date
}
```

---

## 5. 스마트 파싱 상세 설계

### 5.1 Lab 결과 파싱 — XLS 파일 직접 업로드

병원 OCS에서 내보내는 Lab 결과지는 `.xls` (BIFF) 형식이다. 파일 구조 분석 결과:

**파일 메타데이터**:
- 형식: Compound Document File V2 (구형 XLS/BIFF)
- 생성 앱: NPO (병원 OCS 시스템)
- 인코딩: CP949 (Korean)

**데이터 구조**:
하나의 XLS 파일에 여러 환자의 Lab 결과가 포함된다. 각 환자별로 여러 오더(검사 묶음)가 존재한다.

```
[파일 전체 구조]
├── 헤더 (컬럼명)
├── 환자1
│   ├── 오더1 (Chemistry): 오더번호, 검사코드별 결과들
│   ├── 오더2 (Electrolyte): Na, K, Cl
│   ├── 오더3 (CBC): WBC, RBC, Hb, Hct, PLT
│   ├── 오더4 (UA): 소변검사 항목들
│   └── 오더5 (CRP): CRP
├── 환자2
│   ├── 오더1 ...
│   └── ...
└── ...
```

**각 검사 항목의 데이터 형식**:
```
검사코드 | 검사명 | 결과값 | H/L 플래그 | 참조범위 | Remark
```

**실제 데이터 예시** (병원 XLS에서 추출):
```
B2500  | Total Protein     | 7.45   |     | 6.60 ~ 8.30
B2510  | Albumin           | 3.20   | L   | 3.50 ~ 5.20
B2570  | AST (SGOT)        | 20     |     | ≤40
B2580  | ALT (SGPT)        | 10     |     | ≤41
B2602  | ALP               | 75     |     | 30 ~ 120
B2710  | γ-GTP             | 17     |     | ≤38
B2561  | Total cholesterol | 169    |     | (서술형: Desirable <200 ...)
B2910  | HDL-cholesterol   | 45.9   |     | (서술형: Low <40.0 ...)
A0118  | LDL-cholesterol   | 110    |     | (서술형: Optimal <100 ...)
B2903  | TG(Triglyceride)  | 70     |     | (서술형: Normal <150 ...)
B2730  | BUN               | 14.5   |     | 8.0 ~ 23.0
B2740  | Creatinine        | 0.50   |     | 0.50 ~ 1.20
B2521  | Glucose           | 178    | H   | 70 ~ 99
B2790  | Na                | 133    |     | 136 ~ 145
B2800  | K                 | 4.5    |     | 3.5 ~ 5.5
B2810  | Cl                | 99     |     | 101 ~ 109
B4621  | CRP               | 0.85   |     | ≤0.50
B1050  | WBC               | 15.16  |     | 4.00 ~ 10.00
B1040  | RBC               | 3.68   |     | 4.00 ~ 6.00
B10201 | Hct               | 35.0   |     | 36.0 ~ 47.0
B1010  | Hb                | 11.4   |     | 12.0 ~ 16.0
B1060  | PLT               | 433    |     | 150 ~ 450
```

**소변검사(UA) 항목**:
```
B00301  | Color             | 3+      |     | Negative
B00303  | Bilirubin         | -       |     |
B00305  | Ketone body       | -       |     |
B003010 | S.G               | 1.017   |     | 1.005 ~ 1.030
B00302  | Occult Blood      | +-      |     |
B00309  | pH                | 7.0     |     | 5.0 ~ 8.0
B00306  | Protein           | -       |     |
B00411  | RBC(Urine Micro)  | 0-1     |     | ≤3
B00412  | WBC(Urine Micro)  | 20-25   |     |
B00413  | Epithelial cell   | -       |     |
B00414  | Bacteria          | few     |     |
```

**CBC Differential**:
```
B10911 | N.Segment   | (%)  | 48 ~ 75
B10912 | Lymphocyte  | (%)  | 15 ~ 40
B10913 | Monocyte    | (%)  | 2 ~ 11
B10914 | Eosinophil  | (%)  | ≤5
B10915 | Basophil    | (%)  | ≤2
```

**특수 검사**:
```
HbA1c (b3120):
  HbA1c-NGSP   : 6.8     (정상 <5.6, 전당뇨 5.7~6.4, 당뇨 ≥6.5 %)
  HbA1c-IFCC   : 51      (정상 <38, 전당뇨 39~47, 당뇨 ≥48 mmol/mol)
  HbA1c-eAG    : 148

CRE-Blood (b4114B): 배양 결과 — "No growth of CRE" 등 텍스트형
```

### 5.2 파싱 전략

**방법 1: XLS 파일 업로드 (권장)**
1. 사용자가 OCS에서 XLS 파일을 다운로드
2. WardFlow에 파일 드래그 앤 드롭 또는 파일 선택
3. BIFF 포맷 파싱 (cp949 인코딩 처리 필수)
4. 검사코드(B/A + 숫자)를 기준으로 항목별 분리
5. 환자별 → 오더별 → 항목별 구조화
6. 결과 미리보기 → 사용자 확인 후 저장

**방법 2: 텍스트 복사-붙여넣기**
1. OCS 화면에서 Lab 결과 영역 드래그하여 복사
2. WardFlow 파싱 입력란에 붙여넣기
3. 줄 단위 + 정규식으로 항목별 파싱
4. 매칭 실패 항목은 수동 매핑 UI 제공
5. 파싱 성공률 표시

**방법 3: CSV/엑셀 업로드**
1. 정형화된 CSV/XLSX 파일 업로드
2. 컬럼 자동 매핑 또는 수동 매핑

### 5.3 검사코드 → 카테고리 매핑 테이블

```typescript
// services/parser/labCodeMap.ts
const LAB_CODE_MAP = {
  // Chemistry
  'B2500':  { name: 'Total Protein', category: 'Chemistry', unit: 'g/dL' },
  'B2510':  { name: 'Albumin', category: 'Chemistry', unit: 'g/dL' },
  'B2570':  { name: 'AST (SGOT)', category: 'Chemistry', unit: 'U/L' },
  'B2580':  { name: 'ALT (SGPT)', category: 'Chemistry', unit: 'U/L' },
  'B2602':  { name: 'ALP', category: 'Chemistry', unit: 'U/L' },
  'B2710':  { name: 'γ-GTP', category: 'Chemistry', unit: 'U/L' },
  'B2561':  { name: 'Total Cholesterol', category: 'Lipid', unit: 'mg/dL' },
  'B2910':  { name: 'HDL-cholesterol', category: 'Lipid', unit: 'mg/dL' },
  'A0118':  { name: 'LDL-cholesterol', category: 'Lipid', unit: 'mg/dL' },
  'B2903':  { name: 'TG', category: 'Lipid', unit: 'mg/dL' },
  'B2730':  { name: 'BUN', category: 'Chemistry', unit: 'mg/dL' },
  'B2740':  { name: 'Creatinine', category: 'Chemistry', unit: 'mg/dL' },
  'B2521':  { name: 'Glucose', category: 'Chemistry', unit: 'mg/dL' },

  // Electrolyte
  'B2790':  { name: 'Na', category: 'Electrolyte', unit: 'mmol/L' },
  'B2800':  { name: 'K', category: 'Electrolyte', unit: 'mmol/L' },
  'B2810':  { name: 'Cl', category: 'Electrolyte', unit: 'mmol/L' },

  // Inflammatory
  'B4621':  { name: 'CRP', category: 'Inflammatory', unit: 'mg/dL' },

  // CBC
  'B1050':  { name: 'WBC', category: 'CBC', unit: '×10³/μL' },
  'B1040':  { name: 'RBC', category: 'CBC', unit: '×10⁶/μL' },
  'B10201': { name: 'Hct', category: 'CBC', unit: '%' },
  'B1010':  { name: 'Hb', category: 'CBC', unit: 'g/dL' },
  'B1060':  { name: 'PLT', category: 'CBC', unit: '×10³/μL' },

  // Differential
  'B10911': { name: 'Neutrophil (Seg)', category: 'Differential', unit: '%' },
  'B10912': { name: 'Lymphocyte', category: 'Differential', unit: '%' },
  'B10913': { name: 'Monocyte', category: 'Differential', unit: '%' },
  'B10914': { name: 'Eosinophil', category: 'Differential', unit: '%' },
  'B10915': { name: 'Basophil', category: 'Differential', unit: '%' },

  // UA
  'B00301':  { name: 'Color', category: 'UA', unit: '' },
  'B00303':  { name: 'Bilirubin', category: 'UA', unit: '' },
  'B00305':  { name: 'Ketone', category: 'UA', unit: '' },
  'B003010': { name: 'S.G', category: 'UA', unit: '' },
  'B00302':  { name: 'Occult Blood', category: 'UA', unit: '' },
  'B00309':  { name: 'pH', category: 'UA', unit: '' },
  'B00306':  { name: 'Protein', category: 'UA', unit: '' },
  'B00304':  { name: 'Urobilinogen', category: 'UA', unit: '' },
  'B00307':  { name: 'Nitrite', category: 'UA', unit: '' },
  'B00411':  { name: 'RBC (Micro)', category: 'UA Micro', unit: '/HPF' },
  'B00412':  { name: 'WBC (Micro)', category: 'UA Micro', unit: '/HPF' },
  'B00413':  { name: 'Epithelial cell', category: 'UA Micro', unit: '' },
  'B00414':  { name: 'Bacteria', category: 'UA Micro', unit: '' },

  // Special
  'b3120':  { name: 'HbA1c', category: 'Special', unit: '%' },
  'b4114B': { name: 'CRE-Blood Culture', category: 'Culture', unit: '' },
};
```

### 5.4 참조범위 형식 처리

병원 데이터에서 참조범위는 세 가지 형태로 제공된다:

| 형태 | 예시 | 파싱 방식 |
|------|------|-----------|
| 범위형 | `6.60 ~ 8.30` | min~max 추출 |
| 상한형 | `≤40` (d"40) | max만 추출 |
| 서술형 | `Desirable <200, Borderline high 200~239, High ≥240` | 등급별 파싱 후 가장 관련 있는 범위 추출 |

> **참고**: XLS 파일에서 `≤` 기호는 `d"` 로 인코딩되어 있음. `≥`는 `e"`로 인코딩.

### 5.5 지원할 Lab 카테고리 및 항목 (병원 데이터 기반)
- **Chemistry**: Total Protein, Albumin, AST(SGOT), ALT(SGPT), ALP, γ-GTP, BUN, Creatinine, Glucose
- **Lipid Panel**: Total Cholesterol, HDL, LDL, TG
- **Electrolyte**: Na, K, Cl
- **Inflammatory**: CRP
- **CBC**: WBC, RBC, Hb, Hct, PLT
- **Differential**: Neutrophil(Seg), Lymphocyte, Monocyte, Eosinophil, Basophil
- **UA**: Color, Bilirubin, Ketone, S.G, Occult Blood, pH, Protein, Urobilinogen, Nitrite
- **UA Micro**: RBC, WBC, Epithelial cell, Bacteria
- **Special**: HbA1c (NGSP/IFCC/eAG)
- **Culture**: CRE-Blood 등 배양 결과 (텍스트형)

---

## 6. UI/UX 가이드라인

### 6.1 디자인 원칙
- **Desktop-First**: 주 작업 환경은 병원 컴퓨터. 처방/차팅과 병행하며 사용
- **Mobile-Friendly**: 회진 시 모바일에서 열람 + 간단 메모 가능 (반응형)
- **Speed**: 모든 인터랙션은 빠르게. 정보 조회 3초 이내
- **Clarity**: 의료 데이터는 명확하게. 비정상 수치는 즉시 눈에 띄어야 함
- **Offline**: 네트워크 없어도 100% 동작. 연결 상태 표시
- **Copy-to-OCS**: 정리한 차팅 내용을 OCS에 바로 붙여넣을 수 있는 워크플로우

### 6.2 색상 시스템
- Primary: 의료 신뢰감을 주는 Blue 계열
- 위험/비정상: Red (#E53E3E)
- 경고: Amber (#D69E2E)
- 정상: Green (#38A169)
- 항생제 관련: Purple 계열로 구분

### 6.3 핵심 화면 구성

**데스크톱 레이아웃** (주 사용 환경):
```
┌─────────────────────────────────────────────────┐
│  Header: WardFlow 로고 | 검색 | 알림 | 설정     │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │  Main Content Area                   │
│          │                                      │
│ 🏠 Home  │  [환자 목록 / 상세 / 차팅 폼 등]     │
│ 👥 환자  │                                      │
│ 📅 일정  │                                      │
│ ⚙️ 설정  │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```
- 좌측 사이드바 네비게이션 (접기/펼치기 가능)
- 환자 목록 클릭 시 우측에 상세/차팅 폼 표시 (마스터-디테일 패턴)
- 넓은 화면에서 환자 목록 + 상세를 동시에 볼 수 있는 분할 뷰

**모바일 레이아웃** (회진 시):
```
[Bottom Navigation]
├── 🏠 Home (Morning Briefing)
├── 👥 Patients (환자 목록 → 탭하면 상세)
├── 📅 Schedule (일정)
└── ⚙️ Settings
```
- 하단 네비게이션 바 (엄지 접근성)
- 열람 중심 + 간단 메모 입력 가능
- 차팅 폼은 모바일에서도 접근 가능하나, 데스크톱 사용 권장 안내

### 6.4 반응형 전략
- **Desktop (≥1024px)**: 사이드바 + 마스터-디테일 분할 뷰
- **Tablet (768~1023px)**: 사이드바 접힘, 단일 컬럼 + 뒤로가기 네비게이션
- **Mobile (<768px)**: 하단 네비게이션, 열람 최적화, 간단 입력 지원
- 큰 터치 타겟 (최소 44x44px, 모바일)
- 다크 모드 지원 (야간 당직 시)

---

## 7. 기술 요구사항

### 7.1 Tech Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6+
- **State Management**: Zustand (경량, 간단)
- **Local DB**: Dexie.js (IndexedDB wrapper)
- **Charts**: Recharts 또는 Chart.js
- **UI Components**: Tailwind CSS + shadcn/ui
- **PWA**: Vite PWA Plugin (vite-plugin-pwa)
- **Testing**: Vitest + React Testing Library

### 7.2 PWA 요구사항
- Service Worker로 앱 셸 캐싱
- IndexedDB에 모든 데이터 로컬 저장
- 오프라인 시 모든 CRUD 동작
- 온라인 복귀 시 Background Sync (v2)
- 설치 가능한 PWA (A2HS)
- 앱 아이콘 및 스플래시 스크린

### 7.3 성능 요구사항 ⭐ 최우선

> **핵심 원칙**: 로그인 후 환자 목록 / Today's Note가 **1초 이내**에 화면에 표시되어야 한다. 이전 프로토타입에서 로그인 후 로딩이 길어 사용 경험이 나빴던 문제를 반드시 해결해야 함.

**목표 성능 지표**:
| 지표 | 목표 | 설명 |
|------|------|------|
| 로그인 → 첫 화면 렌더 | < 500ms | PIN 입력 후 환자 목록 또는 Today's Note 표시 |
| 환자 목록 전체 로딩 | < 300ms | 50명 기준 |
| 환자 상세 전환 | < 200ms | 목록에서 클릭 → 상세 뷰 |
| Lab 추이 차트 렌더 | < 500ms | 30일치 데이터 기준 |
| 투약 파싱 (붙여넣기) | < 100ms | 20개 항목 기준 |

**Dexie.js 인덱싱 전략**:
```typescript
// db/database.ts
const db = new Dexie('WardFlowDB');

db.version(1).stores({
  patients: 'id, status, roomBed, name, admissionDate, [status+roomBed]',
  //         PK  ↑활성환자 빠른 필터  ↑병실순 정렬  ↑이름검색  ↑입원일순  ↑복합인덱스

  labResults: 'id, patientId, testDate, [patientId+testDate], [patientId+category]',
  //           PK  ↑환자별 조회        ↑환자+날짜순(추이차트)   ↑환자+카테고리 필터

  medications: 'id, patientId, isActive, isAntibiotic, [patientId+isActive], [isAntibiotic+isActive]',
  //            PK  ↑환자별    ↑활성약물  ↑항생제       ↑환자의 현재 투약     ↑항생제 D-day 조회

  notes: 'id, patientId, createdAt, [patientId+createdAt], *tags',
  //      PK  ↑환자별     ↑시간순     ↑환자별 최신순         ↑태그 멀티 인덱스

  schedules: 'id, patientId, scheduledDate, [patientId+scheduledDate], [scheduledDate+isCompleted]',
  //          PK  ↑환자별      ↑날짜별         ↑환자일정 조회            ↑오늘 일정 빠른 조회

  alerts: 'id, patientId, isRead, severity, triggeredAt, [isRead+severity]',
  //       PK  ↑환자별     ↑안읽은 알림  ↑심각도     ↑시간순   ↑안읽은+심각도순

  templates: 'id, field, name',
  //          PK  ↑필드별 템플릿  ↑이름 검색
});
```

**복합 인덱스 활용 포인트**:
- `[status+roomBed]`: 활성 환자만 병실순으로 바로 조회 — 메인 화면 환자 목록
- `[patientId+testDate]`: 특정 환자의 Lab 결과를 날짜순으로 — 추이 차트
- `[patientId+isActive]`: 특정 환자의 현재 복용 약물만 — 투약 탭
- `[isAntibiotic+isActive]`: 전체 활성 항생제 목록 — Morning Briefing D-day
- `[scheduledDate+isCompleted]`: 오늘 미완료 일정 — Morning Briefing
- `[isRead+severity]`: 안 읽은 알림 심각도순 — 알림 뱃지

**첫 화면 로딩 최적화 전략**:

1. **앱 셸 즉시 렌더**: 네비게이션, 헤더 등 정적 UI는 즉시 표시. 데이터 영역만 로딩
2. **PIN 입력 중 프리페치**: PIN 화면이 표시되는 동안 백그라운드에서 주요 데이터 미리 로드
   ```typescript
   // PIN 화면 마운트 시 프리페치 시작
   const prefetchPromise = Promise.all([
     db.patients.where('status').equals('active').sortBy('roomBed'),
     db.alerts.where('[isRead+severity]').between([0, 'critical'], [0, 'info']).toArray(),
     db.schedules.where('scheduledDate').equals(today).toArray(),
   ]);
   // PIN 인증 성공 시 이미 로드된 데이터로 즉시 렌더
   ```
3. **Zustand 초기 스토어 하이드레이션**: 앱 시작 시 핵심 데이터를 Zustand 스토어에 한번만 로드, 이후는 메모리에서 읽기
4. **점진적 로딩 (Progressive Loading)**:
   - 1단계 (즉시): 환자 목록 (이름, 병실, C/C만)
   - 2단계 (백그라운드): Lab 최신 결과, 투약 목록, 알림
   - 3단계 (온디맨드): 차트 데이터, 히스토리 등은 사용자가 해당 탭 클릭 시
5. **가상 스크롤링**: 환자가 50명 이상일 경우 목록 가상화 (react-virtual 등)
6. **코드 스플리팅**: 각 페이지/탭을 lazy import로 분리
   ```typescript
   const PatientDetail = lazy(() => import('./pages/PatientDetailPage'));
   const SchedulePage = lazy(() => import('./pages/SchedulePage'));
   const SettingsPage = lazy(() => import('./pages/SettingsPage'));
   ```

**Morning Briefing 데이터 준비**:
- Today's Note에 필요한 데이터는 여러 테이블 조인이 필요 (알림 + 일정 + 항생제 D-day + 새 Lab)
- **앱 시작 시 한번 집계하여 캐시**, 이후 변경 시에만 갱신
- `briefingService.ts`에서 집계 → Zustand briefingStore에 저장

**IndexedDB 쿼리 최적화 규칙**:
- 항상 인덱스가 있는 필드로 쿼리 (`.where()` 사용)
- `.filter()`는 인덱스 이후 추가 필터링에만 사용 (전체 스캔 방지)
- 대량 쓰기는 반드시 `db.transaction()` 사용
- 읽기 전용 조회는 `db.transaction('r', ...)` 명시하여 락 최소화

### 7.4 보안 고려사항 (MVP)
- 앱 진입 시 PIN 또는 패턴 잠금
- 데이터는 로컬에만 저장 (서버 전송 없음)
- 환자 식별정보 최소화 (이름 이니셜 표시 옵션)
- 자동 잠금 타이머 (설정 가능, 기본 5분)

---

## 8. 개발 페이즈

> 상세 태스크 목록, 담당 에이전트 배정, 진행 상태는 **`TODO.md`** 를 참고할 것.
> `TODO.md`가 Single Source of Truth이며, 아래는 페이즈별 개요만 기술한다.

### Phase 1: Foundation (MVP Core) — 현재
- [ ] 프로젝트 셋업 (Vite + React + TS + Tailwind + Dexie)
- [ ] PWA 기본 구성 (Service Worker, manifest)
- [ ] Desktop-First 레이아웃 (사이드바 + 마스터-디테일)
- [ ] ⚡ Dexie.js 복합 인덱스 스키마 설계 및 적용
- [ ] ⚡ PIN 프리페치 + 앱 셸 즉시 렌더 + 코드 스플리팅
- [ ] 환자 CRUD (목록 + 상세)
- [ ] 환자 차팅 폼 (C/C ~ Etc 구조화된 입력)
- [ ] 📋 통합 복사 기능 (차팅 → 클립보드 → OCS 붙여넣기)
- [ ] 텍스트 영역 리사이즈 + 자동 확장
- [ ] Lab 결과 수동 입력 + 조회 + 추이 차트
- [ ] 투약 관리 (항생제 D-day)
- [ ] 투약 처방 붙여넣기 파싱 (OCS 복붙 → 자동 파싱)
- [ ] 약물명 → 네이버 의약품사전 링크
- [ ] 회진 메모
- [ ] Morning Briefing 대시보드
- [ ] PIN 잠금
- [ ] 반응형 (모바일 열람 + 간단 메모)

### Phase 2: Smart Input
- [ ] Lab 스마트 파싱 (복사-붙여넣기)
- [ ] CSV/엑셀 업로드
- [ ] 차팅 템플릿 시스템 (`/` 명령으로 빠른 삽입)
- [ ] 복사 포맷 커스텀 설정
- [ ] 일정 관리 (Schedule)
- [ ] 알림 시스템 고도화

### Phase 3: WardAide (AI)
- [ ] AI 사이드바 UI
- [ ] 로컬 DB 쿼리 AI (자연어 → Dexie 쿼리)
- [ ] Lab 추이 분석 AI
- [ ] Renal dose 가이드

### Phase 4: WardLink Integration
- [ ] 공통 로그인 시스템
- [ ] 모듈 간 데이터 공유
- [ ] WardCare 연동
- [ ] EMR API 연동 탐색

---

## 9. 제약사항 및 가정

### 제약사항
- 서버 없이 로컬 전용 (MVP 단계)
- EMR 직접 연동 불가 (병원 보안 정책)
- 의료기기 인증 대상 아님 (보조 도구 목적)

### 가정
- 주 사용 디바이스는 **병원 데스크톱 컴퓨터** (OCS/EMR과 병행 사용)
- 회진 시에는 스마트폰(Android/iOS)으로 열람 및 간단 메모
- 병원 내 Wi-Fi 또는 모바일 데이터 사용 가능하나 불안정할 수 있음
- OCS/EMR 텍스트 복사 가능 (대부분의 병원 OCS에서 지원)
- 1인 개발 후 점진적 확장

---

## 10. 용어 사전

| 용어 | 설명 |
|------|------|
| OCS | Order Communication System — 병원 처방전달시스템 |
| EMR | Electronic Medical Record — 전자의무기록 |
| D-day | 항생제 사용 시작일로부터 경과 일수 |
| 외진 | 다른 과 의사에게 협진(consult)을 의뢰하는 것 |
| Lab | 혈액검사 등 임상병리 검사 결과 |
| 회진 (Rounding) | 의사가 병동을 돌며 환자를 진찰하는 것 |
| A2HS | Add to Home Screen — PWA 홈 화면 추가 |
| Smart Parsing | 복사된 텍스트를 구조화된 데이터로 자동 변환 |
