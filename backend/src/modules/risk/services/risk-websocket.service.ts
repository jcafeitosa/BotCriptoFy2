/**
 * Risk WebSocket Service
 * Real-time risk alerts via WebSocket connections
 * 
 * Features:
 * - User-specific subscriptions
 * - Tenant-based filtering
 * - Alert broadcasting
 * - Connection management
 * - Heartbeat/ping-pong
 */

import { WebSocket } from 'ws';
import logger from '@/utils/logger';
import type { RiskAlert } from '../types/risk.types';

/**
 * WebSocket connection info
 */
interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  userId: string;
  tenantId: string;
  subscriptions: string[];
  lastPing: number;
  isAlive: boolean;
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType = 
  | 'risk_alert'
  | 'risk_metrics_update'
  | 'risk_profile_update'
  | 'risk_limit_update'
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'error';

/**
 * WebSocket message
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp: number;
  id?: string;
}

/**
 * Risk WebSocket Service
 */
export class RiskWebSocketService {
  private connections: Map<string, WebSocketConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private tenantConnections: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pingInterval = 30000; // 30 seconds

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Add new WebSocket connection
   */
  addConnection(ws: WebSocket, userId: string, tenantId: string): string {
    const connectionId = this.generateConnectionId();
    
    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      userId,
      tenantId,
      subscriptions: [],
      lastPing: Date.now(),
      isAlive: true,
    };

    // Store connection
    this.connections.set(connectionId, connection);

    // Add to user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    // Add to tenant connections
    if (!this.tenantConnections.has(tenantId)) {
      this.tenantConnections.set(tenantId, new Set());
    }
    this.tenantConnections.get(tenantId)!.add(connectionId);

    // Set up event handlers
    this.setupConnectionHandlers(connection);

    logger.info('WebSocket connection added', {
      connectionId,
      userId,
      tenantId,
      totalConnections: this.connections.size,
    });

