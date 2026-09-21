import { describe, expect, it, vi } from 'vitest';
import { __testing } from './patients.repository';

const { missingColumnFrom, withMissingColumnFallback } = __testing;

const columns = `
  id,
  name,
  standing_orders,
  height_cm,
  created_at
`;

function undefinedColumnError(column: string) {
  return { code: '42703', message: `column patients.${column} does not exist` };
}

describe('missingColumnFrom', () => {
  it('reads the column name out of the PostgREST message', () => {
    expect(missingColumnFrom(undefinedColumnError('height_cm'))).toBe('height_cm');
    expect(missingColumnFrom({ code: '42703', message: 'column "weight_kg" does not exist' })).toBe(
      'weight_kg'
    );
  });

  it('returns nothing for other errors', () => {
    expect(missingColumnFrom({ code: '42P01', message: 'relation does not exist' })).toBeUndefined();
    expect(missingColumnFrom(null)).toBeUndefined();
  });
});

describe('withMissingColumnFallback', () => {
  it('passes a successful query straight through', async () => {
    const run = vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null });

    const result = await withMissingColumnFallback<{ id: string }[]>(run, columns);

    expect(result.data).toEqual([{ id: '1' }]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('drops one missing column and retries', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: undefinedColumnError('height_cm') })
      .mockResolvedValueOnce({ data: [{ id: '1' }], error: null });

    const result = await withMissingColumnFallback<{ id: string }[]>(run, columns);

    expect(result.error).toBeNull();
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[1]![0]).not.toContain('height_cm');
    // 나머지 컬럼은 그대로 — 적용된 마이그레이션의 값까지 잃지 않는다
    expect(run.mock.calls[1]![0]).toContain('standing_orders');
  });

  it('keeps dropping columns until the query works', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: undefinedColumnError('standing_orders') })
      .mockResolvedValueOnce({ data: null, error: undefinedColumnError('height_cm') })
      .mockResolvedValueOnce({ data: [{ id: '1' }], error: null });

    const result = await withMissingColumnFallback<{ id: string }[]>(run, columns);

    expect(result.error).toBeNull();
    expect(run).toHaveBeenCalledTimes(3);
    expect(run.mock.calls[2]![0]).not.toContain('standing_orders');
    expect(run.mock.calls[2]![0]).not.toContain('height_cm');
  });

  it('gives up instead of looping when the column cannot be identified', async () => {
    const run = vi.fn().mockResolvedValue({ code: '42703', data: null, error: { code: '42703' } });

    const result = await withMissingColumnFallback<unknown>(run, columns);

    expect(result.error?.code).toBe('42703');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not retry other database errors', async () => {
    const run = vi.fn().mockResolvedValue({ data: null, error: { code: '42501' } });

    await withMissingColumnFallback<unknown>(run, columns);

    expect(run).toHaveBeenCalledTimes(1);
  });
});
