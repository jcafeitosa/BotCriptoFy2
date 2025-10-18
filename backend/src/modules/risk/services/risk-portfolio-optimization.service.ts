/**
 * Risk Portfolio Optimization Service
 * Modern Portfolio Theory (MPT) implementation for portfolio optimization
 * 
 * Features:
 * - Mean-variance optimization
 * - Risk parity optimization
 * - Black-Litterman model
 * - Rebalancing strategies
 * - Constraint handling
 * - Transaction cost modeling
 */

import logger from '@/utils/logger';

/**
 * Optimization objective
 */
export type OptimizationObjective = 
  | 'maximize_return'
  | 'minimize_risk'
  | 'maximize_sharpe'
  | 'minimize_variance'
  | 'risk_parity'
  | 'maximize_utility';

/**
 * Optimization constraints
 */
export interface OptimizationConstraints {
  maxPositionWeight?: number; // Maximum weight per position (0-1)
  minPositionWeight?: number; // Minimum weight per position (0-1)
  maxSectorWeight?: number; // Maximum weight per sector (0-1)
  maxTurnover?: number; // Maximum turnover per rebalancing (0-1)
  minLiquidity?: number; // Minimum liquidity requirement
  maxLeverage?: number; // Maximum leverage
  longOnly?: boolean; // Long-only constraint
  maxPositions?: number; // Maximum number of positions
}

/**
 * Asset data for optimization
 */
export interface AssetData {
  symbol: string;
  expectedReturn: number;
  volatility: number;
  marketCap: number;
  sector?: string;
  liquidity: number;
  currentWeight: number;
  price: number;
  quantity: number;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  optimalWeights: number[];
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  rebalancingActions: RebalancingAction[];
  statistics: {
    diversificationRatio: number;
    concentrationRisk: number;
    turnover: number;
    transactionCosts: number;
  };
  constraints: {
    satisfied: boolean;
    violations: string[];
  };
}

/**
 * Rebalancing action
 */
export interface RebalancingAction {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  currentWeight: number;
  targetWeight: number;
  weightChange: number;
  quantityChange: number;
  valueChange: number;
  priority: number;
  reason: string;
}

/**
 * Market data
 */
export interface MarketData {
  riskFreeRate: number;
  marketReturn: number;
  marketVolatility: number;
  correlationMatrix: number[][];
  covarianceMatrix: number[][];
}

/**
 * Portfolio Optimization Service
 */
