/**
 * Notification Service Contract
 * Interface for notification operations used by Risk module
 * 
 * This contract defines the interface that Risk module expects
 * from the Notifications module, ensuring loose coupling and
 * adherence to Clean Architecture principles.
 */

/**
 * Risk alert data structure
 */
export interface RiskAlert {
  id: string;
  userId: string;
  tenantId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  currentValue: number;
  limitValue: number;
  limitType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification request for risk alerts
 */
export interface RiskNotificationRequest {
  userId: string;
  tenantId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  channels: ('email' | 'push' | 'in_app' | 'telegram' | 'webhook' | 'slack')[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

/**
 * Notification result
 */
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  channels: {
    channel: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
  errors?: string[];
}

/**
 * Notification Service Contract
 * Defines the interface for notification operations
 */
export interface INotificationService {
  /**
   * Send risk alert notification
   */
  sendRiskAlert(alert: RiskAlert): Promise<NotificationResult>;

  /**
   * Send custom risk notification
   */
  sendCustomRiskNotification(request: RiskNotificationRequest): Promise<NotificationResult>;

  /**
   * Send risk limit violation alert
   */
  sendRiskLimitViolationAlert(
    userId: string,
    tenantId: string,
    limitType: string,
    currentValue: number,
    limitValue: number,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<NotificationResult>;

  /**
   * Send drawdown alert
   */
  sendDrawdownAlert(
    userId: string,
    tenantId: string,
    currentDrawdown: number,
    maxDrawdown: number,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<NotificationResult>;

  /**
   * Send large position alert
   */
  sendLargePositionAlert(
    userId: string,
    tenantId: string,
    positionSize: number,
    maxPositionSize: number,
    asset: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<NotificationResult>;

  /**
   * Send correlation alert
   */
  sendCorrelationAlert(
    userId: string,
    tenantId: string,
    correlation: number,
    maxCorrelation: number,
    assets: string[],
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<NotificationResult>;

  /**
   * Send volatility alert
   */
  sendVolatilityAlert(
    userId: string,
    tenantId: string,
    currentVolatility: number,
    maxVolatility: number,
    asset: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<NotificationResult>;

  /**
   * Send liquidity alert
   */
  sendLiquidityAlert(
    userId: string,
    tenantId: string,
    currentLiquidity: number,
    minLiquidity: number,
    asset: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<NotificationResult>;

  /**
   * Send portfolio optimization alert
   */
  sendPortfolioOptimizationAlert(
    userId: string,
    tenantId: string,
    optimizationResult: {
      expectedReturn: number;
      expectedRisk: number;
      sharpeRatio: number;
      rebalancingActions: any[];
    },
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<NotificationResult>;

  /**
   * Send stress test alert
   */
  sendStressTestAlert(
    userId: string,
    tenantId: string,
    stressTestResult: {
      scenario: string;
      portfolioValue: number;
      lossAmount: number;
      lossPercent: number;
      probability: number;
    },
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<NotificationResult>;

  /**
   * Send Monte Carlo VaR alert
   */
  sendMonteCarloVaRAlert(
    userId: string,
    tenantId: string,
    varResult: {
      var95: number;
      var99: number;
      var999: number;
      expectedShortfall95: number;
      expectedShortfall99: number;
      expectedShortfall999: number;
    },
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<NotificationResult>;

  /**
   * Get notification preferences for user
   */
  getNotificationPreferences(userId: string, tenantId: string): Promise<{
    channels: string[];
    frequency: string;
    severity: string[];
    enabled: boolean;
  }>;

  /**
   * Update notification preferences for user
   */
  updateNotificationPreferences(
    userId: string,
    tenantId: string,
    preferences: {
      channels?: string[];
      frequency?: string;
      severity?: string[];
      enabled?: boolean;
    }
  ): Promise<boolean>;

  /**
   * Get notification history for user
   */
  getNotificationHistory(
    userId: string,
    tenantId: string,
    limit?: number,
    offset?: number
  ): Promise<{
    notifications: any[];
    total: number;
    hasMore: boolean;
  }>;

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string, userId: string): Promise<boolean>;

  /**
   * Mark all notifications as read for user
   */
  markAllNotificationsAsRead(userId: string, tenantId: string): Promise<boolean>;
}

/**
 * Notification Service Factory
 * Factory for creating notification service instances
 */
export interface INotificationServiceFactory {
  createNotificationService(): INotificationService;
}

/**
 * Notification Service Configuration
 */
export interface NotificationServiceConfig {
  enableEmail: boolean;
  enablePush: boolean;
  enableInApp: boolean;
  enableTelegram: boolean;
  enableWebhook: boolean;
  enableSlack: boolean;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
  enableMetrics: boolean;
}