import { describe, expect, it } from 'vitest';
import type { BriefingData } from '@/services/briefingService';
import type { OpenLabBreach } from '@/services/alertEngine';
import type { Patient } from '@/types/patient';
import { buildRoundingBadges, shortenDrugName } from './roundingBadges';

const patients = [
  { id: 'p1', name: '김부경', roomBed: '101-1', status: 'active' } as Patient,
  { id: 'p2', name: '이영희', roomBed: '102', status: 'active', attention: true } as Patient,
];

function briefing(overrides: Partial<BriefingData> = {}): BriefingData {
  return {
    reminders: [],
    progressNotes: [],
    antibiotics: [],
    recentLabs: [],
    todaySchedules: [],
    patientSummary: { total: 0, admitted: 0, consult: 0 },
    ...overrides,
  };
}

const breach = (overrides: Partial<OpenLabBreach> = {}): OpenLabBreach => ({
  patientId: 'p1',
  ruleId: 'r1',
  ruleName: '저나트륨혈증 (Na < 130)',
  severity: 'critical',
  itemName: 'Na',
  value: 118,
  unit: 'mmol/L',
  hlFlag: 'L',
  direction: 'low',
  testDate: new Date(2026, 8, 19),
  since: new Date(2026, 8, 17),
  streak: 3,
  ...overrides,
});

function labelsFor(patientId: string, result: Record<string, { label: string }[]>) {
  return (result[patientId] ?? []).map((badge) => badge.label);
}

describe('buildRoundingBadges', () => {
  it('puts the value and direction on a threshold breach', () => {
    const badges = buildRoundingBadges({ patients, briefing: briefing(), breaches: [breach()] });

    expect(labelsFor('p1', badges)).toEqual(['Na 118↓']);
    expect(badges.p1![0]).toMatchObject({ tone: 'critical' });
    // 언제부터 몇 번 연속인지는 설명으로 붙인다
    expect(badges.p1![0]!.title).toContain('9/17부터 3회 연속');
    expect(badges.p1![0]!.title).toContain('저나트륨혈증');
  });

  it('marks an upward breach with ↑ and a warning rule as warning', () => {
    const badges = buildRoundingBadges({
      patients,
      briefing: briefing(),
      breaches: [breach({ itemName: 'K', value: 6.2, direction: 'high', severity: 'warning' })],
    });
    expect(labelsFor('p1', badges)).toEqual(['K 6.2↑']);
    expect(badges.p1![0]).toMatchObject({ tone: 'warning' });
  });

  it('trims trailing zeros off lab values', () => {
    const badges = buildRoundingBadges({
      patients,
      briefing: briefing(),
      breaches: [breach({ itemName: 'Cr', value: 2.5, direction: 'high' })],
    });
    expect(labelsFor('p1', badges)).toEqual(['Cr 2.5↑']);
  });

  it('counts abnormal items on today lab and antibiotic days', () => {
    const badges = buildRoundingBadges({
      patients,
      briefing: briefing({
        recentLabs: [
          {
            patientId: 'p1',
            patientName: '김부경',
            roomBed: '101-1',
            dateKey: '2026-09-20',
            abnormalCount: 3,
            abnormalItems: ['Na L', 'K H', 'CRP H'],
            totalItems: 20,
          },
        ],
        antibiotics: [
          {
            patientId: 'p1',
            patientName: '김부경',
            roomBed: '101-1',
            medicationId: 'm1',
            drugName: '타조페란주 4.5g',
            dDay: 16,
            isLongTerm: true,
            startDate: new Date(2026, 8, 5),
          },
        ],
      }),
    });

    expect(labelsFor('p1', badges)).toEqual(['Lab 3', '타조페란주 D+16']);
    // 장기 사용은 눈에 띄게
    expect(badges.p1![1]).toMatchObject({ tone: 'warning' });
  });

  it('leaves out a lab with nothing abnormal', () => {
    const badges = buildRoundingBadges({
      patients,
      briefing: briefing({
        recentLabs: [
          {
            patientId: 'p1',
            patientName: '김부경',
            roomBed: '101-1',
            dateKey: '2026-09-20',
            abnormalCount: 0,
            abnormalItems: [],
            totalItems: 20,
          },
        ],
      }),
    });
    expect(badges.p1).toBeUndefined();
  });

  it('counts reminders and skips finished schedules', () => {
    const badges = buildRoundingBadges({
      patients,
      briefing: briefing({
        reminders: [
          { patientId: 'p1', patientName: '김부경', roomBed: '101-1', noteId: 'n1', content: '보호자 설명' },
          { patientId: 'p1', patientName: '김부경', roomBed: '101-1', noteId: 'n2', content: 'CT 확인' },
        ],
        todaySchedules: [
          {
            patientId: 'p1',
            patientName: '김부경',
            roomBed: '101-1',
            scheduleId: 's1',
            title: '복부 CT',
            category: 'exam',
            scheduledTime: '09:00',
            isCompleted: false,
          },
          {
            patientId: 'p1',
            patientName: '김부경',
            roomBed: '101-1',
            scheduleId: 's2',
            title: '끝난 일정',
            category: 'exam',
            isCompleted: true,
          },
        ],
      }),
    });

    expect(labelsFor('p1', badges)).toEqual(['알림 2', '일정 09:00']);
    expect(badges.p1![0]!.title).toContain('CT 확인');
  });

  it("marks today's note last, in its own tone", () => {
    const badges = buildRoundingBadges({
      patients,
      briefing: briefing({
        progressNotes: [
          {
            patientId: 'p1',
            patientName: '김부경',
            roomBed: '101-1',
            noteId: 'n1',
            content: 'S) 어지럼 호소\nO) BP 100/60',
          },
        ],
      }),
      breaches: [breach()],
    });

    // 임상 신호가 먼저, "이미 적었다"는 표시는 뒤에
    expect(labelsFor('p1', badges)).toEqual(['Na 118↓', '메모']);
    expect(badges.p1![1]).toMatchObject({ tone: 'done' });
    // 설명에는 SOAP 첫 줄만
    expect(badges.p1![1]!.title).toBe('S) 어지럼 호소');
  });

  it('counts several notes written today', () => {
    const note = (noteId: string) => ({
      patientId: 'p1',
      patientName: '김부경',
      roomBed: '101-1',
      noteId,
      content: '경과 관찰',
    });
    const badges = buildRoundingBadges({
      patients,
      briefing: briefing({ progressNotes: [note('n1'), note('n2')] }),
    });
    expect(labelsFor('p1', badges)).toEqual(['메모 2']);
  });

  it('shows the manual attention mark first', () => {
    const badges = buildRoundingBadges({
      patients,
      briefing: briefing(),
      breaches: [breach({ patientId: 'p2' })],
    });
    expect(labelsFor('p2', badges)).toEqual(['주의', 'Na 118↓']);
  });

  it('gives quiet patients no badges at all', () => {
    expect(buildRoundingBadges({ patients: [patients[0]!], briefing: briefing() })).toEqual({});
  });
});

describe('shortenDrugName', () => {
  it('keeps the base name and drops dose or form', () => {
    expect(shortenDrugName('타조페란주 4.5g')).toBe('타조페란주');
    expect(shortenDrugName('세프트리악손(주)')).toBe('세프트리악손');
  });

  it('truncates a name too long for a badge', () => {
    expect(shortenDrugName('피페라실린타조박탐나트륨')).toBe('피페라실린타조박탐…');
  });
});
