/**
 * @fileoverview Background Trading Chart - TradingView Lightweight Charts
 * @description Professional real-time candlestick chart optimized for background display
 * @version 2.0.0
 *
 * BASED ON: TradingView Lightweight Charts Official Documentation
 * @see https://tradingview.github.io/lightweight-charts/docs
 *
 * FEATURES:
 * - ✅ TradingView Lightweight Charts v5 (standard implementation)
 * - ✅ Real-time Binance WebSocket data (BTC/USDT 1m)
 * - ✅ 5 hours historical data (300 candles)
 * - ✅ Transparent background for hero section
 * - ✅ Auto-disabled on mobile (<768px)
 * - ✅ Proper cleanup and error handling
 */

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type UTCTimestamp
} from 'lightweight-charts';
import {
  BinanceWebSocketService,
  fetchHistoricalKlines,
  type KlineData,
} from '../../lib/binance-websocket';
import {
  calculateBollingerBands,
  klineToIndicatorData,
} from '../../lib/technical-indicators';

interface BackgroundTradingChartProps {
  /** Chart opacity for background display (0-1) */
  opacity?: number;
  /** Chart height in pixels */
  height?: number;
}

/**
 * BackgroundTradingChart Component
 *
 * Professional candlestick chart implementation following TradingView standards.
 * Displays real-time BTC/USDT data from Binance in the background.
 */
