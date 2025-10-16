# Sistema de Carteira de Poupança - BotCriptoFy2

## 💰 Visão Geral

Sistema de carteira de poupança que é criada automaticamente junto com a carteira principal quando o usuário cria uma conta na plataforma. A carteira de poupança é atrelada à carteira principal e seus saldos são somados para exibição, mas não são utilizados nas operações de trading.

## 🏗️ Arquitetura do Sistema

### Componentes Principais
- **Auto Wallet Creator**: Criador automático de carteiras na criação de conta
- **Savings Wallet Manager**: Gerenciador de carteira de poupança
- **Transfer System**: Sistema de transferência entre carteiras
- **Savings Settings**: Configurações de poupança do usuário
- **Combined Balance Calculator**: Calculadora de saldo combinado

### Estratégia de Funcionamento
- **Criação Automática**: Carteira principal e poupança criadas automaticamente
- **Soma de Saldos**: Saldos da poupança somados à carteira principal para exibição
- **Transferências Manuais**: Usuário deve transferir saldos entre carteiras
- **Configuração no Perfil**: Usuário pode habilitar/desabilitar no perfil
- **Isolamento de Operações**: Carteira de poupança não é usada em operações de trading

## 📊 Estrutura de Dados

### Tabelas Específicas para Poupança

#### 1. wallet_transfers
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

#### 2. user_savings_settings
```sql
CREATE TABLE user_savings_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  is_savings_enabled BOOLEAN DEFAULT false,
  auto_transfer_enabled BOOLEAN DEFAULT false,
  auto_transfer_percentage DECIMAL(5,2) DEFAULT 0, -- 0-100%
  auto_transfer_threshold DECIMAL(20,8) DEFAULT 0, -- Valor mínimo para transferência automática
  auto_transfer_profits BOOLEAN DEFAULT false, -- Transferir lucros automaticamente
  auto_transfer_schedule VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly, custom
  auto_transfer_time TIME DEFAULT '23:59:59', -- Horário da transferência
  auto_transfer_day_of_week INTEGER DEFAULT 0, -- 0-6 (domingo=0) para weekly
  auto_transfer_day_of_month INTEGER DEFAULT 31, -- 1-31 para monthly
  savings_goal DECIMAL(20,8) DEFAULT 0, -- Meta de poupança
  goal_deadline DATE, -- Prazo para atingir a meta
  notifications_enabled BOOLEAN DEFAULT true, -- Notificações de metas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### 3. savings_goals
```sql
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_amount DECIMAL(20,8) NOT NULL,
  current_amount DECIMAL(20,8) DEFAULT 0,
  asset_id UUID NOT NULL REFERENCES assets(id),
  goal_type VARCHAR(20) NOT NULL, -- amount, percentage, monthly
  deadline DATE,
  is_achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. savings_achievements
```sql
CREATE TABLE savings_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  achievement_type VARCHAR(50) NOT NULL, -- first_savings, goal_achieved, streak, milestone
  achievement_name VARCHAR(100) NOT NULL,
  description TEXT,
  badge_icon VARCHAR(100),
  points_earned INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_type, achievement_name)
);
```

#### 5. savings_reports
```sql
CREATE TABLE savings_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  report_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_saved DECIMAL(20,8) NOT NULL,
  total_transferred DECIMAL(20,8) NOT NULL,
  total_withdrawn DECIMAL(20,8) NOT NULL,
  net_savings DECIMAL(20,8) NOT NULL,
  goals_achieved INTEGER DEFAULT 0,
  achievements_earned INTEGER DEFAULT 0,
  savings_rate DECIMAL(5,2) DEFAULT 0, -- Percentual poupado
  report_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. savings_notifications
```sql
CREATE TABLE savings_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(50) NOT NULL, -- goal_reminder, achievement, milestone, report
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Atualizações na Tabela wallets
```sql
-- Adicionar campos para carteira de poupança
ALTER TABLE wallets ADD COLUMN parent_wallet_id UUID REFERENCES wallets(id);
ALTER TABLE wallets ADD COLUMN is_primary BOOLEAN DEFAULT false;
ALTER TABLE wallets ADD COLUMN is_savings BOOLEAN DEFAULT false;
```

