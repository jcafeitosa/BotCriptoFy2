/**
 * Bot Engine Registry
 * In-memory registry that manages live BotExecutionEngine instances.
 * Ensures single engine per bot, exposes state/metrics for monitoring,
 * and provides safe start/stop orchestration hooks for services and routes.
 */

import logger from '@/utils/logger';
import type { Bot } from '../types/bots.types';
import type { ExecutionConfig, ExecutionState } from './execution-engine.types';
import { BotExecutionEngine } from './bot-execution.engine';

type EngineRecord = {
  engine: BotExecutionEngine;
  startedAt: Date;
};

type EngineFactory = (bot: Bot, config?: Partial<ExecutionConfig>) => BotExecutionEngine;

class BotEngineRegistry {
  private engines: Map<string, EngineRecord> = new Map();
  private factory: EngineFactory = (bot, config) => new BotExecutionEngine(bot, config);

  /** Inject custom engine factory (useful for tests) */
  public setEngineFactory(factory: EngineFactory) {
    this.factory = factory;
  }

  /** Start engine for a bot (idempotent unless force = true) */
  public async start(bot: Bot, config?: Partial<ExecutionConfig>, force = false): Promise<void> {
    const existing = this.engines.get(bot.id);
    if (existing && !force) {
      logger.warn('Engine already running for bot', { botId: bot.id });
      return;
    }

    if (existing && force) {
      await this.safeStop(bot.id);
    }

    logger.info('Starting execution engine', { botId: bot.id, botName: bot.name });
    const engine = this.factory(bot, config);
    await engine.start();
    this.engines.set(bot.id, { engine, startedAt: new Date() });
  }

  /** Stop engine for a bot if running */
  public async stop(botId: string): Promise<void> {
    await this.safeStop(botId);
  }

  /** Get current engine state */
  public getState(botId: string): ExecutionState | 'NOT_RUNNING' {
    const rec = this.engines.get(botId);
    if (!rec) return 'NOT_RUNNING';
    return rec.engine.getState();
  }

  /** Get current engine metrics (if running) */
  public getMetrics(botId: string): ReturnType<BotExecutionEngine['getMetrics']> | null {
    const rec = this.engines.get(botId);
    if (!rec) return null;
    return rec.engine.getMetrics();
  }

  /** Check if engine is running */
  public isRunning(botId: string): boolean {
    const rec = this.engines.get(botId);
    return !!rec && rec.engine.isRunning();
  }

  /** List running engines */
  public list(): Array<{ botId: string; startedAt: Date; state: ExecutionState }> {
    return Array.from(this.engines.entries()).map(([botId, { engine, startedAt }]) => ({
      botId,
      startedAt,
      state: engine.getState(),
    }));
  }

  /** Stop and remove engine if present */
  private async safeStop(botId: string) {
    const rec = this.engines.get(botId);
    if (!rec) return;
    try {
      logger.info('Stopping execution engine', { botId });
      await rec.engine.stop();
    } catch (error) {
      logger.error('Error stopping execution engine', {
        botId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.engines.delete(botId);
    }
  }
}

export const botEngineRegistry = new BotEngineRegistry();

