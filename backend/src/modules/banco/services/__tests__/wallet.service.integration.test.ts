import { describe, test, expect, beforeAll, beforeEach, mock } from 'bun:test';
import {
  wallets,
  walletAssets,
  walletTransactions,
  withdrawalRequests,
  savingsGoals,
} from '../../schema/wallet.schema';

type TableKey = 'wallets' | 'walletAssets' | 'walletTransactions' | 'withdrawalRequests' | 'savingsGoals';

const data: Record<TableKey, any[]> = {
  wallets: [],
  walletAssets: [],
  walletTransactions: [],
  withdrawalRequests: [],
  savingsGoals: [],
};

const idCounters: Record<TableKey, number> = {
  wallets: 0,
  walletAssets: 0,
  walletTransactions: 0,
  withdrawalRequests: 0,
  savingsGoals: 0,
};

const clone = <T>(row: T): T => JSON.parse(JSON.stringify(row));

const getColumnName = (column: any): string => {
  if (column && typeof column === 'object') {
    if (typeof column.name === 'string') return column.name;
    if (typeof column.columnName === 'string') return column.columnName;
  }
  const str = String(column);
  const match = str.match(/\.([A-Za-z0-9_]+)"?$/) || str.match(/\.([A-Za-z0-9_]+)$/);
  if (match) return match[1];
  return str;
};

type Condition =
  | undefined
  | Condition[]
  | { type: 'eq' | 'gte' | 'lte'; column: string; value: any };

const evaluateCondition = (row: any, condition: Condition): boolean => {
  if (!condition) return true;
  if (Array.isArray(condition)) return condition.every((c) => evaluateCondition(row, c));
  const columnValue = row[condition.column];
  if (condition.type === 'eq') {
    if (columnValue instanceof Date || condition.value instanceof Date) {
      const rowDate = columnValue instanceof Date ? columnValue : new Date(columnValue);
      const condDate = condition.value instanceof Date ? condition.value : new Date(condition.value);
      return rowDate.getTime() === condDate.getTime();
    }
    return String(columnValue) === String(condition.value);
  }
  if (!columnValue) return false;
  const rowDate = columnValue instanceof Date ? columnValue : new Date(columnValue);
  const condDate = condition.value instanceof Date ? condition.value : new Date(condition.value);
  if (condition.type === 'gte') return rowDate.getTime() >= condDate.getTime();
  if (condition.type === 'lte') return rowDate.getTime() <= condDate.getTime();
  return false;
};

const getKey = (table: any): TableKey => {
  if (table === wallets) return 'wallets';
  if (table === walletAssets) return 'walletAssets';
  if (table === walletTransactions) return 'walletTransactions';
  if (table === withdrawalRequests) return 'withdrawalRequests';
  if (table === savingsGoals) return 'savingsGoals';
  throw new Error('Unknown table');
};

class SelectBuilder {
  private condition: Condition = undefined;
  private limitValue: number | undefined;
  private offsetValue = 0;

  constructor(private readonly tableKey: TableKey) {}

  where(cond?: Condition) {
    this.condition = cond;
    return this;
  }

  orderBy() {
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  offset(value: number) {
    this.offsetValue = value;
    return this;
  }

  toRows() {
    let rows = data[this.tableKey].filter((row) => evaluateCondition(row, this.condition)).map(clone);
    if (this.offsetValue) rows = rows.slice(this.offsetValue);
    if (this.limitValue !== undefined) rows = rows.slice(0, this.limitValue);
    return rows;
  }

  then(resolve: (value: any[]) => void, reject: (reason?: unknown) => void) {
    return Promise.resolve(this.toRows()).then(resolve, reject);
  }
}

const buildDb = () => ({
  select() {
    return {
      from(table: any) {
        const key = getKey(table);
        return new SelectBuilder(key);
      },
    };
  },
  insert(table: any) {
    const key = getKey(table);
    return {
      values(payload: any) {
        const record = { ...payload };
        if (!record.id) record.id = `mock-${key}-${++idCounters[key]}`;
        data[key].push(record);
        return {
          returning: () => Promise.resolve([clone(record)]),
        };
      },
    };
  },
  update(table: any) {
    const key = getKey(table);
    return {
      set(values: any) {
        return {
          where(cond?: Condition) {
            const rows = data[key];
            const target = rows.find((row) => evaluateCondition(row, cond)) || rows[0];
            if (!target) return { returning: () => Promise.resolve([]) };
            Object.assign(target, values);
            return {
              returning: () => Promise.resolve([clone(target)]),
            };
          },
        };
      },
    };
  },
});

mock.module('drizzle-orm', () => ({
  eq: (column: any, value: any) => ({ type: 'eq', column: getColumnName(column), value }),
  and: (...conditions: Condition[]) => conditions,
  gte: (column: any, value: any) => ({ type: 'gte', column: getColumnName(column), value }),
  lte: (column: any, value: any) => ({ type: 'lte', column: getColumnName(column), value }),
  desc: () => ({}),
}));

mock.module('@/modules/audit/services/audit-logger.service', () => ({
  logAuditEvent: mock(async () => {}),
}));

mock.module('@/modules/auth/services/two-factor.service', () => ({
  isTwoFactorEnabled: mock(async () => true),
}));

mock.module('../price.service', () => ({
  priceService: {
    getPrice: mock(async (asset: any) => ({
      asset,
      priceUsd: '10000',
      priceBtc: asset === 'BTC' ? '1' : '0',
      lastUpdate: new Date(),
    })),
    getPrices: async () => new Map(),
    convert: async (amount: number) => amount,
    calculateUsdValue: async () => 0,
  },
}));

mock.module('@/db', () => ({ db: buildDb() }));

let walletService: typeof import('../wallet.service').walletService;

beforeAll(async () => {
  walletService = (await import('../wallet.service')).walletService;
});

const resetData = () => {
  (Object.keys(data) as TableKey[]).forEach((key) => {
    data[key].length = 0;
    idCounters[key] = 0;
  });
};

describe('WalletService setWalletLock', () => {
  beforeEach(() => {
    resetData();
    data.wallets.push({
      id: 'w1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      name: 'Main',
      type: 'main',
      description: null,
      isActive: true,
      isLocked: false,
      lockReason: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  test('locks and unlocks wallet', async () => {
    const lock = await walletService.setWalletLock('w1', 'user-1', 'tenant-1', true, 'fraud');
    expect(lock.success).toBe(true);
    expect(data.wallets[0].isLocked).toBe(true);
    expect(data.wallets[0].lockReason).toBe('fraud');

    const unlock = await walletService.setWalletLock('w1', 'user-1', 'tenant-1', false);
    expect(unlock.success).toBe(true);
    expect(data.wallets[0].isLocked).toBe(false);
  });

  test('returns error when wallet not found', async () => {
    data.wallets.length = 0;
    const res = await walletService.setWalletLock('w1', 'user-1', 'tenant-1', true);
    expect(res.success).toBe(false);
  });
});

describe('Savings goals', () => {
  beforeEach(() => {
    resetData();
    data.wallets.push({
      id: 'w1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      name: 'Savings',
      type: 'savings',
      description: null,
      isActive: true,
      isLocked: false,
      lockReason: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  test('creates, lists and updates savings goals', async () => {
    const create = await walletService.createSavingsGoal({
      userId: 'user-1',
      walletId: 'w1',
      name: 'Travel',
      targetAmount: 1,
      asset: 'BTC',
      description: 'Trip planning',
    });
    expect(create.success).toBe(true);
    expect(data.savingsGoals.length).toBe(1);

    const list = await walletService.listSavingsGoals('user-1', 'w1');
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('Travel');

    const progress = await walletService.addSavingsProgress(data.savingsGoals[0].id, 'user-1', 0.4);
    expect(progress.success).toBe(true);
    expect(progress.data?.progressPercent).toBeDefined();
    expect(Number(data.savingsGoals[0].currentAmount)).toBeCloseTo(0.4);
  });
});

describe('Withdrawal flow smoke test', () => {
  beforeEach(() => {
    resetData();
    const timestamp = new Date();
    data.wallets.push({
      id: 'wallet-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      name: 'Main',
      type: 'main',
      description: null,
      isActive: true,
      isLocked: false,
      lockReason: null,
      metadata: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    data.walletAssets.push({
      id: 'asset-1',
      walletId: 'wallet-1',
      asset: 'BTC',
      balance: '1',
      lockedBalance: '0',
      availableBalance: '1',
      lastPrice: '10000',
      lastPriceUsd: '10000',
      lastPriceUpdate: timestamp,
      valueUsd: '10000',
      valueBtc: '1',
      allocationPercent: '100',
      averageCost: null,
      totalCost: null,
      unrealizedPnl: null,
      unrealizedPnlPercent: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  test('create and approve withdrawal updates balances correctly', async () => {
    const create = await walletService.createWithdrawal({
      walletId: 'wallet-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      asset: 'BTC',
      amount: 0.3,
      destinationAddress: 'addr-dest',
      network: 'BTC',
      twoFactorCode: '123456',
    });
    expect(create.success).toBe(true);
    expect(data.withdrawalRequests.length).toBe(1);
    const requestId = data.withdrawalRequests[0].id;
    expect(data.walletAssets[0].lockedBalance).toBe('0.3');
    expect(data.walletAssets[0].availableBalance).toBe('0.7');

    const approve = await walletService.approveWithdrawal({
      withdrawalId: requestId,
      approverId: 'admin-1',
      approved: true,
    });
    expect(approve.success).toBe(true);
    expect(data.withdrawalRequests[0].status).toBe('completed');
    expect(data.walletTransactions.length).toBe(1);
    expect(Number(data.walletAssets[0].balance)).toBeCloseTo(0.7);
    expect(Number(data.walletAssets[0].lockedBalance)).toBeCloseTo(0);
    expect(Number(data.walletAssets[0].availableBalance)).toBeCloseTo(0.7);
  });
});

