/**
 * Pulse Indicator Service
 * ProfitPro-style momentum signals from order book
 *
 * Features:
 * - Real-time bullish/bearish momentum detection
 * - Signal strength calculation (0-100)
 * - Confidence scoring
 * - Multi-factor analysis (imbalance + pressure + momentum)
 * - Trend detection
 * - Divergence detection
 * - Signal filtering and validation
 */

import { db } from '@/db';
import { OrderBookSnapshotService } from './order-book-snapshot.service';
import { OrderBookImbalanceService } from './order-book-imbalance.service';
import { OrderBookAnalyticsService } from './order-book-analytics.service';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type {
  OrderBookSnapshot,
  OrderBookImbalance,
  PulseSignal,
  LiquidityScore,
} from '../types/order-book.types';

export class PulseIndicatorService {
  /**
   * Generate Pulse Signal from order book state
   * Combines imbalance, pressure, and momentum into single signal
   */
  static async generatePulseSignal(
    exchangeId: string,
    symbol: string
  ): Promise<PulseSignal> {
    try {
      // Get latest snapshot
      const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);
      if (!snapshot) {
        throw new BadRequestError('No order book snapshot found');
      }

      // Get latest imbalance
      let imbalance = await OrderBookImbalanceService.getLatestImbalance(exchangeId, symbol);

      // If no imbalance exists, calculate it
      if (!imbalance) {
        imbalance = await OrderBookImbalanceService.calculateAndStore(exchangeId, symbol);
      }

      // Get liquidity score
      let liquidityScore = await OrderBookAnalyticsService.getLatestLiquidityScore(exchangeId, symbol);

      // If no liquidity score, calculate it
      if (!liquidityScore) {
        const analytics = await OrderBookAnalyticsService.analyzeAndStore(exchangeId, symbol);
        liquidityScore = analytics.liquidityScore;
      }

      // Calculate signal components
      const imbalanceComponent = this.calculateImbalanceComponent(imbalance);
      const pressureComponent = this.calculatePressureComponent(imbalance);
      const momentumComponent = this.calculateMomentumComponent(imbalance);
      const liquidityComponent = this.calculateLiquidityComponent(liquidityScore);

      // Combine components
      const { direction, strength, reason } = this.combineComponents(
        imbalanceComponent,
        pressureComponent,
        momentumComponent,
        liquidityComponent
      );

      // Calculate confidence
      const confidence = this.calculateConfidence(
        imbalance,
        liquidityScore,
        snapshot
      );

      const signal: PulseSignal = {
        exchangeId,
        symbol,
        timestamp: new Date(),
        direction,
        strength,
        imbalance: imbalance.imbalance10,
        pressure: imbalance.pressureScore,
        momentum: imbalance.imbalanceMomentum || 0,
        confidence,
        reason,
      };

      logger.info('Generated Pulse signal', {
        exchangeId,
        symbol,
        direction,
        strength: strength.toFixed(2),
        confidence: confidence.toFixed(2),
      });

      return signal;
    } catch (error) {
      logger.error('Failed to generate Pulse signal', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect trend from historical signals
   */
  static async detectTrend(
    exchangeId: string,
    symbol: string,
    lookbackMinutes: number = 15
  ): Promise<{
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    consistency: number; // How consistent the signals are
  }> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - lookbackMinutes * 60 * 1000);

      // Get historical imbalance data
      const historicalData = await OrderBookImbalanceService.getHistoricalImbalance(
        exchangeId,
        symbol,
        startTime,
        endTime,
        50
      );

      if (historicalData.length < 5) {
        return { trend: 'neutral', strength: 0, consistency: 0 };
      }

      // Count bullish/bearish signals
      let bullishCount = 0;
      let bearishCount = 0;
      let totalPressure = 0;

      historicalData.forEach((data) => {
        if (data.pressureScore > 30) bullishCount++;
        else if (data.pressureScore < -30) bearishCount++;
        totalPressure += data.pressureScore;
      });

      const avgPressure = totalPressure / historicalData.length;
      const total = historicalData.length;
      const consistency = Math.max(bullishCount, bearishCount) / total;

      let trend: 'bullish' | 'bearish' | 'neutral';
      let strength: number;

      if (bullishCount > bearishCount * 1.5 && avgPressure > 20) {
        trend = 'bullish';
        strength = Math.min(100, (bullishCount / total) * 100);
      } else if (bearishCount > bullishCount * 1.5 && avgPressure < -20) {
        trend = 'bearish';
        strength = Math.min(100, (bearishCount / total) * 100);
      } else {
        trend = 'neutral';
        strength = Math.max(0, 100 - Math.abs(avgPressure));
      }

      logger.debug('Detected trend', {
        exchangeId,
        symbol,
        trend,
        strength: strength.toFixed(2),
        consistency: consistency.toFixed(2),
      });

      return { trend, strength, consistency };
    } catch (error) {
      logger.error('Failed to detect trend', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect divergence between price and order book signals
   */
  static async detectDivergence(
    exchangeId: string,
    symbol: string,
    priceChange: number // % price change over period
  ): Promise<{
    hasDivergence: boolean;
    type: 'bullish' | 'bearish' | 'none';
    strength: number;
    description: string;
  }> {
    try {
      // Get current imbalance
      const currentImbalance = await OrderBookImbalanceService.getLatestImbalance(
        exchangeId,
        symbol
      );

      if (!currentImbalance) {
        return {
          hasDivergence: false,
          type: 'none',
          strength: 0,
          description: 'No data available',
        };
      }

      const pressureScore = currentImbalance.pressureScore;

      // Bullish divergence: price down but order book bullish
      if (priceChange < -1 && pressureScore > 40) {
        const strength = Math.min(100, Math.abs(priceChange) * 10 + pressureScore);
        return {
          hasDivergence: true,
          type: 'bullish',
          strength,
          description: `Price down ${priceChange.toFixed(1)}% but strong bid pressure (${pressureScore.toFixed(0)})`,
        };
      }

      // Bearish divergence: price up but order book bearish
      if (priceChange > 1 && pressureScore < -40) {
        const strength = Math.min(100, priceChange * 10 + Math.abs(pressureScore));
        return {
          hasDivergence: true,
          type: 'bearish',
          strength,
          description: `Price up ${priceChange.toFixed(1)}% but strong ask pressure (${pressureScore.toFixed(0)})`,
        };
      }

      return {
        hasDivergence: false,
        type: 'none',
        strength: 0,
        description: 'No significant divergence detected',
      };
    } catch (error) {
      logger.error('Failed to detect divergence', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate signal quality
   */
  static validateSignal(signal: PulseSignal): {
    isValid: boolean;
    quality: 'high' | 'medium' | 'low';
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check confidence
    if (signal.confidence < 50) {
      warnings.push('Low confidence signal');
    }

    // Check strength
    if (signal.strength < 30) {
      warnings.push('Weak signal strength');
    }

    // Check for conflicting indicators
    if (signal.direction === 'bullish' && signal.pressure < 0) {
      warnings.push('Conflicting pressure indicator');
    }
    if (signal.direction === 'bearish' && signal.pressure > 0) {
      warnings.push('Conflicting pressure indicator');
    }

    // Determine quality
    let quality: 'high' | 'medium' | 'low';
    if (signal.confidence >= 75 && signal.strength >= 60) {
      quality = 'high';
    } else if (signal.confidence >= 50 && signal.strength >= 40) {
      quality = 'medium';
    } else {
      quality = 'low';
    }

    const isValid = warnings.length < 2 && signal.confidence >= 40;

    return { isValid, quality, warnings };
  }

  /**
   * Filter signals for trading
   */
  static async filterSignalsForTrading(
    exchangeId: string,
    symbol: string,
    minConfidence: number = 60,
    minStrength: number = 50
  ): Promise<PulseSignal | null> {
    const signal = await this.generatePulseSignal(exchangeId, symbol);

    // Apply filters
    if (signal.confidence < minConfidence) {
      logger.debug('Signal filtered: low confidence', {
        confidence: signal.confidence,
        minConfidence,
      });
      return null;
    }

    if (signal.strength < minStrength) {
      logger.debug('Signal filtered: low strength', {
        strength: signal.strength,
        minStrength,
      });
      return null;
    }

    // Validate signal
    const validation = this.validateSignal(signal);
    if (!validation.isValid) {
      logger.debug('Signal filtered: invalid', {
        warnings: validation.warnings,
      });
      return null;
    }

    // Only return high or medium quality signals
    if (validation.quality === 'low') {
      logger.debug('Signal filtered: low quality');
      return null;
    }

    return signal;
  }

  /**
   * Calculate imbalance component (-100 to 100)
   */
  private static calculateImbalanceComponent(imbalance: OrderBookImbalance): number {
    // Use 10-level imbalance, scale to -100 to 100
    return imbalance.imbalance10 * 100;
  }

  /**
   * Calculate pressure component (-100 to 100)
   */
  private static calculatePressureComponent(imbalance: OrderBookImbalance): number {
    // Pressure score is already -100 to 100
    return imbalance.pressureScore;
  }

  /**
   * Calculate momentum component (-100 to 100)
   */
  private static calculateMomentumComponent(imbalance: OrderBookImbalance): number {
    if (!imbalance.imbalanceMomentum) return 0;

    // Momentum is rate of change, scale appropriately
    // Cap at -100 to 100
    return Math.max(-100, Math.min(100, imbalance.imbalanceMomentum * 1000));
  }

  /**
   * Calculate liquidity component (0 to 100)
   */
  private static calculateLiquidityComponent(liquidityScore: LiquidityScore): number {
    // Higher liquidity = more reliable signals
    return liquidityScore.score;
  }

  /**
   * Combine all components into final signal
   */
  private static combineComponents(
    imbalance: number,
    pressure: number,
    momentum: number,
    liquidity: number
  ): {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    reason: string;
  } {
    // Weighted combination
    const weights = {
      imbalance: 0.35, // 35%
      pressure: 0.35, // 35%
      momentum: 0.20, // 20%
      liquidity: 0.10, // 10% (affects strength not direction)
    };

    const combinedScore =
      imbalance * weights.imbalance +
      pressure * weights.pressure +
      momentum * weights.momentum;

    // Adjust strength based on liquidity
    const rawStrength = Math.abs(combinedScore);
    const liquidityFactor = liquidity / 100;
    const strength = Math.min(100, rawStrength * liquidityFactor);

    // Determine direction
    let direction: 'bullish' | 'bearish' | 'neutral';
    let reason: string;

    if (combinedScore > 30) {
      direction = 'bullish';
      reason = this.buildReason('bullish', imbalance, pressure, momentum);
    } else if (combinedScore < -30) {
      direction = 'bearish';
      reason = this.buildReason('bearish', imbalance, pressure, momentum);
    } else {
      direction = 'neutral';
      reason = 'Balanced order book - no clear directional bias';
    }

    return { direction, strength, reason };
  }

  /**
   * Build human-readable reason string
   */
  private static buildReason(
    direction: 'bullish' | 'bearish',
    imbalance: number,
    pressure: number,
    momentum: number
  ): string {
    const reasons: string[] = [];

    if (direction === 'bullish') {
      if (imbalance > 30) reasons.push('strong bid imbalance');
      if (pressure > 30) reasons.push('buying pressure');
      if (momentum > 20) reasons.push('increasing momentum');
    } else {
      if (imbalance < -30) reasons.push('strong ask imbalance');
      if (pressure < -30) reasons.push('selling pressure');
      if (momentum < -20) reasons.push('decreasing momentum');
    }

    if (reasons.length === 0) {
      return direction === 'bullish' ? 'Moderate bullish bias' : 'Moderate bearish bias';
    }

    return reasons.join(', ');
  }

  /**
   * Calculate confidence score (0-100)
   */
  private static calculateConfidence(
    imbalance: OrderBookImbalance,
    liquidityScore: LiquidityScore,
    snapshot: OrderBookSnapshot
  ): number {
    let confidence = 50; // Base confidence

    // Factor 1: Liquidity quality (0-25 points)
    confidence += (liquidityScore.score / 100) * 25;

    // Factor 2: Imbalance consistency across levels (0-25 points)
    const imbalances = [
      imbalance.imbalance5,
      imbalance.imbalance10,
      imbalance.imbalance20,
      imbalance.imbalance50,
    ];
    const allSameDirection = imbalances.every((i) => i > 0) || imbalances.every((i) => i < 0);
    if (allSameDirection) {
      confidence += 25;
    } else {
      const avgImbalance = imbalances.reduce((a, b) => a + b, 0) / imbalances.length;
      const variance =
        imbalances.reduce((sum, val) => sum + Math.pow(val - avgImbalance, 2), 0) /
        imbalances.length;
      const consistency = Math.max(0, 1 - variance * 10);
      confidence += consistency * 25;
    }

    // Factor 3: Spread tightness (0-15 points)
    if (snapshot.spreadPercent && snapshot.spreadPercent < 0.1) {
      confidence += 15;
    } else if (snapshot.spreadPercent && snapshot.spreadPercent < 0.5) {
      confidence += 10;
    } else if (snapshot.spreadPercent && snapshot.spreadPercent < 1.0) {
      confidence += 5;
    }

    // Factor 4: Depth quality (0-10 points)
    if (snapshot.totalDepth && snapshot.totalDepth > 1000000) {
      // > $1M
      confidence += 10;
    } else if (snapshot.totalDepth && snapshot.totalDepth > 500000) {
      confidence += 5;
    }

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Get signal history for analysis
   */
  static async getSignalHistory(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<PulseSignal[]> {
    try {
      // Get historical imbalance data
      const historicalImbalance = await OrderBookImbalanceService.getHistoricalImbalance(
        exchangeId,
        symbol,
        startTime,
        endTime,
        1000
      );

      // Convert to signals (simplified - in production, would store actual signals)
      const signals: PulseSignal[] = historicalImbalance.map((imbalance) => {
        const signal = OrderBookImbalanceService.generateSignal(imbalance);
        return {
          exchangeId,
          symbol,
          timestamp: imbalance.timestamp,
          direction: signal.direction as 'bullish' | 'bearish' | 'neutral',
          strength: signal.strength,
          imbalance: imbalance.imbalance10,
          pressure: imbalance.pressureScore,
          momentum: imbalance.imbalanceMomentum || 0,
          confidence: 50, // Simplified - would need full calculation
          reason: signal.reason,
        };
      });

      return signals;
    } catch (error) {
      logger.error('Failed to get signal history', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate signal accuracy over time
   */
  static async calculateSignalAccuracy(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date,
    priceData: { timestamp: Date; price: number }[]
  ): Promise<{
    totalSignals: number;
    correctSignals: number;
    accuracy: number;
    bullishAccuracy: number;
    bearishAccuracy: number;
  }> {
    try {
      const signals = await this.getSignalHistory(exchangeId, symbol, startTime, endTime);

      if (signals.length === 0 || priceData.length === 0) {
        return {
          totalSignals: 0,
          correctSignals: 0,
          accuracy: 0,
          bullishAccuracy: 0,
          bearishAccuracy: 0,
        };
      }

      let totalSignals = 0;
      let correctSignals = 0;
      let bullishCorrect = 0;
      let bullishTotal = 0;
      let bearishCorrect = 0;
      let bearishTotal = 0;

      // Check each signal
      signals.forEach((signal, i) => {
        if (signal.direction === 'neutral') return;

        // Find next price point (5 minutes later)
        const futureTime = new Date(signal.timestamp.getTime() + 5 * 60 * 1000);
        const currentPrice = priceData.find(
          (p) => Math.abs(p.timestamp.getTime() - signal.timestamp.getTime()) < 60000
        )?.price;
        const futurePrice = priceData.find(
          (p) => Math.abs(p.timestamp.getTime() - futureTime.getTime()) < 60000
        )?.price;

        if (!currentPrice || !futurePrice) return;

        const priceChange = ((futurePrice - currentPrice) / currentPrice) * 100;

        totalSignals++;
        if (signal.direction === 'bullish') {
          bullishTotal++;
          if (priceChange > 0) {
            correctSignals++;
            bullishCorrect++;
          }
        } else {
          bearishTotal++;
          if (priceChange < 0) {
            correctSignals++;
            bearishCorrect++;
          }
        }
      });

      const accuracy = totalSignals > 0 ? (correctSignals / totalSignals) * 100 : 0;
      const bullishAccuracy = bullishTotal > 0 ? (bullishCorrect / bullishTotal) * 100 : 0;
      const bearishAccuracy = bearishTotal > 0 ? (bearishCorrect / bearishTotal) * 100 : 0;

      logger.info('Calculated signal accuracy', {
        exchangeId,
        symbol,
        accuracy: accuracy.toFixed(2),
        totalSignals,
        correctSignals,
      });

      return {
        totalSignals,
        correctSignals,
        accuracy,
        bullishAccuracy,
        bearishAccuracy,
      };
    } catch (error) {
      logger.error('Failed to calculate signal accuracy', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
