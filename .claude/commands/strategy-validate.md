---
description: Valida estratégia de trading antes de deploy em produção
---

# Validação de Estratégia de Trading

Valida estratégia completa antes de permitir uso em produção ou com dinheiro real.

**🔌 MCP Integration**:
- `@ccxt-mcp` - Valida conectividade com exchange
- `@filesystem-mcp` - Lê arquivos de estratégia otimizado
- `@github-mcp` - Cria issue de validação

## Critérios de Validação

### 1. Código da Estratégia

**Estrutura Obrigatória:**
```typescript
interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  parameters: StrategyParameters;
  
  // Métodos obrigatórios
  analyze(candles: OHLCV[], indicators: Indicators): Signal;
  execute(signal: Signal, portfolio: Portfolio): Order[];
  backtest(historicalData: OHLCV[]): BacktestResult;
}
```

**Checklist:**
- [ ] Interface implementada completamente
- [ ] TypeScript sem erros
- [ ] Validação de parâmetros (Zod)
- [ ] Error handling robusto
- [ ] Logging adequado

### 2. Indicadores Técnicos

**Verificar:**
- [ ] Indicadores calculados corretamente
- [ ] Períodos validados (> 0)
- [ ] Dados suficientes para cálculo
- [ ] Valores inválidos tratados (NaN, Infinity)

**Exemplo:**
```typescript
// ✅ Bom
if (candles.length < 26) {
  throw new Error('Insufficient data for MACD calculation');
}

const macd = MACD.calculate({
  values: closePrices,
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9
});

// ❌ Ruim
const macd = MACD.calculate({
  values: closePrices
  // Sem validação de dados suficientes
});
```

### 3. Sinais de Trading

**Verificar:**
- [ ] Sinais de compra bem definidos
- [ ] Sinais de venda bem definidos
- [ ] Sinais de saída (stop-loss/take-profit)
- [ ] Confirmação de sinais (evitar falsos positivos)

**Exemplo:**
```typescript
// ✅ Bom: Confirmação de múltiplos indicadores
if (rsi < 30 && macd.histogram > 0 && price < bollingerBands.lower) {
  return { action: 'BUY', confidence: 0.8 };
}

// ❌ Ruim: Apenas 1 indicador
if (rsi < 30) {
  return { action: 'BUY' };
}
```

### 4. Risk Management

**Obrigatório:**
- [ ] Stop-loss definido
- [ ] Take-profit definido
- [ ] Tamanho de posição calculado
- [ ] Max loss por trade limitado
- [ ] Max drawdown configurado

**Exemplo:**
```typescript
const positionSize = calculatePositionSize({
  capital: portfolio.balance,
  riskPercentage: 0.02, // 2% max risk per trade
  entryPrice: signal.price,
  stopLoss: signal.stopLoss
});
```

### 5. Backtesting

**Mínimo Obrigatório:**
- [ ] Backtest em ≥ 1 ano de dados
- [ ] Backtest em múltiplos mercados (bull, bear, lateral)
- [ ] Win rate ≥ 40%
- [ ] Risk/Reward ratio ≥ 1.5
- [ ] Max drawdown < 20%
- [ ] Profit factor > 1.5

**Métricas:**
```typescript
interface BacktestResult {
  totalTrades: number;          // ≥ 100
  winRate: number;              // ≥ 0.40
  profitFactor: number;         // ≥ 1.5
  sharpeRatio: number;          // ≥ 1.0
  maxDrawdown: number;          // ≤ 0.20
  averageWin: number;
  averageLoss: number;
  riskRewardRatio: number;      // ≥ 1.5
  totalProfit: number;
  totalLoss: number;
}
```

### 6. Testes Unitários

```typescript
describe('GridStrategy', () => {
  it('should generate buy signal when price hits lower grid', async () => {
    // Arrange
    const strategy = new GridStrategy({ gridLevels: 10 });
    const candles = mockCandles();
    
    // Act
    const signal = strategy.analyze(candles, indicators);
    
    // Assert
    expect(signal.action).toBe('BUY');
    expect(signal.price).toBeLessThan(gridLowerBound);
  });
  
  it('should enforce stop-loss', async () => {
    // Test stop-loss logic
  });
  
  it('should respect position sizing', async () => {
    // Test risk management
  });
});
```

**Coverage:**
- [ ] ≥ 95% para estratégias
- [ ] 100% para risk management
- [ ] Todos cenários cobertos

### 7. Documentação da Estratégia

**Obrigatório:**
```markdown
# Grid Strategy

## Descrição
[Como funciona]

## Parâmetros
- gridLevels: number (5-20)
- gridSpacing: number (0.01-0.05)
- ...

## Indicadores Usados
- Bollinger Bands (20, 2)
- RSI (14)

## Condições de Entrada
- Compra: [condições]
- Venda: [condições]

## Risk Management
- Stop-loss: 2%
- Take-profit: 3%
- Position size: 2% do capital

## Backtesting Results
- Win rate: 45%
- Profit factor: 1.8
- Max drawdown: 15%
- Period: 2022-01-01 to 2024-12-31

## Riscos Conhecidos
1. [Risco 1]
2. [Risco 2]
```

### 8. Validação de Segurança

**Exchange Integration:**
- [ ] Rate limiting respeitado
- [ ] API keys encrypted
- [ ] Erros CCXT tratados
- [ ] Timeouts configurados
- [ ] Retry logic implementado

**Ordem de Execução:**
- [ ] Validação de saldo antes de order
- [ ] Validação de preço (min/max)
- [ ] Validação de amount (min/max)
- [ ] Confirmação de ordem
- [ ] Tracking de order ID

---

## Aprovação Final

### Checklist Completo

- [ ] Código: ✅ TypeScript sem erros
- [ ] Testes: ✅ Coverage ≥ 95%
- [ ] Backtest: ✅ Métricas aceitáveis
- [ ] Risk: ✅ Stop-loss e position sizing
- [ ] Docs: ✅ Completa e clara
- [ ] Security: ✅ API keys seguras
- [ ] Review: ✅ 2+ aprovações

### Status de Aprovação

**Se TODOS os critérios atendidos:**
```json
{
  "strategy": "Grid Strategy",
  "status": "Aprovada para Produção",
  "validation_date": "2025-01-11",
  "validator": "Agente-CTO",
  "test_results": {
    "backtest": "PASSED",
    "unit_tests": "PASSED",
    "risk_management": "PASSED"
  },
  "deployment": "AUTORIZADO"
}
```

**Se QUALQUER critério falhar:**
```json
{
  "strategy": "Grid Strategy",
  "status": "REPROVADA",
  "blockers": [
    "Win rate abaixo de 40%",
    "Stop-loss não implementado",
    "Coverage de testes < 95%"
  ],
  "action_required": "Corrigir blockers antes de aprovar"
}
```

---

## ⚠️ ATENÇÃO

**NUNCA aprove estratégia para produção sem:**
- Backtest completo (≥ 1 ano)
- Coverage ≥ 95%
- Risk management implementado
- 2+ code reviews
- Aprovação do Agente-CTO

**Lembre-se**: Estratégias mal validadas podem causar perdas financeiras reais.

