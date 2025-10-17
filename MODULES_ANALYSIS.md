# Análise de Módulos - BotCriptoFy2

## 📊 Classificação por Importância e Dependências

### 🔴 Tier 1: Infraestrutura Core (CRÍTICO - Base do Sistema)

Módulos fundamentais dos quais **TODOS** os outros dependem:

| Módulo | Importância | Dependências | Descrição |
|--------|-------------|--------------|-----------|
| **auth** | ⭐⭐⭐⭐⭐ | - | Autenticação (Better-Auth), sessões, tokens |
| **security** | ⭐⭐⭐⭐⭐ | auth | RBAC, roles, permissions, middleware de autorização |
| **audit** | ⭐⭐⭐⭐⭐ | auth, security | Logs de auditoria, compliance LGPD/GDPR |
| **tenants** | ⭐⭐⭐⭐⭐ | auth | Multi-tenancy, isolamento de dados |
| **users** | ⭐⭐⭐⭐⭐ | auth, tenants | Gestão de perfis, tenant membership |
| **rate-limiting** | ⭐⭐⭐⭐ | security | Proteção de API, throttling |

**Dependentes:** Todos os módulos do sistema
**Impacto de falha:** Sistema inteiro offline
**Prioridade de manutenção:** MÁXIMA

---

### 🟠 Tier 2: Trading Core (CRÍTICO - Funcionalidade Principal)

Módulos de trading que são a razão de ser da plataforma:

| Módulo | Importância | Dependências | Descrição |
|--------|-------------|--------------|-----------|
| **exchanges** | ⭐⭐⭐⭐⭐ | auth, tenants, audit | Integração CCXT com 105 exchanges, credenciais |
| **market-data** | ⭐⭐⭐⭐⭐ | exchanges | OHLCV, trades, order book, tickers (TimescaleDB) |
| **orders** | ⭐⭐⭐⭐⭐ | exchanges, market-data, audit | 8 tipos de ordens (market, limit, stop, trailing) |
| **positions** | ⭐⭐⭐⭐⭐ | exchanges, orders, market-data | Gestão de posições futures/margin |
| **strategies** | ⭐⭐⭐⭐⭐ | market-data, orders, positions | Estratégias, sinais, backtesting |
| **risk** | ⭐⭐⭐⭐⭐ | positions, market-data, orders | VaR, position sizing, análise de risco |
| **bots** | ⭐⭐⭐⭐⭐ | strategies, orders, risk | Grid, DCA, scalping, bots automatizados |

**Dependentes:** social-trading, p2p-marketplace, banco
**Impacto de falha:** Trading offline, perda de receita crítica
**Prioridade de manutenção:** MÁXIMA
**Grafo de Dependências:**

```mermaid
graph TD
    A[exchanges] --> B[market-data]
    B --> C[orders]
    B --> D[positions]
    B --> E[strategies]
    C --> D
    D --> F[risk]
    E --> C
    F --> G[bots]
    E --> G
```

---

### 🟡 Tier 3: Financeiro (ALTO - Monetização)

Módulos relacionados a dinheiro e transações:

| Módulo | Importância | Dependências | Descrição |
|--------|-------------|--------------|-----------|
| **financial** | ⭐⭐⭐⭐ | auth, tenants, audit | Invoices, expenses, budgets, payments (InfinityPay, Stripe) |
| **banco** | ⭐⭐⭐⭐ | auth, tenants, audit, market-data | Wallets (main, savings, trading, staking), portfolio |
| **subscriptions** | ⭐⭐⭐⭐ | auth, tenants, financial | Planos, usage tracking, quotas |

**Dependentes:** affiliate, mmn, p2p-marketplace
**Impacto de falha:** Receita afetada, usuários não podem pagar
**Prioridade de manutenção:** ALTA

---

### 🔵 Tier 4: Social Trading (MÉDIO-ALTO - Diferencial Competitivo)

Módulos de trading social que diferenciam a plataforma:

| Módulo | Importância | Dependências | Descrição |
|--------|-------------|--------------|-----------|
| **social-trading** | ⭐⭐⭐⭐ | auth, strategies, orders, positions | Copy trading, signals, leaderboard, feed |
| **p2p-marketplace** | ⭐⭐⭐ | auth, banco, audit | Trading peer-to-peer entre usuários |
| **affiliate** | ⭐⭐⭐ | auth, tenants | Programa de afiliados, referrals, comissões |
| **mmn** | ⭐⭐⭐ | auth, tenants, affiliate | Multi-level marketing (rede de afiliados) |

