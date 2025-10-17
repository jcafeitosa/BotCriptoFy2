/**
 * Sentiment Aggregator Service Tests
 */

import { describe, test, expect } from 'bun:test';
import { SentimentAggregatorService } from '../services/aggregator/sentiment-aggregator.service';
import type { NewsArticle } from '../types/news.types';
import type { SocialMention } from '../types/social.types';

describe('SentimentAggregatorService', () => {
  const service = new SentimentAggregatorService();

  const mockNewsArticles: NewsArticle[] = [
    {
      id: '1',
      source: 'coindesk',
      sourceUrl: 'https://coindesk.com',
      platformId: 'article1',
      title: 'Bitcoin Surges to New Heights',
      summary: 'Bitcoin reaches new all-time high',
      author: 'John Doe',
      publishedAt: new Date(),
      fetchedAt: new Date(),
      url: 'https://example.com/1',
      category: 'market',
      symbols: ['BTC'],
      language: 'en',
      sentimentScore: 80,
      sentimentLabel: 'very_positive',
      sentimentMagnitude: 0.9,
      votes: 150,
      isAnalyzed: true,
      isImportant: true,
      isTrending: false,
    },
    {
      id: '2',
      source: 'cointelegraph',
      sourceUrl: 'https://cointelegraph.com',
      platformId: 'article2',
      title: 'Bitcoin Price Drops',
      summary: 'Bitcoin faces correction',
      author: 'Jane Smith',
      publishedAt: new Date(Date.now() - 3600000), // 1 hour ago
      fetchedAt: new Date(),
      url: 'https://example.com/2',
      category: 'market',
      symbols: ['BTC'],
      language: 'en',
      sentimentScore: -30,
      sentimentLabel: 'negative',
      sentimentMagnitude: 0.6,
      votes: 80,
      isAnalyzed: true,
      isImportant: false,
      isTrending: false,
    },
  ];

  const mockSocialMentions: SocialMention[] = [
    {
      id: '1',
      platform: 'twitter',
      platformId: 'tweet1',
      author: 'crypto_whale',
      authorId: 'user1',
      authorFollowers: 50000,
      authorVerified: true,
      text: 'Bitcoin to the moon!',
      url: 'https://twitter.com/tweet1',
      language: 'en',
      likes: 500,
      replies: 50,
      views: 10000,
      createdAt: new Date(),
      fetchedAt: new Date(),
      symbols: ['BTC'],
      hashtags: ['#BTC', '#crypto'],
      mentions: [],
      isAnalyzed: true,
      isInfluencer: true,
      isRetweet: false,
      isReply: false,
      sentimentScore: 90,
      sentimentLabel: 'very_positive',
      sentimentMagnitude: 0.95,
      sentimentConfidence: 0.9,
    },
  ];

  describe('aggregateFromNews', () => {
    test('should aggregate sentiment from news articles', async () => {
      const result = await service.aggregateFromNews(mockNewsArticles, 'BTC');

      expect(result).not.toBeNull();
      expect(result!.symbol).toBe('BTC');
      expect(result!.score).toBeGreaterThanOrEqual(-100);
      expect(result!.score).toBeLessThanOrEqual(100);
      expect(result!.magnitude).toBeGreaterThan(0);
      expect(result!.dataPoints).toBe(2);
    });

    test('should return null for insufficient data', async () => {
      const result = await service.aggregateFromNews([], 'BTC');

      expect(result).toBeNull();
    });

    test('should filter by symbol', async () => {
      const articles = [
        ...mockNewsArticles,
        {
          ...mockNewsArticles[0],
          id: '3',
          symbols: ['ETH'],
          sentimentScore: 50,
        } as NewsArticle,
      ];

      const result = await service.aggregateFromNews(articles, 'BTC');

      expect(result).not.toBeNull();
      expect(result!.dataPoints).toBe(2); // Only BTC articles
    });

    test('should calculate source breakdown', async () => {
      const result = await service.aggregateFromNews(mockNewsArticles, 'BTC');

      expect(result).not.toBeNull();
      expect(result!.sourceBreakdown).toBeDefined();
      expect(result!.sourceBreakdown).toHaveProperty('coindesk');
      expect(result!.sourceBreakdown).toHaveProperty('cointelegraph');
    });
  });

  describe('aggregateFromSocial', () => {
    test('should aggregate sentiment from social mentions', async () => {
      const result = await service.aggregateFromSocial(mockSocialMentions, 'BTC');

      expect(result).not.toBeNull();
      expect(result!.symbol).toBe('BTC');
      expect(result!.score).toBeGreaterThan(0);
    });

    test('should apply influencer boost', async () => {
      const withInfluencer = await service.aggregateFromSocial(mockSocialMentions, 'BTC');

      const nonInfluencerMention = {
        ...mockSocialMentions[0],
        id: '2',
        isInfluencer: false,
        authorFollowers: 100,
      };

      const withoutInfluencer = await service.aggregateFromSocial([nonInfluencerMention], 'BTC');

      // Influencer should have higher weight
      expect(withInfluencer).not.toBeNull();
      expect(withoutInfluencer).not.toBeNull();
    });
  });

  describe('aggregateFromAll', () => {
    test('should combine news and social sentiment', async () => {
      const result = await service.aggregateFromAll(
        mockNewsArticles,
        mockSocialMentions,
        'BTC'
      );

      expect(result).not.toBeNull();
      expect(result!.symbol).toBe('BTC');
      expect(result!.dataPoints).toBe(3); // 2 news + 1 social
    });

    test('should calculate trend direction', async () => {
      const result = await service.aggregateFromAll(
        mockNewsArticles,
        mockSocialMentions,
        'BTC'
      );

      expect(result).not.toBeNull();
      expect(result!.trend).toBeDefined();
      expect(['improving', 'stable', 'deteriorating']).toContain(result!.trend.direction);
    });

    test('should calculate change', async () => {
      const result = await service.aggregateFromAll(
        mockNewsArticles,
        mockSocialMentions,
        'BTC'
      );

      expect(result).not.toBeNull();
      expect(typeof result!.change).toBe('number');
    });
  });

  describe('calculateFearGreedIndex', () => {
    test('should calculate Fear & Greed Index', async () => {
      const aggregated = await service.aggregateFromAll(
        mockNewsArticles,
        mockSocialMentions,
        'BTC'
      );

      expect(aggregated).not.toBeNull();

      const fearGreed = await service.calculateFearGreedIndex(
        aggregated!,
        100, // socialVolume
        0.3, // priceVolatility
        20 // priceMomentum
      );

      expect(fearGreed.index).toBeGreaterThanOrEqual(0);
      expect(fearGreed.index).toBeLessThanOrEqual(100);
      expect(['extreme_fear', 'fear', 'neutral', 'greed', 'extreme_greed']).toContain(
        fearGreed.label
      );
      expect(fearGreed.components).toBeDefined();
      expect(fearGreed.components.sentiment).toBeGreaterThanOrEqual(0);
      expect(fearGreed.components.volume).toBeGreaterThanOrEqual(0);
      expect(fearGreed.components.volatility).toBeGreaterThanOrEqual(0);
      expect(fearGreed.components.momentum).toBeGreaterThanOrEqual(0);
    });

    test('should classify extreme greed correctly', async () => {
      const veryPositiveSentiment = {
        symbol: 'BTC',
        score: 90,
        magnitude: 0.95,
        label: 'very_positive' as const,
        confidence: 0.9,
        trend: {
          direction: 'improving' as const,
          strength: 0.8,
          velocity: 10,
        },
        volume: 1000,
        change: 20,
        sourceBreakdown: {},
        timeWindow: 86400000,
        dataPoints: 100,
        lastUpdated: new Date(),
      };

      const fearGreed = await service.calculateFearGreedIndex(
        veryPositiveSentiment,
        1000, // high volume
        0.1, // low volatility
        80 // strong momentum
      );

      expect(fearGreed.index).toBeGreaterThan(70);
      expect(['greed', 'extreme_greed']).toContain(fearGreed.label);
    });
  });

  describe('configuration', () => {
    test('should allow config updates', () => {
      service.updateConfig({
        timeWindow: 3600000, // 1 hour
        minDataPoints: 3,
      });

      const config = service.getConfig();
      expect(config.timeWindow).toBe(3600000);
      expect(config.minDataPoints).toBe(3);
    });

    test('should use custom recency decay', () => {
      service.updateConfig({
        recencyDecay: 1.0, // Higher decay
      });

      const config = service.getConfig();
      expect(config.recencyDecay).toBe(1.0);
    });
  });
});
