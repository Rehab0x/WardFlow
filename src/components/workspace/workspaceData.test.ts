import { describe, expect, it } from 'vitest';
import { DEFAULT_COPY_FORMAT } from '@/types/charting';
import {
  buildChartingCopy,
  buildLabValueTable,
  formatAssessmentProblem,
  groupNotesByDate,
  insertAssessmentProblem,
  limitNoteGroups,
} from './workspaceData';
import type { ChartingDraft } from './types';
import type { LabResult } from '@/types/lab';

const draft: ChartingDraft = {
  chiefComplaint: 'fever',
  onset: '2026-09-01',
  presentIllness: 'cough for 3 days',
  pastHistory: '',
  reviewOfSystem: '',
  physicalExam: '',
  problemListText: 'pneumonia\nAKI',
  plan: 'start abx',
  guardianExplanation: '',
  etc: '',
};

describe('buildChartingCopy', () => {
  it('follows the charting copy settings for problem list style', () => {
    const numbered = buildChartingCopy(draft, {
      ...DEFAULT_COPY_FORMAT,
      problemListStyle: 'numbered',
    });
    expect(numbered).toContain('#1. pneumonia');
    expect(numbered).toContain('#2. AKI');

    const bulleted = buildChartingCopy(draft, {
      ...DEFAULT_COPY_FORMAT,
      problemListStyle: 'bulleted',
    });
    expect(bulleted).toContain('• pneumonia');
    expect(bulleted).not.toContain('#1.');
  });

  it('honours custom section names and the field-name toggle', () => {
    const renamed = buildChartingCopy(draft, {
      ...DEFAULT_COPY_FORMAT,
      sectionNames: { ...DEFAULT_COPY_FORMAT.sectionNames, chiefComplaint: '주소' },
    });
    expect(renamed).toContain('주소) fever');

    const withoutNames = buildChartingCopy(draft, {
      ...DEFAULT_COPY_FORMAT,
      includeFieldNames: false,
    });
    expect(withoutNames).not.toContain('C/C)');
    expect(withoutNames).toContain('fever');
  });

  it('drops empty sections when excludeEmptySections is on', () => {
    const copy = buildChartingCopy(draft, DEFAULT_COPY_FORMAT);
    expect(copy).not.toContain('ROS');
    expect(copy).not.toContain('Etc');
  });
});

function makeLab(overrides: Partial<LabResult> = {}): LabResult {
  return {
    id: 'lab-1',
    patientId: 'p1',
    testDate: new Date(2026, 8, 10),
    category: 'BC',
    source: 'parsed',
    createdAt: new Date(2026, 8, 10),
    items: [
      { name: 'Na', value: 128, unit: 'mmol/L', isAbnormal: true, hlFlag: 'L' },
      { name: 'K', value: 4.1, unit: 'mmol/L', isAbnormal: false },
    ],
    ...overrides,
  };
}

describe('buildLabValueTable', () => {
  it('pivots lab results into item rows keyed by date, newest first', () => {
    const table = buildLabValueTable([
      makeLab(),
      makeLab({
        id: 'lab-2',
        testDate: new Date(2026, 8, 12),
        items: [{ name: 'Na', value: 135, unit: 'mmol/L', isAbnormal: false }],
      }),
    ]);

    expect(table.dates).toEqual(['2026-09-12', '2026-09-10']);
    const sodium = table.itemRows.find((row) => row.name === 'Na');
    expect(sodium?.values.get('2026-09-10')).toEqual({ value: 128, flag: 'L' });
    expect(sodium?.values.get('2026-09-12')).toEqual({ value: 135, flag: undefined });
  });

  it('adds an extra column for a date being filled in', () => {
    const table = buildLabValueTable([makeLab()], '2026-09-15');
    expect(table.dates).toContain('2026-09-15');
    expect(table.dateLabIds.get('2026-09-15')).toBeUndefined();
    expect(table.dateLabIds.get('2026-09-10')).toEqual(['lab-1']);
  });
});

