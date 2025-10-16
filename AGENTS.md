# Repository Guidelines - Beecripto

- Obrigatorio desenvolver focado em performance, seguranca, velocidade, ix/ux, escalabilidade

- Obrigatorio ao termino da tarefa se fazer pelo menos 3 perguntas criticas sobre a sua tarefa e ter certeza que todas as respostas foram positivas e em caso de nao, corrigir tudo.

- Nunca contorne os problemas. É obrigatorio ter tolerancia zero para errors, warning, TODOs, Placeholder, FIXME e outros

- siga, rastrei, mapei e analise e as dependencias dos arquivos antes de aaltera-los

> **Project Status**: 🚧 **Initial Phase** - Core infrastructure being established  
> 📊 **Implementation Status**: See [docs/IMPLEMENTACAO.md](docs/IMPLEMENTACAO.md) for current progress (5% complete)

## Project Overview

**Beecripto** is a **SaaS platform for cryptocurrency trading automation** built with modern TypeScript tooling. The platform enables users to create, backtest, and deploy trading bots with custom strategies and technical indicators across multiple exchanges via CCXT.

### Core Features

- 📊 **Multi-Exchange Trading**: Connect to 100+ exchanges via CCXT
- 🤖 **Trading Bots**: Automated trading with custom strategies
- 📈 **Technical Indicators**: Built-in and custom indicators
- 🧪 **Backtesting**: Test strategies against historical data
- 💼 **Portfolio Management**: Track and optimize portfolios
- 🔐 **Risk Management**: Stop-loss, take-profit, position sizing
- 📱 **SaaS Multi-Tenancy**: Multiple users, subscriptions, API access

### Quick Links

- 📊 **[Implementation Status](docs/IMPLEMENTACAO.md)** - Current progress and roadmap
- 📘 **[Development Guide](CLAUDE.md)** - Claude Code guidance and workflows
- 🔄 **[Migration Plan](docs/MIGRATION_WEB3_TO_TRADING.md)** - Web3 → Trading focus migration
- 📖 **[Quick Reference](docs/AGENTS_README.md)** - Quick start guide
- ✅ **[CTO Approval](docs/AGENTS_ADAPTATION_APPROVAL.json)** - Governance approval report

---

## 🤝 TRABALHO EM EQUIPE - AGENTES EM PARALELO

### Princípios de Colaboração

1. **SEMPRE trabalhe em EQUIPE** - Nunca trabalhe sozinho em tarefas complexas
2. **Consulte especialistas** quando trabalhar com tecnologias específicas
3. **Delegue apropriadamente** baseado na hierarquia e expertise
4. **Escale quando bloqueado** - Não tente resolver tudo sozinho
5. **Documente decisões** em TEAM_DECISIONS.md
6. **Atualize progresso** regularmente

### Hierarquia de Agentes

```mermaid
graph TD
    A[Agente-CTO] --> B[Level A: Tech Lead]
    A --> C[Level A: Architect]
    A --> D[Level A: Engineering Manager]
    
    B --> E[Level B: Mid Developer]
    C --> E
    D --> E
    
    E --> F[Level C: Junior Developer]
    E --> G[Level C: QA Tester]
    
    H[Specialists] -.-> B
    H -.-> C
    H -.-> D
    H -.-> E
```

### Quando Consultar Especialistas

| Tecnologia | Especialista |
|------------|--------------|
| CCXT / Exchanges | `/agent ccxt-specialist` |
| Elysia.js | `/agent elysia-specialist` |
| Drizzle ORM | `/agent drizzle-specialist` |
| Better Auth | `/agent better-auth-specialist` |
| PostgreSQL | `/agent postgresql-specialist` |
| Redis | `/agent redis-specialist` |
| TimescaleDB | `/agent timescaledb-specialist` |
| TypeScript | `/agent typescript-specialist` |
| Zod | `/agent zod-specialist` |

### Workflow de Trabalho em Paralelo

```mermaid
graph LR
    A[Tarefa Complexa] --> B[Agente-CTO Analisa]
    B --> C[Divide em Subtarefas]
    C --> D[Delega para Múltiplos Agentes]
    D --> E[Agente 1: Backend]
    D --> F[Agente 2: Database]
    D --> G[Agente 3: Tests]
    D --> H[Agente 4: Docs]
    E --> I[Code Review]
    F --> I
    G --> I
    H --> I
    I --> J[QA Final]
    J --> K[Merge]
```

### Regras de Paralelização

1. **Identifique dependências** entre subtarefas
2. **Tarefas independentes** executam em paralelo
3. **Tarefas dependentes** executam em sequência
4. **Sincronize resultados** antes de integrar
5. **Code review cruzado** entre agentes

## Project Structure & Module Organization

### Current Structure (v1.0.50)
```
beecripto/
├── backend/              # Bun + Elysia API (active development)
│   ├── src/
│   │   └── index.ts     # Entry point (minimal setup)
│   ├── package.json
│   └── tsconfig.json    # Strict TypeScript config
├── docs/                # Architecture, security audits, ADRs
│   ├── CLAUDE.md
│   ├── CLAUDE_CODE_SETUP.md
│   └── PLUGINS_RECOMENDADOS.md
└── AGENTS.md           # This file
```

### Target Architecture (Roadmap)

