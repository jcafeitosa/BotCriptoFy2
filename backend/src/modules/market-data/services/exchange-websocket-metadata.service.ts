/**
 * Exchange WebSocket Metadata Service
 * Extracts WebSocket URLs and capabilities from exchanges using CCXT free
 *
 * @module market-data/services/exchange-websocket-metadata
 */

import ccxt from 'ccxt';

/**
 * Exchange WebSocket Metadata
 */
export interface WebSocketMetadata {
  exchange: string;
  wsUrl: string;
  streamUrl?: string;
  capabilities: {
    ticker: boolean;
    trades: boolean;
    orderBook: boolean;
    ohlcv: boolean;
    balance: boolean;
    orders: boolean;
  };
  messageFormats: {
    subscribe: Record<string, any>;
    channels: {
      ticker?: string;
      trades?: string;
      orderBook?: string;
      ohlcv?: string;
    };
  };
  rateLimit: {
    connections?: number;
    subscriptions?: number;
    messages?: number;
  };
  documentation: string;
}

/**
 * Extract WebSocket URLs from CCXT exchange instance
 */
export class ExchangeWebSocketMetadataService {
  /**
   * Get WebSocket metadata for Binance
   */
  static getBinanceMetadata(): WebSocketMetadata {
    const exchange = new ccxt.binance({ enableRateLimit: true });

    return {
      exchange: 'binance',
      wsUrl: 'wss://stream.binance.com:9443',
      streamUrl: 'wss://stream.binance.com:9443/ws',
      capabilities: {
        ticker: true,
        trades: true,
        orderBook: true,
        ohlcv: true,
        balance: true,
        orders: true,
      },
      messageFormats: {
        subscribe: {
          method: 'SUBSCRIBE',
          params: ['btcusdt@ticker', 'btcusdt@trade'],
          id: 1,
        },
        channels: {
          ticker: '{symbol}@ticker',
          trades: '{symbol}@trade',
          orderBook: '{symbol}@depth{levels}',
          ohlcv: '{symbol}@kline_{interval}',
        },
      },
      rateLimit: {
        connections: 300,
        subscriptions: 1024,
        messages: 5000,
      },
      documentation: Array.isArray(exchange.urls.doc)
        ? exchange.urls.doc[0]
        : (exchange.urls.doc ?? 'https://binance-docs.github.io/apidocs/spot/en/'),
    };
  }

  /**
   * Get WebSocket metadata for Coinbase
   */
  static getCoinbaseMetadata(): WebSocketMetadata {
    const exchange = new ccxt.coinbase({ enableRateLimit: true });

    return {
      exchange: 'coinbase',
      wsUrl: 'wss://ws-feed.exchange.coinbase.com',
      capabilities: {
        ticker: true,
        trades: true,
        orderBook: true,
        ohlcv: false,
        balance: true,
        orders: true,
      },
      messageFormats: {
        subscribe: {
          type: 'subscribe',
          product_ids: ['BTC-USD', 'ETH-USD'],
          channels: ['ticker', 'matches', 'level2'],
        },
        channels: {
          ticker: 'ticker',
          trades: 'matches',
          orderBook: 'level2',
        },
      },
      rateLimit: {
        connections: 1000,
        messages: 100,
      },
      documentation: Array.isArray(exchange.urls.doc)
        ? exchange.urls.doc[0]
        : (exchange.urls.doc ?? 'https://binance-docs.github.io/apidocs/spot/en/'),
    };
  }

  /**
   * Get WebSocket metadata for Kraken
   */
  static getKrakenMetadata(): WebSocketMetadata {
    const exchange = new ccxt.kraken({ enableRateLimit: true });

    return {
      exchange: 'kraken',
      wsUrl: 'wss://ws.kraken.com',
      capabilities: {
        ticker: true,
        trades: true,
        orderBook: true,
        ohlcv: true,
        balance: true,
        orders: true,
      },
      messageFormats: {
        subscribe: {
          event: 'subscribe',
          pair: ['XBT/USD', 'ETH/USD'],
          subscription: {
            name: 'ticker',
          },
        },
        channels: {
          ticker: 'ticker',
          trades: 'trade',
          orderBook: 'book',
          ohlcv: 'ohlc',
        },
      },
      rateLimit: {
        subscriptions: 50,
        messages: 1,
      },
      documentation: Array.isArray(exchange.urls.doc)
        ? exchange.urls.doc[0]
        : (exchange.urls.doc ?? 'https://binance-docs.github.io/apidocs/spot/en/'),
    };
  }

  /**
   * Get all exchanges metadata
   */
  static getAllMetadata(): Record<string, WebSocketMetadata> {
    return {
      binance: this.getBinanceMetadata(),
      coinbase: this.getCoinbaseMetadata(),
      kraken: this.getKrakenMetadata(),
    };
  }

