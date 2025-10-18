// @ts-nocheck
/**
 * Risk Module Contracts
 * Centralized exports for all contract interfaces
 * 
 * This module provides a single entry point for all contract interfaces
 * used by the Risk module, ensuring clean imports and better organization.
 */

// Position contracts
export type {
  Position,
  PositionSummary,
  IPositionService,
  IPositionServiceFactory,
  PositionServiceConfig,
} from './position.contract';

// Wallet contracts
export type {
  WalletSummary,
  PortfolioValueBreakdown,
  IWalletService,
  IWalletServiceFactory,
  WalletServiceConfig,
} from './wallet.contract';

// Notification contracts
export type {
  RiskAlert,
  RiskNotificationRequest,
  NotificationResult,
  INotificationService,
  INotificationServiceFactory,
  NotificationServiceConfig,
} from './notification.contract';

/**
 * Risk Dependencies Interface
 * Combined interface for all external dependencies
 */
export interface IRiskDependencies {
  positionService: IPositionService;
  walletService: IWalletService;
  notificationService: INotificationService;
}

/**
 * Risk Dependencies Factory Interface
 * Factory for creating all external dependencies
 */
export interface IRiskDependenciesFactory {
  createPositionService(): IPositionService;
  createWalletService(): IWalletService;
  createNotificationService(): INotificationService;
  createAllDependencies(): IRiskDependencies;
}

/**
 * Risk Dependencies Configuration
 * Configuration for all external dependencies
 */
export interface RiskDependenciesConfig {
  position: PositionServiceConfig;
  wallet: WalletServiceConfig;
  notification: NotificationServiceConfig;
}