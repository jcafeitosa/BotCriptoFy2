# Testes do Módulo de Banco - BotCriptoFy2

## 🧪 Visão Geral

Estratégia completa de testes para o módulo de banco, incluindo testes unitários, integração, E2E e testes de segurança para garantir a integridade e funcionalidade do sistema de gestão de carteiras e ativos.

## 📋 Estratégia de Testes

### Pirâmide de Testes para Módulo de Banco
- **Testes Unitários**: 60% - Lógica de carteiras, cálculos, validações
- **Testes de Integração**: 30% - APIs, banco de dados, exchanges
- **Testes E2E**: 10% - Fluxos completos de gestão de carteiras

### Tipos de Testes
- **Unitários**: Classes e funções individuais
- **Integração**: APIs e banco de dados
- **E2E**: Fluxos completos de carteiras
- **Segurança**: Testes de criptografia e validação
- **Performance**: Testes de carga e sincronização
- **Concorrência**: Testes de operações simultâneas

## 🛠️ Stack de Testes

### Backend (Elysia)
- **Framework**: Bun Test
- **Assertions**: Bun built-in assertions
- **Mocks**: Mock Service Worker
- **Coverage**: c8
- **Database**: Testcontainers

### Frontend (Astro)
- **Framework**: Vitest
- **Components**: Testing Library
- **E2E**: Playwright
- **Coverage**: v8

### Mocks e Fixtures
- **Exchange Mocks**: Simulação de APIs de exchanges
- **Wallet Mocks**: Simulação de carteiras e saldos
- **Asset Mocks**: Simulação de preços e ativos
- **Database Fixtures**: Dados de teste para banco

## 🏗️ Estrutura de Testes

```
tests/
├── unit/                           # Testes unitários
│   ├── banco/
│   │   ├── wallet-manager.test.ts  # Gerenciador de carteiras
│   │   ├── exchange-connector.test.ts # Conectores de exchanges
│   │   ├── asset-tracker.test.ts   # Rastreador de ativos
│   │   ├── balance-calculator.test.ts # Calculadora de saldos
│   │   ├── portfolio-analyzer.test.ts # Analisador de portfólio
│   │   ├── security-manager.test.ts # Gerenciador de segurança
│   │   └── financial-audit-logger.test.ts # Logger financeiro
├── integration/                    # Testes de integração
│   ├── banco/
│   │   ├── banco-apis.test.ts      # APIs do módulo de banco
│   │   ├── exchange-integration.test.ts # Integração com exchanges
│   │   ├── wallet-operations.test.ts # Operações de carteira
│   │   └── portfolio-operations.test.ts # Operações de portfólio
├── e2e/                           # Testes end-to-end
│   ├── banco/
│   │   ├── wallet-management-flows.test.ts # Fluxos de gestão de carteiras
│   │   ├── portfolio-analysis-flows.test.ts # Fluxos de análise de portfólio
│   │   └── exchange-sync-flows.test.ts # Fluxos de sincronização
├── security/                      # Testes de segurança
│   ├── banco/
│   │   ├── wallet-security.test.ts # Segurança de carteiras
│   │   ├── encryption.test.ts      # Criptografia de chaves
│   │   └── validation.test.ts      # Validação de operações
├── performance/                   # Testes de performance
│   ├── banco/
│   │   ├── wallet-load-testing.test.ts # Testes de carga de carteiras
│   │   ├── exchange-sync-performance.test.ts # Performance de sincronização
│   │   └── portfolio-calculation-performance.test.ts # Performance de cálculos
├── fixtures/                      # Dados de teste
│   ├── banco/
│   │   ├── wallets.json            # Carteiras de teste
│   │   ├── assets.json             # Ativos de teste
│   │   ├── exchanges.json          # Exchanges de teste
│   │   └── transactions.json       # Transações de teste
└── mocks/                         # Mocks e simulações
    ├── banco/
    │   ├── exchange-mock.ts        # Mock de exchanges
    │   ├── wallet-mock.ts          # Mock de carteiras
    │   ├── asset-mock.ts           # Mock de ativos
    │   └── price-mock.ts           # Mock de preços
```

## 🔧 Configuração de Testes

### 1. Setup de Testes

```typescript
// tests/setup/banco-setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  // Setup database de teste
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL,
      },
    },
  });

  // Setup Redis de teste
  redis = new Redis(process.env.TEST_REDIS_URL);

  // Executar migrações de teste
  await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS test`;
  await prisma.$executeRaw`SET search_path TO test`;
});

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect();
  await redis.disconnect();
});