export function BackgroundTradingChart({
  opacity = 0.3,
  height = 600,
}: BackgroundTradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const wsServiceRef = useRef<BinanceWebSocketService | null>(null);

  // Bollinger Bands series
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Historical data for recalculation
  const historicalDataRef = useRef<KlineData[]>([]);

  const [isDesktop, setIsDesktop] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // MOBILE DETECTION (Tailwind md breakpoint = 768px)
  // ============================================================================
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);

    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // ============================================================================
  // CHART INITIALIZATION (Following TradingView Official Pattern)
  // ============================================================================
  useEffect(() => {
    if (!isDesktop || !chartContainerRef.current) return;

    let chart: IChartApi | null = null;
    let candlestickSeries: ISeriesApi<'Candlestick'> | null = null;
    let cleanup: (() => void) | null = null;

    const initChart = async () => {
      try {
        const container = chartContainerRef.current;
        if (!container) {
          throw new Error('Chart container not found');
        }

        console.log('[BackgroundChart] Initializing chart...');
        console.log('[BackgroundChart] Container dimensions:', {
          width: container.clientWidth,
          height: container.clientHeight,
          offsetWidth: container.offsetWidth,
          offsetHeight: container.offsetHeight,
        });

        // ======================================================================
        // STEP 1: FETCH HISTORICAL DATA (300 candles = 5 hours @ 1m)
        // ======================================================================
        console.log('[BackgroundChart] Fetching historical data from Binance...');
        const historicalData = await fetchHistoricalKlines('BTCUSDT', '1m', 300);

        if (historicalData.length === 0) {
          throw new Error('No historical data received from Binance');
        }

        console.log(`[BackgroundChart] ✓ Loaded ${historicalData.length} candles`);

        // Store historical data for indicator updates
        historicalDataRef.current = historicalData;

        // ======================================================================
        // STEP 2: CREATE CHART (TradingView Standard)
        // ======================================================================
        chart = createChart(container, {
          width: container.clientWidth,
          height: height,

          // Layout configuration
          layout: {
            background: {
              type: ColorType.Solid,
              color: 'transparent' // Transparent for background display
            },
            textColor: 'rgba(255, 255, 255, 0.3)', // Subtle text
          },

          // Grid configuration (disabled for clean background)
          grid: {
            vertLines: {
              visible: false,
            },
            horzLines: {
              visible: false,
            },
          },

          // Crosshair configuration (disabled for background)
          crosshair: {
            mode: CrosshairMode.Hidden,
          },

          // Price scale configuration (hidden for clean background)
          rightPriceScale: {
            visible: false,
            borderVisible: false,
          },
          leftPriceScale: {
            visible: false,
          },

          // Time scale configuration (hidden for clean background)
          timeScale: {
            visible: false,
            borderVisible: false,
            timeVisible: true,
            secondsVisible: false,
          },

          // Interaction configuration (disabled for background)
          handleScroll: false,
          handleScale: false,
          kineticScroll: {
            mouse: false,
            touch: false,
          },
        });

        chartRef.current = chart;
        console.log('[BackgroundChart] ✓ Chart created');

        // ======================================================================
        // STEP 3: ADD CANDLESTICK SERIES (TradingView v5.x Standard)
        // ======================================================================
        const finalOpacity = 0.7; // Fixed higher opacity for visibility

        // Nova API da v5.x: chart.addSeries(CandlestickSeries, options)
        candlestickSeries = chart.addSeries(CandlestickSeries, {
          // Colors for bullish candles (green) - More visible
          upColor: `rgba(34, 197, 94, ${finalOpacity})`, // green-500
          borderUpColor: `rgba(34, 197, 94, 0.9)`,
          wickUpColor: `rgba(34, 197, 94, ${finalOpacity * 0.8})`,

          // Colors for bearish candles (red) - More visible
          downColor: `rgba(239, 68, 68, ${finalOpacity})`, // red-500
          borderDownColor: `rgba(239, 68, 68, 0.9)`,
          wickDownColor: `rgba(239, 68, 68, ${finalOpacity * 0.8})`,
        });

        candlestickSeriesRef.current = candlestickSeries;
        console.log('[BackgroundChart] ✓ Candlestick series added (v5.x API) with opacity:', finalOpacity);

        // ======================================================================
        // STEP 4: SET HISTORICAL DATA (TradingView Standard)
        // ======================================================================
        const candleData: CandlestickData[] = historicalData.map(k => ({
          time: k.time as UTCTimestamp,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
        }));

        candlestickSeries.setData(candleData);
        console.log('[BackgroundChart] ✓ Historical data loaded:', {
          totalCandles: candleData.length,
          firstCandle: candleData[0],
          lastCandle: candleData[candleData.length - 1],
          priceRange: {
            min: Math.min(...candleData.map(c => c.low)),
            max: Math.max(...candleData.map(c => c.high)),
          }
        });

        // Zoom in: show only last 100 candles (instead of all 300)
        // Add extra margin to the right to bring last candle closer to buttons
        const visibleCandles = 100;
        const lastCandleIndex = candleData.length - 1;
        const firstVisibleIndex = Math.max(0, lastCandleIndex - visibleCandles);
        const rightMargin = 10; // Add 10 candles margin to the right

        chart.timeScale().setVisibleLogicalRange({
          from: firstVisibleIndex,
          to: lastCandleIndex + rightMargin,
        });

        console.log('[BackgroundChart] ✓ Zoom applied: showing last', visibleCandles, 'candles with right margin');

        // ======================================================================
        // STEP 5: ADD BOLLINGER BANDS (BB)
        // ======================================================================
        const closes = historicalData.map(k => k.close);
        const bb = calculateBollingerBands(closes, 20, 2);

        // Upper band (azul claro)
        const bbUpperSeries = chart.addSeries(LineSeries, {
          color: `rgba(59, 130, 246, ${opacity * 1.5})`, // blue-500
          lineWidth: 1,
          priceScaleId: 'right',
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const bbUpperData = klineToIndicatorData(historicalData, bb.upper, v => v);
        bbUpperSeries.setData(bbUpperData as LineData[]);
        bbUpperRef.current = bbUpperSeries;

        // Middle band - SMA 20 (amarelo)
        const bbMiddleSeries = chart.addSeries(LineSeries, {
          color: `rgba(251, 191, 36, ${opacity * 1.5})`, // amber-400
          lineWidth: 1,
          priceScaleId: 'right',
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const bbMiddleData = klineToIndicatorData(historicalData, bb.middle, v => v);
        bbMiddleSeries.setData(bbMiddleData as LineData[]);
        bbMiddleRef.current = bbMiddleSeries;

        // Lower band (azul claro)
        const bbLowerSeries = chart.addSeries(LineSeries, {
          color: `rgba(59, 130, 246, ${opacity * 1.5})`, // blue-500
          lineWidth: 1,
          priceScaleId: 'right',
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const bbLowerData = klineToIndicatorData(historicalData, bb.lower, v => v);
        bbLowerSeries.setData(bbLowerData as LineData[]);
        bbLowerRef.current = bbLowerSeries;

        console.log('[BackgroundChart] ✓ Bollinger Bands added (20, 2)');

        // ======================================================================
        // STEP 6: WEBSOCKET REAL-TIME UPDATES (Binance Stream)
        // ======================================================================
        const wsService = new BinanceWebSocketService();
        wsServiceRef.current = wsService;

        cleanup = wsService.subscribeKline('BTCUSDT', '1m', (kline) => {
          if (!candlestickSeriesRef.current) return;

          // Update candle chart
          const update: CandlestickData = {
            time: kline.time as UTCTimestamp,
            open: kline.open,
            high: kline.high,
            low: kline.low,
            close: kline.close,
          };

          candlestickSeriesRef.current.update(update);
          setIsConnected(true);

          // Update historical data for indicator recalculation
          if (kline.isClosed) {
            // Add new closed candle
            historicalDataRef.current.push(kline);

            // Keep only last 300 candles
            if (historicalDataRef.current.length > 300) {
              historicalDataRef.current.shift();
            }

            console.log('[BackgroundChart] New candle closed:', {
              time: new Date(kline.time * 1000).toLocaleTimeString(),
              close: kline.close.toFixed(2),
            });
          } else {
            // Update last candle (live update)
            const lastIdx = historicalDataRef.current.length - 1;
            historicalDataRef.current[lastIdx] = kline;
          }

          // Recalculate indicators
          const closes = historicalDataRef.current.map(k => k.close);

          // Update Bollinger Bands
          const bb = calculateBollingerBands(closes, 20, 2);
          const lastIdx = closes.length - 1;

          if (!isNaN(bb.upper[lastIdx]) && bbUpperRef.current) {
            bbUpperRef.current.update({ time: kline.time as UTCTimestamp, value: bb.upper[lastIdx] });
          }
          if (!isNaN(bb.middle[lastIdx]) && bbMiddleRef.current) {
            bbMiddleRef.current.update({ time: kline.time as UTCTimestamp, value: bb.middle[lastIdx] });
          }
          if (!isNaN(bb.lower[lastIdx]) && bbLowerRef.current) {
            bbLowerRef.current.update({ time: kline.time as UTCTimestamp, value: bb.lower[lastIdx] });
          }
        });

        console.log('[BackgroundChart] ✓ WebSocket connected');

        // ======================================================================
        // STEP 6: RESPONSIVE RESIZE HANDLER
        // ======================================================================
        const handleResize = () => {
          if (chart && chartContainerRef.current) {
            chart.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener('resize', handleResize);

        // ======================================================================
        // CLEANUP FUNCTION
        // ======================================================================
        return () => {
          window.removeEventListener('resize', handleResize);
          if (cleanup) cleanup();
          if (wsService) wsService.disconnect();
          if (chart) chart.remove();
        };

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[BackgroundChart] Error:', errorMessage);
        setError(errorMessage);
      }
    };

    initChart();

    // Cleanup on unmount
    return () => {
      if (cleanup) cleanup();
      if (wsServiceRef.current) wsServiceRef.current.disconnect();
      if (chartRef.current) chartRef.current.remove();
    };
  }, [isDesktop, opacity, height]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Don't render on mobile
  if (!isDesktop) {
    return null;
  }

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none flex items-center justify-center">
      <div
        ref={chartContainerRef}
        className="w-full"
        style={{
          height: `${height}px`,
          opacity: error ? 0.1 : 0.9,
        }}
      />

      {/* Status Indicator - Always visible for debugging */}
      <div className="absolute top-4 right-4 text-xs pointer-events-none bg-black/50 px-2 py-1 rounded">
        {error ? (
          <span className="text-red-400">🔴 Error: {error}</span>
        ) : isConnected ? (
          <span className="text-green-400">🟢 Live BTC/USDT</span>
        ) : (
          <span className="text-yellow-400">🟡 Loading chart...</span>
        )}
      </div>
    </div>
  );
}
