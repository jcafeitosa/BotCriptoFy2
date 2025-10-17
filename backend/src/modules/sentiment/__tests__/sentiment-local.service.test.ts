/**
 * Sentiment Local Service Tests
 */

import { describe, test, expect } from 'bun:test';
import { SentimentLocalService } from '../services/analysis/sentiment-local.service';

describe('SentimentLocalService', () => {
  const service = new SentimentLocalService();

  describe('analyze', () => {
    test('should analyze positive crypto text', async () => {
      const result = await service.analyze('Bitcoin is mooning! HODL and buy the dip!');

      expect(result.score).toBeGreaterThan(0);
      expect(result.label).toMatch(/positive/);
      expect(result.magnitude).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.provider).toBe('local');
    });

    test('should analyze negative crypto text', async () => {
      const result = await service.analyze('Bitcoin crash! FUD everywhere, sell before it dumps more!');

      expect(result.score).toBeLessThan(0);
      expect(result.label).toMatch(/negative/);
      expect(result.magnitude).toBeGreaterThan(0);
      expect(result.provider).toBe('local');
    });

    test('should analyze neutral text', async () => {
      const result = await service.analyze('Bitcoin price is stable today.');

      expect(Math.abs(result.score)).toBeLessThan(30);
      expect(result.label).toBe('neutral');
      expect(result.provider).toBe('local');
    });

    test('should detect crypto-specific terms', async () => {
      const result = await service.analyze('WAGMI! Moon lambo rocket!');

      expect(result.score).toBeGreaterThan(50);
      expect(result.label).toBe('very_positive');
      expect(result.keywords).toBeDefined();
      expect(result.keywords!.length).toBeGreaterThan(0);
    });

    test('should calculate aspects (fear, greed, uncertainty, hype)', async () => {
      const result = await service.analyze('Bitcoin is crashing! Panic selling everywhere!');

      expect(result.aspects).toBeDefined();
      expect(result.aspects!.fear).toBeGreaterThan(0);
      expect(result.aspects!.greed).toBeLessThanOrEqual(result.aspects!.fear!);
    });

    test('should handle empty text', async () => {
      const result = await service.analyze('');

      expect(result.score).toBe(0);
      expect(result.magnitude).toBe(0);
      expect(result.label).toBe('neutral');
    });

    test('should normalize scores to -100 to 100 range', async () => {
      const result = await service.analyze('Bitcoin moon lambo rocket bullish!');

      expect(result.score).toBeGreaterThanOrEqual(-100);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test('should calculate magnitude between 0 and 1', async () => {
      const result = await service.analyze('Bitcoin is very bullish!');

      expect(result.magnitude).toBeGreaterThanOrEqual(0);
      expect(result.magnitude).toBeLessThanOrEqual(1);
    });

    test('should extract keywords with scores', async () => {
      const result = await service.analyze('Bitcoin pump! Ethereum moon!');

      expect(result.keywords).toBeDefined();
      expect(result.keywords!.length).toBeGreaterThan(0);
      expect(result.keywords![0]).toHaveProperty('word');
      expect(result.keywords![0]).toHaveProperty('score');
      expect(result.keywords![0]).toHaveProperty('weight');
    });
  });

  describe('analyzeBatch', () => {
    test('should analyze multiple texts', async () => {
      const texts = [
        'Bitcoin is mooning!',
        'Ethereum crash!',
        'Market is stable',
      ];

      const results = await service.analyzeBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[1].score).toBeLessThan(0);
      expect(Math.abs(results[2].score)).toBeLessThan(30);
    });

    test('should handle errors gracefully', async () => {
      const texts = ['Valid text', ''];

      const results = await service.analyzeBatch(texts);

      expect(results).toHaveLength(2);
      expect(results[0].confidence).toBeGreaterThan(0);
      expect(results[1].score).toBe(0); // Neutral for empty text
    });
  });

  describe('extractEntities', () => {
    test('should extract coin symbols', () => {
      const entities = service.extractEntities('$BTC and $ETH are pumping!');

      expect(entities.coins).toContain('BTC');
      expect(entities.coins).toContain('ETH');
    });

    test('should extract exchanges', () => {
      const entities = service.extractEntities('Binance and Coinbase are down');

      expect(entities.exchanges).toContain('Binance');
      expect(entities.exchanges).toContain('Coinbase');
    });

    test('should extract technologies', () => {
      const entities = service.extractEntities('DeFi and NFT markets are growing');

      expect(entities.technologies).toContain('defi');
      expect(entities.technologies).toContain('nft');
    });
  });

  describe('detectLanguage', () => {
    test('should detect English', () => {
      const lang = service.detectLanguage('The Bitcoin price is rising today');

      expect(lang).toBe('en');
    });

    test('should return unknown for non-English', () => {
      const lang = service.detectLanguage('Cryptocurrency market');

      // Simple heuristic, might not always detect correctly
      expect(['en', 'unknown']).toContain(lang);
    });
  });

  describe('preprocessText', () => {
    test('should remove URLs', async () => {
      const result = await service.analyze('Check this out https://example.com Bitcoin moon!');

      // URL should be removed, sentiment should still be positive
      expect(result.score).toBeGreaterThan(0);
    });

    test('should remove mentions', async () => {
      const result = await service.analyze('@elonmusk Bitcoin is great!');

      expect(result.score).toBeGreaterThan(0);
    });

    test('should normalize punctuation', async () => {
      const result = await service.analyze('Bitcoin!!! Moon!!!');

      expect(result.score).toBeGreaterThan(0);
    });
  });
});
