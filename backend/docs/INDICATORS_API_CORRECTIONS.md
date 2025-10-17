# Correções de API - @ixjb94/indicators v1.2.4

Baseado nos type definitions em `node_modules/@ixjb94/indicators/dist/core/indicators.d.ts`

## Métodos que Retornam Arrays (não objetos)

### 1. MACD
- **Type Definition**: `macd(...): Promise<number[][]>` → `[macd, signal, hist]`
- **Correção**: Desestruturar array e mapear para objeto

### 2. BBands
- **Type Definition**: `bbands(...): Promise<number[][]>` → `[lower, middle, upper]`
- **Correção**: Desestruturar array e mapear para objeto `{upper: [2], middle: [1], lower: [0]}`

### 3. Stochastic
- **Type Definition**: `stoch(...): Promise<number[][]>` → `[stoch, stoch_ma]`
- **Correção**: Desestruturar array e mapear para objeto `{k: [0], d: [1]}`

### 4. StochRSI
- **Type Definition**: `stochrsi(source, period, size?): Promise<number[]>` → só retorna K
- **Problema**: Aceita apenas 2-3 argumentos, não 5!
- **Correção**: Simplificar para `calculateStochRSI(data, period)` retornando apenas array

### 5. Aroon
- **Type Definition**: `aroon(...): Promise<number[][]>` → `[aroon_down, aroon_up]`
- **Correção**: Desestruturar e mapear para objeto `{up: [1], down: [0]}`

### 6. Fisher Transform
- **Type Definition**: `fisher(...): Promise<number[][]>` → `[fisher, signal]`
- **Correção**: Desestruturar e mapear para objeto

### 7. DI (Directional Indicator)
- **Type Definition**: `di(...): Promise<number[][]>` → `[plus_di, minus_di]`
- **Correção**: Desestruturar e mapear para objeto `{plus: [0], minus: [1]}`

### 8. DM (Directional Movement)
- **Type Definition**: `dm(...): Promise<number[][]>` → `[plus_dm, minus_dm]`
- **Correção**: Desestruturar e mapear para objeto `{plus: [0], minus: [1]}`

### 9. KST (Know Sure Thing)
- **Type Definition**: `kst(...): Promise<number[][]>` → `[kst, signal]`
- **Correção**: Desestruturar e mapear para objeto

### 10. MSW (Mesa Sine Wave)
- **Type Definition**: `msw(...): Promise<number[][]>` → `[sine, lead]`
- **Correção**: Desestruturar e mapear para objeto

### 11. Chandelier Exit (CE)
- **Type Definition**: `ce(...): Promise<number[][]>` → `[ce_high, ce_low]`
- **Correção**: Desestruturar e mapear para objeto `{long: [1], short: [0]}`

### 12. Keltner Channels (KC)
- **Type Definition**: `kc(...): Promise<number[][]>` → `[kc_lower, kc_middle, kc_upper]`
- **Correção**: Desestruturar e mapear para objeto `{upper: [2], middle: [1], lower: [0]}`

### 13. Donchian Channels (DC)
- **Type Definition**: `dc(highs, lows, period): Promise<number[][]>` → `[upper, middle, lower]`
- **Correção**: Desestruturar e mapear para objeto

### 14. Acceleration Bands (ABands)
- **Type Definition**: `abands(...): Promise<number[][]>` → `[upper_band, lower_band, middle_point]`
- **Correção**: Desestruturar e mapear para objeto `{upper: [0], middle: [2], lower: [1]}`

### 15. Price Bands (PBands)
- **Type Definition**: `pbands(high, low, close, period): Promise<number[][]>` → `[pbands_lower, pbands_upper]`
- **Problema**: Retorna apenas 2 valores (não tem middle!)
- **Correção**: Calcular middle como `(upper + lower) / 2`

## Parâmetros Incorretos

### 1. ADX, ADXR, DX
- **Type Definition**: `adx(high, low, period)` - SEM close!
- **Correção**: Remover parâmetro close

### 2. AO (Awesome Oscillator)
- **Type Definition**: `ao(high, low, size?)` - SEM períodos!
- **Correção**: Remover fastPeriod e slowPeriod

### 3. VWAP
- **Type Definition**: `vwap(high, low, close, volume, period, size?)`
- **Correção**: Adicionar parâmetro period

### 4. Coppock Curve
- **Type Definition**: `copp(data, period1, period2)` - apenas 3 parâmetros
- **Correção**: Simplificar interface

### 5. POSC (Price Oscillator)
- **Type Definition**: `posc(high, low, close, period, ema_period)`
- **Correção**: Adicionar high, low, close + ema_period

### 6. RVI (Relative Volatility Index)
- **Type Definition**: `rvi(source, sma_period, stddev_period)`
- **Correção**: Adicionar stddev_period

### 7. SMI (Stochastic Momentum Index)
- **Type Definition**: `smi(high, low, close, q_period, r_period, s_period)` - retorna apenas number[]
- **Correção**: Não retorna objeto! Retorna apenas array único

### 8. PFE (Polarized Fractal Efficiency)
- **Type Definition**: `pfe(source, period, ema_period)`
- **Correção**: Adicionar ema_period

## Métodos Não Implementados

### 1. MAMA (MESA Adaptive Moving Average)
- **Type Definition**: `mama(): Promise<void>` - NÃO IMPLEMENTADO
- **Ação**: Comentar ou remover função

### 2. IkhTS (Ichimoku)
- **Type Definition**: `ikhts(): Promise<void>` - NÃO IMPLEMENTADO
- **Ação**: Comentar ou remover função

### 3. PC (Price Channel)
- **Type Definition**: `pc(): Promise<void>` - NÃO IMPLEMENTADO
- **Ação**: Comentar ou remover função

## Tipos de Retorno Incorretos

### 1. CrossOver, CrossUnder, CrossAny
- **Type Definition**: Retornam `Promise<boolean[]>` não `Promise<number[]>`
- **Correção**: Mudar tipo de retorno

### 2. Normalize/Normalize2
- **Type Definition**:
  - `normalize(originalLength: number, source: Array<number> | string, empty?: number)`
  - `normalize2(source: number[], length: number)`
- **Correção**: Ajustar parâmetros completamente

## Resumo de Impacto

- **15 métodos** retornam arrays que precisam ser convertidos para objetos
- **8 métodos** têm parâmetros incorretos
- **3 métodos** não estão implementados
- **5 métodos** têm tipos de retorno incorretos

**Total: 31 funções que precisam correção**

## Próximos Passos

1. Reescrever calculator-v2.ts com TODAS as correções
2. Validar compilação TypeScript
3. Criar testes unitários para validar formatos de retorno
4. Atualizar tipos indicators-full.types.ts se necessário
