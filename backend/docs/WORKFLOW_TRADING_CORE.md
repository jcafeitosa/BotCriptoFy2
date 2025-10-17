# Trading Core - Implementation Workflow
**FASE 1B - Bot Execution + Strategy Runner + Backtest Engine**

Data: 2025-10-17
Autor: Claude Code (Agente-CTO)
Task: 1B.2 - Mermaid Workflow para Trading Core

---

## 🎯 Visão Geral

Este documento detalha os workflows completos dos 3 engines que compõem o Trading Core:
1. **Bot Execution Engine** - Execução em tempo real
2. **Strategy Runner** - Avaliação de sinais
3. **Backtest Engine** - Simulação histórica

---

## 1. Bot Execution Engine - Main Loop

### 1.1 State Machine

```mermaid
stateDiagram-v2
    [*] --> IDLE: Bot Start
    IDLE --> INITIALIZING: startExecution()
    INITIALIZING --> RUNNING: Initialization Success
    INITIALIZING --> ERROR: Initialization Fail

    RUNNING --> EVALUATING: Tick Interval
    EVALUATING --> TRADING: Signal Generated
    EVALUATING --> MONITORING: No Signal

    TRADING --> MONITORING: Order Placed
    TRADING --> ERROR: Order Failed

    MONITORING --> EVALUATING: Tick Interval
    MONITORING --> CLOSING: Stop/Take Profit Hit

    CLOSING --> MONITORING: Position Closed
    CLOSING --> ERROR: Close Failed

    RUNNING --> PAUSED: pauseBot()
    PAUSED --> RUNNING: resumeBot()

    RUNNING --> STOPPING: stopBot()
    PAUSED --> STOPPING: stopBot()
    EVALUATING --> STOPPING: stopBot()
    TRADING --> STOPPING: stopBot()
    MONITORING --> STOPPING: stopBot()

    STOPPING --> IDLE: Cleanup Complete

    ERROR --> RECOVERING: Retry Logic
    RECOVERING --> RUNNING: Recovery Success
    RECOVERING --> STOPPING: Max Retries

    IDLE --> [*]: Bot Terminated
```

---

### 1.2 Execution Loop Flow

```mermaid
graph TB
    Start([Bot Started]) --> Init[Initialize Bot]
    Init --> LoadConfig[Load Bot Configuration]
    LoadConfig --> LoadStrategy[Load Strategy]
    LoadStrategy --> ConnectWS[Connect WebSocket Market Data]
    ConnectWS --> ValidateRisk[Validate Risk Limits]

    ValidateRisk --> LoopStart{Bot Running?}

    LoopStart -->|Yes| CheckSchedule[Check Schedule<br/>Weekends/Holidays/Time]
    CheckSchedule -->|Allowed| GetMarketData[Get Current Market Data]
    CheckSchedule -->|Not Allowed| Wait1[Wait Tick Interval]

    GetMarketData --> EvalStrategy[Evaluate Strategy]
    EvalStrategy --> Signal{Signal?}

    Signal -->|BUY| CheckRisk1[Check Risk Limits]
    Signal -->|SELL| CheckRisk1
    Signal -->|HOLD| MonitorPositions[Monitor Open Positions]

    CheckRisk1 -->|Approved| CalcSize[Calculate Position Size]
    CheckRisk1 -->|Denied| LogDenied[Log Risk Denial]
    LogDenied --> MonitorPositions

    CalcSize --> CreateOrder[Create Order via Orders Service]
    CreateOrder --> TrackOrder[Track Order Execution]
    TrackOrder --> OrderFilled{Order Filled?}

    OrderFilled -->|Yes| CreatePosition[Create/Update Position]
    OrderFilled -->|Partial| CreatePosition
    OrderFilled -->|Failed| LogError1[Log Error]

    CreatePosition --> UpdateMetrics1[Update Bot Metrics]
    LogError1 --> UpdateMetrics1
    UpdateMetrics1 --> MonitorPositions

    MonitorPositions --> CheckPositions{Open Positions?}
    CheckPositions -->|Yes| CheckSL[Check Stop-Loss]
    CheckPositions -->|No| Wait1

    CheckSL --> SLHit{SL Hit?}
    SLHit -->|Yes| ClosePosition[Close Position]
    SLHit -->|No| CheckTP[Check Take-Profit]

    CheckTP --> TPHit{TP Hit?}
    TPHit -->|Yes| ClosePosition
    TPHit -->|No| CheckTrailing[Check Trailing Stop]

    CheckTrailing --> TrailHit{Trail Hit?}
    TrailHit -->|Yes| ClosePosition
    TrailHit -->|No| UpdatePnL[Update Position PnL]

    ClosePosition --> UpdateMetrics2[Update Bot Metrics]
    UpdatePnL --> UpdateMetrics2
    UpdateMetrics2 --> Wait1

    Wait1 --> CheckHealth[Health Check]
    CheckHealth --> HealthOK{Healthy?}

    HealthOK -->|Yes| LoopStart
    HealthOK -->|No| HandleError[Handle Error]

    HandleError --> Retryable{Retryable?}
    Retryable -->|Yes| Retry[Retry Operation]
    Retryable -->|No| AutoStop{Auto Stop?}

    Retry --> LoopStart
    AutoStop -->|Yes| StopBot[Stop Bot]
    AutoStop -->|No| LogCritical[Log Critical Error]
    LogCritical --> LoopStart

    LoopStart -->|No| Cleanup[Cleanup Resources]
    StopBot --> Cleanup
    Cleanup --> End([Bot Stopped])
```

