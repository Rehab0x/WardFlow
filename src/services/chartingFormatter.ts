import type { ChartingFormData, ChartingCopyFormat } from '@/types/charting';
import { DEFAULT_COPY_FORMAT } from '@/types/charting';

/**
 * 차팅 데이터를 OCS 복사용 텍스트로 포맷팅
 */
export function formatChartingForCopy(
  data: ChartingFormData,
  format: ChartingCopyFormat = DEFAULT_COPY_FORMAT
): string {
  const sections: string[] = [];

  const {
    sectionSeparator,
    fieldSeparator: _fieldSeparator,
    includeFieldNames,
    excludeEmptySections,
    problemListStyle,
    sectionNames,
  } = format;

  // Helper: Add section with custom formatting
  const addSection = (
    key: keyof typeof sectionNames,
    value: string | string[],
    sameLine: boolean = false // C/C, Onset은 같은 줄에
  ) => {
    // Check if empty
    if (excludeEmptySections) {
      if (Array.isArray(value) && value.length === 0) return;
      if (typeof value === 'string' && value.trim() === '') return;
    }

    const fieldName = sectionNames[key];
    let content = '';

    if (Array.isArray(value)) {
      // Handle array (Problem List)
      const formattedList = formatProblemList(value, problemListStyle);
      content = includeFieldNames
        ? `${fieldName})\n${formattedList}` // Problem List는 항상 줄바꿈
        : formattedList;
    } else {
      // Handle string
      if (includeFieldNames) {
        if (sameLine) {
          // C/C), Onset) 형식 - 같은 줄
          content = `${fieldName}) ${value}`;
        } else {
          // 나머지 - 줄바꿈
          content = `${fieldName})\n${value}`;
        }
      } else {
        content = value;
      }
    }

    sections.push(content);
  };

  // Add all sections in order
  // C/C와 Onset만 같은 줄에 표시
  addSection('chiefComplaint', data.chiefComplaint, true);
  addSection('onset', data.onset, true);

  // 나머지는 제목 후 줄바꿈
  addSection('presentIllness', data.presentIllness);
  addSection('pastHistory', data.pastHistory);
  addSection('reviewOfSystem', data.reviewOfSystem);
  addSection('physicalExam', data.physicalExam);

  // Problem List - use text mode if available, otherwise list mode
  if (data.problemListText && data.problemListText.trim() !== '') {
    addSection('problemList', data.problemListText);
  } else {
    addSection('problemList', data.problemList);
  }

  addSection('plan', data.plan);
  addSection('guardianExplanation', data.guardianExplanation);
  addSection('etc', data.etc);

  return sections.join(sectionSeparator);
}

/**
 * Problem List 포맷팅
 */
function formatProblemList(
  list: string[],
  style: 'numbered' | 'numbered_simple' | 'bulleted' | 'plain'
): string {
  if (list.length === 0) return '';

  switch (style) {
    case 'numbered':
      // #1. #2. #3. 형식
      return list.map((item, index) => `#${index + 1}. ${item}`).join('\n');
    case 'numbered_simple':
      // #. #. #. 형식
      return list.map((item) => `#. ${item}`).join('\n');
    case 'bulleted':
      // • 형식
      return list.map((item) => `• ${item}`).join('\n');
    case 'plain':
      return list.join('\n');
    default:
      return list.join('\n');
  }
}

/**
 * 클립보드에 복사
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * 복사용 텍스트 미리보기
 */
export function getChartingPreview(
  data: ChartingFormData,
  format: ChartingCopyFormat = DEFAULT_COPY_FORMAT,
  maxLength: number = 200
): string {
  const fullText = formatChartingForCopy(data, format);
  if (fullText.length <= maxLength) return fullText;
  return fullText.substring(0, maxLength) + '...';
}

/**
 * 개별 필드 복사용 텍스트 포맷팅
 */
export function formatSingleField(
  fieldName: string,
  value: string | string[],
  sameLine: boolean = false,
  problemListStyle: 'numbered' | 'numbered_simple' | 'bulleted' | 'plain' = 'numbered_simple'
): string {
  if (Array.isArray(value)) {
    // Problem List
    const formattedList = formatProblemList(value, problemListStyle);
    return `${fieldName})\n${formattedList}`;
  } else {
    // 일반 텍스트 필드
    if (sameLine) {
      return `${fieldName}) ${value}`;
    } else {
      return `${fieldName})\n${value}`;
    }
  }
}
