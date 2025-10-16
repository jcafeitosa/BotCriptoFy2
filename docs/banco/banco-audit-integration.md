# Integração do Módulo de Banco com Sistema de Auditoria - BotCriptoFy2

## 🔗 Visão Geral

Sistema de integração que conecta o módulo de banco com o sistema de auditoria, garantindo que todas as operações financeiras sejam auditadas de forma imutável e acessível, com atenção especial para traders e influencers.

## 🏗️ Arquitetura de Integração

### Componentes de Integração
- **Banco Audit Adapter**: Adaptador específico para operações de banco
- **Financial Audit Logger**: Logger especializado para operações financeiras
- **Asset Change Tracker**: Rastreador de mudanças em ativos
- **Portfolio Audit Analyzer**: Analisador de auditoria de portfólio
- **Security Audit Monitor**: Monitor de auditoria de segurança

### Estratégia de Auditoria por Tipo de Usuário
- **Traders**: Auditoria completa de todas as operações de carteira
- **Influencers/Parceiros**: Auditoria de operações financeiras e portfólio
- **Administrativos**: Auditoria de gestão de carteiras e ativos

## 🔧 Implementação da Integração

### 1. Banco Audit Adapter

```typescript
// backend/src/banco/banco-audit-adapter.ts
import { TraderAuditLogger } from '../audit/trader-audit-logger';
import { InfluencerAuditLogger } from '../audit/influencer-audit-logger';
import { AuditLogger } from '../audit/audit-logger';
import { prisma } from '../db';

export class BancoAuditAdapter {
  private traderAuditLogger: TraderAuditLogger;
  private influencerAuditLogger: InfluencerAuditLogger;
  private auditLogger: AuditLogger;

  constructor() {
    this.traderAuditLogger = new TraderAuditLogger();
    this.influencerAuditLogger = new InfluencerAuditLogger();
    this.auditLogger = new AuditLogger();
  }

  async logWalletCreation(
    userId: string,
    userType: string,
    walletData: any,
    context: any
  ): Promise<void> {
    const action = {
      category: 'financial' as const,
      type: 'create_wallet',
      resourceType: 'wallet',
      resourceId: walletData.id,
      module: 'banco',
      description: `Created ${walletData.walletType} wallet: ${walletData.name}`,
      newValues: this.sanitizeWalletData(walletData),
      metadata: {
        walletType: walletData.walletType,
        exchangeId: walletData.exchangeId,
        address: walletData.address
      }
    };

    await this.logByUserType(userId, userType, action, context);
  }

  async logWalletBalanceUpdate(
    userId: string,
    userType: string,
    walletId: string,
    assetId: string,
    oldBalance: number,
    newBalance: number,
    context: any
  ): Promise<void> {
    const action = {
      category: 'financial' as const,
      type: 'update_balance',
      resourceType: 'wallet_balance',
      resourceId: `${walletId}_${assetId}`,
      module: 'banco',
      description: `Updated wallet balance: ${oldBalance} → ${newBalance}`,
      oldValues: { balance: oldBalance },
      newValues: { balance: newBalance },
      metadata: {
        walletId,
        assetId,
        change: newBalance - oldBalance
      }
    };

    await this.logByUserType(userId, userType, action, context);
  }

  async logTransaction(
    userId: string,
    userType: string,
    transactionData: any,
    context: any
  ): Promise<void> {
    const action = {
      category: 'financial' as const,
      type: `wallet_${transactionData.transactionType}`,
      resourceType: 'wallet_transaction',
      resourceId: transactionData.id,
      module: 'banco',
      description: `${transactionData.transactionType} transaction: ${transactionData.amount} ${transactionData.asset?.symbol}`,
      newValues: this.sanitizeTransactionData(transactionData),
      metadata: {
        walletId: transactionData.walletId,
        assetId: transactionData.assetId,
        amount: transactionData.amount,
        fee: transactionData.fee,
        status: transactionData.status
      }
    };

    await this.logByUserType(userId, userType, action, context);
  }

  async logPortfolioChange(
    userId: string,
    userType: string,
    portfolioData: any,
    context: any
  ): Promise<void> {
    const action = {
      category: 'financial' as const,
      type: 'portfolio_change',
      resourceType: 'portfolio',
      resourceId: portfolioData.id || 'current',
      module: 'banco',
      description: `Portfolio value changed: $${portfolioData.totalUsdValue}`,
      newValues: this.sanitizePortfolioData(portfolioData),
      metadata: {
        totalUsdValue: portfolioData.totalUsdValue,
        totalBtcValue: portfolioData.totalBtcValue,
        assetCount: portfolioData.assetBreakdown?.length || 0
      }
    };

    await this.logByUserType(userId, userType, action, context);
  }

  async logSecuritySettingsChange(
    userId: string,
    userType: string,
    walletId: string,
    oldSettings: any,
    newSettings: any,
    context: any
  ): Promise<void> {
    const action = {
      category: 'security' as const,
      type: 'update_security_settings',
      resourceType: 'wallet_security',
      resourceId: walletId,
      module: 'banco',
      description: 'Updated wallet security settings',
      oldValues: this.sanitizeSecuritySettings(oldSettings),
      newValues: this.sanitizeSecuritySettings(newSettings),
      metadata: {
        walletId,
        changes: this.getSettingsChanges(oldSettings, newSettings)
      }
    };

    await this.logByUserType(userId, userType, action, context);
  }

  async logExchangeSync(
    userId: string,
    userType: string,
    exchangeId: string,
    syncData: any,
    context: any
  ): Promise<void> {
    const action = {
      category: 'system' as const,
      type: 'exchange_sync',
      resourceType: 'exchange',
      resourceId: exchangeId,
      module: 'banco',
      description: `Synced exchange: ${syncData.syncedWallets} wallets updated`,
      newValues: {
        syncedWallets: syncData.syncedWallets,
        syncStatus: syncData.status
      },
      metadata: {
        exchangeId,
        syncedWallets: syncData.syncedWallets,
        errors: syncData.errors || []
      }
    };

    await this.logByUserType(userId, userType, action, context);
  }

  async logAssetPriceUpdate(
    assetId: string,
    oldPrice: number,
    newPrice: number,
    context: any
  ): Promise<void> {
    const action = {
      type: 'update_asset_price',
      resourceType: 'asset',
      resourceId: assetId,
      module: 'banco',
      description: `Asset price updated: $${oldPrice} → $${newPrice}`,
      oldValues: { price: oldPrice },
      newValues: { price: newPrice },
      metadata: {
        assetId,
        priceChange: newPrice - oldPrice,
        priceChangePercent: ((newPrice - oldPrice) / oldPrice) * 100
      }
    };

    await this.auditLogger.logAction('system', action, context);
  }

  async logPortfolioAnalytics(
    userId: string,
    userType: string,
    analyticsData: any,
    context: any
  ): Promise<void> {
    const action = {
      category: 'analytics' as const,
      type: 'portfolio_analytics',
      resourceType: 'portfolio_analytics',
      resourceId: analyticsData.id || 'current',
      module: 'banco',
      description: `Portfolio analytics generated: ${analyticsData.analysisType}`,
      newValues: this.sanitizeAnalyticsData(analyticsData),
      metadata: {
        analysisType: analyticsData.analysisType,
        totalReturn: analyticsData.performance?.totalReturn,
        volatility: analyticsData.risk?.volatility,
        sharpeRatio: analyticsData.risk?.sharpeRatio
      }
    };

    await this.logByUserType(userId, userType, action, context);
  }

  private async logByUserType(
    userId: string,
    userType: string,
    action: any,
    context: any
  ): Promise<void> {
    if (userType === 'trader') {
      await this.traderAuditLogger.logTraderAction(userId, action, context);
    } else if (userType === 'influencer' || userType === 'partner') {
      await this.influencerAuditLogger.logInfluencerAction(userId, action, context);
    } else {
      await this.auditLogger.logAction(userId, action, context);
    }
  }

  private sanitizeWalletData(walletData: any): any {
    if (!walletData) return walletData;

    return {
      id: walletData.id,
      name: walletData.name,
      description: walletData.description,
      walletType: walletData.walletType,
      address: walletData.address ? this.maskAddress(walletData.address) : null,
      isActive: walletData.isActive,
      isVerified: walletData.isVerified,
      createdAt: walletData.createdAt
    };
  }

  private sanitizeTransactionData(transactionData: any): any {
    if (!transactionData) return transactionData;

    return {
      id: transactionData.id,
      transactionType: transactionData.transactionType,
      amount: transactionData.amount,
      fee: transactionData.fee,
      status: transactionData.status,
      fromAddress: transactionData.fromAddress ? this.maskAddress(transactionData.fromAddress) : null,
      toAddress: transactionData.toAddress ? this.maskAddress(transactionData.toAddress) : null,
      txHash: transactionData.txHash ? this.maskHash(transactionData.txHash) : null,
      createdAt: transactionData.createdAt
    };
  }

  private sanitizePortfolioData(portfolioData: any): any {
    if (!portfolioData) return portfolioData;

    return {
      totalUsdValue: portfolioData.totalUsdValue,
      totalBtcValue: portfolioData.totalBtcValue,
      assetCount: portfolioData.assetBreakdown?.length || 0,
      exchangeCount: Object.keys(portfolioData.exchangeBreakdown || {}).length,
      lastUpdated: portfolioData.lastUpdated
    };
  }

  private sanitizeSecuritySettings(settings: any): any {
    if (!settings) return settings;

    return {
      twoFactorRequired: settings.twoFactorRequired,
      withdrawalLimits: settings.withdrawalLimits,
      allowedOperations: settings.allowedOperations,
      autoLockEnabled: settings.autoLockEnabled,
      autoLockDuration: settings.autoLockDuration,
      ipWhitelist: settings.ipWhitelist?.map((ip: string) => this.maskIP(ip)) || []
    };
  }

  private sanitizeAnalyticsData(analyticsData: any): any {
    if (!analyticsData) return analyticsData;

    return {
      analysisType: analyticsData.analysisType,
      totalReturn: analyticsData.performance?.totalReturn,
      volatility: analyticsData.risk?.volatility,
      sharpeRatio: analyticsData.risk?.sharpeRatio,
      maxDrawdown: analyticsData.risk?.maxDrawdown,
      generatedAt: analyticsData.generatedAt
    };
  }

  private maskAddress(address: string): string {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  private maskHash(hash: string): string {
    if (hash.length <= 12) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
  }

  private maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip;
  }

  private getSettingsChanges(oldSettings: any, newSettings: any): string[] {
    const changes: string[] = [];
    
    if (oldSettings.twoFactorRequired !== newSettings.twoFactorRequired) {
      changes.push('two_factor_required');
    }
    
    if (JSON.stringify(oldSettings.withdrawalLimits) !== JSON.stringify(newSettings.withdrawalLimits)) {
      changes.push('withdrawal_limits');
    }
    
    if (JSON.stringify(oldSettings.allowedOperations) !== JSON.stringify(newSettings.allowedOperations)) {
      changes.push('allowed_operations');
    }
    
    if (oldSettings.autoLockEnabled !== newSettings.autoLockEnabled) {
      changes.push('auto_lock_enabled');
    }
    
    if (oldSettings.autoLockDuration !== newSettings.autoLockDuration) {
      changes.push('auto_lock_duration');
    }
    
    if (JSON.stringify(oldSettings.ipWhitelist) !== JSON.stringify(newSettings.ipWhitelist)) {
      changes.push('ip_whitelist');
    }

    return changes;
  }
}
```