## 🔧 Implementação do Sistema

### 1. Auto Wallet Creator

```typescript
// backend/src/banco/auto-wallet-creator.ts
import { prisma } from '../db';
import { WalletManager } from './wallet-manager';
import { AuditLogger } from '../audit/audit-logger';

export class AutoWalletCreator {
  private walletManager: WalletManager;
  private auditLogger: AuditLogger;

  constructor() {
    this.walletManager = new WalletManager();
    this.auditLogger = new AuditLogger();
  }

  async createUserWalletsOnRegistration(
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
      const mainWallet = await this.createMainWallet(userId, tenantId, context);
      if (!mainWallet.success) {
        return {
          success: false,
          message: 'Failed to create main wallet'
        };
      }

      // Criar carteira de poupança
      const savingsWallet = await this.createSavingsWallet(
        userId,
        tenantId,
        mainWallet.walletId!,
        context
      );

      if (!savingsWallet.success) {
        return {
          success: false,
          message: 'Failed to create savings wallet'
        };
      }

      // Criar configurações de poupança
      await this.createSavingsSettings(userId);

      // Log de auditoria
      await this.auditLogger.logAction(userId, {
        type: 'create',
        resourceType: 'user_wallets',
        resourceId: userId,
        module: 'banco',
        description: 'Created main and savings wallets for new user',
        newValues: {
          mainWalletId: mainWallet.walletId,
          savingsWalletId: savingsWallet.walletId
        },
        metadata: {
          tenantId,
          autoCreated: true
        }
      }, context);

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

  private async createMainWallet(
    userId: string,
    tenantId: string,
    context: any
  ): Promise<{
    success: boolean;
    walletId?: string;
    message: string;
  }> {
    return await this.walletManager.createWallet(
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
  }

  private async createSavingsWallet(
    userId: string,
    tenantId: string,
    parentWalletId: string,
    context: any
  ): Promise<{
    success: boolean;
    walletId?: string;
    message: string;
  }> {
    return await this.walletManager.createWallet(
      userId,
      tenantId,
      {
        name: 'Carteira de Poupança',
        description: 'Carteira de poupança do usuário',
        walletType: 'internal',
        parentWalletId,
        isSavings: true
      },
      context
    );
  }

  private async createSavingsSettings(userId: string): Promise<void> {
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
  }
}
```

### 2. Savings Wallet Manager

```typescript
// backend/src/banco/savings-wallet-manager.ts
import { prisma } from '../db';
import { AuditLogger } from '../audit/audit-logger';

export class SavingsWalletManager {
  private auditLogger: AuditLogger;

  constructor() {
    this.auditLogger = new AuditLogger();
  }

  async transferToSavings(
    userId: string,
    assetId: string,
    amount: number,
    context: any
  ): Promise<{
    success: boolean;
    transferId?: string;
    message: string;
  }> {
    try {
      // Buscar carteira principal e poupança do usuário
      const wallets = await prisma.wallet.findMany({
        where: {
          userId,
          isActive: true,
          OR: [
            { isPrimary: true },
            { isSavings: true }
          ]
        }
      });

      const mainWallet = wallets.find(w => w.isPrimary);
      const savingsWallet = wallets.find(w => w.isSavings);

      if (!mainWallet || !savingsWallet) {
        return {
          success: false,
          message: 'Main or savings wallet not found'
        };
      }

      // Verificar se poupança está habilitada
      const savingsSettings = await prisma.userSavingsSetting.findUnique({
        where: { userId }
      });

      if (!savingsSettings?.isSavingsEnabled) {
        return {
          success: false,
          message: 'Savings wallet is not enabled'
        };
      }

      // Verificar saldo disponível na carteira principal
      const mainBalance = await prisma.walletBalance.findUnique({
        where: {
          walletId_assetId: {
            walletId: mainWallet.id,
            assetId
          }
        }
      });

      if (!mainBalance || Number(mainBalance.availableBalance) < amount) {
        return {
          success: false,
          message: 'Insufficient balance in main wallet'
        };
      }

      // Executar transferência
      const transfer = await this.executeTransfer(
        mainWallet.id,
        savingsWallet.id,
        assetId,
        amount,
        'main_to_savings',
        context
      );

      return {
        success: true,
        transferId: transfer.id,
        message: 'Transfer to savings completed successfully'
      };

    } catch (error) {
      console.error('Error transferring to savings:', error);
      return {
        success: false,
        message: 'Failed to transfer to savings'
      };
    }
  }

  async transferToMain(
    userId: string,
    assetId: string,
    amount: number,
    context: any
  ): Promise<{
    success: boolean;
    transferId?: string;
    message: string;
  }> {
    try {
      // Buscar carteira principal e poupança do usuário
      const wallets = await prisma.wallet.findMany({
        where: {
          userId,
          isActive: true,
          OR: [
            { isPrimary: true },
            { isSavings: true }
          ]
        }
      });

      const mainWallet = wallets.find(w => w.isPrimary);
      const savingsWallet = wallets.find(w => w.isSavings);

      if (!mainWallet || !savingsWallet) {
        return {
          success: false,
          message: 'Main or savings wallet not found'
        };
      }

      // Verificar saldo disponível na carteira de poupança
      const savingsBalance = await prisma.walletBalance.findUnique({
        where: {
          walletId_assetId: {
            walletId: savingsWallet.id,
            assetId
          }
        }
      });

      if (!savingsBalance || Number(savingsBalance.availableBalance) < amount) {
        return {
          success: false,
          message: 'Insufficient balance in savings wallet'
        };
      }

      // Executar transferência
      const transfer = await this.executeTransfer(
        savingsWallet.id,
        mainWallet.id,
        assetId,
        amount,
        'savings_to_main',
        context
      );

      return {
        success: true,
        transferId: transfer.id,
        message: 'Transfer to main wallet completed successfully'
      };

    } catch (error) {
      console.error('Error transferring to main:', error);
      return {
        success: false,
        message: 'Failed to transfer to main wallet'
      };
    }
  }

  private async executeTransfer(
    fromWalletId: string,
    toWalletId: string,
    assetId: string,
    amount: number,
    transferType: string,
    context: any
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Criar registro de transferência
      const transfer = await tx.walletTransfer.create({
        data: {
          fromWalletId,
          toWalletId,
          assetId,
          amount,
          transferType,
          status: 'pending'
        }
      });

      // Debitar da carteira origem
      const fromBalance = await tx.walletBalance.findUnique({
        where: {
          walletId_assetId: {
            walletId: fromWalletId,
            assetId
          }
        }
      });

      if (!fromBalance) {
        throw new Error('Source wallet balance not found');
      }

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

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'transfer',
        resourceType: 'wallet_transfer',
        resourceId: transfer.id,
        module: 'banco',
        description: `Transferred ${amount} from ${fromWalletId} to ${toWalletId}`,
        newValues: {
          fromWalletId,
          toWalletId,
          assetId,
          amount,
          transferType
        },
        metadata: {
          transferId: transfer.id
        }
      }, context);

      return transfer;
    });
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

  async getTransferHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    success: boolean;
    transfers?: any[];
    total?: number;
    message: string;
  }> {
    try {
      // Buscar carteiras do usuário
      const userWallets = await prisma.wallet.findMany({
        where: {
          userId,
          isActive: true,
          OR: [
            { isPrimary: true },
            { isSavings: true }
          ]
        },
        select: { id: true }
      });

      const walletIds = userWallets.map(w => w.id);

      // Buscar transferências
      const [transfers, total] = await Promise.all([
        prisma.walletTransfer.findMany({
          where: {
            OR: [
              { fromWalletId: { in: walletIds } },
              { toWalletId: { in: walletIds } }
            ]
          },
          include: {
            fromWallet: {
              select: {
                id: true,
                name: true,
                isPrimary: true,
                isSavings: true
              }
            },
            toWallet: {
              select: {
                id: true,
                name: true,
                isPrimary: true,
                isSavings: true
              }
            },
            asset: {
              select: {
                id: true,
                symbol: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.walletTransfer.count({
          where: {
            OR: [
              { fromWalletId: { in: walletIds } },
              { toWalletId: { in: walletIds } }
            ]
          }
        })
      ]);

      return {
        success: true,
        transfers: transfers.map(transfer => ({
          id: transfer.id,
          fromWallet: transfer.fromWallet,
          toWallet: transfer.toWallet,
          asset: transfer.asset,
          amount: transfer.amount,
          transferType: transfer.transferType,
          status: transfer.status,
          description: transfer.description,
          processedAt: transfer.processedAt,
          createdAt: transfer.createdAt
        })),
        total,
        message: 'Transfer history retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting transfer history:', error);
      return {
        success: false,
        message: 'Failed to get transfer history'
      };
    }
  }
}
```

## 🔧 APIs do Sistema de Poupança

### 1. Transfer APIs

#### POST /api/banco/savings/transfer-to-savings
Transferir da carteira principal para poupança

```typescript
interface TransferToSavingsRequest {
  assetId: string;
  amount: number;
}

interface TransferToSavingsResponse {
  success: boolean;
  transferId?: string;
  message: string;
}
```

#### POST /api/banco/savings/transfer-to-main
Transferir da poupança para carteira principal

```typescript
interface TransferToMainRequest {
  assetId: string;
  amount: number;
}

interface TransferToMainResponse {
  success: boolean;
  transferId?: string;
  message: string;
}
```

### 2. Settings APIs

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

### 3. Balance APIs

#### GET /api/banco/savings/combined-balance
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

### 4. History APIs

#### GET /api/banco/savings/transfers
Obter histórico de transferências

```typescript
interface GetSavingsTransfersRequest {
  limit?: number;
  offset?: number;
}

interface GetSavingsTransfersResponse {
  success: boolean;
  transfers?: Array<{
    id: string;
    fromWallet: {
      id: string;
      name: string;
      isPrimary: boolean;
      isSavings: boolean;
    };
    toWallet: {
      id: string;
      name: string;
      isPrimary: boolean;
      isSavings: boolean;
    };
    asset: {
      id: string;
      symbol: string;
      name: string;
    };
    amount: number;
    transferType: string;
    status: string;
    description?: string;
    processedAt?: string;
    createdAt: string;
  }>;
  total?: number;
  message: string;
}
```

## 🎨 Interface do Usuário

### 1. Perfil do Usuário

```typescript
// frontend/src/components/profile/SavingsSettings.tsx
import React, { useState, useEffect } from 'react';

interface SavingsSettingsProps {
  userId: string;
}

export const SavingsSettings: React.FC<SavingsSettingsProps> = ({ userId }) => {
  const [settings, setSettings] = useState({
    isSavingsEnabled: false,
    autoTransferEnabled: false,
    autoTransferPercentage: 0,
    autoTransferThreshold: 0,
    savingsGoal: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/banco/savings/settings`);
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/banco/savings/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Configurações salvas com sucesso!');
      } else {
        alert('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="savings-settings">
      <h3>Configurações de Poupança</h3>
      
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.isSavingsEnabled}
            onChange={(e) => setSettings({
              ...settings,
              isSavingsEnabled: e.target.checked
            })}
          />
          Habilitar Carteira de Poupança
        </label>
        <p className="help-text">
          Quando habilitada, você poderá transferir saldos entre sua carteira principal e poupança.
        </p>
      </div>

      {settings.isSavingsEnabled && (
        <>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.autoTransferEnabled}
                onChange={(e) => setSettings({
                  ...settings,
                  autoTransferEnabled: e.target.checked
                })}
              />
              Transferência Automática
            </label>
          </div>

          {settings.autoTransferEnabled && (
            <>
              <div className="setting-item">
                <label>
                  Percentual de Transferência Automática (%):
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.autoTransferPercentage}
                    onChange={(e) => setSettings({
                      ...settings,
                      autoTransferPercentage: Number(e.target.value)
                    })}
                  />
                </label>
              </div>

              <div className="setting-item">
                <label>
                  Valor Mínimo para Transferência:
                  <input
                    type="number"
                    min="0"
                    step="0.00000001"
                    value={settings.autoTransferThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      autoTransferThreshold: Number(e.target.value)
                    })}
                  />
                </label>
              </div>
            </>
          )}

          <div className="setting-item">
            <label>
              Meta de Poupança:
              <input
                type="number"
                min="0"
                step="0.00000001"
                value={settings.savingsGoal}
                onChange={(e) => setSettings({
                  ...settings,
                  savingsGoal: Number(e.target.value)
                })}
              />
            </label>
          </div>
        </>
      )}

      <button
        onClick={saveSettings}
        disabled={saving}
        className="save-button"
      >
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </button>
    </div>
  );
};
```

### 2. Dashboard de Poupança

```typescript
// frontend/src/components/savings/SavingsDashboard.tsx
import React, { useState, useEffect } from 'react';

interface SavingsDashboardProps {
  userId: string;
}

export const SavingsDashboard: React.FC<SavingsDashboardProps> = ({ userId }) => {
  const [combinedBalance, setCombinedBalance] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [balanceResponse, transfersResponse] = await Promise.all([
        fetch('/api/banco/savings/combined-balance'),
        fetch('/api/banco/savings/transfers?limit=10')
      ]);

      const balanceData = await balanceResponse.json();
      const transfersData = await transfersResponse.json();

      if (balanceData.success) {
        setCombinedBalance(balanceData.combinedBalance);
      }

      if (transfersData.success) {
        setTransfers(transfersData.transfers);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="savings-dashboard">
      <h2>Carteira de Poupança</h2>
      
      {combinedBalance && (
        <div className="balance-overview">
          <div className="total-balance">
            <h3>Saldo Total</h3>
            <div className="balance-amount">
              ${combinedBalance.totalUsdValue.toLocaleString()}
            </div>
            <div className="balance-btc">
              {combinedBalance.totalBtcValue.toFixed(8)} BTC
            </div>
          </div>

          <div className="wallet-breakdown">
            <div className="main-wallet">
              <h4>Carteira Principal</h4>
              <div className="wallet-balances">
                {combinedBalance.mainWallet.balances.map(balance => (
                  <div key={balance.id} className="balance-item">
                    <span className="asset">{balance.asset.symbol}</span>
                    <span className="amount">{balance.balance}</span>
                    <span className="value">${balance.usdValue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {combinedBalance.savingsWallet && (
              <div className="savings-wallet">
                <h4>Carteira de Poupança</h4>
                <div className="wallet-balances">
                  {combinedBalance.savingsWallet.balances.map(balance => (
                    <div key={balance.id} className="balance-item">
                      <span className="asset">{balance.asset.symbol}</span>
                      <span className="amount">{balance.balance}</span>
                      <span className="value">${balance.usdValue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="recent-transfers">
        <h3>Transferências Recentes</h3>
        <div className="transfers-list">
          {transfers.map(transfer => (
            <div key={transfer.id} className="transfer-item">
              <div className="transfer-info">
                <span className="from-wallet">
                  {transfer.fromWallet.isPrimary ? 'Principal' : 'Poupança'}
                </span>
                <span className="arrow">→</span>
                <span className="to-wallet">
                  {transfer.toWallet.isPrimary ? 'Principal' : 'Poupança'}
                </span>
              </div>
              <div className="transfer-details">
                <span className="amount">{transfer.amount} {transfer.asset.symbol}</span>
                <span className="status">{transfer.status}</span>
                <span className="date">
                  {new Date(transfer.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## 🧪 Testes do Sistema de Poupança

### 1. Testes Unitários

```typescript
// tests/unit/banco/savings-wallet-manager.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { SavingsWalletManager } from '../../src/banco/savings-wallet-manager';
import { prisma } from '../setup';

describe('SavingsWalletManager', () => {
  let savingsManager: SavingsWalletManager;

  beforeEach(() => {
    savingsManager = new SavingsWalletManager();
  });

  describe('transferToSavings', () => {
    it('should transfer from main to savings wallet successfully', async () => {
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

      const mainWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Main Wallet',
          walletType: 'internal',
          isPrimary: true,
          isActive: true
        }
      });

      const savingsWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Savings Wallet',
          walletType: 'internal',
          isSavings: true,
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
          walletId: mainWallet.id,
          assetId: asset.id,
          balance: 1.0,
          availableBalance: 1.0,
          lockedBalance: 0.0,
          usdValue: 30000,
          btcValue: 1.0
        }
      });

      await prisma.userSavingsSetting.create({
        data: {
          userId: user.id,
          isSavingsEnabled: true
        }
      });

      const result = await savingsManager.transferToSavings(
        user.id,
        asset.id,
        0.5,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.transferId).toBeDefined();

      // Verificar se transferência foi registrada
      const transfer = await prisma.walletTransfer.findFirst({
        where: {
          fromWalletId: mainWallet.id,
          toWalletId: savingsWallet.id
        }
      });

      expect(transfer).toBeDefined();
      expect(transfer?.amount).toBe(0.5);
      expect(transfer?.transferType).toBe('main_to_savings');
    });

    it('should fail if savings is not enabled', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      await prisma.userSavingsSetting.create({
        data: {
          userId: user.id,
          isSavingsEnabled: false
        }
      });

      const result = await savingsManager.transferToSavings(
        user.id,
        'asset_123',
        0.5,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Savings wallet is not enabled');
    });
  });

  describe('getCombinedBalance', () => {
    it('should return combined balance of main and savings wallets', async () => {
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

      const mainWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Main Wallet',
          walletType: 'internal',
          isPrimary: true,
          isActive: true
        }
      });

      const savingsWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          name: 'Savings Wallet',
          walletType: 'internal',
          isSavings: true,
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
          walletId: mainWallet.id,
          assetId: asset.id,
          balance: 1.0,
          availableBalance: 1.0,
          lockedBalance: 0.0,
          usdValue: 30000,
          btcValue: 1.0
        }
      });

      await prisma.walletBalance.create({
        data: {
          walletId: savingsWallet.id,
          assetId: asset.id,
          balance: 0.5,
          availableBalance: 0.5,
          lockedBalance: 0.0,
          usdValue: 15000,
          btcValue: 0.5
        }
      });

      const result = await savingsManager.getCombinedBalance(
        user.id,
        tenant.id
      );

      expect(result.success).toBe(true);
      expect(result.combinedBalance).toBeDefined();
      expect(result.combinedBalance.totalUsdValue).toBe(45000);
      expect(result.combinedBalance.combinedBalances).toHaveLength(1);
      expect(result.combinedBalance.combinedBalances[0].mainBalance).toBe(1.0);
      expect(result.combinedBalance.combinedBalances[0].savingsBalance).toBe(0.5);
      expect(result.combinedBalance.combinedBalances[0].totalBalance).toBe(1.5);
    });
  });
});
```

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Atualizar tabela wallets com campos de poupança
- [ ] Criar tabela wallet_transfers
- [ ] Criar tabela user_savings_settings
- [ ] Configurar criação automática de carteiras

### ✅ Funcionalidades
- [ ] Auto Wallet Creator
- [ ] Savings Wallet Manager
- [ ] Sistema de transferências
- [ ] Configurações de poupança
- [ ] Saldo combinado

### ✅ APIs
- [ ] APIs de transferência
- [ ] APIs de configurações
- [ ] APIs de saldo combinado
- [ ] APIs de histórico

### ✅ Interface
- [ ] Configurações no perfil
- [ ] Dashboard de poupança
- [ ] Componentes de transferência
- [ ] Histórico de transferências

### ✅ Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes E2E
- [ ] Testes de transferências

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO