import { describe, expect, it } from 'vitest';
import { readClaudeText } from './aiService';

describe('readClaudeText', () => {
  it('skips the empty thinking block that 5.5-generation models put first', () => {
    expect(
      readClaudeText({
        stop_reason: 'end_turn',
        content: [
          { type: 'thinking', text: undefined },
          { type: 'text', text: '연결 ' },
          { type: 'text', text: '성공' },
        ],
      })
    ).toBe('연결 성공');
  });

  it('reads past a fallback switch block', () => {
    expect(
      readClaudeText({ content: [{ type: 'fallback' }, { type: 'text', text: '답' }] })
    ).toBe('답');
  });

  it('turns a refusal into a readable error instead of an empty answer', () => {
    expect(() => readClaudeText({ stop_reason: 'refusal', content: [] })).toThrow('안전 정책');
  });
});
