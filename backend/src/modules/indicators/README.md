# 📊 Indicators Module

> Technical Analysis Indicators Service - Core calculation engine for trading strategies

## Overview

The `indicators` module provides **technical analysis indicators** for all trading modules in the system. It acts as a centralized service for calculating, caching, and serving indicator data.

### Supported Indicators

#### 🎯 Momentum Indicators
- **RSI** - Relative Strength Index (overbought/oversold)
- **MACD** - Moving Average Convergence Divergence
- **Stochastic** - Stochastic Oscillator (%K, %D)
- **CCI** - Commodity Channel Index
- **ROC** - Rate of Change
- **MFI** - Money Flow Index
- **Williams %R** - Williams Percent Range

#### 📈 Trend Indicators
- **SMA** - Simple Moving Average
- **EMA** - Exponential Moving Average
- **WMA** - Weighted Moving Average
- **ADX** - Average Directional Index (trend strength)
- **Parabolic SAR** - Stop and Reverse

#### 🌪️ Volatility Indicators
- **Bollinger Bands** - Price bands with standard deviation
- **ATR** - Average True Range
- **Keltner Channels** - EMA-based channels
- **Standard Deviation** - Price volatility measure

#### 📦 Volume Indicators
- **OBV** - On Balance Volume
- **VWAP** - Volume Weighted Average Price
- **AD** - Accumulation/Distribution
- **VWMA** - Volume Weighted Moving Average

---

## 🎯 Module Purpose

This module serves **all other modules** in the system:

| Consumer Module | Use Case |
|----------------|----------|
| **strategies** | Evaluate entry/exit conditions |
| **bots** | Automated trading decisions |
| **social-trading** | Signal analysis and validation |
| **risk** | Volatility assessment |
| **market-data** | Real-time data enrichment |

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { IndicatorFactory } from '@/modules/indicators';

// Calculate RSI
const rsi = await IndicatorFactory.calculate({
  exchangeId: 'binance',
  symbol: 'BTC/USDT',
  timeframe: '1h',
  indicatorType: 'RSI',
  configuration: { type: 'RSI', period: 14 },
  useCache: true,
});

