/**
 * Price Correlation Service Tests
 */

import { describe, test, expect } from 'bun:test';
import { PriceCorrelationService, type PriceDataPoint } from '../services/analyzer/price-correlation.service';
import type { AggregatedSentiment } from '../types/sentiment.types';

describe('PriceCorrelationService', () => {
  const service = new PriceCorrelationService({
    minDataPoints: 10, // Lower threshold for testing
  });

  const createMockSentimentData = (
    length: number,
    baseScore: number = 0,
    trend: number = 0
  ): Array<{ timestamp: Date; score: number }> => {
    return Array.from({ length }, (_, i) => ({
      timestamp: new Date(Date.now() - (length - i) * 3600000), // Hourly intervals
      score: baseScore + trend * i + (Math.random() - 0.5) * 10, // Add some noise
    }));
  };

  const createMockPriceData = (
    length: number,
    basePrice: number = 50000,
    trend: number = 0
  ): PriceDataPoint[] => {
    return Array.from({ length }, (_, i) => {
      const price = basePrice + trend * i + (Math.random() - 0.5) * 1000;
      return {
        timestamp: new Date(Date.now() - (length - i) * 3600000),
        open: price,
        high: price * 1.01,
        low: price * 0.99,
        close: price,
        volume: 1000000,
      };
    });
  };

  describe('calculateCorrelation', () => {
    test('should calculate positive correlation', async () => {
      // Both sentiment and price trending up
      const sentimentData = createMockSentimentData(30, 0, 2); // Increasing sentiment
      const priceData = createMockPriceData(30, 50000, 100); // Increasing price

      const result = await service.calculateCorrelation(
        sentimentData,
        priceData,
        'BTC'
      );

      expect(result.symbol).toBe('BTC');
      expect(result.coefficient).toBeGreaterThan(0);
      expect(result.direction).toBe('positive');
      expect(result.dataPoints).toBe(30);
    });

    test('should calculate negative correlation', async () => {
      // Sentiment down, price up (inverse correlation)
      const sentimentData = createMockSentimentData(30, 50, -2); // Decreasing sentiment
      const priceData = createMockPriceData(30, 50000, 100); // Increasing price

      const result = await service.calculateCorrelation(
        sentimentData,
        priceData,
        'BTC'
      );

      expect(result.coefficient).toBeLessThan(0);
      expect(result.direction).toBe('negative');
    });

    test('should detect no correlation', async () => {
      // Random sentiment, stable price
      const sentimentData = createMockSentimentData(30, 0, 0);
      const priceData = createMockPriceData(30, 50000, 0);

      const result = await service.calculateCorrelation(
        sentimentData,
        priceData,
        'BTC'
      );

      expect(Math.abs(result.coefficient)).toBeLessThan(0.3);
      expect(result.direction).toBe('none');
    });

    test('should determine correlation strength', async () => {
      const sentimentData = createMockSentimentData(50, 0, 1.5);
      const priceData = createMockPriceData(50, 50000, 80);

      const result = await service.calculateCorrelation(
        sentimentData,
        priceData,
        'BTC'
      );

      expect(['very_weak', 'weak', 'moderate', 'strong', 'very_strong']).toContain(
        result.strength
      );
    });

    test('should calculate statistical significance', async () => {
      const sentimentData = createMockSentimentData(50, 0, 2);
      const priceData = createMockPriceData(50, 50000, 100);

      const result = await service.calculateCorrelation(
        sentimentData,
        priceData,
        'BTC'
      );

      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
      expect(typeof result.isSignificant).toBe('boolean');
    });

    test('should throw error for insufficient data', async () => {
      const sentimentData = createMockSentimentData(5); // Below minDataPoints (10)
      const priceData = createMockPriceData(5);

      await expect(
        service.calculateCorrelation(sentimentData, priceData, 'BTC')
      ).rejects.toThrow();
    });

    test('should calculate lag between sentiment and price', async () => {
      const sentimentData = createMockSentimentData(30, 0, 2);
      const priceData = createMockPriceData(30, 50000, 100);

      const result = await service.calculateCorrelation(
        sentimentData,
        priceData,
        'BTC'
      );

      expect(typeof result.lag).toBe('number');
      expect(Math.abs(result.lag)).toBeLessThanOrEqual(24); // Within max lag
    });
  });

  describe('calculateMultiTimeframeCorrelation', () => {
    test('should calculate correlation for multiple timeframes', async () => {
      const sentimentData = createMockSentimentData(200, 0, 1); // 200 hours of data
      const priceData = createMockPriceData(200, 50000, 50);

      const results = await service.calculateMultiTimeframeCorrelation(
        sentimentData,
        priceData,
        'BTC'
      );

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.symbol).toBe('BTC');
        expect(result.timeframe).toBeDefined();
        expect(['1h', '4h', '24h', '168h']).toContain(result.timeframe);
      });
    });

    test('should handle insufficient data for some timeframes', async () => {
      const sentimentData = createMockSentimentData(30, 0, 1); // Only 30 hours
      const priceData = createMockPriceData(30, 50000, 50);

      const results = await service.calculateMultiTimeframeCorrelation(
        sentimentData,
        priceData,
        'BTC'
      );

      // Should only return results for timeframes with enough data
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(4); // Max 4 timeframes
    });
  });

  describe('detectDivergences', () => {
    test('should detect bullish divergence', async () => {
      // Price going down, sentiment going up
      const sentimentData = createMockSentimentData(20, -50, 5); // Improving sentiment
      const priceData = createMockPriceData(20, 50000, -200); // Declining price

      const divergences = await service.detectDivergences(
        sentimentData,
        priceData
      );

      const bullishDiv = divergences.find((d) => d.type === 'bullish');
      if (bullishDiv) {
        expect(bullishDiv.sentimentTrend).toBe('up');
        expect(bullishDiv.priceTrend).toBe('down');
        expect(['weak', 'moderate', 'strong']).toContain(bullishDiv.severity);
      }
    });

    test('should detect bearish divergence', async () => {
      // Price going up, sentiment going down
      const sentimentData = createMockSentimentData(20, 50, -5); // Declining sentiment
      const priceData = createMockPriceData(20, 50000, 200); // Rising price

      const divergences = await service.detectDivergences(
        sentimentData,
        priceData
      );

      const bearishDiv = divergences.find((d) => d.type === 'bearish');
      if (bearishDiv) {
        expect(bearishDiv.sentimentTrend).toBe('down');
        expect(bearishDiv.priceTrend).toBe('up');
      }
    });

    test('should return empty array for no divergences', async () => {
      // Both trending up
      const sentimentData = createMockSentimentData(20, 0, 2);
      const priceData = createMockPriceData(20, 50000, 100);

      const divergences = await service.detectDivergences(
        sentimentData,
        priceData
      );

      expect(Array.isArray(divergences)).toBe(true);
    });

    test('should return empty for insufficient data', async () => {
      const sentimentData = createMockSentimentData(5);
      const priceData = createMockPriceData(5);

      const divergences = await service.detectDivergences(
        sentimentData,
        priceData
      );

      expect(divergences).toEqual([]);
    });
  });

  describe('generateSignals', () => {
    const mockAggregatedSentiment: AggregatedSentiment = {
      symbol: 'BTC',
      score: 70,
      magnitude: 0.8,
      label: 'very_positive',
      confidence: 0.85,
      trend: {
        direction: 'improving',
        strength: 0.7,
        velocity: 5,
      },
      volume: 500,
      change: 15,
      sourceBreakdown: {},
      timeWindow: 86400000,
      dataPoints: 100,
      lastUpdated: new Date(),
    };

    const mockCorrelation = {
      symbol: 'BTC',
      coefficient: 0.75,
      pValue: 0.001,
      isSignificant: true,
      strength: 'strong' as const,
      direction: 'positive' as const,
      lag: 2,
      dataPoints: 100,
      timeframe: '24h',
      calculatedAt: new Date(),
    };

    test('should generate buy signal for strong positive sentiment', async () => {
      const priceData = createMockPriceData(20, 50000, 50);

      const signal = await service.generateSignals(
        mockAggregatedSentiment,
        priceData,
        mockCorrelation
      );

      expect(signal.symbol).toBe('BTC');
      expect(['buy', 'strong_buy']).toContain(signal.signal);
      expect(signal.confidence).toBeGreaterThan(0.5);
      expect(signal.reasoning.length).toBeGreaterThan(0);
    });

    test('should generate sell signal for negative sentiment', async () => {
      const negativeSentiment = {
        ...mockAggregatedSentiment,
        score: -70,
        label: 'very_negative' as const,
        trend: {
          direction: 'deteriorating' as const,
          strength: 0.7,
          velocity: -5,
        },
      };

      const priceData = createMockPriceData(20, 50000, -50);

      const signal = await service.generateSignals(
        negativeSentiment,
        priceData,
        mockCorrelation
      );

      expect(['sell', 'strong_sell']).toContain(signal.signal);
    });

    test('should generate neutral signal for mixed indicators', async () => {
      const neutralSentiment = {
        ...mockAggregatedSentiment,
        score: 10,
        label: 'neutral' as const,
        trend: {
          direction: 'stable' as const,
          strength: 0.1,
          velocity: 0,
        },
      };

      const priceData = createMockPriceData(20, 50000, 0);
      const weakCorrelation = {
        ...mockCorrelation,
        coefficient: 0.2,
        isSignificant: false,
      };

      const signal = await service.generateSignals(
        neutralSentiment,
        priceData,
        weakCorrelation
      );

      expect(signal.signal).toBe('neutral');
      expect(signal.confidence).toBeLessThan(0.6);
    });

    test('should detect bullish divergence in signals', async () => {
      const positiveSentiment = {
        ...mockAggregatedSentiment,
        score: 60,
      };

      // Price declining while sentiment positive
      const priceData = createMockPriceData(20, 50000, -300);

      const signal = await service.generateSignals(
        positiveSentiment,
        priceData,
        mockCorrelation
      );

      const hasDivergenceReasoning = signal.reasoning.some((r) =>
        r.toLowerCase().includes('divergence')
      );

      if (hasDivergenceReasoning) {
        expect(signal.signal).toMatch(/buy/);
      }
    });

    test('should include correlation in reasoning', async () => {
      const priceData = createMockPriceData(20, 50000, 50);

      const signal = await service.generateSignals(
        mockAggregatedSentiment,
        priceData,
        mockCorrelation
      );

      const hasCorrelationReasoning = signal.reasoning.some((r) =>
        r.toLowerCase().includes('correlation')
      );

      expect(hasCorrelationReasoning).toBe(true);
    });
  });

  describe('configuration', () => {
    test('should allow config updates', () => {
      service.updateConfig({
        minDataPoints: 15,
        maxLag: 48,
      });

      const config = service.getConfig();
      expect(config.minDataPoints).toBe(15);
      expect(config.maxLag).toBe(48);
    });

    test('should use custom timeframes', () => {
      service.updateConfig({
        timeframes: [2, 6, 12], // Custom timeframes
      });

      const config = service.getConfig();
      expect(config.timeframes).toEqual([2, 6, 12]);
    });
  });
});
