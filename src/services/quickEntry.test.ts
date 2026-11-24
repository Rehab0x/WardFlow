import { describe, expect, it } from 'vitest';
import {
  calculateAntibioticEndDate,
  extractAntibioticRegimen,
  formatQuickEntryNote,
  normalizeQuickEntryDraft,
  parseQuickEntryBlocks,
} from './quickEntry';
import { buildRecentLabText } from '@/hooks/useQuickEntry';
import type { LabResult } from '@/domain/lab';

const roster = ['홍길동', '이몽룡'];

describe('parseQuickEntryBlocks', () => {
  it('1줄=이름, 2줄=O, 3줄 이후=P로 읽는다', () => {
    const [block] = parseQuickEntryBlocks(
      '홍길동\nFever, K 2.7, CRP 15.0\nTazocin 7일, 알림설정, 케이콘틴 3T#3',
      roster
    );
    expect(block).toMatchObject({
      patientName: '홍길동',
      nameMatch: 'exact',
      objective: 'Fever, K 2.7, CRP 15.0',
      plan: 'Tazocin 7일, 알림설정, 케이콘틴 3T#3',
    });
  });

  it('빈 줄로 여러 환자를 나눈다', () => {
    const blocks = parseQuickEntryBlocks('홍길동\nO1\nP1\n\n\n이몽룡\nO2\nP2\nP2-2', roster);
    expect(blocks.map((b) => b.patientName)).toEqual(['홍길동', '이몽룡']);
    expect(blocks[1]!.plan).toBe('P2\nP2-2');
  });

  it('명단에 없는 이름은 환자를 지어내지 않고 null로 둔다', () => {
    const [block] = parseQuickEntryBlocks('김철수\nO\nP', roster);
    expect(block!.patientName).toBeNull();
    expect(block!.nameMatch).toBe('none');
    expect(block!.heardName).toBe('김철수');
  });

  it('O/P 줄이 없어도 오류 없이 비워 둔다', () => {
    const [block] = parseQuickEntryBlocks('홍길동', roster);
    expect(block).toMatchObject({ objective: '', plan: '' });
  });

  it('빈 입력은 블록이 없다', () => {
    expect(parseQuickEntryBlocks('  \n\n ', roster)).toEqual([]);
  });
});

describe('calculateAntibioticEndDate', () => {
  it('시작일을 1일째로 세어 7일이면 +6일', () => {
    const end = calculateAntibioticEndDate(new Date(2026, 10, 20), 7);
    expect([end.getFullYear(), end.getMonth(), end.getDate()]).toEqual([2026, 10, 26]);
  });

  it('달을 넘겨도 맞다', () => {
    const end = calculateAntibioticEndDate(new Date(2026, 10, 28), 7);
    expect([end.getMonth(), end.getDate()]).toEqual([11, 4]);
  });
});

describe('normalizeQuickEntryDraft', () => {
  const fallback = { objective: '원문 O', plan: '원문 P' };

  it('항생제 일수는 1~60 정수만 통과, 아니면 null', () => {
    const draft = normalizeQuickEntryDraft(
      {
        antibiotics: [
          { drugName: 'Tazocin', days: 7 },
          { drugName: 'Cefazolin', days: 0 },
          { drugName: 'Vanco', days: '3' },
          { drugName: 'X', days: 999 },
          { drugName: '', days: 5 },
        ],
      },
      fallback
    );
    expect(draft.antibiotics.map(({ drugName, days }) => ({ drugName, days }))).toEqual([
      { drugName: 'Tazocin', days: 7 },
      { drugName: 'Cefazolin', days: null },
      { drugName: 'Vanco', days: 3 },
      { drugName: 'X', days: null },
    ]);
  });

  it('AI가 O/P를 비우면 의사가 적은 원문으로 대체한다', () => {
    const draft = normalizeQuickEntryDraft({ objective: '', plan: '  ' }, fallback);
    expect(draft.objective).toBe('원문 O');
    expect(draft.plan).toBe('원문 P');
    expect(draft.antibiotics).toEqual([]);
  });

  it('JSON이 객체가 아니어도 죽지 않는다', () => {
    expect(normalizeQuickEntryDraft('엉뚱한 문자열', fallback).objective).toBe('원문 O');
  });
});

