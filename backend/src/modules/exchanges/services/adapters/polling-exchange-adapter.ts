import { EventEmitter } from 'events';
import type {
  IExchangeAdapter,
  ExchangeId,
  ConnectionConfig,
  ConnectionStatus,
  SubscriptionRequest,
  ExchangeEventName,
  ExchangeEventListener,
  ExchangeEventMap,
  ConnectionMetrics,
} from '@/modules/market-data/websocket/types';
import { ConnectionState } from '@/modules/market-data/websocket/types';
import { ExchangeService } from '../exchange.service';
import { ConnectionError } from '@/modules/market-data/websocket/errors';
import logger from '@/utils/logger';

type SubscriptionTimer = {
  readonly key: string;
  readonly request: SubscriptionRequest;
  timer: NodeJS.Timeout;
};

const DEFAULT_POLL_INTERVAL = 3_000;

export class PollingExchangeAdapter extends EventEmitter implements IExchangeAdapter {
  public readonly exchangeId: ExchangeId;
  private readonly config: ConnectionConfig;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private connectedAt?: number;
  private subscriptions: Map<string, SubscriptionTimer> = new Map();
  private metrics: ConnectionMetrics;
  private lastLatency: number | null = null;
  private isTerminated = false;
  private client: any | null = null;

  constructor(exchangeId: ExchangeId, config: ConnectionConfig) {
    super();
    this.exchangeId = exchangeId;
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  public get status(): ConnectionStatus {
    return {
      state: this.state,
      exchange: this.exchangeId,
      connectedAt: this.connectedAt,
      reconnectAttempts: 0,
      lastError: undefined,
      subscriptions: Array.from(this.subscriptions.keys()),
    };
  }

  public get isConnected(): boolean {
    return this.state === 'CONNECTED';
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;
    if (this.isTerminated) {
      throw new ConnectionError(this.exchangeId, 'Adapter has been terminated');
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      this.client = ExchangeService.buildCcxtClient(this.exchangeId);
      this.connectedAt = Date.now();
      this.metrics = this.initializeMetrics();
      this.setState(ConnectionState.CONNECTED);
      this.emitTyped('connected', { exchange: this.exchangeId, timestamp: Date.now() });
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize polling exchange adapter', {
        exchangeId: this.exchangeId,
        error: message,
      });
      throw new ConnectionError(this.exchangeId, message, error instanceof Error ? error : undefined);
    }
  }

  public async disconnect(): Promise<void> {
    for (const timer of this.subscriptions.values()) {
      clearInterval(timer.timer);
    }
    this.subscriptions.clear();
    this.client = null;
    this.setState(ConnectionState.DISCONNECTED);
    this.emitTyped('disconnected', { exchange: this.exchangeId, timestamp: Date.now() });
  }

  public async terminate(): Promise<void> {
    this.isTerminated = true;
    await this.disconnect();
    this.setState(ConnectionState.TERMINATED);
  }

  public override on<T extends ExchangeEventName>(event: T, listener: ExchangeEventListener<T>): this {
    return super.on(event, listener as any);
  }

  public override once<T extends ExchangeEventName>(event: T, listener: ExchangeEventListener<T>): this {
    return super.once(event, listener as any);
  }

  public override off<T extends ExchangeEventName>(event: T, listener: ExchangeEventListener<T>): this {
    return super.off(event, listener as any);
  }

  public async subscribe(request: SubscriptionRequest): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new ConnectionError(this.exchangeId, 'Cannot subscribe before connecting');
    }

    const key = this.subscriptionKey(request);
    if (this.subscriptions.has(key)) {
      return;
    }

    const interval = Math.max(1_000, Number(request.params?.pollInterval ?? DEFAULT_POLL_INTERVAL));

    const executePoll = async () => {
      try {
        await this.pollChannel(request);
        this.metrics.messagesReceived += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.metrics.errors += 1;
        logger.error('Polling error', {
          exchangeId: this.exchangeId,
          channel: request.channel,
          symbol: request.symbol,
          error: message,
        });
        this.emitTyped('error', {
          code: 'POLL_ERROR',
          message,
          exchange: this.exchangeId,
          timestamp: Date.now(),
          fatal: false,
        });
      }
    };

    // Immediate poll then schedule interval
    await executePoll();
    const timer = setInterval(executePoll, interval);
    this.subscriptions.set(key, { key, request, timer });
  }

  public async unsubscribe(request: SubscriptionRequest): Promise<void> {
    const key = this.subscriptionKey(request);
    const existing = this.subscriptions.get(key);
    if (!existing) {
      return;
    }

    clearInterval(existing.timer);
    this.subscriptions.delete(key);
  }

  public async ping(): Promise<void> {
    if (!this.client) {
      throw new ConnectionError(this.exchangeId, 'Cannot ping before connecting');
    }

    const start = Date.now();
    try {
      if (typeof this.client.fetchTime === 'function') {
        await this.client.fetchTime();
      } else {
        await this.client.fetchStatus?.();
      }
      const latency = Date.now() - start;
      this.lastLatency = latency;
      this.metrics.averageLatency = this.metrics.averageLatency
        ? (this.metrics.averageLatency + latency) / 2
        : latency;
      this.metrics.lastPingTimestamp = Date.now();
    } catch (error) {
      throw new ConnectionError(
        this.exchangeId,
        'Ping failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  public getLatency(): number | null {
    return this.lastLatency;
  }

  private async pollChannel(request: SubscriptionRequest): Promise<void> {
    if (!this.client) {
      throw new ConnectionError(this.exchangeId, 'Client is not initialized');
    }

    switch (request.channel) {
      case 'ticker': {
        const ticker = await this.client.fetchTicker(request.symbol);
        this.emitTyped('ticker', {
          symbol: ticker.symbol,
          exchange: this.exchangeId,
          timestamp: ticker.timestamp ?? Date.now(),
          last: Number(ticker.last ?? ticker.close ?? 0),
          bid: Number(ticker.bid ?? 0),
          ask: Number(ticker.ask ?? 0),
          high24h: Number(ticker.high ?? 0),
          low24h: Number(ticker.low ?? 0),
          volume24h: Number(ticker.baseVolume ?? ticker.quoteVolume ?? 0),
          change24h: Number(ticker.percentage ?? 0),
        });
        break;
      }
      case 'trades': {
        const trades = await this.client.fetchTrades(request.symbol, undefined, 10);
        for (const trade of trades) {
          this.emitTyped('trade', {
            id: String(trade.id ?? `${trade.timestamp ?? Date.now()}`),
            symbol: trade.symbol,
            exchange: this.exchangeId,
            timestamp: trade.timestamp ?? Date.now(),
            price: Number(trade.price ?? 0),
            amount: Number(trade.amount ?? 0),
            side: (trade.side ?? 'buy') as 'buy' | 'sell',
            takerOrMaker: (trade.takerOrMaker ?? 'taker') as 'taker' | 'maker',
          });
        }
        break;
      }
      case 'orderbook': {
        const depth = Number(request.params?.depth ?? 20);
        const orderbook = await this.client.fetchOrderBook(request.symbol, depth);
        this.emitTyped('orderbook', {
          symbol: request.symbol,
          exchange: this.exchangeId,
          timestamp: orderbook.timestamp ?? Date.now(),
          bids: orderbook.bids.slice(0, depth).map(([price, amount]: [number, number]) => ({ price, amount })),
          asks: orderbook.asks.slice(0, depth).map(([price, amount]: [number, number]) => ({ price, amount })),
        });
        break;
      }
      case 'candles': {
        const timeframe = (request.params?.timeframe as string) ?? '1m';
        const limit = Number(request.params?.limit ?? 50);
        const since = request.params?.since ? Number(request.params.since) : undefined;
        const candles = await this.client.fetchOHLCV(request.symbol, timeframe, since, limit);
        for (const candle of candles) {
          const [timestamp, open, high, low, close, volume] = candle;
          this.emitTyped('candle', {
            symbol: request.symbol,
            exchange: this.exchangeId,
            timestamp,
            timeframe,
            open,
            high,
            low,
            close,
            volume,
          });
        }
        break;
      }
      default:
        throw new Error(`Channel ${request.channel} is not supported by polling adapter`);
    }
  }

  private subscriptionKey(request: SubscriptionRequest): string {
    const paramsKey = request.params ? JSON.stringify(request.params) : '';
    return `${request.channel}:${request.symbol}:${paramsKey}`;
  }

  private setState(state: ConnectionState): void {
    const previous = this.state;
    this.state = state;
    if (previous !== state) {
      this.emitTyped('stateChange', {
        from: previous,
        to: state,
        exchange: this.exchangeId,
      });
    }
  }

  private emitTyped<T extends ExchangeEventName>(event: T, payload: ExchangeEventMap[T]): void {
    super.emit(event, payload);
  }

  private initializeMetrics(): ConnectionMetrics {
    return {
      exchange: this.exchangeId,
      uptime: 0,
      messagesReceived: 0,
      messagesSent: 0,
      reconnections: 0,
      errors: 0,
      averageLatency: 0,
      lastPingTimestamp: 0,
    };
  }
}
