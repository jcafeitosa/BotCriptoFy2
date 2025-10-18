/**
 * @fileoverview Background Candles Component - Real-time BTC Candles Background
 * @description Canvas-based animated background with live Binance WebSocket data
 * @version 1.0.0
 *
 * FEATURES:
 * - ✅ Real-time WebSocket connection to Binance (BTC/USDT 1m)
 * - ✅ Canvas rendering for performance (60fps)
 * - ✅ Smooth animation (candles moving right to left)
 * - ✅ Green (bullish) / Red (bearish) candles
 * - ✅ Automatic mobile detection (disabled <768px)
 * - ✅ Low opacity (20-30%) to not compete with content
 * - ✅ Cleanup on unmount
 */

import { useEffect, useRef, useState } from 'react';

interface BackgroundCandlesProps {
  /** Opacity of candles (0-1) */
  opacity?: number;
  /** Width of each candle in pixels */
  candleWidth?: number;
  /** Maximum number of candles to display */
  maxCandles?: number;
  /** Animation speed (pixels per frame) */
  speed?: number;
  /** Candle gap (pixels between candles) */
  gap?: number;
}

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  x: number; // Horizontal position
  isBullish: boolean;
}

/**
 * BackgroundCandles Component
 *
 * Renders real-time BTC candles as an animated background.
 * Automatically disabled on mobile for performance.
 */
