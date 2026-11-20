import { describe, expect, it } from 'vitest';
import {
  calculateAntibioticEndDate,
  formatQuickEntryNote,
  normalizeQuickEntryDraft,
  parseQuickEntryBlocks,
} from './quickEntry';
import { buildRecentLabText } from '@/hooks/useQuickEntry';
import type { LabResult } from '@/domain/lab';

const roster = ['신효임', '이몽룡'];

describe('parseQuickEntryBlocks', () => {
  it('1줄=이름, 2줄=O, 3줄 이후=P로 읽는다', () => {
    const [block] = parseQuickEntryBlocks(
      '신효임\nFever, K 2.7, CRP 15.0\nTazocin 7일, 알림설정, 케이콘틴 3T#3',
      roster
    );
    expect(block).toMatchObject({
      patientName: '신효임',
      nameMatch: 'exact',
      objective: 'Fever, K 2.7, CRP 15.0',
      plan: 'Tazocin 7일, 알림설정, 케이콘틴 3T#3',
    });
  });

  it('빈 줄로 여러 환자를 나눈다', () => {
    const blocks = parseQuickEntryBlocks('신효임\nO1\nP1\n\n\n이몽룡\nO2\nP2\nP2-2', roster);
    expect(blocks.map((b) => b.patientName)).toEqual(['신효임', '이몽룡']);
    expect(blocks[1]!.plan).toBe('P2\nP2-2');
  });

  it('명단에 없는 이름은 환자를 지어내지 않고 null로 둔다', () => {
    const [block] = parseQuickEntryBlocks('홍길동\nO\nP', roster);
    expect(block!.patientName).toBeNull();
    expect(block!.nameMatch).toBe('none');
    expect(block!.heardName).toBe('홍길동');
  });

  it('O/P 줄이 없어도 오류 없이 비워 둔다', () => {
    const [block] = parseQuickEntryBlocks('신효임', roster);
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
    expect(draft.antibiotics).toEqual([
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