**Dependentes:** -
**Impacto de falha:** Funcionalidades sociais offline, engajamento reduzido
**Prioridade de manutenção:** MÉDIA-ALTA

---

### 🟢 Tier 5: Operacional (MÉDIO - Suporte ao Negócio)

Módulos de operação e gestão do negócio:

| Módulo | Importância | Dependências | Descrição |
|--------|-------------|--------------|-----------|
| **notifications** | ⭐⭐⭐ | auth, tenants | Sistema multi-canal (email, push, SMS) |
| **support** | ⭐⭐⭐ | auth, tenants | Tickets, SLA, knowledge base, automações |
| **sales** | ⭐⭐⭐ | auth, tenants | CRM, contacts, deals, pipeline |
| **marketing** | ⭐⭐⭐ | auth, tenants | Campanhas de email, segmentação |
| **documents** | ⭐⭐ | auth, tenants, security | Gestão de documentos, versionamento, sharing |
| **departments** | ⭐⭐ | auth, tenants | Organização, departamentos, membros |
| **configurations** | ⭐⭐ | auth, security | Configurações do sistema |

**Dependentes:** ceo
**Impacto de falha:** Operação afetada, mas sistema funcional
**Prioridade de manutenção:** MÉDIA

---

### ⚪ Tier 6: Executivo (BAIXO - Analytics)

Módulos de visualização e relatórios:

| Módulo | Importância | Dependências | Descrição |
|--------|-------------|--------------|-----------|
| **ceo** | ⭐⭐ | auth, tenants, financial, sales, support, subscriptions | Dashboard executivo, KPIs, métricas agregadas |

**Dependentes:** -
**Impacto de falha:** Executivos sem dashboard, dados ainda acessíveis
**Prioridade de manutenção:** BAIXA

---

## 🔗 Matriz de Dependências

### Módulos Mais Dependidos (fornecedores críticos):

1. **auth** → Usado por 29 módulos (100%)
2. **tenants** → Usado por 25 módulos (86%)
3. **security** → Usado por 20 módulos (69%)
4. **audit** → Usado por 15 módulos (52%)
5. **exchanges** → Usado por 7 módulos (24%)
6. **market-data** → Usado por 6 módulos (21%)

### Módulos Mais Dependentes (consumidores):

1. **ceo** → Depende de 10+ módulos
2. **social-trading** → Depende de 8 módulos
3. **bots** → Depende de 6 módulos
4. **risk** → Depende de 5 módulos
5. **p2p-marketplace** → Depende de 4 módulos

---

## 📈 Grafo Completo de Dependências

