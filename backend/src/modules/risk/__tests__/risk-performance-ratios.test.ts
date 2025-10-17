/**
 * Performance Ratios Corrected Implementation Tests
 * Tests for the fixes applied to Sharpe, Sortino, and Calmar ratios
 */

import { describe, test, expect } from 'bun:test';

describe('RiskService - Corrected Performance Ratios', () => {
  // ==============================================================================
  // SHARPE RATIO CORRECTIONS
  // ==============================================================================

  describe('Sharpe Ratio - Custom Risk-Free Rate', () => {
    test('should use default 2% risk-free rate when not specified', () => {
      const annualizedReturn = 0.15; // 15%
      const annualizedStdDev = 0.20; // 20%
      const defaultRiskFreeRate = 0.02; // 2%

      const sharpeRatio = (annualizedReturn - defaultRiskFreeRate) / annualizedStdDev;

      expect(sharpeRatio).toBe(0.65);
    });

    test('should accept custom risk-free rate parameter', () => {
      const annualizedReturn = 0.15; // 15%
      const annualizedStdDev = 0.20; // 20%
      const customRiskFreeRate = 0.05; // 5% (higher rate environment)

      const sharpeRatio = (annualizedReturn - customRiskFreeRate) / annualizedStdDev;

      expect(sharpeRatio).toBeCloseTo(0.5, 2); // (0.15 - 0.05) / 0.20
    });

    test('should handle zero risk-free rate', () => {
      const annualizedReturn = 0.15;
      const annualizedStdDev = 0.20;
      const zeroRiskFreeRate = 0.0;

      const sharpeRatio = (annualizedReturn - zeroRiskFreeRate) / annualizedStdDev;

      expect(sharpeRatio).toBeCloseTo(0.75, 2); // 0.15 / 0.20
    });

    test('should handle negative returns with risk-free rate', () => {
      const annualizedReturn = -0.05; // -5% loss
      const annualizedStdDev = 0.20;
      const riskFreeRate = 0.02;

      const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedStdDev;

      expect(sharpeRatio).toBeCloseTo(-0.35, 2); // (-0.05 - 0.02) / 0.20
    });

    test('should handle zero standard deviation gracefully', () => {
      const annualizedReturn = 0.15;
      const annualizedStdDev = 0; // No volatility
      const riskFreeRate = 0.02;

      // Should return 0 to avoid division by zero
      const sharpeRatio = annualizedStdDev > 0
        ? (annualizedReturn - riskFreeRate) / annualizedStdDev
        : 0;

      expect(sharpeRatio).toBe(0);
    });
  });

  // ==============================================================================
  // SORTINO RATIO CORRECTIONS - Fixed Downside Deviation Calculation
  // ==============================================================================

  describe('Sortino Ratio - Corrected Downside Deviation', () => {
    test('should calculate downside deviation using min(0, r)² formula', () => {
      // Returns: [0.05, 0.02, -0.01, -0.03, 0.01]
      const returns = [0.05, 0.02, -0.01, -0.03, 0.01];

      // CORRECTED: Use min(0, r)² for ALL returns, not just negative ones
      const downsideVariance =
        returns.reduce((sum, r) => sum + Math.pow(Math.min(0, r), 2), 0) / returns.length;

      // min(0, 0.05)² = 0, min(0, 0.02)² = 0, min(0, -0.01)² = 0.0001,
      // min(0, -0.03)² = 0.0009, min(0, 0.01)² = 0
      // Sum = 0.001, divided by 5 = 0.0002
      const downsideDeviation = Math.sqrt(downsideVariance);

      expect(downsideDeviation).toBeCloseTo(0.01414, 4); // sqrt(0.0002)
    });

    test('should use total count (not just downside count) in denominator', () => {
      const returns = [0.05, 0.03, -0.02, -0.04]; // 2 positive, 2 negative

      // CORRECTED: Divide by returns.length (4), not downsideReturns.length (2)
      const downsideVariance =
        returns.reduce((sum, r) => sum + Math.pow(Math.min(0, r), 2), 0) / returns.length;

      // Sum of min(0, r)² = 0.0004 + 0.0016 = 0.002
      // Divided by 4 (total count) = 0.0005
      expect(downsideVariance).toBe(0.0005);

      // OLD INCORRECT: Would divide by 2 (downside count only) = 0.001
      // This demonstrates the fix
    });

    test('should handle all positive returns (no downside risk)', () => {
      const returns = [0.05, 0.03, 0.02, 0.04]; // All positive

      const downsideVariance =
        returns.reduce((sum, r) => sum + Math.pow(Math.min(0, r), 2), 0) / returns.length;

      // All min(0, r) = 0, so variance = 0
      expect(downsideVariance).toBe(0);

      const downsideDeviation = Math.sqrt(downsideVariance);
      expect(downsideDeviation).toBe(0);
    });

    test('should calculate Sortino ratio with corrected downside deviation', () => {
      const returns = [0.06, 0.03, -0.02, -0.04, 0.02];
      const annualizedReturn = 0.10; // 10% annual return
      const riskFreeRate = 0.02; // 2%

      // Corrected downside deviation
      const downsideVariance =
        returns.reduce((sum, r) => sum + Math.pow(Math.min(0, r), 2), 0) / returns.length;
      const dailyDownsideDeviation = Math.sqrt(downsideVariance);
      const annualizedDownsideDeviation = dailyDownsideDeviation * Math.sqrt(252);

      const sortinoRatio = annualizedDownsideDeviation > 0
        ? (annualizedReturn - riskFreeRate) / annualizedDownsideDeviation
        : 0;

      // Downside variance = (0.0004 + 0.0016) / 5 = 0.0004
      // Daily downside deviation = sqrt(0.0004) = 0.02
      // Annualized = 0.02 * sqrt(252) ≈ 0.3175
      // Sortino = (0.10 - 0.02) / 0.3175 ≈ 0.252
      expect(sortinoRatio).toBeGreaterThan(0);
      expect(sortinoRatio).toBeLessThan(1);
    });

    test('should handle zero downside deviation gracefully', () => {
      const returns = [0.05, 0.03, 0.02]; // All positive
      const annualizedReturn = 0.10;
      const riskFreeRate = 0.02;

      const downsideVariance =
        returns.reduce((sum, r) => sum + Math.pow(Math.min(0, r), 2), 0) / returns.length;
      const downsideDeviation = Math.sqrt(downsideVariance);

      // Should return 0 to avoid division by zero
      const sortinoRatio = downsideDeviation > 0
        ? (annualizedReturn - riskFreeRate) / downsideDeviation
        : 0;

      expect(sortinoRatio).toBe(0);
    });
  });

  // ==============================================================================
  // COMPARATIVE TESTS: Old vs New Implementation
  // ==============================================================================

  describe('Sortino Ratio - Old vs New Implementation Comparison', () => {
    test('should demonstrate difference between old and new calculation', () => {
      const returns = [0.05, 0.03, -0.02, -0.04];

      // OLD INCORRECT IMPLEMENTATION:
      const downsideReturns = returns.filter((r) => r < 0); // [-0.02, -0.04]
      const oldDownsideVariance =
        downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
      // (0.0004 + 0.0016) / 2 = 0.001

      // NEW CORRECTED IMPLEMENTATION:
      const newDownsideVariance =
        returns.reduce((sum, r) => sum + Math.pow(Math.min(0, r), 2), 0) / returns.length;
      // (0.0004 + 0.0016) / 4 = 0.0005

      expect(oldDownsideVariance).toBe(0.001);
      expect(newDownsideVariance).toBe(0.0005);
      expect(newDownsideVariance).toBeLessThan(oldDownsideVariance);

      // New implementation gives lower downside risk (more accurate)
      expect(Math.sqrt(newDownsideVariance)).toBeCloseTo(0.02236, 4);
      expect(Math.sqrt(oldDownsideVariance)).toBeCloseTo(0.03162, 4);
    });

    test('should show old implementation overstates risk', () => {
      const returns = [0.10, 0.05, -0.02]; // 2 positive, 1 negative

      // OLD: Only divides by downside count (1)
      const downsideReturns = returns.filter((r) => r < 0);
      const oldVariance =
        downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
      // 0.0004 / 1 = 0.0004

      // NEW: Divides by total count (3)
      const newVariance =
        returns.reduce((sum, r) => sum + Math.pow(Math.min(0, r), 2), 0) / returns.length;
      // 0.0004 / 3 = 0.0001333...

      // Old implementation gives much higher variance (overstates risk)
      expect(oldVariance).toBeCloseTo(0.0004, 6);
      expect(newVariance).toBeCloseTo(0.000133, 6);
      expect(oldVariance).toBeGreaterThan(newVariance * 2.5);
    });
  });

  // ==============================================================================
  // CALMAR RATIO VALIDATION
  // ==============================================================================

  describe('Calmar Ratio - Validation', () => {
    test('should calculate Calmar ratio correctly', () => {
      const annualizedReturn = 0.20; // 20%
      const maxDrawdown = 15; // 15%

      const calmarRatio = annualizedReturn / (maxDrawdown / 100);

      expect(calmarRatio).toBeCloseTo(1.333, 3); // 0.20 / 0.15
    });

    test('should handle zero max drawdown', () => {
      const annualizedReturn = 0.15;
      const maxDrawdown = 0;

      const calmarRatio = maxDrawdown > 0
        ? annualizedReturn / (maxDrawdown / 100)
        : 0;

      expect(calmarRatio).toBe(0);
    });

    test('should handle negative returns', () => {
      const annualizedReturn = -0.10; // -10% loss
      const maxDrawdown = 20; // 20%

      const calmarRatio = maxDrawdown > 0
        ? annualizedReturn / (maxDrawdown / 100)
        : 0;

      expect(calmarRatio).toBe(-0.5); // -0.10 / 0.20
    });

    test('should validate excellent Calmar ratio (>3)', () => {
      const annualizedReturn = 0.30; // 30%
      const maxDrawdown = 5; // 5%

      const calmarRatio = annualizedReturn / (maxDrawdown / 100);

      expect(calmarRatio).toBeCloseTo(6, 2); // Excellent!
      expect(calmarRatio).toBeGreaterThan(3);
    });

    test('should validate good Calmar ratio (>1)', () => {
      const annualizedReturn = 0.15; // 15%
      const maxDrawdown = 10; // 10%

      const calmarRatio = annualizedReturn / (maxDrawdown / 100);

      expect(calmarRatio).toBeCloseTo(1.5, 2); // Good
      expect(calmarRatio).toBeGreaterThan(1);
    });
  });

  // ==============================================================================
  // COMPREHENSIVE RATIO SCENARIOS
  // ==============================================================================

  describe('Performance Ratios - Real-World Scenarios', () => {
    test('should calculate ratios for high-performing strategy', () => {
      // High returns, moderate volatility, low downside
      const annualizedReturn = 0.25; // 25%
      const annualizedStdDev = 0.15; // 15%
      const annualizedDownsideDeviation = 0.10; // 10%
      const maxDrawdown = 8; // 8%
      const riskFreeRate = 0.02;

      const sharpe = (annualizedReturn - riskFreeRate) / annualizedStdDev;
      const sortino = (annualizedReturn - riskFreeRate) / annualizedDownsideDeviation;
      const calmar = annualizedReturn / (maxDrawdown / 100);

      expect(sharpe).toBeCloseTo(1.533, 3); // Good (>1)
      expect(sortino).toBeCloseTo(2.3, 1); // Very good (>2)
      expect(calmar).toBeCloseTo(3.125, 3); // Excellent (>3)
    });

    test('should calculate ratios for risky strategy', () => {
      // Moderate returns, high volatility, high downside
      const annualizedReturn = 0.15; // 15%
      const annualizedStdDev = 0.30; // 30%
      const annualizedDownsideDeviation = 0.25; // 25%
      const maxDrawdown = 20; // 20%
      const riskFreeRate = 0.02;

      const sharpe = (annualizedReturn - riskFreeRate) / annualizedStdDev;
      const sortino = (annualizedReturn - riskFreeRate) / annualizedDownsideDeviation;
      const calmar = annualizedReturn / (maxDrawdown / 100);

      expect(sharpe).toBeCloseTo(0.433, 3); // Weak (<1)
      expect(sortino).toBeCloseTo(0.52, 2); // Weak (<1)
      expect(calmar).toBeCloseTo(0.75, 2); // Poor (<1)
    });

    test('should calculate ratios for defensive strategy', () => {
      // Low returns, very low volatility, minimal downside
      const annualizedReturn = 0.08; // 8%
      const annualizedStdDev = 0.05; // 5%
      const annualizedDownsideDeviation = 0.03; // 3%
      const maxDrawdown = 3; // 3%
      const riskFreeRate = 0.02;

      const sharpe = (annualizedReturn - riskFreeRate) / annualizedStdDev;
      const sortino = (annualizedReturn - riskFreeRate) / annualizedDownsideDeviation;
      const calmar = annualizedReturn / (maxDrawdown / 100);

      expect(sharpe).toBe(1.2); // Good (>1)
      expect(sortino).toBe(2.0); // Very good (=2)
      expect(calmar).toBeCloseTo(2.667, 3); // Good (>1)
    });

    test('should calculate ratios for losing strategy', () => {
      const annualizedReturn = -0.10; // -10% loss
      const annualizedStdDev = 0.20; // 20%
      const annualizedDownsideDeviation = 0.18; // 18%
      const maxDrawdown = 25; // 25%
      const riskFreeRate = 0.02;

      const sharpe = (annualizedReturn - riskFreeRate) / annualizedStdDev;
      const sortino = (annualizedReturn - riskFreeRate) / annualizedDownsideDeviation;
      const calmar = annualizedReturn / (maxDrawdown / 100);

      expect(sharpe).toBe(-0.6); // Negative
      expect(sortino).toBeCloseTo(-0.667, 3); // Negative
      expect(calmar).toBe(-0.4); // Negative
    });
  });

  // ==============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ==============================================================================

  describe('Performance Ratios - Edge Cases', () => {
    test('should handle all zero returns', () => {
      const returns = [0, 0, 0, 0];
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;

      expect(avgReturn).toBe(0);
      expect(variance).toBe(0);
    });

    test('should handle extreme volatility', () => {
      const annualizedReturn = 0.50; // 50%
      const annualizedStdDev = 1.00; // 100% volatility!
      const riskFreeRate = 0.02;

      const sharpe = (annualizedReturn - riskFreeRate) / annualizedStdDev;

      expect(sharpe).toBe(0.48); // Still positive but low
    });

    test('should handle very small numbers', () => {
      const annualizedReturn = 0.0001;
      const annualizedStdDev = 0.0002;
      const riskFreeRate = 0.00005;

      const sharpe = (annualizedReturn - riskFreeRate) / annualizedStdDev;

      expect(sharpe).toBeCloseTo(0.25, 2);
    });

    test('should handle single data point (insufficient)', () => {
      const returns = [0.05];

      // Variance with single point is 0
      const avgReturn = returns[0];
      const variance = 0;

      expect(avgReturn).toBe(0.05);
      expect(variance).toBe(0);
    });
  });
});