### 2. Financial Audit Logger

```typescript
// backend/src/banco/financial-audit-logger.ts
import { prisma } from '../db';
import { BancoAuditAdapter } from './banco-audit-adapter';

export class FinancialAuditLogger {
  private bancoAuditAdapter: BancoAuditAdapter;

  constructor() {
    this.bancoAuditAdapter = new BancoAuditAdapter();
  }

  async logWalletOperation(
    operation: 'create' | 'update' | 'delete' | 'balance_update',
    walletData: any,
    userId: string,
    context: any
  ): Promise<void> {
    try {
      // Determinar tipo de usuário
      const userType = await this.getUserType(userId);

      switch (operation) {
        case 'create':
          await this.bancoAuditAdapter.logWalletCreation(userId, userType, walletData, context);
          break;
        case 'update':
          await this.bancoAuditAdapter.logWalletUpdate(userId, userType, walletData, context);
          break;
        case 'delete':
          await this.bancoAuditAdapter.logWalletDeletion(userId, userType, walletData, context);
          break;
        case 'balance_update':
          await this.bancoAuditAdapter.logWalletBalanceUpdate(
            userId,
            userType,
            walletData.walletId,
            walletData.assetId,
            walletData.oldBalance,
            walletData.newBalance,
            context
          );
          break;
      }
    } catch (error) {
      console.error('Error logging wallet operation:', error);
    }
  }

  async logTransactionOperation(
    operation: 'create' | 'update' | 'confirm' | 'fail',
    transactionData: any,
    userId: string,
    context: any
  ): Promise<void> {
    try {
      const userType = await this.getUserType(userId);

      // Log da operação principal
      await this.bancoAuditAdapter.logTransaction(userId, userType, transactionData, context);

      // Log específico da operação
      const operationAction = {
        category: 'financial' as const,
        type: `transaction_${operation}`,
        resourceType: 'wallet_transaction',
        resourceId: transactionData.id,
        module: 'banco',
        description: `Transaction ${operation}: ${transactionData.amount} ${transactionData.asset?.symbol}`,
        newValues: {
          status: transactionData.status,
          processedAt: transactionData.processedAt,
          confirmations: transactionData.confirmations
        },
        metadata: {
          operation,
          walletId: transactionData.walletId,
          assetId: transactionData.assetId
        }
      };

      await this.bancoAuditAdapter.logByUserType(userId, userType, operationAction, context);

    } catch (error) {
      console.error('Error logging transaction operation:', error);
    }
  }

  async logPortfolioOperation(
    operation: 'view' | 'analyze' | 'export' | 'snapshot',
    portfolioData: any,
    userId: string,
    context: any
  ): Promise<void> {
    try {
      const userType = await this.getUserType(userId);

      const action = {
        category: 'financial' as const,
        type: `portfolio_${operation}`,
        resourceType: 'portfolio',
        resourceId: portfolioData.id || 'current',
        module: 'banco',
        description: `Portfolio ${operation}: $${portfolioData.totalUsdValue}`,
        newValues: {
          totalUsdValue: portfolioData.totalUsdValue,
          totalBtcValue: portfolioData.totalBtcValue,
          assetCount: portfolioData.assetBreakdown?.length || 0
        },
        metadata: {
          operation,
          includeAll: portfolioData.includeAll || false
        }
      };

      await this.bancoAuditAdapter.logByUserType(userId, userType, action, context);

    } catch (error) {
      console.error('Error logging portfolio operation:', error);
    }
  }

  async logSecurityOperation(
    operation: 'create_settings' | 'update_settings' | 'validate_transaction' | 'lock_wallet',
    securityData: any,
    userId: string,
    context: any
  ): Promise<void> {
    try {
      const userType = await this.getUserType(userId);

      const action = {
        category: 'security' as const,
        type: `security_${operation}`,
        resourceType: 'wallet_security',
        resourceId: securityData.walletId || securityData.id,
        module: 'banco',
        description: `Security ${operation}: ${securityData.walletId}`,
        newValues: this.sanitizeSecurityData(securityData),
        metadata: {
          operation,
          walletId: securityData.walletId,
          reason: securityData.reason
        }
      };

      await this.bancoAuditAdapter.logByUserType(userId, userType, action, context);

    } catch (error) {
      console.error('Error logging security operation:', error);
    }
  }

  async logExchangeOperation(
    operation: 'sync' | 'connect' | 'disconnect' | 'update_credentials',
    exchangeData: any,
    userId: string,
    context: any
  ): Promise<void> {
    try {
      const userType = await this.getUserType(userId);

      const action = {
        category: 'system' as const,
        type: `exchange_${operation}`,
        resourceType: 'exchange',
        resourceId: exchangeData.exchangeId || exchangeData.id,
        module: 'banco',
        description: `Exchange ${operation}: ${exchangeData.exchangeName || exchangeData.name}`,
        newValues: this.sanitizeExchangeData(exchangeData),
        metadata: {
          operation,
          exchangeId: exchangeData.exchangeId || exchangeData.id,
          syncedWallets: exchangeData.syncedWallets,
          errors: exchangeData.errors
        }
      };

      await this.bancoAuditAdapter.logByUserType(userId, userType, action, context);

    } catch (error) {
      console.error('Error logging exchange operation:', error);
    }
  }

  async logAssetOperation(
    operation: 'price_update' | 'add_asset' | 'update_asset' | 'deactivate_asset',
    assetData: any,
    userId: string,
    context: any
  ): Promise<void> {
    try {
      const action = {
        type: `asset_${operation}`,
        resourceType: 'asset',
        resourceId: assetData.assetId || assetData.id,
        module: 'banco',
        description: `Asset ${operation}: ${assetData.symbol}`,
        newValues: this.sanitizeAssetData(assetData),
        metadata: {
          operation,
          assetId: assetData.assetId || assetData.id,
          symbol: assetData.symbol,
          priceChange: assetData.priceChange
        }
      };

      await this.bancoAuditAdapter.auditLogger.logAction(userId || 'system', action, context);

    } catch (error) {
      console.error('Error logging asset operation:', error);
    }
  }

  private async getUserType(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { affiliateUser: true }
    });

    if (!user) return 'unknown';
    if (user.affiliateUser) return user.affiliateUser.userType;
    return 'admin';
  }

  private sanitizeSecurityData(securityData: any): any {
    if (!securityData) return securityData;

    return {
      walletId: securityData.walletId,
      twoFactorRequired: securityData.twoFactorRequired,
      withdrawalLimits: securityData.withdrawalLimits,
      allowedOperations: securityData.allowedOperations,
      autoLockEnabled: securityData.autoLockEnabled,
      autoLockDuration: securityData.autoLockDuration,
      ipWhitelist: securityData.ipWhitelist?.map((ip: string) => this.maskIP(ip)) || []
    };
  }

  private sanitizeExchangeData(exchangeData: any): any {
    if (!exchangeData) return exchangeData;

    return {
      id: exchangeData.id,
      name: exchangeData.name,
      code: exchangeData.code,
      isActive: exchangeData.isActive,
      lastSync: exchangeData.lastSync,
      syncStatus: exchangeData.syncStatus,
      syncedWallets: exchangeData.syncedWallets
    };
  }

  private sanitizeAssetData(assetData: any): any {
    if (!assetData) return assetData;

    return {
      id: assetData.id,
      symbol: assetData.symbol,
      name: assetData.name,
      assetType: assetData.assetType,
      isActive: assetData.isActive,
      price: assetData.price,
      priceChange: assetData.priceChange
    };
  }

  private maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip;
  }
}
```

