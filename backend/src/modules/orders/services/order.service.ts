/**
 * Order Service
 * Handles trading order creation, management, and execution
 */

import { db } from '@/db';
import { eq, and, inArray, gte, lte, desc } from 'drizzle-orm';
import { ExchangeService } from '../../exchanges/services/exchange.service';
import { exchangeConnections } from '../../exchanges/schema/exchanges.schema';
import { tradingOrders, orderFills } from '../schema/orders.schema';
import logger from '@/utils/logger';
import { NotFoundError, BadRequestError } from '@/utils/errors';
import type {
  TradingOrder,
  OrderFill,
  CreateOrderRequest,
  UpdateOrderRequest,
  OrderQueryOptions,
  OrderStatistics,
  BatchOrderResult,
  OrderType,
  OrderStatus,
} from '../types/orders.types';
import { randomUUID } from 'crypto';

export class OrderService {
  /**
   * Create a new trading order
   */
  static async createOrder(
    userId: string,
    tenantId: string,
    request: CreateOrderRequest
  ): Promise<TradingOrder> {
    try {
      logger.info('Creating trading order', { userId, tenantId, request });

      // Validate exchange connection
      const [connection] = await db
        .select()
        .from(exchangeConnections)
        .where(
          and(
            eq(exchangeConnections.id, request.exchangeConnectionId),
            eq(exchangeConnections.userId, userId),
            eq(exchangeConnections.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!connection) {
        throw new NotFoundError('Exchange connection not found');
      }

      // Validate order parameters
      this.validateOrderRequest(request);

      // Generate client order ID
      const clientOrderId = `${tenantId.slice(0, 8)}-${randomUUID()}`;

      // Create order in database (pending status)
      const [order] = await db
        .insert(tradingOrders)
        .values({
          userId,
          tenantId,
          exchangeConnectionId: request.exchangeConnectionId,
          exchangeId: connection.exchangeId,
          symbol: request.symbol,
          clientOrderId,
          type: request.type,
          side: request.side,
          timeInForce: request.timeInForce || 'GTC',
          price: request.price?.toString(),
          stopPrice: request.stopPrice?.toString(),
          amount: request.amount.toString(),
          filled: '0',
          remaining: request.amount.toString(),
          trailingDelta: request.trailingDelta?.toString(),
          trailingPercent: request.trailingPercent?.toString(),
          reduceOnly: request.reduceOnly || false,
          postOnly: request.postOnly || false,
          strategy: request.strategy,
          notes: request.notes,
          status: 'pending',
        })
        .returning();

      // Submit order to exchange (async)
      this.submitOrderToExchange(order.id, connection, request).catch((error) => {
        logger.error('Failed to submit order to exchange', {
          orderId: order.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      logger.info('Trading order created', { orderId: order.id, clientOrderId });

      return this.mapToTradingOrder(order);
    } catch (error) {
      logger.error('Failed to create order', {
        userId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Submit order to exchange
   */
  private static async submitOrderToExchange(
    orderId: string,
    connection: any,
    request: CreateOrderRequest
  ): Promise<void> {
    try {
      // Create exchange instance with credentials
      const exchange = ExchangeService.createCCXTInstance(connection.exchangeId, {
        apiKey: connection.apiKey,
        apiSecret: connection.apiSecret,
        apiPassword: connection.apiPassword || undefined,
      });

      // Prepare order parameters
      const params: any = {};
      if (request.timeInForce) params.timeInForce = request.timeInForce;
      if (request.reduceOnly) params.reduceOnly = true;
      if (request.postOnly) params.postOnly = true;

      // Submit order based on type
      let exchangeOrder: any;

      switch (request.type) {
        case 'market':
          exchangeOrder = await exchange.createMarketOrder(
            request.symbol,
            request.side,
            request.amount,
            params
          );
          break;

        case 'limit':
          if (!request.price) throw new BadRequestError('Price required for limit order');
          exchangeOrder = await exchange.createLimitOrder(
            request.symbol,
            request.side,
            request.amount,
            request.price,
            params
          );
          break;

        case 'stop_loss':
          if (!request.stopPrice) throw new BadRequestError('Stop price required for stop loss order');
          exchangeOrder = await exchange.createOrder(
            request.symbol,
            'stop_loss',
            request.side,
            request.amount,
            undefined,
            { ...params, stopPrice: request.stopPrice }
          );
          break;

        case 'stop_loss_limit':
          if (!request.stopPrice || !request.price) {
            throw new BadRequestError('Stop price and limit price required for stop loss limit order');
          }
          exchangeOrder = await exchange.createOrder(
            request.symbol,
            'stop_loss_limit',
            request.side,
            request.amount,
            request.price,
            { ...params, stopPrice: request.stopPrice }
          );
          break;

        case 'take_profit':
          if (!request.stopPrice) throw new BadRequestError('Stop price required for take profit order');
          exchangeOrder = await exchange.createOrder(
            request.symbol,
            'take_profit',
            request.side,
            request.amount,
            undefined,
            { ...params, stopPrice: request.stopPrice }
          );
          break;

        case 'take_profit_limit':
          if (!request.stopPrice || !request.price) {
            throw new BadRequestError('Stop price and limit price required for take profit limit order');
          }
          exchangeOrder = await exchange.createOrder(
            request.symbol,
            'take_profit_limit',
            request.side,
            request.amount,
            request.price,
            { ...params, stopPrice: request.stopPrice }
          );
          break;

        case 'trailing_stop':
          if (!request.trailingDelta && !request.trailingPercent) {
            throw new BadRequestError('Trailing delta or percent required for trailing stop');
          }
          exchangeOrder = await exchange.createOrder(
            request.symbol,
            'trailing_stop',
            request.side,
            request.amount,
            undefined,
            {
              ...params,
              trailingDelta: request.trailingDelta,
              trailingPercent: request.trailingPercent,
            }
          );
          break;

        default:
          throw new BadRequestError(`Unsupported order type: ${request.type}`);
      }

      // Update order with exchange response
      await db
        .update(tradingOrders)
        .set({
          exchangeOrderId: exchangeOrder.id,
          status: exchangeOrder.status || 'open',
          submittedAt: new Date(),
          info: exchangeOrder.info,
          updatedAt: new Date(),
        })
        .where(eq(tradingOrders.id, orderId));

      logger.info('Order submitted to exchange', {
        orderId,
        exchangeOrderId: exchangeOrder.id,
        status: exchangeOrder.status,
      });
    } catch (error) {
      // Update order status to rejected
      await db
        .update(tradingOrders)
        .set({
          status: 'rejected',
          updatedAt: new Date(),
        })
        .where(eq(tradingOrders.id, orderId));

      throw error;
    }
  }

  /**
   * Create batch orders
   */
  static async createBatchOrders(
    userId: string,
    tenantId: string,
    requests: CreateOrderRequest[]
  ): Promise<BatchOrderResult> {
    const result: BatchOrderResult = {
      success: 0,
      failed: 0,
      results: [],
    };

    for (const request of requests) {
      try {
        const order = await this.createOrder(userId, tenantId, request);
        result.success++;
        result.results.push({
          success: true,
          order,
        });
      } catch (error) {
        result.failed++;
        result.results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Get order by ID
   */
  static async getOrder(
    orderId: string,
    userId: string,
    tenantId: string
  ): Promise<TradingOrder | null> {
    const [order] = await db
      .select()
      .from(tradingOrders)
      .where(
        and(
          eq(tradingOrders.id, orderId),
          eq(tradingOrders.userId, userId),
          eq(tradingOrders.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!order) return null;

    return this.mapToTradingOrder(order);
  }

  /**
   * Get orders with filters
   */
  static async getOrders(options: OrderQueryOptions): Promise<TradingOrder[]> {
    const conditions = [];

    if (options.userId) conditions.push(eq(tradingOrders.userId, options.userId));
    if (options.tenantId) conditions.push(eq(tradingOrders.tenantId, options.tenantId));
    if (options.exchangeId) conditions.push(eq(tradingOrders.exchangeId, options.exchangeId));
    if (options.symbol) conditions.push(eq(tradingOrders.symbol, options.symbol));
    if (options.strategy) conditions.push(eq(tradingOrders.strategy, options.strategy));

    if (options.status) {
      if (Array.isArray(options.status)) {
        conditions.push(inArray(tradingOrders.status, options.status));
      } else {
        conditions.push(eq(tradingOrders.status, options.status));
      }
    }

    if (options.startDate) conditions.push(gte(tradingOrders.createdAt, options.startDate));
    if (options.endDate) conditions.push(lte(tradingOrders.createdAt, options.endDate));

    const query = db
      .select()
      .from(tradingOrders)
      .where(and(...conditions))
      .orderBy(desc(tradingOrders.createdAt))
      .limit(options.limit || 100)
      .offset(options.offset || 0);

    const results = await query;

    return results.map(this.mapToTradingOrder);
  }

  /**
   * Update order
   */
  static async updateOrder(
    orderId: string,
    userId: string,
    tenantId: string,
    updates: UpdateOrderRequest
  ): Promise<TradingOrder> {
    // Get order
    const order = await this.getOrder(orderId, userId, tenantId);
    if (!order) throw new NotFoundError('Order not found');

    // Only allow updates for pending/open orders
    if (!['pending', 'open'].includes(order.status)) {
      throw new BadRequestError('Cannot update order in current status');
    }

    // Update in database
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.amount !== undefined) {
      updateData.amount = updates.amount.toString();
      updateData.remaining = updates.amount.toString();
    }
    if (updates.price !== undefined) updateData.price = updates.price.toString();
    if (updates.stopPrice !== undefined) updateData.stopPrice = updates.stopPrice.toString();
    if (updates.trailingDelta !== undefined) updateData.trailingDelta = updates.trailingDelta.toString();
    if (updates.trailingPercent !== undefined)
      updateData.trailingPercent = updates.trailingPercent.toString();

    const [updated] = await db
      .update(tradingOrders)
      .set(updateData)
      .where(eq(tradingOrders.id, orderId))
      .returning();

    logger.info('Order updated', { orderId, updates });

    return this.mapToTradingOrder(updated);
  }

  /**
   * Cancel order
   */
  static async cancelOrder(
    orderId: string,
    userId: string,
    tenantId: string,
    reason?: string
  ): Promise<TradingOrder> {
    const order = await this.getOrder(orderId, userId, tenantId);
    if (!order) throw new NotFoundError('Order not found');

    if (!['pending', 'open', 'partially_filled'].includes(order.status)) {
      throw new BadRequestError('Cannot cancel order in current status');
    }

    // Cancel on exchange if submitted
    if (order.exchangeOrderId) {
      const [connection] = await db
        .select()
        .from(exchangeConnections)
        .where(eq(exchangeConnections.id, order.exchangeConnectionId))
        .limit(1);

      if (connection) {
        try {
          const exchange = ExchangeService.createCCXTInstance(connection.exchangeId, {
            apiKey: connection.apiKey,
            apiSecret: connection.apiSecret,
          });

          await exchange.cancelOrder(order.exchangeOrderId, order.symbol);
        } catch (error) {
          logger.error('Failed to cancel order on exchange', {
            orderId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Update status
    const [updated] = await db
      .update(tradingOrders)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
        notes: reason ? `${order.notes || ''}\nCanceled: ${reason}` : order.notes,
      })
      .where(eq(tradingOrders.id, orderId))
      .returning();

    logger.info('Order canceled', { orderId, reason });

    return this.mapToTradingOrder(updated);
  }

  /**
   * Cancel all orders
   */
  static async cancelAllOrders(
    userId: string,
    tenantId: string,
    symbol?: string
  ): Promise<number> {
    const conditions = [
      eq(tradingOrders.userId, userId),
      eq(tradingOrders.tenantId, tenantId),
      inArray(tradingOrders.status, ['pending', 'open', 'partially_filled']),
    ];

    if (symbol) conditions.push(eq(tradingOrders.symbol, symbol));

    const orders = await db
      .select()
      .from(tradingOrders)
      .where(and(...conditions));

    let canceled = 0;
    for (const order of orders) {
      try {
        await this.cancelOrder(order.id, userId, tenantId, 'Cancel all orders');
        canceled++;
      } catch (error) {
        logger.error('Failed to cancel order', {
          orderId: order.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Canceled multiple orders', { userId, tenantId, symbol, count: canceled });

    return canceled;
  }

  /**
   * Get order fills
   */
  static async getOrderFills(orderId: string): Promise<OrderFill[]> {
    const results = await db
      .select()
      .from(orderFills)
      .where(eq(orderFills.orderId, orderId))
      .orderBy(desc(orderFills.timestamp));

    return results.map(this.mapToOrderFill);
  }

  /**
   * Get order statistics
   */
  static async getOrderStatistics(
    userId: string,
    tenantId: string,
    options?: OrderQueryOptions
  ): Promise<OrderStatistics> {
    const conditions = [eq(tradingOrders.userId, userId), eq(tradingOrders.tenantId, tenantId)];

    if (options?.exchangeId) conditions.push(eq(tradingOrders.exchangeId, options.exchangeId));
    if (options?.symbol) conditions.push(eq(tradingOrders.symbol, options.symbol));
    if (options?.strategy) conditions.push(eq(tradingOrders.strategy, options.strategy));
    if (options?.startDate) conditions.push(gte(tradingOrders.createdAt, options.startDate));
    if (options?.endDate) conditions.push(lte(tradingOrders.createdAt, options.endDate));

    const orders = await db
      .select()
      .from(tradingOrders)
      .where(and(...conditions));

    const stats: OrderStatistics = {
      totalOrders: orders.length,
      openOrders: orders.filter((o) => o.status === 'open').length,
      filledOrders: orders.filter((o) => o.status === 'filled').length,
      canceledOrders: orders.filter((o) => o.status === 'canceled').length,
      rejectedOrders: orders.filter((o) => o.status === 'rejected').length,
      totalVolume: orders.reduce((sum, o) => sum + parseFloat(o.filled || '0'), 0),
      totalCost: orders.reduce((sum, o) => sum + parseFloat(o.cost || '0'), 0),
      totalFees: 0, // Calculate from fees field
      averageFillRate: 0,
      averageExecutionTime: 0,
    };

    // Calculate fill rate
    if (stats.totalOrders > 0) {
      stats.averageFillRate = (stats.filledOrders / stats.totalOrders) * 100;
    }

    return stats;
  }

  /**
   * Sync orders from exchange
   */
  static async syncOrders(
    userId: string,
    tenantId: string,
    exchangeConnectionId: string
  ): Promise<number> {
    try {
      const [connection] = await db
        .select()
        .from(exchangeConnections)
        .where(
          and(
            eq(exchangeConnections.id, exchangeConnectionId),
            eq(exchangeConnections.userId, userId),
            eq(exchangeConnections.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!connection) throw new NotFoundError('Exchange connection not found');

      const exchange = ExchangeService.createCCXTInstance(connection.exchangeId, {
        apiKey: connection.apiKey,
        apiSecret: connection.apiSecret,
      });

      // Fetch open orders from exchange
      const openOrders = await exchange.fetchOpenOrders();

      let synced = 0;
      for (const exchangeOrder of openOrders) {
        // Find matching order in database
        const [dbOrder] = await db
          .select()
          .from(tradingOrders)
          .where(
            and(
              eq(tradingOrders.exchangeOrderId, exchangeOrder.id),
              eq(tradingOrders.userId, userId)
            )
          )
          .limit(1);

        if (dbOrder) {
          // Update existing order
          await db
            .update(tradingOrders)
            .set({
              status: exchangeOrder.status as OrderStatus,
              filled: exchangeOrder.filled?.toString(),
              remaining: exchangeOrder.remaining?.toString(),
              cost: exchangeOrder.cost?.toString(),
              average: exchangeOrder.average?.toString(),
              updatedAt: new Date(),
            })
            .where(eq(tradingOrders.id, dbOrder.id));

          synced++;
        }
      }

      logger.info('Synced orders from exchange', { userId, exchangeConnectionId, synced });

      return synced;
    } catch (error) {
      logger.error('Failed to sync orders', {
        userId,
        exchangeConnectionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate order request
   */
  private static validateOrderRequest(request: CreateOrderRequest): void {
    // Validate limit order
    if (request.type === 'limit' && !request.price) {
      throw new BadRequestError('Price required for limit order');
    }

    // Validate stop orders
    if (
      ['stop_loss', 'stop_loss_limit', 'take_profit', 'take_profit_limit'].includes(request.type) &&
      !request.stopPrice
    ) {
      throw new BadRequestError('Stop price required for stop orders');
    }

    // Validate trailing stop
    if (
      ['trailing_stop', 'trailing_stop_limit'].includes(request.type) &&
      !request.trailingDelta &&
      !request.trailingPercent
    ) {
      throw new BadRequestError('Trailing delta or percent required for trailing stop');
    }

    // Validate amount
    if (request.amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }
  }

  /**
   * Map database row to TradingOrder
   */
  private static mapToTradingOrder(row: any): TradingOrder {
    return {
      id: row.id,
      userId: row.userId,
      tenantId: row.tenantId,
      exchangeConnectionId: row.exchangeConnectionId,
      exchangeId: row.exchangeId,
      symbol: row.symbol,
      clientOrderId: row.clientOrderId,
      exchangeOrderId: row.exchangeOrderId || undefined,
      type: row.type as OrderType,
      side: row.side,
      timeInForce: row.timeInForce,
      price: row.price ? parseFloat(row.price) : undefined,
      stopPrice: row.stopPrice ? parseFloat(row.stopPrice) : undefined,
      amount: parseFloat(row.amount),
      filled: parseFloat(row.filled || '0'),
      remaining: parseFloat(row.remaining),
      cost: row.cost ? parseFloat(row.cost) : undefined,
      average: row.average ? parseFloat(row.average) : undefined,
      trailingDelta: row.trailingDelta ? parseFloat(row.trailingDelta) : undefined,
      trailingPercent: row.trailingPercent ? parseFloat(row.trailingPercent) : undefined,
      status: row.status as OrderStatus,
      lastTradeTimestamp: row.lastTradeTimestamp || undefined,
      fee: row.fee,
      fees: row.fees,
      reduceOnly: row.reduceOnly,
      postOnly: row.postOnly,
      strategy: row.strategy || undefined,
      notes: row.notes || undefined,
      info: row.info,
      createdAt: row.createdAt,
      submittedAt: row.submittedAt || undefined,
      updatedAt: row.updatedAt,
      filledAt: row.filledAt || undefined,
      canceledAt: row.canceledAt || undefined,
    };
  }

  /**
   * Map database row to OrderFill
   */
  private static mapToOrderFill(row: any): OrderFill {
    return {
      id: row.id,
      orderId: row.orderId,
      userId: row.userId,
      tenantId: row.tenantId,
      exchangeId: row.exchangeId,
      symbol: row.symbol,
      tradeId: row.tradeId,
      exchangeOrderId: row.exchangeOrderId || undefined,
      price: parseFloat(row.price),
      amount: parseFloat(row.amount),
      cost: parseFloat(row.cost),
      side: row.side,
      takerOrMaker: row.takerOrMaker,
      fee: row.fee,
      info: row.info,
      timestamp: row.timestamp,
      createdAt: row.createdAt,
    };
  }
}