beforeEach(async () => {
  // Limpar dados de teste
  await prisma.walletTransactionHistory.deleteMany();
  await prisma.walletSecuritySetting.deleteMany();
  await prisma.walletBalance.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.exchangeCredential.deleteMany();
  await prisma.exchange.deleteMany();
  await prisma.assetPriceHistory.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.portfolioAnalytics.deleteMany();
  await prisma.portfolioSnapshot.deleteMany();
  await prisma.affiliateUser.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushdb();
});

export { prisma, redis };
```

### 2. Mocks do Módulo de Banco

```typescript
// tests/mocks/banco/exchange-mock.ts
export class ExchangeMock {
  static createBinanceMock() {
    return {
      getBalances: jest.fn().mockResolvedValue({
        'BTC': { total: 1.5, available: 1.0, locked: 0.5 },
        'ETH': { total: 10.0, available: 8.0, locked: 2.0 },
        'USDT': { total: 5000.0, available: 5000.0, locked: 0.0 }
      }),
      getAccountInfo: jest.fn().mockResolvedValue({
        accountType: 'SPOT',
        canTrade: true,
        canWithdraw: true,
        canDeposit: true
      }),
      getTradingFees: jest.fn().mockResolvedValue({
        maker: 0.001,
        taker: 0.001
      })
    };
  }

  static createCoinbaseMock() {
    return {
      getBalances: jest.fn().mockResolvedValue({
        'BTC': { total: 0.5, available: 0.5, locked: 0.0 },
        'ETH': { total: 5.0, available: 5.0, locked: 0.0 },
        'USD': { total: 10000.0, available: 10000.0, locked: 0.0 }
      }),
      getAccountInfo: jest.fn().mockResolvedValue({
        id: 'account_123',
        name: 'Test Account',
        primary: true
      })
    };
  }

  static createKrakenMock() {
    return {
      getBalances: jest.fn().mockResolvedValue({
        'XXBT': { total: 2.0, available: 2.0, locked: 0.0 },
        'XETH': { total: 15.0, available: 15.0, locked: 0.0 },
        'ZUSD': { total: 25000.0, available: 25000.0, locked: 0.0 }
      }),
      getAccountInfo: jest.fn().mockResolvedValue({
        accountType: 'spot',
        currency: 'USD'
      })
    };
  }
}
```

```typescript
// tests/mocks/banco/wallet-mock.ts
export class WalletMock {
  static createInternalWallet() {
    return {
      id: 'wallet_internal_123',
      userId: 'user_123',
      tenantId: 'tenant_123',
      name: 'Internal Wallet',
      description: 'Test internal wallet',
      walletType: 'internal',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      privateKeyEncrypted: 'encrypted_private_key_123',
      publicKey: 'public_key_123',
      isActive: true,
      isVerified: true,
      createdAt: new Date()
    };
  }

  static createExchangeWallet() {
    return {
      id: 'wallet_exchange_123',
      userId: 'user_123',
      tenantId: 'tenant_123',
      exchangeId: 'exchange_123',
      name: 'Binance Wallet',
      description: 'Test exchange wallet',
      walletType: 'exchange',
      isActive: true,
      isVerified: true,
      createdAt: new Date()
    };
  }

  static createExternalWallet() {
    return {
      id: 'wallet_external_123',
      userId: 'user_123',
      tenantId: 'tenant_123',
      name: 'External Wallet',
      description: 'Test external wallet',
      walletType: 'external',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      isActive: true,
      isVerified: false,
      createdAt: new Date()
    };
  }
}
```

```typescript
// tests/mocks/banco/asset-mock.ts
export class AssetMock {
  static createBitcoinAsset() {
    return {
      id: 'asset_btc_123',
      symbol: 'BTC',
      name: 'Bitcoin',
      fullName: 'Bitcoin',
      assetType: 'crypto',
      decimals: 8,
      iconUrl: 'https://example.com/btc.png',
      coingeckoId: 'bitcoin',
      cmcId: 1,
      isActive: true,
      isTradable: true,
      isWithdrawable: true,
      isDepositable: true,
      minDeposit: 0.001,
      minWithdrawal: 0.001,
      withdrawalFee: 0.0005,
      networkInfo: {
        network: 'bitcoin',
        addressRegex: '^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$'
      },
      createdAt: new Date()
    };
  }

  static createEthereumAsset() {
    return {
      id: 'asset_eth_123',
      symbol: 'ETH',
      name: 'Ethereum',
      fullName: 'Ethereum',
      assetType: 'crypto',
      decimals: 18,
      iconUrl: 'https://example.com/eth.png',
      coingeckoId: 'ethereum',
      cmcId: 1027,
      isActive: true,
      isTradable: true,
      isWithdrawable: true,
      isDepositable: true,
      minDeposit: 0.01,
      minWithdrawal: 0.01,
      withdrawalFee: 0.005,
      networkInfo: {
        network: 'ethereum',
        addressRegex: '^0x[a-fA-F0-9]{40}$'
      },
      createdAt: new Date()
    };
  }

