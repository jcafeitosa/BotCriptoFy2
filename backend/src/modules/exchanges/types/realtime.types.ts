/**
 * Realtime/WebSocket connection types (centralizado no módulo Exchanges)
 */

export interface ReconnectionConfig {
  readonly maxAttempts: number; // 0 = infinito
  readonly initialDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
  readonly jitterFactor: number; // 0..1
}

export interface ConnectionConfig {
  /** WebSocket URL */
  readonly url: string;
  /** Connection timeout em ms */
  readonly timeout: number;
  /** Ping interval em ms */
  readonly pingInterval: number;
  /** Pong timeout em ms */
  readonly pongTimeout: number;
  /** Estratégia de reconexão */
  readonly reconnection: ReconnectionConfig;
}

