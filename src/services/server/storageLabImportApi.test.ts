import { describe, expect, it, vi } from 'vitest';
import { buildPatientDirectory } from './storageLabImportApi';
import { computeRegistrationLookup } from '../../lib/registrationLookup';

const lookupKey = new Uint8Array(32).fill(7);
const row = (id: string, registrationHmac: string | null) => ({
  id,
  created_by: 'u1',
  status: 'active' as const,
  registration_hmac: registrationHmac,
});

describe('buildPatientDirectory', () => {
  it('finds encrypted patients by the HMAC lookup without knowing the number', async () => {
    const hmac = await computeRegistrationLookup(lookupKey, '4532');
    const directory = buildPatientDirectory([row('p1', hmac)], lookupKey);

    expect((await directory.find('0000004532'))?.id).toBe('p1');
    expect(await directory.find('4533')).toBeUndefined();
    expect(await directory.find('')).toBeUndefined();
  });

  it('cannot match encrypted patients when the server has no lookup key', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hmac = await computeRegistrationLookup(lookupKey, '4532');
    const directory = buildPatientDirectory([row('p1', hmac)], null);

    expect(await directory.find('4532')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('PATIENT_LOOKUP_KEY'));
    warn.mockRestore();
  });
});
