---
description: Executa backtest de estratégia contra dados históricos
---

# Run Strategy Backtest

Executa backtesting completo de estratégia de trading com dados históricos.

**🔌 MCP Integration**:
- `@ccxt-mcp` - Busca dados históricos de exchanges
- `@filesystem-mcp` - Salva resultados otimizado

## Configuração do Backtest

```typescript
interface BacktestConfig {
  strategy: TradingStrategy;
  symbol: string;              // 'BTC/USDT'
  timeframe: string;           // '1h', '4h', '1d'
  startDate: Date;             // Data inicial
  endDate: Date;               // Data final
  initialCapital: number;      // Capital inicial em USDT
  commission: number;          // Taxa da exchange (0.001 = 0.1%)
  slippage: number;            // Slippage esperado (0.001 = 0.1%)
}
```

## Processo de Backtesting

### 1. Carregar Dados Históricos

```typescript
const candles = await exchange.fetchOHLCV(
  config.symbol,
  config.timeframe,
  config.startDate.getTime(),
  1000 // limit per request
);

// Se precisar mais dados, fazer paginação
while (candles.length < expectedLength) {
  const since = candles[candles.length - 1][0] + 1;
  const moreCan dles = await exchange.fetchOHLCV(
    config.symbol,
    config.timeframe,
    since,
    1000
  );
  candles.push(...moreCandles);
}

console.log(`✅ Loaded ${candles.length} candles`);
```

### 2. Calcular Indicadores

```typescript
const indicators = {
  rsi: RSI.calculate({
    values: candles.map(c => c[4]), // close prices
    period: 14
  }),
  macd: MACD.calculate({
    values: candles.map(c => c[4]),
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9
  }),
  bb: BollingerBands.calculate({
    values: candles.map(c => c[4]),
    period: 20,
    stdDev: 2
  })
};

console.log(`✅ Indicators calculated`);
```

### 3. Executar Estratégia

```typescript
interface BacktestState {
  balance: number;
  position: {
    amount: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
  } | null;
  trades: Trade[];
  equity: number[];
}

const state: BacktestState = {
  balance: config.initialCapital,
  position: null,
  trades: [],
  equity: [config.initialCapital]
};

for (let i = 0; i < candles.length; i++) {
  const candle = candles[i];
  const currentIndicators = getCurrentIndicators(indicators, i);
  
  // Gerar sinal
  const signal = strategy.analyze(
    candles.slice(Math.max(0, i - 100), i + 1),
    currentIndicators
  );
  
  // Executar trade
  if (signal.action === 'BUY' && !state.position) {
    executeBuy(state, candle, signal, config);
  } else if (signal.action === 'SELL' && state.position) {
    executeSell(state, candle, signal, config);
  }
  
  // Verificar stop-loss / take-profit
  checkStopLossTakeProfit(state, candle);
  
  // Atualizar equity
  updateEquity(state, candle);
}

console.log(`✅ Backtest completed: ${state.trades.length} trades`);
```

### 4. Calcular Métricas

```typescript
interface BacktestMetrics {
  // Trading metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  // Profit metrics
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  profitFactor: number;
  
  // Risk metrics
  maxDrawdown: number;
  maxDrawdownDuration: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Performance
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  riskRewardRatio: number;
  
  // Time
  startDate: Date;
  endDate: Date;
  duration: number; // days
  
  // Final
  initialCapital: number;
  finalCapital: number;
  totalReturn: number; // percentage
  annualizedReturn: number;
}

const metrics = calculateMetrics(state, config);
console.log(JSON.stringify(metrics, null, 2));
```

### 5. Análise de Resultados

```typescript
// ✅ Boas métricas
const goodBacktest = {
  winRate: 0.48,           // 48% (≥ 40%)
  profitFactor: 2.1,       // 2.1x (≥ 1.5)
  maxDrawdown: 0.12,       // 12% (≤ 20%)
  sharpeRatio: 1.8,        // 1.8 (≥ 1.0)
  riskRewardRatio: 2.5,    // 2.5:1 (≥ 1.5:1)
  totalReturn: 0.45,       // 45% no período
  annualizedReturn: 0.22   // 22% ao ano
};

// ❌ Métricas ruins
const badBacktest = {
  winRate: 0.30,           // 30% (muito baixo)
  profitFactor: 0.8,       // < 1 (perdendo dinheiro)
  maxDrawdown: 0.35,       // 35% (muito alto)
  sharpeRatio: 0.3,        // Muito volátil
  totalReturn: -0.15       // -15% (prejuízo)
};
```

## 6. Validação de Backtest

### Checklist de Qualidade

