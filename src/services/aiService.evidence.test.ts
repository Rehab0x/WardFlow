import { describe, expect, it } from 'vitest';
import { normalizeEvidenceSuggestion } from './aiService';

describe('normalizeEvidenceSuggestion', () => {
  it('keeps well-formed topics', () => {
    const result = normalizeEvidenceSuggestion({
      topics: [
        {
          title: '흡인성 폐렴 항생제 기간',
          rationale: '항생제 10일째',
          keywords: ['aspiration pneumonia', 'antibiotic duration'],
          query: 'aspiration pneumonia AND antibiotic duration',
          guideline: 'IDSA',
        },
      ],
      cautions: ['신기능 저하 시 용량 조절 필요'],
    });

    expect(result.topics).toHaveLength(1);
    expect(result.topics[0]).toMatchObject({ guideline: 'IDSA' });
    expect(result.cautions).toEqual(['신기능 저하 시 용량 조절 필요']);
  });

  it('falls back to keywords when the query is missing', () => {
    const result = normalizeEvidenceSuggestion({
      topics: [{ title: '주제', keywords: ['hyponatremia', 'SIADH'] }],
    });
    expect(result.topics[0]?.query).toBe('hyponatremia AND SIADH');
  });

  it('falls back to keywords when the title is missing', () => {
    const result = normalizeEvidenceSuggestion({
      topics: [{ keywords: ['AKI', 'contrast'], query: 'AKI AND contrast' }],
    });
    expect(result.topics[0]?.title).toBe('AKI, contrast');
  });

  it('drops topics with nothing usable', () => {
    const result = normalizeEvidenceSuggestion({
      topics: [{ rationale: '이유만 있음' }, { title: '쓸 만한 주제', query: 'sepsis' }],
    });
    expect(result.topics).toHaveLength(1);
    expect(result.topics[0]?.title).toBe('쓸 만한 주제');
  });

  it('caps topics at four and cautions at three', () => {
    const result = normalizeEvidenceSuggestion({
      topics: Array.from({ length: 8 }, (_, i) => ({ title: `주제 ${i}`, query: `q${i}` })),
      cautions: ['a', 'b', 'c', 'd', 'e'],
    });
    expect(result.topics).toHaveLength(4);
    expect(result.cautions).toHaveLength(3);
  });

  it('survives malformed shapes', () => {
    expect(normalizeEvidenceSuggestion(null)).toEqual({ topics: [], cautions: [] });
    expect(normalizeEvidenceSuggestion({ topics: 'nope', cautions: 5 })).toEqual({
      topics: [],
      cautions: [],
    });
    expect(
      normalizeEvidenceSuggestion({ topics: [{ title: 'x', keywords: 'not-an-array', query: 'q' }] })
        .topics[0]?.keywords
    ).toEqual([]);
  });

  it('filters non-string keywords and cautions', () => {
    const result = normalizeEvidenceSuggestion({
      topics: [{ title: 'x', keywords: ['sepsis', 42, null, ' lactate '], query: 'q' }],
      cautions: ['주의', 7],
    });
    expect(result.topics[0]?.keywords).toEqual(['sepsis', 'lactate']);
    expect(result.cautions).toEqual(['주의']);
  });
});
