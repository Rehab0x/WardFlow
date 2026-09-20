import { describe, expect, it } from 'vitest';
import { formatSegmentAsNote, normalizeConversationSegments } from './aiService';

const roster = ['김철수', '이영희', '장영임'];

describe('normalizeConversationSegments', () => {
  it('keeps segments whose patient is on the roster', () => {
    const result = normalizeConversationSegments(
      [
        {
          patientName: '김철수',
          excerpt: '새벽에 열이 났습니다',
          subjective: '열감 호소',
          objective: 'BT 38.2 → 37.1',
          assessment: '발열',
          plan: '타이레놀 투여함',
        },
      ],
      roster
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ patientName: '김철수', objective: 'BT 38.2 → 37.1' });
  });

  it('nulls a patient name that is not on the roster', () => {
    const result = normalizeConversationSegments(
      [{ patientName: '박환자', subjective: '통증 호소' }],
      roster
    );
    expect(result[0]?.patientName).toBeNull();
    // 내용은 남겨서 사용자가 직접 환자를 고를 수 있게 한다
    expect(result[0]?.subjective).toBe('통증 호소');
  });

  it('tolerates whitespace differences in the name', () => {
    const result = normalizeConversationSegments(
      [{ patientName: '이 영희', plan: '소변량 확인' }],
      roster
    );
    expect(result[0]?.patientName).toBe('이영희');
  });

  it('drops entries with no content at all', () => {
    const result = normalizeConversationSegments(
      [
        { patientName: '김철수', subjective: '', objective: '', assessment: '', plan: '', excerpt: '' },
        { patientName: '이영희', plan: '경과 관찰' },
      ],
      roster
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.patientName).toBe('이영희');
  });

  it('defaults missing or malformed fields to empty strings', () => {
    const result = normalizeConversationSegments(
      [{ patientName: '김철수', subjective: 42, plan: null, objective: 'BP 120/80' }],
      roster
    );
    expect(result[0]).toMatchObject({ subjective: '', plan: '', objective: 'BP 120/80' });
  });

  it('accepts a single object as well as an array', () => {
    const result = normalizeConversationSegments({ patientName: '김철수', plan: '관찰' }, roster);
    expect(result).toHaveLength(1);
  });

  it('returns nothing for junk input', () => {
    expect(normalizeConversationSegments(null, roster)).toEqual([]);
    expect(normalizeConversationSegments('문자열', roster)).toEqual([]);
    expect(normalizeConversationSegments([], roster)).toEqual([]);
  });
});

describe('formatSegmentAsNote', () => {
  it('renders only the filled SOAP lines', () => {
    const note = formatSegmentAsNote({
      patientName: '김철수',
      excerpt: '',
      subjective: '열감',
      objective: 'BT 38.2',
      assessment: '',
      plan: '타이레놀',
    });
    expect(note).toBe('S) 열감\nO) BT 38.2\nP) 타이레놀');
    expect(note).not.toContain('A)');
  });

  it('returns an empty string when nothing was captured', () => {
    expect(
      formatSegmentAsNote({
        patientName: null,
        excerpt: '뭔가 말함',
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
      })
    ).toBe('');
  });
});