#### Backend Structure (`backend/`)
- **Entry point**: `src/index.ts` with Elysia app configuration
- **Feature modules**: `src/modules/` - Domain-driven modules (auth, bots, strategies, indicators, portfolios)
- **Services**: `src/services/` - Reusable business logic and exchange integrations
- **Trading Engine**: `src/trading/` - Core trading logic, order execution, risk management
- **Strategies**: `src/strategies/` - Trading strategy implementations
- **Indicators**: `src/indicators/` - Technical indicators (RSI, MACD, Bollinger, custom)
- **Backtesting**: `src/backtest/` - Historical data testing framework
- **Utilities**: `src/utils/` - Helpers, formatters, validators, exchange utilities
- **Database**: `src/db/` - Drizzle ORM schema, migrations, and seeds
- **CCXT Integration**: `src/exchanges/` - Exchange connectors and adapters
- **WebSockets**: `src/websockets/` - Real-time market data streaming
- **Tests**: `src/tests/` - Unit, integration, and E2E tests with Bun test runner
- **Config**: `src/config/` - Environment-based configurations

#### Frontend Structure (`frontend/`) - **Planned**
- **Framework**: Astro + React for dashboard and trading interface
- **Pages**: `src/pages/` - Astro pages and routes
- **Components**: `src/components/` - Trading charts, bot controls, strategy builder
- **Charts**: `src/charts/` - TradingView/Lightweight Charts integration
- **Hooks**: `src/hooks/` - Custom hooks for real-time data, WebSocket connections
- **Styles**: `src/styles/` - Global styling and theming
- **Public**: `public/` - Static assets

#### Trading Strategies (`strategies/`) - **Planned**
- Pre-built strategies (Grid, DCA, Arbitrage, Market Making)
- Custom strategy templates
- Strategy optimization and parameter tuning
- Performance metrics and analytics

#### Documentation (`docs/`)
- **IMPLEMENTACAO.md** - Current implementation status and roadmap ⭐
- **MIGRATION_WEB3_TO_TRADING.md** - Migration plan from Web3 to Trading focus
- Architecture Decision Records (ADRs)
- Security audit reports
- API documentation with Scalar/Swagger
- Trading strategy documentation
- Exchange integration guides
- Backtesting methodology

#### Infrastructure
- `docker-compose.yml`: Orchestrates Postgres, Redis, TimescaleDB, backend
- Message Queue (Redis/BullMQ) for job processing
- CI/CD pipelines with security scanning
- Automated testing and coverage reports
- Market data caching layer

## Build, Test, and Development Commands

### Backend (Current)
```bash
cd backend
bun install                    # Install dependencies
bun run dev                    # Hot reload development server (port 3000)
```

### Backend (Target - with full infrastructure)
```bash
bun run dev                    # Hot reload development server
bun run build                  # Build production bundle to dist/
bun run start                  # Serve production build
bun test                       # Run unit and integration tests
bun run test:watch             # Watch mode for tests
bun run test:coverage          # Generate coverage report (min 80%)
```

### Database (Planned)
```bash
bun run migrate                # Apply schema changes
bun run migrate:generate       # Generate new migration
bun run migrate:rollback       # Rollback last migration
bun run seed                   # Seed database with test data
bun run db:studio              # Open Drizzle Studio GUI
```

### Trading & Strategies (Planned)
```bash
bun run backtest               # Run backtesting engine
bun run strategy:new           # Create new strategy template
bun run strategy:test          # Test strategy against historical data
bun run bot:start              # Start trading bot
bun run bot:stop               # Stop trading bot
bun run bot:status             # Check bot status
bun run market:fetch           # Fetch market data
bun run indicator:calculate    # Calculate indicators
```

### Frontend (Planned)
```bash
cd frontend
bun install
bun run dev                    # Launch Astro at http://localhost:4321
bun run build                  # Build static bundle
bun run preview                # Preview production build
```

### Full Stack (Target)
```bash
docker compose up --build      # Complete environment: Postgres, Redis, Backend, Blockchain node
docker compose down            # Stop all services
docker compose logs -f backend # Follow backend logs
```

### Linting & Formatting
```bash
bun run lint                   # Check code style
bun run lint:fix               # Auto-fix linting issues
bun run format                 # Format with Prettier
bun run typecheck              # TypeScript type checking
```

### Security & Auditing
```bash
bun run audit                  # Dependency vulnerability scan
bun run audit:api              # API security audit
bun run audit:trading          # Trading logic security review
/security-audit                # Claude custom command for security review
/strategy-validate             # Claude custom command for strategy validation
/risk-analysis                 # Claude custom command for risk analysis
```

## Coding Style & Naming Conventions

### TypeScript
- **Strict mode enabled**: All TypeScript code must pass `strict: true` type checking
- **Import organization**: Group and sort imports (external → internal → types)
- **Named exports**: Prefer named exports over default exports for better refactoring
- **Type-first**: Define interfaces/types before implementation
- **No `any`**: Use `unknown` or proper types instead

### Formatting
- **Indentation**: 2 spaces (no tabs)
- **Line length**: ≤ 100 characters
- **Semicolons**: Required
- **Quotes**: Single quotes for strings, double quotes for JSX
- **Trailing commas**: Always in multiline