---

## 2. Strategy Runner - Signal Evaluation

### 2.1 Strategy Execution Flow

```mermaid
graph TB
    Start([Strategy Evaluation Request]) --> LoadStrategy[Load Strategy from DB]
    LoadStrategy --> CacheCheck{Compiled<br/>in Cache?}

    CacheCheck -->|Yes| GetIndicators[Get Required Indicators]
    CacheCheck -->|No| ParseStrategy[Parse Strategy Code]

    ParseStrategy --> ValidateSyntax[Validate Syntax]
    ValidateSyntax --> SyntaxOK{Syntax Valid?}

    SyntaxOK -->|Yes| CompileStrategy[Compile Strategy]
    SyntaxOK -->|No| ReturnError1[Return Error]

    CompileStrategy --> CacheStrategy[Cache Compiled Strategy]
    CacheStrategy --> GetIndicators

    GetIndicators --> FetchOHLCV[Fetch OHLCV Data<br/>Last 500 Candles]
    FetchOHLCV --> CalcIndicators[Calculate Indicators]

    CalcIndicators --> CheckCache{Indicators<br/>Cached?}
    CheckCache -->|Some| UpdateCache[Update Cached Indicators]
    CheckCache -->|None| CalcAll[Calculate All Indicators]

    UpdateCache --> ExecStrategy[Execute Strategy Logic]
    CalcAll --> ExecStrategy

    ExecStrategy --> Timeout{Timeout<br/>5s?}
    Timeout -->|No| GetSignal[Get Signal Result]
    Timeout -->|Yes| Kill[Kill Execution]

    Kill --> ReturnError2[Return Timeout Error]
    ReturnError2 --> End1([Error])
    ReturnError1 --> End1

    GetSignal --> ValidateSignal[Validate Signal]
    ValidateSignal --> SignalValid{Valid?}

    SignalValid -->|Yes| AddContext[Add Signal Context]
    SignalValid -->|No| ReturnHold[Return HOLD Signal]

    AddContext --> CalcConfidence[Calculate Confidence]
    CalcConfidence --> CalcStrength[Calculate Strength]
    CalcStrength --> AddReasons[Add Signal Reasons]

    AddReasons --> SaveState[Save Strategy State]
    SaveState --> ReturnSignal[Return Signal]

    ReturnHold --> ReturnSignal
    ReturnSignal --> End2([Success])
```

