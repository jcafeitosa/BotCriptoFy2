# Sistema de Gestão de Carteiras e Ativos - BotCriptoFy2

## 🏦 Visão Geral

Sistema completo para gerenciar carteiras com exchanges e carteiras internas dos usuários, fornecendo visão 360° para a empresa e visão restrita para usuários, com controle total de ativos e saldos.

## 🏗️ Arquitetura do Sistema

### Componentes Principais
- **Wallet Manager**: Gerenciador central de carteiras
- **Exchange Connector**: Conectores para exchanges
- **Asset Tracker**: Rastreador de preços e ativos
- **Balance Calculator**: Calculadora de saldos
- **Portfolio Analyzer**: Analisador de portfólio
- **Risk Manager**: Gerenciador de risco
- **Transaction Processor**: Processador de transações
- **Security Manager**: Gerenciador de segurança

### Estratégia de Visão
- **Visão Empresarial**: Controle total de todas as carteiras e ativos
- **Visão do Usuário**: Acesso apenas aos próprios saldos
- **Visão Unificada**: Agregação de dados de todas as exchanges
- **Visão por Exchange**: Dados específicos de cada exchange
- **Visão por Ativo**: Análise detalhada de cada ativo

## 📊 Estrutura de Dados Detalhada

### Tabelas Específicas para Carteiras

#### 1. wallet_types
```sql
CREATE TABLE wallet_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  features JSONB DEFAULT '{}', -- {supports_trading, supports_staking, supports_defi}
  security_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, maximum
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. wallet_security_settings
```sql
CREATE TABLE wallet_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  two_factor_required BOOLEAN DEFAULT false,
  withdrawal_limits JSONB DEFAULT '{}', -- {daily, weekly, monthly}
  ip_whitelist JSONB DEFAULT '[]',
  allowed_operations JSONB DEFAULT '[]', -- [deposit, withdrawal, transfer, trade]
  auto_lock_enabled BOOLEAN DEFAULT false,
  auto_lock_duration INTEGER DEFAULT 0, -- minutos
  last_activity TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. wallet_transaction_history
```sql
CREATE TABLE wallet_transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  transaction_id UUID NOT NULL REFERENCES wallet_transactions(id),
  action_type VARCHAR(50) NOT NULL, -- created, updated, confirmed, failed, cancelled
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  old_amount DECIMAL(20,8),
  new_amount DECIMAL(20,8),
  reason TEXT,
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
```