### Naming Conventions
- **Files**: 
  - API routes: `kebab-case.ts` (e.g., `bot-control.ts`)
  - Services: `camelCase.service.ts` (e.g., `exchange.service.ts`)
  - Components: `PascalCase.tsx` (e.g., `TradingChart.tsx`)
  - Utilities: `camelCase.util.ts` (e.g., `indicator.util.ts`)
  - Strategies: `PascalCase.strategy.ts` (e.g., `GridStrategy.ts`)
  - Indicators: `camelCase.indicator.ts` (e.g., `rsi.indicator.ts`)
  
- **Functions**: 
  - Public functions: `camelCase` (e.g., `getUserBalance`)
  - Private/internal: `_camelCase` with underscore prefix
  - Async functions: Should clearly indicate async nature (e.g., `fetchUserData`)
  
- **Variables**:
  - Regular: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Exchange symbols: `BTC/USDT` format
  - API keys: NEVER in code, use `EXCHANGE_API_KEY_*` in env vars
  - API secrets: NEVER in code, always encrypted in database

- **Classes/Interfaces**:
  - Classes: `PascalCase` (e.g., `WalletService`)
  - Interfaces: `PascalCase` with optional `I` prefix (e.g., `IWalletProvider`)
  - Types: `PascalCase` (e.g., `TransactionData`)

### Code Organization
- **Early returns**: Avoid deep nesting, fail fast
- **Single responsibility**: Functions should do one thing well
- **DRY principle**: Don't repeat yourself, extract common logic
- **Explicit over implicit**: Code should be self-documenting

### Trading-Specific Conventions
- **Price precision**: Always use exchange-specific precision (from `market.precision`)
- **Amount validation**: Validate against exchange min/max limits
- **Rate limiting**: Always enable `enableRateLimit: true` in CCXT
- **Error handling**: Catch CCXT-specific errors (InsufficientFunds, InvalidOrder, NetworkError)
- **Symbol format**: Use CCXT unified format (`BTC/USDT` not `BTCUSDT`)
- **Timestamps**: Always use milliseconds (CCXT standard)
- **Order IDs**: Store exchange-specific order IDs for tracking

### Pre-commit Requirements
```bash
bun run lint:fix    # Auto-fix linting issues
bun run typecheck   # Ensure no type errors
bun test            # All tests must pass
```

## Testing Guidelines

### Backend Tests
- **Location**: `backend/src/tests/` or colocated as `*.test.ts` next to source files
- **Framework**: Bun's built-in test runner
- **Coverage**: Minimum 80% code coverage required
- **Structure**: Arrange-Act-Assert (AAA) pattern

### Test Types

#### Unit Tests
- Test individual functions/classes in isolation
- Mock external dependencies (database, blockchain, APIs)
- Fast execution (< 100ms per test)
- File pattern: `*.test.ts`

#### Integration Tests
- Test module interactions and API endpoints
- Use test database and local blockchain node
- Mock external APIs but use real internal services
- File pattern: `*.integration.test.ts`

#### E2E Tests
- Test complete user flows
- Use Docker environment for consistency
- Include wallet interactions and transaction flows
- File pattern: `*.e2e.test.ts`

### Smart Contract Tests
- **Framework**: Hardhat or Foundry
- **Coverage**: 100% for financial logic, 95%+ overall
- **Location**: `contracts/test/`
- **Requirements**:
  - Test all state transitions
  - Test access control and permissions
  - Test edge cases and boundary conditions
  - Test gas usage and optimization
  - Test reentrancy and front-running scenarios
  - Test upgrade mechanisms (if applicable)

### Blockchain-Specific Test Requirements
- **Test on multiple networks**: Local, testnet, mainnet fork
- **Gas cost tracking**: Monitor gas usage for regressions
- **Transaction simulation**: Test with various gas prices and network conditions
- **Wallet integration**: Test with different wallet providers (MetaMask, WalletConnect)
- **Error scenarios**: Test network failures, rejected transactions, timeout handling

### Test Data & Fixtures
- **Fixtures location**: `tests/fixtures/`
- **Test wallets**: Use deterministic test mnemonics (NEVER production keys)
- **Mock data**: Realistic but clearly fake (e.g., addresses starting with `0xdeadbeef`)
- **Database seeds**: Isolated per test, cleaned up automatically

### Testing Best Practices
```typescript
// ✅ Good: Descriptive test names
describe('WalletService', () => {
  it('should throw error when transferring to invalid address', async () => {
    // test implementation
  });
});

// ❌ Bad: Vague test names
describe('WalletService', () => {
  it('test transfer', async () => {
    // test implementation
  });
});
```

### Pre-PR Requirements
```bash
bun test                    # All tests pass
bun run test:coverage       # Coverage ≥ 80%
bun run build              # Build succeeds
bun run lint               # No linting errors
```

### Frontend Testing (Planned)
- Component testing with React Testing Library
- E2E tests with Playwright
- Visual regression tests with Storybook
- Web3 interaction mocking for consistent tests

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes already used (`feat:`, `fix:`, `docs:`, `refactor:`). Keep subjects concise (≤ 72 chars) and write descriptions in Portuguese or English, but stay consistent within the PR.
- Squash trivial WIP commits locally. Each commit should encapsulate a coherent change (code + tests + docs where relevant).
- New pull requests must fill out `PR_TEMPLATE.md`: describe scope, mark checklists, link related docs, and include testing steps or screenshots for UI updates.
- Reference issues using `Closes #ID` when applicable and call out migrations, seeds, or manual steps in the summary for easy reviewer hand-off.

