import { describe, expect, it } from 'vitest';
import { matchRosterName, normalizePatientName } from './koreanName';

const ROSTER = ['김부경', '이영희', '장영임', '박민수'];

describe('normalizePatientName', () => {
  it('strips spaces, punctuation and honorifics', () => {
    expect(normalizePatientName(' 김 부경 ')).toBe('김부경');
    expect(normalizePatientName('김부경님')).toBe('김부경');
    expect(normalizePatientName('김부경 환자분')).toBe('김부경');
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
    expect(matchRosterName('김 부경 님', ROSTER)).toMatchObject({ name: '김부경', exact: true });
  });

  it('links a misheard final consonant (김부겸 → 김부경)', () => {
    const match = matchRosterName('김부겸', ROSTER);
    expect(match).toMatchObject({ name: '김부경', exact: false });
    expect(match!.distance).toBeLessThan(0.2);
  });

  it('links other common STT slips', () => {
    expect(matchRosterName('장영일', ROSTER)).toMatchObject({ name: '장영임', exact: false });
    expect(matchRosterName('김보경', ROSTER)).toMatchObject({ name: '김부경', exact: false });
    expect(matchRosterName('박민주', ROSTER)).toMatchObject({ name: '박민수', exact: false });
  });

  it('returns null when nobody on the roster is close', () => {
    expect(matchRosterName('최동훈', ROSTER)).toBeNull();
    expect(matchRosterName('', ROSTER)).toBeNull();
    expect(matchRosterName(null, ROSTER)).toBeNull();
    expect(matchRosterName('김부경', [])).toBeNull();
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
