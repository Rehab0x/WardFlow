/**
 * 회진 목록에 띄울 뱃지 — "지금 이 환자에게 무슨 일이 있나"를 숫자까지 담아 한 줄로.
 *
 * 두 종류의 신호를 섞는다.
 *  - **오늘 생긴 일**: 오늘 Lab, 오늘 알림/일정 (브리핑 집계 그대로)
 *  - **아직 안 풀린 문제**: Lab 임계값 위반. 마지막 검사에서도 걸려 있으면 계속 뜨고,
 *    다음 검사에서 값이 돌아오면 사라진다 (`findOpenLabBreaches`)
 *
 * 순수 함수다 — 추가 쿼리 없이 이미 불러온 브리핑·평가 결과만 조합한다.
 */

import type { BriefingData } from '@/services/briefingService';
import type { OpenLabBreach } from '@/services/alertEngine';
import type { Patient } from '@/types/patient';

/** 'done'은 문제가 아니라 "이미 해 둔 것" — 나머지와 다른 색으로 구분한다. */
export type BadgeTone = 'critical' | 'warning' | 'info' | 'neutral' | 'done';

export interface RoundingBadge {
  key: string;
  tone: BadgeTone;
  /** 뱃지에 크게 찍히는 짧은 글자 ("Na 118↓", "세프트리악손 D+7") */
  label: string;
  /** 길게 눌렀을 때/마우스 올렸을 때 보이는 설명 */
  title?: string;
}

const DIRECTION_MARK: Record<OpenLabBreach['direction'], string> = {
  high: '↑',
  low: '↓',
  abnormal: '!',
};

/** 약제명에서 용량·제형 괄호를 떼어 뱃지에 들어갈 만한 길이로 줄인다. */
export function shortenDrugName(drugName: string): string {
  const base = drugName.split(/[(\s]/)[0]?.trim() || drugName.trim();
  return base.length > 9 ? `${base.slice(0, 9)}…` : base;
}

function formatValue(value: number | string): string {
  if (typeof value !== 'number') return String(value).trim();
  // 소수점 뒤 불필요한 0을 떼서 좁은 뱃지에 들어가게 한다 (1.700 → 1.7)
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatDateKey(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 환자별 뱃지 목록. 급한 것이 앞에 오도록 정렬해서 돌려준다
 * (주의 → 임계값 위반 → 오늘 Lab → 알림 → 일정 → 항생제 → 오늘 메모).
 */
export function buildRoundingBadges(input: {
  patients: Patient[];
  briefing: BriefingData;
  breaches?: OpenLabBreach[];
}): Record<string, RoundingBadge[]> {
  const { patients, briefing } = input;
  const breaches = input.breaches ?? [];
  const badges: Record<string, RoundingBadge[]> = {};
  const push = (patientId: string, badge: RoundingBadge) => {
    (badges[patientId] ??= []).push(badge);
  };

  for (const patient of patients) {
    if (patient.attention) {
      push(patient.id, { key: 'attention', tone: 'critical', label: '주의' });
    }
  }

  for (const breach of breaches) {
    const unit = breach.unit ? ` ${breach.unit}` : '';
    const lasting =
      breach.streak > 1 ? ` · ${formatDateKey(breach.since)}부터 ${breach.streak}회 연속` : '';
    push(breach.patientId, {
      key: `breach:${breach.ruleId}:${breach.itemName}`,
      tone: breach.severity === 'critical' ? 'critical' : 'warning',
      label: `${breach.itemName} ${formatValue(breach.value)}${DIRECTION_MARK[breach.direction]}`,
      title: `${breach.ruleName} · 마지막 검사 ${formatDateKey(breach.testDate)} ${formatValue(breach.value)}${unit}${lasting}`,
    });
  }

  for (const lab of briefing.recentLabs) {
    if (lab.abnormalCount === 0) continue;
    push(lab.patientId, {
      key: `lab:${lab.dateKey}`,
      tone: 'info',
      label: `Lab ${lab.abnormalCount}`,
      title: `${lab.dateKey} 비정상 ${lab.abnormalCount}/${lab.totalItems} · ${lab.abnormalItems.join(', ')}`,
    });
  }

  const reminderCounts = countBy(briefing.reminders);
  for (const [patientId, items] of reminderCounts) {
    push(patientId, {
      key: 'reminder',
      tone: 'warning',
      label: items.length > 1 ? `알림 ${items.length}` : '알림',
      title: items.map((item) => item.content).join(' · '),
    });
  }

  const scheduleCounts = countBy(briefing.todaySchedules.filter((item) => !item.isCompleted));
  for (const [patientId, items] of scheduleCounts) {
    const first = items[0]!;
    push(patientId, {
      key: 'schedule',
      tone: 'info',
      label: items.length > 1 ? `일정 ${items.length}` : `일정 ${first.scheduledTime ?? ''}`.trim(),
      title: items
        .map((item) => [item.scheduledTime, item.title].filter(Boolean).join(' '))
        .join(' · '),
    });
  }

  for (const antibiotic of briefing.antibiotics) {
    push(antibiotic.patientId, {
      key: `abx:${antibiotic.medicationId}`,
      tone: antibiotic.isLongTerm ? 'warning' : 'neutral',
      label: `${shortenDrugName(antibiotic.drugName)} D+${antibiotic.dDay}`,
      title: `${antibiotic.drugName}${antibiotic.dosage ? ` ${antibiotic.dosage}` : ''} · ${antibiotic.dDay}일째${antibiotic.isLongTerm ? ' (장기 사용)' : ''}`,
    });
  }

  // 오늘 메모는 문제 신호가 아니라 "이미 적었다"는 표시라, 임상 신호 뒤에 둔다.
  // 없는 것이 곧 "아직 안 적음"이므로 회진 중 빠진 환자를 찾는 데 쓴다.
  const noteCounts = countBy(briefing.progressNotes);
  for (const [patientId, items] of noteCounts) {
    push(patientId, {
      key: 'note',
      tone: 'done',
      label: items.length > 1 ? `메모 ${items.length}` : '메모',
      title: items.map((item) => firstLine(item.content)).join(' · '),
    });
  }

  return badges;
}

/** 메모 본문은 SOAP 여러 줄이라, 설명에는 첫 줄만 짧게 싣는다. */
function firstLine(content: string): string {
  const line = content.split('\n')[0]?.trim() ?? '';
  return line.length > 40 ? `${line.slice(0, 40)}…` : line;
}

function countBy<T extends { patientId: string }>(items: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const list = grouped.get(item.patientId) ?? [];
    list.push(item);
    grouped.set(item.patientId, list);
  }
  return grouped;
}
