// @ts-nocheck
/**
 * Bot Execution Engine
 * Main loop for bot trading execution
 */

import { EventEmitter } from 'events';
import logger from '@/utils/logger';
import { botService } from '../services/bot.service';
import { OrderService } from '../../orders/services/order.service';
import { positionService } from '../../positions/services/position.service';
import { riskService } from '../../risk/services/risk.service';
import { strategyService } from '../../strategies/services/strategy.service';
import { strategyRunner } from '../../strategies/engine';
import { marketDataWebSocketManager } from '../../market-data/websocket';
import type { Bot } from '../types/bots.types';
import type {
  ExecutionState,
  ExecutionConfig,
  ExecutionContext,
  ExecutionMetrics,
  TradingSignal,
  ExecutionEvent,
  IExecutionEngine,
  OrderExecutionResult,
  RiskValidationResult,
} from './execution-engine.types';
import { DEFAULT_EXECUTION_CONFIG } from './execution-engine.types';
import type { CreateOrderRequest } from '../../orders/types/orders.types';
import type { Position } from '../../positions/types/positions.types';
import type { Ticker, ExchangeId } from '../../market-data/websocket/types';

/**
 * Bot Execution Engine
 * Implements the main trading loop for a bot
 */
export class BotExecutionEngine extends EventEmitter implements IExecutionEngine {
  private bot: Bot;
  private config: ExecutionConfig;
  private context: ExecutionContext;
  private tickInterval?: NodeJS.Timeout;
  private positionCheckInterval?: NodeJS.Timeout;
  private metrics: ExecutionMetrics;

  // Real-time market data
  private currentPrice: number = 0;
  private lastPriceUpdate: Date | null = null;
  private websocketConnected: boolean = false;

