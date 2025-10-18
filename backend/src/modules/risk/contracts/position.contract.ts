/**
 * Position Service Contract
 * Interface for position-related operations used by Risk module
 * 
 * This contract defines the interface that Risk module expects
 * from the Positions module, ensuring loose coupling and
 * adherence to Clean Architecture principles.
 */

/**
 * Position data structure
 */
export interface Position {
  id: string;
  userId: string;
  tenantId: string;
  asset: string;
  side: 'long' | 'short';
  quantity: string;
  remainingQuantity: string;
  currentPrice: string;
  entryPrice: string;
  status: 'open' | 'closed' | 'cancelled';
  unrealizedPnl: string;
  realizedPnl: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Position summary for risk calculations
 */
export interface PositionSummary {
  totalValue: number;
  totalQuantity: number;
  averagePrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  side: 'long' | 'short';
  asset: string;
}

/**
 * Position Service Contract
 * Defines the interface for position-related operations
 */
export interface IPositionService {
  /**
   * Get all open positions for a user
   */
  getOpenPositions(userId: string, tenantId: string): Promise<Position[]>;

  /**
   * Get position by ID
   */
  getPositionById(positionId: string, userId: string, tenantId: string): Promise<Position | null>;

  /**
   * Get position summary for risk calculations
   */
  getPositionSummary(position: Position): PositionSummary;

  /**
   * Get position value in USD
   */
  getPositionValue(position: Position): number;

  /**
   * Get position side (long/short)
   */
  getPositionSide(position: Position): 'long' | 'short';

  /**
   * Get position asset symbol
   */
  getPositionAsset(position: Position): string;

  /**
   * Get position quantity
   */
  getPositionQuantity(position: Position): number;

  /**
   * Get position unrealized P&L
   */
  getPositionUnrealizedPnl(position: Position): number;

  /**
   * Get position realized P&L
   */
  getPositionRealizedPnl(position: Position): number;

  /**
   * Get total portfolio value from positions
   */
  getTotalPortfolioValue(positions: Position[]): number;

  /**
   * Get total long exposure from positions
   */
  getTotalLongExposure(positions: Position[]): number;

  /**
   * Get total short exposure from positions
   */
  getTotalShortExposure(positions: Position[]): number;

  /**
   * Get largest position by value
   */
  getLargestPosition(positions: Position[]): Position | null;

  /**
   * Get position count
   */
  getPositionCount(positions: Position[]): number;

  /**
   * Check if position is open
   */
  isPositionOpen(position: Position): boolean;

  /**
   * Get positions by asset
   */
  getPositionsByAsset(positions: Position[], asset: string): Position[];

  /**
   * Get positions by side
   */
  getPositionsBySide(positions: Position[], side: 'long' | 'short'): Position[];

  /**
   * Calculate position weight in portfolio
   */
  calculatePositionWeight(position: Position, totalPortfolioValue: number): number;

  /**
   * Get position risk metrics
   */
  getPositionRiskMetrics(position: Position): {
    value: number;
    weight: number;
    side: 'long' | 'short';
    asset: string;
    unrealizedPnl: number;
    realizedPnl: number;
  };
}

/**
 * Position Service Factory
 * Factory for creating position service instances
 */
export interface IPositionServiceFactory {
  createPositionService(): IPositionService;
}

/**
 * Position Service Configuration
 */
export interface PositionServiceConfig {
  enableCaching: boolean;
  cacheTtl: number;
  enableMetrics: boolean;
  enableLogging: boolean;
}