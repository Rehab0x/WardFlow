import { describe, expect, it } from 'vitest';
import { normalizeVoiceQuery, parseVoiceQueryJson } from './aiService';

const roster = ['장영임', '김철수', '이영희'];

describe('parseVoiceQueryJson', () => {
  it('parses a bare JSON object', () => {
    expect(parseVoiceQueryJson('{"patientName":"김철수","queryType":"lab","item":"Na"}')).toEqual({
      patientName: '김철수',
      queryType: 'lab',
      item: 'Na',
    });
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"patientName":"김철수","queryType":"lab","item":"Na"}\n```';
    expect(parseVoiceQueryJson(raw)).toMatchObject({ patientName: '김철수' });
  });

  it('recovers when the model wraps the JSON in prose', () => {
    const raw = '네, 아래와 같습니다.\n{"patientName":"이영희","queryType":"medication","item":null}\n도움이 되었길';
    expect(parseVoiceQueryJson(raw)).toMatchObject({ patientName: '이영희' });
  });

  it('throws a user-facing message when there is no JSON at all', () => {
    expect(() => parseVoiceQueryJson('잘 모르겠습니다')).toThrow(/이해하지 못했습니다/);
    expect(() => parseVoiceQueryJson('{ broken')).toThrow(/이해하지 못했습니다/);
  });
});

describe('normalizeVoiceQuery', () => {
  it('keeps a name that exists on the roster', () => {
    const result = normalizeVoiceQuery(
      { patientName: '장영임', queryType: 'lab', item: 'Na' },
      roster
    );
    expect(result).toEqual({ patientName: '장영임', queryType: 'lab', item: 'Na' });
  });

  it('tolerates whitespace differences in the name', () => {
    expect(
      normalizeVoiceQuery({ patientName: '김 철수', queryType: 'lab', item: 'K' }, roster)
    ).toMatchObject({ patientName: '김철수' });
  });

  it('rejects a name the model invented', () => {
    // STT 오인식을 LLM이 그대로 통과시키는 경우를 막는다.
    expect(
      normalizeVoiceQuery({ patientName: '장영일', queryType: 'lab', item: 'Na' }, roster)
    ).toMatchObject({ patientName: null });
  });

  it('falls back to unknown for an unrecognised query type', () => {
    expect(
      normalizeVoiceQuery({ patientName: '김철수', queryType: 'weather', item: null }, roster)
    ).toMatchObject({ queryType: 'unknown' });
  });

  it('survives malformed or missing fields', () => {
    expect(normalizeVoiceQuery({}, roster)).toEqual({
      patientName: null,
      queryType: 'unknown',
      item: null,
    });
    expect(normalizeVoiceQuery(null, roster)).toMatchObject({ queryType: 'unknown' });
    expect(normalizeVoiceQuery({ patientName: 42, item: 7 }, roster)).toEqual({
      patientName: null,
      queryType: 'unknown',
      item: null,
    });
  });

  it('treats an empty item string as absent', () => {
    expect(
      normalizeVoiceQuery({ patientName: '김철수', queryType: 'lab', item: '   ' }, roster)
    ).toMatchObject({ item: null });
  });
});
