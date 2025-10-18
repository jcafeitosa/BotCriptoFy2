/**
 * Risk Monte Carlo Service
 * Advanced risk analysis using Monte Carlo simulation
 * 
 * Features:
 * - Monte Carlo VaR calculation
 * - Portfolio scenario simulation
 * - Stress testing with random scenarios
 * - Confidence interval analysis
 * - Risk factor modeling
 */

import logger from '@/utils/logger';
import type { RiskMetrics } from '../types/risk.types';

/**
 * Monte Carlo configuration
 */
export interface MonteCarloConfig {
  simulations: number;
  timeHorizon: number; // days
  confidenceLevel: number; // 0.95, 0.99, etc.
  randomSeed?: number;
  enableAntitheticVariates: boolean;
  enableControlVariates: boolean;
}

/**
 * Monte Carlo VaR result
 */
export interface MonteCarloVaRResult {
  var95: number;
  var99: number;
  var999: number;
  expectedShortfall95: number;
  expectedShortfall99: number;
  expectedShortfall999: number;
  confidenceIntervals: {
    level95: [number, number];
    level99: [number, number];
    level999: [number, number];
  };
  simulationResults: number[];
  statistics: {
    mean: number;
    stdDev: number;
    skewness: number;
    kurtosis: number;
    min: number;
    max: number;
  };
}

/**
 * Portfolio scenario result
 */
export interface PortfolioScenarioResult {
  scenario: number;
  portfolioValue: number;
  returns: number[];
  riskFactors: Record<string, number>;
  probability: number;
}

/**
 * Stress test scenario
 */
export interface StressTestScenario {
  name: string;
  marketShock: number; // percentage
  volatilityShock: number; // percentage
  correlationShock: number; // percentage
  liquidityShock: number; // percentage
  probability: number;
}

/**
 * Risk factor model
 */
export interface RiskFactorModel {
  name: string;
  currentValue: number;
  volatility: number;
  drift: number;
  correlation: number;
  distribution: 'normal' | 'lognormal' | 't' | 'skewed_t';
  parameters?: Record<string, number>;
}

/**
 * Monte Carlo Risk Service
 */
export class MonteCarloRiskService {
  private defaultConfig: MonteCarloConfig = {
    simulations: 10000,
    timeHorizon: 1,
    confidenceLevel: 0.95,
    enableAntitheticVariates: true,
    enableControlVariates: false,
  };

  /**
   * Calculate Monte Carlo VaR
   */
  async calculateMonteCarloVaR(
    portfolioValue: number,
    positions: any[],
    riskFactors: RiskFactorModel[],
    config: Partial<MonteCarloConfig> = {}
  ): Promise<MonteCarloVaRResult> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      
      logger.debug('Starting Monte Carlo VaR calculation', {
        simulations: finalConfig.simulations,
        timeHorizon: finalConfig.timeHorizon,
        portfolioValue,
        positionsCount: positions.length,
        riskFactorsCount: riskFactors.length,
      });

      // Generate random scenarios
      const scenarios = this.generateScenarios(finalConfig, riskFactors);
      
      // Calculate portfolio returns for each scenario
      const portfolioReturns = this.calculatePortfolioReturns(scenarios, positions, riskFactors);
      
      // Calculate VaR and Expected Shortfall
      const var95 = this.calculateVaR(portfolioReturns, 0.95);
      const var99 = this.calculateVaR(portfolioReturns, 0.99);
      const var999 = this.calculateVaR(portfolioReturns, 0.999);
      
      const es95 = this.calculateExpectedShortfall(portfolioReturns, 0.95);
      const es99 = this.calculateExpectedShortfall(portfolioReturns, 0.99);
      const es999 = this.calculateExpectedShortfall(portfolioReturns, 0.999);
      
      // Calculate confidence intervals
      const confidenceIntervals = this.calculateConfidenceIntervals(portfolioReturns);
      
      // Calculate statistics
      const statistics = this.calculateStatistics(portfolioReturns);
      
      // Convert returns to absolute VaR values
      const absoluteVar95 = Math.abs(var95 * portfolioValue);
      const absoluteVar99 = Math.abs(var99 * portfolioValue);
      const absoluteVar999 = Math.abs(var999 * portfolioValue);
      const absoluteEs95 = Math.abs(es95 * portfolioValue);
      const absoluteEs99 = Math.abs(es99 * portfolioValue);
      const absoluteEs999 = Math.abs(es999 * portfolioValue);

      const result: MonteCarloVaRResult = {
        var95: absoluteVar95,
        var99: absoluteVar99,
        var999: absoluteVar999,
        expectedShortfall95: absoluteEs95,
        expectedShortfall99: absoluteEs99,
        expectedShortfall999: absoluteEs999,
        confidenceIntervals: {
          level95: [confidenceIntervals.level95[0] * portfolioValue, confidenceIntervals.level95[1] * portfolioValue],
          level99: [confidenceIntervals.level99[0] * portfolioValue, confidenceIntervals.level99[1] * portfolioValue],
          level999: [confidenceIntervals.level999[0] * portfolioValue, confidenceIntervals.level999[1] * portfolioValue],
        },
        simulationResults: portfolioReturns.map(r => r * portfolioValue),
        statistics: {
          mean: statistics.mean * portfolioValue,
          stdDev: statistics.stdDev * portfolioValue,
          skewness: statistics.skewness,
          kurtosis: statistics.kurtosis,
          min: statistics.min * portfolioValue,
          max: statistics.max * portfolioValue,
        },
      };