  static createUsdAsset() {
    return {
      id: 'asset_usd_123',
      symbol: 'USD',
      name: 'US Dollar',
      fullName: 'US Dollar',
      assetType: 'fiat',
      decimals: 2,
      isActive: true,
      isTradable: false,
      isWithdrawable: true,
      isDepositable: true,
      minDeposit: 1,
      minWithdrawal: 1,
      withdrawalFee: 0,
      createdAt: new Date()
    };
  }
}
```

## 🧪 Testes Unitários

### 1. Wallet Manager

```typescript
// tests/unit/banco/wallet-manager.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { WalletManager } from '../../src/banco/wallet-manager';
import { prisma } from '../setup';

describe('WalletManager', () => {
  let walletManager: WalletManager;

  beforeEach(() => {
    walletManager = new WalletManager();
  });

  describe('createWallet', () => {
    it('should create internal wallet successfully', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const walletData = {
        name: 'My Internal Wallet',
        description: 'Test internal wallet',
        walletType: 'internal' as const
      };

      const result = await walletManager.createWallet(
        user.id,
        tenant.id,
        walletData,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.walletId).toBeDefined();

      // Verificar se carteira foi criada
      const wallet = await prisma.wallet.findUnique({
        where: { id: result.walletId! }
      });

      expect(wallet).toBeDefined();
      expect(wallet?.name).toBe('My Internal Wallet');
      expect(wallet?.walletType).toBe('internal');
      expect(wallet?.privateKeyEncrypted).toBeDefined();
      expect(wallet?.publicKey).toBeDefined();
    });

    it('should create exchange wallet successfully', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const exchange = await prisma.exchange.create({
        data: {
          name: 'Binance',
          code: 'BINANCE',
          apiBaseUrl: 'https://api.binance.com',
          supportedAssets: ['BTC', 'ETH', 'USDT'],
          isActive: true
        }
      });

      const walletData = {
        name: 'Binance Wallet',
        walletType: 'exchange' as const,
        exchangeId: exchange.id
      };

      const result = await walletManager.createWallet(
        user.id,
        tenant.id,
        walletData,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.walletId).toBeDefined();

      const wallet = await prisma.wallet.findUnique({
        where: { id: result.walletId! }
      });

      expect(wallet?.exchangeId).toBe(exchange.id);
      expect(wallet?.walletType).toBe('exchange');
    });

    it('should validate wallet data correctly', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const invalidWalletData = {
        name: '', // Nome vazio
        walletType: 'exchange' as const
        // Sem exchangeId para exchange wallet
      };

      const result = await walletManager.createWallet(
        user.id,
        tenant.id,
        invalidWalletData,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation failed');
    });
  });

  describe('getWalletBalances', () => {
    it('should get wallet balances for user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Test Wallet',
          walletType: 'internal',
          isActive: true
        }
      });

      const asset = await prisma.asset.create({
        data: {
          symbol: 'BTC',
          name: 'Bitcoin',
          assetType: 'crypto',
          isActive: true
        }
      });

      await prisma.walletBalance.create({
        data: {
          walletId: wallet.id,
          assetId: asset.id,
          balance: 1.5,
          availableBalance: 1.0,
          lockedBalance: 0.5,
          usdValue: 45000,
          btcValue: 1.5
        }
      });

      const result = await walletManager.getWalletBalances(
        user.id,
        tenant.id
      );

      expect(result.success).toBe(true);
      expect(result.balances).toHaveLength(1);
      expect(result.balances![0].balance).toBe(1.5);
      expect(result.balances![0].usdValue).toBe(45000);
    });
  });

  describe('syncExchangeBalances', () => {
    it('should sync exchange balances successfully', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const exchange = await prisma.exchange.create({
        data: {
          name: 'Binance',
          code: 'BINANCE',
          apiBaseUrl: 'https://api.binance.com',
          supportedAssets: ['BTC', 'ETH', 'USDT'],
          isActive: true
        }
      });

      await prisma.exchangeCredential.create({
        data: {
          exchangeId: exchange.id,
          tenantId: tenant.id,
          apiKey: 'test_api_key',
          apiSecret: 'test_api_secret',
          isActive: true
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          tenantId: tenant.id,
          exchangeId: exchange.id,
          name: 'Binance Wallet',
          walletType: 'exchange',
          isActive: true
        }
      });

      // Mock do exchange connector
      const mockExchangeClient = {
        getBalances: jest.fn().mockResolvedValue({
          'BTC': { total: 1.5, available: 1.0, locked: 0.5 },
          'ETH': { total: 10.0, available: 8.0, locked: 2.0 }
        })
      };

      // Substituir o exchange connector por mock
      walletManager['exchangeConnector'] = {
        connect: jest.fn().mockResolvedValue(mockExchangeClient)
      } as any;

      const result = await walletManager.syncExchangeBalances(
        tenant.id,
        exchange.id,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.syncedWallets).toBe(1);
    });
  });
});
```

### 2. Balance Calculator

```typescript
// tests/unit/banco/balance-calculator.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { BalanceCalculator } from '../../src/banco/balance-calculator';
import { prisma } from '../setup';