    return connectionId;
  }

  /**
   * Remove WebSocket connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from user connections
    const userConnections = this.userConnections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }

    // Remove from tenant connections
    const tenantConnections = this.tenantConnections.get(connection.tenantId);
    if (tenantConnections) {
      tenantConnections.delete(connectionId);
      if (tenantConnections.size === 0) {
        this.tenantConnections.delete(connection.tenantId);
      }
    }

    // Close WebSocket if still open
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.close();
    }

    // Remove connection
    this.connections.delete(connectionId);

    logger.info('WebSocket connection removed', {
      connectionId,
      userId: connection.userId,
      tenantId: connection.tenantId,
      totalConnections: this.connections.size,
    });
  }

  /**
   * Send risk alert to user
   */
  async sendRiskAlert(userId: string, tenantId: string, alert: RiskAlert): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: 'risk_alert',
        data: {
          id: alert.id,
          alertType: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          limitType: alert.limitType,
          limitValue: alert.limitValue,
          currentValue: alert.currentValue,
          threshold: alert.threshold,
          createdAt: alert.createdAt,
        },
        timestamp: Date.now(),
      };

      await this.sendToUser(userId, message);
      
      logger.debug('Risk alert sent via WebSocket', {
        userId,
        alertId: alert.id,
        alertType: alert.alertType,
      });
    } catch (error) {
      logger.error('Failed to send risk alert via WebSocket', {
        userId,
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send risk metrics update
   */
  async sendRiskMetricsUpdate(userId: string, tenantId: string, metrics: any): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: 'risk_metrics_update',
        data: {
          portfolioValue: metrics.portfolioValue,
          openPositions: metrics.openPositions,
          riskLevel: metrics.riskLevel,
          overallRiskScore: metrics.overallRiskScore,
          valueAtRisk: metrics.valueAtRisk,
          expectedShortfall: metrics.expectedShortfall,
          sharpeRatio: metrics.sharpeRatio,
          sortinoRatio: metrics.sortinoRatio,
          calmarRatio: metrics.calmarRatio,
          concentrationRisk: metrics.concentrationRisk,
          correlationAverage: metrics.correlationAverage,
          calculatedAt: metrics.calculatedAt,
        },
        timestamp: Date.now(),
      };

      await this.sendToUser(userId, message);
      
      logger.debug('Risk metrics update sent via WebSocket', { userId });
    } catch (error) {
      logger.error('Failed to send risk metrics update via WebSocket', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send risk profile update
   */
  async sendRiskProfileUpdate(userId: string, tenantId: string, profile: any): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: 'risk_profile_update',
        data: {
          id: profile.id,
          riskTolerance: profile.riskTolerance,
          investmentHorizon: profile.investmentHorizon,
          maxDrawdown: profile.maxDrawdown,
          maxLeverage: profile.maxLeverage,
          maxPositionSize: profile.maxPositionSize,
          isActive: profile.isActive,
          updatedAt: profile.updatedAt,
        },
        timestamp: Date.now(),
      };

      await this.sendToUser(userId, message);
      
      logger.debug('Risk profile update sent via WebSocket', { userId });
    } catch (error) {
      logger.error('Failed to send risk profile update via WebSocket', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send risk limit update
   */
  async sendRiskLimitUpdate(userId: string, tenantId: string, limit: any): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: 'risk_limit_update',
        data: {
          id: limit.id,
          limitType: limit.limitType,
          limitValue: limit.limitValue,
          threshold: limit.threshold,
          severity: limit.severity,
          isActive: limit.isActive,
          updatedAt: limit.updatedAt,
        },
        timestamp: Date.now(),
      };

      await this.sendToUser(userId, message);
      
      logger.debug('Risk limit update sent via WebSocket', { userId });
    } catch (error) {
      logger.error('Failed to send risk limit update via WebSocket', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Broadcast to all connections in tenant
   */
  async broadcastToTenant(tenantId: string, message: WebSocketMessage): Promise<void> {
    try {
      const tenantConnections = this.tenantConnections.get(tenantId);
      if (!tenantConnections) return;

      const promises = Array.from(tenantConnections).map(connectionId => {
        const connection = this.connections.get(connectionId);
        if (connection && connection.isAlive) {
          return this.sendToConnection(connection, message);
        }
        return Promise.resolve();
      });

      await Promise.allSettled(promises);
      
      logger.debug('Message broadcasted to tenant', {
        tenantId,
        connectionCount: tenantConnections.size,
        messageType: message.type,
      });
    } catch (error) {
      logger.error('Failed to broadcast to tenant', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send message to specific user
   */
  private async sendToUser(userId: string, message: WebSocketMessage): Promise<void> {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections) return;

    const promises = Array.from(userConnections).map(connectionId => {
      const connection = this.connections.get(connectionId);
      if (connection && connection.isAlive) {
        return this.sendToConnection(connection, message);
      }
      return Promise.resolve();
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send message to specific connection
   */
  private async sendToConnection(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (connection.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket connection is not open'));
        return;
      }

      try {
        connection.ws.send(JSON.stringify(message), (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Set up connection event handlers
   */
  private setupConnectionHandlers(connection: WebSocketConnection): void {
    connection.ws.on('message', (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(connection, message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message', {
          connectionId: connection.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    connection.ws.on('pong', () => {
      connection.isAlive = true;
      connection.lastPing = Date.now();
    });

    connection.ws.on('close', () => {
      this.removeConnection(connection.id);
    });

    connection.ws.on('error', (error) => {
      logger.error('WebSocket connection error', {
        connectionId: connection.id,
        userId: connection.userId,
        error: error.message,
      });
      this.removeConnection(connection.id);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(connection: WebSocketConnection, message: WebSocketMessage): void {
    switch (message.type) {
      case 'ping':
        this.sendToConnection(connection, { type: 'pong', data: {}, timestamp: Date.now() });
        break;
      
      case 'subscribe':
        this.handleSubscribe(connection, message.data);
        break;
      
      case 'unsubscribe':
        this.handleUnsubscribe(connection, message.data);
        break;
      
      default:
        logger.warn('Unknown WebSocket message type', {
          connectionId: connection.id,
          messageType: message.type,
        });
    }
  }

  /**
   * Handle subscription request
   */
  private handleSubscribe(connection: WebSocketConnection, data: any): void {
    const { topics } = data;
    if (Array.isArray(topics)) {
      connection.subscriptions.push(...topics);
      logger.debug('User subscribed to topics', {
        connectionId: connection.id,
        userId: connection.userId,
        topics,
      });
    }
  }

  /**
   * Handle unsubscription request
   */
  private handleUnsubscribe(connection: WebSocketConnection, data: any): void {
    const { topics } = data;
    if (Array.isArray(topics)) {
      connection.subscriptions = connection.subscriptions.filter(topic => !topics.includes(topic));
      logger.debug('User unsubscribed from topics', {
        connectionId: connection.id,
        userId: connection.userId,
        topics,
      });
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((connection) => {
        if (!connection.isAlive) {
          logger.debug('Terminating dead connection', { connectionId: connection.id });
          this.removeConnection(connection.id);
          return;
        }

        connection.isAlive = false;
        connection.ws.ping();
      });
    }, this.pingInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    userConnections: number;
    tenantConnections: number;
    averageSubscriptions: number;
  } {
    const totalSubscriptions = Array.from(this.connections.values())
      .reduce((sum, conn) => sum + conn.subscriptions.length, 0);

    return {
      totalConnections: this.connections.size,
      userConnections: this.userConnections.size,
      tenantConnections: this.tenantConnections.size,
      averageSubscriptions: this.connections.size > 0 ? totalSubscriptions / this.connections.size : 0,
    };
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    this.stopHeartbeat();
    this.connections.forEach((connection) => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
    });
    this.connections.clear();
    this.userConnections.clear();
    this.tenantConnections.clear();
  }
}

// Export singleton instance
export const riskWebSocketService = new RiskWebSocketService();
export default riskWebSocketService;