- [ ] **Trades suficientes**: ≥ 100 trades
- [ ] **Win rate aceitável**: ≥ 40%
- [ ] **Profit factor**: ≥ 1.5
- [ ] **Max drawdown**: ≤ 20%
- [ ] **Sharpe ratio**: ≥ 1.0
- [ ] **Risk/Reward**: ≥ 1.5:1
- [ ] **Período testado**: ≥ 1 ano
- [ ] **Múltiplos mercados**: Bull, bear, lateral

### Testes de Robustez

```typescript
// Test em diferentes períodos
const periods = [
  { start: '2022-01-01', end: '2022-12-31' }, // Bear market
  { start: '2023-01-01', end: '2023-12-31' }, // Bull market
  { start: '2024-01-01', end: '2024-12-31' }  // Current
];

for (const period of periods) {
  const result = await runBacktest(strategy, period);
  console.log(`${period.start}: Profit ${result.totalReturn}`);
}
```

## 7. Visualização de Resultados

```typescript
// Equity curve
console.log('\n📈 Equity Curve:');
state.equity.forEach((equity, i) => {
  const date = candles[i][0];
  console.log(`${new Date(date).toISOString()}: $${equity.toFixed(2)}`);
});

// Drawdown chart
console.log('\n📉 Drawdowns:');
const drawdowns = calculateDrawdowns(state.equity);
drawdowns.forEach(dd => {
  if (dd.percentage > 0.05) { // > 5%
    console.log(`- ${dd.date}: -${(dd.percentage * 100).toFixed(2)}%`);
  }
});

// Trade distribution
console.log('\n📊 Trade Distribution:');
console.log(`Wins: ${metrics.winningTrades} (${metrics.winRate * 100}%)`);
console.log(`Losses: ${metrics.losingTrades} (${(1 - metrics.winRate) * 100}%)`);
```

## 8. Report Generation

```markdown
# Backtest Report - [Strategy Name]

**Generated**: 2025-01-11
**Symbol**: BTC/USDT
**Timeframe**: 1h
**Period**: 2023-01-01 to 2024-12-31 (365 days)

## Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total Trades** | 158 | ✅ ≥100 |
| **Win Rate** | 48% | ✅ ≥40% |
| **Profit Factor** | 2.1 | ✅ ≥1.5 |
| **Max Drawdown** | 12% | ✅ ≤20% |
| **Sharpe Ratio** | 1.8 | ✅ ≥1.0 |
| **Total Return** | 45% | ✅ |
| **Annualized** | 45% | ✅ |

## Capital

- **Initial**: $10,000
- **Final**: $14,500
- **Net Profit**: +$4,500 (+45%)

## Trading Stats

- **Winning Trades**: 76 (48%)
- **Losing Trades**: 82 (52%)
- **Average Win**: $102.50
- **Average Loss**: -$51.20
- **Risk/Reward**: 2.0:1

## Risk Analysis

- **Max Drawdown**: -12% (-$1,200)
- **Drawdown Duration**: 23 days
- **Sharpe Ratio**: 1.8
- **Sortino Ratio**: 2.3

## Recommendation

✅ **APPROVED FOR PRODUCTION**

**Justification**:
- All metrics above minimum requirements
- Tested in multiple market conditions
- Risk management effective
- Consistent performance

**Conditions**:
- Start with small capital ($1,000)
- Monitor first 10 trades closely
- Set max loss limit ($200)
- Review after 1 month
```

---

## Aprovação de Backtest

### Critérios de Aprovação

**Métrica Mínima:**
- Win rate ≥ 40%
- Profit factor ≥ 1.5
- Max drawdown ≤ 20%
- Sharpe ratio ≥ 1.0
- Risk/Reward ≥ 1.5:1
- Total trades ≥ 100
- Período ≥ 1 ano

**Se TODAS atendidas:**
```json
{
  "status": "Aprovado para Produção",
  "start_capital": 1000,
  "max_risk": 200,
  "monitoring": "Primeiro mês crítico"
}
```

**Se QUALQUER falhar:**
```json
{
  "status": "REPROVADO",
  "action": "Otimizar estratégia",
  "issues": ["Win rate abaixo de 40%"]
}
```

---

## ⚠️ AVISOS

- **Backtest ≠ Futuro**: Performance passado não garante futuro
- **Overfitting**: Cuidado com otimização excessiva
- **Market conditions**: Teste em bull, bear e lateral
- **Comissões e slippage**: SEMPRE inclua nos cálculos
- **Start small**: Comece com capital pequeno
- **Monitor closely**: Primeiras semanas são críticas

