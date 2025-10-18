import { describe, test, expect, mock } from 'bun:test';

describe('Auth two-factor service', () => {
  test('isTwoFactorEnabled returns true when record exists', async () => {
    // Mock with data present
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: 'tf1' }]),
          }),
        }),
      }),
    };

    mock.module('@/db', () => ({ db: mockDb }));

    // Clear module cache to get fresh import with new mock
    delete require.cache[require.resolve('../two-factor.service')];

    const { isTwoFactorEnabled } = await import('../two-factor.service');
    const res = await isTwoFactorEnabled('user-1');
    expect(res).toBe(true);
  });

  test('isTwoFactorEnabled returns false when no record', async () => {
    // Mock with no data
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    };

    mock.module('@/db', () => ({ db: mockDb }));

    // Clear module cache to get fresh import with new mock
    delete require.cache[require.resolve('../two-factor.service')];

    const { isTwoFactorEnabled } = await import('../two-factor.service');
    const res = await isTwoFactorEnabled('user-1');
    expect(res).toBe(false);
  });
});