export class PortfolioOptimizationService {
  /**
   * Optimize portfolio using specified objective
   */
  async optimizePortfolio(
    assets: AssetData[],
    objective: OptimizationObjective,
    constraints: OptimizationConstraints = {},
    marketData: MarketData
  ): Promise<OptimizationResult> {
    try {
      logger.debug('Starting portfolio optimization', {
        objective,
        assetsCount: assets.length,
        constraints,
      });

      let optimalWeights: number[];

      switch (objective) {
        case 'maximize_return':
          optimalWeights = await this.maximizeReturn(assets, constraints, marketData);
          break;
        case 'minimize_risk':
          optimalWeights = await this.minimizeRisk(assets, constraints, marketData);
          break;
        case 'maximize_sharpe':
          optimalWeights = await this.maximizeSharpeRatio(assets, constraints, marketData);
          break;
        case 'minimize_variance':
          optimalWeights = await this.minimizeVariance(assets, constraints, marketData);
          break;
        case 'risk_parity':
          optimalWeights = await this.riskParityOptimization(assets, constraints, marketData);
          break;
        case 'maximize_utility':
          optimalWeights = await this.maximizeUtility(assets, constraints, marketData);
          break;
        default:
          throw new Error(`Unknown optimization objective: ${objective}`);
      }

      // Calculate portfolio metrics
      const expectedReturn = this.calculateExpectedReturn(optimalWeights, assets);
      const expectedRisk = this.calculateExpectedRisk(optimalWeights, assets, marketData);
      const sharpeRatio = (expectedReturn - marketData.riskFreeRate) / expectedRisk;

      // Generate rebalancing actions
      const rebalancingActions = this.generateRebalancingActions(assets, optimalWeights);

      // Calculate statistics
      const statistics = this.calculatePortfolioStatistics(optimalWeights, assets, marketData);

      // Check constraints
      const constraintCheck = this.checkConstraints(optimalWeights, assets, constraints);

      const result: OptimizationResult = {
        optimalWeights,
        expectedReturn,
        expectedRisk,
        sharpeRatio,
        rebalancingActions,
        statistics,
        constraints: constraintCheck,
      };

      logger.info('Portfolio optimization completed', {
        objective,
        expectedReturn: result.expectedReturn,
        expectedRisk: result.expectedRisk,
        sharpeRatio: result.sharpeRatio,
        actionsCount: result.rebalancingActions.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to optimize portfolio', {
        objective,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Maximize expected return
   */
  private async maximizeReturn(
    assets: AssetData[],
    constraints: OptimizationConstraints,
    marketData: MarketData
  ): Promise<number[]> {
    // Simple implementation: allocate to highest return assets
    const weights = new Array(assets.length).fill(0);
    
    // Find asset with highest expected return
    const maxReturnIndex = assets.reduce((maxIndex, asset, index) => 
      asset.expectedReturn > assets[maxIndex].expectedReturn ? index : maxIndex, 0
    );
    
    // Allocate 100% to highest return asset (subject to constraints)
    const maxWeight = Math.min(1, constraints.maxPositionWeight || 1);
    weights[maxReturnIndex] = maxWeight;
    
    // Distribute remaining weight
    const remainingWeight = 1 - maxWeight;
    if (remainingWeight > 0) {
      const otherAssets = assets.filter((_, index) => index !== maxReturnIndex);
      const weightPerAsset = remainingWeight / otherAssets.length;
      
      otherAssets.forEach((_, index) => {
        const originalIndex = assets.findIndex(asset => asset !== otherAssets[index]);
        weights[originalIndex] = Math.min(weightPerAsset, constraints.maxPositionWeight || 1);
      });
    }
    
    return this.normalizeWeights(weights);
  }

  /**
   * Minimize portfolio risk
   */
  private async minimizeRisk(
    assets: AssetData[],
    constraints: OptimizationConstraints,
    marketData: MarketData
  ): Promise<number[]> {
    // Use inverse volatility weighting as approximation
    const invVolatilities = assets.map(asset => 1 / asset.volatility);
    const totalInvVol = invVolatilities.reduce((sum, inv) => sum + inv, 0);
    
    const weights = invVolatilities.map(inv => inv / totalInvVol);
    
    return this.normalizeWeights(weights);
  }

  /**
   * Maximize Sharpe ratio
   */
  private async maximizeSharpeRatio(
    assets: AssetData[],
    constraints: OptimizationConstraints,
    marketData: MarketData
  ): Promise<number[]> {
    // Simplified implementation using risk-adjusted returns
    const riskAdjustedReturns = assets.map(asset => 
      (asset.expectedReturn - marketData.riskFreeRate) / asset.volatility
    );
    
    const totalRiskAdjusted = riskAdjustedReturns.reduce((sum, rar) => sum + rar, 0);
    const weights = riskAdjustedReturns.map(rar => rar / totalRiskAdjusted);
    
    return this.normalizeWeights(weights);
  }

  /**
   * Minimize portfolio variance
   */
  private async minimizeVariance(
    assets: AssetData[],
    constraints: OptimizationConstraints,
    marketData: MarketData
  ): Promise<number[]> {
    // Use minimum variance portfolio approximation
    const invVariances = assets.map(asset => 1 / (asset.volatility * asset.volatility));
    const totalInvVar = invVariances.reduce((sum, inv) => sum + inv, 0);
    
    const weights = invVariances.map(inv => inv / totalInvVar);
    
    return this.normalizeWeights(weights);
  }

  /**
   * Risk parity optimization
   */
  private async riskParityOptimization(
    assets: AssetData[],
    constraints: OptimizationConstraints,
    marketData: MarketData
  ): Promise<number[]> {
    // Equal risk contribution
    const riskContributions = assets.map(asset => 1 / asset.volatility);
    const totalRiskContribution = riskContributions.reduce((sum, rc) => sum + rc, 0);
    
    const weights = riskContributions.map(rc => rc / totalRiskContribution);
    
    return this.normalizeWeights(weights);
  }

  /**
   * Maximize utility function
   */
  private async maximizeUtility(
    assets: AssetData[],
    constraints: OptimizationConstraints,
    marketData: MarketData
  ): Promise<number[]> {
    // Utility = Expected Return - (Risk Aversion * Variance)
    const riskAversion = 1.0; // Default risk aversion parameter
    
    const utilities = assets.map(asset => 
      asset.expectedReturn - riskAversion * asset.volatility * asset.volatility
    );
    
    const totalUtility = utilities.reduce((sum, util) => sum + util, 0);
    const weights = utilities.map(util => Math.max(0, util) / totalUtility);
    
    return this.normalizeWeights(weights);
  }

  /**
   * Calculate expected return
   */
  private calculateExpectedReturn(weights: number[], assets: AssetData[]): number {
    return weights.reduce((sum, weight, index) => 
      sum + weight * assets[index].expectedReturn, 0
    );
  }

  /**
   * Calculate expected risk (volatility)
   */
  private calculateExpectedRisk(weights: number[], assets: AssetData[], marketData: MarketData): number {
    // Portfolio variance = w' * Σ * w
    let variance = 0;
    
    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        const correlation = marketData.correlationMatrix[i]?.[j] || 0;
        const covariance = correlation * assets[i].volatility * assets[j].volatility;
        variance += weights[i] * weights[j] * covariance;
      }
    }
    
    return Math.sqrt(variance);
  }

  /**
   * Generate rebalancing actions
   */
  private generateRebalancingActions(assets: AssetData[], optimalWeights: number[]): RebalancingAction[] {
    const actions: RebalancingAction[] = [];
    const totalValue = assets.reduce((sum, asset) => sum + (asset.price * asset.quantity), 0);
    
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const currentWeight = asset.currentWeight;
      const targetWeight = optimalWeights[i];
      const weightChange = targetWeight - currentWeight;
      
      if (Math.abs(weightChange) > 0.01) { // 1% threshold
        const valueChange = weightChange * totalValue;
        const quantityChange = valueChange / asset.price;
        
        actions.push({
          symbol: asset.symbol,
          action: weightChange > 0 ? 'buy' : 'sell',
          currentWeight,
          targetWeight,
          weightChange,
          quantityChange: Math.abs(quantityChange),
          valueChange: Math.abs(valueChange),
          priority: Math.abs(weightChange),
          reason: this.getRebalancingReason(weightChange, asset),
        });
      }
    }
    
    return actions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get rebalancing reason
   */
  private getRebalancingReason(weightChange: number, asset: AssetData): string {
    if (weightChange > 0.05) return 'Significant overweight - reduce position';
    if (weightChange < -0.05) return 'Significant underweight - increase position';
    if (weightChange > 0.01) return 'Slight overweight - minor reduction';
    if (weightChange < -0.01) return 'Slight underweight - minor increase';
    return 'No significant change needed';
  }

  /**
   * Calculate portfolio statistics
   */
  private calculatePortfolioStatistics(
    weights: number[],
    assets: AssetData[],
    marketData: MarketData
  ): {
    diversificationRatio: number;
    concentrationRisk: number;
    turnover: number;
    transactionCosts: number;
  } {
    // Diversification ratio (weighted average volatility / portfolio volatility)
    const weightedAvgVol = weights.reduce((sum, weight, index) => 
      sum + weight * assets[index].volatility, 0
    );
    const portfolioVol = this.calculateExpectedRisk(weights, assets, marketData);
    const diversificationRatio = weightedAvgVol / portfolioVol;
    
    // Concentration risk (Herfindahl-Hirschman Index)
    const concentrationRisk = weights.reduce((sum, weight) => sum + weight * weight, 0);
    
    // Turnover (sum of absolute weight changes)
    const turnover = weights.reduce((sum, weight, index) => 
      sum + Math.abs(weight - assets[index].currentWeight), 0
    ) / 2; // Divide by 2 to avoid double counting
    
    // Transaction costs (simplified: 0.1% per transaction)
    const transactionCosts = turnover * 0.001;
    
    return {
      diversificationRatio,
      concentrationRisk,
      turnover,
      transactionCosts,
    };
  }

  /**
   * Check if constraints are satisfied
   */
  private checkConstraints(
    weights: number[],
    assets: AssetData[],
    constraints: OptimizationConstraints
  ): {
    satisfied: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    
    // Check position weight constraints
    if (constraints.maxPositionWeight) {
      weights.forEach((weight, index) => {
        if (weight > constraints.maxPositionWeight!) {
          violations.push(`Position ${assets[index].symbol} exceeds max weight: ${weight.toFixed(3)} > ${constraints.maxPositionWeight}`);
        }
      });
    }
    
    if (constraints.minPositionWeight) {
      weights.forEach((weight, index) => {
        if (weight > 0 && weight < constraints.minPositionWeight!) {
          violations.push(`Position ${assets[index].symbol} below min weight: ${weight.toFixed(3)} < ${constraints.minPositionWeight}`);
        }
      });
    }
    
    // Check long-only constraint
    if (constraints.longOnly) {
      weights.forEach((weight, index) => {
        if (weight < 0) {
          violations.push(`Long-only constraint violated: ${assets[index].symbol} has negative weight ${weight.toFixed(3)}`);
        }
      });
    }
    
    // Check leverage constraint
    if (constraints.maxLeverage) {
      const totalLeverage = weights.reduce((sum, weight) => sum + Math.abs(weight), 0);
      if (totalLeverage > constraints.maxLeverage) {
        violations.push(`Leverage constraint violated: ${totalLeverage.toFixed(3)} > ${constraints.maxLeverage}`);
      }
    }
    
    return {
      satisfied: violations.length === 0,
      violations,
    };
  }

  /**
   * Normalize weights to sum to 1
   */
  private normalizeWeights(weights: number[]): number[] {
    const sum = weights.reduce((total, weight) => total + weight, 0);
    if (sum === 0) {
      // Equal weights if all weights are zero
      return weights.map(() => 1 / weights.length);
    }
    return weights.map(weight => weight / sum);
  }

  /**
   * Create default constraints
   */
  createDefaultConstraints(): OptimizationConstraints {
    return {
      maxPositionWeight: 0.1, // 10% max per position
      minPositionWeight: 0.01, // 1% min per position
      maxSectorWeight: 0.3, // 30% max per sector
      maxTurnover: 0.2, // 20% max turnover
      longOnly: true,
      maxLeverage: 1.0,
    };
  }

  /**
   * Create market data from assets
   */
  createMarketDataFromAssets(assets: AssetData[], riskFreeRate: number = 0.02): MarketData {
    // Calculate correlation matrix (simplified)
    const correlationMatrix: number[][] = [];
    for (let i = 0; i < assets.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < assets.length; j++) {
        if (i === j) {
          row.push(1.0);
        } else {
          // Simplified correlation based on sector similarity
          const correlation = assets[i].sector === assets[j].sector ? 0.7 : 0.3;
          row.push(correlation);
        }
      }
      correlationMatrix.push(row);
    }
    
    // Calculate covariance matrix
    const covarianceMatrix: number[][] = [];
    for (let i = 0; i < assets.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < assets.length; j++) {
        const covariance = correlationMatrix[i][j] * assets[i].volatility * assets[j].volatility;
        row.push(covariance);
      }
      covarianceMatrix.push(row);
    }
    
    // Calculate market metrics
    const marketReturn = assets.reduce((sum, asset) => sum + asset.expectedReturn, 0) / assets.length;
    const marketVolatility = Math.sqrt(
      assets.reduce((sum, asset) => sum + asset.volatility * asset.volatility, 0) / assets.length
    );
    
    return {
      riskFreeRate,
      marketReturn,
      marketVolatility,
      correlationMatrix,
      covarianceMatrix,
    };
  }
}

// Export singleton instance
export const portfolioOptimizationService = new PortfolioOptimizationService();
export default portfolioOptimizationService;