## Security & Configuration

### Critical Security Rules

#### 🔐 Secrets Management
- **NEVER commit**:
  - Private keys or mnemonics
  - API keys or tokens
  - Database passwords
  - JWT secrets
  - Any production credentials
  
- **Environment variables**:
  - Use `.env` for local development (git-ignored)
  - Use `.env.example` as template (committed, no real values)
  - Use secure secret management in production (AWS Secrets Manager, Vault, etc.)
  - Rotate secrets regularly

#### 🌐 Web3-Specific Security

**Smart Contract Security**:
- ✅ Use OpenZeppelin audited contracts as base
- ✅ Implement reentrancy guards (ReentrancyGuard)
- ✅ Use SafeMath for Solidity < 0.8.0
- ✅ Implement access control (Ownable, AccessControl)
- ✅ Add circuit breakers/pause mechanisms
- ✅ Set transaction limits and rate limiting
- ✅ Validate all external inputs
- ✅ Use pull over push for payments
- ✅ Emit events for all state changes
- ⚠️ Never use `tx.origin` for authorization
- ⚠️ Beware of front-running in transactions
- ⚠️ Check for integer overflow/underflow
- ⚠️ Validate address(0) in transfers

**Private Key Handling**:
```typescript
// ✅ Good: Private key from environment
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);

// ❌ Bad: Hardcoded private key
const wallet = new ethers.Wallet('0x1234567890abcdef...');

// ✅ Good: Use HD wallets for multiple accounts
const hdNode = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC!);
```

**Transaction Security**:
- Always estimate gas before sending transactions
- Set reasonable gas limits and prices
- Implement nonce management for concurrent transactions
- Add transaction confirmation timeouts
- Validate transaction receipts
- Handle pending transaction states

#### 🛡️ API Security
- **Input validation**: Use Zod schemas for ALL external inputs
- **Rate limiting**: Implement rate limiting on all endpoints
- **Authentication**: JWT with short expiration times
- **Authorization**: Role-based access control (RBAC)
- **CORS**: Whitelist allowed origins
- **SQL injection**: Use parameterized queries (Drizzle ORM handles this)
- **XSS protection**: Sanitize user inputs
- **CSRF protection**: Use CSRF tokens for state-changing operations

#### 📊 Logging & Monitoring
```typescript
// ✅ Good: Safe logging
logger.info('Transaction sent', {
  from: maskAddress(fromAddress),
  to: maskAddress(toAddress),
  txHash: txHash
});

// ❌ Bad: Logging sensitive data
logger.info('Transaction', {
  privateKey: wallet.privateKey,  // NEVER!
  mnemonic: wallet.mnemonic        // NEVER!
});
```

**Logging Rules**:
- Log to rotating files under `backend/logs/`
- Scrub sensitive data (keys, passwords, full addresses)
- Include transaction hashes and block numbers
- Log failed authentication attempts
- Monitor gas usage and transaction failures

#### 🔍 Security Audits
- Run `/project-health-check` before any deployment
- Perform dependency audits (`bun audit`)
- Review all third-party integrations
- Security review of trading logic
- External penetration testing before production

### Configuration Files

#### `.env` Structure (not committed)
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/beecripto
REDIS_URL=redis://localhost:6379

# Blockchain
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=0x...  # ONLY FOR DEV/TEST
MNEMONIC=...       # ONLY FOR DEV/TEST

# API
JWT_SECRET=your-jwt-secret
API_KEY=your-api-key
PORT=3000

# Third-party
INFURA_PROJECT_ID=...
ALCHEMY_API_KEY=...
ETHERSCAN_API_KEY=...
```

#### `.env.example` (committed as template)
```bash
# Database
DATABASE_URL=postgresql://localhost:5432/beecripto_dev
REDIS_URL=redis://localhost:6379

# Blockchain
ETHEREUM_RPC_URL=http://localhost:8545
POLYGON_RPC_URL=http://localhost:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  # Hardhat test account #0
MNEMONIC=test test test test test test test test test test test junk

# API
JWT_SECRET=dev-secret-change-in-production
API_KEY=dev-api-key
PORT=3000

# Third-party (use test/dev keys)
INFURA_PROJECT_ID=your-project-id
ALCHEMY_API_KEY=your-api-key
ETHERSCAN_API_KEY=your-api-key
```

---

## 🌐 Web3/Blockchain Development Guidelines

### Smart Contract Development

#### Design Principles
1. **Security First**: Every line of code should be written with security in mind
2. **Gas Efficiency**: Optimize for gas costs without compromising security
3. **Upgradeability**: Plan for upgrades using proxy patterns when appropriate
4. **Modularity**: Break complex logic into smaller, auditable contracts
5. **Testing**: Test coverage must be ≥ 95% for all contract code

#### Development Workflow
```mermaid
graph TD
    A[Design Contract] --> B[Write Specification]
    B --> C[Implement with Tests]
    C --> D[Security Audit]
    D --> E{Issues Found?}
    E -->|Yes| C
    E -->|No| F[Deploy to Testnet]
    F --> G[Integration Testing]
    G --> H{Production Ready?}
    H -->|No| C
    H -->|Yes| I[External Audit]
    I --> J[Deploy to Mainnet]
    J --> K[Monitor & Maintain]
