import { describe, expect, it } from 'vitest';
import { formatUserFacingError } from './errorMessages';

describe('formatUserFacingError', () => {
  it('keeps explicit Korean auth and permission messages', () => {
    expect(formatUserFacingError(new Error('관리자만 승인할 수 있습니다.'), '실패했습니다.')).toBe('관리자만 승인할 수 있습니다.');
  });

  it('falls back for Supabase/RLS technical errors', () => {
    expect(formatUserFacingError(new Error('new row violates row-level security policy'), '사용자 정보를 불러오지 못했습니다.')).toContain('사용자 정보를 불러오지 못했습니다.');
  });

  it('falls back for network errors', () => {
    expect(formatUserFacingError(new Error('Failed to fetch'), '네트워크 작업에 실패했습니다.')).toContain('네트워크 작업에 실패했습니다.');
  });

  it('returns fallback for empty errors', () => {
    expect(formatUserFacingError(null, '작업에 실패했습니다.')).toBe('작업에 실패했습니다.');
  });

  it('passes through non-technical messages', () => {
    expect(formatUserFacingError(new Error('비밀번호는 4자 이상이어야 합니다.'), '작업에 실패했습니다.')).toBe('비밀번호는 4자 이상이어야 합니다.');
  });
});

