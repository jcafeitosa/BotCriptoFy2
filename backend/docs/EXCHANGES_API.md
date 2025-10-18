# Exchanges API e Serviço

Este documento descreve os recursos expostos pelo módulo `exchanges` e como utilizá-los de forma padronizada com CCXT.

## Endpoints HTTP

Prefixo: `/api/v1/exchanges`

- GET `/`
  - Alias para `/supported`. Carrega catálogo persistido (ou fallback in-memory) com metadados.

- GET `/supported`
  - Lista de exchanges suportadas (ccxt.exchanges).

- GET `/info/:exchangeId`
  - Metadados e capacidades da exchange: `has`, `rateLimit`, `timeframes`, `urls`.

- GET `/:exchangeId/default-websocket-config`
  - Configuração padrão do adaptador de WebSocket (polling) para a exchange selecionada.

- POST `/:exchangeId/test-websocket`
  - Realiza um ciclo `connect → ping → disconnect` usando o adaptador padrão para garantir disponibilidade.

- GET `/connections`
  - Lista conexões do usuário atual (sem credenciais). Inclui status, permissões configuradas e metadados básicos.

- POST `/connections`
  - Cria conexão validando credenciais via `fetchBalance()`. Campos: `exchangeSlug|exchangeId`, `apiKey`, `apiSecret`, `passphrase?`, `sandbox?`, `permissions?`.

- DELETE `/connections/:id`
  - Desabilita conexão (status = disabled).

- GET `/connections/:id/status`
  - Status da conexão + `info` da exchange (capabilities, rateLimit).

- POST `/connections/:id/test`
  - Revalida conexão realizando `fetchBalance()`.

- GET `/connections/:id/balances`
  - Obtém saldos unificados e atualiza cache em `exchange_connections`.

- GET `/connections/:id/ticker/:symbol`
  - Retorna ticker unificado (symbol, timestamp, high/low, bid/ask, last/close, volumes, percentage).

- GET `/connections/:id/markets`
  - Lista mercados (symbol, base/quote, precision, limits, tipo spot/future/swap).

- GET `/connections/:id/markets/:symbol`
  - Detalhes de um mercado específico.

- GET `/connections/:id/orderbook/:symbol?limit=`
  - Livro de ofertas unificado: `bids`, `asks`, `timestamp`.

- GET `/connections/:id/ohlcv/:symbol/:timeframe?since=&limit=`
  - Trades agregados (OHLCV) normalizados em objetos (timestamp, open, high, low, close, volume).

- GET `/connections/:id/trades/:symbol?since=&limit=`
  - Lista de trades normalizada (id, timestamp, price, amount, side, takerOrMaker).

### Endpoints Legados (Compatibilidade)

- POST `/config`
- GET `/config`
- DELETE `/config/:id`

> São aliases para os novos endpoints `/connections`, preservados para compatibilidade com clientes existentes. `DELETE /config/:id` continua realizando remoção física.

Todos os endpoints exigem autenticação (sessionGuard) e tenant (requireTenant).

## Serviço (ExchangeService)

- `getSupportedExchanges()` / `isExchangeSupported(id)`
- `createCCXTInstance(exchangeId, credentials)`
- `getExchangeInfo(exchangeId)` (capabilities/metadata)
- `getMarkets(exchangeSlug, options?)`
- `fetchPositions(exchangeSlug, credentials, symbols?)`
- `createCCXTInstance` e `resolveExchangeId` centralizados

## Serviço (ExchangeConnectionService)

- `createConnection({ userId, tenantId, request })`
- `listConnections({ userId, tenantId })`
- `getConnectionSummary({ configurationId, userId, tenantId })`
- `getConnectionStatus({ configurationId, userId, tenantId })`
- `fetchBalances({ configurationId, userId, tenantId })`
- `fetchTicker({ configurationId, userId, tenantId, symbol })`
- `listMarkets({ configurationId, userId, tenantId })` / `getMarket(...)`
- `fetchOrderBook({ configurationId, userId, tenantId, symbol, depth? })`
- `fetchOHLCV({ configurationId, userId, tenantId, symbol, timeframe, since?, limit? })`
- `fetchTrades({ configurationId, userId, tenantId, symbol, since?, limit? })`
- `testConnection({ configurationId, userId, tenantId })`

## Serviço (ExchangeConfigurationService)

- `createConfiguration({ userId, tenantId, request })`
- `listConfigurations({ userId, tenantId })`
- `getConfigurationById({ configurationId, userId, tenantId, includeDisabled? })`
- `getConfigurationWithSecrets(...)`
- `disableConfiguration(...)`
- `updateSyncMetadata(...)`

## Segurança

- Nenhum endpoint expõe credenciais.
- Criptografia de credenciais no banco (`encrypt/decrypt`).
- Verificação de escopo por `userId` e `tenantId` em todas as consultas.
- Rate limiting aplicado globalmente (middleware de projeto).

## Padronização de Dados (CCXT)

- Ticker/Trades/OrderBook/OHLCV normalizados para formato unificado independente da exchange.
- Markets incluem limites e precisão (quando fornecidos pelo CCXT).
- Operações protegidas por `exchange.has` (ex.: `fetchOHLCV`).

## Observabilidade

- `GET /connections/:id/status` retorna status da conexão e capabilities.
- Erros logados com contexto; dados sensíveis nunca são logados.

## Próximos Passos (opcionais)

- Cache para `loadMarkets()` (Redis com TTL) para ganho de performance.
- Persistência de markets normalizados por tenant para auditoria/performance.
- Mapeamento de permissões da API key por exchange, quando disponível.