---

### 2.2 Indicator Calculation Flow

```mermaid
graph LR
    OHLCV[OHLCV Data] --> SMA[Simple Moving Average]
    OHLCV --> EMA[Exponential Moving Average]
    OHLCV --> RSI[Relative Strength Index]
    OHLCV --> MACD[MACD]
    OHLCV --> BB[Bollinger Bands]
    OHLCV --> Stoch[Stochastic Oscillator]
    OHLCV --> ATR[Average True Range]
    OHLCV --> Volume[Volume Indicators]

    EMA --> MACD
    SMA --> BB

    SMA --> Cache1[(Indicator Cache)]
    EMA --> Cache1
    RSI --> Cache1
    MACD --> Cache1
    BB --> Cache1
    Stoch --> Cache1
    ATR --> Cache1
    Volume --> Cache1

    Cache1 --> Strategy[Strategy Logic]
    Strategy --> Signal{Signal Type}

    Signal -->|BUY| BuySignal[BUY Signal<br/>+ Confidence<br/>+ Strength<br/>+ Reasons]
    Signal -->|SELL| SellSignal[SELL Signal<br/>+ Confidence<br/>+ Strength<br/>+ Reasons]
    Signal -->|HOLD| HoldSignal[HOLD Signal]
```

---

## 3. Backtest Engine - Historical Simulation

### 3.1 Backtest Execution Flow

```mermaid
graph TB
    Start([Start Backtest]) --> LoadBot[Load Bot Configuration]
    LoadBot --> LoadStrategy[Load Strategy]
    LoadStrategy --> SetPeriod[Set Backtest Period<br/>Start Date - End Date]

    SetPeriod --> LoadHistorical[Load Historical OHLCV Data]
    LoadHistorical --> ValidateData{Data Valid?}

    ValidateData -->|No| ErrorData[Return Data Error]
    ValidateData -->|Yes| InitBacktest[Initialize Backtest State]

    InitBacktest --> SetCapital[Set Starting Capital]
    SetCapital --> CreateSimPortfolio[Create Simulated Portfolio]
    CreateSimPortfolio --> LoopStart{More Candles?}

    LoopStart -->|Yes| NextCandle[Get Next Candle]
    NextCandle --> UpdateTime[Update Simulated Time]
    UpdateTime --> UpdatePrices[Update Asset Prices]

    UpdatePrices --> ProcessPending[Process Pending Orders]
    ProcessPending --> CheckFills{Orders to Fill?}

    CheckFills -->|Yes| SimFill[Simulate Order Fill<br/>+ Slippage<br/>+ Fees]
    CheckFills -->|No| CheckPositions1

    SimFill --> UpdatePosition[Update Position]
    UpdatePosition --> UpdatePortfolio1[Update Portfolio Value]
    UpdatePortfolio1 --> CheckPositions1[Check Open Positions]

    CheckPositions1 --> CheckStops{Stop Hit?}
    CheckStops -->|Yes| SimClose[Simulate Position Close]
    CheckStops -->|No| EvalStrategy[Evaluate Strategy]

    SimClose --> RecordTrade1[Record Trade]
    RecordTrade1 --> UpdatePortfolio2[Update Portfolio Value]
    UpdatePortfolio2 --> EvalStrategy

    EvalStrategy --> GetSignal{Signal?}
    GetSignal -->|BUY/SELL| ValidateRisk[Validate Risk]
    GetSignal -->|HOLD| UpdateMetrics1[Update Metrics]

    ValidateRisk --> RiskOK{Risk OK?}
    RiskOK -->|Yes| CalcSize[Calculate Position Size]
    RiskOK -->|No| UpdateMetrics1

    CalcSize --> CreateSimOrder[Create Simulated Order]
    CreateSimOrder --> AddToPending[Add to Pending Orders]
    AddToPending --> UpdateMetrics1

    UpdateMetrics1 --> RecordEquity[Record Equity Point]
    RecordEquity --> CalcDrawdown[Calculate Drawdown]
    CalcDrawdown --> LoopStart

    LoopStart -->|No| CloseAll[Close All Open Positions]
    CloseAll --> FinalMetrics[Calculate Final Metrics]

    FinalMetrics --> CalcReturns[Calculate Returns]
    CalcReturns --> CalcSharpe[Calculate Sharpe Ratio]
    CalcSharpe --> CalcSortino[Calculate Sortino Ratio]
    CalcSortino --> CalcMaxDD[Calculate Max Drawdown]
    CalcMaxDD --> CalcWinRate[Calculate Win Rate]
    CalcWinRate --> CalcProfitFactor[Calculate Profit Factor]

    CalcProfitFactor --> GenerateReport[Generate Report]
    GenerateReport --> SaveResults[Save Results to DB]
    SaveResults --> ReturnResults[Return Backtest Results]

    ErrorData --> End1([Error])
    ReturnResults --> End2([Success])
```

