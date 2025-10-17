/**
 * @fileoverview Abstract base class for exchange WebSocket adapters
 * @module market-data/websocket/base-adapter
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type {
  IExchangeAdapter,
  ExchangeId,
  ConnectionConfig,
  ConnectionState,
  ConnectionStatus,
  SubscriptionRequest,
  ExchangeEventName,
  ExchangeEventListener,
  ExchangeEventMap,
  ConnectionMetrics,
} from './types';
import { ReconnectionStrategy } from './reconnection-strategy';
import { ConnectionError, TimeoutError, MessageParsingError } from './errors';

/**
 * Abstract base adapter implementing common WebSocket logic
 *
 * Subclasses must implement:
 * - formatSubscriptionMessage()
 * - formatUnsubscriptionMessage()
 * - parseMessage()
 * - getWebSocketUrl()
 */
export abstract class BaseExchangeAdapter extends EventEmitter implements IExchangeAdapter {
  public readonly exchangeId: ExchangeId;
  protected readonly config: ConnectionConfig;
  protected ws: WebSocket | null = null;
  protected reconnectionStrategy: ReconnectionStrategy;

  private _state: ConnectionState = 'DISCONNECTED' as ConnectionState;
  private _connectedAt?: number;
  private _subscriptions: Set<string> = new Set();
  private _lastError?: any;
  private _reconnectAttempts = 0;

  private pingInterval?: NodeJS.Timeout;
  private pongTimeout?: NodeJS.Timeout;
  private connectionTimeout?: NodeJS.Timeout;
  private lastPingTimestamp?: number;
  private lastPongTimestamp?: number;

  private metrics: ConnectionMetrics;

  constructor(exchangeId: ExchangeId, config: ConnectionConfig) {
    super();
    this.exchangeId = exchangeId;
    this.config = config;
    this.reconnectionStrategy = new ReconnectionStrategy(config.reconnection);
    this.metrics = this.initializeMetrics();
  }

  // ===== Public API =====

  public get status(): ConnectionStatus {
    return {
      state: this._state,
      exchange: this.exchangeId,
      connectedAt: this._connectedAt,
      reconnectAttempts: this._reconnectAttempts,
      lastError: this._lastError,
      subscriptions: Array.from(this._subscriptions),
    };
  }

  public get isConnected(): boolean {
    return this._state === 'CONNECTED' && this.ws?.readyState === WebSocket.OPEN;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    this.setState('CONNECTING' as ConnectionState);

    try {
      await this.establishConnection();
      this.setState('CONNECTED' as ConnectionState);
      this._connectedAt = Date.now();
      this._reconnectAttempts = 0;
      this.reconnectionStrategy.reset();
      this.startHeartbeat();

      this.emitTypedEvent('connected', {
        exchange: this.exchangeId,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.setState('ERROR' as ConnectionState);
      const connectionError = new ConnectionError(
        this.exchangeId,
        'Failed to establish connection',
        error as Error
      );
      this._lastError = connectionError.toJSON();
      this.emitTypedEvent('error', connectionError.toJSON());
      throw connectionError;
    }
  }

  public async disconnect(code = 1000, reason = 'Client disconnect'): Promise<void> {
    this.stopHeartbeat();
    this.clearTimeouts();

    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }

    this.setState('DISCONNECTED' as ConnectionState);
    this._connectedAt = undefined;

    this.emitTypedEvent('disconnected', {
      exchange: this.exchangeId,
      timestamp: Date.now(),
      reason,
    });
  }

  public async subscribe(request: SubscriptionRequest): Promise<void> {
    if (!this.isConnected) {
      throw new ConnectionError(this.exchangeId, 'Cannot subscribe: not connected');
    }

    const subscriptionKey = this.getSubscriptionKey(request);

    if (this._subscriptions.has(subscriptionKey)) {
      return;
    }

    const message = this.formatSubscriptionMessage(request);
    this.sendMessage(message);
    this._subscriptions.add(subscriptionKey);
  }

  public async unsubscribe(request: SubscriptionRequest): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    const subscriptionKey = this.getSubscriptionKey(request);

    if (!this._subscriptions.has(subscriptionKey)) {
      return;
    }

    const message = this.formatUnsubscriptionMessage(request);
    this.sendMessage(message);
    this._subscriptions.delete(subscriptionKey);
  }

  public override on<T extends ExchangeEventName>(
    event: T,
    listener: ExchangeEventListener<T>
  ): this {
    return super.on(event, listener as any);
  }

  public override once<T extends ExchangeEventName>(
    event: T,
    listener: ExchangeEventListener<T>
  ): this {
    return super.once(event, listener as any);
  }

  public override off<T extends ExchangeEventName>(
    event: T,
    listener: ExchangeEventListener<T>
  ): this {
    return super.off(event, listener as any);
  }