### 3. Asset Change Tracker

```typescript
// backend/src/banco/asset-change-tracker.ts
import { prisma } from '../db';
import { FinancialAuditLogger } from './financial-audit-logger';

export class AssetChangeTracker {
  private financialAuditLogger: FinancialAuditLogger;

  constructor() {
    this.financialAuditLogger = new FinancialAuditLogger();
  }

  async trackPriceChanges(): Promise<void> {
    try {
      // Buscar todos os assets ativos
      const assets = await prisma.asset.findMany({
        where: { isActive: true }
      });

      for (const asset of assets) {
        // Buscar preço atual
        const currentPrice = await this.getCurrentPrice(asset.symbol);
        
        if (currentPrice > 0) {
          // Buscar último preço registrado
          const lastPriceRecord = await prisma.assetPriceHistory.findFirst({
            where: { assetId: asset.id },
            orderBy: { createdAt: 'desc' }
          });

          const lastPrice = lastPriceRecord?.priceUsd || 0;
          const priceChange = currentPrice - lastPrice;
          const priceChangePercent = lastPrice > 0 ? (priceChange / lastPrice) * 100 : 0;

          // Registrar mudança significativa (> 1%)
          if (Math.abs(priceChangePercent) > 1) {
            await this.logPriceChange(asset, lastPrice, currentPrice, priceChangePercent);
          }

          // Salvar histórico de preço
          await prisma.assetPriceHistory.create({
            data: {
              assetId: asset.id,
              priceUsd: currentPrice,
              priceBtc: await this.getBtcPrice(asset.symbol),
              change24h: priceChangePercent,
              source: 'coingecko',
              createdAt: new Date()
            }
          });
        }
      }

    } catch (error) {
      console.error('Error tracking price changes:', error);
    }
  }

  async trackBalanceChanges(): Promise<void> {
    try {
      // Buscar todos os saldos
      const balances = await prisma.walletBalance.findMany({
        include: {
          wallet: {
            select: {
              id: true,
              userId: true,
              name: true
            }
          },
          asset: {
            select: {
              id: true,
              symbol: true,
              name: true
            }
          }
        }
      });

      for (const balance of balances) {
        // Verificar se houve mudança significativa no valor USD
        const currentUsdValue = Number(balance.usdValue);
        const lastUsdValue = await this.getLastUsdValue(balance.id);
        
        if (lastUsdValue > 0) {
          const valueChange = currentUsdValue - lastUsdValue;
          const valueChangePercent = (valueChange / lastUsdValue) * 100;

          // Registrar mudança significativa (> 5%)
          if (Math.abs(valueChangePercent) > 5) {
            await this.logBalanceChange(balance, lastUsdValue, currentUsdValue, valueChangePercent);
          }
        }
      }

    } catch (error) {
      console.error('Error tracking balance changes:', error);
    }
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Implementar busca de preço atual
      // Por enquanto, retornar 0
      return 0;
    } catch (error) {
      console.error(`Error getting current price for ${symbol}:`, error);
      return 0;
    }
  }

  private async getBtcPrice(symbol: string): Promise<number> {
    try {
      // Implementar busca de preço em BTC
      return 0;
    } catch (error) {
      console.error(`Error getting BTC price for ${symbol}:`, error);
      return 0;
    }
  }

  private async getLastUsdValue(balanceId: string): Promise<number> {
    try {
      const lastSnapshot = await prisma.portfolioSnapshot.findFirst({
        where: {
          assetBreakdown: {
            path: [balanceId],
            exists: true
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (lastSnapshot) {
        const assetBreakdown = lastSnapshot.assetBreakdown as any;
        return assetBreakdown[balanceId]?.totalUsdValue || 0;
      }

      return 0;
    } catch (error) {
      console.error(`Error getting last USD value for balance ${balanceId}:`, error);
      return 0;
    }
  }

  private async logPriceChange(
    asset: any,
    oldPrice: number,
    newPrice: number,
    changePercent: number
  ): Promise<void> {
    try {
      await this.financialAuditLogger.logAssetOperation(
        'price_update',
        {
          assetId: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          oldPrice,
          newPrice,
          priceChange: changePercent
        },
        'system',
        {
          ipAddress: 'system',
          userAgent: 'asset-tracker',
          location: { country: 'SYSTEM', city: 'TRACKER' }
        }
      );
    } catch (error) {
      console.error('Error logging price change:', error);
    }
  }

  private async logBalanceChange(
    balance: any,
    oldValue: number,
    newValue: number,
    changePercent: number
  ): Promise<void> {
    try {
      await this.financialAuditLogger.logWalletOperation(
        'balance_update',
        {
          walletId: balance.walletId,
          assetId: balance.assetId,
          oldBalance: oldValue,
          newBalance: newValue,
          changePercent
        },
        balance.wallet.userId,
        {
          ipAddress: 'system',
          userAgent: 'balance-tracker',
          location: { country: 'SYSTEM', city: 'TRACKER' }
        }
      );
    } catch (error) {
      console.error('Error logging balance change:', error);
    }
  }
}
```