describe('formatQuickEntryNote', () => {
  it('비어 있는 항목은 건너뛴다', () => {
    expect(
      formatQuickEntryNote({ subjective: '', objective: 'Fever', assessment: '#. UTI', plan: 'Tazocin' })
    ).toBe('O) Fever\nA) #. UTI\nP) Tazocin');
  });
});

describe('buildRecentLabText', () => {
  it('최근 두 검사일만, 최신순으로 만든다', () => {
    const lab = (day: number, name: string, valueText: string, hlFlag?: 'H' | 'L'): LabResult =>
      ({
        testDate: new Date(2026, 10, day),
        items: [{ name, valueText, unit: '', hlFlag }],
      }) as unknown as LabResult;

    const text = buildRecentLabText([
      lab(1, 'K', '4.0'),
      lab(18, 'K', '2.7', 'L'),
      lab(19, 'CRP', '15.0', 'H'),
    ]);
    expect(text).toBe('2026-11-19: CRP 15.0(H)\n2026-11-18: K 2.7(L)');
  });
});

describe('extractAntibioticRegimen — P 줄에서 약·용량·횟수·일수 읽기', () => {
  it('"Tazocin 4V#4 7일" → 4V / #4 / 7일', () => {
    expect(extractAntibioticRegimen('Tazocin 4V#4 7일', 'Tazocin')).toEqual({
      dosage: '4V',
      frequency: '#4',
      days: 7,
    });
  });

  it('쉼표·공백으로 나눠 적어도 읽는다', () => {
    expect(extractAntibioticRegimen('타조신, 3V, #3, 7일', '타조신')).toEqual({
      dosage: '3V',
      frequency: '#3',
      days: 7,
    });
  });

  it('다른 약 앞에서 멈춘다 — 케이콘틴 3T#3을 항생제 값으로 읽지 않는다', () => {
    expect(extractAntibioticRegimen('Tazocin 7일, 알림설정, 케이콘틴 3T#3', 'Tazocin')).toEqual({
      dosage: '',
      frequency: '',
      days: 7,
    });
  });

  it('용량 단위 대소문자·mg를 정리한다', () => {
    expect(extractAntibioticRegimen('Cefazolin 2g #3', 'Cefazolin').dosage).toBe('2G');
    expect(extractAntibioticRegimen('Vancomycin 500MG #2', 'Vancomycin').dosage).toBe('500mg');
  });

  it('약 이름이 P에 없으면 비워 둔다', () => {
    expect(extractAntibioticRegimen('경과 관찰', 'Tazocin')).toEqual({ dosage: '', frequency: '', days: null });
  });

  it('일수가 범위 밖이면 무시', () => {
    expect(extractAntibioticRegimen('Tazocin 4V#4 99일', 'Tazocin').days).toBeNull();
  });

  it('normalize는 원문에서 읽은 값을 AI 값보다 우선한다', () => {
    const draft = normalizeQuickEntryDraft(
      { antibiotics: [{ drugName: 'Tazocin', dosage: '9V', frequency: '#1', days: 3 }] },
      { objective: '', plan: 'Tazocin 4V#4 7일' }
    );
    expect(draft.antibiotics).toEqual([{ drugName: 'Tazocin', dosage: '4V', frequency: '#4', days: 7 }]);
  });

  it('원문에 없으면 AI 값을 쓴다', () => {
    const draft = normalizeQuickEntryDraft(
      { antibiotics: [{ drugName: 'Tazocin', dosage: '4V', frequency: '#4', days: 7 }] },
      { objective: '', plan: '' }
    );
    expect(draft.antibiotics[0]).toMatchObject({ dosage: '4V', frequency: '#4', days: 7 });
  });
});