  /**
   * Get metadata by exchange name
   */
  static getMetadata(exchangeName: string): WebSocketMetadata | null {
    const metadata = this.getAllMetadata();
    return metadata[exchangeName.toLowerCase()] || null;
  }

  /**
   * Extract symbol format for exchange
   */
  static formatSymbol(exchangeName: string, symbol: string): string {
    const ExchangeClass = ccxt[exchangeName as keyof typeof ccxt] as any;
    const exchange = new ExchangeClass();
    const market = exchange.market(symbol);

    switch (exchangeName.toLowerCase()) {
      case 'binance':
        return market.id.toLowerCase();
      case 'coinbase':
        return `${market.base}-${market.quote}`;
      case 'kraken':
        return market.id;
      default:
        return symbol;
    }
  }

  /**
   * Build WebSocket URL for specific channel
   */
  static buildStreamUrl(
    exchangeName: string,
    symbol: string,
    channel: 'ticker' | 'trades' | 'orderBook' | 'ohlcv',
    options: {
      interval?: string;
      levels?: number;
    } = {}
  ): string {
    const metadata = this.getMetadata(exchangeName);
    if (!metadata) throw new Error(`Exchange ${exchangeName} not supported`);

    const formattedSymbol = this.formatSymbol(exchangeName, symbol);

    switch (exchangeName.toLowerCase()) {
      case 'binance': {
        let channelStr = metadata.messageFormats.channels[channel];
        if (!channelStr) throw new Error(`Channel ${channel} not supported`);

        channelStr = channelStr.replace('{symbol}', formattedSymbol);

        if (channel === 'ohlcv' && options.interval) {
          channelStr = channelStr.replace('{interval}', options.interval);
        }

        if (channel === 'orderBook' && options.levels) {
          channelStr = channelStr.replace('{levels}', options.levels.toString());
        } else if (channel === 'orderBook') {
          channelStr = channelStr.replace('{levels}', '');
        }

        return `${metadata.streamUrl}/${channelStr}`;
      }

      case 'coinbase':
      case 'kraken':
        return metadata.wsUrl;

      default:
        return metadata.wsUrl;
    }
  }

  /**
   * Build subscription message
   */
  static buildSubscriptionMessage(
    exchangeName: string,
    symbols: string[],
    channels: Array<'ticker' | 'trades' | 'orderBook' | 'ohlcv'>,
    options: {
      interval?: string;
      levels?: number;
      reqId?: number;
    } = {}
  ): any {
    const metadata = this.getMetadata(exchangeName);
    if (!metadata) throw new Error(`Exchange ${exchangeName} not supported`);

    const formattedSymbols = symbols.map(s => this.formatSymbol(exchangeName, s));

    switch (exchangeName.toLowerCase()) {
      case 'binance': {
        const params = formattedSymbols.flatMap(symbol => {
          return channels.map(channel => {
            let channelStr = metadata.messageFormats.channels[channel];
            if (!channelStr) return null;

            channelStr = channelStr.replace('{symbol}', symbol);

            if (channel === 'ohlcv' && options.interval) {
              channelStr = channelStr.replace('{interval}', options.interval);
            }

            if (channel === 'orderBook' && options.levels) {
              channelStr = channelStr.replace('{levels}', options.levels.toString());
            } else if (channel === 'orderBook') {
              channelStr = channelStr.replace('{levels}', '');
            }

            return channelStr;
          }).filter(Boolean);
        }).flat();

        return {
          method: 'SUBSCRIBE',
          params,
          id: options.reqId || 1,
        };
      }

      case 'coinbase': {
        const channelNames = channels.map(c => metadata.messageFormats.channels[c]);

        return {
          type: 'subscribe',
          product_ids: formattedSymbols,
          channels: channelNames.filter(Boolean),
        };
      }

      case 'kraken': {
        return channels.map(channel => {
          const subscription: any = {
            name: metadata.messageFormats.channels[channel],
          };

          if (channel === 'ohlcv' && options.interval) {
            subscription.interval = parseInt(options.interval);
          }

          if (channel === 'orderBook' && options.levels) {
            subscription.depth = options.levels;
          }

          return {
            event: 'subscribe',
            pair: formattedSymbols,
            subscription,
          };
        });
      }

      default:
        throw new Error(`Exchange ${exchangeName} not supported`);
    }
  }

  /**
   * Validate exchange capabilities
   */
  static hasCapability(
    exchangeName: string,
    capability: keyof WebSocketMetadata['capabilities']
  ): boolean {
    const metadata = this.getMetadata(exchangeName);
    if (!metadata) return false;
    return metadata.capabilities[capability];
  }

  /**
   * Get rate limits for exchange
   */
  static getRateLimits(exchangeName: string): WebSocketMetadata['rateLimit'] | null {
    const metadata = this.getMetadata(exchangeName);
    return metadata?.rateLimit || null;
  }
}

export default ExchangeWebSocketMetadataService;
