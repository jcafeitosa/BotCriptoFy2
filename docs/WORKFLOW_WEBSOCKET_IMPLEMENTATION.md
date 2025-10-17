# Workflow de Implementação: WebSocket Manager

**Task**: 1A.3 - Implementar WebSocket Manager com ccxt.pro
**Módulo**: market-data
**Protocolo**: AGENTS.md Regras 5-6 (Workflow Mermaid)
**Data**: 2025-10-17

---

## 🎯 OBJETIVO

Implementar WebSocket real-time para market-data usando ccxt.pro, permitindo streaming de:
- Tickers (preço atual)
- Trades (negociações)
- OrderBook (livro de ofertas)
- OHLCV (candles em tempo real)

---

## 📋 WORKFLOW PRINCIPAL

```mermaid
graph TD
    A[Início: Implementar WebSocket] --> B{Análise Dependências OK?}

    B -->|Não| C[Executar Task 1A.1]
    C --> B

    B -->|Sim| D{Decisão Técnica}

    D -->|CCXT.pro Recomendado| E[Instalar ccxt.pro]
    D -->|WebSocket Nativo Alternativa| F[Implementar WS Nativo]

    E --> G[Configurar Licença]
    G --> H{Licença Válida?}
    H -->|Não| I[Erro: Licença Inválida]
    I --> J[Voltar para Opção Nativa]
    J --> F

    H -->|Sim| K[Implementar WebSocket Manager]
    F --> K

    K --> L[Implementar connect]
    L --> M[Implementar subscribe]
    M --> N[Implementar watchTicker]
    N --> O[Implementar watchTrades]
    O --> P[Implementar watchOrderBook]
    P --> Q[Implementar watchOHLCV]

    Q --> R[Implementar Reconnection Logic]
    R --> S[Implementar Error Handling]

    S --> T[Criar Testes Unitários]
    T --> U{Coverage >= 80%?}
    U -->|Não| V[Adicionar Mais Testes]
    V --> T

    U -->|Sim| W[Criar Testes de Integração]
    W --> X[Testar com Exchange Real]

    X --> Y{Conexão OK?}
    Y -->|Não| Z[Debug Conexão]
    Z --> X

    Y -->|Sim| AA[Habilitar Export no index.ts]
    AA --> AB[Criar Rotas de Admin]
    AB --> AC[Code Review]

    AC --> AD{Review Aprovado?}
    AD -->|Não| AE[Corrigir Issues]
    AE --> AC

    AD -->|Sim| AF[Merge para Main]
    AF --> AG[Deploy]
    AG --> AH[Monitorar Produção]

    AH --> AI{Está Estável?}
    AI -->|Não| AJ[Rollback]
    AJ --> AK[Investigar Issues]
    AK --> K

    AI -->|Sim| AL[Sucesso! ✅]

    style A fill:#90EE90
    style AL fill:#90EE90
    style I fill:#FFB6C1
    style AJ fill:#FFB6C1
    style E fill:#87CEEB
    style K fill:#FFD700
```

---

## 🔀 WORKFLOW DE DECISÃO TÉCNICA

```mermaid
graph TD
    A[Escolher Implementação] --> B{Orçamento Disponível?}

    B -->|Sim >= $500/ano| C[CCXT.pro]
    B -->|Não| D[WebSocket Nativo]

    C --> E{Quantas Exchanges?}
    E -->|> 5| F[CCXT.pro RECOMENDADO ✅]
    E -->|<= 5| G{Tempo Disponível?}

    G -->|Pouco < 1 semana| F
    G -->|Muito >= 2 semanas| D

    D --> H{Qual Exchange Principal?}
    H -->|Binance| I[WS Nativo Binance Viável]
    H -->|Coinbase| J[WS Nativo Coinbase Viável]
    H -->|Kraken| K[WS Nativo Kraken Viável]
    H -->|Outras| L[CCXT.pro Melhor Opção]

    F --> M[Instalar: bun add ccxt.pro]
    I --> N[Instalar: bun add ws]
    J --> N
    K --> N
    L --> M

    M --> O[Implementação Rápida]
    N --> P[Implementação Manual]

    O --> Q[100+ Exchanges Suportadas]
    P --> R[1 Exchange por Implementação]

    Q --> S[Reconnection Automática]
    R --> T[Reconnection Manual]

    S --> U[Resultado: Deploy em 3-5 dias]
    T --> V[Resultado: Deploy em 7-14 dias]

    style F fill:#90EE90
    style M fill:#87CEEB
    style U fill:#90EE90
    style L fill:#FFD700
```