      logger.info('Monte Carlo VaR calculation completed', {
        var95: result.var95,
        var99: result.var99,
        var999: result.var999,
        simulations: finalConfig.simulations,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate Monte Carlo VaR', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Run stress test scenarios
   */
  async runStressTestScenarios(
    portfolioValue: number,
    positions: any[],
    riskFactors: RiskFactorModel[],
    scenarios: StressTestScenario[],
    config: Partial<MonteCarloConfig> = {}
  ): Promise<PortfolioScenarioResult[]> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      const results: PortfolioScenarioResult[] = [];

      logger.debug('Starting stress test scenarios', {
        scenariosCount: scenarios.length,
        portfolioValue,
        positionsCount: positions.length,
      });

      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        
        // Apply stress shocks to risk factors
        const stressedRiskFactors = this.applyStressShocks(riskFactors, scenario);
        
        // Generate scenarios with stressed factors
        const stressedScenarios = this.generateScenarios(finalConfig, stressedRiskFactors);
        
        // Calculate portfolio returns
        const portfolioReturns = this.calculatePortfolioReturns(stressedScenarios, positions, stressedRiskFactors);
        
        // Calculate scenario result
        const scenarioResult: PortfolioScenarioResult = {
          scenario: i + 1,
          portfolioValue: portfolioValue * (1 + portfolioReturns[0]), // Use first simulation
          returns: portfolioReturns,
          riskFactors: this.extractRiskFactorValues(stressedRiskFactors),
          probability: scenario.probability,
        };
        
        results.push(scenarioResult);
      }

      logger.info('Stress test scenarios completed', {
        scenariosCount: results.length,
        averagePortfolioValue: results.reduce((sum, r) => sum + r.portfolioValue, 0) / results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to run stress test scenarios', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate random scenarios
   */
  private generateScenarios(config: MonteCarloConfig, riskFactors: RiskFactorModel[]): number[][] {
    const scenarios: number[][] = [];
    const actualSimulations = config.enableAntitheticVariates ? config.simulations / 2 : config.simulations;
    
    for (let i = 0; i < actualSimulations; i++) {
      const scenario: number[] = [];
      
      for (const factor of riskFactors) {
        const randomValue = this.generateRandomValue(factor.distribution, factor.parameters);
        scenario.push(randomValue);
      }
      
      scenarios.push(scenario);
      
      // Add antithetic variate if enabled
      if (config.enableAntitheticVariates) {
        const antitheticScenario: number[] = [];
        for (const factor of riskFactors) {
          const antitheticValue = this.generateAntitheticValue(factor.distribution, scenario[riskFactors.indexOf(factor)]);
          antitheticScenario.push(antitheticValue);
        }
        scenarios.push(antitheticScenario);
      }
    }
    
    return scenarios;
  }

  /**
   * Generate random value based on distribution
   */
  private generateRandomValue(distribution: string, parameters?: Record<string, number>): number {
    const u1 = Math.random();
    const u2 = Math.random();
    
    switch (distribution) {
      case 'normal':
        return this.boxMullerTransform(u1, u2);
      case 'lognormal':
        const normal = this.boxMullerTransform(u1, u2);
        return Math.exp(normal);
      case 't':
        const df = parameters?.degreesOfFreedom || 5;
        return this.generateTDistribution(u1, u2, df);
      case 'skewed_t':
        const dfSkewed = parameters?.degreesOfFreedom || 5;
        const skewness = parameters?.skewness || 0;
        return this.generateSkewedTDistribution(u1, u2, dfSkewed, skewness);
      default:
        return this.boxMullerTransform(u1, u2);
    }
  }

  /**
   * Box-Muller transform for normal distribution
   */
  private boxMullerTransform(u1: number, u2: number): number {
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Generate t-distribution
   */
  private generateTDistribution(u1: number, u2: number, df: number): number {
    const normal = this.boxMullerTransform(u1, u2);
    const chi2 = this.generateChiSquare(df);
    return normal / Math.sqrt(chi2 / df);
  }

  /**
   * Generate skewed t-distribution
   */
  private generateSkewedTDistribution(u1: number, u2: number, df: number, skewness: number): number {
    const t = this.generateTDistribution(u1, u2, df);
    return t + skewness * (t * t - 1) / Math.sqrt(df);
  }

  /**
   * Generate chi-square distribution
   */
  private generateChiSquare(df: number): number {
    let sum = 0;
    for (let i = 0; i < df; i++) {
      const normal = this.boxMullerTransform(Math.random(), Math.random());
      sum += normal * normal;
    }
    return sum;
  }

  /**
   * Generate antithetic value
   */
  private generateAntitheticValue(distribution: string, originalValue: number): number {
    switch (distribution) {
      case 'normal':
      case 'lognormal':
        return -originalValue;
      case 't':
      case 'skewed_t':
        return -originalValue;
      default:
        return -originalValue;
    }
  }

  /**
   * Calculate portfolio returns for scenarios
   */
  private calculatePortfolioReturns(scenarios: number[][], positions: any[], riskFactors: RiskFactorModel[]): number[] {
    const returns: number[] = [];
    
    for (const scenario of scenarios) {
      let portfolioReturn = 0;
      
      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        const factorIndex = i % riskFactors.length;
        const factorReturn = scenario[factorIndex];
        
        // Calculate position return based on risk factor
        const positionValue = parseFloat(position.currentPrice) * parseFloat(position.remainingQuantity);
        const positionReturn = factorReturn * (positionValue / this.getTotalPortfolioValue(positions));
        
        portfolioReturn += positionReturn;
      }
      
      returns.push(portfolioReturn);
    }
    
    return returns;
  }

  /**
   * Calculate VaR
   */
  private calculateVaR(returns: number[], confidenceLevel: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    return sortedReturns[index] || 0;
  }

  /**
   * Calculate Expected Shortfall (CVaR)
   */
  private calculateExpectedShortfall(returns: number[], confidenceLevel: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, varIndex);
    
    if (tailReturns.length === 0) return 0;
    
    return tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  }

  /**
   * Calculate confidence intervals
   */
  private calculateConfidenceIntervals(returns: number[]): {
    level95: [number, number];
    level99: [number, number];
    level999: [number, number];
  } {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const n = sortedReturns.length;
    
    return {
      level95: [
        sortedReturns[Math.floor(0.025 * n)],
        sortedReturns[Math.floor(0.975 * n)]
      ],
      level99: [
        sortedReturns[Math.floor(0.005 * n)],
        sortedReturns[Math.floor(0.995 * n)]
      ],
      level999: [
        sortedReturns[Math.floor(0.0005 * n)],
        sortedReturns[Math.floor(0.9995 * n)]
      ],
    };
  }

  /**
   * Calculate statistics
   */
  private calculateStatistics(returns: number[]): {
    mean: number;
    stdDev: number;
    skewness: number;
    kurtosis: number;
    min: number;
    max: number;
  } {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
    const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length;
    
    return {
      mean,
      stdDev,
      skewness,
      kurtosis,
      min: Math.min(...returns),
      max: Math.max(...returns),
    };
  }

  /**
   * Apply stress shocks to risk factors
   */
  private applyStressShocks(riskFactors: RiskFactorModel[], scenario: StressTestScenario): RiskFactorModel[] {
    return riskFactors.map(factor => ({
      ...factor,
      volatility: factor.volatility * (1 + scenario.volatilityShock),
      correlation: factor.correlation * (1 + scenario.correlationShock),
    }));
  }

  /**
   * Extract risk factor values
   */
  private extractRiskFactorValues(riskFactors: RiskFactorModel[]): Record<string, number> {
    const values: Record<string, number> = {};
    riskFactors.forEach(factor => {
      values[factor.name] = factor.currentValue;
    });
    return values;
  }

  /**
   * Get total portfolio value
   */
  private getTotalPortfolioValue(positions: any[]): number {
    return positions.reduce((sum, pos) => {
      return sum + (parseFloat(pos.currentPrice) * parseFloat(pos.remainingQuantity));
    }, 0);
  }

  /**
   * Create default risk factors from positions
   */
  createDefaultRiskFactors(positions: any[]): RiskFactorModel[] {
    return positions.map((position, index) => ({
      name: `asset_${index}`,
      currentValue: parseFloat(position.currentPrice),
      volatility: 0.2 + Math.random() * 0.3, // 20-50% volatility
      drift: 0.0001, // 0.01% daily drift
      correlation: 0.3 + Math.random() * 0.4, // 30-70% correlation
      distribution: 'normal' as const,
    }));
  }

  /**
   * Create stress test scenarios
   */
  createDefaultStressScenarios(): StressTestScenario[] {
    return [
      {
        name: 'Market Crash',
        marketShock: -0.2,
        volatilityShock: 0.5,
        correlationShock: 0.3,
        liquidityShock: 0.2,
        probability: 0.05,
      },
      {
        name: 'Volatility Spike',
        marketShock: 0.0,
        volatilityShock: 1.0,
        correlationShock: 0.2,
        liquidityShock: 0.1,
        probability: 0.10,
      },
      {
        name: 'Liquidity Crisis',
        marketShock: -0.1,
        volatilityShock: 0.3,
        correlationShock: 0.1,
        liquidityShock: 0.5,
        probability: 0.15,
      },
      {
        name: 'Black Swan',
        marketShock: -0.4,
        volatilityShock: 1.5,
        correlationShock: 0.8,
        liquidityShock: 0.7,
        probability: 0.01,
      },
    ];
  }
}

// Export singleton instance
export const monteCarloRiskService = new MonteCarloRiskService();
export default monteCarloRiskService;