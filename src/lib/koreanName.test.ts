import { describe, expect, it } from 'vitest';
import { matchRosterName, normalizePatientName } from './koreanName';

const ROSTER = ['홍길동', '이영희', '이몽룡', '박민수'];

describe('normalizePatientName', () => {
  it('strips spaces, punctuation and honorifics', () => {
    expect(normalizePatientName(' 홍 길동 ')).toBe('홍길동');
    expect(normalizePatientName('홍길동님')).toBe('홍길동');
    expect(normalizePatientName('홍길동 환자분')).toBe('홍길동');
    expect(normalizePatientName('“이영희”')).toBe('이영희');
  });

  it('keeps two-letter names that would otherwise vanish', () => {
    // "김님"에서 님을 떼면 한 글자만 남으므로 그대로 둔다
    expect(normalizePatientName('김님')).toBe('김님');
  });
});

describe('matchRosterName', () => {
  it('matches the exact spelling first', () => {
    expect(matchRosterName('이영희', ROSTER)).toEqual({
      name: '이영희',
      exact: true,
      distance: 0,
    });
  });

  it('treats spacing and honorifics as an exact match', () => {
    expect(matchRosterName('홍 길동 님', ROSTER)).toMatchObject({ name: '홍길동', exact: true });
  });

  it('links a misheard final consonant (홍길돔 → 홍길동)', () => {
    const match = matchRosterName('홍길돔', ROSTER);
    expect(match).toMatchObject({ name: '홍길동', exact: false });
    expect(match!.distance).toBeLessThan(0.2);
  });

  it('links other common STT slips', () => {
    expect(matchRosterName('이몽룹', ROSTER)).toMatchObject({ name: '이몽룡', exact: false });
    expect(matchRosterName('홍갈동', ROSTER)).toMatchObject({ name: '홍길동', exact: false });
    expect(matchRosterName('박민주', ROSTER)).toMatchObject({ name: '박민수', exact: false });
  });

  it('returns null when nobody on the roster is close', () => {
    expect(matchRosterName('최동훈', ROSTER)).toBeNull();
    expect(matchRosterName('', ROSTER)).toBeNull();
    expect(matchRosterName(null, ROSTER)).toBeNull();
    expect(matchRosterName('홍길동', [])).toBeNull();
  });

  it('refuses to guess when two patients are similarly close', () => {
    // 김영순은 김영수·김영준 어느 쪽인지 알 수 없다 — 사람이 골라야 한다
    expect(matchRosterName('김영순', ['김영수', '김영준'])).toBeNull();
  });

  it('is stricter with two-syllable names', () => {
    expect(matchRosterName('김수', ['김순'])).toMatchObject({ name: '김순', exact: false });
    expect(matchRosterName('김수', ['박수'])).toBeNull();
  });

  it('never fuzzy-matches a single syllable', () => {
    expect(matchRosterName('김', ['김수'])).toBeNull();
  });

  it('falls back to plain comparison for non-Korean names', () => {
    expect(matchRosterName('john smith', ['John Smith'])).toMatchObject({ exact: true });
    expect(matchRosterName('Johnson', ['John Smith'])).toBeNull();
  });
});