---

## 🔌 WORKFLOW DE CONEXÃO

```mermaid
graph TD
    A[connect exchangeId] --> B{Exchange Suportada?}

    B -->|Não| C[Erro: Exchange Not Supported]
    B -->|Sim| D{Já Conectado?}

    D -->|Sim| E[Retornar Conexão Existente]
    D -->|Não| F[Criar Nova Conexão]

    F --> G[Inicializar CCXT.pro Exchange]
    G --> H{Credenciais Válidas?}

    H -->|Não| I[Erro: Invalid API Keys]
    H -->|Sim| J[Conectar WebSocket]

    J --> K{Conexão Estabelecida?}
    K -->|Não| L[Tentar Reconectar]
    L --> M{Tentativas < MaxRetry?}
    M -->|Não| N[Erro: Max Retries Reached]
    M -->|Sim| O[Aguardar Delay]
    O --> J

    K -->|Sim| P[Armazenar Conexão]
    P --> Q[Iniciar Heartbeat]
    Q --> R[Emitir Evento: connected]
    R --> S[Retornar Status]

    style C fill:#FFB6C1
    style I fill:#FFB6C1
    style N fill:#FFB6C1
    style S fill:#90EE90
```

---

## 📡 WORKFLOW DE SUBSCRIPTION

```mermaid
graph TD
    A[subscribe channel, symbol] --> B{Conexão Existe?}

    B -->|Não| C[connect exchangeId]
    C --> B

    B -->|Sim| D{Já Inscrito?}
    D -->|Sim| E[Retornar: Already Subscribed]

    D -->|Não| F{Qual Canal?}

    F -->|ticker| G[watchTicker symbol]
    F -->|trades| H[watchTrades symbol]
    F -->|orderbook| I[watchOrderBook symbol, limit]
    F -->|ohlcv| J{Timeframe Válido?}

    J -->|Não| K[Erro: Invalid Timeframe]
    J -->|Sim| L[watchOHLCV symbol, timeframe]

    G --> M[Loop: Aguardar Dados]
    H --> M
    I --> M
    L --> M

    M --> N{Dados Recebidos?}
    N -->|Sim| O[Processar Dados]
    O --> P[Emitir Evento: data]
    P --> Q{Armazenar DB?}

    Q -->|Sim| R[Salvar em TimescaleDB]
    R --> S[Atualizar Cache Redis]
    Q -->|Não| S

    S --> T{Conexão Ativa?}
    T -->|Sim| M
    T -->|Não| U[Cleanup: Unsubscribe]

    U --> V[Fim]

    style K fill:#FFB6C1
    style P fill:#87CEEB
    style R fill:#FFD700
```

---

## 🔄 WORKFLOW DE RECONNECTION

```mermaid
graph TD
    A[Erro de Conexão Detectado] --> B[Marcar: connected = false]
    B --> C[Incrementar: reconnectAttempts]
    C --> D{Tentativas >= MaxRetries?}

    D -->|Sim| E[Log: Max Retries Reached]
    E --> F[disconnect exchangeId]
    F --> G[Emitir Evento: error]
    G --> H[Notificar Admin]
    H --> I[Fim: Desconectado]

    D -->|Não| J[Log: Attempting Reconnect]
    J --> K[Aguardar: reconnectDelay]
    K --> L[disconnect exchangeId]
    L --> M[connect exchangeId]

    M --> N{Conexão OK?}
    N -->|Não| O[Log: Reconnect Failed]
    O --> C

    N -->|Sim| P[Zerar: reconnectAttempts]
    P --> Q[Recuperar: subscriptions antigas]
    Q --> R[Loop: Para cada subscription]

    R --> S[subscribe request]
    S --> T{Mais Subscriptions?}
    T -->|Sim| R
    T -->|Não| U[Emitir Evento: reconnected]
    U --> V[Log: Reconnection Successful]
    V --> W[Fim: Reconectado ✅]

    style I fill:#FFB6C1
    style W fill:#90EE90
    style U fill:#87CEEB
```

---

## 🧪 WORKFLOW DE TESTES