describe('BalanceCalculator', () => {
  let balanceCalculator: BalanceCalculator;

  beforeEach(() => {
    balanceCalculator = new BalanceCalculator();
  });

  describe('calculateWalletBalances', () => {
    it('should calculate wallet balances correctly', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Test Wallet',
          walletType: 'internal',
          isActive: true
        }
      });

      const asset = await prisma.asset.create({
        data: {
          symbol: 'BTC',
          name: 'Bitcoin',
          assetType: 'crypto',
          isActive: true
        }
      });

      await prisma.walletBalance.create({
        data: {
          walletId: wallet.id,
          assetId: asset.id,
          balance: 1.5,
          availableBalance: 1.0,
          lockedBalance: 0.5,
          usdValue: 45000,
          btcValue: 1.5
        }
      });

      // Mock do asset tracker
      balanceCalculator['assetTracker'] = {
        getAssetPrice: jest.fn().mockResolvedValue(30000)
      } as any;

      const result = await balanceCalculator.calculateWalletBalances(wallet.id);

      expect(result.success).toBe(true);
      expect(result.balances).toHaveLength(1);
      expect(result.balances![0].balance).toBe(1.5);
      expect(result.totalUsdValue).toBeGreaterThan(0);
    });

    it('should handle pending transactions', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Test Wallet',
          walletType: 'internal',
          isActive: true
        }
      });

      const asset = await prisma.asset.create({
        data: {
          symbol: 'BTC',
          name: 'Bitcoin',
          assetType: 'crypto',
          isActive: true
        }
      });

      await prisma.walletBalance.create({
        data: {
          walletId: wallet.id,
          assetId: asset.id,
          balance: 1.0,
          availableBalance: 1.0,
          lockedBalance: 0.0,
          usdValue: 30000,
          btcValue: 1.0
        }
      });

      // Criar transações pendentes
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          assetId: asset.id,
          transactionType: 'deposit',
          amount: 0.5,
          status: 'pending'
        }
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          assetId: asset.id,
          transactionType: 'withdrawal',
          amount: 0.2,
          status: 'pending'
        }
      });

      // Mock do asset tracker
      balanceCalculator['assetTracker'] = {
        getAssetPrice: jest.fn().mockResolvedValue(30000)
      } as any;

      const result = await balanceCalculator.calculateWalletBalances(
        wallet.id,
        true // includePending
      );

      expect(result.success).toBe(true);
      expect(result.balances![0].pendingDeposits).toBe(0.5);
      expect(result.balances![0].pendingWithdrawals).toBe(0.2);
    });
  });

  describe('calculatePortfolioValue', () => {
    it('should calculate portfolio value correctly', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Test Wallet',
          walletType: 'internal',
          isActive: true
        }
      });

      const btcAsset = await prisma.asset.create({
        data: {
          symbol: 'BTC',
          name: 'Bitcoin',
          assetType: 'crypto',
          isActive: true
        }
      });

      const ethAsset = await prisma.asset.create({
        data: {
          symbol: 'ETH',
          name: 'Ethereum',
          assetType: 'crypto',
          isActive: true
        }
      });

      await prisma.walletBalance.create({
        data: {
          walletId: wallet.id,
          assetId: btcAsset.id,
          balance: 1.0,
          availableBalance: 1.0,
          lockedBalance: 0.0,
          usdValue: 30000,
          btcValue: 1.0
        }
      });

      await prisma.walletBalance.create({
        data: {
          walletId: wallet.id,
          assetId: ethAsset.id,
          balance: 10.0,
          availableBalance: 10.0,
          lockedBalance: 0.0,
          usdValue: 20000,
          btcValue: 0.67
        }
      });

      const result = await balanceCalculator.calculatePortfolioValue(
        user.id,
        tenant.id,
        false
      );

      expect(result.success).toBe(true);
      expect(result.portfolio?.totalUsdValue).toBe(50000);
      expect(result.portfolio?.assetBreakdown).toHaveLength(2);
      expect(result.portfolio?.exchangeBreakdown).toBeDefined();
    });
  });
});
```

### 3. Portfolio Analyzer

```typescript
// tests/unit/banco/portfolio-analyzer.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { PortfolioAnalyzer } from '../../src/banco/portfolio-analyzer';
import { prisma } from '../setup';