console.log(rsi.data?.value); // { rsi: 65.5, overbought: false, oversold: false }
```

### Batch Calculation

```typescript
const results = await IndicatorFactory.calculateBatch({
  exchangeId: 'binance',
  symbol: 'BTC/USDT',
  timeframe: '15m',
  indicators: [
    { type: 'RSI', period: 14 },
    { type: 'MACD', fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    { type: 'BollingerBands', period: 20, stdDevMultiplier: 2 },
  ],
  useCache: true,
});
```

### Using Presets

```typescript
import { IndicatorPresets } from '@/modules/indicators';

// Get scalping preset
const scalpingRSI = IndicatorPresets.scalping.rsi;

const result = await IndicatorFactory.calculate({
  exchangeId: 'binance',
  symbol: 'ETH/USDT',
  timeframe: '5m',
  indicatorType: 'RSI',
  configuration: scalpingRSI,
});
```

---

## 📁 Module Structure

```
indicators/
├── types/
│   └── indicators.types.ts      # TypeScript interfaces
├── schema/
│   └── indicators.schema.ts     # Drizzle ORM schemas
├── utils/
│   └── indicator-calculator.ts  # technicalindicators wrapper
├── services/
│   ├── indicators.service.ts    # Main calculation service
│   └── indicator-factory.service.ts  # Factory pattern
├── presets/
│   └── indicator-presets.ts     # Pre-configured presets
├── routes/
│   └── indicators.routes.ts     # API endpoints
├── __tests__/
│   └── *.test.ts                # Unit tests (≥80% coverage)
└── index.ts                      # Barrel exports
```

---

## 🔧 Configuration Examples

### RSI (Relative Strength Index)

```typescript
{
  type: 'RSI',
  period: 14,  // Default: 14
}

// Interpretation:
// RSI > 70 = Overbought (potential sell signal)
// RSI < 30 = Oversold (potential buy signal)
```

### MACD

```typescript
{
  type: 'MACD',
  fastPeriod: 12,    // Default: 12
  slowPeriod: 26,    // Default: 26
  signalPeriod: 9,   // Default: 9
}

// Interpretation:
// MACD crosses above signal = Bullish
// MACD crosses below signal = Bearish
```

### Bollinger Bands

```typescript
{
  type: 'BollingerBands',
  period: 20,            // Default: 20
  stdDevMultiplier: 2,   // Default: 2
}

// Interpretation:
// Price touches upper band = Overbought
// Price touches lower band = Oversold
// Bandwidth squeeze = Low volatility (breakout expected)
```

---

## 🗄️ Database Schema

### Tables

1. **indicator_presets** - Reusable indicator configurations
2. **indicator_cache** - Cached calculation results
3. **indicator_calculation_logs** - Analytics and debugging

### Caching Strategy

- **TTL**: 1 minute for 1m timeframe, 5 minutes for 5m, etc.
- **Invalidation**: Automatic expiration + manual clear
- **Hit Rate Target**: ≥80%

---

## 🌐 API Endpoints

### Calculate Single Indicator

```http
POST /api/v1/indicators/calculate
Content-Type: application/json

{
  "exchangeId": "binance",
  "symbol": "BTC/USDT",
  "timeframe": "1h",
  "indicatorType": "RSI",
  "configuration": { "type": "RSI", "period": 14 },
  "useCache": true
}
```

### Calculate Multiple Indicators

```http
POST /api/v1/indicators/batch
Content-Type: application/json

{
  "exchangeId": "binance",
  "symbol": "BTC/USDT",
  "timeframe": "1h",
  "indicators": [
    { "type": "RSI", "period": 14 },
    { "type": "MACD", "fastPeriod": 12, "slowPeriod": 26, "signalPeriod": 9 }
  ]
}
```

### Preset Management

```http
GET    /api/v1/indicators/presets        # List presets
POST   /api/v1/indicators/presets        # Create preset
GET    /api/v1/indicators/presets/:id    # Get preset
PATCH  /api/v1/indicators/presets/:id    # Update preset
DELETE /api/v1/indicators/presets/:id    # Delete preset
```

---

## 📊 Presets Library

### Scalping (Short-term, 1m-5m)

```typescript
scalping: {
  rsi: { type: 'RSI', period: 7 },
  ema_fast: { type: 'EMA', period: 9 },
  ema_slow: { type: 'EMA', period: 21 },
  stochastic: { type: 'Stochastic', period: 5, signalPeriod: 3 },
}
```

### Day Trading (Medium-term, 15m-1h)

```typescript
dayTrading: {
  rsi: { type: 'RSI', period: 14 },
  macd: { type: 'MACD', fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  bollinger: { type: 'BollingerBands', period: 20, stdDevMultiplier: 2 },
  vwap: { type: 'VWAP' },
}
```

### Swing Trading (Long-term, 4h-1d)

```typescript
swingTrading: {
  rsi: { type: 'RSI', period: 14 },
  ema_fast: { type: 'EMA', period: 50 },
  ema_slow: { type: 'EMA', period: 200 },
  adx: { type: 'ADX', period: 14 },
  atr: { type: 'ATR', period: 14 },
}
```

---

## 🧪 Testing

```bash
# Run tests
bun test src/modules/indicators/__tests__/

# Coverage report
bun test --coverage src/modules/indicators/

# Target: ≥80% coverage
```

---

## 🔗 Integration Example (Strategies Module)

```typescript
// strategies/services/strategy.service.ts

import { IndicatorFactory } from '@/modules/indicators';

async calculateIndicators(ohlcvData: any[], indicators: any[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  for (const indicator of indicators) {
    const result = await IndicatorFactory.calculate({
      exchangeId: this.exchangeId,
      symbol: this.symbol,
      timeframe: this.timeframe,
      indicatorType: indicator.type,
      configuration: indicator,
      useCache: true,
    });

    if (result.success && result.data) {
      results[indicator.type] = result.data.value;
    }
  }

  return results;
}
```

---

## 🚨 Error Handling

All calculations include comprehensive error handling:

```typescript
try {
  const result = await IndicatorFactory.calculate(request);

  if (!result.success) {
    console.error('Calculation failed:', result.error);
  }
} catch (error) {
  // Handle insufficient data, invalid parameters, etc.
  console.error('Indicator calculation error:', error);
}
```

Common errors:
- **Insufficient Data**: Need more candles for calculation
- **Invalid Parameters**: Period out of range, etc.
- **Market Data Unavailable**: Exchange/symbol not found

---

## 📈 Performance

- **Calculation Time**: 5-50ms per indicator
- **Cache Hit Rate**: 80-95% (target)
- **Throughput**: 1000+ calculations/second

---

## 🔮 Future Enhancements

- [ ] Custom indicator support (user-defined formulas)
- [ ] Real-time indicator streaming via WebSocket
- [ ] Machine learning-based indicators
- [ ] Multi-timeframe analysis
- [ ] Indicator correlation analysis

---

## 📚 Resources

- [Technical Indicators Library Docs](https://github.com/anandanand84/technicalindicators)
- [Technical Analysis Explained](https://www.investopedia.com/terms/t/technicalindicator.asp)
- [TradingView Indicators](https://www.tradingview.com/support/solutions/43000502284-indicators-basics/)

---

**Module Version**: 1.0.0
**Last Updated**: 2025-10-17
**Maintainer**: BotCriptoFy2 Team