## 🔧 APIs de Integração

### 1. Banco Audit APIs

#### GET /api/banco/audit/wallet/{walletId}/history
Obter histórico de auditoria de uma carteira

```typescript
interface GetWalletAuditHistoryResponse {
  success: boolean;
  history?: Array<{
    id: string;
    actionType: string;
    description: string;
    oldValues?: any;
    newValues?: any;
    metadata: any;
    riskLevel: string;
    isSuspicious: boolean;
    createdAt: string;
  }>;
  message: string;
}
```

#### GET /api/banco/audit/portfolio/{userId}/analytics
Obter analytics de auditoria do portfólio

```typescript
interface GetPortfolioAuditAnalyticsResponse {
  success: boolean;
  analytics?: {
    totalOperations: number;
    operationsByType: Record<string, number>;
    riskDistribution: Record<string, number>;
    suspiciousOperations: number;
    lastActivity: string;
    topAssets: Array<{
      asset: string;
      operations: number;
    }>;
  };
  message: string;
}
```

### 2. Financial Audit APIs

#### POST /api/banco/audit/log-operation
Registrar operação financeira

```typescript
interface LogFinancialOperationRequest {
  operation: string;
  resourceType: string;
  resourceId: string;
  data: any;
  metadata?: any;
}

interface LogFinancialOperationResponse {
  success: boolean;
  logId?: string;
  message: string;
}
```