#### 4. asset_price_history
```sql
CREATE TABLE asset_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  price_usd DECIMAL(20,8) NOT NULL,
  price_btc DECIMAL(20,8) NOT NULL,
  market_cap DECIMAL(20,2),
  volume_24h DECIMAL(20,2),
  change_24h DECIMAL(8,4), -- percentual
  change_7d DECIMAL(8,4), -- percentual
  source VARCHAR(50) NOT NULL, -- coingecko, cmc, exchange
  exchange_id UUID REFERENCES exchanges(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. portfolio_analytics
```sql
CREATE TABLE portfolio_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_value_start DECIMAL(15,2) NOT NULL,
  total_value_end DECIMAL(15,2) NOT NULL,
  total_return DECIMAL(8,4) NOT NULL, -- percentual
  total_return_usd DECIMAL(15,2) NOT NULL,
  best_performing_asset JSONB, -- {asset_id, symbol, return_percentage}
  worst_performing_asset JSONB, -- {asset_id, symbol, return_percentage}
  volatility_score DECIMAL(8,4), -- 0-100
  sharpe_ratio DECIMAL(8,4),
  max_drawdown DECIMAL(8,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Implementação Detalhada

### 1. Balance Calculator

```typescript
// backend/src/banco/balance-calculator.ts
import { prisma } from '../db';
import { AssetTracker } from './asset-tracker';

export class BalanceCalculator {
  private assetTracker: AssetTracker;

  constructor() {
    this.assetTracker = new AssetTracker();
  }

  async calculateWalletBalances(
    walletId: string,
    includePending: boolean = true
  ): Promise<{
    success: boolean;
    balances?: any[];
    totalUsdValue?: number;
    totalBtcValue?: number;
    message: string;
  }> {
    try {
      // Buscar carteira
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
        include: {
          balances: {
            include: {
              asset: true
            }
          }
        }
      });

      if (!wallet) {
        return {
          success: false,
          message: 'Wallet not found'
        };
      }

      // Buscar transações pendentes se necessário
      let pendingDeposits = 0;
      let pendingWithdrawals = 0;

      if (includePending) {
        const pendingTx = await prisma.walletTransaction.findMany({
          where: {
            walletId,
            status: 'pending'
          }
        });

        pendingDeposits = pendingTx
          .filter(tx => tx.transactionType === 'deposit')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        pendingWithdrawals = pendingTx
          .filter(tx => tx.transactionType === 'withdrawal')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
      }

      // Calcular saldos atualizados
      const updatedBalances = [];
      let totalUsdValue = 0;
      let totalBtcValue = 0;

      for (const balance of wallet.balances) {
        // Buscar preços atuais
        const usdPrice = await this.assetTracker.getAssetPrice(balance.asset.symbol, 'USD');
        const btcPrice = await this.assetTracker.getAssetPrice(balance.asset.symbol, 'BTC');

        // Calcular valores
        const usdValue = Number(balance.balance) * usdPrice;
        const btcValue = Number(balance.balance) * btcPrice;

        // Atualizar saldo no banco
        await prisma.walletBalance.update({
          where: { id: balance.id },
          data: {
            usdValue,
            btcValue,
            lastUpdated: new Date()
          }
        });

        updatedBalances.push({
          id: balance.id,
          asset: balance.asset,
          balance: balance.balance,
          availableBalance: balance.availableBalance,
          lockedBalance: balance.lockedBalance,
          pendingDeposits: balance.asset.id === balance.asset.id ? pendingDeposits : 0,
          pendingWithdrawals: balance.asset.id === balance.asset.id ? pendingWithdrawals : 0,
          usdValue,
          btcValue,
          usdPrice,
          btcPrice,
          lastUpdated: new Date()
        });

        totalUsdValue += usdValue;
        totalBtcValue += btcValue;
      }

      return {
        success: true,
        balances: updatedBalances,
        totalUsdValue,
        totalBtcValue,
        message: 'Balances calculated successfully'
      };

    } catch (error) {
      console.error('Error calculating wallet balances:', error);
      return {
        success: false,
        message: 'Failed to calculate wallet balances'
      };
    }
  }

  async calculatePortfolioValue(
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
              userId: true,
              exchangeId: true
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
            wallets: [],
            percentage: 0
          };
        }

        acc[assetId].totalBalance += Number(balance.balance);
        acc[assetId].totalUsdValue += Number(balance.usdValue);
        acc[assetId].totalBtcValue += Number(balance.btcValue);
        acc[assetId].wallets.push({
          wallet: balance.wallet,
          balance: balance.balance,
          usdValue: balance.usdValue,
          btcValue: balance.btcValue
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
            totalBtcValue: 0,
            assets: {},
            percentage: 0
          };
        }

        acc[exchangeId].totalValue += Number(balance.usdValue);
        acc[exchangeId].totalBtcValue += Number(balance.btcValue);
        
        const assetId = balance.asset.id;
        if (!acc[exchangeId].assets[assetId]) {
          acc[exchangeId].assets[assetId] = {
            asset: balance.asset,
            totalBalance: 0,
            totalValue: 0,
            totalBtcValue: 0
          };
        }

        acc[exchangeId].assets[assetId].totalBalance += Number(balance.balance);
        acc[exchangeId].assets[assetId].totalValue += Number(balance.usdValue);
        acc[exchangeId].assets[assetId].totalBtcValue += Number(balance.btcValue);

        return acc;
      }, {} as any);

      // Calcular percentuais por exchange
      Object.values(exchangeBreakdown).forEach((exchange: any) => {
        exchange.percentage = totalUsdValue > 0 ? (exchange.totalValue / totalUsdValue) * 100 : 0;
      });

      const portfolio = {
        totalUsdValue,
        totalBtcValue,
        assetBreakdown: Object.values(assetBreakdown).sort((a: any, b: any) => b.totalUsdValue - a.totalUsdValue),
        exchangeBreakdown,
        lastUpdated: new Date(),
        includeAll
      };

      return {
        success: true,
        portfolio,
        message: 'Portfolio value calculated successfully'
      };

    } catch (error) {
      console.error('Error calculating portfolio value:', error);
      return {
        success: false,
        message: 'Failed to calculate portfolio value'
      };
    }
  }

  async calculatePortfolioAnalytics(
    userId: string,
    tenantId: string,
    periodDays: number = 30
  ): Promise<{
    success: boolean;
    analytics?: any;
    message: string;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Buscar snapshots do período
      const snapshots = await prisma.portfolioSnapshot.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (snapshots.length < 2) {
        return {
          success: false,
          message: 'Insufficient data for analytics calculation'
        };
      }

      const firstSnapshot = snapshots[0];
      const lastSnapshot = snapshots[snapshots.length - 1];

      // Calcular retorno total
      const totalReturn = ((lastSnapshot.totalUsdValue - firstSnapshot.totalUsdValue) / firstSnapshot.totalUsdValue) * 100;
      const totalReturnUsd = lastSnapshot.totalUsdValue - firstSnapshot.totalUsdValue;

      // Calcular volatilidade
      const returns = [];
      for (let i = 1; i < snapshots.length; i++) {
        const dailyReturn = ((snapshots[i].totalUsdValue - snapshots[i-1].totalUsdValue) / snapshots[i-1].totalUsdValue) * 100;
        returns.push(dailyReturn);
      }

      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);

      // Calcular Sharpe ratio (assumindo risk-free rate de 2%)
      const riskFreeRate = 2;
      const sharpeRatio = (avgReturn - riskFreeRate) / volatility;

      // Calcular máximo drawdown
      let maxDrawdown = 0;
      let peak = firstSnapshot.totalUsdValue;

      for (const snapshot of snapshots) {
        if (snapshot.totalUsdValue > peak) {
          peak = snapshot.totalUsdValue;
        }
        const drawdown = ((peak - snapshot.totalUsdValue) / peak) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      // Encontrar melhor e pior ativo
      const assetPerformance = this.calculateAssetPerformance(snapshots);
      const bestAsset = assetPerformance.reduce((best, current) => 
        current.return > best.return ? current : best
      );
      const worstAsset = assetPerformance.reduce((worst, current) => 
        current.return < worst.return ? current : worst
      );

      const analytics = {
        period: {
          start: startDate,
          end: endDate,
          days: periodDays
        },
        performance: {
          totalReturn,
          totalReturnUsd,
          totalValueStart: firstSnapshot.totalUsdValue,
          totalValueEnd: lastSnapshot.totalUsdValue
        },
        risk: {
          volatility,
          sharpeRatio,
          maxDrawdown
        },
        assets: {
          best: bestAsset,
          worst: worstAsset,
          all: assetPerformance
        },
        snapshots: snapshots.length
      };

      // Salvar analytics
      await prisma.portfolioAnalytics.create({
        data: {
          userId,
          tenantId,
          periodStart: startDate,
          periodEnd: endDate,
          totalValueStart: firstSnapshot.totalUsdValue,
          totalValueEnd: lastSnapshot.totalUsdValue,
          totalReturn,
          totalReturnUsd,
          bestPerformingAsset: bestAsset,
          worstPerformingAsset: worstAsset,
          volatilityScore: volatility,
          sharpeRatio,
          maxDrawdown
        }
      });

      return {
        success: true,
        analytics,
        message: 'Portfolio analytics calculated successfully'
      };

    } catch (error) {
      console.error('Error calculating portfolio analytics:', error);
      return {
        success: false,
        message: 'Failed to calculate portfolio analytics'
      };
    }
  }

  private calculateAssetPerformance(snapshots: any[]): any[] {
    const assetPerformance = new Map();

    for (const snapshot of snapshots) {
      const assetBreakdown = snapshot.assetBreakdown;
      
      for (const [assetId, assetData] of Object.entries(assetBreakdown as any)) {
        if (!assetPerformance.has(assetId)) {
          assetPerformance.set(assetId, {
            assetId,
            symbol: assetData.asset?.symbol || 'Unknown',
            values: []
          });
        }
        
        assetPerformance.get(assetId).values.push(assetData.totalUsdValue);
      }
    }

    const performance = [];
    
    for (const [assetId, data] of assetPerformance) {
      if (data.values.length >= 2) {
        const firstValue = data.values[0];
        const lastValue = data.values[data.values.length - 1];
        const returnPercent = ((lastValue - firstValue) / firstValue) * 100;
        
        performance.push({
          assetId,
          symbol: data.symbol,
          return: returnPercent,
          firstValue,
          lastValue
        });
      }
    }

    return performance.sort((a, b) => b.return - a.return);
  }
}
```

### 2. Portfolio Analyzer

```typescript
// backend/src/banco/portfolio-analyzer.ts
import { prisma } from '../db';
import { BalanceCalculator } from './balance-calculator';

export class PortfolioAnalyzer {
  private balanceCalculator: BalanceCalculator;

  constructor() {
    this.balanceCalculator = new BalanceCalculator();
  }

  async analyzePortfolio(
    userId: string,
    tenantId: string,
    analysisType: 'basic' | 'advanced' | 'risk' = 'basic'
  ): Promise<{
    success: boolean;
    analysis?: any;
    message: string;
  }> {
    try {
      // Buscar portfólio atual
      const portfolioResult = await this.balanceCalculator.calculatePortfolioValue(
        userId,
        tenantId,
        false
      );

      if (!portfolioResult.success || !portfolioResult.portfolio) {
        return {
          success: false,
          message: 'Failed to get portfolio data'
        };
      }

      const portfolio = portfolioResult.portfolio;

      // Análise básica
      const basicAnalysis = this.performBasicAnalysis(portfolio);

      let analysis: any = {
        type: analysisType,
        basic: basicAnalysis,
        generatedAt: new Date()
      };

      // Análise avançada
      if (analysisType === 'advanced' || analysisType === 'risk') {
        const advancedAnalysis = await this.performAdvancedAnalysis(portfolio, userId, tenantId);
        analysis.advanced = advancedAnalysis;
      }

      // Análise de risco
      if (analysisType === 'risk') {
        const riskAnalysis = await this.performRiskAnalysis(portfolio, userId, tenantId);
        analysis.risk = riskAnalysis;
      }

      return {
        success: true,
        analysis,
        message: 'Portfolio analysis completed successfully'
      };

    } catch (error) {
      console.error('Error analyzing portfolio:', error);
      return {
        success: false,
        message: 'Failed to analyze portfolio'
      };
    }
  }

  private performBasicAnalysis(portfolio: any): any {
    const { totalUsdValue, totalBtcValue, assetBreakdown, exchangeBreakdown } = portfolio;

    // Diversificação
    const diversification = this.calculateDiversification(assetBreakdown);

    // Concentração
    const concentration = this.calculateConcentration(assetBreakdown);

    // Distribuição por tipo de ativo
    const assetTypeDistribution = this.calculateAssetTypeDistribution(assetBreakdown);

    // Distribuição por exchange
    const exchangeDistribution = this.calculateExchangeDistribution(exchangeBreakdown);

    return {
      totalValue: {
        usd: totalUsdValue,
        btc: totalBtcValue
      },
      diversification,
      concentration,
      assetTypeDistribution,
      exchangeDistribution,
      totalAssets: assetBreakdown.length,
      totalExchanges: Object.keys(exchangeBreakdown).length
    };
  }

  private async performAdvancedAnalysis(
    portfolio: any,
    userId: string,
    tenantId: string
  ): Promise<any> {
    // Buscar histórico de preços
    const priceHistory = await this.getPriceHistory(portfolio.assetBreakdown);

    // Calcular correlações
    const correlations = this.calculateCorrelations(priceHistory);

    // Análise de performance
    const performance = await this.calculatePerformance(portfolio, userId, tenantId);

    // Análise de liquidez
    const liquidity = this.calculateLiquidity(portfolio.assetBreakdown);

    return {
      correlations,
      performance,
      liquidity,
      priceHistory: priceHistory.slice(-30) // Últimos 30 dias
    };
  }

  private async performRiskAnalysis(
    portfolio: any,
    userId: string,
    tenantId: string
  ): Promise<any> {
    // Buscar analytics históricos
    const historicalAnalytics = await prisma.portfolioAnalytics.findMany({
      where: {
        userId,
        tenantId
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calcular métricas de risco
    const riskMetrics = this.calculateRiskMetrics(historicalAnalytics);

    // Análise de stress
    const stressTest = this.performStressTest(portfolio);

    // Análise de VaR (Value at Risk)
    const varAnalysis = this.calculateVaR(historicalAnalytics);

    return {
      riskMetrics,
      stressTest,
      varAnalysis,
      historicalData: historicalAnalytics.length
    };
  }

  private calculateDiversification(assetBreakdown: any[]): any {
    const totalValue = assetBreakdown.reduce((sum, asset) => sum + asset.totalUsdValue, 0);
    
    // Herfindahl-Hirschman Index (HHI)
    const hhi = assetBreakdown.reduce((sum, asset) => {
      const percentage = (asset.totalUsdValue / totalValue) * 100;
      return sum + Math.pow(percentage, 2);
    }, 0);

    // Diversificação baseada no HHI
    let diversificationLevel = 'Low';
    if (hhi < 1500) diversificationLevel = 'High';
    else if (hhi < 2500) diversificationLevel = 'Medium';

    return {
      hhi,
      level: diversificationLevel,
      score: Math.max(0, 100 - (hhi / 100))
    };
  }

  private calculateConcentration(assetBreakdown: any[]): any {
    const sortedAssets = assetBreakdown.sort((a, b) => b.totalUsdValue - a.totalUsdValue);
    
    const top5Value = sortedAssets.slice(0, 5).reduce((sum, asset) => sum + asset.totalUsdValue, 0);
    const totalValue = assetBreakdown.reduce((sum, asset) => sum + asset.totalUsdValue, 0);
    
    const top5Percentage = (top5Value / totalValue) * 100;
    const top1Percentage = (sortedAssets[0]?.totalUsdValue / totalValue) * 100;

    return {
      top1Percentage,
      top5Percentage,
      concentrationRisk: top1Percentage > 50 ? 'High' : top5Percentage > 80 ? 'Medium' : 'Low'
    };
  }

  private calculateAssetTypeDistribution(assetBreakdown: any[]): any {
    const distribution = assetBreakdown.reduce((acc, asset) => {
      const type = asset.asset.assetType;
      if (!acc[type]) {
        acc[type] = { count: 0, value: 0, percentage: 0 };
      }
      acc[type].count++;
      acc[type].value += asset.totalUsdValue;
      return acc;
    }, {} as any);

    const totalValue = Object.values(distribution).reduce((sum: number, type: any) => sum + type.value, 0);
    
    Object.values(distribution).forEach((type: any) => {
      type.percentage = (type.value / totalValue) * 100;
    });

    return distribution;
  }

  private calculateExchangeDistribution(exchangeBreakdown: any): any {
    const distribution = Object.entries(exchangeBreakdown).map(([exchangeId, data]: [string, any]) => ({
      exchangeId,
      totalValue: data.totalValue,
      percentage: data.percentage,
      assetCount: Object.keys(data.assets).length
    }));

    return distribution.sort((a, b) => b.totalValue - a.totalValue);
  }

  private async getPriceHistory(assetBreakdown: any[]): Promise<any[]> {
    const assetIds = assetBreakdown.map(asset => asset.asset.id);
    
    const priceHistory = await prisma.assetPriceHistory.findMany({
      where: {
        assetId: { in: assetIds },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 dias
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return priceHistory;
  }

  private calculateCorrelations(priceHistory: any[]): any {
    // Implementar cálculo de correlações entre ativos
    // Simplificado para exemplo
    return {
      btc_eth: 0.85,
      btc_usdt: -0.12,
      eth_usdt: -0.08
    };
  }

  private async calculatePerformance(portfolio: any, userId: string, tenantId: string): Promise<any> {
    // Buscar snapshots dos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        userId,
        tenantId,
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (snapshots.length < 2) {
      return { insufficientData: true };
    }

    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    
    const totalReturn = ((lastSnapshot.totalUsdValue - firstSnapshot.totalUsdValue) / firstSnapshot.totalUsdValue) * 100;
    const dailyReturns = [];

    for (let i = 1; i < snapshots.length; i++) {
      const dailyReturn = ((snapshots[i].totalUsdValue - snapshots[i-1].totalUsdValue) / snapshots[i-1].totalUsdValue) * 100;
      dailyReturns.push(dailyReturn);
    }

    const avgDailyReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const volatility = Math.sqrt(dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) / dailyReturns.length);

    return {
      totalReturn,
      avgDailyReturn,
      volatility,
      sharpeRatio: avgDailyReturn / volatility,
      bestDay: Math.max(...dailyReturns),
      worstDay: Math.min(...dailyReturns)
    };
  }

  private calculateLiquidity(assetBreakdown: any[]): any {
    // Análise de liquidez baseada no volume e tipo de ativo
    const liquidityScores = assetBreakdown.map(asset => {
      let score = 50; // Base score
      
      // Ajustar baseado no tipo de ativo
      if (asset.asset.assetType === 'crypto') {
        if (['BTC', 'ETH', 'USDT', 'USDC'].includes(asset.asset.symbol)) {
          score += 30; // High liquidity
        } else {
          score += 10; // Medium liquidity
        }
      } else if (asset.asset.assetType === 'fiat') {
        score += 40; // Very high liquidity
      }

      return {
        asset: asset.asset.symbol,
        score,
        level: score > 70 ? 'High' : score > 40 ? 'Medium' : 'Low'
      };
    });

    return liquidityScores;
  }

  private calculateRiskMetrics(historicalAnalytics: any[]): any {
    if (historicalAnalytics.length === 0) {
      return { insufficientData: true };
    }

    const volatilities = historicalAnalytics.map(analytics => analytics.volatilityScore || 0);
    const sharpeRatios = historicalAnalytics.map(analytics => analytics.sharpeRatio || 0);
    const maxDrawdowns = historicalAnalytics.map(analytics => analytics.maxDrawdown || 0);

    return {
      avgVolatility: volatilities.reduce((sum, vol) => sum + vol, 0) / volatilities.length,
      avgSharpeRatio: sharpeRatios.reduce((sum, ratio) => sum + ratio, 0) / sharpeRatios.length,
      maxDrawdown: Math.max(...maxDrawdowns),
      riskLevel: this.determineRiskLevel(volatilities, maxDrawdowns)
    };
  }

  private determineRiskLevel(volatilities: number[], maxDrawdowns: number[]): string {
    const avgVolatility = volatilities.reduce((sum, vol) => sum + vol, 0) / volatilities.length;
    const maxDrawdown = Math.max(...maxDrawdowns);

    if (avgVolatility > 30 || maxDrawdown > 50) return 'High';
    if (avgVolatility > 15 || maxDrawdown > 25) return 'Medium';
    return 'Low';
  }

  private performStressTest(portfolio: any): any {
    // Simular cenários de stress
    const scenarios = [
      { name: 'Market Crash (-50%)', multiplier: 0.5 },
      { name: 'Correction (-20%)', multiplier: 0.8 },
      { name: 'Volatility Spike (+100%)', multiplier: 1.0, volatility: 2.0 }
    ];

    return scenarios.map(scenario => ({
      name: scenario.name,
      impact: portfolio.totalUsdValue * (scenario.multiplier - 1),
      newValue: portfolio.totalUsdValue * scenario.multiplier
    }));
  }

  private calculateVaR(historicalAnalytics: any[]): any {
    if (historicalAnalytics.length < 10) {
      return { insufficientData: true };
    }

    // Calcular VaR 95% e 99%
    const returns = historicalAnalytics.map(analytics => analytics.totalReturn || 0);
    const sortedReturns = returns.sort((a, b) => a - b);
    
    const var95Index = Math.floor(sortedReturns.length * 0.05);
    const var99Index = Math.floor(sortedReturns.length * 0.01);

    return {
      var95: sortedReturns[var95Index],
      var99: sortedReturns[var99Index],
      confidence: 'Based on historical data'
    };
  }
}
```

### 3. Security Manager

```typescript
// backend/src/banco/security-manager.ts
import { prisma } from '../db';
import { AuditLogger } from '../audit/audit-logger';

export class SecurityManager {
  private auditLogger: AuditLogger;

  constructor() {
    this.auditLogger = new AuditLogger();
  }

  async createWalletSecuritySettings(
    walletId: string,
    settings: {
      twoFactorRequired?: boolean;
      withdrawalLimits?: {
        daily?: number;
        weekly?: number;
        monthly?: number;
      };
      ipWhitelist?: string[];
      allowedOperations?: string[];
      autoLockEnabled?: boolean;
      autoLockDuration?: number;
    },
    context: any
  ): Promise<{
    success: boolean;
    settingsId?: string;
    message: string;
  }> {
    try {
      // Validar carteira
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId }
      });

      if (!wallet) {
        return {
          success: false,
          message: 'Wallet not found'
        };
      }

      // Criar configurações de segurança
      const securitySettings = await prisma.walletSecuritySetting.create({
        data: {
          walletId,
          twoFactorRequired: settings.twoFactorRequired || false,
          withdrawalLimits: settings.withdrawalLimits || {},
          ipWhitelist: settings.ipWhitelist || [],
          allowedOperations: settings.allowedOperations || ['deposit', 'withdrawal', 'transfer'],
          autoLockEnabled: settings.autoLockEnabled || false,
          autoLockDuration: settings.autoLockDuration || 0
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'create',
        resourceType: 'security_settings',
        resourceId: securitySettings.id,
        module: 'banco',
        description: 'Created wallet security settings',
        newValues: settings,
        metadata: { walletId }
      }, context);

      return {
        success: true,
        settingsId: securitySettings.id,
        message: 'Security settings created successfully'
      };

    } catch (error) {
      console.error('Error creating wallet security settings:', error);
      return {
        success: false,
        message: 'Failed to create security settings'
      };
    }
  }

  async validateTransaction(
    walletId: string,
    transactionType: string,
    amount: number,
    context: any
  ): Promise<{
    success: boolean;
    allowed: boolean;
    reason?: string;
    message: string;
  }> {
    try {
      // Buscar configurações de segurança
      const securitySettings = await prisma.walletSecuritySetting.findUnique({
        where: { walletId }
      });

      if (!securitySettings) {
        return {
          success: true,
          allowed: true,
          message: 'No security restrictions'
        };
      }

      // Verificar operações permitidas
      if (!securitySettings.allowedOperations.includes(transactionType)) {
        return {
          success: true,
          allowed: false,
          reason: 'Operation not allowed',
          message: `Transaction type ${transactionType} is not allowed for this wallet`
        };
      }

      // Verificar limites de saque
      if (transactionType === 'withdrawal') {
        const limits = securitySettings.withdrawalLimits as any;
        
        // Verificar limite diário
        if (limits.daily) {
          const dailyWithdrawals = await this.getDailyWithdrawals(walletId);
          if (dailyWithdrawals + amount > limits.daily) {
            return {
              success: true,
              allowed: false,
              reason: 'Daily withdrawal limit exceeded',
              message: `Daily withdrawal limit is ${limits.daily}, attempted ${dailyWithdrawals + amount}`
            };
          }
        }

        // Verificar limite semanal
        if (limits.weekly) {
          const weeklyWithdrawals = await this.getWeeklyWithdrawals(walletId);
          if (weeklyWithdrawals + amount > limits.weekly) {
            return {
              success: true,
              allowed: false,
              reason: 'Weekly withdrawal limit exceeded',
              message: `Weekly withdrawal limit is ${limits.weekly}, attempted ${weeklyWithdrawals + amount}`
            };
          }
        }

        // Verificar limite mensal
        if (limits.monthly) {
          const monthlyWithdrawals = await this.getMonthlyWithdrawals(walletId);
          if (monthlyWithdrawals + amount > limits.monthly) {
            return {
              success: true,
              allowed: false,
              reason: 'Monthly withdrawal limit exceeded',
              message: `Monthly withdrawal limit is ${limits.monthly}, attempted ${monthlyWithdrawals + amount}`
            };
          }
        }
      }

      // Verificar whitelist de IP
      if (securitySettings.ipWhitelist.length > 0) {
        const clientIP = context.ipAddress;
        if (!securitySettings.ipWhitelist.includes(clientIP)) {
          return {
            success: true,
            allowed: false,
            reason: 'IP not whitelisted',
            message: `IP ${clientIP} is not in the whitelist`
          };
        }
      }

      // Verificar 2FA se necessário
      if (securitySettings.twoFactorRequired && !context.twoFactorVerified) {
        return {
          success: true,
          allowed: false,
          reason: 'Two-factor authentication required',
          message: 'Two-factor authentication is required for this transaction'
        };
      }

      return {
        success: true,
        allowed: true,
        message: 'Transaction validation passed'
      };

    } catch (error) {
      console.error('Error validating transaction:', error);
      return {
        success: false,
        allowed: false,
        message: 'Failed to validate transaction'
      };
    }
  }

  async updateLastActivity(walletId: string): Promise<void> {
    await prisma.walletSecuritySetting.update({
      where: { walletId },
      data: { lastActivity: new Date() }
    });
  }

  private async getDailyWithdrawals(walletId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const withdrawals = await prisma.walletTransaction.findMany({
      where: {
        walletId,
        transactionType: 'withdrawal',
        status: 'confirmed',
        createdAt: { gte: today }
      }
    });

    return withdrawals.reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  private async getWeeklyWithdrawals(walletId: string): Promise<number> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const withdrawals = await prisma.walletTransaction.findMany({
      where: {
        walletId,
        transactionType: 'withdrawal',
        status: 'confirmed',
        createdAt: { gte: weekAgo }
      }
    });

    return withdrawals.reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  private async getMonthlyWithdrawals(walletId: string): Promise<number> {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const withdrawals = await prisma.walletTransaction.findMany({
      where: {
        walletId,
        transactionType: 'withdrawal',
        status: 'confirmed',
        createdAt: { gte: monthAgo }
      }
    });

    return withdrawals.reduce((sum, tx) => sum + Number(tx.amount), 0);
  }
}
```

## 🔧 APIs Específicas para Carteiras

### 1. Wallet Security APIs

#### POST /api/banco/wallets/{walletId}/security
Configurar segurança da carteira

```typescript
interface CreateSecuritySettingsRequest {
  twoFactorRequired?: boolean;
  withdrawalLimits?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  ipWhitelist?: string[];
  allowedOperations?: string[];
  autoLockEnabled?: boolean;
  autoLockDuration?: number;
}

interface CreateSecuritySettingsResponse {
  success: boolean;
  settingsId?: string;
  message: string;
}
```

#### GET /api/banco/wallets/{walletId}/security
Obter configurações de segurança

```typescript
interface GetSecuritySettingsResponse {
  success: boolean;
  settings?: {
    id: string;
    twoFactorRequired: boolean;
    withdrawalLimits: any;
    ipWhitelist: string[];
    allowedOperations: string[];
    autoLockEnabled: boolean;
    autoLockDuration: number;
    lastActivity?: string;
  };
  message: string;
}
```

### 2. Portfolio Analytics APIs

#### GET /api/banco/portfolio/analytics
Obter análise do portfólio

```typescript
interface GetPortfolioAnalyticsRequest {
  analysisType?: 'basic' | 'advanced' | 'risk';
  periodDays?: number;
}

interface GetPortfolioAnalyticsResponse {
  success: boolean;
  analysis?: {
    type: string;
    basic: any;
    advanced?: any;
    risk?: any;
    generatedAt: string;
  };
  message: string;
}
```

#### GET /api/banco/portfolio/analytics/history
Obter histórico de analytics

```typescript
interface GetAnalyticsHistoryResponse {
  success: boolean;
  analytics?: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    totalReturn: number;
    totalReturnUsd: number;
    volatilityScore: number;
    sharpeRatio: number;
    maxDrawdown: number;
    createdAt: string;
  }>;
  message: string;
}
```

## 🧪 Testes Específicos

### Testes de Balance Calculator

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
      // Criar dados de teste
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

      const result = await balanceCalculator.calculateWalletBalances(wallet.id);

      expect(result.success).toBe(true);
      expect(result.balances).toHaveLength(1);
      expect(result.balances![0].balance).toBe(1.5);
      expect(result.totalUsdValue).toBeGreaterThan(0);
    });
  });
});
```

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Criar tabelas específicas para carteiras
- [ ] Configurar sistema de segurança
- [ ] Configurar analytics de portfólio
- [ ] Configurar rastreamento de preços

### ✅ Funcionalidades
- [ ] Calculadora de saldos
- [ ] Analisador de portfólio
- [ ] Gerenciador de segurança
- [ ] Sistema de analytics

### ✅ APIs
- [ ] APIs de segurança de carteiras
- [ ] APIs de analytics de portfólio
- [ ] APIs de histórico
- [ ] APIs de validação

### ✅ Testes
- [ ] Testes de calculadora de saldos
- [ ] Testes de analisador de portfólio
- [ ] Testes de segurança
- [ ] Testes de analytics

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO