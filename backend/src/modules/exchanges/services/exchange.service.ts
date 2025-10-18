/**
 * Exchange Service
 * Manages exchange connections using CCXT
 */

import ccxt from 'ccxt';
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import logger from '@/utils/logger';
import { exchangeConnections } from '../schema/exchanges.schema';
import { exchangeMarkets } from '../schema/exchange-markets.schema';
import { encrypt, decrypt } from '../utils/encryption';
import { NotFoundError, BadRequestError } from '@/utils/errors';
import type { ConnectionConfig } from '../types/realtime.types';
import redis from '@/utils/redis';
import { getDefaultWebSocketConfig } from './exchange-websocket.factory';
import type {
  ExchangeId,
  ExchangeCredentials,
  CreateExchangeConnectionData,
  UpdateExchangeConnectionData,
  ExchangeBalance,
  ExchangeTicker,
  ExchangePosition,
  ExchangeMarket,
  ExchangeOrderBook,
  ExchangeTrade,
  ExchangeCandle,
  ExchangeInfo,
} from '../types/exchanges.types';

export class ExchangeService {
  /**
   * Get ALL supported exchanges from CCXT (100+)
   */
  static getSupportedExchanges(): ExchangeId[] {
    return ccxt.exchanges.sort();
  }

  /**
   * Check if exchange is supported
   */
  static isExchangeSupported(exchangeId: string): boolean {
    return ccxt.exchanges.includes(exchangeId);
  }

  /**
   * Retorna ConnectionConfig WebSocket padrão para uma exchange, com possibilidade de overrides.
   * Permite futura personalização por tenant/ambiente sem duplicar lógica em outros módulos.
   */
  static getWebSocketConfig(
    exchangeId: ExchangeId,
    overrides?: Partial<ConnectionConfig>
  ): ConnectionConfig {
    // Base centralizada (metadata em Exchanges)
    const base = getDefaultWebSocketConfig(exchangeId);

    // Permitir override de URL via ENV (compatível com pipeline)
    const envUrlEx = process.env[`EXCHANGES_WS_${exchangeId.toUpperCase()}_URL`];
    const envUrlLegacy = process.env[`MARKET_DATA_WS_${exchangeId.toUpperCase()}_URL`];

    const cfg: ConnectionConfig = {
      ...base,
      ...(envUrlEx ? { url: envUrlEx } : envUrlLegacy ? { url: envUrlLegacy } : {}),
      ...(overrides || {}),
    } as ConnectionConfig;

    return cfg;
  }

  /**
   * Refresh markets: limpa cache e recarrega/persiste markets
   */
  static async refreshMarkets(connectionId: string, userId: string, tenantId: string) {
    const connection = await this.getConnectionById(connectionId, userId, tenantId);
    const cacheKey = `ex:markets:${connection.exchangeId}:${connection.sandbox ? '1' : '0'}:${tenantId}`;
    try {
      await redis.del(cacheKey);
    } catch (error) {
      logger.warn('Failed to delete markets cache', { cacheKey, error: (error as Error).message });
    }
    return this.getMarkets(connectionId, userId, tenantId);
  }

  /**
   * Create CCXT instance
   */
  static createCCXTInstance(
    exchangeId: ExchangeId,
    credentials: ExchangeCredentials
  ): InstanceType<typeof ccxt.Exchange> {
    // Validate exchange is supported
    if (!this.isExchangeSupported(exchangeId)) {
      throw new BadRequestError(
        `Exchange '${exchangeId}' not supported. Use /api/v1/exchanges/supported to see available exchanges.`
      );
    }

    const ExchangeClass = (ccxt as any)[exchangeId];
    if (!ExchangeClass) {
      throw new BadRequestError(`Exchange ${exchangeId} not supported`);
    }

    const config: any = {
      apiKey: credentials.apiKey,
      secret: credentials.apiSecret,
      enableRateLimit: true,
    };

    if (credentials.apiPassword) {
      config.password = credentials.apiPassword;
    }

    if (credentials.sandbox) {
      config.sandbox = true;
    }

    return new ExchangeClass(config);
  }

  /**
   * Create exchange connection
   */
  static async createConnection(data: CreateExchangeConnectionData) {
    logger.info('Creating exchange connection', {
      userId: data.userId,
      exchangeId: data.exchangeId,
    });

    // Encrypt credentials
    const encryptedApiKey = encrypt(data.apiKey);
    const encryptedApiSecret = encrypt(data.apiSecret);
    const encryptedApiPassword = data.apiPassword ? encrypt(data.apiPassword) : null;

    // Test connection first
    let inferredPermissions: any = undefined;
    try {
      const exchange = this.createCCXTInstance(data.exchangeId, {
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        apiPassword: data.apiPassword,
        sandbox: data.sandbox,
      });

      await exchange.fetchBalance();
      const has = exchange.has || {};
      inferredPermissions = {
        read: true,
        trade: !!(data.enableTrading && (has.createOrder || has.createOrder === true)),
        withdraw: !!(data.enableWithdrawal && (has.withdraw || has.withdraw === true)),
        spot: !!has.spot || !!has.createOrder,
        derivatives: !!has.swap || !!has.future,
      };
      logger.info('Exchange connection verified', { exchangeId: data.exchangeId });
    } catch (error) {
      logger.error('Failed to verify exchange connection', {
        exchangeId: data.exchangeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestError('Invalid API credentials or exchange connection failed');
    }

    // Create connection record
    const [connection] = await db
      .insert(exchangeConnections)
      .values({
        userId: data.userId,
        tenantId: data.tenantId,
        exchangeId: data.exchangeId,
        exchangeName: data.exchangeId.toUpperCase(),
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        apiPassword: encryptedApiPassword,
        sandbox: data.sandbox || false,
        enableTrading: data.enableTrading || false,
        enableWithdrawal: data.enableWithdrawal || false,
        isVerified: true,
        status: 'active',
        permissions: inferredPermissions,
      })
      .returning();

    logger.info('Exchange connection created', { connectionId: connection.id });

    return connection;
  }

  /**
   * Update exchange connection
   */
  static async updateConnection(
    id: string,
    userId: string,
    tenantId: string,
    data: UpdateExchangeConnectionData
  ) {
    logger.info('Updating exchange connection', { connectionId: id, userId });

    // Get existing connection
    const connection = await this.getConnectionById(id, userId, tenantId);

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Update credentials if provided
    if (data.apiKey) {
      updateData.apiKey = encrypt(data.apiKey);
    }
    if (data.apiSecret) {
      updateData.apiSecret = encrypt(data.apiSecret);
    }
    if (data.apiPassword !== undefined) {
      updateData.apiPassword = data.apiPassword ? encrypt(data.apiPassword) : null;
    }

    // Update settings
    if (data.sandbox !== undefined) {
      updateData.sandbox = data.sandbox;
    }
    if (data.enableTrading !== undefined) {
      updateData.enableTrading = data.enableTrading;
    }
    if (data.enableWithdrawal !== undefined) {
      updateData.enableWithdrawal = data.enableWithdrawal;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    // If credentials were updated, verify the connection
    if (data.apiKey || data.apiSecret || data.apiPassword !== undefined) {
      try {
        const testCredentials: ExchangeCredentials = {
          apiKey: data.apiKey || decrypt(connection.apiKey),
          apiSecret: data.apiSecret || decrypt(connection.apiSecret),
          apiPassword: data.apiPassword !== undefined
            ? data.apiPassword
            : connection.apiPassword
              ? decrypt(connection.apiPassword)
              : undefined,
          sandbox: data.sandbox !== undefined ? data.sandbox : connection.sandbox,
        };

        const exchange = this.createCCXTInstance(
          connection.exchangeId as ExchangeId,
          testCredentials
        );

        await exchange.fetchBalance();
        updateData.isVerified = true;
        updateData.status = 'active';
        const has = exchange.has || {};
        updateData.permissions = {
          read: true,
          trade: !!(updateData.enableTrading && (has.createOrder || has.createOrder === true)),
          withdraw: !!(updateData.enableWithdrawal && (has.withdraw || has.withdraw === true)),
          spot: !!has.spot || !!has.createOrder,
          derivatives: !!has.swap || !!has.future,
        };
        logger.info('Updated connection verified', { connectionId: id });
      } catch (error) {
        logger.error('Failed to verify updated connection', {
          connectionId: id,
          error: error instanceof Error ? error.message : String(error),
        });
        updateData.isVerified = false;
        updateData.status = 'error';
        throw new BadRequestError('Invalid API credentials or connection failed');
      }
    }

    // Update connection
    const [updated] = await db
      .update(exchangeConnections)
      .set(updateData)
      .where(
        and(
          eq(exchangeConnections.id, id),
          eq(exchangeConnections.userId, userId),
          eq(exchangeConnections.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundError('Exchange connection not found');
    }

    logger.info('Exchange connection updated', { connectionId: id });

    return updated;
  }

  /**
   * Get user exchange connections
   */
  static async getUserConnections(userId: string, tenantId: string) {
    return await db
      .select()
      .from(exchangeConnections)
      .where(
        and(
          eq(exchangeConnections.userId, userId),
          eq(exchangeConnections.tenantId, tenantId),
          eq(exchangeConnections.status, 'active')
        )
      );
  }

  /**
   * Get connection by ID
   */
  static async getConnectionById(id: string, userId: string, tenantId: string) {
    const [connection] = await db
      .select()
      .from(exchangeConnections)
      .where(
        and(
          eq(exchangeConnections.id, id),
          eq(exchangeConnections.userId, userId),
          eq(exchangeConnections.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!connection) {
      throw new NotFoundError('Exchange connection not found');
    }

    return connection;
  }

  /**
   * Get CCXT instance for connection
   */
  static async getCCXTInstance(
    connectionId: string,
    userId: string,
    tenantId: string
  ): Promise<InstanceType<typeof ccxt.Exchange>> {
    const connection = await this.getConnectionById(connectionId, userId, tenantId);

    const credentials: ExchangeCredentials = {
      apiKey: decrypt(connection.apiKey),
      apiSecret: decrypt(connection.apiSecret),
      apiPassword: connection.apiPassword ? decrypt(connection.apiPassword) : undefined,
      sandbox: connection.sandbox,
    };

    return this.createCCXTInstance(connection.exchangeId as ExchangeId, credentials);
  }

  /**
   * Informações gerais da exchange (metadata do CCXT)
   */
  static getExchangeInfo(exchangeId: ExchangeId): ExchangeInfo {
    if (!this.isExchangeSupported(exchangeId)) {
      throw new BadRequestError(`Exchange '${exchangeId}' not supported`);
    }
    const ExchangeClass = (ccxt as any)[exchangeId];
    const instance = new ExchangeClass({ enableRateLimit: true });
    const info: ExchangeInfo = {
      id: instance.id,
      name: instance.name,
      rateLimit: instance.rateLimit,
      has: instance.has || {},
      timeframes: instance.timeframes || null,
      countries: instance.countries || null,
      urls: instance.urls || {},
    };
    return info;
  }

  /**
   * Listagem de mercados normalizada
   */
  static async getMarkets(
    connectionId: string,
    userId: string,
    tenantId: string
  ): Promise<ExchangeMarket[]> {
    const connection = await this.getConnectionById(connectionId, userId, tenantId);
    const cacheKey = `ex:markets:${connection.exchangeId}:${connection.sandbox ? '1' : '0'}:${tenantId}`;
    const ttl = parseInt(process.env.EXCHANGES_MARKETS_TTL || '1800');

    // Tentativa de cache (Redis ou fallback in-memory)
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ExchangeMarket[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    const exchange = await this.getCCXTInstance(connectionId, userId, tenantId);
    await exchange.loadMarkets();
    const markets = Object.values(exchange.markets || {}) as any[];
    const normalized = markets.map((m) => ({
      symbol: m.symbol,
      base: m.base,
      quote: m.quote,
      active: m.active !== false,
      type: m.type || (m.spot ? 'spot' : m.swap ? 'swap' : 'future'),
      spot: !!m.spot,
      future: !!m.future,
      swap: !!m.swap,
      precision: m.precision || {},
      limits: m.limits || {},
    }));

    // Persistência para auditoria/performance (delete + insert)
    try {
      // @ts-expect-error drizzle delete builder differently typed
      await db.delete(exchangeMarkets).where(
        and(
          eq(exchangeMarkets.tenantId, tenantId as any),
          eq(exchangeMarkets.exchangeId, connection.exchangeId),
          eq(exchangeMarkets.sandbox, connection.sandbox)
        )
      );

      if (normalized.length > 0) {
        const rows = normalized.map((m) => ({
          tenantId: tenantId as any,
          exchangeId: connection.exchangeId,
          sandbox: connection.sandbox,
          symbol: m.symbol,
          base: m.base,
          quote: m.quote,
          active: m.active,
          type: m.type,
          precision: m.precision as any,
          limits: m.limits as any,
        }));
        // @ts-expect-error drizzle insert many
        await db.insert(exchangeMarkets).values(rows);
      }
    } catch (error) {
      logger.warn('Markets persistence skipped due to error', {
        tenantId,
        exchangeId: connection.exchangeId,
        error: (error as Error).message,
      });
    }

    // Cachear
    try {
      await redis.set(cacheKey, JSON.stringify(normalized), ttl);
    } catch (error) {
      logger.warn('Markets cache set failed', { cacheKey, error: (error as Error).message });
    }

    return normalized;
  }

  /**
   * Detalhe de um mercado
   */
  static async getMarket(
    connectionId: string,
    userId: string,
    tenantId: string,
    symbol: string
  ): Promise<ExchangeMarket | null> {
    const exchange = await this.getCCXTInstance(connectionId, userId, tenantId);
    await exchange.loadMarkets();
    const m = (exchange.markets && exchange.markets[symbol]) || null;
    if (!m) return null;
    return {
      symbol: m.symbol,
      base: m.base,
      quote: m.quote,
      active: m.active !== false,
      type: m.type || (m.spot ? 'spot' : m.swap ? 'swap' : 'future'),
      spot: !!m.spot,
      future: !!m.future,
      swap: !!m.swap,
      precision: m.precision || {},
      limits: m.limits || {},
    };
  }

  /**
   * Order book normalizado (bids/asks)
   */
  static async fetchOrderBook(
    connectionId: string,
    userId: string,
    tenantId: string,
    symbol: string,
    limit?: number
  ): Promise<ExchangeOrderBook> {
    const exchange = await this.getCCXTInstance(connectionId, userId, tenantId);
    const ob = await exchange.fetchOrderBook(symbol, limit);
    return {
      symbol,
      timestamp: ob.timestamp,
      datetime: ob.datetime,
      bids: ob.bids || [],
      asks: ob.asks || [],
    };
  }

  /**
   * Trades normalizados
   */
  static async fetchTrades(
    connectionId: string,
    userId: string,
    tenantId: string,
    symbol: string,
    since?: number,
    limit?: number
  ): Promise<ExchangeTrade[]> {
    const exchange = await this.getCCXTInstance(connectionId, userId, tenantId);
    const trades = await exchange.fetchTrades(symbol, since, limit);
    return (trades || []).map((t: any) => ({
      id: t.id,
      symbol: t.symbol,
      timestamp: t.timestamp,
      datetime: t.datetime,
      price: t.price,
      amount: t.amount,
      cost: t.cost,
      side: t.side,
      takerOrMaker: t.takerOrMaker,
    }));
  }

  /**
   * OHLCV normalizado (lista de objetos)
   */
  static async fetchOHLCV(
    connectionId: string,
    userId: string,
    tenantId: string,
    symbol: string,
    timeframe: string,
    since?: number,
    limit?: number
  ): Promise<ExchangeCandle[]> {
    const exchange = await this.getCCXTInstance(connectionId, userId, tenantId);
    if (!exchange.has || !exchange.has.fetchOHLCV) {
      throw new BadRequestError(`Exchange ${exchange.id} does not support OHLCV`);
    }
    const rows: any[] = await exchange.fetchOHLCV(symbol, timeframe, since, limit);
    return rows.map((r: any) => ({
      symbol,
      timeframe,
      timestamp: r[0],
      open: r[1],
      high: r[2],
      low: r[3],
      close: r[4],
      volume: r[5],
    }));
  }

  /**
   * Fetch balances
   */
  static async fetchBalances(
    connectionId: string,
    userId: string,
    tenantId: string
  ): Promise<ExchangeBalance[]> {
    logger.info('Fetching balances', { connectionId });

    const exchange = await this.getCCXTInstance(connectionId, userId, tenantId);
    const balance = await exchange.fetchBalance();

    const balances: ExchangeBalance[] = [];
    for (const [currency, amounts] of Object.entries(balance)) {
      if (currency === 'info' || currency === 'free' || currency === 'used' || currency === 'total') {
        continue;
      }

      const typedAmounts = amounts as any;
      if (typedAmounts.total > 0) {
        balances.push({
          currency,
          free: typedAmounts.free || 0,
          used: typedAmounts.used || 0,
          total: typedAmounts.total || 0,
        });
      }
    }

    // Update cached balances
    await db
      .update(exchangeConnections)
      .set({
        balances: balances as any,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(exchangeConnections.id, connectionId));

    return balances;
  }

  /**
   * Fetch ticker
   */
  static async fetchTicker(
    connectionId: string,
    userId: string,
    tenantId: string,
    symbol: string
  ): Promise<ExchangeTicker> {
    logger.info('Fetching ticker', { connectionId, symbol });

    const exchange = await this.getCCXTInstance(connectionId, userId, tenantId);
    const ticker = await exchange.fetchTicker(symbol);

    return {
      symbol: ticker.symbol,
      timestamp: ticker.timestamp || Date.now(),
      datetime: ticker.datetime || new Date().toISOString(),
      high: ticker.high || 0,
      low: ticker.low || 0,
      bid: ticker.bid || 0,
      ask: ticker.ask || 0,
      last: ticker.last || 0,
      close: ticker.close || 0,
      baseVolume: ticker.baseVolume || 0,
      quoteVolume: ticker.quoteVolume || 0,
      percentage: ticker.percentage || 0,
    };
  }

  /**
   * Delete connection
   */
  static async deleteConnection(id: string, userId: string, tenantId: string) {
    logger.info('Deleting exchange connection', { connectionId: id });

    await db
      .update(exchangeConnections)
      .set({
        status: 'disabled',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(exchangeConnections.id, id),
          eq(exchangeConnections.userId, userId),
          eq(exchangeConnections.tenantId, tenantId)
        )
      );

    logger.info('Exchange connection deleted', { connectionId: id });
  }

  /**
   * Fetch positions from exchange
   */
  static async fetchPositions(
    connectionId: string,
    userId: string,
    tenantId: string,
    symbol?: string
  ): Promise<ExchangePosition[]> {
    logger.info('Fetching positions', { connectionId, symbol });

    const exchange = await this.getCCXTInstance(connectionId, userId, tenantId);

    // Check if exchange supports fetching positions
    if (!exchange.has['fetchPositions']) {
      throw new BadRequestError(
        `Exchange ${exchange.id} does not support fetching positions`
      );
    }

    // Fetch positions from exchange
    const ccxtPositions = symbol
      ? await exchange.fetchPositions([symbol])
      : await exchange.fetchPositions();

    // Map CCXT positions to our format
    const positions: ExchangePosition[] = ccxtPositions
      .filter((pos) => pos.contracts !== undefined && pos.contracts > 0)
      .map((pos) => ({
        symbol: pos.symbol,
        id: pos.id,
        timestamp: pos.timestamp,
        datetime: pos.datetime,
        contracts: pos.contracts,
        contractSize: pos.contractSize,
        side: (pos.side === 'long' ? 'long' : 'short') as 'long' | 'short',
        notional: pos.notional,
        leverage: pos.leverage,
        unrealizedPnl: pos.unrealizedPnl,
        realizedPnl: pos.realizedPnl,
        collateral: pos.collateral,
        entryPrice: pos.entryPrice,
        markPrice: pos.markPrice,
        liquidationPrice: pos.liquidationPrice,
        marginMode: pos.marginMode,
        hedged: pos.hedged,
        maintenanceMargin: pos.maintenanceMargin,
        maintenanceMarginPercentage: pos.maintenanceMarginPercentage,
        initialMargin: pos.initialMargin,
        initialMarginPercentage: pos.initialMarginPercentage,
        marginRatio: pos.marginRatio,
        lastUpdateTimestamp: pos.lastUpdateTimestamp,
        lastPrice: pos.lastPrice,
        stopLossPrice: pos.stopLossPrice,
        takeProfitPrice: pos.takeProfitPrice,
        percentage: pos.percentage,
        info: pos.info,
      }));

    logger.info('Positions fetched successfully', {
      connectionId,
      symbol,
      positionsCount: positions.length,
    });

    return positions;
  }
}