describe('PortfolioAnalyzer', () => {
  let portfolioAnalyzer: PortfolioAnalyzer;

  beforeEach(() => {
    portfolioAnalyzer = new PortfolioAnalyzer();
  });

  describe('analyzePortfolio', () => {
    it('should perform basic analysis', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      // Mock do balance calculator
      portfolioAnalyzer['balanceCalculator'] = {
        calculatePortfolioValue: jest.fn().mockResolvedValue({
          success: true,
          portfolio: {
            totalUsdValue: 100000,
            totalBtcValue: 2.5,
            assetBreakdown: [
              {
                asset: { symbol: 'BTC', name: 'Bitcoin', assetType: 'crypto' },
                totalBalance: 1.0,
                totalUsdValue: 40000,
                totalBtcValue: 1.0,
                percentage: 40
              },
              {
                asset: { symbol: 'ETH', name: 'Ethereum', assetType: 'crypto' },
                totalBalance: 20.0,
                totalUsdValue: 60000,
                totalBtcValue: 1.5,
                percentage: 60
              }
            ],
            exchangeBreakdown: {
              'internal': {
                totalValue: 100000,
                totalBtcValue: 2.5,
                assets: {}
              }
            }
          }
        })
      } as any;

      const result = await portfolioAnalyzer.analyzePortfolio(
        user.id,
        tenant.id,
        'basic'
      );

      expect(result.success).toBe(true);
      expect(result.analysis?.basic).toBeDefined();
      expect(result.analysis?.basic.totalValue.usd).toBe(100000);
      expect(result.analysis?.basic.diversification).toBeDefined();
      expect(result.analysis?.basic.concentration).toBeDefined();
    });

    it('should perform advanced analysis', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      // Mock do balance calculator
      portfolioAnalyzer['balanceCalculator'] = {
        calculatePortfolioValue: jest.fn().mockResolvedValue({
          success: true,
          portfolio: {
            totalUsdValue: 100000,
            totalBtcValue: 2.5,
            assetBreakdown: []
          }
        })
      } as any;

      const result = await portfolioAnalyzer.analyzePortfolio(
        user.id,
        tenant.id,
        'advanced'
      );

      expect(result.success).toBe(true);
      expect(result.analysis?.advanced).toBeDefined();
      expect(result.analysis?.advanced.correlations).toBeDefined();
      expect(result.analysis?.advanced.performance).toBeDefined();
      expect(result.analysis?.advanced.liquidity).toBeDefined();
    });

    it('should perform risk analysis', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      // Mock do balance calculator
      portfolioAnalyzer['balanceCalculator'] = {
        calculatePortfolioValue: jest.fn().mockResolvedValue({
          success: true,
          portfolio: {
            totalUsdValue: 100000,
            totalBtcValue: 2.5,
            assetBreakdown: []
          }
        })
      } as any;

      const result = await portfolioAnalyzer.analyzePortfolio(
        user.id,
        tenant.id,
        'risk'
      );

      expect(result.success).toBe(true);
      expect(result.analysis?.risk).toBeDefined();
      expect(result.analysis?.risk.riskMetrics).toBeDefined();
      expect(result.analysis?.risk.stressTest).toBeDefined();
      expect(result.analysis?.risk.varAnalysis).toBeDefined();
    });
  });
});
```

## 🔗 Testes de Integração

### 1. Banco APIs

```typescript
// tests/integration/banco/banco-apis.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { bancoRoutes } from '../../src/banco/routes';
import { prisma } from '../setup';