export function BackgroundCandles({
  opacity = 0.25,
  candleWidth = 20,
  maxCandles = 300, // 5 hours = 300 candles (1m interval)
  speed = 0.5,
  gap = 4,
}: BackgroundCandlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const candlesRef = useRef<Candle[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const animationFrameRef = useRef<number>();
  const reconnectTimeoutRef = useRef<number>();

  const [isDesktop, setIsDesktop] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // ============================================================================
  // MOBILE DETECTION
  // ============================================================================
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
    };

    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);

    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // ============================================================================
  // FETCH HISTORICAL DATA FROM BINANCE
  // ============================================================================
  const fetchHistoricalCandles = async () => {
    try {
      console.log('[BackgroundCandles] Fetching historical data from Binance...');

      // Binance REST API: 5 hours = 300 candles (1m interval)
      const response = await fetch(
        'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=300'
      );

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data = await response.json();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const candleSpacing = candleWidth + gap;

      // Convert Binance data to candles
      const historicalCandles: Candle[] = data.map((item: any[], index: number) => {
        const open = parseFloat(item[1]);
        const high = parseFloat(item[2]);
        const low = parseFloat(item[3]);
        const close = parseFloat(item[4]);

        return {
          open,
          high,
          low,
          close,
          x: rect.width - ((data.length - index - 1) * candleSpacing), // Position from right
          isBullish: close >= open,
        };
      });

      candlesRef.current = historicalCandles;
      console.log(`[BackgroundCandles] Loaded ${historicalCandles.length} historical candles`);
    } catch (error) {
      console.error('[BackgroundCandles] Error fetching historical data:', error);
      // Fallback to simulated data
      generateInitialCandles();
    }
  };

  // ============================================================================
  // WEBSOCKET CONNECTION & CANDLE UPDATES (BINANCE PUBLIC API)
  // ============================================================================
  useEffect(() => {
    // Don't connect WebSocket on mobile
    if (!isDesktop) return;

    // Fetch real historical data first
    fetchHistoricalCandles();

    const connectWebSocket = () => {
      try {
        // Binance public WebSocket endpoint for BTC/USDT 1-minute klines
        const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[BackgroundCandles] WebSocket connected to Binance');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.e === 'kline' && data.k) {
              const kline = data.k;

              // Only add closed candles to avoid flickering
              if (kline.x === true) {
                const canvas = canvasRef.current;
                if (!canvas) return;

                const rect = canvas.getBoundingClientRect();
                const newCandle: Candle = {
                  open: parseFloat(kline.o),
                  high: parseFloat(kline.h),
                  low: parseFloat(kline.l),
                  close: parseFloat(kline.c),
                  x: rect.width, // Start from right edge
                  isBullish: parseFloat(kline.c) >= parseFloat(kline.o),
                };

                console.log('[BackgroundCandles] New candle received:', {
                  time: new Date(kline.T).toLocaleTimeString(),
                  open: newCandle.open,
                  close: newCandle.close,
                  isBullish: newCandle.isBullish,
                });

                candlesRef.current.push(newCandle);

                // Limit number of candles (keep last 300 = 5 hours)
                if (candlesRef.current.length > maxCandles) {
                  candlesRef.current.shift();
                }
              }
            }
          } catch (error) {
            console.error('[BackgroundCandles] Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[BackgroundCandles] WebSocket error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('[BackgroundCandles] WebSocket closed. Reconnecting in 5s...');
          setIsConnected(false);

          // Reconnect after 5 seconds
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connectWebSocket();
          }, 5000);
        };
      } catch (error) {
        console.error('[BackgroundCandles] Error creating WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setIsConnected(false);
    };
  }, [isDesktop, maxCandles]);

  // ============================================================================
  // CANVAS ANIMATION LOOP
  // ============================================================================
  useEffect(() => {
    if (!isDesktop) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match container
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return;

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Move all candles to the left
      candlesRef.current = candlesRef.current.map(candle => ({
        ...candle,
        x: candle.x - speed,
      }));

      // Remove candles that are off-screen (left)
      candlesRef.current = candlesRef.current.filter(
        candle => candle.x + candleWidth > 0
      );

      // Draw candles
      drawCandles(ctx, rect.width, rect.height);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDesktop, candleWidth, speed, gap, opacity]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================


  /**
   * Generate initial candles for immediate visual feedback
   */
  const generateInitialCandles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const candleSpacing = candleWidth + gap;
    const numCandles = Math.ceil(rect.width / candleSpacing);

    // Generate random-ish candles (simulating real data)
    let lastPrice = 95000; // Starting BTC price

    for (let i = 0; i < numCandles; i++) {
      const change = (Math.random() - 0.5) * 1000; // Random change ±500
      const open = lastPrice;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 300;
      const low = Math.min(open, close) - Math.random() * 300;

      candlesRef.current.push({
        open,
        high,
        low,
        close,
        x: rect.width - (i * candleSpacing),
        isBullish: close >= open,
      });

      lastPrice = close;
    }
  };

  /**
   * Draw all candles on canvas
   */
  const drawCandles = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Calculate price range for normalization
    const allPrices = candlesRef.current.flatMap(c => [c.open, c.high, c.low, c.close]);
    const maxPrice = Math.max(...allPrices);
    const minPrice = Math.min(...allPrices);
    const priceRange = maxPrice - minPrice || 1;

    // Centralizar candles verticalmente (usar 60% da altura no centro)
    const centerY = height / 2;
    const chartHeight = height * 0.6; // 60% da altura total
    const chartTop = centerY - (chartHeight / 2);

    candlesRef.current.forEach(candle => {
      // Normalize prices to canvas height (inverted, because canvas Y grows downward)
      const normalizeY = (price: number) => {
        const normalized = (price - minPrice) / priceRange;
        return chartTop + (chartHeight - (normalized * chartHeight)); // Centralizado
      };

      const openY = normalizeY(candle.open);
      const closeY = normalizeY(candle.close);
      const highY = normalizeY(candle.high);
      const lowY = normalizeY(candle.low);

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1; // Minimum 1px
      const wickX = candle.x + candleWidth / 2;

      // Colors with opacity
      const bullishColor = `rgba(34, 197, 94, ${opacity})`; // green-500
      const bearishColor = `rgba(239, 68, 68, ${opacity})`; // red-500
      const color = candle.isBullish ? bullishColor : bearishColor;

      // Draw wick (high-low line)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wickX, highY);
      ctx.lineTo(wickX, lowY);
      ctx.stroke();

      // Draw body (open-close rectangle)
      ctx.fillStyle = color;
      ctx.fillRect(candle.x, bodyTop, candleWidth, bodyHeight);

      // Optional: Draw border for better visibility
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(candle.x, bodyTop, candleWidth, bodyHeight);
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Don't render on mobile
  if (!isDesktop) {
    return null;
  }

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.9 }} // Additional opacity control
      />

      {/* Connection indicator (dev only, remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 text-xs text-gray-500 pointer-events-none">
          {isConnected ? '🟢 Live Data' : '🟡 Connecting...'}
        </div>
      )}
    </div>
  );
}