```mermaid
graph TD
    A[Início: Executar Testes] --> B[Testes Unitários]

    B --> C[Test: connect]
    C --> D[Test: disconnect]
    D --> E[Test: subscribe]
    E --> F[Test: unsubscribe]
    F --> G[Test: watchTicker]
    G --> H[Test: watchTrades]
    H --> I[Test: watchOrderBook]
    I --> J[Test: watchOHLCV]
    J --> K[Test: reconnection logic]
    K --> L[Test: error handling]

    L --> M{Coverage >= 80%?}
    M -->|Não| N[Identificar Gaps]
    N --> O[Adicionar Mais Testes]
    O --> B

    M -->|Sim| P[Testes de Integração]

    P --> Q[Test: Binance WebSocket]
    Q --> R[Test: Coinbase WebSocket]
    R --> S[Test: Kraken WebSocket]

    S --> T{Todos Passaram?}
    T -->|Não| U[Debug Falhas]
    U --> P

    T -->|Sim| V[Testes de Carga]

    V --> W[Test: 100 Subscriptions]
    W --> X[Test: Reconnection Stress]
    X --> Y[Test: Memory Leaks]

    Y --> Z{Performance OK?}
    Z -->|Não| AA[Otimizar Código]
    AA --> V

    Z -->|Sim| AB[Gerar Relatório]
    AB --> AC[Coverage Report]
    AC --> AD[Performance Report]
    AD --> AE[Sucesso: Testes Completos ✅]

    style AE fill:#90EE90
    style AC fill:#87CEEB
    style AD fill:#FFD700
```

---

## 🚀 WORKFLOW DE DEPLOY

```mermaid
graph TD
    A[Início: Deploy] --> B{Testes Passaram?}

    B -->|Não| C[Bloquear Deploy]
    C --> D[Fix: Corrigir Testes]
    D --> B

    B -->|Sim| E{Code Review OK?}
    E -->|Não| F[Corrigir Issues]
    F --> E

    E -->|Sim| G[Criar Branch: feature/market-data-websocket]
    G --> H[Commit Changes]
    H --> I[Push to Remote]
    I --> J[Criar Pull Request]

    J --> K{CI/CD Green?}
    K -->|Não| L[Check CI Logs]
    L --> M[Fix: CI Issues]
    M --> H

    K -->|Sim| N[Merge to Main]
    N --> O[Deploy to Staging]

    O --> P[Test: Staging Environment]
    P --> Q{Staging OK?}
    Q -->|Não| R[Rollback Staging]
    R --> S[Investigar Issues]
    S --> F

    Q -->|Sim| T[Deploy to Production]
    T --> U[Monitor: 1 hora]

    U --> V{Erros em Produção?}
    V -->|Sim| W[Rollback Production]
    W --> X[Incident Report]
    X --> Y[Post-Mortem]
    Y --> S

    V -->|Não| Z[Monitor: 24 horas]
    Z --> AA{Tudo Estável?}

    AA -->|Não| W
    AA -->|Sim| AB[Documentar Deploy]
    AB --> AC[Notificar Time]
    AC --> AD[Atualizar Docs]
    AD --> AE[Sucesso: Deploy Completo ✅]

    style C fill:#FFB6C1
    style W fill:#FFB6C1
    style AE fill:#90EE90
```

---

## 🎯 CASOS DE USO DETALHADOS

### Caso 1: Conectar e Subscrever ao Ticker

```mermaid
sequenceDiagram
    participant User
    participant API
    participant WSManager
    participant CCXT
    participant Exchange

    User->>API: POST /market-data/websocket/connect
    API->>WSManager: connect('binance')
    WSManager->>CCXT: new ccxt.pro.binance()
    CCXT->>Exchange: WebSocket Handshake
    Exchange-->>CCXT: Connected
    CCXT-->>WSManager: Connection Established
    WSManager-->>API: Status: Connected
    API-->>User: 200 OK

    User->>API: POST /market-data/websocket/subscribe
    API->>WSManager: subscribe('ticker', 'BTC/USDT')
    WSManager->>CCXT: watchTicker('BTC/USDT')

    loop Real-time Updates
        Exchange->>CCXT: Ticker Data
        CCXT->>WSManager: Ticker Event
        WSManager->>WSManager: Emit Event
        WSManager->>DB: Save to TimescaleDB
        WSManager->>Redis: Update Cache
        WSManager->>API: Realtime Event
        API->>User: WebSocket Push
    end
```

### Caso 2: Reconexão Automática