```mermaid
graph TD
    %% Tier 1: Infraestrutura
    AUTH[auth]
    SEC[security]
    AUDIT[audit]
    TENANTS[tenants]
    USERS[users]
    RL[rate-limiting]

    %% Tier 2: Trading
    EXC[exchanges]
    MD[market-data]
    ORD[orders]
    POS[positions]
    STRAT[strategies]
    RISK[risk]
    BOTS[bots]

    %% Tier 3: Financeiro
    FIN[financial]
    BANCO[banco]
    SUBS[subscriptions]

    %% Tier 4: Social
    SOCIAL[social-trading]
    P2P[p2p-marketplace]
    AFF[affiliate]
    MMN[mmn]

    %% Tier 5: Operacional
    NOTIF[notifications]
    SUPP[support]
    SALES[sales]
    MARK[marketing]
    DOCS[documents]
    DEPT[departments]
    CONF[configurations]

    %% Tier 6: Executivo
    CEO[ceo]

    %% Dependências Tier 1
    AUTH --> SEC
    AUTH --> AUDIT
    AUTH --> TENANTS
    AUTH --> USERS
    SEC --> RL

    %% Dependências Tier 2 (Trading)
    AUTH --> EXC
    TENANTS --> EXC
    AUDIT --> EXC
    EXC --> MD
    MD --> ORD
    MD --> POS
    MD --> STRAT
    ORD --> POS
    STRAT --> ORD
    POS --> RISK
    MD --> RISK
    ORD --> RISK
    RISK --> BOTS
    STRAT --> BOTS

    %% Dependências Tier 3 (Financeiro)
    AUTH --> FIN
    TENANTS --> FIN
    AUDIT --> FIN
    AUTH --> BANCO
    TENANTS --> BANCO
    AUDIT --> BANCO
    MD --> BANCO
    AUTH --> SUBS
    TENANTS --> SUBS
    FIN --> SUBS

    %% Dependências Tier 4 (Social)
    AUTH --> SOCIAL
    STRAT --> SOCIAL
    ORD --> SOCIAL
    POS --> SOCIAL
    AUTH --> P2P
    BANCO --> P2P
    AUDIT --> P2P
    AUTH --> AFF
    TENANTS --> AFF
    AUTH --> MMN
    TENANTS --> MMN
    AFF --> MMN

    %% Dependências Tier 5 (Operacional)
    AUTH --> NOTIF
    TENANTS --> NOTIF
    AUTH --> SUPP
    TENANTS --> SUPP
    AUTH --> SALES
    TENANTS --> SALES
    AUTH --> MARK
    TENANTS --> MARK
    AUTH --> DOCS
    TENANTS --> DOCS
    SEC --> DOCS
    AUTH --> DEPT
    TENANTS --> DEPT
    AUTH --> CONF
    SEC --> CONF

    %% Dependências Tier 6 (Executivo)
    AUTH --> CEO
    TENANTS --> CEO
    FIN --> CEO
    SALES --> CEO
    SUPP --> CEO
    SUBS --> CEO

    style AUTH fill:#ff6b6b
    style SEC fill:#ff6b6b
    style AUDIT fill:#ff6b6b
    style TENANTS fill:#ff6b6b
    style USERS fill:#ff6b6b

    style EXC fill:#ffa500
    style MD fill:#ffa500
    style ORD fill:#ffa500
    style POS fill:#ffa500
    style STRAT fill:#ffa500
    style RISK fill:#ffa500
    style BOTS fill:#ffa500

    style FIN fill:#ffd700
    style BANCO fill:#ffd700
    style SUBS fill:#ffd700

    style SOCIAL fill:#4169e1
    style P2P fill:#4169e1
    style AFF fill:#4169e1
    style MMN fill:#4169e1

    style NOTIF fill:#32cd32
    style SUPP fill:#32cd32
    style SALES fill:#32cd32
    style MARK fill:#32cd32
    style DOCS fill:#32cd32
    style DEPT fill:#32cd32
    style CONF fill:#32cd32

    style CEO fill:#d3d3d3
```

---

## 🎯 Recomendações de Arquitetura

### Ordem de Desenvolvimento/Manutenção:

1. **Tier 1** (Infraestrutura) - SEMPRE primeiro
2. **Tier 2** (Trading Core) - Segunda prioridade
3. **Tier 3** (Financeiro) - Terceira prioridade
4. **Tier 4** (Social) - Quarta prioridade
5. **Tier 5** (Operacional) - Quinta prioridade
6. **Tier 6** (Executivo) - Última prioridade

### Ciclo de Modificação (Regra 53 - AGENTS.md):

1. **Antes de modificar** qualquer módulo:
   ```bash
   grep -r "nome-do-modulo" . --exclude-dir=node_modules
   ```

2. **Analisar dependências**:
   - Módulos que dependem dele (consumidores)
   - Módulos dos quais ele depende (fornecedores)

3. **Planejar mudanças em cascata**:
   - Tier 1 → Impacta TODOS
   - Tier 2 → Impacta 3-4 (Social, Financeiro)
   - Tier 3 → Impacta 5-6 (Social, Executivo)
   - Tier 4-6 → Impacto localizado

### Estratégia de Testes:

- **Tier 1**: Coverage ≥95% (blockchain-level)
- **Tier 2**: Coverage ≥90% (trading crítico)
- **Tier 3**: Coverage ≥85% (financeiro)
- **Tier 4-6**: Coverage ≥80% (funcionalidades)

---

## 📋 Resumo por Números

- **Total de módulos:** 30
- **Tier 1 (Core):** 6 módulos
- **Tier 2 (Trading):** 7 módulos
- **Tier 3 (Financeiro):** 3 módulos
- **Tier 4 (Social):** 4 módulos
- **Tier 5 (Operacional):** 9 módulos
- **Tier 6 (Executivo):** 1 módulo

**Módulo mais crítico:** `auth` (29 dependentes)
**Módulo mais complexo:** `exchanges` (105 exchanges, CCXT)
**Módulo mais dependente:** `ceo` (10+ dependências)

---

*Gerado em: 2025-10-17*
*Análise baseada em: `/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/index.ts`*
