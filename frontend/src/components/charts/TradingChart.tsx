/**
 * @fileoverview TradingView Lightweight Charts + Binance WebSocket
 * @description Professional trading chart with real-time Binance data
 * @version 4.0.0
 * 
 * STACK:
 * - TradingView Lightweight Charts (visualization)
 * - Native WebSocket (real-time data)
 * - Binance Public API + WebSocket
 * 
 * FEATURES:
 * - ✅ Real-time WebSocket updates (native browser WS)
 * - ✅ Professional candlestick chart
 * - ✅ Volume histogram
 * - ✅ Dark mode theme
 * - ✅ Responsive & mobile-friendly
 * - ✅ Automatic reconnection
 * - ✅ BTC/USDT 1m timeframe
 * - ✅ Historical data + live updates
 */

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import {
  BinanceWebSocketService,
  fetchHistoricalKlines,
  fetch24hStats,
  formatSymbolForBinance,
  formatSymbolForDisplay,
  type TimeframeType,
} from '../../lib/binance-websocket';

interface TradingChartProps {
  symbol?: string;
  height?: number;
  interval?: TimeframeType;
}

/**
 * TradingChart Component
 * @description Real-time trading chart with Binance data
 */
export function TradingChart({ 
  symbol = 'BTC/USDT', 
  height = 500,
  interval = '1m'
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const wsServiceRef = useRef<BinanceWebSocketService | null>(null);
  
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats24h, setStats24h] = useState<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart: IChartApi | null = null;
    let candlestickSeries: ISeriesApi<'Candlestick'> | null = null;
    let volumeSeries: ISeriesApi<'Histogram'> | null = null;
    let cleanup: (() => void) | null = null;

    const binanceSymbol = formatSymbolForBinance(symbol);

    // ========================================================================
    // INITIALIZE CHART
    // ========================================================================
    const initChart = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch historical data
        const historicalData = await fetchHistoricalKlines(binanceSymbol, interval, 100);
        
        // Fetch 24h stats
        const stats = await fetch24hStats(binanceSymbol);
        setStats24h(stats);

        if (historicalData.length === 0) {
          throw new Error('No data received from Binance');
        }

        // ========================================================================
        // CREATE CHART - DARK MODE
        // ========================================================================
        chart = createChart(chartContainerRef.current!, {
          width: chartContainerRef.current!.clientWidth,
          height: height,
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#9CA3AF',
          },
          grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
          },
          rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
          timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            timeVisible: true,
          },
        });

        // ========================================================================
        // CANDLESTICK SERIES
        // ========================================================================
        candlestickSeries = chart.addCandlestickSeries({
          upColor: '#10B981',
          downColor: '#EF4444',
          borderUpColor: '#10B981',
          borderDownColor: '#EF4444',
          wickUpColor: '#10B981',
          wickDownColor: '#EF4444',
        });

        // ========================================================================
        // VOLUME SERIES
        // ========================================================================
        volumeSeries = chart.addHistogramSeries({
          color: '#06B6D4',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
        });

        chart.priceScale('').applyOptions({
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });

        // ========================================================================
        // SET HISTORICAL DATA
        // ========================================================================
        const candleData = historicalData.map(k => ({
          time: k.time as any,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
        }));

        const volumeData = historicalData.map(k => ({
          time: k.time as any,
          value: k.volume,
          color: k.close > k.open ? '#10B98180' : '#EF444480',
        }));

        candlestickSeries.setData(candleData);
        volumeSeries.setData(volumeData);

        // Set initial price
        const lastCandle = historicalData[historicalData.length - 1];
        setCurrentPrice(lastCandle.close);
        
        const firstCandle = historicalData[0];
        const change = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;
        setPriceChange(change);

        // Fit content
        chart.timeScale().fitContent();

        setIsLoading(false);

        // ========================================================================
        // WEBSOCKET - REAL-TIME UPDATES
        // ========================================================================
        const wsService = new BinanceWebSocketService();
        wsServiceRef.current = wsService;

        cleanup = wsService.subscribeKline(binanceSymbol, interval, (kline) => {
          if (!candlestickSeries || !volumeSeries) return;

          setIsConnected(true);

          // Update candlestick
          candlestickSeries.update({
            time: kline.time as any,
            open: kline.open,
            high: kline.high,
            low: kline.low,
            close: kline.close,
          });

          // Update volume
          volumeSeries.update({
            time: kline.time as any,
            value: kline.volume,
            color: kline.close > kline.open ? '#10B98180' : '#EF444480',
          });

          // Update current price
          setCurrentPrice(kline.close);

          // Update price change
          if (historicalData.length > 0) {
            const change = ((kline.close - historicalData[0].open) / historicalData[0].open) * 100;
            setPriceChange(change);
          }
        });

        // ========================================================================
        // RESPONSIVE HANDLING
        // ========================================================================
        const handleResize = () => {
          if (chartContainerRef.current && chart) {
            chart.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        // ========================================================================
        // SAVE REFERENCES
        // ========================================================================
        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;
        volumeSeriesRef.current = volumeSeries;

        // ========================================================================
        // CLEANUP ON UNMOUNT
        // ========================================================================
        return () => {
          window.removeEventListener('resize', handleResize);
          if (cleanup) cleanup();
          if (chart) chart.remove();
        };

      } catch (err: any) {
        console.error('Failed to initialize chart:', err);
        setError(err.message || 'Failed to load chart data');
        setIsLoading(false);
      }
    };

    initChart();

    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [symbol, interval, height]);

  // ========================================================================
  // RENDER
  // ========================================================================
  const displaySymbol = formatSymbolForDisplay(formatSymbolForBinance(symbol));

  return (
    <div className="relative w-full">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 backdrop-blur-sm rounded-xl">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 font-medium">Carregando dados da Binance...</p>
            <p className="text-gray-600 text-sm mt-2">Conectando ao WebSocket</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 backdrop-blur-sm rounded-xl">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-400 font-semibold mb-2">Erro ao carregar dados</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Header with Symbol and Live Price */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl sm:text-3xl font-bold text-white">{displaySymbol}</h3>
            {isConnected && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-400/30">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-green-400">Live</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-2 mt-1.5">
            <span className="font-semibold">Binance</span>
            <span className="text-gray-700">•</span>
            <span>{interval}</span>
            <span className="text-gray-700">•</span>
            <span className="text-orange-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              WebSocket
            </span>
          </p>
        </div>
        
        <div className="text-left sm:text-right">
          <div className="text-2xl sm:text-4xl font-bold text-white tabular-nums">
            ${currentPrice.toLocaleString('en-US', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}
          </div>
          <div className={`text-sm font-semibold tabular-nums ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {priceChange >= 0 ? '▲' : '▼'} {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="rounded-xl overflow-hidden border border-white/10 bg-black/50"
        style={{ height: `${height}px` }}
      />

      {/* Chart Info - 24h Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-green-400/30 transition-colors">
          <div className="text-xs text-gray-500 mb-1">24h High</div>
          <div className="text-sm font-bold text-green-400 tabular-nums">
            ${stats24h ? parseFloat(stats24h.high).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-red-400/30 transition-colors">
          <div className="text-xs text-gray-500 mb-1">24h Low</div>
          <div className="text-sm font-bold text-red-400 tabular-nums">
            ${stats24h ? parseFloat(stats24h.low).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-cyan-400/30 transition-colors">
          <div className="text-xs text-gray-500 mb-1">24h Volume</div>
          <div className="text-sm font-bold text-cyan-400 tabular-nums">
            {stats24h ? `$${(stats24h.quoteVolume / 1e9).toFixed(2)}B` : '—'}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-purple-400/30 transition-colors">
          <div className="text-xs text-gray-500 mb-1">24h Change</div>
          <div className={`text-sm font-bold tabular-nums ${stats24h && stats24h.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats24h ? `${stats24h.priceChangePercent >= 0 ? '+' : ''}${stats24h.priceChangePercent.toFixed(2)}%` : '—'}
          </div>
        </div>
      </div>

      {/* Strategy Indicators */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-400/20">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-medium text-green-400">Bot Ativo</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/20">
          <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-xs font-medium text-cyan-400">Scalper AI</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-400/20">
          <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-xs font-medium text-purple-400">+127% Este Mês</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-400/20">
          <svg className="w-3 h-3 text-orange-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs font-medium text-orange-400">Tempo Real</span>
        </div>
      </div>
    </div>
  );
}
