/**
 * Bot Engine Registry - Unit Tests
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';

// Mock the concrete engine implementation before importing the registry
class FakeEngine {
  private state: any = 'IDLE';
  private running = false;
  constructor(public bot: any) {}
  async start() {
    this.state = 'RUNNING';
    this.running = true;
  }
  async stop() {
    this.state = 'TERMINATED';
    this.running = false;
  }
  getState() {
    return this.state;
  }
  getMetrics() {
    return { botId: this.bot.id, state: this.state, ticksPerMinute: 0 } as any;
  }
  isRunning() {
    return this.running;
  }
}

mock.module('./bot-execution.engine', () => ({ BotExecutionEngine: FakeEngine }));

let registry: typeof import('./bot-engine.registry')['botEngineRegistry'];

beforeEach(async () => {
  // Re-import to ensure mocks are applied
  const mod = await import('./bot-engine.registry');
  registry = mod.botEngineRegistry;
});

afterEach(async () => {
  // Stop any stray engines between tests
  const running = registry.list();
  for (const r of running) {
    await registry.stop(r.botId);
  }
});

const testBot = {
  id: 'bot-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  name: 'Test Bot',
  type: 'grid',
  status: 'stopped',
  strategyId: undefined,
  templateId: undefined,
  exchangeId: 'binance',
  symbol: 'BTC/USDT',
  timeframe: '1h',
  allocatedCapital: 1000,
  currentCapital: 1000,
  maxDrawdown: 10,
  stopLossPercent: 2,
  takeProfitPercent: 5,
  maxPositions: 1,
  positionSizing: 'fixed',
  positionSizePercent: 10,
  orderType: 'limit',
  useTrailingStop: false,
  trailingStopPercent: 1,
  parameters: {},
  riskLimits: {},
  notifications: {},
  runOnWeekends: true,
  runOnHolidays: true,
  cooldownMinutes: 5,
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  totalProfit: 0,
  totalLoss: 0,
  netProfit: 0,
  currentDrawdown: 0,
  maxDrawdownReached: 0,
  autoRestart: true,
  autoStopOnDrawdown: true,
  autoStopOnLoss: false,
  enabled: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

describe('botEngineRegistry', () => {
  test('starts, lists, gets state/metrics, and stops engine', async () => {
    expect(registry.isRunning(testBot.id)).toBe(false);
    expect(registry.getState(testBot.id)).toBe('NOT_RUNNING');
    expect(registry.getMetrics(testBot.id)).toBeNull();

    await registry.start(testBot);
    expect(registry.isRunning(testBot.id)).toBe(true);

    const state = registry.getState(testBot.id);
    expect(state).toBe('RUNNING');

    const metrics = registry.getMetrics(testBot.id);
    expect(metrics).toBeTruthy();
    expect((metrics as any).botId).toBe(testBot.id);

    const list = registry.list();
    expect(list.length).toBe(1);
    expect(list[0].botId).toBe(testBot.id);

    await registry.stop(testBot.id);
    expect(registry.isRunning(testBot.id)).toBe(false);
    expect(registry.getState(testBot.id)).toBe('NOT_RUNNING');
  });
});