describe('Banco APIs', () => {
  let app: Elysia;

  beforeEach(() => {
    app = new Elysia()
      .use(bancoRoutes);
  });

  describe('POST /api/banco/wallets', () => {
    it('should create wallet successfully', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const walletData = {
        name: 'Test Wallet',
        description: 'Test wallet description',
        walletType: 'internal'
      };

      const response = await app.handle(
        new Request('http://localhost:3000/api/banco/wallets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
            'X-User-ID': user.id,
            'X-Tenant-ID': tenant.id
          },
          body: JSON.stringify(walletData)
        })
      );

      expect(response.status).toBe(201);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.walletId).toBeDefined();
    });

    it('should validate wallet data', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const invalidWalletData = {
        name: '', // Nome vazio
        walletType: 'exchange'
        // Sem exchangeId para exchange wallet
      };

      const response = await app.handle(
        new Request('http://localhost:3000/api/banco/wallets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
            'X-User-ID': user.id,
            'X-Tenant-ID': tenant.id
          },
          body: JSON.stringify(invalidWalletData)
        })
      );

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation failed');
    });
  });

  describe('GET /api/banco/wallets', () => {
    it('should get user wallets', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Test Wallet',
          walletType: 'internal',
          isActive: true
        }
      });

      const response = await app.handle(
        new Request('http://localhost:3000/api/banco/wallets', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
            'X-User-ID': user.id,
            'X-Tenant-ID': tenant.id
          }
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.wallets).toHaveLength(1);
      expect(result.wallets![0].id).toBe(wallet.id);
    });
  });

  describe('GET /api/banco/portfolio/overview', () => {
    it('should get portfolio overview', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Test Wallet',
          walletType: 'internal',
          isActive: true
        }
      });

      const asset = await prisma.asset.create({
        data: {
          symbol: 'BTC',
          name: 'Bitcoin',
          assetType: 'crypto',
          isActive: true
        }
      });

      await prisma.walletBalance.create({
        data: {
          walletId: wallet.id,
          assetId: asset.id,
          balance: 1.0,
          availableBalance: 1.0,
          lockedBalance: 0.0,
          usdValue: 30000,
          btcValue: 1.0
        }
      });

      const response = await app.handle(
        new Request('http://localhost:3000/api/banco/portfolio/overview', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
            'X-User-ID': user.id,
            'X-Tenant-ID': tenant.id
          }
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.portfolio).toBeDefined();
      expect(result.portfolio.totalUsdValue).toBe(30000);
    });
  });
});
```

## 🎭 Testes E2E

### 1. Wallet Management Flows

```typescript
// tests/e2e/banco/wallet-management-flows.test.ts
import { test, expect } from '@playwright/test';

test.describe('Wallet Management Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Login como usuário
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create internal wallet', async ({ page }) => {
    // Navegar para gestão de carteiras
    await page.goto('/banco/wallets');
    
    // Clicar em criar nova carteira
    await page.click('[data-testid="create-wallet-button"]');
    
    // Preencher formulário
    await page.fill('[data-testid="wallet-name-input"]', 'My Internal Wallet');
    await page.fill('[data-testid="wallet-description-input"]', 'Test internal wallet');
    await page.selectOption('[data-testid="wallet-type-select"]', 'internal');
    
    // Submeter formulário
    await page.click('[data-testid="create-wallet-submit"]');
    
    // Verificar se carteira foi criada
    await expect(page.locator('[data-testid="wallet-created-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-list"]')).toContainText('My Internal Wallet');
  });

  test('should create exchange wallet', async ({ page }) => {
    await page.goto('/banco/wallets');
    
    await page.click('[data-testid="create-wallet-button"]');
    
    await page.fill('[data-testid="wallet-name-input"]', 'Binance Wallet');
    await page.selectOption('[data-testid="wallet-type-select"]', 'exchange');
    await page.selectOption('[data-testid="exchange-select"]', 'binance');
    
    await page.click('[data-testid="create-wallet-submit"]');
    
    await expect(page.locator('[data-testid="wallet-created-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-list"]')).toContainText('Binance Wallet');
  });

  test('should view wallet balances', async ({ page }) => {
    await page.goto('/banco/wallets');
    
    // Clicar em uma carteira
    await page.click('[data-testid="wallet-item"]:first-child');
    
    // Verificar se saldos são exibidos
    await expect(page.locator('[data-testid="wallet-balances"]')).toBeVisible();
    await expect(page.locator('[data-testid="balance-item"]')).toHaveCount.greaterThan(0);
  });

  test('should sync exchange balances', async ({ page }) => {
    await page.goto('/banco/wallets');
    
    // Clicar em sincronizar para uma carteira de exchange
    await page.click('[data-testid="sync-exchange-button"]');
    
    // Verificar se sincronização foi iniciada
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Sincronizando');
    
    // Aguardar conclusão
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Concluído', { timeout: 30000 });
  });
});
```

### 2. Portfolio Analysis Flows

```typescript
// tests/e2e/banco/portfolio-analysis-flows.test.ts
import { test, expect } from '@playwright/test';