  public async ping(): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new ConnectionError(this.exchangeId, 'Cannot ping: not connected');
    }

    return new Promise((resolve, reject) => {
      this.lastPingTimestamp = Date.now();

      const timeout = setTimeout(() => {
        reject(new TimeoutError(this.exchangeId, 'ping', this.config.pongTimeout));
      }, this.config.pongTimeout);

      this.ws!.ping((err: Error | undefined) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });

      this.ws!.once('pong', () => {
        clearTimeout(timeout);
        this.lastPongTimestamp = Date.now();
        resolve();
      });
    });
  }

  public getLatency(): number | null {
    if (!this.lastPingTimestamp || !this.lastPongTimestamp) {
      return null;
    }
    return this.lastPongTimestamp - this.lastPingTimestamp;
  }

  public terminate(): void {
    this.stopHeartbeat();
    this.clearTimeouts();

    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }

    this.setState('TERMINATED' as ConnectionState);
    this.removeAllListeners();
  }

  public getMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      uptime: this._connectedAt ? Date.now() - this._connectedAt : 0,
      averageLatency: this.getLatency() ?? 0,
      lastPingTimestamp: this.lastPingTimestamp ?? 0,
    };
  }

  // ===== Protected Abstract Methods =====

  protected abstract formatSubscriptionMessage(request: SubscriptionRequest): string;
  protected abstract formatUnsubscriptionMessage(request: SubscriptionRequest): string;
  protected abstract parseMessage(data: WebSocket.Data): void;
  protected abstract getWebSocketUrl(): string;

  // ===== Protected Helper Methods =====

  protected emitTypedEvent<T extends ExchangeEventName>(
    event: T,
    payload: ExchangeEventMap[T]
  ): void {
    this.emit(event, payload);
  }

  protected setState(newState: ConnectionState): void {
    const oldState = this._state;
    if (oldState !== newState) {
      this._state = newState;
      this.emitTypedEvent('stateChange', {
        from: oldState,
        to: newState,
        exchange: this.exchangeId,
      });
    }
  }

  protected sendMessage(message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new ConnectionError(this.exchangeId, 'WebSocket not open');
    }

    this.ws.send(message);
    this.metrics.messagesSent++;
  }

  protected getSubscriptionKey(request: SubscriptionRequest): string {
    return `${request.channel}:${request.symbol}`;
  }

  // ===== Private Methods =====

  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = this.getWebSocketUrl();
      this.ws = new WebSocket(url);

      this.connectionTimeout = setTimeout(() => {
        this.ws?.terminate();
        reject(new TimeoutError(this.exchangeId, 'connection', this.config.timeout));
      }, this.config.timeout);

      this.ws.on('open', () => {
        clearTimeout(this.connectionTimeout);
        resolve();
      });

      this.ws.on('message', (data) => {
        this.metrics.messagesReceived++;
        try {
          this.parseMessage(data);
        } catch (error) {
          const parseError = new MessageParsingError(
            this.exchangeId,
            data.toString(),
            error as Error
          );
          this.emitTypedEvent('error', parseError.toJSON());
        }
      });

      this.ws.on('error', (error) => {
        clearTimeout(this.connectionTimeout);
        this.metrics.errors++;
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        this.handleClose(code, reason.toString());
      });

      this.ws.on('pong', () => {
        this.lastPongTimestamp = Date.now();
        clearTimeout(this.pongTimeout);
      });
    });
  }

  private handleClose(code: number, reason: string): void {
    this.stopHeartbeat();
    this.ws = null;

    if (this._state === 'TERMINATED') {
      return;
    }

    this.emitTypedEvent('disconnected', {
      exchange: this.exchangeId,
      timestamp: Date.now(),
      reason: `Code ${code}: ${reason}`,
    });

    if (this.reconnectionStrategy.recordAttempt()) {
      this.attemptReconnection();
    } else {
      this.setState('ERROR' as ConnectionState);
      this._lastError = {
        code: 'MAX_RECONNECTIONS',
        message: 'Maximum reconnection attempts reached',
        exchange: this.exchangeId,
        timestamp: Date.now(),
        fatal: true,
      };
    }
  }

  private async attemptReconnection(): Promise<void> {
    this.setState('RECONNECTING' as ConnectionState);
    this._reconnectAttempts++;
    this.metrics.reconnections++;

    const delay = this.reconnectionStrategy.getNextDelay();

    this.emitTypedEvent('reconnecting', {
      exchange: this.exchangeId,
      attempt: this._reconnectAttempts,
      nextDelay: delay,
    });

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.connect();
      await this.resubscribeAll();
    } catch (error) {
      // Will trigger another reconnection attempt via close handler
    }
  }

  private async resubscribeAll(): Promise<void> {
    const subscriptions = Array.from(this._subscriptions);
    this._subscriptions.clear();

    for (const key of subscriptions) {
      const [channel, symbol] = key.split(':');
      await this.subscribe({ channel: channel as any, symbol });
    }
  }

  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      if (!this.isConnected) {
        return;
      }

      this.ping().catch(() => {
        this.ws?.terminate();
      });
    }, this.config.pingInterval);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = undefined;
    }
  }

  private clearTimeouts(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = undefined;
    }
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
