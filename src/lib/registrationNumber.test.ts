import { describe, expect, it } from 'vitest';
import { normalizeRegistrationNumber } from './registrationNumber';

describe('normalizeRegistrationNumber', () => {
  it('treats leading-zero variants of the same chart number as equal', () => {
    expect(normalizeRegistrationNumber('0000004532')).toBe(
      normalizeRegistrationNumber('4532')
    );
    expect(normalizeRegistrationNumber('  004532 ')).toBe('4532');
  });

  it('keeps distinct chart numbers distinct', () => {
    expect(normalizeRegistrationNumber('4532')).not.toBe(normalizeRegistrationNumber('45320'));
    expect(normalizeRegistrationNumber('45321')).toBe('45321');
  });

  it('keeps an all-zero chart number as "0" instead of an empty key', () => {
    expect(normalizeRegistrationNumber('0000')).toBe('0');
    expect(normalizeRegistrationNumber('0')).toBe('0');
  });

  it('returns an empty key for blank input', () => {
    expect(normalizeRegistrationNumber('')).toBe('');
    expect(normalizeRegistrationNumber('   ')).toBe('');
    expect(normalizeRegistrationNumber(undefined)).toBe('');
    expect(normalizeRegistrationNumber(null)).toBe('');
  });
});