test.describe('Portfolio Analysis Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should view portfolio overview', async ({ page }) => {
    await page.goto('/banco/portfolio');
    
    // Verificar se visão geral é exibida
    await expect(page.locator('[data-testid="portfolio-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="asset-breakdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="exchange-breakdown"]')).toBeVisible();
  });

  test('should perform portfolio analysis', async ({ page }) => {
    await page.goto('/banco/portfolio');
    
    // Clicar em analisar portfólio
    await page.click('[data-testid="analyze-portfolio-button"]');
    
    // Selecionar tipo de análise
    await page.selectOption('[data-testid="analysis-type-select"]', 'advanced');
    
    // Executar análise
    await page.click('[data-testid="run-analysis-button"]');
    
    // Verificar se análise foi executada
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="diversification-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="concentration-risk"]')).toBeVisible();
  });

  test('should view portfolio analytics history', async ({ page }) => {
    await page.goto('/banco/portfolio/analytics');
    
    // Verificar se histórico é exibido
    await expect(page.locator('[data-testid="analytics-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="analytics-item"]')).toHaveCount.greaterThan(0);
  });

  test('should export portfolio data', async ({ page }) => {
    await page.goto('/banco/portfolio');
    
    // Clicar em exportar
    await page.click('[data-testid="export-portfolio-button"]');
    
    // Selecionar formato
    await page.selectOption('[data-testid="export-format-select"]', 'csv');
    
    // Confirmar exportação
    await page.click('[data-testid="confirm-export-button"]');
    
    // Verificar se exportação foi iniciada
    await expect(page.locator('[data-testid="export-status"]')).toContainText('Exportando');
  });
});
```

## 🔒 Testes de Segurança

### 1. Wallet Security Tests

```typescript
// tests/security/banco/wallet-security.test.ts
import { describe, it, expect } from 'bun:test';
import { SecurityManager } from '../../src/banco/security-manager';
import { prisma } from '../setup';

describe('Wallet Security', () => {
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = new SecurityManager();
  });

  describe('validateTransaction', () => {
    it('should validate transaction within limits', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Test Wallet',
          walletType: 'internal',
          isActive: true
        }
      });

      await prisma.walletSecuritySetting.create({
        data: {
          walletId: wallet.id,
          withdrawalLimits: {
            daily: 1000,
            weekly: 5000,
            monthly: 20000
          },
          allowedOperations: ['deposit', 'withdrawal', 'transfer']
        }
      });

      const result = await securityManager.validateTransaction(
        wallet.id,
        'withdrawal',
        500, // Dentro do limite diário
        {
          ipAddress: '192.168.1.1',
          twoFactorVerified: false
        }
      );

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
    });

    it('should reject transaction exceeding daily limit', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Test Wallet',
          walletType: 'internal',
          isActive: true
        }
      });

      await prisma.walletSecuritySetting.create({
        data: {
          walletId: wallet.id,
          withdrawalLimits: {
            daily: 1000,
            weekly: 5000,
            monthly: 20000
          },
          allowedOperations: ['deposit', 'withdrawal', 'transfer']
        }
      });

      // Criar saque anterior no mesmo dia
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          assetId: 'asset_123',
          transactionType: 'withdrawal',
          amount: 600,
          status: 'confirmed',
          createdAt: new Date()
        }
      });

      const result = await securityManager.validateTransaction(
        wallet.id,
        'withdrawal',
        500, // Total seria 1100, excedendo limite diário
        {
          ipAddress: '192.168.1.1',
          twoFactorVerified: false
        }
      );

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Daily withdrawal limit exceeded');
    });

    it('should require 2FA for high-value transactions', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          type: 'empresa'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Test Wallet',
          walletType: 'internal',
          isActive: true
        }
      });

      await prisma.walletSecuritySetting.create({
        data: {
          walletId: wallet.id,
          twoFactorRequired: true,
          withdrawalLimits: {
            daily: 10000,
            weekly: 50000,
            monthly: 200000
          },
          allowedOperations: ['deposit', 'withdrawal', 'transfer']
        }
      });

      const result = await securityManager.validateTransaction(
        wallet.id,
        'withdrawal',
        5000,
        {
          ipAddress: '192.168.1.1',
          twoFactorVerified: false // 2FA não verificado
        }
      );

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Two-factor authentication required');
    });
  });
});
```

## ⚡ Testes de Performance

### 1. Wallet Load Testing

```typescript
// tests/performance/banco/wallet-load-testing.test.ts
import { describe, it, expect } from 'bun:test';
import { WalletManager } from '../../src/banco/wallet-manager';
import { prisma } from '../setup';