---

### 3.2 Order Simulation Logic

```mermaid
graph TB
    Order[Pending Order] --> Type{Order Type}

    Type -->|Market| ExecImmediate[Execute Immediately<br/>at Current Price]
    Type -->|Limit| CheckLimit[Check if Limit Price Reached]
    Type -->|Stop| CheckStop[Check if Stop Price Reached]

    CheckLimit --> LimitReached{Price<br/>Reached?}
    LimitReached -->|Yes| ExecLimit[Execute at Limit Price]
    LimitReached -->|No| KeepPending1[Keep Pending]

    CheckStop --> StopTriggered{Price<br/>Triggered?}
    StopTriggered -->|Yes| ExecMarket[Execute as Market Order]
    StopTriggered -->|No| KeepPending2[Keep Pending]

    ExecImmediate --> ApplySlippage[Apply Slippage<br/>0.1% - 0.5%]
    ExecLimit --> ApplySlippage
    ExecMarket --> ApplySlippage

    ApplySlippage --> CalcFees[Calculate Fees<br/>Maker: 0.1%<br/>Taker: 0.15%]
    CalcFees --> UpdateQty[Update Filled Quantity]
    UpdateQty --> RecordFill[Record Fill]

    RecordFill --> End1([Order Filled])
    KeepPending1 --> End2([Still Pending])
    KeepPending2 --> End2
```

---

## 4. Integration Flow - All Components

### 4.1 Complete System Architecture

```mermaid
graph TB
    subgraph "API Layer"
        API[Elysia API Routes]
    end

    subgraph "Bot Management"
        BotService[Bot Service<br/>CRUD + Lifecycle]
        BotEngine[Bot Execution Engine<br/>Main Loop]
    end

    subgraph "Strategy Layer"
        StratService[Strategy Service<br/>CRUD]
        StratRunner[Strategy Runner<br/>Signal Generation]
        Indicators[Indicator Library<br/>SMA, EMA, RSI, MACD]
    end

    subgraph "Trading Layer"
        OrdersService[Orders Service<br/>Order Execution]
        PositionsService[Positions Service<br/>Position Tracking]
        RiskService[Risk Service<br/>Risk Management]
    end

    subgraph "Data Layer"
        MarketData[Market Data WebSocket<br/>Real-time Prices]
        Database[(PostgreSQL<br/>TimescaleDB)]
    end

    subgraph "Backtest Layer"
        BacktestEngine[Backtest Engine<br/>Historical Simulation]
        PerfCalc[Performance Calculator<br/>Metrics]
    end

    subgraph "External"
        CCXT[CCXT Library]
        Exchanges[Crypto Exchanges<br/>Binance, Coinbase, Kraken]
    end

    API --> BotService
    API --> StratService

    BotService -->|startBot| BotEngine
    BotService -->|runBacktest| BacktestEngine

    BotEngine --> StratRunner
    BotEngine --> OrdersService
    BotEngine --> PositionsService
    BotEngine --> RiskService
    BotEngine --> MarketData

    StratRunner --> StratService
    StratRunner --> Indicators
    StratRunner --> Database

    BacktestEngine --> StratRunner
    BacktestEngine --> PerfCalc
    BacktestEngine --> Database

    OrdersService --> CCXT
    PositionsService --> Database
    RiskService --> Database
    MarketData --> CCXT

    CCXT --> Exchanges

    BotService --> Database
    StratService --> Database
```

