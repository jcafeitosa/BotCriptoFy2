/**
 * @fileoverview Chart Data Web Worker
 * @description Offload heavy data processing to a separate thread
 * @version 1.0.0
 *
 * FEATURES:
 * - ✅ Process historical kline data in parallel
 * - ✅ Transform WebSocket messages in background
 * - ✅ Calculate technical indicators without blocking UI
 * - ✅ Non-blocking data aggregation
 *
 * PERFORMANCE:
 * - Frees main thread for UI rendering
 * - Parallel processing of large datasets
 * - Reduces frame drops during data updates
 */

export interface WorkerRequest {
  type: 'PROCESS_HISTORICAL' | 'PROCESS_KLINE' | 'CALCULATE_INDICATORS';
  payload: any;
}

export interface WorkerResponse {
  type: string;
  data: any;
  error?: string;
}

// ============================================================================
// HISTORICAL DATA PROCESSING
// ============================================================================

function processHistoricalData(rawData: any[]): any[] {
  return rawData.map((candle) => ({
    time: Math.floor(candle[0] / 1000),
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5]),
    isClosed: true,
  }));
}

// ============================================================================
// KLINE DATA PROCESSING
// ============================================================================

function processKlineUpdate(data: any): any {
  if (data.e === 'kline' && data.k) {
    const k = data.k;
    return {
      time: Math.floor(k.t / 1000),
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      isClosed: k.x,
    };
  }
  return null;
}

// ============================================================================
// TECHNICAL INDICATORS (Example: SMA)
// ============================================================================

function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }

    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    sma.push(sum / period);
  }

  return sma;
}

function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);

  // First EMA is SMA
  const firstSMA = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  ema.push(firstSMA);

  for (let i = period; i < data.length; i++) {
    const value = data[i] * k + ema[ema.length - 1] * (1 - k);
    ema.push(value);
  }

  return ema;
}

function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      rsi.push(NaN);
      continue;
    }

    const avgGain = gains.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

function calculateIndicators(data: any[], indicators: string[]): any {
  const closes = data.map(d => d.close);
  const result: any = {};

  for (const indicator of indicators) {
    switch (indicator) {
      case 'SMA_20':
        result.sma20 = calculateSMA(closes, 20);
        break;
      case 'SMA_50':
        result.sma50 = calculateSMA(closes, 50);
        break;
      case 'EMA_12':
        result.ema12 = calculateEMA(closes, 12);
        break;
      case 'EMA_26':
        result.ema26 = calculateEMA(closes, 26);
        break;
      case 'RSI_14':
        result.rsi14 = calculateRSI(closes, 14);
        break;
      default:
        break;
    }
  }

  return result;
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, payload } = event.data;

  try {
    let response: WorkerResponse;

    switch (type) {
      case 'PROCESS_HISTORICAL':
        const processedData = processHistoricalData(payload);
        response = {
          type: 'PROCESSED_HISTORICAL',
          data: processedData,
        };
        break;

      case 'PROCESS_KLINE':
        const klineData = processKlineUpdate(payload);
        response = {
          type: 'PROCESSED_KLINE',
          data: klineData,
        };
        break;

      case 'CALCULATE_INDICATORS':
        const { data, indicators } = payload;
        const calculatedIndicators = calculateIndicators(data, indicators);
        response = {
          type: 'CALCULATED_INDICATORS',
          data: calculatedIndicators,
        };
        break;

      default:
        response = {
          type: 'ERROR',
          data: null,
          error: `Unknown message type: ${type}`,
        };
    }

    self.postMessage(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: 'ERROR',
      data: null,
      error: errorMsg,
    });
  }
};

// Ready signal
self.postMessage({ type: 'READY', data: null });
