import type React from 'react';
import { isDateInRange, parseDateInput } from '../clinical/dateLabels';
import type { ChartingDraft } from './types';

/** 임상 입력용 날짜인지 검사 (1900-01-01 ~ 오늘) */
export function isClinicalDateInput(value: string) {
  const date = parseDateInput(value);
  if (!date) return false;
  return isDateInRange(date, new Date(1900, 0, 1), new Date());
}

/** "1400" / "14:00" 형태를 "14:00"으로 정규화한다. 유효하지 않으면 undefined. */
export function normalizeClockTime(value?: string) {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** 한글 IME 조합 중인 Enter 입력을 무시하기 위한 판별 */
export function isComposingKeyboardEvent(event: React.KeyboardEvent) {
  return event.nativeEvent.isComposing || event.key === 'Process';
}

export function normalizeChartingText(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
}

export function normalizeChartingDraft(draft: ChartingDraft): ChartingDraft {
  return {
    chiefComplaint: normalizeChartingText(draft.chiefComplaint),
    onset: normalizeChartingText(draft.onset),
    presentIllness: normalizeChartingText(draft.presentIllness),
    pastHistory: normalizeChartingText(draft.pastHistory),
    reviewOfSystem: normalizeChartingText(draft.reviewOfSystem),
    physicalExam: normalizeChartingText(draft.physicalExam),
    problemListText: normalizeChartingText(draft.problemListText),
    plan: normalizeChartingText(draft.plan),
    guardianExplanation: normalizeChartingText(draft.guardianExplanation),
    etc: normalizeChartingText(draft.etc),
  };
}

export function areDraftsEqual(left: ChartingDraft, right: ChartingDraft) {
  return (
    JSON.stringify(normalizeChartingDraft(left)) === JSON.stringify(normalizeChartingDraft(right))
  );
}
