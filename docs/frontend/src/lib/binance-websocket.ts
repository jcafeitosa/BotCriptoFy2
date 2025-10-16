/**
 * @fileoverview Binance WebSocket Service (Browser-compatible)
 * @description Native WebSocket implementation for Binance real-time data
 * @version 1.0.0
 * 
 * FEATURES:
 * - ✅ Browser-native WebSocket
 * - ✅ Real-time kline/candle data
 * - ✅ Real-time ticker data
 * - ✅ Automatic reconnection
 * - ✅ Type-safe interfaces
 */

// ============================================================================
// TYPES
// ============================================================================

export interface KlineData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface TickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  high: number;
  low: number;
}

export type TimeframeType = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

// ============================================================================
// BINANCE WEBSOCKET SERVICE
// ============================================================================

export class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  /**
   * Subscribe to kline (candlestick) updates
   * @param symbol - Trading pair (e.g., 'BTCUSDT')
   * @param interval - Timeframe (e.g., '1m', '1h')
   * @param onUpdate - Callback for new kline data
   */
  subscribeKline(
    symbol: string,
    interval: TimeframeType,
    onUpdate: (kline: KlineData) => void
  ): () => void {
    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamName}`;

    this.connect(wsUrl, (data) => {
      if (data.e === 'kline' && data.k) {
        const k = data.k;
        onUpdate({
          time: Math.floor(k.t / 1000), // Convert ms to seconds
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          isClosed: k.x,
        });
      }
    });

    // Return cleanup function
    return () => this.disconnect();
  }

  /**
   * Subscribe to ticker (24h) updates
   * @param symbol - Trading pair (e.g., 'BTCUSDT')
   * @param onUpdate - Callback for ticker data
   */
  subscribeTicker(
    symbol: string,
    onUpdate: (ticker: TickerData) => void
  ): () => void {
    const streamName = `${symbol.toLowerCase()}@ticker`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamName}`;

    this.connect(wsUrl, (data) => {
      if (data.e === '24hrTicker') {
        onUpdate({
          symbol: data.s,
          price: parseFloat(data.c),
          priceChange: parseFloat(data.p),
          priceChangePercent: parseFloat(data.P),
          volume: parseFloat(data.v),
          quoteVolume: parseFloat(data.q),
          high: parseFloat(data.h),
          low: parseFloat(data.l),
        });
      }
    });

    return () => this.disconnect();
  }

  /**
   * Connect to WebSocket
   * @private
   */
  private connect(url: string, onMessage: (data: any) => void): void {
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('✅ Binance WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Binance WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Binance WebSocket closed');
        this.attemptReconnect(url, onMessage);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   * @private
   */
  private attemptReconnect(url: string, onMessage: (data: any) => void): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect(url, onMessage);
    }, delay);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }
}

// ============================================================================
// BINANCE REST API (for historical data)
// ============================================================================

/**
 * Fetch historical kline/candlestick data
 * @param symbol - Trading pair (e.g., 'BTCUSDT')
 * @param interval - Timeframe
 * @param limit - Number of candles (default: 100)
 */
export async function fetchHistoricalKlines(
  symbol: string,
  interval: TimeframeType,
  limit: number = 100
): Promise<KlineData[]> {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.map((candle: any[]) => ({
      time: Math.floor(candle[0] / 1000),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      isClosed: true,
    }));
  } catch (error: any) {
    console.error('Failed to fetch historical klines:', error);
    throw error;
  }
}

/**
 * Fetch 24h ticker statistics
 * @param symbol - Trading pair (e.g., 'BTCUSDT')
 */
export async function fetch24hStats(symbol: string): Promise<TickerData> {
  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      priceChange: parseFloat(data.priceChange),
      priceChangePercent: parseFloat(data.priceChangePercent),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
    };
  } catch (error: any) {
    console.error('Failed to fetch 24h stats:', error);
    throw error;
  }
}

/**
 * Format symbol for Binance API (remove slash, uppercase)
 */
export function formatSymbolForBinance(symbol: string): string {
  return symbol.replace('/', '').toUpperCase();
}

/**
 * Format symbol for display (add slash)
 */
export function formatSymbolForDisplay(symbol: string): string {
  if (symbol.includes('/')) return symbol.toUpperCase();
  
  // Common quote currencies
  const quotes = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'BUSD'];
  for (const quote of quotes) {
    if (symbol.toUpperCase().endsWith(quote)) {
      const base = symbol.slice(0, -quote.length);
      return `${base.toUpperCase()}/${quote}`;
    }
  }
  
  return symbol.toUpperCase();
}