---

### 4.2 Real-Time Trading Sequence

```mermaid
sequenceDiagram
    participant User
    participant API
    participant BotService
    participant BotEngine
    participant StratRunner
    participant RiskService
    participant OrdersService
    participant Exchange

    User->>API: POST /bots/{id}/start
    API->>BotService: startBot(botId)
    BotService->>Database: Create Execution Record
    BotService->>BotEngine: Initialize & Start Loop

    activate BotEngine

    loop Every Tick Interval (5s-1m)
        BotEngine->>MarketData: Get Current Price
        MarketData-->>BotEngine: Price Data

        BotEngine->>StratRunner: Evaluate Strategy
        StratRunner->>Database: Load Strategy
        StratRunner->>Indicators: Calculate Indicators
        Indicators-->>StratRunner: Indicator Values
        StratRunner->>StratRunner: Execute Strategy Logic
        StratRunner-->>BotEngine: Signal (BUY/SELL/HOLD)

        alt Signal is BUY or SELL
            BotEngine->>RiskService: Validate Risk
            RiskService-->>BotEngine: Risk Approved

            BotEngine->>OrdersService: Create Order
            OrdersService->>Exchange: Place Order via CCXT
            Exchange-->>OrdersService: Order Confirmed
            OrdersService-->>BotEngine: Order ID

            BotEngine->>PositionsService: Create/Update Position
            BotEngine->>BotService: Update Metrics
        end

        BotEngine->>PositionsService: Check Stop-Loss/Take-Profit

        alt Stop Hit
            BotEngine->>OrdersService: Close Position
            OrdersService->>Exchange: Place Close Order
            Exchange-->>OrdersService: Order Confirmed
            BotEngine->>BotService: Record Trade
        end
    end

    User->>API: POST /bots/{id}/stop
    API->>BotService: stopBot(botId)
    BotService->>BotEngine: Stop Signal
    deactivate BotEngine
    BotEngine-->>BotService: Cleanup Complete
    BotService->>Database: Update Execution Record
    BotService-->>API: Bot Stopped
    API-->>User: Success
```

---

## 5. Error Handling & Recovery

### 5.1 Error Handling Flow