## 🧪 Testes de Integração

### Testes de Banco Audit Adapter

```typescript
// tests/integration/banco/banco-audit-adapter.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { BancoAuditAdapter } from '../../src/banco/banco-audit-adapter';
import { prisma } from '../setup';

describe('BancoAuditAdapter', () => {
  let bancoAuditAdapter: BancoAuditAdapter;

  beforeEach(() => {
    bancoAuditAdapter = new BancoAuditAdapter();
  });

  describe('logWalletCreation', () => {
    it('should log wallet creation for trader', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'trader@example.com',
          name: 'Trader User'
        }
      });

      await prisma.affiliateUser.create({
        data: {
          userId: user.id,
          tenantId: 'main-tenant',
          affiliateCode: 'TRADER001',
          userType: 'trader',
          inviteLimit: 5,
          isActive: true
        }
      });

      const walletData = {
        id: 'wallet_123',
        name: 'Test Wallet',
        walletType: 'internal',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      };

      await bancoAuditAdapter.logWalletCreation(
        user.id,
        'trader',
        walletData,
        {}
      );

      // Verificar se log foi criado
      const logs = await prisma.traderAuditLog.findMany({
        where: { traderId: user.id }
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].actionType).toBe('create_wallet');
      expect(logs[0].module).toBe('banco');
    });
  });

  describe('logTransaction', () => {
    it('should log transaction for influencer', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'influencer@example.com',
          name: 'Influencer User'
        }
      });

      await prisma.affiliateUser.create({
        data: {
          userId: user.id,
          tenantId: 'main-tenant',
          affiliateCode: 'INFLUENCER001',
          userType: 'influencer',
          inviteLimit: null,
          isActive: true
        }
      });

      const transactionData = {
        id: 'tx_123',
        walletId: 'wallet_123',
        assetId: 'asset_123',
        transactionType: 'deposit',
        amount: 1000,
        fee: 10,
        status: 'confirmed',
        asset: { symbol: 'BTC' }
      };

      await bancoAuditAdapter.logTransaction(
        user.id,
        'influencer',
        transactionData,
        {}
      );

      // Verificar se log foi criado
      const logs = await prisma.influencerAuditLog.findMany({
        where: { influencerId: user.id }
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].actionType).toBe('wallet_deposit');
      expect(logs[0].module).toBe('banco');
    });
  });
});
```

## 📋 Checklist de Integração

### ✅ Configuração Inicial
- [ ] Configurar adaptador de auditoria do banco
- [ ] Configurar logger financeiro
- [ ] Configurar rastreador de mudanças
- [ ] Configurar monitor de segurança

### ✅ Funcionalidades
- [ ] Logging de operações de carteira
- [ ] Logging de transações
- [ ] Logging de mudanças de portfólio
- [ ] Logging de configurações de segurança

### ✅ APIs
- [ ] APIs de histórico de auditoria
- [ ] APIs de analytics de auditoria
- [ ] APIs de logging de operações
- [ ] APIs de monitoramento

### ✅ Testes
- [ ] Testes de adaptador de auditoria
- [ ] Testes de logger financeiro
- [ ] Testes de rastreador de mudanças
- [ ] Testes de integração

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO