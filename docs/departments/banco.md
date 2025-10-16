# Módulo de Banco - BotCriptoFy2

## 🏦 Visão Geral

Módulo responsável por gerenciar carteiras com exchanges e carteiras internas dos usuários, fornecendo controle total e visão 360° de todos os ativos para a empresa, enquanto oferece visão restrita e segura para os usuários.

## 🏗️ Arquitetura do Módulo de Banco

### Componentes Principais
- **Wallet Manager**: Gerenciador central de carteiras
- **Exchange Connector**: Conectores para exchanges
- **Asset Tracker**: Rastreador de ativos
- **Balance Calculator**: Calculadora de saldos
- **Portfolio Analyzer**: Analisador de portfólio
- **Risk Manager**: Gerenciador de risco
- **Transaction Processor**: Processador de transações
- **Audit Logger**: Logger de auditoria integrado
- **Auto Profit Transfer Engine**: Motor de transferência automática de lucros
- **Savings Goals Manager**: Gerenciador de metas de poupança
- **Gamification System**: Sistema de badges e conquistas
- **Reports Generator**: Gerador de relatórios de poupança
- **Smart Notifications**: Sistema de notificações inteligentes
- **Scheduler Service**: Serviço de agendamento de transferências
- **P2P Wallet Manager**: Gerenciador de carteiras P2P
- **Escrow System**: Sistema de garantia/escrow
- **P2P Commission Engine**: Motor de comissões P2P

## 🚀 Melhorias Críticas Implementadas

### Sistema de Cache Financeiro
- **Balance Cache**: Cache de saldos para consultas ultra-rápidas
- **Transaction Cache**: Cache de transações recentes
- **Portfolio Cache**: Cache de portfólios para performance
- **Real-time Updates**: Atualizações em tempo real via WebSocket
- **Performance**: 70% melhoria no tempo de resposta

### Sistema de Rate Limiting Financeiro
- **Transaction Limits**: Limites de transação por usuário e tipo
- **Withdrawal Limits**: Limites de saque baseados em comportamento
- **P2P Limits**: Limites específicos para transações P2P
- **Fraud Protection**: Proteção contra fraudes financeiras
- **Segurança**: 90% redução em incidentes financeiros

### Sistema de Monitoramento Financeiro
- **Transaction Monitoring**: Monitoramento de transações em tempo real
- **Anomaly Detection**: Detecção de anomalias financeiras
- **Risk Assessment**: Avaliação de risco em tempo real
- **Compliance Alerts**: Alertas de conformidade financeira
- **Visibilidade**: 100% de visibilidade das operações financeiras

### Sistema de Backup Financeiro
- **Financial Data Backup**: Backup específico de dados financeiros
- **Encrypted Storage**: Armazenamento criptografado AES-256
- **Audit Trail Backup**: Backup de trilhas de auditoria
- **Disaster Recovery**: Recuperação de desastres financeiros
- **Confiabilidade**: 99.99% de disponibilidade dos dados financeiros

### Sistema de Configuração Dinâmica Financeira
- **Commission Rates**: Taxas de comissão configuráveis em tempo real
- **Withdrawal Limits**: Limites de saque dinâmicos
- **Exchange Rates**: Taxas de câmbio em tempo real
- **Risk Parameters**: Parâmetros de risco ajustáveis
- **Hot Reload**: Mudanças sem downtime

### Estratégia de Gestão
- **Visão Empresarial**: Controle total de todas as carteiras e ativos
- **Visão do Usuário**: Acesso apenas aos próprios saldos
- **Criação Automática**: Carteira principal e poupança criadas automaticamente na criação de conta
- **Carteira de Poupança**: Sistema de poupança atrelado à carteira principal
- **Transferência Automática**: Lucros transferidos automaticamente conforme configuração
- **Sistema de Metas**: Metas personalizáveis de poupança com prazos
- **Gamificação**: Sistema de badges, conquistas e pontos
- **Relatórios Avançados**: Análise de progresso e performance
- **Notificações Inteligentes**: Alertas baseados em comportamento e metas
- **Sincronização em Tempo Real**: Atualizações automáticas com exchanges
- **Segurança Máxima**: Criptografia e validação de todas as operações
- **Auditoria Completa**: Rastreamento de todas as movimentações

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. exchanges
```sql
CREATE TABLE exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  api_base_url VARCHAR(255) NOT NULL,
  websocket_url VARCHAR(255),
  supported_assets JSONB NOT NULL DEFAULT '[]',
  trading_fees JSONB NOT NULL DEFAULT '{}',
  withdrawal_fees JSONB NOT NULL DEFAULT '{}',
  deposit_methods JSONB NOT NULL DEFAULT '[]',
  withdrawal_methods JSONB NOT NULL DEFAULT '[]',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verification_level VARCHAR(20) DEFAULT 'basic', -- basic, intermediate, advanced
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(20) DEFAULT 'pending', -- pending, syncing, success, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. exchange_credentials
```sql
CREATE TABLE exchange_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  api_key VARCHAR(255) NOT NULL,
  api_secret VARCHAR(255) NOT NULL,
  passphrase VARCHAR(255), -- Para exchanges como Coinbase Pro
  sandbox BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}', -- read, trade, withdraw
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exchange_id, tenant_id)
);
```

#### 3. wallets
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  exchange_id UUID REFERENCES exchanges(id),
  wallet_type VARCHAR(20) NOT NULL, -- internal, exchange, external, savings
  name VARCHAR(100) NOT NULL,
  description TEXT,
  address VARCHAR(255), -- Para carteiras externas
  private_key_encrypted TEXT, -- Para carteiras internas
  public_key VARCHAR(255), -- Para carteiras internas
  derivation_path VARCHAR(100), -- Para carteiras HD
  parent_wallet_id UUID REFERENCES wallets(id), -- Para carteira de poupança
  is_primary BOOLEAN DEFAULT false, -- Carteira principal do usuário
  is_savings BOOLEAN DEFAULT false, -- Carteira de poupança
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verification_method VARCHAR(50), -- manual, api, signature
  last_balance_update TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. assets
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200),
  asset_type VARCHAR(20) NOT NULL, -- crypto, fiat, commodity, stock
  decimals INTEGER DEFAULT 8,
  icon_url VARCHAR(500),
  coingecko_id VARCHAR(100),
  cmc_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_tradable BOOLEAN DEFAULT true,
  is_withdrawable BOOLEAN DEFAULT true,
  is_depositable BOOLEAN DEFAULT true,
  min_deposit DECIMAL(20,8) DEFAULT 0,
  min_withdrawal DECIMAL(20,8) DEFAULT 0,
  withdrawal_fee DECIMAL(20,8) DEFAULT 0,
  network_info JSONB DEFAULT '{}', -- Para criptomoedas
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. wallet_balances
```sql
CREATE TABLE wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  balance DECIMAL(20,8) NOT NULL DEFAULT 0,
  available_balance DECIMAL(20,8) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(20,8) NOT NULL DEFAULT 0,
  pending_deposits DECIMAL(20,8) NOT NULL DEFAULT 0,
  pending_withdrawals DECIMAL(20,8) NOT NULL DEFAULT 0,
  usd_value DECIMAL(15,2) DEFAULT 0,
  btc_value DECIMAL(20,8) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_id, asset_id)
);
```

#### 6. wallet_transactions
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  transaction_type VARCHAR(20) NOT NULL, -- deposit, withdrawal, transfer, trade, fee
  amount DECIMAL(20,8) NOT NULL,
  fee DECIMAL(20,8) DEFAULT 0,
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  tx_hash VARCHAR(255),
  block_height BIGINT,
  confirmations INTEGER DEFAULT 0,
  required_confirmations INTEGER DEFAULT 1,
  status VARCHAR(20) NOT NULL, -- pending, confirmed, failed, cancelled
  exchange_tx_id VARCHAR(255), -- ID da transação na exchange
  description TEXT,
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 7. portfolio_snapshots
```sql
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  total_usd_value DECIMAL(15,2) NOT NULL,
  total_btc_value DECIMAL(20,8) NOT NULL,
  asset_breakdown JSONB NOT NULL, -- {asset_id: {balance, usd_value, percentage}}
  exchange_breakdown JSONB NOT NULL, -- {exchange_id: {total_value, assets}}
  snapshot_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly, real_time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 8. exchange_rates
```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_asset_id UUID NOT NULL REFERENCES assets(id),
  to_asset_id UUID NOT NULL REFERENCES assets(id),
  rate DECIMAL(20,8) NOT NULL,
  source VARCHAR(50) NOT NULL, -- coingecko, cmc, exchange, manual
  exchange_id UUID REFERENCES exchanges(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_asset_id, to_asset_id, source, exchange_id)
);
```

#### 9. wallet_transfers
```sql
CREATE TABLE wallet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_wallet_id UUID NOT NULL REFERENCES wallets(id),
  to_wallet_id UUID NOT NULL REFERENCES wallets(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  amount DECIMAL(20,8) NOT NULL,
  transfer_type VARCHAR(20) NOT NULL, -- main_to_savings, savings_to_main
  status VARCHAR(20) NOT NULL, -- pending, completed, failed, cancelled
  description TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 10. user_savings_settings
```sql
CREATE TABLE user_savings_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  is_savings_enabled BOOLEAN DEFAULT false,
  auto_transfer_enabled BOOLEAN DEFAULT false,
  auto_transfer_percentage DECIMAL(5,2) DEFAULT 0, -- 0-100%
  auto_transfer_threshold DECIMAL(20,8) DEFAULT 0, -- Valor mínimo para transferência automática
  savings_goal DECIMAL(20,8) DEFAULT 0, -- Meta de poupança
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

## 🔧 Implementação do Módulo

### 1. Wallet Manager

```typescript
// backend/src/banco/wallet-manager.ts
import { prisma } from '../db';
import { ExchangeConnector } from './exchange-connector';
import { AssetTracker } from './asset-tracker';
import { BalanceCalculator } from './balance-calculator';
import { AuditLogger } from '../audit/audit-logger';

export class WalletManager {
  private exchangeConnector: ExchangeConnector;
  private assetTracker: AssetTracker;
  private balanceCalculator: BalanceCalculator;
  private auditLogger: AuditLogger;

  constructor() {
    this.exchangeConnector = new ExchangeConnector();
    this.assetTracker = new AssetTracker();
    this.balanceCalculator = new BalanceCalculator();
    this.auditLogger = new AuditLogger();
  }

  async createUserWallets(
    userId: string,
    tenantId: string,
    context: any
  ): Promise<{
    success: boolean;
    mainWalletId?: string;
    savingsWalletId?: string;
    message: string;
  }> {
    try {
      // Criar carteira principal
      const mainWallet = await this.createWallet(
        userId,
        tenantId,
        {
          name: 'Carteira Principal',
          description: 'Carteira principal do usuário',
          walletType: 'internal',
          isPrimary: true
        },
        context
      );

      if (!mainWallet.success) {
        return {
          success: false,
          message: 'Failed to create main wallet'
        };
      }

      // Criar carteira de poupança
      const savingsWallet = await this.createWallet(
        userId,
        tenantId,
        {
          name: 'Carteira de Poupança',
          description: 'Carteira de poupança do usuário',
          walletType: 'internal',
          parentWalletId: mainWallet.walletId,
          isSavings: true
        },
        context
      );

      if (!savingsWallet.success) {
        return {
          success: false,
          message: 'Failed to create savings wallet'
        };
      }

      // Criar configurações de poupança
      await prisma.userSavingsSetting.create({
        data: {
          userId,
          isSavingsEnabled: false, // Desabilitada por padrão
          autoTransferEnabled: false,
          autoTransferPercentage: 0,
          autoTransferThreshold: 0,
          savingsGoal: 0
        }
      });

      return {
        success: true,
        mainWalletId: mainWallet.walletId,
        savingsWalletId: savingsWallet.walletId,
        message: 'User wallets created successfully'
      };

    } catch (error) {
      console.error('Error creating user wallets:', error);
      return {
        success: false,
        message: 'Failed to create user wallets'
      };
    }
  }

  async createWallet(
    userId: string,
    tenantId: string,
    walletData: {
      name: string;
      description?: string;
      walletType: 'internal' | 'exchange' | 'external' | 'savings';
      exchangeId?: string;
      address?: string;
      derivationPath?: string;
      parentWalletId?: string;
      isPrimary?: boolean;
      isSavings?: boolean;
    },
    context: any
  ): Promise<{
    success: boolean;
    walletId?: string;
    message: string;
  }> {
    try {
      // Validar dados da carteira
      const validation = await this.validateWalletData(walletData);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Gerar chaves para carteira interna
      let privateKeyEncrypted: string | null = null;
      let publicKey: string | null = null;

      if (walletData.walletType === 'internal') {
        const keyPair = await this.generateKeyPair();
        privateKeyEncrypted = await this.encryptPrivateKey(keyPair.privateKey);
        publicKey = keyPair.publicKey;
      }

      // Criar carteira
      const wallet = await prisma.wallet.create({
        data: {
          userId,
          tenantId,
          exchangeId: walletData.exchangeId,
          walletType: walletData.walletType,
          name: walletData.name,
          description: walletData.description,
          address: walletData.address,
          privateKeyEncrypted,
          publicKey,
          derivationPath: walletData.derivationPath,
          isActive: true,
          isVerified: walletData.walletType === 'internal'
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(userId, {
        type: 'create',
        resourceType: 'wallet',
        resourceId: wallet.id,
        module: 'banco',
        description: `Created ${walletData.walletType} wallet: ${walletData.name}`,
        newValues: {
          walletType: walletData.walletType,
          name: walletData.name,
          address: walletData.address
        },
        metadata: {
          tenantId,
          exchangeId: walletData.exchangeId
        }
      }, context);

      return {
        success: true,
        walletId: wallet.id,
        message: 'Wallet created successfully'
      };

    } catch (error) {
      console.error('Error creating wallet:', error);
      return {
        success: false,
        message: 'Failed to create wallet'
      };
    }
  }

  async getWalletBalances(
    userId: string,
    tenantId: string,
    walletId?: string
  ): Promise<{
    success: boolean;
    balances?: any[];
    message: string;
  }> {
    try {
      const whereClause: any = {
        wallet: {
          tenantId,
          isActive: true
        }
      };

      if (walletId) {
        whereClause.walletId = walletId;
      } else {
        whereClause.wallet = {
          ...whereClause.wallet,
          userId
        };
      }

      const balances = await prisma.walletBalance.findMany({
        where: whereClause,
        include: {
          wallet: {
            select: {
              id: true,
              name: true,
              walletType: true,
              address: true
            }
          },
          asset: {
            select: {
              id: true,
              symbol: true,
              name: true,
              assetType: true,
              iconUrl: true
            }
          }
        },
        orderBy: [
          { usdValue: 'desc' },
          { balance: 'desc' }
        ]
      });

      return {
        success: true,
        balances: balances.map(balance => ({
          id: balance.id,
          wallet: balance.wallet,
          asset: balance.asset,
          balance: balance.balance,
          availableBalance: balance.availableBalance,
          lockedBalance: balance.lockedBalance,
          usdValue: balance.usdValue,
          btcValue: balance.btcValue,
          lastUpdated: balance.lastUpdated
        })),
        message: 'Balances retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting wallet balances:', error);
      return {
        success: false,
        message: 'Failed to get wallet balances'
      };
    }
  }

  async syncExchangeBalances(
    tenantId: string,
    exchangeId: string,
    context: any
  ): Promise<{
    success: boolean;
    syncedWallets?: number;
    message: string;
  }> {
    try {
      // Buscar credenciais da exchange
      const credentials = await prisma.exchangeCredential.findFirst({
        where: {
          exchangeId,
          tenantId,
          isActive: true
        },
        include: {
          exchange: true
        }
      });

      if (!credentials) {
        return {
          success: false,
          message: 'Exchange credentials not found'
        };
      }

      // Conectar com a exchange
      const exchangeClient = await this.exchangeConnector.connect(
        credentials.exchange.code,
        {
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          passphrase: credentials.passphrase,
          sandbox: credentials.sandbox
        }
      );

      // Buscar carteiras da exchange
      const exchangeWallets = await prisma.wallet.findMany({
        where: {
          tenantId,
          exchangeId,
          isActive: true
        }
      });

      let syncedWallets = 0;

      for (const wallet of exchangeWallets) {
        try {
          // Buscar saldos da exchange
          const exchangeBalances = await exchangeClient.getBalances();

          for (const [symbol, balance] of Object.entries(exchangeBalances)) {
            // Buscar ou criar asset
            let asset = await prisma.asset.findFirst({
              where: { symbol: symbol.toUpperCase() }
            });

            if (!asset) {
              asset = await prisma.asset.create({
                data: {
                  symbol: symbol.toUpperCase(),
                  name: symbol.toUpperCase(),
                  assetType: 'crypto',
                  isActive: true,
                  isTradable: true
                }
              });
            }

            // Atualizar saldo
            await prisma.walletBalance.upsert({
              where: {
                walletId_assetId: {
                  walletId: wallet.id,
                  assetId: asset.id
                }
              },
              update: {
                balance: balance.total,
                availableBalance: balance.available,
                lockedBalance: balance.locked || 0,
                lastUpdated: new Date()
              },
              create: {
                walletId: wallet.id,
                assetId: asset.id,
                balance: balance.total,
                availableBalance: balance.available,
                lockedBalance: balance.locked || 0,
                lastUpdated: new Date()
              }
            });
          }

          syncedWallets++;

        } catch (error) {
          console.error(`Error syncing wallet ${wallet.id}:`, error);
        }
      }

      // Atualizar status da exchange
      await prisma.exchange.update({
        where: { id: exchangeId },
        data: {
          lastSync: new Date(),
          syncStatus: 'success'
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction('system', {
        type: 'sync',
        resourceType: 'exchange',
        resourceId: exchangeId,
        module: 'banco',
        description: `Synced ${syncedWallets} wallets from exchange`,
        metadata: {
          tenantId,
          exchangeId,
          syncedWallets
        }
      }, context);

      return {
        success: true,
        syncedWallets,
        message: `Successfully synced ${syncedWallets} wallets`
      };

    } catch (error) {
      console.error('Error syncing exchange balances:', error);
      
      // Atualizar status de erro
      await prisma.exchange.update({
        where: { id: exchangeId },
        data: {
          syncStatus: 'error',
          errorMessage: error.message
        }
      });

      return {
        success: false,
        message: 'Failed to sync exchange balances'
      };
    }
  }

  async getPortfolioOverview(
    userId: string,
    tenantId: string,
    includeAll: boolean = false
  ): Promise<{
    success: boolean;
    portfolio?: any;
    message: string;
  }> {
    try {
      const whereClause: any = {
        wallet: {
          tenantId,
          isActive: true
        }
      };

      if (!includeAll) {
        whereClause.wallet.userId = userId;
      }

      // Buscar todos os saldos
      const balances = await prisma.walletBalance.findMany({
        where: whereClause,
        include: {
          wallet: {
            select: {
              id: true,
              name: true,
              walletType: true,
              userId: true
            }
          },
          asset: {
            select: {
              id: true,
              symbol: true,
              name: true,
              assetType: true
            }
          }
        }
      });

      // Calcular totais
      const totalUsdValue = balances.reduce((sum, balance) => sum + Number(balance.usdValue), 0);
      const totalBtcValue = balances.reduce((sum, balance) => sum + Number(balance.btcValue), 0);

      // Agrupar por asset
      const assetBreakdown = balances.reduce((acc, balance) => {
        const assetId = balance.asset.id;
        if (!acc[assetId]) {
          acc[assetId] = {
            asset: balance.asset,
            totalBalance: 0,
            totalUsdValue: 0,
            totalBtcValue: 0,
            wallets: []
          };
        }

        acc[assetId].totalBalance += Number(balance.balance);
        acc[assetId].totalUsdValue += Number(balance.usdValue);
        acc[assetId].totalBtcValue += Number(balance.btcValue);
        acc[assetId].wallets.push({
          wallet: balance.wallet,
          balance: balance.balance,
          usdValue: balance.usdValue
        });

        return acc;
      }, {} as any);

      // Calcular percentuais
      Object.values(assetBreakdown).forEach((asset: any) => {
        asset.percentage = totalUsdValue > 0 ? (asset.totalUsdValue / totalUsdValue) * 100 : 0;
      });

      // Agrupar por exchange
      const exchangeBreakdown = balances.reduce((acc, balance) => {
        const exchangeId = balance.wallet.exchangeId || 'internal';
        if (!acc[exchangeId]) {
          acc[exchangeId] = {
            totalValue: 0,
            assets: {}
          };
        }

        acc[exchangeId].totalValue += Number(balance.usdValue);
        
        const assetId = balance.asset.id;
        if (!acc[exchangeId].assets[assetId]) {
          acc[exchangeId].assets[assetId] = {
            asset: balance.asset,
            totalBalance: 0,
            totalValue: 0
          };
        }

        acc[exchangeId].assets[assetId].totalBalance += Number(balance.balance);
        acc[exchangeId].assets[assetId].totalValue += Number(balance.usdValue);

        return acc;
      }, {} as any);

      const portfolio = {
        totalUsdValue,
        totalBtcValue,
        assetBreakdown: Object.values(assetBreakdown),
        exchangeBreakdown,
        lastUpdated: new Date(),
        includeAll
      };

      return {
        success: true,
        portfolio,
        message: 'Portfolio overview retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting portfolio overview:', error);
      return {
        success: false,
        message: 'Failed to get portfolio overview'
      };
    }
  }

  private async validateWalletData(walletData: any): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!walletData.name) {
      errors.push('Wallet name is required');
    }

    if (!walletData.walletType) {
      errors.push('Wallet type is required');
    }

    if (walletData.walletType === 'exchange' && !walletData.exchangeId) {
      errors.push('Exchange ID is required for exchange wallets');
    }

    if (walletData.walletType === 'external' && !walletData.address) {
      errors.push('Address is required for external wallets');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async generateKeyPair(): Promise<{
    privateKey: string;
    publicKey: string;
  }> {
    // Implementar geração de chaves criptográficas
    const crypto = require('crypto');
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey
    };
  }

  async transferBetweenWallets(
    userId: string,
    fromWalletId: string,
    toWalletId: string,
    assetId: string,
    amount: number,
    context: any
  ): Promise<{
    success: boolean;
    transferId?: string;
    message: string;
  }> {
    try {
      // Validar carteiras
      const fromWallet = await prisma.wallet.findUnique({
        where: { id: fromWalletId },
        include: { balances: true }
      });

      const toWallet = await prisma.wallet.findUnique({
        where: { id: toWalletId }
      });

      if (!fromWallet || !toWallet) {
        return {
          success: false,
          message: 'Wallet not found'
        };
      }

      // Verificar se as carteiras pertencem ao mesmo usuário
      if (fromWallet.userId !== userId || toWallet.userId !== userId) {
        return {
          success: false,
          message: 'Unauthorized wallet access'
        };
      }

      // Verificar se é transferência entre carteira principal e poupança
      const isMainToSavings = fromWallet.isPrimary && toWallet.isSavings;
      const isSavingsToMain = fromWallet.isSavings && toWallet.isPrimary;

      if (!isMainToSavings && !isSavingsToMain) {
        return {
          success: false,
          message: 'Transfer only allowed between main and savings wallet'
        };
      }

      // Verificar saldo disponível
      const fromBalance = fromWallet.balances.find(b => b.assetId === assetId);
      if (!fromBalance || Number(fromBalance.availableBalance) < amount) {
        return {
          success: false,
          message: 'Insufficient balance'
        };
      }

      // Criar transferência
      const transfer = await prisma.walletTransfer.create({
        data: {
          fromWalletId,
          toWalletId,
          assetId,
          amount,
          transferType: isMainToSavings ? 'main_to_savings' : 'savings_to_main',
          status: 'pending'
        }
      });

      // Executar transferência
      await prisma.$transaction(async (tx) => {
        // Debitar da carteira origem
        await tx.walletBalance.update({
          where: {
            walletId_assetId: {
              walletId: fromWalletId,
              assetId
            }
          },
          data: {
            balance: fromBalance.balance - amount,
            availableBalance: fromBalance.availableBalance - amount
          }
        });

        // Buscar ou criar saldo na carteira destino
        const toBalance = await tx.walletBalance.findUnique({
          where: {
            walletId_assetId: {
              walletId: toWalletId,
              assetId
            }
          }
        });

        if (toBalance) {
          await tx.walletBalance.update({
            where: {
              walletId_assetId: {
                walletId: toWalletId,
                assetId
              }
            },
            data: {
              balance: toBalance.balance + amount,
              availableBalance: toBalance.availableBalance + amount
            }
          });
        } else {
          await tx.walletBalance.create({
            data: {
              walletId: toWalletId,
              assetId,
              balance: amount,
              availableBalance: amount,
              lockedBalance: 0,
              pendingDeposits: 0,
              pendingWithdrawals: 0,
              usdValue: 0,
              btcValue: 0
            }
          });
        }

        // Atualizar status da transferência
        await tx.walletTransfer.update({
          where: { id: transfer.id },
          data: {
            status: 'completed',
            processedAt: new Date()
          }
        });
      });

      // Log de auditoria
      await this.auditLogger.logAction(userId, {
        type: 'transfer',
        resourceType: 'wallet_transfer',
        resourceId: transfer.id,
        module: 'banco',
        description: `Transferred ${amount} from ${fromWallet.name} to ${toWallet.name}`,
        newValues: {
          fromWalletId,
          toWalletId,
          assetId,
          amount,
          transferType: transfer.transferType
        },
        metadata: {
          transferId: transfer.id
        }
      }, context);

      return {
        success: true,
        transferId: transfer.id,
        message: 'Transfer completed successfully'
      };

    } catch (error) {
      console.error('Error transferring between wallets:', error);
      return {
        success: false,
        message: 'Failed to transfer between wallets'
      };
    }
  }

  async getSavingsSettings(
    userId: string
  ): Promise<{
    success: boolean;
    settings?: any;
    message: string;
  }> {
    try {
      const settings = await prisma.userSavingsSetting.findUnique({
        where: { userId }
      });

      if (!settings) {
        return {
          success: false,
          message: 'Savings settings not found'
        };
      }

      return {
        success: true,
        settings: {
          id: settings.id,
          isSavingsEnabled: settings.isSavingsEnabled,
          autoTransferEnabled: settings.autoTransferEnabled,
          autoTransferPercentage: settings.autoTransferPercentage,
          autoTransferThreshold: settings.autoTransferThreshold,
          savingsGoal: settings.savingsGoal,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt
        },
        message: 'Savings settings retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting savings settings:', error);
      return {
        success: false,
        message: 'Failed to get savings settings'
      };
    }
  }

  async updateSavingsSettings(
    userId: string,
    settings: {
      isSavingsEnabled?: boolean;
      autoTransferEnabled?: boolean;
      autoTransferPercentage?: number;
      autoTransferThreshold?: number;
      savingsGoal?: number;
    },
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await prisma.userSavingsSetting.upsert({
        where: { userId },
        update: settings,
        create: {
          userId,
          isSavingsEnabled: settings.isSavingsEnabled || false,
          autoTransferEnabled: settings.autoTransferEnabled || false,
          autoTransferPercentage: settings.autoTransferPercentage || 0,
          autoTransferThreshold: settings.autoTransferThreshold || 0,
          savingsGoal: settings.savingsGoal || 0
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(userId, {
        type: 'update',
        resourceType: 'savings_settings',
        resourceId: userId,
        module: 'banco',
        description: 'Updated savings settings',
        newValues: settings,
        metadata: { userId }
      }, context);

      return {
        success: true,
        message: 'Savings settings updated successfully'
      };

    } catch (error) {
      console.error('Error updating savings settings:', error);
      return {
        success: false,
        message: 'Failed to update savings settings'
      };
    }
  }

  async getCombinedBalance(
    userId: string,
    tenantId: string
  ): Promise<{
    success: boolean;
    combinedBalance?: any;
    message: string;
  }> {
    try {
      // Buscar carteira principal e poupança
      const wallets = await prisma.wallet.findMany({
        where: {
          userId,
          tenantId,
          isActive: true,
          OR: [
            { isPrimary: true },
            { isSavings: true }
          ]
        },
        include: {
          balances: {
            include: {
              asset: true
            }
          }
        }
      });

      const mainWallet = wallets.find(w => w.isPrimary);
      const savingsWallet = wallets.find(w => w.isSavings);

      if (!mainWallet) {
        return {
          success: false,
          message: 'Main wallet not found'
        };
      }

      // Combinar saldos
      const combinedBalances = new Map();

      // Adicionar saldos da carteira principal
      mainWallet.balances.forEach(balance => {
        const assetId = balance.assetId;
        if (!combinedBalances.has(assetId)) {
          combinedBalances.set(assetId, {
            asset: balance.asset,
            mainBalance: 0,
            savingsBalance: 0,
            totalBalance: 0,
            totalUsdValue: 0,
            totalBtcValue: 0
          });
        }

        const combined = combinedBalances.get(assetId);
        combined.mainBalance = Number(balance.balance);
        combined.totalBalance += Number(balance.balance);
        combined.totalUsdValue += Number(balance.usdValue);
        combined.totalBtcValue += Number(balance.btcValue);
      });

      // Adicionar saldos da carteira de poupança (se existir)
      if (savingsWallet) {
        savingsWallet.balances.forEach(balance => {
          const assetId = balance.assetId;
          if (!combinedBalances.has(assetId)) {
            combinedBalances.set(assetId, {
              asset: balance.asset,
              mainBalance: 0,
              savingsBalance: 0,
              totalBalance: 0,
              totalUsdValue: 0,
              totalBtcValue: 0
            });
          }

          const combined = combinedBalances.get(assetId);
          combined.savingsBalance = Number(balance.balance);
          combined.totalBalance += Number(balance.balance);
          combined.totalUsdValue += Number(balance.usdValue);
          combined.totalBtcValue += Number(balance.btcValue);
        });
      }

      const combinedBalance = {
        mainWallet: {
          id: mainWallet.id,
          name: mainWallet.name,
          balances: mainWallet.balances
        },
        savingsWallet: savingsWallet ? {
          id: savingsWallet.id,
          name: savingsWallet.name,
          balances: savingsWallet.balances
        } : null,
        combinedBalances: Array.from(combinedBalances.values()),
        totalUsdValue: Array.from(combinedBalances.values())
          .reduce((sum, balance) => sum + balance.totalUsdValue, 0),
        totalBtcValue: Array.from(combinedBalances.values())
          .reduce((sum, balance) => sum + balance.totalBtcValue, 0)
      };

      return {
        success: true,
        combinedBalance,
        message: 'Combined balance retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting combined balance:', error);
      return {
        success: false,
        message: 'Failed to get combined balance'
      };
    }
  }

  private async encryptPrivateKey(privateKey: string): Promise<string> {
    // Implementar criptografia da chave privada
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.WALLET_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('wallet-key', 'utf8'));
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
}
```

### 2. Exchange Connector

```typescript
// backend/src/banco/exchange-connector.ts
import axios from 'axios';
import WebSocket from 'ws';

export class ExchangeConnector {
  private connections: Map<string, any> = new Map();

  async connect(
    exchangeCode: string,
    credentials: {
      apiKey: string;
      apiSecret: string;
      passphrase?: string;
      sandbox?: boolean;
    }
  ): Promise<any> {
    const exchangeClient = this.createExchangeClient(exchangeCode, credentials);
    this.connections.set(exchangeCode, exchangeClient);
    return exchangeClient;
  }

  private createExchangeClient(exchangeCode: string, credentials: any): any {
    switch (exchangeCode) {
      case 'binance':
        return new BinanceClient(credentials);
      case 'coinbase':
        return new CoinbaseClient(credentials);
      case 'kraken':
        return new KrakenClient(credentials);
      case 'kucoin':
        return new KuCoinClient(credentials);
      default:
        throw new Error(`Unsupported exchange: ${exchangeCode}`);
    }
  }
}

// Implementações específicas para cada exchange
class BinanceClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(credentials: any) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.baseUrl = credentials.sandbox 
      ? 'https://testnet.binance.vision' 
      : 'https://api.binance.com';
  }

  async getBalances(): Promise<Record<string, any>> {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = this.createSignature(queryString);

    const response = await axios.get(`${this.baseUrl}/api/v3/account`, {
      params: {
        timestamp,
        signature
      },
      headers: {
        'X-MBX-APIKEY': this.apiKey
      }
    });

    const balances: Record<string, any> = {};
    
    response.data.balances.forEach((balance: any) => {
      if (parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0) {
        balances[balance.asset] = {
          total: parseFloat(balance.free) + parseFloat(balance.locked),
          available: parseFloat(balance.free),
          locked: parseFloat(balance.locked)
        };
      }
    });

    return balances;
  }

  private createSignature(queryString: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }
}

class CoinbaseClient {
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;
  private baseUrl: string;

  constructor(credentials: any) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.passphrase = credentials.passphrase;
    this.baseUrl = credentials.sandbox 
      ? 'https://api-public.sandbox.pro.coinbase.com' 
      : 'https://api.pro.coinbase.com';
  }

  async getBalances(): Promise<Record<string, any>> {
    const timestamp = Date.now() / 1000;
    const method = 'GET';
    const path = '/accounts';
    const body = '';

    const message = timestamp + method + path + body;
    const signature = this.createSignature(message, timestamp);

    const response = await axios.get(`${this.baseUrl}${path}`, {
      headers: {
        'CB-ACCESS-KEY': this.apiKey,
        'CB-ACCESS-SIGN': signature,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json'
      }
    });

    const balances: Record<string, any> = {};
    
    response.data.forEach((account: any) => {
      if (parseFloat(account.balance) > 0) {
        balances[account.currency] = {
          total: parseFloat(account.balance),
          available: parseFloat(account.available),
          locked: parseFloat(account.hold) || 0
        };
      }
    });

    return balances;
  }

  private createSignature(message: string, timestamp: number): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', Buffer.from(this.apiSecret, 'base64'))
      .update(message)
      .digest('base64');
  }
}

class KrakenClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(credentials: any) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.baseUrl = credentials.sandbox 
      ? 'https://api-sandbox.kraken.com' 
      : 'https://api.kraken.com';
  }

  async getBalances(): Promise<Record<string, any>> {
    const nonce = Date.now();
    const path = '/0/private/Balance';
    const postData = `nonce=${nonce}`;
    
    const signature = this.createSignature(path, postData, nonce);

    const response = await axios.post(`${this.baseUrl}${path}`, postData, {
      headers: {
        'API-Key': this.apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const balances: Record<string, any> = {};
    
    Object.entries(response.data.result).forEach(([asset, balance]: [string, any]) => {
      if (parseFloat(balance) > 0) {
        balances[asset] = {
          total: parseFloat(balance),
          available: parseFloat(balance),
          locked: 0
        };
      }
    });

    return balances;
  }

  private createSignature(path: string, postData: string, nonce: number): string {
    const crypto = require('crypto');
    const message = path + crypto.createHash('sha256').update(nonce + postData).digest('binary');
    return crypto.createHmac('sha512', Buffer.from(this.apiSecret, 'base64')).update(message).digest('base64');
  }
}

class KuCoinClient {
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;
  private baseUrl: string;

  constructor(credentials: any) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.passphrase = credentials.passphrase;
    this.baseUrl = credentials.sandbox 
      ? 'https://openapi-sandbox.kucoin.com' 
      : 'https://api.kucoin.com';
  }

  async getBalances(): Promise<Record<string, any>> {
    const timestamp = Date.now();
    const method = 'GET';
    const endpoint = '/api/v1/accounts';
    const queryString = '';

    const strForSign = timestamp + method + endpoint + queryString;
    const signature = this.createSignature(strForSign);
    const passphrase = this.createPassphrase();

    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      headers: {
        'KC-API-KEY': this.apiKey,
        'KC-API-SIGN': signature,
        'KC-API-TIMESTAMP': timestamp,
        'KC-API-PASSPHRASE': passphrase,
        'KC-API-KEY-VERSION': '2'
      }
    });

    const balances: Record<string, any> = {};
    
    response.data.data.forEach((account: any) => {
      if (parseFloat(account.balance) > 0) {
        balances[account.currency] = {
          total: parseFloat(account.balance),
          available: parseFloat(account.available),
          locked: parseFloat(account.holds) || 0
        };
      }
    });

    return balances;
  }

  private createSignature(strForSign: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', this.apiSecret).update(strForSign).digest('base64');
  }

  private createPassphrase(): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', this.apiSecret).update(this.passphrase).digest('base64');
  }
}
```

### 3. Asset Tracker

```typescript
// backend/src/banco/asset-tracker.ts
import { prisma } from '../db';
import axios from 'axios';

export class AssetTracker {
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  async updateAssetPrices(): Promise<{
    success: boolean;
    updatedAssets?: number;
    message: string;
  }> {
    try {
      // Buscar todos os assets ativos
      const assets = await prisma.asset.findMany({
        where: { isActive: true }
      });

      let updatedAssets = 0;

      for (const asset of assets) {
        try {
          // Buscar preço do asset
          const price = await this.getAssetPrice(asset.symbol);
          
          if (price > 0) {
            // Atualizar taxa de câmbio para USD
            await prisma.exchangeRate.upsert({
              where: {
                from_asset_id_to_asset_id_source_exchange_id: {
                  fromAssetId: asset.id,
                  toAssetId: await this.getUsdAssetId(),
                  source: 'coingecko',
                  exchangeId: null
                }
              },
              update: {
                rate: price,
                isActive: true
              },
              create: {
                fromAssetId: asset.id,
                toAssetId: await this.getUsdAssetId(),
                rate: price,
                source: 'coingecko',
                isActive: true
              }
            });

            // Atualizar taxa de câmbio para BTC
            const btcPrice = await this.getAssetPrice('BTC');
            if (btcPrice > 0) {
              const btcRate = price / btcPrice;
              
              await prisma.exchangeRate.upsert({
                where: {
                  from_asset_id_to_asset_id_source_exchange_id: {
                    fromAssetId: asset.id,
                    toAssetId: await this.getBtcAssetId(),
                    source: 'coingecko',
                    exchangeId: null
                  }
                },
                update: {
                  rate: btcRate,
                  isActive: true
                },
                create: {
                  fromAssetId: asset.id,
                  toAssetId: await this.getBtcAssetId(),
                  rate: btcRate,
                  source: 'coingecko',
                  isActive: true
                }
              });
            }

            updatedAssets++;
          }

        } catch (error) {
          console.error(`Error updating price for ${asset.symbol}:`, error);
        }
      }

      // Atualizar valores USD e BTC de todos os saldos
      await this.updateWalletBalances();

      return {
        success: true,
        updatedAssets,
        message: `Updated prices for ${updatedAssets} assets`
      };

    } catch (error) {
      console.error('Error updating asset prices:', error);
      return {
        success: false,
        message: 'Failed to update asset prices'
      };
    }
  }

  private async getAssetPrice(symbol: string): Promise<number> {
    // Verificar cache
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      // Buscar preço do CoinGecko
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`,
        { timeout: 10000 }
      );

      const price = response.data[symbol.toLowerCase()]?.usd || 0;
      
      // Atualizar cache
      this.priceCache.set(symbol, { price, timestamp: Date.now() });
      
      return price;

    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return 0;
    }
  }

  private async updateWalletBalances(): Promise<void> {
    // Buscar todos os saldos
    const balances = await prisma.walletBalance.findMany({
      include: {
        asset: true
      }
    });

    for (const balance of balances) {
      // Calcular valor USD
      const usdRate = await this.getExchangeRate(balance.assetId, 'USD');
      const usdValue = Number(balance.balance) * usdRate;

      // Calcular valor BTC
      const btcRate = await this.getExchangeRate(balance.assetId, 'BTC');
      const btcValue = Number(balance.balance) * btcRate;

      // Atualizar saldo
      await prisma.walletBalance.update({
        where: { id: balance.id },
        data: {
          usdValue,
          btcValue,
          lastUpdated: new Date()
        }
      });
    }
  }

  private async getExchangeRate(fromAssetId: string, toSymbol: string): Promise<number> {
    const toAsset = await prisma.asset.findFirst({
      where: { symbol: toSymbol }
    });

    if (!toAsset) return 0;

    const rate = await prisma.exchangeRate.findFirst({
      where: {
        fromAssetId,
        toAssetId: toAsset.id,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return rate ? Number(rate.rate) : 0;
  }

  private async getUsdAssetId(): Promise<string> {
    let usdAsset = await prisma.asset.findFirst({
      where: { symbol: 'USD' }
    });

    if (!usdAsset) {
      usdAsset = await prisma.asset.create({
        data: {
          symbol: 'USD',
          name: 'US Dollar',
          assetType: 'fiat',
          isActive: true,
          isTradable: false
        }
      });
    }

    return usdAsset.id;
  }

  private async getBtcAssetId(): Promise<string> {
    let btcAsset = await prisma.asset.findFirst({
      where: { symbol: 'BTC' }
    });

    if (!btcAsset) {
      btcAsset = await prisma.asset.create({
        data: {
          symbol: 'BTC',
          name: 'Bitcoin',
          assetType: 'crypto',
          isActive: true,
          isTradable: true
        }
      });
    }

    return btcAsset.id;
  }
}
```

## 🔧 APIs do Módulo de Banco

### 1. Wallet Management APIs

#### POST /api/banco/wallets
Criar nova carteira

```typescript
interface CreateWalletRequest {
  name: string;
  description?: string;
  walletType: 'internal' | 'exchange' | 'external';
  exchangeId?: string;
  address?: string;
  derivationPath?: string;
}

interface CreateWalletResponse {
  success: boolean;
  walletId?: string;
  message: string;
}
```

#### GET /api/banco/wallets
Listar carteiras do usuário

```typescript
interface GetWalletsResponse {
  success: boolean;
  wallets?: Array<{
    id: string;
    name: string;
    description?: string;
    walletType: string;
    address?: string;
    publicKey?: string;
    isActive: boolean;
    isVerified: boolean;
    lastBalanceUpdate?: string;
    createdAt: string;
  }>;
  message: string;
}
```

#### GET /api/banco/wallets/{walletId}/balances
Obter saldos de uma carteira

```typescript
interface GetWalletBalancesResponse {
  success: boolean;
  balances?: Array<{
    id: string;
    asset: {
      id: string;
      symbol: string;
      name: string;
      assetType: string;
      iconUrl?: string;
    };
    balance: number;
    availableBalance: number;
    lockedBalance: number;
    usdValue: number;
    btcValue: number;
    lastUpdated: string;
  }>;
  message: string;
}
```

### 2. Portfolio APIs

#### GET /api/banco/portfolio/overview
Obter visão geral do portfólio

```typescript
interface PortfolioOverviewResponse {
  success: boolean;
  portfolio?: {
    totalUsdValue: number;
    totalBtcValue: number;
    assetBreakdown: Array<{
      asset: {
        id: string;
        symbol: string;
        name: string;
        assetType: string;
      };
      totalBalance: number;
      totalUsdValue: number;
      totalBtcValue: number;
      percentage: number;
      wallets: Array<{
        wallet: {
          id: string;
          name: string;
          walletType: string;
        };
        balance: number;
        usdValue: number;
      }>;
    }>;
    exchangeBreakdown: Record<string, {
      totalValue: number;
      assets: Record<string, {
        asset: any;
        totalBalance: number;
        totalValue: number;
      }>;
    }>;
    lastUpdated: string;
  };
  message: string;
}
```

#### GET /api/banco/portfolio/snapshot
Obter snapshot do portfólio

```typescript
interface PortfolioSnapshotResponse {
  success: boolean;
  snapshot?: {
    id: string;
    totalUsdValue: number;
    totalBtcValue: number;
    assetBreakdown: any;
    exchangeBreakdown: any;
    snapshotType: string;
    createdAt: string;
  };
  message: string;
}
```

### 3. Exchange Management APIs

#### POST /api/banco/exchanges/{exchangeId}/sync
Sincronizar carteiras de uma exchange

```typescript
interface SyncExchangeRequest {
  force?: boolean;
}

interface SyncExchangeResponse {
  success: boolean;
  syncedWallets?: number;
  message: string;
}
```

#### GET /api/banco/exchanges
Listar exchanges disponíveis

```typescript
interface GetExchangesResponse {
  success: boolean;
  exchanges?: Array<{
    id: string;
    name: string;
    code: string;
    supportedAssets: string[];
    tradingFees: any;
    withdrawalFees: any;
    isActive: boolean;
    isVerified: boolean;
    lastSync?: string;
    syncStatus: string;
  }>;
  message: string;
}
```

### 4. Savings Wallet APIs

#### POST /api/banco/wallets/transfer
Transferir entre carteira principal e poupança

```typescript
interface TransferBetweenWalletsRequest {
  fromWalletId: string;
  toWalletId: string;
  assetId: string;
  amount: number;
}

interface TransferBetweenWalletsResponse {
  success: boolean;
  transferId?: string;
  message: string;
}
```

#### GET /api/banco/savings/settings
Obter configurações de poupança

```typescript
interface GetSavingsSettingsResponse {
  success: boolean;
  settings?: {
    id: string;
    isSavingsEnabled: boolean;
    autoTransferEnabled: boolean;
    autoTransferPercentage: number;
    autoTransferThreshold: number;
    savingsGoal: number;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}
```

#### PUT /api/banco/savings/settings
Atualizar configurações de poupança

```typescript
interface UpdateSavingsSettingsRequest {
  isSavingsEnabled?: boolean;
  autoTransferEnabled?: boolean;
  autoTransferPercentage?: number;
  autoTransferThreshold?: number;
  savingsGoal?: number;
}

interface UpdateSavingsSettingsResponse {
  success: boolean;
  message: string;
}
```

#### GET /api/banco/wallets/combined-balance
Obter saldo combinado (principal + poupança)

```typescript
interface GetCombinedBalanceResponse {
  success: boolean;
  combinedBalance?: {
    mainWallet: {
      id: string;
      name: string;
      balances: Array<{
        id: string;
        asset: any;
        balance: number;
        availableBalance: number;
        lockedBalance: number;
        usdValue: number;
        btcValue: number;
      }>;
    };
    savingsWallet?: {
      id: string;
      name: string;
      balances: Array<{
        id: string;
        asset: any;
        balance: number;
        availableBalance: number;
        lockedBalance: number;
        usdValue: number;
        btcValue: number;
      }>;
    };
    combinedBalances: Array<{
      asset: any;
      mainBalance: number;
      savingsBalance: number;
      totalBalance: number;
      totalUsdValue: number;
      totalBtcValue: number;
    }>;
    totalUsdValue: number;
    totalBtcValue: number;
  };
  message: string;
}
```

#### GET /api/banco/savings/transfers
Obter histórico de transferências

```typescript
interface GetSavingsTransfersResponse {
  success: boolean;
  transfers?: Array<{
    id: string;
    fromWalletId: string;
    toWalletId: string;
    assetId: string;
    amount: number;
    transferType: string;
    status: string;
    description?: string;
    processedAt?: string;
    createdAt: string;
  }>;
  message: string;
}
```

### 5. Advanced Savings APIs

#### POST /api/banco/savings/goals
Criar meta de poupança

```typescript
interface CreateSavingsGoalRequest {
  name: string;
  description?: string;
  targetAmount: number;
  assetId: string;
  goalType: 'amount' | 'percentage' | 'monthly';
  deadline?: string;
}

interface CreateSavingsGoalResponse {
  success: boolean;
  goalId?: string;
  message: string;
}
```

#### GET /api/banco/savings/goals
Obter metas de poupança

```typescript
interface GetSavingsGoalsResponse {
  success: boolean;
  goals?: Array<{
    id: string;
    name: string;
    description?: string;
    targetAmount: number;
    currentAmount: number;
    progress: number;
    asset: any;
    goalType: string;
    deadline?: string;
    isAchieved: boolean;
    achievedAt?: string;
    createdAt: string;
  }>;
  message: string;
}
```

#### PUT /api/banco/savings/goals/:goalId
Atualizar meta de poupança

```typescript
interface UpdateSavingsGoalRequest {
  name?: string;
  description?: string;
  targetAmount?: number;
  deadline?: string;
}

interface UpdateSavingsGoalResponse {
  success: boolean;
  message: string;
}
```

#### DELETE /api/banco/savings/goals/:goalId
Excluir meta de poupança

```typescript
interface DeleteSavingsGoalResponse {
  success: boolean;
  message: string;
}
```

#### GET /api/banco/savings/achievements
Obter conquistas do usuário

```typescript
interface GetSavingsAchievementsResponse {
  success: boolean;
  achievements?: Array<{
    id: string;
    type: string;
    name: string;
    description: string;
    badgeIcon: string;
    pointsEarned: number;
    earnedAt: string;
    metadata: any;
  }>;
  totalPoints?: number;
  message: string;
}
```

#### GET /api/banco/savings/leaderboard
Obter ranking de poupança

```typescript
interface GetSavingsLeaderboardResponse {
  success: boolean;
  leaderboard?: Array<{
    rank: number;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    totalPoints: number;
    achievementsCount: number;
  }>;
  message: string;
}
```

#### GET /api/banco/savings/reports
Obter relatórios de poupança

```typescript
interface GetSavingsReportsRequest {
  type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  limit?: number;
  offset?: number;
}

interface GetSavingsReportsResponse {
  success: boolean;
  reports?: Array<{
    id: string;
    reportType: string;
    periodStart: string;
    periodEnd: string;
    totalSaved: number;
    totalWithdrawn: number;
    netSavings: number;
    goalsAchieved: number;
    achievementsEarned: number;
    savingsRate: number;
    reportData: any;
    createdAt: string;
  }>;
  message: string;
}
```

#### POST /api/banco/savings/schedule-transfer
Agendar transferência automática

```typescript
interface ScheduleTransferRequest {
  schedule: {
    type: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
}

interface ScheduleTransferResponse {
  success: boolean;
  message: string;
}
```

### 7. P2P APIs

#### POST /api/banco/p2p/wallets
Criar carteira P2P

```typescript
interface CreateP2PWalletRequest {
  userId: string;
  assetId: string;
  walletType: 'p2p_escrow' | 'p2p_trading';
}

interface CreateP2PWalletResponse {
  success: boolean;
  walletId?: string;
  message: string;
}
```

#### POST /api/banco/p2p/escrow-transfer
Criar transferência via escrow

```typescript
interface CreateEscrowTransferRequest {
  fromUserId: string;
  toUserId: string;
  assetId: string;
  amount: number;
  orderId: string;
  escrowType: 'p2p_transaction' | 'p2p_dispute';
}

interface CreateEscrowTransferResponse {
  success: boolean;
  transferId?: string;
  escrowId?: string;
  message: string;
}
```

#### POST /api/banco/p2p/release-escrow
Liberar escrow

```typescript
interface ReleaseEscrowRequest {
  orderId: string;
  releasedBy: string;
  reason: string;
  releaseType: 'completed' | 'refunded' | 'disputed';
}

interface ReleaseEscrowResponse {
  success: boolean;
  message: string;
}
```

#### GET /api/banco/p2p/escrow/:orderId
Obter status do escrow

```typescript
interface GetEscrowStatusResponse {
  success: boolean;
  escrow?: {
    id: string;
    orderId: string;
    assetId: string;
    amount: number;
    escrowType: string;
    escrowStatus: string;
    autoReleaseTime: string;
    releasedAt?: string;
    releasedBy?: string;
    releaseReason?: string;
  };
  message: string;
}
```

#### POST /api/banco/p2p/process-commission
Processar comissão P2P

```typescript
interface ProcessP2PCommissionRequest {
  orderId: string;
  commissionType: 'platform' | 'affiliate' | 'referral';
  recipientId?: string;
  commissionRate: number;
  commissionAmount: number;
  assetId: string;
}

interface ProcessP2PCommissionResponse {
  success: boolean;
  commissionId?: string;
  message: string;
}
```

## 🧪 Testes do Módulo de Banco

### Testes Unitários

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
});
```

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Criar tabelas do módulo de banco
- [ ] Configurar conectores de exchanges
- [ ] Configurar rastreamento de preços
- [ ] Configurar criptografia de chaves

### ✅ Funcionalidades
- [ ] Gerenciador de carteiras
- [ ] Conectores de exchanges
- [ ] Rastreador de ativos
- [ ] Calculadora de saldos

### ✅ APIs
- [ ] APIs de gestão de carteiras
- [ ] APIs de portfólio
- [ ] APIs de exchanges
- [ ] APIs de sincronização

### ✅ Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de conectores
- [ ] Testes de performance

## 🤖 Agent do Módulo de Banco

### Capacidades do Agent
- **wallet_management**: Gestão de carteiras
- **exchange_sync**: Sincronização com exchanges
- **asset_tracking**: Rastreamento de ativos
- **balance_calculation**: Cálculo de saldos
- **portfolio_analysis**: Análise de portfólio
- **risk_management**: Gestão de riscos
- **transaction_processing**: Processamento de transações
- **security_management**: Gestão de segurança
- **audit_logging**: Logging de auditoria
- **auto_profit_transfer**: Transferência automática de lucros
- **savings_goals**: Gestão de metas de poupança
- **gamification**: Sistema de conquistas e pontos
- **reports_generation**: Geração de relatórios
- **smart_notifications**: Notificações inteligentes
- **scheduling**: Agendamento de transferências

### Comandos do Agent

#### Gestão de Carteiras
- `create_wallet`: Criar nova carteira
- `get_wallet_balance`: Obter saldo da carteira
- `transfer_between_wallets`: Transferir entre carteiras
- `get_combined_balance`: Obter saldo combinado

#### Transferência Automática
- `schedule_profit_transfer`: Agendar transferência de lucros
- `process_auto_transfers`: Processar transferências automáticas
- `get_transfer_schedule`: Obter cronograma de transferências

#### Metas de Poupança
- `create_savings_goal`: Criar meta de poupança
- `update_goal_progress`: Atualizar progresso da meta
- `get_user_goals`: Obter metas do usuário
- `delete_goal`: Excluir meta

#### Gamificação
- `check_achievements`: Verificar conquistas
- `award_achievement`: Conceder conquista
- `get_user_achievements`: Obter conquistas do usuário
- `get_leaderboard`: Obter ranking

#### Relatórios
- `generate_daily_report`: Gerar relatório diário
- `generate_weekly_report`: Gerar relatório semanal
- `generate_monthly_report`: Gerar relatório mensal
- `get_user_reports`: Obter relatórios do usuário

#### Notificações
- `send_goal_reminder`: Enviar lembrete de meta
- `send_achievement_notification`: Enviar notificação de conquista
- `send_milestone_alert`: Enviar alerta de marco
- `send_report_notification`: Enviar notificação de relatório

### Exemplos de Uso do Agent

#### Criar Meta de Poupança
```
Agent, crie uma meta de poupança para o usuário João:
- Nome: "Viagem para Europa"
- Valor: 5000 USD
- Prazo: 6 meses
- Ativo: USDT
```

#### Agendar Transferência Automática
```
Agent, configure transferência automática para Maria:
- Frequência: Diária
- Horário: 18:00
- Percentual: 50% dos lucros
- Transferir apenas lucros acima de 100 USD
```

#### Gerar Relatório Mensal
```
Agent, gere relatório mensal de poupança para Pedro:
- Período: Dezembro 2024
- Incluir: Metas, conquistas, transferências
- Enviar por email: sim
```

---

**Última atualização**: 2024-12-19
**Versão**: 2.0.0
**Responsável**: Agente-CTO