```

#### Required Contract Elements
- **License identifier**: `// SPDX-License-Identifier: MIT`
- **Pragma version**: Specific version, not floating (e.g., `pragma solidity 0.8.20;`)
- **NatSpec documentation**: Complete @title, @notice, @dev, @param, @return
- **Events**: Emit events for all state changes
- **Access control**: Use OpenZeppelin's AccessControl or Ownable
- **Reentrancy protection**: Use ReentrancyGuard for external calls
- **Emergency stop**: Pausable mechanism for critical functions

#### Gas Optimization Patterns
```solidity
// ✅ Good: Pack variables
struct User {
  address wallet;      // 20 bytes
  uint96 balance;      // 12 bytes
  // Total: 32 bytes = 1 storage slot
}

// ❌ Bad: Unpacked variables
struct User {
  address wallet;      // 32 bytes (padded)
  uint256 balance;     // 32 bytes
  // Total: 64 bytes = 2 storage slots (2x gas cost)
}

// ✅ Good: Use calldata for read-only arrays
function process(uint256[] calldata data) external {
  // Cheaper than memory for read-only data
}

// ✅ Good: Cache storage reads
uint256 cachedValue = storageVariable;
for (uint256 i = 0; i < length; i++) {
  // Use cachedValue instead of storageVariable
}
```

### Blockchain Integration

#### Provider Configuration
```typescript
// ✅ Good: Resilient provider with fallbacks
const providers = [
  new ethers.providers.JsonRpcProvider(process.env.PRIMARY_RPC),
  new ethers.providers.JsonRpcProvider(process.env.FALLBACK_RPC),
  new ethers.providers.InfuraProvider(network, process.env.INFURA_KEY)
];

const provider = new ethers.providers.FallbackProvider(providers);

// ❌ Bad: Single point of failure
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
```

#### Transaction Handling
```typescript
// ✅ Good: Comprehensive transaction handling
async function sendTransaction(tx: TransactionRequest) {
  try {
    // 1. Estimate gas
    const gasLimit = await provider.estimateGas(tx);
    tx.gasLimit = gasLimit.mul(120).div(100); // 20% buffer
    
    // 2. Get current gas price
    const gasPrice = await provider.getGasPrice();
    tx.gasPrice = gasPrice;
    
    // 3. Send transaction
    const txResponse = await wallet.sendTransaction(tx);
    logger.info('Transaction sent', { hash: txResponse.hash });
    
    // 4. Wait for confirmation
    const receipt = await txResponse.wait(2); // 2 confirmations
    
    // 5. Validate receipt
    if (receipt.status === 0) {
      throw new Error('Transaction failed');
    }
    
    return receipt;
  } catch (error) {
    logger.error('Transaction failed', { error, tx });
    throw error;
  }
}
```

#### Error Handling
```typescript
// ✅ Good: Specific error handling
try {
  await contract.transfer(to, amount);
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    throw new InsufficientFundsError('Not enough balance');
  } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    throw new TransactionWillFailError('Transaction would revert');
  } else if (error.code === 'NONCE_EXPIRED') {
    // Retry with updated nonce
    return retryTransaction();
  }
  throw error;
}
```

### API Design for Web3

#### Endpoint Patterns
```typescript
// Wallet Management
POST   /api/v1/wallets              # Create wallet
GET    /api/v1/wallets/:address     # Get wallet info
GET    /api/v1/wallets/:address/balance
GET    /api/v1/wallets/:address/transactions

// Transactions
POST   /api/v1/transactions         # Create transaction
GET    /api/v1/transactions/:hash   # Get transaction
GET    /api/v1/transactions/:hash/receipt

// Smart Contracts
POST   /api/v1/contracts/deploy     # Deploy contract
POST   /api/v1/contracts/:address/call  # Call contract method
GET    /api/v1/contracts/:address/events # Get contract events

// Network
GET    /api/v1/network/status       # Network status
GET    /api/v1/network/gas-price    # Current gas price
GET    /api/v1/network/block/:number
```

#### Response Format
```typescript
// ✅ Good: Consistent response structure
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    timestamp: number;
    network: string;
    blockNumber?: number;
  };
}
```

### Testing Strategy

#### Local Development
```bash
# 1. Start local blockchain
npx hardhat node

# 2. Deploy contracts
bun run deploy:local

# 3. Run backend with local network
bun run dev

# 4. Run tests against local chain
bun test
```

#### Testnet Strategy
- **Ethereum**: Sepolia testnet
- **Polygon**: Mumbai testnet
- **BSC**: BSC testnet
- Use faucets for test tokens
- Monitor transactions on block explorers
- Keep separate configuration files per network

### Monitoring & Observability

#### Key Metrics
- Transaction success rate
- Average gas used per transaction type
- Transaction confirmation time
- Failed transaction reasons
- Contract interaction patterns
- Wallet balance changes

#### Alerts
- Failed transactions
- High gas prices
- Low wallet balances
- Contract events of interest
- Network congestion

---

## 👔 AGENTE-CTO: GOVERNANCE PROTOCOL

Você é o **Agente-CTO** — Chief Technology Officer virtual responsável por coordenar uma equipe de agentes de desenvolvimento, garantindo que **nenhuma tarefa inicie sem seguir todos os protocolos técnicos e de governança** definidos pela organização.

---

### **Missão**

Garantir que cada tarefa técnica cumpra **integralmente os padrões de excelência**, desde o **planejamento e análise de contexto** até **revisão, QA e documentação completa**.
Seu papel é atuar como **guardião dos protocolos, da arquitetura e da integridade do código**.

---

### **Responsabilidades**

1. **Verificar o Protocolo Inicial:**

   * Antes de iniciar qualquer tarefa, confirmar que o time elaborou:

     * Contexto e objetivo técnico claros.
     * Prompt de missão e escopo definido.
     * Workflow e árvore de decisão Mermaid.
     * Checklist de compliance com as 50 Regras de Ouro.

2. **Coordenar Sub-agentes:**

   * Designar papéis (dev, reviewer, QA, documentador).
   * Garantir que a tarefa foi quebrada em **até 6 subtarefas bem definidas**.
   * Certificar que cada sub-agente possui input e output claros.

3. **Supervisionar Execução:**

   * Monitorar se o desenvolvimento segue:

     * Código completo (sem mocks, placeholders ou trechos faltando).
     * Padrões de estilo, validação e segurança.
     * Bibliotecas atualizadas e documentação inline.

4. **Autorizar Revisão e QA:**

   * Somente aprovar a transição de fase se todos os critérios técnicos forem cumpridos.
   * Exigir logs, coverage reports, fluxos e justificativas de decisão.

5. **Gerar Auditoria Técnica:**

   * Criar um registro automático (JSON/YAML) com:

     * Checklist validado.
     * Responsáveis.
     * Decisões arquiteturais.
     * Status de conformidade.

---

### **Checklist de Aprovação (antes da execução)**

O Agente-CTO deve confirmar **todos os pontos abaixo como "OK"** antes da equipe iniciar qualquer desenvolvimento:

* [ ] Contexto e escopo definidos.
* [ ] Workflow e árvore de decisão criados (Mermaid).
* [ ] Subtarefas e responsáveis definidos.
* [ ] **Análise de dependências realizada** (arquivos linkados identificados).
* [ ] **Grafo de dependências mapeado** (ordem de modificação definida).
* [ ] Padrões de código e bibliotecas validados.
* [ ] Nenhum mock/placeholder permitido.
* [ ] Checklist das 53 Regras de Ouro validado.
* [ ] Plano de testes e QA definidos.
* [ ] Repositório, branches e CI/CD configurados.
* [ ] Revisão e documentação obrigatória planejadas.
* [ ] **Validação de consistência pós-modificação planejada**.

---

### **Comando Central do Agente-CTO**

> **“Antes de autorizar a execução de qualquer tarefa, exijo a apresentação do protocolo completo.
> Se qualquer item estiver ausente, a tarefa será rejeitada e devolvida para correção.
> A excelência técnica é obrigatória, não opcional.”**

---

### **Output Esperado do Agente**

Ao aprovar uma tarefa, o Agente-CTO deve retornar um bloco JSON como este:

```json
{
  "task": "Implementar módulo de autenticação",
  "status": "Aprovado",
  "protocol_verification": "Completo",
  "checked_rules": 50,
  "missing_items": [],
  "next_steps": ["Desenvolvimento", "Code Review", "QA"],
  "authorized_by": "Agente-CTO"
}
```

Se houver falhas:

```json
{
  "task": "Implementar módulo de autenticação",
  "status": "Reprovado",
  "protocol_verification": "Incompleto",
  "missing_items": [
    "Workflow Mermaid",
    "Checklist QA",
    "ADR técnico"
  ],
  "action_required": "Corrigir pendências antes de continuar"
}
```


## 🛠️ COMANDOS SLASH - USO OBRIGATÓRIO PELOS AGENTES

**Todos os agentes DEVEM usar os comandos slash disponíveis quando aplicável.**

### Comandos Core (Uso Obrigatório)

#### **Antes de Iniciar Desenvolvimento**
- `/agent-cto-validate` - **OBRIGATÓRIO** antes de qualquer tarefa de desenvolvimento
- `/dev-analyze-dependencies` - **OBRIGATÓRIO** antes de modificar qualquer arquivo (Regra 53)

#### **Durante Desenvolvimento**
- `/project-init` - Ao inicializar novo módulo/feature
- `/dev-code-review` - Antes de criar PR (seguir Regras 21-30)

#### **Validação e Testes**
- `/project-health-check` - Verificar saúde do projeto regularmente
- `/test` - Executar testes com coverage
- `/build` - Build e validação

#### **Comandos Específicos do Domínio** (Trading/Crypto)
- `/exchange-test` - Testar integração com exchanges (CCXT)
- `/strategy-validate` - Validar estratégias de trading
- `/backtest-run` - Executar backtesting de estratégias

> **Nota**: Comandos de domínio são específicos deste projeto. Em outros projetos, adapte ou crie comandos relevantes ao seu domínio.

### Ferramentas de Automação

#### Script de Análise de Dependências
```bash
# Execute antes de modificar arquivos
./scripts/analyze-deps.sh <arquivo>
```

#### Hooks Disponíveis
- `.claude/hooks/file-edit-reminder.md` - Lembrete da Regra 53

### Quando NÃO Usar Comandos Slash

Comandos slash são **complementares**, não substitutos de boas práticas:
- ✅ Use quando aplicável ao contexto
- ❌ Não force uso desnecessário
- ✅ Combine com análise manual quando necessário
- ❌ Não crie dependência excessiva de automação

---

## 📋 AS 53 REGRAS DE OURO DO DESENVOLVIMENTO

### 🧭 PLANEJAMENTO & CONTEXTO

1. Nenhuma tarefa começa sem um **contexto técnico e objetivo claro**.
2. Sempre **crie o prompt e a descrição do contexto** antes de qualquer linha de código.
3. Toda tarefa deve ser **quebrada em até 6 subtarefas** com entregas rastreáveis.
4. Cada subtarefa precisa de **responsável e dependências explícitas**.
5. Use **árvore de decisão Mermaid** para definir o fluxo lógico da tarefa.
6. Toda tarefa deve gerar **um mini-workflow** representado em Mermaid (CRUD, transações, contratos).
7. O escopo deve ser **100% fechado e versionado** antes de iniciar o desenvolvimento.
8. A arquitetura deve ser **revisada e aprovada** por pelo menos um agente arquiteto.
9. Sempre use o **modelo de branch "feature/issue-ID"** ou "contract/issue-ID" e PR vinculado.
10. Documente decisões técnicas no formato **ADR (Architecture Decision Record)**, incluindo escolhas de blockchain/network.

#### 🔗 REGRA CRÍTICA: ANÁLISE DE DEPENDÊNCIAS

**Antes de modificar QUALQUER arquivo, é OBRIGATÓRIO:**

1. **Identificar arquivos dependentes**:
   - Use `grep` para buscar referências ao arquivo em todo o repositório
   - Verifique imports/requires em código
   - Identifique documentação que referencia o arquivo
   - Localize configurações que dependem do arquivo

2. **Analisar impacto**:
   - Leia todos os arquivos que referenciam o arquivo alvo
   - Avalie se a modificação quebrará dependências
   - Identifique testes que podem ser afetados
   - Verifique se há contratos/APIs públicas sendo modificadas

3. **Planejar atualizações em cascata**:
   - Liste todos os arquivos que precisarão ser atualizados
   - Crie uma ordem de execução (grafo de dependências)
   - Documente as mudanças necessárias em cada arquivo
   - Garanta que a mudança é atômica (tudo junto ou nada)

4. **Validar consistência**:
   - Após modificações, re-execute `grep` para validar
   - Verifique se não há referências quebradas
   - Execute testes de integração
   - Valide links de documentação

**Exemplo Prático:**

```bash
# Antes de modificar AGENTS.md
grep -r "AGENTS.md\|agents.md" . --exclude-dir=node_modules

# Arquivos encontrados que devem ser analisados:
# - docs/AGENTS_README.md (referencia diretamente)
# - docs/AGENTS_ANALYSIS.md (documenta o AGENTS.md)
# - CLAUDE.md (pode referenciar processos)
# - README.md (pode ter links)

# Ação: Ler cada arquivo antes de modificar AGENTS.md
# Ação: Atualizar arquivos dependentes após modificar AGENTS.md
# Ação: Validar que todas as referências ainda são válidas
```

**Workflow Visual de Análise de Dependências:**

```mermaid
graph TD
    A[📝 Tarefa: Modificar Arquivo] --> B[🔍 grep -r filename]
    B --> C[📋 Listar Dependentes]
    C --> D[📖 Ler TODOS os Arquivos]
    D --> E{💥 Quebra Algo?}
    E -->|Sim| F[🗺️ Mapear Grafo de Dependências]
    E -->|Não| G[✅ Prosseguir com Cautela]
    F --> H[📝 Planejar Atualizações em Cascata]
    H --> I[⚙️ Modificar Atomicamente]
    I --> J[✓ Re-executar grep para Validar]
    J --> K{✓ Tudo Consistente?}
    K -->|Sim| L[🧪 Executar Testes]
    K -->|Não| M[🚫 BLOQUEAR - Corrigir]
    L --> N{✓ Testes Passam?}
    N -->|Sim| O[🎉 Aprovado]
    N -->|Não| M
    M --> F
    G --> I
```

**Comandos Úteis para Análise:**

```bash
# Buscar referências a um arquivo específico
grep -r "filename" . --exclude-dir={node_modules,dist,build}

# Buscar imports/requires de um módulo
grep -r "from.*filename\|require.*filename" . --exclude-dir=node_modules

# Buscar referências em tipos específicos de arquivo
grep -r "pattern" . --include="*.ts" --include="*.md"

# Buscar com contexto (2 linhas antes e depois)
grep -r -C 2 "pattern" . --exclude-dir=node_modules

# Listar arquivos que importam um módulo (TypeScript/JavaScript)
rg "from ['\"].*module-name['\"]" -t ts -t js

# Verificar links em markdown
grep -r "\[.*\](.*/filename)" . --include="*.md"
```

**Consequências de NÃO seguir esta regra:**
- ❌ Documentação inconsistente
- ❌ Links quebrados
- ❌ Referências desatualizadas
- ❌ Conflitos entre documentos
- ❌ Perda de rastreabilidade
- ❌ Builds quebrados
- ❌ Imports quebrados

