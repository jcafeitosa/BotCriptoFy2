/**
 * Exchange WebSocket Metadata Service Tests
 * Tests CCXT metadata extraction for WebSocket configuration
 */

import { describe, it, expect } from 'bun:test';
import { ExchangeWebSocketMetadataService } from '../exchange-websocket-metadata.service';

describe('ExchangeWebSocketMetadataService', () => {
  describe('Binance Metadata', () => {
    it('should return valid Binance metadata', () => {
      const metadata = ExchangeWebSocketMetadataService.getBinanceMetadata();

      expect(metadata.exchange).toBe('binance');
      expect(metadata.wsUrl).toBe('wss://stream.binance.com:9443');
      expect(metadata.streamUrl).toBe('wss://stream.binance.com:9443/ws');
      expect(metadata.documentation).toBeTruthy();
    });

    it('should have correct Binance capabilities', () => {
      const metadata = ExchangeWebSocketMetadataService.getBinanceMetadata();

      expect(metadata.capabilities.ticker).toBe(true);
      expect(metadata.capabilities.trades).toBe(true);
      expect(metadata.capabilities.orderBook).toBe(true);
      expect(metadata.capabilities.ohlcv).toBe(true);
      expect(metadata.capabilities.balance).toBe(true);
      expect(metadata.capabilities.orders).toBe(true);
    });

    it('should have correct Binance message formats', () => {
      const metadata = ExchangeWebSocketMetadataService.getBinanceMetadata();

      expect(metadata.messageFormats.subscribe.method).toBe('SUBSCRIBE');
      expect(metadata.messageFormats.channels.ticker).toBe('{symbol}@ticker');
      expect(metadata.messageFormats.channels.trades).toBe('{symbol}@trade');
      expect(metadata.messageFormats.channels.orderBook).toBe('{symbol}@depth{levels}');
      expect(metadata.messageFormats.channels.ohlcv).toBe('{symbol}@kline_{interval}');
    });

    it('should have Binance rate limits', () => {
      const metadata = ExchangeWebSocketMetadataService.getBinanceMetadata();

      expect(metadata.rateLimit.connections).toBe(300);
      expect(metadata.rateLimit.subscriptions).toBe(1024);
      expect(metadata.rateLimit.messages).toBe(5000);
    });
  });

  describe('Coinbase Metadata', () => {
    it('should return valid Coinbase metadata', () => {
      const metadata = ExchangeWebSocketMetadataService.getCoinbaseMetadata();

      expect(metadata.exchange).toBe('coinbase');
      expect(metadata.wsUrl).toBe('wss://ws-feed.exchange.coinbase.com');
      expect(metadata.documentation).toBeTruthy();
    });

    it('should have correct Coinbase capabilities', () => {
      const metadata = ExchangeWebSocketMetadataService.getCoinbaseMetadata();

      expect(metadata.capabilities.ticker).toBe(true);
      expect(metadata.capabilities.trades).toBe(true);
      expect(metadata.capabilities.orderBook).toBe(true);
      expect(metadata.capabilities.ohlcv).toBe(false); // Coinbase doesn't support OHLCV via WebSocket
      expect(metadata.capabilities.balance).toBe(true);
      expect(metadata.capabilities.orders).toBe(true);
    });

    it('should have correct Coinbase message formats', () => {
      const metadata = ExchangeWebSocketMetadataService.getCoinbaseMetadata();

      expect(metadata.messageFormats.subscribe.type).toBe('subscribe');
      expect(metadata.messageFormats.channels.ticker).toBe('ticker');
      expect(metadata.messageFormats.channels.trades).toBe('matches');
      expect(metadata.messageFormats.channels.orderBook).toBe('level2');
    });

    it('should have Coinbase rate limits', () => {
      const metadata = ExchangeWebSocketMetadataService.getCoinbaseMetadata();

      expect(metadata.rateLimit.connections).toBe(1000);
      expect(metadata.rateLimit.messages).toBe(100);
    });
  });

  describe('Kraken Metadata', () => {
    it('should return valid Kraken metadata', () => {
      const metadata = ExchangeWebSocketMetadataService.getKrakenMetadata();

      expect(metadata.exchange).toBe('kraken');
      expect(metadata.wsUrl).toBe('wss://ws.kraken.com');
      expect(metadata.documentation).toBeTruthy();
    });

    it('should have correct Kraken capabilities', () => {
      const metadata = ExchangeWebSocketMetadataService.getKrakenMetadata();

      expect(metadata.capabilities.ticker).toBe(true);
      expect(metadata.capabilities.trades).toBe(true);
      expect(metadata.capabilities.orderBook).toBe(true);
      expect(metadata.capabilities.ohlcv).toBe(true);
      expect(metadata.capabilities.balance).toBe(true);
      expect(metadata.capabilities.orders).toBe(true);
    });

    it('should have correct Kraken message formats', () => {
      const metadata = ExchangeWebSocketMetadataService.getKrakenMetadata();

      expect(metadata.messageFormats.subscribe.event).toBe('subscribe');
      expect(metadata.messageFormats.channels.ticker).toBe('ticker');
      expect(metadata.messageFormats.channels.trades).toBe('trade');
      expect(metadata.messageFormats.channels.orderBook).toBe('book');
      expect(metadata.messageFormats.channels.ohlcv).toBe('ohlc');
    });

    it('should have Kraken rate limits', () => {
      const metadata = ExchangeWebSocketMetadataService.getKrakenMetadata();

      expect(metadata.rateLimit.subscriptions).toBe(50);
      expect(metadata.rateLimit.messages).toBe(1);
    });
  });

  describe('getAllMetadata', () => {
    it('should return metadata for all exchanges', () => {
      const allMetadata = ExchangeWebSocketMetadataService.getAllMetadata();

      expect(allMetadata).toHaveProperty('binance');
      expect(allMetadata).toHaveProperty('coinbase');
      expect(allMetadata).toHaveProperty('kraken');
    });

    it('should return valid metadata for each exchange', () => {
      const allMetadata = ExchangeWebSocketMetadataService.getAllMetadata();

      expect(allMetadata.binance.exchange).toBe('binance');
      expect(allMetadata.coinbase.exchange).toBe('coinbase');
      expect(allMetadata.kraken.exchange).toBe('kraken');
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for valid exchange name', () => {
      const binance = ExchangeWebSocketMetadataService.getMetadata('binance');
      const coinbase = ExchangeWebSocketMetadataService.getMetadata('coinbase');
      const kraken = ExchangeWebSocketMetadataService.getMetadata('kraken');

      expect(binance).toBeTruthy();
      expect(coinbase).toBeTruthy();
      expect(kraken).toBeTruthy();
    });

    it('should be case-insensitive', () => {
      const binance1 = ExchangeWebSocketMetadataService.getMetadata('BINANCE');
      const binance2 = ExchangeWebSocketMetadataService.getMetadata('Binance');
      const binance3 = ExchangeWebSocketMetadataService.getMetadata('binance');

      expect(binance1).toBeTruthy();
      expect(binance2).toBeTruthy();
      expect(binance3).toBeTruthy();
    });

    it('should return null for unknown exchange', () => {
      const unknown = ExchangeWebSocketMetadataService.getMetadata('unknown-exchange');
      expect(unknown).toBeNull();
    });
  });

  describe('buildStreamUrl', () => {
    // Note: buildStreamUrl uses formatSymbol() which requires CCXT markets loaded
    // These tests are skipped as they require actual exchange API calls
    // In production, markets are loaded via exchange initialization

    it('should throw error for unsupported exchange', () => {
      expect(() => {
        ExchangeWebSocketMetadataService.buildStreamUrl('unknown', 'BTC/USDT', 'ticker');
      }).toThrow('Exchange unknown not supported');
    });
  });

  describe('buildSubscriptionMessage', () => {
    // Note: buildSubscriptionMessage uses formatSymbol() which requires CCXT markets loaded
    // These tests are skipped as they require actual exchange API calls
    // In production, markets are loaded via exchange initialization

    it('should throw error for unsupported exchange', () => {
      expect(() => {
        ExchangeWebSocketMetadataService.buildSubscriptionMessage('unknown', ['BTC/USDT'], ['ticker']);
      }).toThrow('Exchange unknown not supported');
    });
  });

  describe('hasCapability', () => {
    it('should return true for supported capabilities', () => {
      expect(ExchangeWebSocketMetadataService.hasCapability('binance', 'ticker')).toBe(true);
      expect(ExchangeWebSocketMetadataService.hasCapability('binance', 'ohlcv')).toBe(true);
      expect(ExchangeWebSocketMetadataService.hasCapability('coinbase', 'ticker')).toBe(true);
    });

    it('should return false for unsupported capabilities', () => {
      expect(ExchangeWebSocketMetadataService.hasCapability('coinbase', 'ohlcv')).toBe(false);
    });

    it('should return false for unknown exchange', () => {
      expect(ExchangeWebSocketMetadataService.hasCapability('unknown', 'ticker')).toBe(false);
    });
  });

  describe('getRateLimits', () => {
    it('should return rate limits for valid exchange', () => {
      const binanceLimits = ExchangeWebSocketMetadataService.getRateLimits('binance');
      const coinbaseLimits = ExchangeWebSocketMetadataService.getRateLimits('coinbase');

      expect(binanceLimits).toBeTruthy();
      expect(binanceLimits?.connections).toBe(300);

      expect(coinbaseLimits).toBeTruthy();
      expect(coinbaseLimits?.connections).toBe(1000);
    });

    it('should return null for unknown exchange', () => {
      const limits = ExchangeWebSocketMetadataService.getRateLimits('unknown');
      expect(limits).toBeNull();
    });
  });

  describe('Symbol Formatting', () => {
    // Note: formatSymbol() uses CCXT market() which requires markets loaded
    // This requires actual exchange API calls to load market data
    // Testing would require mocking CCXT exchange or integration tests
    it('should require markets loaded', () => {
      expect(() => {
        ExchangeWebSocketMetadataService.formatSymbol('binance', 'BTC/USDT');
      }).toThrow('markets not loaded');
    });
  });

  describe('Integration with Multiple Exchanges', () => {
    it('should handle multiple exchange metadata requests', () => {
      const binance = ExchangeWebSocketMetadataService.getBinanceMetadata();
      const coinbase = ExchangeWebSocketMetadataService.getCoinbaseMetadata();
      const kraken = ExchangeWebSocketMetadataService.getKrakenMetadata();

      expect(binance.exchange).not.toBe(coinbase.exchange);
      expect(coinbase.exchange).not.toBe(kraken.exchange);
      expect(kraken.exchange).not.toBe(binance.exchange);
    });

    it('should provide distinct WebSocket URLs for each exchange', () => {
      const allMetadata = ExchangeWebSocketMetadataService.getAllMetadata();
      const urls = Object.values(allMetadata).map((m) => m.wsUrl);
      const uniqueUrls = new Set(urls);

      expect(uniqueUrls.size).toBe(urls.length);
    });

    it('should have different capabilities across exchanges', () => {
      const binance = ExchangeWebSocketMetadataService.getBinanceMetadata();
      const coinbase = ExchangeWebSocketMetadataService.getCoinbaseMetadata();

      // Binance supports OHLCV, Coinbase doesn't
      expect(binance.capabilities.ohlcv).toBe(true);
      expect(coinbase.capabilities.ohlcv).toBe(false);
    });
  });
});