```mermaid
sequenceDiagram
    participant WSManager
    participant CCXT
    participant Exchange

    Note over WSManager,Exchange: Conexão Ativa

    Exchange->>CCXT: Connection Lost ❌
    CCXT->>WSManager: Error Event
    WSManager->>WSManager: Mark: connected = false
    WSManager->>WSManager: Increment: reconnectAttempts

    alt Tentativas < MaxRetries
        WSManager->>WSManager: Wait: reconnectDelay (5s)
        WSManager->>CCXT: Reconnect
        CCXT->>Exchange: New WebSocket Handshake
        Exchange-->>CCXT: Connected ✅
        CCXT-->>WSManager: Connection Restored
        WSManager->>WSManager: Reset: reconnectAttempts
        WSManager->>WSManager: Restore: Subscriptions
        Note over WSManager: Reconexão Bem-Sucedida ✅
    else Tentativas >= MaxRetries
        WSManager->>WSManager: disconnect()
        WSManager->>WSManager: Emit: 'error' event
        Note over WSManager: Falha Permanente ❌
    end
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Preparação
- [x] ✅ Análise de dependências (Task 1A.1)
- [ ] ⏳ Workflow Mermaid criado (Task 1A.2 - este doc)
- [ ] ⏳ Decisão: CCXT.pro vs Nativo
- [ ] ⏳ Branch criada: `feature/market-data-websocket`
- [ ] ⏳ Install ccxt.pro: `bun add ccxt.pro`

### Fase 2: Implementação Core
- [ ] ⏳ Implementar `connect(exchangeId)`
- [ ] ⏳ Implementar `disconnect(exchangeId)`
- [ ] ⏳ Implementar `subscribe(request)`
- [ ] ⏳ Implementar `unsubscribe(request)`
- [ ] ⏳ Implementar `getStatus(exchangeId)`

### Fase 3: Implementação de Canais
- [ ] ⏳ Implementar `watchTicker(connection, symbol)`
- [ ] ⏳ Implementar `watchTrades(connection, symbol)`
- [ ] ⏳ Implementar `watchOrderBook(connection, symbol, limit)`
- [ ] ⏳ Implementar `watchOHLCV(connection, symbol, timeframe)`

### Fase 4: Resilience
- [ ] ⏳ Implementar reconnection logic
- [ ] ⏳ Implementar error handling
- [ ] ⏳ Implementar heartbeat/ping-pong
- [ ] ⏳ Implementar cleanup/graceful shutdown

### Fase 5: Integração
- [ ] ⏳ Integrar com TimescaleDB (storage)
- [ ] ⏳ Integrar com Redis (cache)
- [ ] ⏳ Criar eventos para pub/sub
- [ ] ⏳ Habilitar export no index.ts

### Fase 6: Testes
- [ ] ⏳ Testes unitários (≥80% coverage)
- [ ] ⏳ Testes de integração
- [ ] ⏳ Testes de carga
- [ ] ⏳ Testes de reconnection

### Fase 7: Validação
- [ ] ⏳ TypeScript compila
- [ ] ⏳ ESLint passa
- [ ] ⏳ Testes passam
- [ ] ⏳ Code review aprovado

### Fase 8: Deploy
- [ ] ⏳ Merge para main
- [ ] ⏳ Deploy para staging
- [ ] ⏳ Deploy para produção
- [ ] ⏳ Monitorar 24h

---

## ⚡ COMANDOS ÚTEIS

```bash
# Instalar ccxt.pro
bun add ccxt.pro

# Testar conexão
bun run src/modules/market-data/websocket/test-connection.ts

# Executar testes
bun test src/modules/market-data

# Coverage report
bun test --coverage src/modules/market-data

# Lint
bun run lint

# Type check
bun run typecheck

# Dev server
bun run dev

# Monitorar logs em produção
tail -f logs/websocket.log | grep "market-data"
```

---

## 📚 REFERÊNCIAS

### CCXT.pro Documentation
- https://docs.ccxt.com/en/latest/manual.html#ccxt-pro
- https://github.com/ccxt/ccxt/tree/master/examples/js

### Exchange WebSocket APIs
- Binance: https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams
- Coinbase: https://docs.cloud.coinbase.com/exchange/docs/websocket-overview
- Kraken: https://docs.kraken.com/websockets/

---

**Workflow criado conforme**: AGENTS.md Regras 5-6
**Validade**: Válido até implementação completa
**Próxima Task**: 1A.3 - Implementar WebSocket Manager
**Data**: 2025-10-17
