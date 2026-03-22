/**
 * Charting form related types
 */

export interface ChartingFormData {
  chiefComplaint: string;
  onset: string;
  presentIllness: string;
  pastHistory: string;
  reviewOfSystem: string;
  physicalExam: string;
  problemList: string[];      // Array mode
  problemListText?: string;   // Text mode (alternative to array)
  plan: string;
  guardianExplanation: string; // 보호자 설명
  etc: string;
}

export type ChartingField = keyof ChartingFormData;

/**
 * Problem List 편집 모드
 */
export type ProblemListMode = 'list' | 'text';

export interface ChartingSectionConfig {
  field: ChartingField;
  label: string;
  multiline: boolean;
  placeholder?: string;
}

/**
 * 차팅 복사 포맷 설정
 */
export interface ChartingCopyFormat {
  // 구분자
  sectionSeparator: string;     // 섹션 간 구분자 (기본: "\n\n")
  fieldSeparator: string;       // 필드명과 내용 사이 구분자 (기본: ": ")

  // 옵션
  includeFieldNames: boolean;   // 필드명 포함 여부 (기본: true)
  excludeEmptySections: boolean; // 빈 섹션 제외 여부 (기본: true)
  problemListStyle: 'numbered' | 'numbered_simple' | 'bulleted' | 'plain'; // Problem List 스타일 (#1. vs #. vs • vs plain)

  // 섹션 이름 (커스텀 가능)
  sectionNames: {
    chiefComplaint: string;     // 기본: "C/C"
    onset: string;              // 기본: "Onset"
    presentIllness: string;     // 기본: "PI"
    pastHistory: string;        // 기본: "P/Hx"
    reviewOfSystem: string;     // 기본: "ROS"
    physicalExam: string;       // 기본: "P/Ex"
    problemList: string;        // 기본: "Problem List"
    plan: string;               // 기본: "Plan"
    guardianExplanation: string; // 기본: "보호자 설명"
    etc: string;                // 기본: "Etc"
  };
}

/**
 * 기본 복사 포맷 설정
 */
export const DEFAULT_COPY_FORMAT: ChartingCopyFormat = {
  sectionSeparator: '\n\n',
  fieldSeparator: ': ',
  includeFieldNames: true,
  excludeEmptySections: true,
  problemListStyle: 'numbered_simple', // #. 형식이 기본
  sectionNames: {
    chiefComplaint: 'C/C',
    onset: 'Onset',
    presentIllness: 'PI',
    pastHistory: 'P/Hx',
    reviewOfSystem: 'ROS',
    physicalExam: 'P/Ex',
    problemList: 'Problem List',
    plan: 'Plan',
    guardianExplanation: '보호자 설명',
    etc: 'Etc',
  },
};

/**
 * 차팅 템플릿
 */
export interface ChartingTemplate {
  id: string;
  name: string;                 // 템플릿 이름 (예: "폐렴", "UTI", "CHF")
  description?: string;         // 설명
  data: Partial<ChartingFormData>;  // 템플릿 데이터 (일부 필드만 채워질 수 있음)
  category?: string;            // 카테고리 (예: "호흡기", "순환기")
  createdAt: Date;
  updatedAt: Date;
}