**Ferramentas de Automação Disponíveis:**

```bash
# Script automatizado de análise (RECOMENDADO)
./scripts/analyze-deps.sh <arquivo>

# Comando Claude Code interativo
/dev-analyze-dependencies

# Hook de lembrete
# Ver: .claude/hooks/file-edit-reminder.md
```

O script `analyze-deps.sh` fornece:
- ✅ Análise completa de referências
- ✅ Identificação de imports/requires
- ✅ Detecção de links em documentação
- ✅ Relatório de impacto colorido
- ✅ Checklist de próximos passos
- ✅ Integração com ripgrep (opcional)

---

### 💻 DESENVOLVIMENTO

11. Nunca use **mocks, placeholders ou código incompleto** — zero tolerância (especialmente crítico em contratos).
12. Operações devem ser **completas (Create, Read, Update, Delete)** com tratamento robusto de erros e reversões.
13. Código precisa ser **idempotente e seguro** para execução repetida — crítico para transações blockchain.
14. **Dependências auditadas** — use versões estáveis e auditadas (OpenZeppelin, ethers.js, etc.).
15. O código deve seguir **lint, formatter e type checking obrigatórios** (Solhint para contratos).
16. Use **nomes autoexplicativos** para funções e variáveis — crucial para auditoria (sem abreviações).
17. **Documente funções, endpoints e contratos** com JSDoc/NatSpec obrigatório.
18. **Sem lógica mágica**: tudo deve ser explícito e auditável (segurança > conveniência).
19. Use **Zod** para validação de schema em endpoints e **require/revert** para contratos.
20. Cada módulo/contrato deve conter **testes unitários e de integração** (coverage: backend ≥80%, contratos ≥95%).

---

### 🔁 REVISÃO DE CÓDIGO (CODE REVIEW)

21. Nenhum código vai para main sem **revisão de outro agente** (contratos exigem 2+ revisores).
22. O revisor deve validar **qualidade, performance, segurança e vulnerabilidades blockchain**.
23. Revisões devem verificar **complexidade ciclomática, duplicações e gas optimization**.
24. PRs devem ter **descrição clara do que foi feito e por quê** (inclua gas impact para contratos).
25. Se houver dúvida ou brecha de segurança, o PR **é rejeitado imediatamente.**
26. Cada revisão deve gerar um **registro de aprovação auditável** (crítico para contratos).
27. **Checklist de review** é obrigatório: lint, testes, docs, segurança, gas costs, padrões.
28. Revisores e autores devem **assinar digitalmente** as aprovações críticas (deployment).
29. Nenhum "merge rápido" é permitido sem CI/CD completo e security scans.
30. Se houver conflito entre revisores, o agente arquiteto decide (contratos = veto de segurança).

---

### 🧪 QA & TESTES

31. Todo módulo deve ter **testes automatizados** (backend ≥80%, contratos ≥95% coverage).
32. QA valida **funcionalidade, UX, consistência com fluxos Mermaid e transações blockchain.**
33. Testes devem cobrir **cenários positivos, negativos, edge cases e ataques conhecidos.**
34. **Erros reproduzíveis** devem ser documentados com log, stacktrace e transaction hash.
35. Cada entrega gera um **relatório de QA versionado e assinado** (gas report para contratos).
36. QA deve testar **integrações reais** em testnet, nunca apenas mocks.
37. Bugs devem gerar **issues vinculadas** com steps-to-reproduce e network/block info.
38. O agente QA pode **bloquear releases** se padrões mínimos ou segurança não forem cumpridos.
39. CI/CD executa **lint, build, tests, security audit e gas analysis** em pipelines imutáveis.
40. Qualquer erro de segurança **suspende o merge até correção validada e re-auditada.**

---

### 📊 WORKFLOWS & DOCUMENTAÇÃO

41. Cada tarefa gera **um workflow completo** (Mermaid + Markdown) incluindo fluxos de transações.
42. Todos os fluxos devem ter **árvores de decisão completas** com casos de sucesso/falha.
43. Cada decisão técnica deve ter **rastro lógico e justificação registrada** (ADR).
44. Documentação é **obrigatória e versionada junto ao código** (NatSpec para contratos).
45. Use **diagramas atualizados** (arquitetura, dados, APIs, contratos, transaction flows).
46. Mantenha um **README detalhado** em cada módulo/contrato com exemplos de uso.
47. Toda atualização de dependência/contrato deve gerar **changelog automático.**
48. Registre **autores, datas, versões e deployment addresses** em todas as entregas.
49. **Auditoria automatizada** de commits, merges e deployments semanalmente.
50. Qualquer agente pode revisar **documentação e propor melhoria contínua.**
51. Analisar e criar as **tags corretamente** para endpoints no Swagger/Scalar com info de blockchain.
52. **REGRA ESPECIAL BLOCKCHAIN**: Todo deploy de contrato deve ser documentado com address, network, block number, transaction hash, gas used e verification link.
53. **REGRA CRÍTICA DE DEPENDÊNCIAS**: Antes de modificar qualquer arquivo, identifique e analise TODOS os arquivos dependentes usando `grep`, leia-os, avalie impacto, planeje atualizações em cascata e valide consistência após as mudanças. Zero tolerância para referências quebradas ou documentação inconsistente.

---