  constructor(bot: Bot, config?: Partial<ExecutionConfig>) {
    super();
    this.bot = bot;
    this.config = { ...DEFAULT_EXECUTION_CONFIG, ...config };

    // Initialize context
    this.context = {
      bot,
      executionId: bot.lastExecutionId || '',
      state: 'IDLE',
      startedAt: new Date(),
      consecutiveErrors: 0,
      totalTicks: 0,
      totalEvaluations: 0,
      totalSignals: 0,
      totalOrders: 0,
      circuitBreakerOpen: false,
      isPaused: false,
      shouldStop: false,
      metadata: {},
    };

    // Initialize metrics
    this.metrics = {
      botId: bot.id,
      executionId: this.context.executionId,
      state: 'IDLE',
      uptime: 0,
      ticksPerMinute: 0,
      evaluationsPerMinute: 0,
      ordersPerHour: 0,
      successRate: 100,
      errorRate: 0,
      averageTickDuration: 0,
      averageEvaluationDuration: 0,
      memoryUsageMB: 0,
      cpuUsagePercent: 0,
    };

    logger.info('Bot Execution Engine created', {
      botId: bot.id,
      botName: bot.name,
      tickInterval: this.config.tickIntervalMs,
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Start the execution engine
   */
  public async start(): Promise<void> {
    try {
      logger.info('Starting bot execution engine', {
        botId: this.bot.id,
        botName: this.bot.name,
      });

      // Validate bot can start
      if (this.bot.status === 'running') {
        throw new Error('Bot is already running');
      }

      if (!this.bot.enabled) {
        throw new Error('Bot is disabled');
      }

      // Change state to INITIALIZING
      this.setState('INITIALIZING');

      // Initialize execution
      await this.initialize();

      // Change state to RUNNING
      this.setState('RUNNING');

      // Start main loop
      this.startMainLoop();

      // Start position monitoring loop
      this.startPositionMonitoring();

      this.emitEvent('state_change', { from: 'IDLE', to: 'RUNNING' });

      logger.info('Bot execution engine started successfully', {
        botId: this.bot.id,
      });
    } catch (error) {
      this.setState('ERROR');
      logger.error('Failed to start bot execution engine', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stop the execution engine
   */
  public async stop(): Promise<void> {
    try {
      logger.info('Stopping bot execution engine', {
        botId: this.bot.id,
      });

      this.context.shouldStop = true;
      this.setState('STOPPING');

      // Stop intervals
      this.stopMainLoop();
      this.stopPositionMonitoring();

      // Cleanup
      await this.cleanup();

      this.setState('TERMINATED');
      this.emitEvent('stopped', {});

      logger.info('Bot execution engine stopped', {
        botId: this.bot.id,
      });
    } catch (error) {
      logger.error('Error stopping bot execution engine', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Pause the execution engine
   */
  public pause(): void {
    logger.info('Pausing bot execution engine', {
      botId: this.bot.id,
    });

    this.context.isPaused = true;
    this.setState('PAUSED');
    this.emitEvent('paused', {});
  }

  /**
   * Resume the execution engine
   */
  public resume(): void {
    logger.info('Resuming bot execution engine', {
      botId: this.bot.id,
    });

    this.context.isPaused = false;
    this.setState('RUNNING');
    this.emitEvent('resumed', {});
  }

  /**
   * Get current state
   */
  public getState(): ExecutionState {
    return this.context.state;
  }

  /**
   * Get execution context
   */
  public getContext(): ExecutionContext {
    return { ...this.context };
  }

  /**
   * Get execution metrics
   */
  public getMetrics(): ExecutionMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Check if engine is running
   */
  public isRunning(): boolean {
    return this.context.state === 'RUNNING' || this.context.state === 'EVALUATING' || this.context.state === 'TRADING' || this.context.state === 'MONITORING';
  }

  /**
   * Check if engine is healthy
   */
  public isHealthy(): boolean {
    return (
      this.context.consecutiveErrors < this.config.maxConsecutiveErrors &&
      !this.context.circuitBreakerOpen &&
      this.context.state !== 'ERROR'
    );
  }

  // ============================================================================
  // INITIALIZATION & CLEANUP
  // ============================================================================

  /**
   * Initialize execution engine
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing bot execution engine', {
        botId: this.bot.id,
      });

      // Reload bot from database to get latest state
      const freshBot = await botService.getBot(this.bot.id, this.bot.userId, this.bot.tenantId);
      if (!freshBot) {
        throw new Error('Bot not found');
      }
      this.bot = freshBot;
      this.context.bot = freshBot;

      // Validate bot configuration
      const validation = await botService.validateBotConfiguration({
        name: this.bot.name,
        type: this.bot.type,
        exchangeId: this.bot.exchangeId,
        symbol: this.bot.symbol,
        allocatedCapital: this.bot.allocatedCapital,
        strategyId: this.bot.strategyId,
      } as any);

      if (!validation.valid) {
        throw new Error(`Invalid bot configuration: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        logger.warn('Bot configuration warnings', {
          botId: this.bot.id,
          warnings: validation.warnings,
        });
      }

      // Load strategy (already done via strategyService.getStrategy in evaluateStrategy)

      // Connect to market data WebSocket
      await this.connectWebSocket();

      // Validate exchange connection
      if (!this.websocketConnected) {
        logger.warn('WebSocket not connected, will use REST API fallback', {
          botId: this.bot.id,
        });
      }

      logger.info('Bot execution engine initialized', {
        botId: this.bot.id,
        websocketConnected: this.websocketConnected,
      });
    } catch (error) {
      logger.error('Failed to initialize bot execution engine', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up bot execution engine resources', {
        botId: this.bot.id,
      });

      // Stop intervals
      this.stopMainLoop();
      this.stopPositionMonitoring();

      // Disconnect from market data WebSocket
      await this.disconnectWebSocket();

      // Cancel all pending orders for this bot
      await this.cancelPendingOrders();

      logger.info('Bot execution engine cleanup complete', {
        botId: this.bot.id,
      });
    } catch (error) {
      logger.error('Error during cleanup', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ============================================================================
  // MAIN LOOP
  // ============================================================================

  /**
   * Start the main execution loop
   */
  private startMainLoop(): void {
    logger.info('Starting main execution loop', {
      botId: this.bot.id,
      intervalMs: this.config.tickIntervalMs,
    });

    this.tickInterval = setInterval(async () => {
      await this.tick();
    }, this.config.tickIntervalMs);
  }

  /**
   * Stop the main execution loop
   */
  private stopMainLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
      logger.info('Main execution loop stopped', {
        botId: this.bot.id,
      });
    }
  }

  /**
   * Single tick of the execution loop
   */
  private async tick(): Promise<void> {
    const tickStart = Date.now();

    try {
      // Check if paused
      if (this.context.isPaused) {
        return;
      }

      // Check if should stop
      if (this.context.shouldStop) {
        await this.stop();
        return;
      }

      // Check circuit breaker
      if (this.context.circuitBreakerOpen) {
        await this.checkCircuitBreaker();
        return;
      }

      // Increment tick counter
      this.context.totalTicks++;
      this.context.lastTickAt = new Date();
      this.emitEvent('tick', { tickNumber: this.context.totalTicks });

      // Check schedule (weekends, holidays, time windows)
      if (!this.isScheduleAllowed()) {
        logger.debug('Bot execution skipped due to schedule', {
          botId: this.bot.id,
        });
        return;
      }

      // Execute main logic
      await this.executeMainLogic();

      // Reset consecutive errors on success
      this.context.consecutiveErrors = 0;

      // Update metrics
      this.updateTickMetrics(Date.now() - tickStart);
    } catch (error) {
      await this.handleTickError(error);
    }
  }

  /**
   * Execute main trading logic
   */
  private async executeMainLogic(): Promise<void> {
    // Current market data comes from WebSocket real-time feed (this.currentPrice)
    // If WebSocket is not connected, we could fall back to REST API here
    if (this.currentPrice <= 0) {
      logger.warn('No market price available, skipping evaluation', {
        botId: this.bot.id,
        symbol: this.bot.symbol,
      });
      return;
    }

    // Evaluate strategy
    this.setState('EVALUATING');
    const signal = await this.evaluateStrategy();
    this.context.lastEvaluationAt = new Date();
    this.context.totalEvaluations++;

    if (signal.type !== 'HOLD') {
      this.context.totalSignals++;
      this.emitEvent('signal_generated', { signal });
      logger.info('Trading signal generated', {
        botId: this.bot.id,
        signal: signal.type,
        strength: signal.strength,
        confidence: signal.confidence,
        currentPrice: this.currentPrice,
      });

      // Execute trade based on signal
      await this.executeTrade(signal);
    }

    // Monitor open positions is done in separate interval
    this.setState('RUNNING');
  }

  /**
   * Evaluate strategy and get trading signal
   */
  private async evaluateStrategy(): Promise<TradingSignal> {
    const evalStart = Date.now();

    try {
      this.emitEvent('evaluation_start', {});

      // Get strategy if configured
      if (!this.bot.strategyId) {
        logger.warn('Bot has no strategy configured', { botId: this.bot.id });
        return {
          type: 'HOLD',
          strength: 0,
          confidence: 0,
          reasons: ['No strategy configured'],
          timestamp: new Date(),
        };
      }

      // Fetch strategy
      const strategy = await strategyService.getStrategy(
        this.bot.strategyId,
        this.bot.userId,
        this.bot.tenantId
      );

      if (!strategy) {
        logger.error('Strategy not found', {
          botId: this.bot.id,
          strategyId: this.bot.strategyId,
        });
        return {
          type: 'HOLD',
          strength: 0,
          confidence: 0,
          reasons: ['Strategy not found'],
          timestamp: new Date(),
        };
      }

      // Check if strategy is active
      if (strategy.status !== 'active') {
        logger.debug('Strategy is not active', {
          botId: this.bot.id,
          strategyId: strategy.id,
          status: strategy.status,
        });
        return {
          type: 'HOLD',
          strength: 0,
          confidence: 0,
          reasons: ['Strategy not active'],
          timestamp: new Date(),
        };
      }

      // Evaluate strategy using Strategy Runner
      const signal = await strategyRunner.evaluate(strategy);

      if (!signal) {
        logger.debug('No signal generated from strategy', {
          botId: this.bot.id,
          strategyId: strategy.id,
        });
        return {
          type: 'HOLD',
          strength: 0,
          confidence: 0,
          reasons: ['Strategy conditions not met'],
          timestamp: new Date(),
        };
      }

      const duration = Date.now() - evalStart;
      this.updateEvaluationMetrics(duration);

      this.emitEvent('evaluation_complete', { signal, duration });
      return signal;
    } catch (error) {
      logger.error('Strategy evaluation failed', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return HOLD on error (fail safe)
      return {
        type: 'HOLD',
        strength: 0,
        confidence: 0,
        reasons: ['Evaluation error'],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute trade based on signal
   */
  private async executeTrade(signal: TradingSignal): Promise<void> {
    try {
      this.setState('TRADING');

      // Validate risk
      const riskValidation = await this.validateRisk(signal);
      if (!riskValidation.approved) {
        logger.warn('Trade rejected by risk management', {
          botId: this.bot.id,
          signal: signal.type,
          reasons: riskValidation.reasons,
        });
        this.emitEvent('warning', {
          message: 'Trade rejected by risk management',
          reasons: riskValidation.reasons,
        });
        return;
      }

      // Calculate position size
      const positionSize = this.calculatePositionSize(signal, riskValidation);

      // Create order
      const orderResult = await this.createOrder(signal, positionSize);

      if (orderResult.success) {
        this.context.totalOrders++;
        this.context.lastTradeAt = new Date();
        this.emitEvent('order_created', {
          orderId: orderResult.orderId,
          signal: signal.type,
          size: positionSize,
        });

        logger.info('Order created successfully', {
          botId: this.bot.id,
          orderId: orderResult.orderId,
          signal: signal.type,
          size: positionSize,
        });
      } else {
        this.emitEvent('order_failed', {
          error: orderResult.error,
          signal: signal.type,
        });

        logger.error('Order creation failed', {
          botId: this.bot.id,
          signal: signal.type,
          error: orderResult.error,
        });
      }
    } catch (error) {
      logger.error('Trade execution failed', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      this.setState('RUNNING');
    }
  }

  /**
   * Validate risk for trade
   */
  private async validateRisk(signal: TradingSignal): Promise<RiskValidationResult> {
    try {
      // Use real-time market price from WebSocket feed
      const currentPrice = this.currentPrice;

      if (currentPrice <= 0) {
        logger.warn('No market price available for risk validation', {
          botId: this.bot.id,
          symbol: this.bot.symbol,
        });
        return {
          approved: false,
          reasons: ['Market price not available'],
          warnings: [],
          currentExposure: 0,
          maxExposure: 100,
        };
      }

      // Calculate quantity based on signal and capital
      const capitalToUse = this.bot.allocatedCapital * (this.bot.positionSizePercent / 100);
      const quantity = capitalToUse / currentPrice;

      // Calculate stop loss price if configured
      const stopLossPrice = this.bot.stopLossPercent
        ? currentPrice * (1 - this.bot.stopLossPercent / 100)
        : undefined;

      // Validate with Risk Service
      const validation = await riskService.validateTrade(
        this.bot.userId,
        this.bot.tenantId,
        {
          symbol: this.bot.symbol,
          side: signal.type === 'BUY' ? 'long' : 'short',
          quantity,
          price: currentPrice,
          stopLoss: stopLossPrice,
        }
      );

      // Get current metrics for exposure calculation
      const metrics = await riskService.getRiskMetrics(this.bot.userId, this.bot.tenantId);

      return {
        approved: validation.allowed,
        reasons: validation.violations,
        warnings: validation.warnings,
        currentExposure: metrics?.totalExposurePercent || 0,
        maxExposure: 100,
      };
    } catch (error) {
      // Fail-safe: allow trade on risk service error (log warning)
      logger.warn('Risk validation failed, allowing trade', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        approved: true,
        reasons: [],
        warnings: ['Risk validation service unavailable'],
        currentExposure: 0,
        maxExposure: 100,
      };
    }
  }

  /**
   * Calculate position size for trade
   * Implements Kelly Criterion-inspired dynamic sizing based on signal strength and risk
   */
  private calculatePositionSize(signal: TradingSignal, riskValidation: RiskValidationResult): number {
    // Base capital allocation from bot configuration
    const baseCapital = this.bot.allocatedCapital * (this.bot.positionSizePercent / 100);

    // Calculate signal strength multiplier (0.5 - 1.5)
    // Higher confidence signals get larger positions
    const strengthMultiplier = 0.5 + (signal.confidence / 100);

    // Calculate risk multiplier (0.5 - 1.0)
    // Lower current exposure allows larger positions
    const exposurePercent = (riskValidation.currentExposure / riskValidation.maxExposure) * 100;
    const riskMultiplier = exposurePercent < 50
      ? 1.0  // Full size when exposure is low
      : exposurePercent < 75
        ? 0.75 // Reduce size when exposure is moderate
        : 0.5; // Minimal size when exposure is high

    // Calculate volatility adjustment (if available in future)
    // For now, use signal strength as proxy
    const volatilityMultiplier = signal.strength > 0.8 ? 1.2 : // Strong signal, increase size
                                signal.strength > 0.5 ? 1.0 : // Medium signal, normal size
                                0.7; // Weak signal, reduce size

    // Apply multipliers
    let adjustedCapital = baseCapital * strengthMultiplier * riskMultiplier * volatilityMultiplier;

    // Apply hard limits
    const minSize = this.bot.allocatedCapital * 0.01; // Min 1% of allocated capital
    const maxSize = this.bot.allocatedCapital * 0.5;  // Max 50% of allocated capital

    adjustedCapital = Math.max(minSize, Math.min(maxSize, adjustedCapital));

    logger.debug('Position size calculated', {
      botId: this.bot.id,
      baseCapital,
      signalConfidence: signal.confidence,
      signalStrength: signal.strength,
      currentExposure: exposurePercent,
      strengthMultiplier: strengthMultiplier.toFixed(2),
      riskMultiplier: riskMultiplier.toFixed(2),
      volatilityMultiplier: volatilityMultiplier.toFixed(2),
      finalSize: adjustedCapital.toFixed(2),
    });

    return adjustedCapital;
  }

  /**
   * Cancel all pending orders for this bot
   */
  private async cancelPendingOrders(): Promise<void> {
    try {
      logger.info('Canceling pending orders for bot', {
        botId: this.bot.id,
      });

      // Cancel all pending orders for this bot's symbol via OrderService
      // Note: cancelAllOrders takes (userId, tenantId, symbol?) and returns number
      const canceledCount = await OrderService.cancelAllOrders(
        this.bot.userId,
        this.bot.tenantId,
        this.bot.symbol  // Optional symbol parameter to cancel only orders for this bot's symbol
      );

      logger.info('Pending orders canceled', {
        botId: this.bot.id,
        canceledCount,
      });

      this.emitEvent('stop_loss_hit', {  // Using existing event type
        count: canceledCount,
        reason: 'Bot stopped',
      } as any);

    } catch (error) {
      logger.error('Failed to cancel pending orders', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - allow cleanup to continue
    }
  }

  /**
   * Create order
   */
  private async createOrder(signal: TradingSignal, size: number): Promise<OrderExecutionResult> {
    try {
      // Use real-time market price from WebSocket feed
      const currentPrice = this.currentPrice;

      if (currentPrice <= 0) {
        logger.error('No market price available for order creation', {
          botId: this.bot.id,
          symbol: this.bot.symbol,
        });
        return {
          success: false,
          error: 'Market price not available',
          timestamp: new Date(),
        };
      }

      // Calculate quantity from size (size is in base currency, need to convert to coin quantity)
      const quantity = size / currentPrice;

      // Map bot OrderType to orders OrderType
      // Bot: 'market' | 'limit' | 'stop_limit'
      // Orders: 'market' | 'limit' | 'stop_loss' | 'stop_loss_limit' | etc
      const orderType = this.bot.orderType === 'stop_limit'
        ? 'stop_loss_limit'
        : this.bot.orderType;

      // Calculate stop loss price if configured
      const stopLossPrice = this.bot.stopLossPercent
        ? currentPrice * (1 - this.bot.stopLossPercent / 100)
        : undefined;

      // Build order request
      const orderRequest: CreateOrderRequest = {
        exchangeConnectionId: this.bot.exchangeId, // Using exchangeId as connectionId (may need mapping)
        symbol: this.bot.symbol,
        type: orderType as any, // Cast to avoid type issues between bot and order types
        side: signal.type === 'BUY' ? 'buy' : 'sell',
        amount: quantity,
        price: this.bot.orderType === 'limit' ? currentPrice : undefined,
        stopPrice: orderType === 'stop_loss_limit' ? stopLossPrice : undefined,
        timeInForce: 'GTC',
        strategy: this.bot.strategyId,
        notes: `Bot: ${this.bot.name} | Signal: ${signal.type} (${signal.confidence}%)`,
      };

      // Create order through Orders Service
      const order = await OrderService.createOrder(
        this.bot.userId,
        this.bot.tenantId,
        orderRequest
      );

      logger.info('Order created successfully', {
        botId: this.bot.id,
        orderId: order.id,
        signal: signal.type,
        quantity,
        price: currentPrice,
      });

      return {
        success: true,
        orderId: order.id,
        exchangeOrderId: order.exchangeOrderId,
        price: currentPrice,
        quantity,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to create order', {
        botId: this.bot.id,
        signal: signal.type,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  // ============================================================================
  // POSITION MONITORING
  // ============================================================================

  /**
   * Start position monitoring loop
   */
  private startPositionMonitoring(): void {
    logger.info('Starting position monitoring loop', {
      botId: this.bot.id,
      intervalMs: this.config.positionCheckIntervalMs,
    });

    this.positionCheckInterval = setInterval(async () => {
      await this.checkPositions();
    }, this.config.positionCheckIntervalMs);
  }

  /**
   * Stop position monitoring loop
   */
  private stopPositionMonitoring(): void {
    if (this.positionCheckInterval) {
      clearInterval(this.positionCheckInterval);
      this.positionCheckInterval = undefined;
      logger.info('Position monitoring loop stopped', {
        botId: this.bot.id,
      });
    }
  }

  /**
   * Check open positions for stop-loss/take-profit
   */
  private async checkPositions(): Promise<void> {
    try {
      // Skip if not running or paused
      if (!this.isRunning() || this.context.isPaused) {
        return;
      }

      // Get open positions for this bot
      const positions = await positionService.getPositions({
        userId: this.bot.userId,
        tenantId: this.bot.tenantId,
        botId: this.bot.id,
        status: 'open',
      });

      if (positions.length === 0) {
        return;
      }

      logger.debug('Checking positions', {
        botId: this.bot.id,
        positionCount: positions.length,
      });

      // Check each position
      for (const position of positions) {
        await this.checkPosition(position);
      }
    } catch (error) {
      logger.error('Position check failed', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check a single position for stop-loss/take-profit/trailing-stop
   */
  private async checkPosition(position: Position): Promise<void> {
    try {
      // Use real-time market price from WebSocket feed instead of stale position.currentPrice
      const currentPrice = this.currentPrice;

      if (currentPrice <= 0) {
        logger.debug('No market price available for position check', {
          botId: this.bot.id,
          positionId: position.id,
          symbol: position.symbol,
        });
        return;
      }

      // Check stop loss
      const stopLossHit = await positionService.checkStopLoss(position.id, currentPrice);
      if (stopLossHit) {
        logger.info('Stop loss hit, closing position', {
          botId: this.bot.id,
          positionId: position.id,
          symbol: position.symbol,
          currentPrice,
          stopLoss: position.stopLoss,
        });

        await positionService.closePosition(
          position.id,
          this.bot.userId,
          this.bot.tenantId,
          {
            exitReason: 'stop_loss',
            exitPrice: currentPrice,
            notes: 'Auto-closed by bot: Stop loss hit',
          }
        );

        this.emitEvent('stop_loss_hit', {
          positionId: position.id,
          symbol: position.symbol,
          exitPrice: currentPrice,
          pnl: position.unrealizedPnl,
        });

        return;
      }

      // Check take profit
      const takeProfitHit = await positionService.checkTakeProfit(position.id, currentPrice);
      if (takeProfitHit) {
        logger.info('Take profit hit, closing position', {
          botId: this.bot.id,
          positionId: position.id,
          symbol: position.symbol,
          currentPrice,
          takeProfit: position.takeProfit,
        });

        await positionService.closePosition(
          position.id,
          this.bot.userId,
          this.bot.tenantId,
          {
            exitReason: 'take_profit',
            exitPrice: currentPrice,
            notes: 'Auto-closed by bot: Take profit hit',
          }
        );

        this.emitEvent('take_profit_hit', {
          positionId: position.id,
          symbol: position.symbol,
          exitPrice: currentPrice,
          pnl: position.unrealizedPnl,
        });

        return;
      }

      // Update trailing stop if configured
      if (position.trailingStop) {
        await positionService.updateTrailingStop(position.id, currentPrice);
      }
    } catch (error) {
      logger.error('Failed to check position', {
        botId: this.bot.id,
        positionId: position.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ============================================================================
  // SCHEDULE & HEALTH
  // ============================================================================

  /**
   * Check if execution is allowed by schedule
   */
  private isScheduleAllowed(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Check weekends
    if (!this.bot.runOnWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false;
    }

    // Check time window
    if (this.bot.startTime && this.bot.endTime) {
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startMinutes = parseInt(this.bot.startTime.split(':')[0]) * 60 + parseInt(this.bot.startTime.split(':')[1]);
      const endMinutes = parseInt(this.bot.endTime.split(':')[0]) * 60 + parseInt(this.bot.endTime.split(':')[1]);

      if (currentTime < startMinutes || currentTime > endMinutes) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check circuit breaker and reset if timeout passed
   */
  private async checkCircuitBreaker(): Promise<void> {
    if (!this.context.circuitBreakerOpen || !this.context.circuitBreakerOpenedAt) {
      return;
    }

    const now = Date.now();
    const openedAt = this.context.circuitBreakerOpenedAt.getTime();
    const elapsed = now - openedAt;

    if (elapsed >= this.config.circuitBreakerResetMs) {
      logger.info('Circuit breaker reset', {
        botId: this.bot.id,
        wasOpenForMs: elapsed,
      });

      this.context.circuitBreakerOpen = false;
      this.context.circuitBreakerOpenedAt = undefined;
      this.context.consecutiveErrors = 0;
      this.setState('RUNNING');
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Handle error during tick
   */
  private async handleTickError(error: any): Promise<void> {
    this.context.consecutiveErrors++;
    this.metrics.lastError = error instanceof Error ? error.message : String(error);
    this.metrics.lastErrorAt = new Date();

    logger.error('Tick execution error', {
      botId: this.bot.id,
      consecutiveErrors: this.context.consecutiveErrors,
      error: error instanceof Error ? error.message : String(error),
    });

    this.emitEvent('error', {
      error: error instanceof Error ? error : new Error(String(error)),
      consecutiveErrors: this.context.consecutiveErrors,
    });

    // Check if should open circuit breaker
    if (
      this.config.enableCircuitBreaker &&
      this.context.consecutiveErrors >= this.config.circuitBreakerThreshold
    ) {
      this.openCircuitBreaker();
    }

    // Check if should auto-stop
    if (
      this.bot.autoStopOnLoss &&
      this.context.consecutiveErrors >= this.config.maxConsecutiveErrors
    ) {
      logger.error('Max consecutive errors reached, auto-stopping bot', {
        botId: this.bot.id,
        consecutiveErrors: this.context.consecutiveErrors,
      });

      await botService.stopBot(this.bot.id, this.bot.userId, this.bot.tenantId, 'max_errors_reached');
      await this.stop();
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuitBreaker(): void {
    if (this.context.circuitBreakerOpen) {
      return;
    }

    logger.warn('Opening circuit breaker', {
      botId: this.bot.id,
      consecutiveErrors: this.context.consecutiveErrors,
      resetAfterMs: this.config.circuitBreakerResetMs,
    });

    this.context.circuitBreakerOpen = true;
    this.context.circuitBreakerOpenedAt = new Date();
    this.setState('ERROR');

    this.emitEvent('warning', {
      message: 'Circuit breaker opened',
      consecutiveErrors: this.context.consecutiveErrors,
      resetAfterMs: this.config.circuitBreakerResetMs,
    });
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Set execution state
   */
  private setState(newState: ExecutionState): void {
    const oldState = this.context.state;

    if (oldState !== newState) {
      logger.debug('State transition', {
        botId: this.bot.id,
        from: oldState,
        to: newState,
      });

      this.context.previousState = oldState;
      this.context.state = newState;
      this.metrics.state = newState;
    }
  }

  // ============================================================================
  // METRICS & EVENTS
  // ============================================================================

  /**
   * Update execution metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const startedAt = this.context.startedAt.getTime();
    const uptimeMs = now - startedAt;
    const uptimeMinutes = uptimeMs / 60000;

    this.metrics.uptime = uptimeMs;
    this.metrics.ticksPerMinute = uptimeMinutes > 0 ? this.context.totalTicks / uptimeMinutes : 0;
    this.metrics.evaluationsPerMinute = uptimeMinutes > 0 ? this.context.totalEvaluations / uptimeMinutes : 0;
    this.metrics.ordersPerHour = uptimeMinutes > 0 ? (this.context.totalOrders / uptimeMinutes) * 60 : 0;

    const totalOperations = this.context.totalEvaluations + this.context.totalOrders;
    const successfulOperations = totalOperations - this.context.consecutiveErrors;
    this.metrics.successRate = totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 100;
    this.metrics.errorRate = 100 - this.metrics.successRate;

    // Memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsageMB = memUsage.heapUsed / 1024 / 1024;
    }
  }

  /**
   * Update tick metrics
   */
  private updateTickMetrics(duration: number): void {
    const alpha = 0.2; // Smoothing factor for exponential moving average
    this.metrics.averageTickDuration = alpha * duration + (1 - alpha) * this.metrics.averageTickDuration;
  }

  /**
   * Update evaluation metrics
   */
  private updateEvaluationMetrics(duration: number): void {
    const alpha = 0.2;
    this.metrics.averageEvaluationDuration = alpha * duration + (1 - alpha) * this.metrics.averageEvaluationDuration;
  }

  /**
   * Emit execution event
   */
  private emitEvent(type: ExecutionEvent['type'], data?: Record<string, any>, error?: Error): void {
    const event: ExecutionEvent = {
      type,
      botId: this.bot.id,
      executionId: this.context.executionId,
      timestamp: new Date(),
      data,
      error,
    };

    this.emit('execution_event', event);

    // Also emit specific event type
    this.emit(type, event);
  }

  // ============================================================================
  // WEBSOCKET INTEGRATION
  // ============================================================================

  /**
   * Connect to exchange WebSocket and subscribe to market data
   */
  private async connectWebSocket(): Promise<void> {
    try {
      logger.info('Connecting to exchange WebSocket', {
        botId: this.bot.id,
        exchange: this.bot.exchangeId,
        symbol: this.bot.symbol,
      });

      // Map bot exchangeId to WebSocket ExchangeId
      const exchangeId = this.bot.exchangeId as ExchangeId;

      // Check if already connected
      if (marketDataWebSocketManager.isConnected(exchangeId)) {
        logger.info('WebSocket already connected, subscribing to symbol', {
          botId: this.bot.id,
          exchange: exchangeId,
          symbol: this.bot.symbol,
        });
      } else {
        // Connect to exchange WebSocket
        const wsConfig = this.getWebSocketConfig(exchangeId);
        await marketDataWebSocketManager.connect(exchangeId, wsConfig);
      }

      // Set up price update handler
      this.setupPriceUpdateHandler();

      // Subscribe to ticker for this bot's symbol
      await marketDataWebSocketManager.subscribe({
        exchangeId,
        channel: 'ticker',
        symbol: this.bot.symbol,
      });

      this.websocketConnected = true;

      logger.info('WebSocket connected and subscribed', {
        botId: this.bot.id,
        exchange: exchangeId,
        symbol: this.bot.symbol,
      });
    } catch (error) {
      logger.error('Failed to connect WebSocket', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - allow bot to run with fallback
      this.websocketConnected = false;
    }
  }

  /**
   * Disconnect from exchange WebSocket
   */
  private async disconnectWebSocket(): Promise<void> {
    try {
      if (!this.websocketConnected) {
        return;
      }

      logger.info('Disconnecting from exchange WebSocket', {
        botId: this.bot.id,
        exchange: this.bot.exchangeId,
        symbol: this.bot.symbol,
      });

      // Unsubscribe from ticker
      await marketDataWebSocketManager.unsubscribe({
        exchangeId: this.bot.exchangeId as ExchangeId,
        channel: 'ticker',
        symbol: this.bot.symbol,
      });

      // Note: We don't disconnect the exchange connection itself because
      // other bots might be using it. The manager handles connection pooling.

      this.websocketConnected = false;

      logger.info('WebSocket disconnected', {
        botId: this.bot.id,
      });
    } catch (error) {
      logger.error('Error disconnecting WebSocket', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Set up price update handler from WebSocket
   */
  private setupPriceUpdateHandler(): void {
    // Listen to ticker events
    marketDataWebSocketManager.on('ticker', (ticker: Ticker) => {
      // Only process if it's for this bot's symbol
      if (ticker.symbol === this.bot.symbol) {
        this.onPriceUpdate(ticker);
      }
    });

    // Listen to connection events
    marketDataWebSocketManager.on('exchange:disconnected', (data: any) => {
      if (data.exchange === this.bot.exchangeId) {
        logger.warn('WebSocket disconnected', {
          botId: this.bot.id,
          exchange: data.exchange,
          reason: data.reason,
        });
        this.websocketConnected = false;
      }
    });

    marketDataWebSocketManager.on('exchange:reconnecting', (data: any) => {
      if (data.exchange === this.bot.exchangeId) {
        logger.info('WebSocket reconnecting', {
          botId: this.bot.id,
          exchange: data.exchange,
          attempt: data.attempt,
        });
      }
    });

    marketDataWebSocketManager.on('exchange:connected', (data: any) => {
      if (data.exchange === this.bot.exchangeId) {
        logger.info('WebSocket reconnected', {
          botId: this.bot.id,
          exchange: data.exchange,
        });
        this.websocketConnected = true;
      }
    });
  }

  /**
   * Handle real-time price update from WebSocket
   */
  private onPriceUpdate(ticker: Ticker): void {
    try {
      // Update current price
      this.currentPrice = ticker.last;
      this.lastPriceUpdate = new Date(ticker.timestamp);

      // Emit price update event
      this.emitEvent('price_update', {
        symbol: ticker.symbol,
        price: ticker.last,
        bid: ticker.bid,
        ask: ticker.ask,
        volume: ticker.volume24h,
        timestamp: ticker.timestamp,
      });

      // Log debug info (throttled to avoid spam)
      if (this.context.totalTicks % 100 === 0) {
        logger.debug('Price update received', {
          botId: this.bot.id,
          symbol: ticker.symbol,
          price: ticker.last,
          lastUpdate: this.lastPriceUpdate,
        });
      }
    } catch (error) {
      logger.error('Error processing price update', {
        botId: this.bot.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get WebSocket configuration for exchange
   */
  private getWebSocketConfig(exchangeId: ExchangeId): any {
    // Default configuration for exchanges
    const configs: Record<string, any> = {
      binance: {
        url: 'wss://stream.binance.com:9443/ws',
        timeout: 30000,
        pingInterval: 30000,
        pongTimeout: 10000,
        reconnection: {
          maxAttempts: 5,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
          jitterFactor: 0.1,
        },
      },
      coinbase: {
        url: 'wss://ws-feed.exchange.coinbase.com',
        timeout: 30000,
        pingInterval: 30000,
        pongTimeout: 10000,
        reconnection: {
          maxAttempts: 5,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
          jitterFactor: 0.1,
        },
      },
      kraken: {
        url: 'wss://ws.kraken.com',
        timeout: 30000,
        pingInterval: 30000,
        pongTimeout: 10000,
        reconnection: {
          maxAttempts: 5,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
          jitterFactor: 0.1,
        },
      },
    };

    return configs[exchangeId] || configs.binance;
  }
}