describe('insertAssessmentProblem', () => {
  const draft = ['S)', '열감 호소', 'O)', 'BT 38.2', 'A)', '#. R/O Pneumonia', 'P)', '타이레놀'].join(
    '\n'
  );

  it('adds the problem at the end of the A) section, before P)', () => {
    expect(insertAssessmentProblem(draft, 'HTN').split('\n')).toEqual([
      'S)',
      '열감 호소',
      'O)',
      'BT 38.2',
      'A)',
      '#. R/O Pneumonia',
      '#. HTN',
      'P)',
      '타이레놀',
    ]);
  });

  it('does not add the same problem twice', () => {
    const once = insertAssessmentProblem(draft, 'HTN');
    expect(insertAssessmentProblem(once, 'HTN')).toBe(once);
    // 이미 적혀 있던 항목도 마찬가지
    expect(insertAssessmentProblem(draft, 'R/O Pneumonia')).toBe(draft);
  });

  it('keeps the blank line that separates sections', () => {
    const spaced = ['A)', '#. DM', '', 'P)', '경과 관찰'].join('\n');
    expect(insertAssessmentProblem(spaced, 'HTN').split('\n')).toEqual([
      'A)',
      '#. DM',
      '#. HTN',
      '',
      'P)',
      '경과 관찰',
    ]);
  });

  it('creates the A) section when the draft has none', () => {
    expect(insertAssessmentProblem('S)\n열감', 'HTN')).toBe('S)\n열감\n\nA)\n#. HTN');
    expect(insertAssessmentProblem('', 'HTN')).toBe('A)\n#. HTN');
  });

  it('appends to the end when P) is missing', () => {
    expect(insertAssessmentProblem('A)\n#. DM', 'HTN')).toBe('A)\n#. DM\n#. HTN');
  });

  it('ignores an empty problem', () => {
    expect(insertAssessmentProblem(draft, '   ')).toBe(draft);
  });
});

describe('formatAssessmentProblem', () => {
  it('prefixes the problem with the problem-list marker', () => {
    expect(formatAssessmentProblem('HTN')).toBe('#. HTN');
    expect(formatAssessmentProblem('  HTN  ')).toBe('#. HTN');
  });

  it('does not stack markers that are already there', () => {
    expect(formatAssessmentProblem('#. HTN')).toBe('#. HTN');
    expect(formatAssessmentProblem('#1. HTN')).toBe('#. HTN');
    expect(formatAssessmentProblem('- HTN')).toBe('#. HTN');
    expect(formatAssessmentProblem('• HTN')).toBe('#. HTN');
  });
});

describe('groupNotesByDate', () => {
  const at = (iso: string) => new Date(iso);

  it('groups by day with the newest first', () => {
    const groups = groupNotesByDate([
      { id: 'a', type: 'progress', content: '어제', createdAt: at('2026-09-20T09:00:00') },
      { id: 'b', type: 'progress', content: '오늘 1', createdAt: at('2026-09-21T08:00:00') },
      { id: 'c', type: 'progress', content: '오늘 2', createdAt: at('2026-09-21T15:00:00') },
    ]);

    expect(groups.map((group) => group.dateKey)).toEqual(['2026-09-21', '2026-09-20']);
    expect(groups[0]!.notes.map((note) => note.content)).toEqual(['오늘 1', '오늘 2']);
  });

  it('files a reminder under its alert date, not the day it was written', () => {
    const groups = groupNotesByDate([
      {
        id: 'a',
        type: 'reminder',
        content: '내일 확인',
        createdAt: at('2026-09-18T09:00:00'),
        alertDate: at('2026-09-22T00:00:00'),
      },
    ]);

    expect(groups[0]!.dateKey).toBe('2026-09-22');
  });

  it('falls back to the written date when a reminder has no alert date', () => {
    const groups = groupNotesByDate([
      { id: 'a', type: 'reminder', content: '알림', createdAt: at('2026-09-18T09:00:00') },
    ]);
    expect(groups[0]!.dateKey).toBe('2026-09-18');
  });

  it('returns nothing for an empty list', () => {
    expect(groupNotesByDate([])).toEqual([]);
  });
});

describe('limitNoteGroups', () => {
  const group = (dateKey: string, count: number) => ({
    dateKey,
    notes: Array.from({ length: count }, (_, index) => ({
      id: `${dateKey}-${index}`,
      type: 'progress' as const,
      content: `${dateKey} ${index}`,
    })),
  });

  it('keeps everything when it already fits', () => {
    const groups = [group('2026-09-21', 2), group('2026-09-20', 3)];
    expect(limitNoteGroups(groups, 10)).toEqual({ groups, hiddenCount: 0 });
  });

  it('counts what it left out', () => {
    const groups = [group('2026-09-21', 4), group('2026-09-20', 4), group('2026-09-19', 5)];
    const limited = limitNoteGroups(groups, 10);

    // 8개까지 담고 다음 묶음을 통째로 더한다(=13) — 남은 것이 없다
    expect(limited.groups).toHaveLength(3);
    expect(limited.hiddenCount).toBe(0);
  });

  it('never splits a day in half', () => {
    const groups = [group('2026-09-21', 12), group('2026-09-20', 3)];
    const limited = limitNoteGroups(groups, 10);

    // 첫 날이 한도를 넘지만 그 날은 통째로 보여준다
    expect(limited.groups).toHaveLength(1);
    expect(limited.groups[0]!.notes).toHaveLength(12);
    expect(limited.hiddenCount).toBe(3);
  });

  it('handles an empty list and a zero limit', () => {
    expect(limitNoteGroups([], 10)).toEqual({ groups: [], hiddenCount: 0 });
    expect(limitNoteGroups([group('2026-09-21', 2)], 0)).toEqual({ groups: [], hiddenCount: 2 });
  });
});