```mermaid
graph TB
    Error[Error Occurred] --> Classify{Error Type}

    Classify -->|Network| NetworkError[Network Error]
    Classify -->|Exchange API| ExchangeError[Exchange API Error]
    Classify -->|Strategy| StrategyError[Strategy Error]
    Classify -->|System| SystemError[System Error]

    NetworkError --> Retry1{Retry Count<br/>< Max?}
    ExchangeError --> Retry2{Retry Count<br/>< Max?}
    StrategyError --> Log1[Log Error]
    SystemError --> Critical[Critical Error]

    Retry1 -->|Yes| Wait1[Wait Exponential Backoff]
    Retry1 -->|No| Circuit1[Circuit Breaker Open]

    Retry2 -->|Yes| Wait2[Wait Rate Limit]
    Retry2 -->|No| Circuit2[Circuit Breaker Open]

    Wait1 --> RetryOp1[Retry Operation]
    Wait2 --> RetryOp2[Retry Operation]

    RetryOp1 --> Success1{Success?}
    RetryOp2 --> Success2{Success?}

    Success1 -->|Yes| ResetCounter1[Reset Error Counter]
    Success1 -->|No| IncrementCounter1[Increment Counter]

    Success2 -->|Yes| ResetCounter2[Reset Error Counter]
    Success2 -->|No| IncrementCounter2[Increment Counter]

    IncrementCounter1 --> Circuit1
    IncrementCounter2 --> Circuit2

    Circuit1 --> AutoStop1{Auto Stop<br/>Enabled?}
    Circuit2 --> AutoStop2{Auto Stop<br/>Enabled?}

    AutoStop1 -->|Yes| StopBot1[Stop Bot]
    AutoStop1 -->|No| Notify1[Notify User]

    AutoStop2 -->|Yes| StopBot2[Stop Bot]
    AutoStop2 -->|No| Notify2[Notify User]

    Log1 --> SkipSignal[Skip Signal]
    SkipSignal --> Continue[Continue Execution]

    Critical --> StopBot3[Emergency Stop]
    StopBot3 --> NotifyAdmin[Notify Admin]

    ResetCounter1 --> Continue
    ResetCounter2 --> Continue
    Notify1 --> Continue
    Notify2 --> Continue

    StopBot1 --> End1([Bot Stopped])
    StopBot2 --> End1
    NotifyAdmin --> End1
    Continue --> End2([Continue Running])
```

---

## 6. Performance Optimization

### 6.1 Caching Strategy

```mermaid
graph LR
    Request[Strategy Evaluation] --> CheckCache{Cache<br/>Valid?}

    CheckCache -->|Yes| UseCache[Use Cached Data]
    CheckCache -->|No| FetchNew[Fetch New Data]

    subgraph "Cache Layers"
        L1[L1: Compiled Strategies<br/>TTL: 1 hour]
        L2[L2: Indicator Values<br/>TTL: 1 minute]
        L3[L3: OHLCV Data<br/>TTL: 30 seconds]
    end

    UseCache --> L1
    UseCache --> L2
    UseCache --> L3

    FetchNew --> UpdateCache[Update Cache]
    UpdateCache --> L1
    UpdateCache --> L2
    UpdateCache --> L3

    L1 --> Execute[Execute Strategy]
    L2 --> Execute
    L3 --> Execute

    Execute --> Result[Return Result]
```

---

## 📊 Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| **Tick Interval** | 5s - 1m | Configurable |
| **Strategy Evaluation** | <1s | <5s |
| **Order Placement** | <2s | <10s |
| **Memory per Bot** | <50MB | <200MB |
| **CPU per Bot** | <5% | <20% |
| **Concurrent Bots** | 50+ | 20+ |
| **Backtest Speed** | 1000 candles/s | 100 candles/s |

---

## ✅ Implementation Checklist

### Bot Execution Engine
- [ ] State machine implementation
- [ ] Main execution loop with configurable interval
- [ ] Strategy evaluation integration
- [ ] Order execution logic
- [ ] Position monitoring (SL/TP/Trailing)
- [ ] Error handling & retry logic
- [ ] Circuit breaker pattern
- [ ] Health check & auto-stop
- [ ] Performance metrics tracking
- [ ] Tests (≥80% coverage)

### Strategy Runner
- [ ] Strategy parser & compiler
- [ ] Indicator library (SMA, EMA, RSI, MACD, BB, Stoch, ATR)
- [ ] Signal generation logic
- [ ] Context & state management
- [ ] Caching strategy
- [ ] Timeout handling
- [ ] Sandbox execution
- [ ] Tests (≥80% coverage)

### Backtest Engine
- [ ] Historical data loader
- [ ] Replay engine
- [ ] Simulated order execution (market, limit, stop)
- [ ] Slippage simulation
- [ ] Fee calculation
- [ ] Performance calculator (Sharpe, Sortino, drawdown, win rate)
- [ ] Results reporting
- [ ] Tests (≥80% coverage)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-17
**Maintained By**: Claude Code (Agente-CTO)
