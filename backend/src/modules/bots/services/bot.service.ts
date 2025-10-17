/**
 * Bot Service
 * Trading bot management and execution service
 */

import { db } from '@/db';
import { bots, botExecutions, botTrades, botLogs, botTemplates } from '../schema/bots.schema';
import { eq, and, desc, asc, gte, lte, sql, inArray, or, like } from 'drizzle-orm';
import logger from '../../../utils/logger';
import type {
  Bot,
  BotExecution,
  BotTrade,
  BotLog,
  BotTemplate,
  BotPerformanceSummary,
  BotStatistics,
  BotHealthStatus,
  CreateBotRequest,
  UpdateBotRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  BotQueryFilters,
  ExecutionQueryFilters,
  TradeQueryFilters,
  LogQueryFilters,
  TemplateQueryFilters,
  PaginationOptions,
  PaginatedResponse,
  IBotService,
  LogLevel,
  LogCategory,
  BotStatus,
} from '../types/bots.types';

class BotService implements IBotService {
  // ============================================================================
  // BOT MANAGEMENT
  // ============================================================================

  /**
   * Create new trading bot
   */
  async createBot(userId: string, tenantId: string, request: CreateBotRequest): Promise<Bot> {
    try {
      logger.info('Creating new bot', {
        userId,
        tenantId,
        botName: request.name,
        botType: request.type,
      });

      // If template provided, load template configuration
      let templateConfig: Record<string, any> = {};
      if (request.templateId) {
        const template = await this.getTemplate(request.templateId);
        if (template) {
          templateConfig = template.configuration;
          logger.info('Loaded bot template configuration', {
            templateId: request.templateId,
            templateName: template.name,
          });
        }
      }

      // Merge template config with request
      const botConfig = {
        ...templateConfig,
        ...request,
      };

      // Create bot record
      const [bot] = await db
        .insert(bots)
        .values({
          userId,
          tenantId,
          name: botConfig.name,
          description: botConfig.description,
          type: botConfig.type,
          status: 'stopped',
          strategyId: botConfig.strategyId,
          templateId: botConfig.templateId,
          exchangeId: botConfig.exchangeId,
          symbol: botConfig.symbol,
          timeframe: botConfig.timeframe || '1h',
          allocatedCapital: botConfig.allocatedCapital.toString(),
          currentCapital: botConfig.allocatedCapital.toString(),
          maxDrawdown: (botConfig.maxDrawdown || 10.0).toString(),
          stopLossPercent: (botConfig.stopLossPercent || 2.0).toString(),
          takeProfitPercent: (botConfig.takeProfitPercent || 5.0).toString(),
          maxPositions: (botConfig.maxPositions || 5).toString(),
          positionSizing: botConfig.positionSizing || 'fixed',
          positionSizePercent: (botConfig.positionSizePercent || 20.0).toString(),
          orderType: botConfig.orderType || 'limit',
          useTrailingStop: botConfig.useTrailingStop ?? false,
          trailingStopPercent: (botConfig.trailingStopPercent || 1.5).toString(),
          gridLevels: botConfig.gridLevels?.toString(),
          gridUpperPrice: botConfig.gridUpperPrice?.toString(),
          gridLowerPrice: botConfig.gridLowerPrice?.toString(),
          gridProfitPercent: botConfig.gridProfitPercent?.toString(),
          dcaOrderCount: botConfig.dcaOrderCount?.toString(),
          dcaOrderAmount: botConfig.dcaOrderAmount?.toString(),
          dcaStepPercent: botConfig.dcaStepPercent?.toString(),
          dcaTakeProfitPercent: botConfig.dcaTakeProfitPercent?.toString(),
          parameters: botConfig.parameters,
          riskLimits: botConfig.riskLimits,
          notifications: botConfig.notifications,
          runOnWeekends: botConfig.runOnWeekends ?? true,
          runOnHolidays: botConfig.runOnHolidays ?? true,
          startTime: botConfig.startTime,
          endTime: botConfig.endTime,
          maxDailyTrades: botConfig.maxDailyTrades?.toString(),
          cooldownMinutes: (botConfig.cooldownMinutes || 5).toString(),
          autoRestart: botConfig.autoRestart ?? true,
          autoStopOnDrawdown: botConfig.autoStopOnDrawdown ?? true,
          autoStopOnLoss: botConfig.autoStopOnLoss ?? false,
          enabled: botConfig.enabled ?? true,
          notes: botConfig.notes,
          tags: botConfig.tags,
        })
        .returning();

      logger.info('Bot created successfully', {
        botId: bot.id,
        botName: bot.name,
      });

      return this.mapBotFromDb(bot);
    } catch (error) {
      logger.error('Error creating bot', {
        userId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get bot by ID
   */
  async getBot(botId: string, userId: string, tenantId: string): Promise<Bot | null> {
    try {
      const [bot] = await db
        .select()
        .from(bots)
        .where(and(eq(bots.id, botId), eq(bots.userId, userId), eq(bots.tenantId, tenantId)))
        .limit(1);

      return bot ? this.mapBotFromDb(bot) : null;
    } catch (error) {
      logger.error('Error getting bot', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get all bots for user
   */
  async getBots(userId: string, tenantId: string, filters?: BotQueryFilters): Promise<Bot[]> {
    try {
      let query = db
        .select()
        .from(bots)
        .where(and(eq(bots.userId, userId), eq(bots.tenantId, tenantId)));

      // Apply filters
      const conditions: any[] = [eq(bots.userId, userId), eq(bots.tenantId, tenantId)];

      if (filters?.status) {
        conditions.push(eq(bots.status, filters.status));
      }
      if (filters?.type) {
        conditions.push(eq(bots.type, filters.type));
      }
      if (filters?.exchangeId) {
        conditions.push(eq(bots.exchangeId, filters.exchangeId));
      }
      if (filters?.symbol) {
        conditions.push(eq(bots.symbol, filters.symbol));
      }
      if (filters?.enabled !== undefined) {
        conditions.push(eq(bots.enabled, filters.enabled));
      }
      if (filters?.search) {
        conditions.push(
          or(like(bots.name, `%${filters.search}%`), like(bots.description, `%${filters.search}%`))
        );
      }

      const results = await db
        .select()
        .from(bots)
        .where(and(...conditions))
        .orderBy(desc(bots.createdAt));

      return results.map((bot: any) => this.mapBotFromDb(bot));
    } catch (error) {
      logger.error('Error getting bots', {
        userId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update bot configuration
   */
  async updateBot(botId: string, userId: string, tenantId: string, updates: UpdateBotRequest): Promise<Bot> {
    try {
      logger.info('Updating bot', { botId, userId, tenantId });

      const updateData: any = {
        updatedAt: new Date(),
      };

      // Map update fields
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.allocatedCapital !== undefined) updateData.allocatedCapital = updates.allocatedCapital.toString();
      if (updates.maxDrawdown !== undefined) updateData.maxDrawdown = updates.maxDrawdown.toString();
      if (updates.stopLossPercent !== undefined) updateData.stopLossPercent = updates.stopLossPercent.toString();
      if (updates.takeProfitPercent !== undefined) updateData.takeProfitPercent = updates.takeProfitPercent.toString();
      if (updates.maxPositions !== undefined) updateData.maxPositions = updates.maxPositions.toString();
      if (updates.positionSizing !== undefined) updateData.positionSizing = updates.positionSizing;
      if (updates.positionSizePercent !== undefined) updateData.positionSizePercent = updates.positionSizePercent.toString();
      if (updates.orderType !== undefined) updateData.orderType = updates.orderType;
      if (updates.useTrailingStop !== undefined) updateData.useTrailingStop = updates.useTrailingStop;
      if (updates.trailingStopPercent !== undefined) updateData.trailingStopPercent = updates.trailingStopPercent.toString();
      if (updates.parameters !== undefined) updateData.parameters = updates.parameters;
      if (updates.riskLimits !== undefined) updateData.riskLimits = updates.riskLimits;
      if (updates.notifications !== undefined) updateData.notifications = updates.notifications;
      if (updates.runOnWeekends !== undefined) updateData.runOnWeekends = updates.runOnWeekends;
      if (updates.runOnHolidays !== undefined) updateData.runOnHolidays = updates.runOnHolidays;
      if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
      if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
      if (updates.maxDailyTrades !== undefined) updateData.maxDailyTrades = updates.maxDailyTrades.toString();
      if (updates.cooldownMinutes !== undefined) updateData.cooldownMinutes = updates.cooldownMinutes.toString();
      if (updates.autoRestart !== undefined) updateData.autoRestart = updates.autoRestart;
      if (updates.autoStopOnDrawdown !== undefined) updateData.autoStopOnDrawdown = updates.autoStopOnDrawdown;
      if (updates.autoStopOnLoss !== undefined) updateData.autoStopOnLoss = updates.autoStopOnLoss;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      const [updated] = await db
        .update(bots)
        .set(updateData)
        .where(and(eq(bots.id, botId), eq(bots.userId, userId), eq(bots.tenantId, tenantId)))
        .returning();

      if (!updated) {
        throw new Error('Bot not found or unauthorized');
      }

      logger.info('Bot updated successfully', { botId });
      return this.mapBotFromDb(updated);
    } catch (error) {
      logger.error('Error updating bot', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete bot
   */
  async deleteBot(botId: string, userId: string, tenantId: string): Promise<void> {
    try {
      logger.info('Deleting bot', { botId, userId, tenantId });

      // Check if bot is running
      const bot = await this.getBot(botId, userId, tenantId);
      if (bot?.status === 'running') {
        throw new Error('Cannot delete running bot. Stop the bot first.');
      }

      // Delete bot (cascade will handle related records)
      await db
        .delete(bots)
        .where(and(eq(bots.id, botId), eq(bots.userId, userId), eq(bots.tenantId, tenantId)));

      logger.info('Bot deleted successfully', { botId });
    } catch (error) {
      logger.error('Error deleting bot', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // BOT CONTROL
  // ============================================================================

  /**
   * Start bot execution
   */
  async startBot(botId: string, userId: string, tenantId: string): Promise<BotExecution> {
    try {
      logger.info('Starting bot', { botId, userId, tenantId });

      // Get bot
      const bot = await this.getBot(botId, userId, tenantId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      // Validate bot can start
      if (bot.status === 'running') {
        throw new Error('Bot is already running');
      }
      if (!bot.enabled) {
        throw new Error('Bot is disabled');
      }

      // Get last execution number
      const lastExecution = await db
        .select()
        .from(botExecutions)
        .where(eq(botExecutions.botId, botId))
        .orderBy(desc(botExecutions.executionNumber))
        .limit(1);

      const executionNumber = lastExecution.length > 0 ? Number(lastExecution[0].executionNumber) + 1 : 1;

      // Create new execution
      const [execution] = await db
        .insert(botExecutions)
        .values({
          botId,
          userId,
          tenantId,
          executionNumber: executionNumber.toString(),
          status: 'running',
          startingCapital: bot.currentCapital?.toString() || bot.allocatedCapital.toString(),
          configuration: {
            type: bot.type,
            symbol: bot.symbol,
            timeframe: bot.timeframe,
            parameters: bot.parameters,
          },
          startedAt: new Date(),
        })
        .returning();

      // Update bot status
      await db
        .update(bots)
        .set({
          status: 'running',
          lastExecutionId: execution.id,
          startedAt: new Date(),
          consecutiveErrors: '0',
          updatedAt: new Date(),
        })
        .where(eq(bots.id, botId));

      // Log bot start
      await this.addLog(botId, userId, tenantId, 'info', 'execution', `Bot started - Execution #${executionNumber}`, {
        executionId: execution.id,
        allocatedCapital: bot.allocatedCapital,
      });

      logger.info('Bot started successfully', {
        botId,
        executionId: execution.id,
        executionNumber,
      });

      return this.mapExecutionFromDb(execution);
    } catch (error) {
      logger.error('Error starting bot', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stop bot execution
   */
  async stopBot(botId: string, userId: string, tenantId: string, reason?: string): Promise<void> {
    try {
      logger.info('Stopping bot', { botId, userId, tenantId, reason });

      // Get bot
      const bot = await this.getBot(botId, userId, tenantId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      if (bot.status === 'stopped') {
        logger.warn('Bot already stopped', { botId });
        return;
      }

      // Get current execution
      if (bot.lastExecutionId) {
        const currentExecution = await this.getExecution(bot.lastExecutionId, userId, tenantId);
        if (currentExecution && currentExecution.status === 'running') {
          // Calculate execution metrics
          const durationSeconds = Math.floor(
            (new Date().getTime() - new Date(currentExecution.startedAt).getTime()) / 1000
          );

          // Update execution
          await db
            .update(botExecutions)
            .set({
              status: 'stopped',
              endedAt: new Date(),
              durationSeconds: durationSeconds.toString(),
              endingCapital: bot.currentCapital?.toString() || bot.allocatedCapital.toString(),
              stopReason: reason || 'manual',
              stopDetails: reason,
            })
            .where(eq(botExecutions.id, bot.lastExecutionId));
        }
      }

      // Update bot status
      await db
        .update(bots)
        .set({
          status: 'stopped',
          stoppedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bots.id, botId));

      // Log bot stop
      await this.addLog(botId, userId, tenantId, 'info', 'execution', `Bot stopped - Reason: ${reason || 'manual'}`, {
        stopReason: reason || 'manual',
      });

      logger.info('Bot stopped successfully', { botId });
    } catch (error) {
      logger.error('Error stopping bot', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Pause bot execution
   */
  async pauseBot(botId: string, userId: string, tenantId: string): Promise<void> {
    try {
      logger.info('Pausing bot', { botId, userId, tenantId });

      const bot = await this.getBot(botId, userId, tenantId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      if (bot.status !== 'running') {
        throw new Error('Bot is not running');
      }

      await db
        .update(bots)
        .set({
          status: 'paused',
          updatedAt: new Date(),
        })
        .where(eq(bots.id, botId));

      await this.addLog(botId, userId, tenantId, 'info', 'execution', 'Bot paused');
      logger.info('Bot paused successfully', { botId });
    } catch (error) {
      logger.error('Error pausing bot', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Resume bot execution
   */
  async resumeBot(botId: string, userId: string, tenantId: string): Promise<void> {
    try {
      logger.info('Resuming bot', { botId, userId, tenantId });

      const bot = await this.getBot(botId, userId, tenantId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      if (bot.status !== 'paused') {
        throw new Error('Bot is not paused');
      }

      await db
        .update(bots)
        .set({
          status: 'running',
          updatedAt: new Date(),
        })
        .where(eq(bots.id, botId));

      await this.addLog(botId, userId, tenantId, 'info', 'execution', 'Bot resumed');
      logger.info('Bot resumed successfully', { botId });
    } catch (error) {
      logger.error('Error resuming bot', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Restart bot execution
   */
  async restartBot(botId: string, userId: string, tenantId: string): Promise<BotExecution> {
    try {
      logger.info('Restarting bot', { botId, userId, tenantId });

      // Stop bot if running
      const bot = await this.getBot(botId, userId, tenantId);
      if (bot?.status === 'running' || bot?.status === 'paused') {
        await this.stopBot(botId, userId, tenantId, 'restart');
      }

      // Start bot again
      return await this.startBot(botId, userId, tenantId);
    } catch (error) {
      logger.error('Error restarting bot', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // BOT STATISTICS & MONITORING
  // ============================================================================

  /**
   * Get comprehensive bot statistics
   */
  async getBotStatistics(botId: string, userId: string, tenantId: string): Promise<BotStatistics> {
    try {
      const bot = await this.getBot(botId, userId, tenantId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      const performance = await this.getBotPerformance(botId, userId, tenantId);
      const recentTrades = await this.getTrades(userId, tenantId, { botId, status: 'closed' }, { page: 1, limit: 10 });
      const currentExecution = bot.lastExecutionId
        ? await this.getExecution(bot.lastExecutionId, userId, tenantId)
        : null;

      // Calculate time-based stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayTrades = await this.getTradesInPeriod(botId, userId, tenantId, todayStart, now);
      const weekTrades = await this.getTradesInPeriod(botId, userId, tenantId, weekStart, now);
      const monthTrades = await this.getTradesInPeriod(botId, userId, tenantId, monthStart, now);

      return {
        bot,
        performance,
        recentTrades: recentTrades.data,
        currentExecution: currentExecution || undefined,
        todayStats: {
          tradesExecuted: todayTrades.length,
          profitLoss: todayTrades.reduce((sum, t) => sum + (Number(t.netProfitLoss) || 0), 0),
          profitLossPercent: this.calculateProfitLossPercent(todayTrades, bot.allocatedCapital),
        },
        weekStats: {
          tradesExecuted: weekTrades.length,
          profitLoss: weekTrades.reduce((sum, t) => sum + (Number(t.netProfitLoss) || 0), 0),
          profitLossPercent: this.calculateProfitLossPercent(weekTrades, bot.allocatedCapital),
        },
        monthStats: {
          tradesExecuted: monthTrades.length,
          profitLoss: monthTrades.reduce((sum, t) => sum + (Number(t.netProfitLoss) || 0), 0),
          profitLossPercent: this.calculateProfitLossPercent(monthTrades, bot.allocatedCapital),
        },
      };
    } catch (error) {
      logger.error('Error getting bot statistics', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get bot performance summary
   */
  async getBotPerformance(botId: string, userId: string, tenantId: string): Promise<BotPerformanceSummary> {
    try {
      const bot = await this.getBot(botId, userId, tenantId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      const runningDays = bot.startedAt
        ? Math.floor((new Date().getTime() - new Date(bot.startedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const capitalGrowth = bot.currentCapital
        ? ((bot.currentCapital - bot.allocatedCapital) / bot.allocatedCapital) * 100
        : 0;

      return {
        botId: bot.id,
        botName: bot.name,
        allocatedCapital: bot.allocatedCapital,
        currentCapital: bot.currentCapital || bot.allocatedCapital,
        capitalGrowth,
        totalTrades: bot.totalTrades,
        winningTrades: bot.winningTrades,
        losingTrades: bot.losingTrades,
        winRate: bot.winRate || 0,
        profitFactor: bot.profitFactor || 0,
        totalProfit: bot.totalProfit,
        totalLoss: bot.totalLoss,
        netProfit: bot.netProfit,
        netProfitPercent: (bot.netProfit / bot.allocatedCapital) * 100,
        averageWin: bot.averageWin || 0,
        averageLoss: bot.averageLoss || 0,
        largestWin: bot.largestWin || 0,
        largestLoss: bot.largestLoss || 0,
        currentDrawdown: bot.currentDrawdown,
        maxDrawdownReached: bot.maxDrawdownReached,
        sharpeRatio: bot.sharpeRatio,
        sortinoRatio: bot.sortinoRatio,
        returnOnInvestment: bot.returnOnInvestment || capitalGrowth,
        runningDays,
        lastTradeAt: bot.lastTradeAt,
      };
    } catch (error) {
      logger.error('Error getting bot performance', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get bot health status
   */
  async getBotHealth(botId: string, userId: string, tenantId: string): Promise<BotHealthStatus> {
    try {
      const bot = await this.getBot(botId, userId, tenantId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      const issues: BotHealthStatus['issues'] = [];

      // Check consecutive errors
      if (bot.consecutiveErrors > 3) {
        issues.push({
          severity: 'high',
          category: 'errors',
          message: 'High error rate detected',
          details: `Bot has encountered ${bot.consecutiveErrors} consecutive errors`,
        });
      }

      // Check drawdown
      if (bot.currentDrawdown > bot.maxDrawdown * 0.8) {
        issues.push({
          severity: 'critical',
          category: 'risk',
          message: 'Approaching maximum drawdown limit',
          details: `Current drawdown: ${bot.currentDrawdown.toFixed(2)}%, Max: ${bot.maxDrawdown}%`,
        });
      }

      // Check capital
      const capitalRatio = bot.currentCapital ? bot.currentCapital / bot.allocatedCapital : 1;
      let capitalStatus: 'sufficient' | 'low' | 'depleted' = 'sufficient';
      if (capitalRatio < 0.1) {
        capitalStatus = 'depleted';
        issues.push({
          severity: 'critical',
          category: 'capital',
          message: 'Capital depleted',
          details: 'Bot has lost 90% or more of allocated capital',
        });
      } else if (capitalRatio < 0.5) {
        capitalStatus = 'low';
        issues.push({
          severity: 'medium',
          category: 'capital',
          message: 'Low capital',
          details: 'Bot has lost more than 50% of allocated capital',
        });
      }

      // Check performance
      let performanceStatus: 'good' | 'acceptable' | 'poor' = 'good';
      if (bot.winRate && bot.winRate < 30) {
        performanceStatus = 'poor';
        issues.push({
          severity: 'medium',
          category: 'performance',
          message: 'Low win rate',
          details: `Current win rate: ${bot.winRate.toFixed(2)}%`,
        });
      } else if (bot.winRate && bot.winRate < 45) {
        performanceStatus = 'acceptable';
      }

      const isHealthy = issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length === 0;

      return {
        botId: bot.id,
        status: bot.status,
        isHealthy,
        issues,
        lastHeartbeat: bot.updatedAt,
        consecutiveErrors: bot.consecutiveErrors,
        marketConnection: bot.status === 'running' ? 'connected' : 'disconnected',
        capitalStatus,
        performanceStatus,
      };
    } catch (error) {
      logger.error('Error getting bot health', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update bot performance metrics
   */
  async updateBotPerformance(botId: string, userId: string, tenantId: string): Promise<void> {
    try {
      // Get all closed trades
      const allTrades = await db
        .select()
        .from(botTrades)
        .where(and(eq(botTrades.botId, botId), eq(botTrades.status, 'closed')));

      if (allTrades.length === 0) {
        return;
      }

      // Calculate metrics
      const totalTrades = allTrades.length;
      const winningTrades = allTrades.filter((t: any) => Number(t.netProfitLoss) > 0).length;
      const losingTrades = allTrades.filter((t: any) => Number(t.netProfitLoss) < 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      const totalProfit = allTrades
        .filter((t: any) => Number(t.netProfitLoss) > 0)
        .reduce((sum: number, t: any) => sum + Number(t.netProfitLoss), 0);

      const totalLoss = Math.abs(
        allTrades.filter((t: any) => Number(t.netProfitLoss) < 0).reduce((sum: number, t: any) => sum + Number(t.netProfitLoss), 0)
      );

      const netProfit = totalProfit - totalLoss;
      const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

      const averageWin = winningTrades > 0 ? totalProfit / winningTrades : 0;
      const averageLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;

      const largestWin = Math.max(...allTrades.map((t: any) => Number(t.netProfitLoss) || 0));
      const largestLoss = Math.abs(Math.min(...allTrades.map((t: any) => Number(t.netProfitLoss) || 0)));

      // Update bot
      await db
        .update(bots)
        .set({
          totalTrades: totalTrades.toString(),
          winningTrades: winningTrades.toString(),
          losingTrades: losingTrades.toString(),
          winRate: winRate.toString(),
          totalProfit: totalProfit.toString(),
          totalLoss: totalLoss.toString(),
          netProfit: netProfit.toString(),
          profitFactor: profitFactor.toString(),
          averageWin: averageWin.toString(),
          averageLoss: averageLoss.toString(),
          largestWin: largestWin.toString(),
          largestLoss: largestLoss.toString(),
          updatedAt: new Date(),
        })
        .where(eq(bots.id, botId));

      logger.info('Bot performance metrics updated', { botId });
    } catch (error) {
      logger.error('Error updating bot performance', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // EXECUTIONS
  // ============================================================================

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string, userId: string, tenantId: string): Promise<BotExecution | null> {
    try {
      const [execution] = await db
        .select()
        .from(botExecutions)
        .where(
          and(
            eq(botExecutions.id, executionId),
            eq(botExecutions.userId, userId),
            eq(botExecutions.tenantId, tenantId)
          )
        )
        .limit(1);

      return execution ? this.mapExecutionFromDb(execution) : null;
    } catch (error) {
      logger.error('Error getting execution', {
        executionId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get executions with pagination
   */
  async getExecutions(
    userId: string,
    tenantId: string,
    filters?: ExecutionQueryFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<BotExecution>> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const offset = (page - 1) * limit;

      const conditions: any[] = [eq(botExecutions.userId, userId), eq(botExecutions.tenantId, tenantId)];

      if (filters?.botId) {
        conditions.push(eq(botExecutions.botId, filters.botId));
      }
      if (filters?.status) {
        conditions.push(eq(botExecutions.status, filters.status));
      }
      if (filters?.dateFrom) {
        conditions.push(gte(botExecutions.startedAt, filters.dateFrom));
      }
      if (filters?.dateTo) {
        conditions.push(lte(botExecutions.startedAt, filters.dateTo));
      }

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(botExecutions)
        .where(and(...conditions));

      const total = Number(countResult.count);
      const totalPages = Math.ceil(total / limit);

      const results = await db
        .select()
        .from(botExecutions)
        .where(and(...conditions))
        .orderBy(desc(botExecutions.startedAt))
        .limit(limit)
        .offset(offset);

      return {
        data: results.map((execution: any) => this.mapExecutionFromDb(execution)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error getting executions', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current execution for bot
   */
  async getCurrentExecution(botId: string, userId: string, tenantId: string): Promise<BotExecution | null> {
    try {
      const [execution] = await db
        .select()
        .from(botExecutions)
        .where(
          and(
            eq(botExecutions.botId, botId),
            eq(botExecutions.userId, userId),
            eq(botExecutions.tenantId, tenantId),
            eq(botExecutions.status, 'running')
          )
        )
        .orderBy(desc(botExecutions.startedAt))
        .limit(1);

      return execution ? this.mapExecutionFromDb(execution) : null;
    } catch (error) {
      logger.error('Error getting current execution', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // TRADES
  // ============================================================================

  /**
   * Get trade by ID
   */
  async getTrade(tradeId: string, userId: string, tenantId: string): Promise<BotTrade | null> {
    try {
      const [trade] = await db
        .select()
        .from(botTrades)
        .where(and(eq(botTrades.id, tradeId), eq(botTrades.userId, userId), eq(botTrades.tenantId, tenantId)))
        .limit(1);

      return trade ? this.mapTradeFromDb(trade) : null;
    } catch (error) {
      logger.error('Error getting trade', {
        tradeId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get trades with pagination
   */
  async getTrades(
    userId: string,
    tenantId: string,
    filters?: TradeQueryFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<BotTrade>> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const offset = (page - 1) * limit;

      const conditions: any[] = [eq(botTrades.userId, userId), eq(botTrades.tenantId, tenantId)];

      if (filters?.botId) {
        conditions.push(eq(botTrades.botId, filters.botId));
      }
      if (filters?.executionId) {
        conditions.push(eq(botTrades.executionId, filters.executionId));
      }
      if (filters?.status) {
        conditions.push(eq(botTrades.status, filters.status));
      }
      if (filters?.symbol) {
        conditions.push(eq(botTrades.symbol, filters.symbol));
      }
      if (filters?.side) {
        conditions.push(eq(botTrades.side, filters.side));
      }
      if (filters?.dateFrom) {
        conditions.push(gte(botTrades.openedAt, filters.dateFrom));
      }
      if (filters?.dateTo) {
        conditions.push(lte(botTrades.openedAt, filters.dateTo));
      }

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(botTrades)
        .where(and(...conditions));

      const total = Number(countResult.count);
      const totalPages = Math.ceil(total / limit);

      const results = await db
        .select()
        .from(botTrades)
        .where(and(...conditions))
        .orderBy(desc(botTrades.openedAt))
        .limit(limit)
        .offset(offset);

      return {
        data: results.map((trade: any) => this.mapTradeFromDb(trade)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error getting trades', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get open trades for bot
   */
  async getOpenTrades(botId: string, userId: string, tenantId: string): Promise<BotTrade[]> {
    try {
      const results = await db
        .select()
        .from(botTrades)
        .where(
          and(
            eq(botTrades.botId, botId),
            eq(botTrades.userId, userId),
            eq(botTrades.tenantId, tenantId),
            eq(botTrades.status, 'open')
          )
        )
        .orderBy(desc(botTrades.openedAt));

      return results.map((trade: any) => this.mapTradeFromDb(trade));
    } catch (error) {
      logger.error('Error getting open trades', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // LOGS
  // ============================================================================

  /**
   * Get logs with pagination
   */
  async getLogs(
    userId: string,
    tenantId: string,
    filters?: LogQueryFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<BotLog>> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 100;
      const offset = (page - 1) * limit;

      const conditions: any[] = [eq(botLogs.userId, userId), eq(botLogs.tenantId, tenantId)];

      if (filters?.botId) {
        conditions.push(eq(botLogs.botId, filters.botId));
      }
      if (filters?.executionId) {
        conditions.push(eq(botLogs.executionId, filters.executionId));
      }
      if (filters?.level) {
        conditions.push(eq(botLogs.level, filters.level));
      }
      if (filters?.category) {
        conditions.push(eq(botLogs.category, filters.category));
      }
      if (filters?.dateFrom) {
        conditions.push(gte(botLogs.timestamp, filters.dateFrom));
      }
      if (filters?.dateTo) {
        conditions.push(lte(botLogs.timestamp, filters.dateTo));
      }

      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(botLogs).where(and(...conditions));

      const total = Number(countResult.count);
      const totalPages = Math.ceil(total / limit);

      const results = await db
        .select()
        .from(botLogs)
        .where(and(...conditions))
        .orderBy(desc(botLogs.timestamp))
        .limit(limit)
        .offset(offset);

      return {
        data: results.map((log: any) => this.mapLogFromDb(log)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error getting logs', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Add log entry
   */
  async addLog(
    botId: string,
    userId: string,
    tenantId: string,
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: Record<string, any>
  ): Promise<BotLog> {
    try {
      const [log] = await db
        .insert(botLogs)
        .values({
          botId,
          userId,
          tenantId,
          level,
          category,
          message,
          details,
          timestamp: new Date(),
        })
        .returning();

      return this.mapLogFromDb(log);
    } catch (error) {
      logger.error('Error adding log', {
        botId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  /**
   * Create bot template
   */
  async createTemplate(userId: string, tenantId: string, request: CreateTemplateRequest): Promise<BotTemplate> {
    try {
      logger.info('Creating bot template', { userId, tenantId, templateName: request.name });

      const [template] = await db
        .insert(botTemplates)
        .values({
          userId,
          tenantId,
          name: request.name,
          description: request.description,
          type: request.type,
          category: request.category || 'general',
          isPublic: request.isPublic || false,
          isSystem: false,
          isFeatured: false,
          configuration: request.configuration,
          requiredParameters: request.requiredParameters,
          defaultParameters: request.defaultParameters,
          documentation: request.documentation,
          setupInstructions: request.setupInstructions,
          riskWarning: request.riskWarning,
          tags: request.tags,
        })
        .returning();

      logger.info('Template created successfully', { templateId: template.id });
      return this.mapTemplateFromDb(template);
    } catch (error) {
      logger.error('Error creating template', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<BotTemplate | null> {
    try {
      const [template] = await db.select().from(botTemplates).where(eq(botTemplates.id, templateId)).limit(1);

      return template ? this.mapTemplateFromDb(template) : null;
    } catch (error) {
      logger.error('Error getting template', {
        templateId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get templates with filters
   */
  async getTemplates(filters?: TemplateQueryFilters): Promise<BotTemplate[]> {
    try {
      const conditions: any[] = [];

      if (filters?.type) {
        conditions.push(eq(botTemplates.type, filters.type));
      }
      if (filters?.category) {
        conditions.push(eq(botTemplates.category, filters.category));
      }
      if (filters?.isPublic !== undefined) {
        conditions.push(eq(botTemplates.isPublic, filters.isPublic));
      }
      if (filters?.isSystem !== undefined) {
        conditions.push(eq(botTemplates.isSystem, filters.isSystem));
      }
      if (filters?.isFeatured !== undefined) {
        conditions.push(eq(botTemplates.isFeatured, filters.isFeatured));
      }
      if (filters?.search) {
        conditions.push(
          or(
            like(botTemplates.name, `%${filters.search}%`),
            like(botTemplates.description, `%${filters.search}%`)
          )
        );
      }

      const query = conditions.length > 0 ? db.select().from(botTemplates).where(and(...conditions)) : db.select().from(botTemplates);

      const results = await query.orderBy(desc(botTemplates.isFeatured), desc(botTemplates.createdAt));

      return results.map((template: any) => this.mapTemplateFromDb(template));
    } catch (error) {
      logger.error('Error getting templates', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId: string, userId: string, updates: UpdateTemplateRequest): Promise<BotTemplate> {
    try {
      const updateData: any = { updatedAt: new Date() };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.configuration !== undefined) updateData.configuration = updates.configuration;
      if (updates.requiredParameters !== undefined) updateData.requiredParameters = updates.requiredParameters;
      if (updates.defaultParameters !== undefined) updateData.defaultParameters = updates.defaultParameters;
      if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;
      if (updates.documentation !== undefined) updateData.documentation = updates.documentation;
      if (updates.setupInstructions !== undefined) updateData.setupInstructions = updates.setupInstructions;
      if (updates.riskWarning !== undefined) updateData.riskWarning = updates.riskWarning;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      const [updated] = await db
        .update(botTemplates)
        .set(updateData)
        .where(and(eq(botTemplates.id, templateId), eq(botTemplates.userId, userId)))
        .returning();

      if (!updated) {
        throw new Error('Template not found or unauthorized');
      }

      return this.mapTemplateFromDb(updated);
    } catch (error) {
      logger.error('Error updating template', {
        templateId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    try {
      await db.delete(botTemplates).where(and(eq(botTemplates.id, templateId), eq(botTemplates.userId, userId)));
      logger.info('Template deleted', { templateId });
    } catch (error) {
      logger.error('Error deleting template', {
        templateId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clone bot from template
   */
  async cloneBotFromTemplate(
    templateId: string,
    userId: string,
    tenantId: string,
    overrides: Partial<CreateBotRequest>
  ): Promise<Bot> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      const botRequest: CreateBotRequest = {
        name: overrides.name || `${template.name} - Copy`,
        description: overrides.description || template.description,
        type: template.type,
        templateId: template.id,
        exchangeId: '',
        symbol: '',
        allocatedCapital: 0,
        ...template.configuration,
        ...overrides,
      } as CreateBotRequest;

      return await this.createBot(userId, tenantId, botRequest);
    } catch (error) {
      logger.error('Error cloning bot from template', {
        templateId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate bot configuration
   */
  async validateBotConfiguration(config: CreateBotRequest): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Bot name is required');
    }
    if (!config.type) {
      errors.push('Bot type is required');
    }
    if (!config.exchangeId) {
      errors.push('Exchange ID is required');
    }
    if (!config.symbol) {
      errors.push('Trading symbol is required');
    }
    if (!config.allocatedCapital || config.allocatedCapital <= 0) {
      errors.push('Allocated capital must be greater than 0');
    }

    // Risk validation
    if (config.maxDrawdown && config.maxDrawdown > 50) {
      warnings.push('Max drawdown is very high (>50%). Consider reducing for better risk management.');
    }
    if (config.stopLossPercent && config.stopLossPercent > 10) {
      warnings.push('Stop loss is very wide (>10%). Consider tightening for better risk control.');
    }

    // Position sizing validation
    if (config.positionSizePercent && config.positionSizePercent > 50) {
      warnings.push('Position size is very large (>50% of capital). This increases risk significantly.');
    }
    if (config.maxPositions && config.maxPositions > 10) {
      warnings.push('Managing more than 10 positions simultaneously can be challenging.');
    }

    // Grid bot validation
    if (config.type === 'grid') {
      if (!config.gridLevels || config.gridLevels < 2) {
        errors.push('Grid bot requires at least 2 levels');
      }
      if (!config.gridUpperPrice || !config.gridLowerPrice) {
        errors.push('Grid bot requires upper and lower price bounds');
      }
      if (config.gridUpperPrice && config.gridLowerPrice && config.gridUpperPrice <= config.gridLowerPrice) {
        errors.push('Grid upper price must be greater than lower price');
      }
    }

    // DCA bot validation
    if (config.type === 'dca') {
      if (!config.dcaOrderCount || config.dcaOrderCount < 2) {
        errors.push('DCA bot requires at least 2 orders');
      }
      if (!config.dcaOrderAmount || config.dcaOrderAmount <= 0) {
        errors.push('DCA order amount must be greater than 0');
      }
      if (!config.dcaStepPercent || config.dcaStepPercent <= 0) {
        errors.push('DCA step percent must be greater than 0');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get trades in period
   */
  private async getTradesInPeriod(
    botId: string,
    userId: string,
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<BotTrade[]> {
    const results = await db
      .select()
      .from(botTrades)
      .where(
        and(
          eq(botTrades.botId, botId),
          eq(botTrades.userId, userId),
          eq(botTrades.tenantId, tenantId),
          eq(botTrades.status, 'closed'),
          gte(botTrades.closedAt, from),
          lte(botTrades.closedAt, to)
        )
      );

    return results.map((trade: any) => this.mapTradeFromDb(trade));
  }

  /**
   * Calculate profit/loss percentage
   */
  private calculateProfitLossPercent(trades: BotTrade[], allocatedCapital: number): number {
    if (trades.length === 0 || allocatedCapital === 0) return 0;
    const totalPL = trades.reduce((sum, t) => sum + (Number(t.netProfitLoss) || 0), 0);
    return (totalPL / allocatedCapital) * 100;
  }

  /**
   * Map database bot to domain model
   */
  private mapBotFromDb(bot: any): Bot {
    return {
      id: bot.id,
      userId: bot.userId,
      tenantId: bot.tenantId,
      name: bot.name,
      description: bot.description,
      type: bot.type,
      status: bot.status,
      strategyId: bot.strategyId,
      templateId: bot.templateId,
      exchangeId: bot.exchangeId,
      symbol: bot.symbol,
      timeframe: bot.timeframe,
      allocatedCapital: Number(bot.allocatedCapital),
      currentCapital: bot.currentCapital ? Number(bot.currentCapital) : undefined,
      maxDrawdown: Number(bot.maxDrawdown),
      stopLossPercent: Number(bot.stopLossPercent),
      takeProfitPercent: Number(bot.takeProfitPercent),
      maxPositions: Number(bot.maxPositions),
      positionSizing: bot.positionSizing,
      positionSizePercent: Number(bot.positionSizePercent),
      orderType: bot.orderType,
      useTrailingStop: bot.useTrailingStop,
      trailingStopPercent: Number(bot.trailingStopPercent),
      gridLevels: bot.gridLevels ? Number(bot.gridLevels) : undefined,
      gridUpperPrice: bot.gridUpperPrice ? Number(bot.gridUpperPrice) : undefined,
      gridLowerPrice: bot.gridLowerPrice ? Number(bot.gridLowerPrice) : undefined,
      gridProfitPercent: bot.gridProfitPercent ? Number(bot.gridProfitPercent) : undefined,
      dcaOrderCount: bot.dcaOrderCount ? Number(bot.dcaOrderCount) : undefined,
      dcaOrderAmount: bot.dcaOrderAmount ? Number(bot.dcaOrderAmount) : undefined,
      dcaStepPercent: bot.dcaStepPercent ? Number(bot.dcaStepPercent) : undefined,
      dcaTakeProfitPercent: bot.dcaTakeProfitPercent ? Number(bot.dcaTakeProfitPercent) : undefined,
      parameters: bot.parameters,
      riskLimits: bot.riskLimits,
      notifications: bot.notifications,
      runOnWeekends: bot.runOnWeekends,
      runOnHolidays: bot.runOnHolidays,
      startTime: bot.startTime,
      endTime: bot.endTime,
      maxDailyTrades: bot.maxDailyTrades ? Number(bot.maxDailyTrades) : undefined,
      cooldownMinutes: Number(bot.cooldownMinutes),
      totalTrades: Number(bot.totalTrades),
      winningTrades: Number(bot.winningTrades),
      losingTrades: Number(bot.losingTrades),
      totalProfit: Number(bot.totalProfit),
      totalLoss: Number(bot.totalLoss),
      netProfit: Number(bot.netProfit),
      profitFactor: bot.profitFactor ? Number(bot.profitFactor) : undefined,
      winRate: bot.winRate ? Number(bot.winRate) : undefined,
      averageWin: bot.averageWin ? Number(bot.averageWin) : undefined,
      averageLoss: bot.averageLoss ? Number(bot.averageLoss) : undefined,
      largestWin: bot.largestWin ? Number(bot.largestWin) : undefined,
      largestLoss: bot.largestLoss ? Number(bot.largestLoss) : undefined,
      currentDrawdown: Number(bot.currentDrawdown),
      maxDrawdownReached: Number(bot.maxDrawdownReached),
      sharpeRatio: bot.sharpeRatio ? Number(bot.sharpeRatio) : undefined,
      sortinoRatio: bot.sortinoRatio ? Number(bot.sortinoRatio) : undefined,
      returnOnInvestment: bot.returnOnInvestment ? Number(bot.returnOnInvestment) : undefined,
      lastExecutionId: bot.lastExecutionId,
      lastTradeAt: bot.lastTradeAt,
      lastErrorAt: bot.lastErrorAt,
      lastErrorMessage: bot.lastErrorMessage,
      consecutiveErrors: Number(bot.consecutiveErrors),
      autoRestart: bot.autoRestart,
      autoStopOnDrawdown: bot.autoStopOnDrawdown,
      autoStopOnLoss: bot.autoStopOnLoss,
      enabled: bot.enabled,
      version: Number(bot.version),
      backtestId: bot.backtestId,
      notes: bot.notes,
      tags: bot.tags,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt,
      startedAt: bot.startedAt,
      stoppedAt: bot.stoppedAt,
    };
  }

  /**
   * Map database execution to domain model
   */
  private mapExecutionFromDb(execution: any): BotExecution {
    return {
      id: execution.id,
      botId: execution.botId,
      userId: execution.userId,
      tenantId: execution.tenantId,
      executionNumber: Number(execution.executionNumber),
      status: execution.status,
      startingCapital: Number(execution.startingCapital),
      endingCapital: execution.endingCapital ? Number(execution.endingCapital) : undefined,
      profitLoss: Number(execution.profitLoss),
      profitLossPercent: Number(execution.profitLossPercent),
      tradesExecuted: Number(execution.tradesExecuted),
      tradesWon: Number(execution.tradesWon),
      tradesLost: Number(execution.tradesLost),
      winRate: execution.winRate ? Number(execution.winRate) : undefined,
      errorsEncountered: Number(execution.errorsEncountered),
      warningsEncountered: Number(execution.warningsEncountered),
      lastError: execution.lastError,
      configuration: execution.configuration,
      marketConditions: execution.marketConditions,
      startedAt: execution.startedAt,
      endedAt: execution.endedAt,
      durationSeconds: execution.durationSeconds ? Number(execution.durationSeconds) : undefined,
      stopReason: execution.stopReason,
      stopDetails: execution.stopDetails,
      createdAt: execution.createdAt,
    };
  }

  /**
   * Map database trade to domain model
   */
  private mapTradeFromDb(trade: any): BotTrade {
    return {
      id: trade.id,
      botId: trade.botId,
      executionId: trade.executionId,
      userId: trade.userId,
      tenantId: trade.tenantId,
      orderId: trade.orderId,
      positionId: trade.positionId,
      exchangeOrderId: trade.exchangeOrderId,
      symbol: trade.symbol,
      side: trade.side,
      type: trade.type,
      quantity: Number(trade.quantity),
      entryPrice: Number(trade.entryPrice),
      exitPrice: trade.exitPrice ? Number(trade.exitPrice) : undefined,
      averagePrice: trade.averagePrice ? Number(trade.averagePrice) : undefined,
      stopLoss: trade.stopLoss ? Number(trade.stopLoss) : undefined,
      takeProfit: trade.takeProfit ? Number(trade.takeProfit) : undefined,
      trailingStop: trade.trailingStop ? Number(trade.trailingStop) : undefined,
      status: trade.status,
      profitLoss: trade.profitLoss ? Number(trade.profitLoss) : undefined,
      profitLossPercent: trade.profitLossPercent ? Number(trade.profitLossPercent) : undefined,
      fees: Number(trade.fees),
      netProfitLoss: trade.netProfitLoss ? Number(trade.netProfitLoss) : undefined,
      gridLevel: trade.gridLevel ? Number(trade.gridLevel) : undefined,
      dcaLevel: trade.dcaLevel ? Number(trade.dcaLevel) : undefined,
      signalType: trade.signalType,
      signalStrength: trade.signalStrength ? Number(trade.signalStrength) : undefined,
      strategySnapshot: trade.strategySnapshot,
      openedAt: trade.openedAt,
      closedAt: trade.closedAt,
      durationMinutes: trade.durationMinutes ? Number(trade.durationMinutes) : undefined,
      closeReason: trade.closeReason,
      closeDetails: trade.closeDetails,
      riskRewardRatio: trade.riskRewardRatio ? Number(trade.riskRewardRatio) : undefined,
      maxDrawdownPercent: trade.maxDrawdownPercent ? Number(trade.maxDrawdownPercent) : undefined,
      maxProfitPercent: trade.maxProfitPercent ? Number(trade.maxProfitPercent) : undefined,
      notes: trade.notes,
      createdAt: trade.createdAt,
      updatedAt: trade.updatedAt,
    };
  }

  /**
   * Map database log to domain model
   */
  private mapLogFromDb(log: any): BotLog {
    return {
      id: log.id,
      botId: log.botId,
      executionId: log.executionId,
      userId: log.userId,
      tenantId: log.tenantId,
      level: log.level,
      category: log.category,
      message: log.message,
      details: log.details,
      tradeId: log.tradeId,
      orderId: log.orderId,
      errorCode: log.errorCode,
      errorStack: log.errorStack,
      timestamp: log.timestamp,
      createdAt: log.createdAt,
    };
  }

  /**
   * Map database template to domain model
   */
  private mapTemplateFromDb(template: any): BotTemplate {
    return {
      id: template.id,
      userId: template.userId,
      tenantId: template.tenantId,
      name: template.name,
      description: template.description,
      type: template.type,
      category: template.category,
      isPublic: template.isPublic,
      isSystem: template.isSystem,
      isFeatured: template.isFeatured,
      configuration: template.configuration,
      requiredParameters: template.requiredParameters,
      defaultParameters: template.defaultParameters,
      backtestResults: template.backtestResults,
      expectedReturn: template.expectedReturn ? Number(template.expectedReturn) : undefined,
      expectedRisk: template.expectedRisk ? Number(template.expectedRisk) : undefined,
      minimumCapital: template.minimumCapital ? Number(template.minimumCapital) : undefined,
      recommendedCapital: template.recommendedCapital ? Number(template.recommendedCapital) : undefined,
      supportedExchanges: template.supportedExchanges,
      supportedSymbols: template.supportedSymbols,
      supportedTimeframes: template.supportedTimeframes,
      timesUsed: Number(template.timesUsed),
      averageRating: template.averageRating ? Number(template.averageRating) : undefined,
      totalRatings: Number(template.totalRatings),
      documentation: template.documentation,
      setupInstructions: template.setupInstructions,
      riskWarning: template.riskWarning,
      version: template.version,
      tags: template.tags,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}

// Export singleton instance
export const botService = new BotService();
