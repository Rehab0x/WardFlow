import { beforeEach, describe, expect, it, vi } from 'vitest';

const builder = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown } }));

/** supabase 쿼리 빌더를 흉내 — 체이닝 후 await하면 result를 돌려준다. */
function makeQuery() {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'upsert', 'update', 'delete', 'eq', 'is', 'not', 'order', 'limit']) {
    query[method] = vi.fn(() => query);
  }
  query.single = vi.fn(() => Promise.resolve(builder.result));
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(builder.result).then(resolve);
  return query;
}

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn(() => makeQuery()) } }));

const repo = await import('./alerts.repository');

const undefinedTable = { code: '42P01', message: 'relation "alert_rules" does not exist' };

describe('alerts repository — migration not applied yet', () => {
  beforeEach(() => {
    builder.result = { data: null, error: undefinedTable };
  });

  it('detects the missing-table error code', () => {
    expect(repo.isAlertsMigrationMissing(undefinedTable)).toBe(true);
    expect(repo.isAlertsMigrationMissing({ code: '23505' })).toBe(false);
    expect(repo.isAlertsMigrationMissing(null)).toBe(false);
  });

  it('degrades reads to empty results instead of throwing', async () => {
    // 마이그레이션 적용 전에 배포돼도 Today 화면이 깨지면 안 된다.
    await expect(repo.listAlertRules()).resolves.toEqual([]);
    await expect(repo.listAlertEvents()).resolves.toEqual([]);
    await expect(repo.insertNewAlertEvents([
      {
        ownerId: 'u1',
        ruleName: 'r',
        patientId: 'p1',
        severity: 'warning',
        title: 't',
        message: 'm',
        dedupeKey: 'k',
      },
    ])).resolves.toEqual([]);
  });

  it('tells the user to run the migration when they try to write', async () => {
    await expect(
      repo.createAlertRule({
        ownerId: 'u1',
        name: 'r',
        kind: 'antibiotic_duration',
        dayThreshold: 14,
        severity: 'warning',
        isEnabled: true,
      })
    ).rejects.toThrow(/마이그레이션을 적용/);

    await expect(repo.deleteAlertRule('r1')).rejects.toThrow(/마이그레이션을 적용/);
    await expect(repo.acknowledgeAlertEvent('e1')).rejects.toThrow(/마이그레이션을 적용/);
  });
});

describe('alerts repository — normal operation', () => {
  it('skips the round trip when there is nothing to insert', async () => {
    builder.result = { data: [], error: null };
    await expect(repo.insertNewAlertEvents([])).resolves.toEqual([]);
  });

  it('surfaces unrelated database errors', async () => {
    builder.result = { data: null, error: { code: '23505', message: 'duplicate key' } };
    await expect(repo.listAlertRules()).rejects.toMatchObject({ code: '23505' });
  });
});