describe('Wallet Load Testing', () => {
  let walletManager: WalletManager;

  beforeEach(() => {
    walletManager = new WalletManager();
  });

  it('should handle high volume of wallet operations', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        type: 'empresa'
      }
    });

    const startTime = Date.now();
    
    // Criar 100 carteiras
    const promises = [];
    for (let i = 0; i < 100; i++) {
      const promise = walletManager.createWallet(
        user.id,
        tenant.id,
        {
          name: `Wallet ${i}`,
          description: `Test wallet ${i}`,
          walletType: 'internal'
        },
        {}
      );
      promises.push(promise);
    }

    const results = await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(30000); // Deve completar em menos de 30 segundos

    // Verificar se todas as carteiras foram criadas
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(100);

    // Verificar no banco
    const walletCount = await prisma.wallet.count({
      where: { userId: user.id }
    });
    expect(walletCount).toBe(100);
  });

  it('should handle concurrent balance calculations', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        type: 'empresa'
      }
    });

    // Criar carteira com saldos
    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        name: 'Test Wallet',
        walletType: 'internal',
        isActive: true
      }
    });

    const asset = await prisma.asset.create({
      data: {
        symbol: 'BTC',
        name: 'Bitcoin',
        assetType: 'crypto',
        isActive: true
      }
    });

    await prisma.walletBalance.create({
      data: {
        walletId: wallet.id,
        assetId: asset.id,
        balance: 1.0,
        availableBalance: 1.0,
        lockedBalance: 0.0,
        usdValue: 30000,
        btcValue: 1.0
      }
    });

    const startTime = Date.now();
    
    // Calcular saldos 50 vezes concorrentemente
    const promises = [];
    for (let i = 0; i < 50; i++) {
      const promise = walletManager.getWalletBalances(user.id, tenant.id);
      promises.push(promise);
    }

    const results = await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(10000); // Deve completar em menos de 10 segundos

    // Verificar se todos os cálculos foram bem-sucedidos
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(50);
  });
});
```

## 📊 Coverage e Relatórios

### 1. Coverage Configuration

```json
// package.json
{
  "scripts": {
    "test:banco": "bun test tests/unit/banco/ tests/integration/banco/",
    "test:banco:coverage": "bun test --coverage tests/unit/banco/ tests/integration/banco/",
    "test:banco:e2e": "playwright test tests/e2e/banco-*.test.ts",
    "test:banco:security": "bun test tests/security/banco/",
    "test:banco:performance": "bun test tests/performance/banco-*.test.ts"
  }
}
```

### 2. Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        './src/banco/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
});
```

## 🚀 CI/CD Integration

### 1. GitHub Actions

```yaml
# .github/workflows/banco-tests.yml
name: Banco Module Tests

on:
  push:
    paths: ['src/banco/**', 'tests/**/banco*']
  pull_request:
    paths: ['src/banco/**', 'tests/**/banco*']

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run unit tests
      run: bun test tests/unit/banco/ --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:16.0-pg16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7.2-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run integration tests
      run: bun test tests/integration/banco/
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Install Playwright
      run: bunx playwright install --with-deps
    
    - name: Build application
      run: |
        cd backend && bun run build
        cd ../frontend && bun run build
    
    - name: Run E2E tests
      run: bunx playwright test tests/e2e/banco-*.test.ts
      env:
        CI: true
```

## 📋 Checklist de Testes

### ✅ Testes Unitários
- [ ] Wallet Manager testado
- [ ] Exchange Connector testado
- [ ] Asset Tracker testado
- [ ] Balance Calculator testado
- [ ] Portfolio Analyzer testado
- [ ] Security Manager testado
- [ ] Financial Audit Logger testado

### ✅ Testes de Integração
- [ ] APIs do módulo de banco testadas
- [ ] Integração com exchanges testada
- [ ] Operações de carteira testadas
- [ ] Operações de portfólio testadas

### ✅ Testes E2E
- [ ] Fluxos de gestão de carteiras testados
- [ ] Fluxos de análise de portfólio testados
- [ ] Fluxos de sincronização testados
- [ ] Responsividade testada

### ✅ Testes de Segurança
- [ ] Segurança de carteiras testada
- [ ] Criptografia de chaves testada
- [ ] Validação de operações testada
- [ ] Limites de transação testados

### ✅ Testes de Performance
- [ ] Testes de carga de carteiras executados
- [ ] Performance de sincronização testada
- [ ] Performance de cálculos testada
- [ ] Concorrência testada

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Testes de Exchange Falhando
```bash
# Verificar mocks de exchange
bun test --verbose tests/unit/banco/exchange-connector.test.ts

# Verificar configuração de API
echo $EXCHANGE_API_KEY
```

#### 2. Problemas de Criptografia
```bash
# Verificar variáveis de ambiente
echo $WALLET_ENCRYPTION_KEY

# Executar testes de criptografia isoladamente
bun test tests/security/banco/encryption.test.ts
```

#### 3. Problemas de Performance
```bash
# Executar testes de performance
bun test tests/performance/banco/wallet-load-testing.test.ts

# Verificar métricas de memória
bun test --verbose tests/performance/banco/portfolio-calculation-performance.test.ts
```

## 📞 Suporte

Para problemas de testes do módulo de banco:
1. Verificar logs: `bun test --verbose tests/unit/banco/`
2. Executar testes específicos: `bun test tests/integration/banco/banco-apis.test.ts`
3. Verificar cobertura: `bun test --coverage tests/unit/banco/`
4. Contatar equipe de QA

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO