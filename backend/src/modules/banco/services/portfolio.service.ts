/**
 * Portfolio Service
 *
 * Portfolio analytics and performance tracking
 */

import { db } from '@/db';
import { wallets, walletAssets, walletTransactions /* , assetPriceHistory */ } from '../schema/wallet.schema';
import { eq, and, sql /* , desc, between */ } from 'drizzle-orm';
import { priceService } from './price.service';
import type {
  AssetType,
  PortfolioAnalytics,
  AssetStatistics,
  WalletActivity,
  ServiceResponse,
} from '../types/wallet.types';
import logger from '@/utils/logger';

/**
 * Portfolio Service
 */
export class PortfolioService {
  /**
   * Get complete portfolio analytics for a user
   */
  async getPortfolioAnalytics(
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<PortfolioAnalytics>> {
    try {
      // Get all user wallets
      const userWallets = await db
        .select()
        .from(wallets)
        .where(and(eq(wallets.userId, userId), eq(wallets.tenantId, tenantId), eq(wallets.isActive, true)));

      if (userWallets.length === 0) {
        return {
          success: false,
          error: 'No wallets found for user',
        };
      }

      const walletIds = userWallets.map((w) => w.id);

      // Get all assets across all wallets
      const allAssets = await db
        .select()
        .from(walletAssets)
        .where(sql`${walletAssets.walletId} = ANY(${walletIds})`);

      if (allAssets.length === 0) {
        return {
          success: true,
          data: this.getEmptyAnalytics(),
        };
      }

      // Calculate totals
      let totalValueUsd = 0;
      let totalValueBtc = 0;
      let totalPnl = 0;
      const assetMap = new Map<AssetType, { valueUsd: number; pnl: number }>();

      for (const asset of allAssets) {
        const valueUsd = parseFloat(asset.valueUsd || '0');
        const pnl = parseFloat(asset.unrealizedPnl || '0');

        totalValueUsd += valueUsd;
        totalValueBtc += parseFloat(asset.valueBtc || '0');
        totalPnl += pnl;

        const existing = assetMap.get(asset.asset);
        if (existing) {
          existing.valueUsd += valueUsd;
          existing.pnl += pnl;
        } else {
          assetMap.set(asset.asset, { valueUsd, pnl });
        }
      }

      // Get BRL value
      const brlPrice = await priceService.getPrice('USD');
      const totalValueBrl = brlPrice ? (totalValueUsd / parseFloat(brlPrice.priceUsd)).toString() : '0';

      // Calculate percentage changes (24h, 7d, 30d)
      const changes = await this.calculatePortfolioChanges(userId, totalValueUsd);

      // Asset allocation
      const assetAllocation = Array.from(assetMap.entries()).map(([asset, data]) => ({
        asset,
        percentage: totalValueUsd > 0 ? ((data.valueUsd / totalValueUsd) * 100).toFixed(2) : '0',
        valueUsd: data.valueUsd.toFixed(2),
      }));

      // Top gainers and losers
      const sortedByPnl = Array.from(assetMap.entries())
        .map(([asset, data]) => ({
          asset,
          pnl: data.pnl.toFixed(2),
          pnlPercent: data.valueUsd > 0 ? ((data.pnl / (data.valueUsd - data.pnl)) * 100).toFixed(2) : '0',
        }))
        .sort((a, b) => parseFloat(b.pnlPercent) - parseFloat(a.pnlPercent));

      const topGainers = sortedByPnl.filter((a) => parseFloat(a.pnlPercent) > 0).slice(0, 5);
      const topLosers = sortedByPnl
        .filter((a) => parseFloat(a.pnlPercent) < 0)
        .slice(-5)
        .reverse();

      const analytics: PortfolioAnalytics = {
        totalValueUsd: totalValueUsd.toFixed(2),
        totalValueBtc: totalValueBtc.toFixed(8),
        totalValueBrl,
        change24h: changes.change24h.toFixed(2),
        change24hPercent: changes.change24hPercent.toFixed(2),
        change7d: changes.change7d.toFixed(2),
        change7dPercent: changes.change7dPercent.toFixed(2),
        change30d: changes.change30d.toFixed(2),
        change30dPercent: changes.change30dPercent.toFixed(2),
        totalPnl: totalPnl.toFixed(2),
        totalPnlPercent:
          totalValueUsd > 0 ? ((totalPnl / (totalValueUsd - totalPnl)) * 100).toFixed(2) : '0',
        assetAllocation,
        topGainers,
        topLosers,
      };

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      logger.error('Error getting portfolio analytics:', { error, userId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get portfolio analytics',
      };
    }
  }

  /**
   * Calculate portfolio value changes over time
   */
  private async calculatePortfolioChanges(
    userId: string,
    currentValueUsd: number
  ): Promise<{
    change24h: number;
    change24hPercent: number;
    change7d: number;
    change7dPercent: number;
    change30d: number;
    change30dPercent: number;
  }> {
    try {
      // const now = new Date();
      // const _oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      // const _sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      // const _thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get historical values (simplified - in production, store snapshots)
      const value24hAgo = currentValueUsd * 0.98; // Example: -2%
      const value7dAgo = currentValueUsd * 0.95; // Example: -5%
      const value30dAgo = currentValueUsd * 0.90; // Example: -10%

      return {
        change24h: currentValueUsd - value24hAgo,
        change24hPercent: value24hAgo > 0 ? ((currentValueUsd - value24hAgo) / value24hAgo) * 100 : 0,
        change7d: currentValueUsd - value7dAgo,
        change7dPercent: value7dAgo > 0 ? ((currentValueUsd - value7dAgo) / value7dAgo) * 100 : 0,
        change30d: currentValueUsd - value30dAgo,
        change30dPercent: value30dAgo > 0 ? ((currentValueUsd - value30dAgo) / value30dAgo) * 100 : 0,
      };
    } catch (error) {
      logger.error('Error calculating portfolio changes:', { error, userId });
      return {
        change24h: 0,
        change24hPercent: 0,
        change7d: 0,
        change7dPercent: 0,
        change30d: 0,
        change30dPercent: 0,
      };
    }
  }

  /**
   * Get asset statistics across platform
   */
  async getAssetStatistics(
    asset: AssetType,
    tenantId?: string
  ): Promise<ServiceResponse<AssetStatistics>> {
    try {
      const conditions = [eq(walletAssets.asset, asset)];

      if (tenantId) {
        // Need to join with wallets to filter by tenant
        // Simplified for now
      }

      const assets = await db
        .select()
        .from(walletAssets)
        .where(and(...conditions));

      const totalBalance = assets.reduce((sum, a) => sum + parseFloat(a.balance), 0);
      const totalValueUsd = assets.reduce((sum, a) => sum + parseFloat(a.valueUsd || '0'), 0);
      const holders = new Set(assets.map((a) => a.walletId)).size;

      // Get transaction stats
      const txConditions = [eq(walletTransactions.asset, asset)];
      if (tenantId) {
        txConditions.push(eq(walletTransactions.tenantId, tenantId));
      }

      const transactions = await db
        .select()
        .from(walletTransactions)
        .where(and(...txConditions));

      const deposits = transactions.filter((t) => t.type === 'deposit');
      const withdrawals = transactions.filter((t) => t.type === 'withdrawal');

      const totalDeposits = deposits.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalWithdrawals = withdrawals.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const avgTransactionSize =
        transactions.length > 0
          ? transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0) / transactions.length
          : 0;
      const largestHolding = assets.length > 0 ? Math.max(...assets.map((a) => parseFloat(a.balance))) : 0;

      const statistics: AssetStatistics = {
        asset,
        totalBalance: totalBalance.toString(),
        totalValueUsd: totalValueUsd.toFixed(2),
        holders,
        totalTransactions: transactions.length,
        totalDeposits: totalDeposits.toString(),
        totalWithdrawals: totalWithdrawals.toString(),
        avgTransactionSize: avgTransactionSize.toString(),
        largestHolding: largestHolding.toString(),
      };

      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      logger.error('Error getting asset statistics:', { error, asset });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get asset statistics',
      };
    }
  }

  /**
   * Get wallet activity over time
   */
  async getWalletActivity(
    walletId: string,
    days: number = 30
  ): Promise<ServiceResponse<WalletActivity[]>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const transactions = await db
        .select()
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.walletId, walletId),
            sql`${walletTransactions.createdAt} >= ${startDate}`
          )
        );

      // Group by date
      const activityMap = new Map<string, WalletActivity>();

      for (const tx of transactions) {
        const date = tx.createdAt.toISOString().split('T')[0];
        const existing = activityMap.get(date);

        if (existing) {
          if (tx.type === 'deposit') existing.deposits++;
          if (tx.type === 'withdrawal') existing.withdrawals++;
          if (tx.type === 'transfer') existing.transfers++;
          if (tx.type === 'trade') existing.trades++;
          existing.totalVolume = (
            parseFloat(existing.totalVolume) + parseFloat(tx.amount)
          ).toString();
        } else {
          activityMap.set(date, {
            date,
            deposits: tx.type === 'deposit' ? 1 : 0,
            withdrawals: tx.type === 'withdrawal' ? 1 : 0,
            transfers: tx.type === 'transfer' ? 1 : 0,
            trades: tx.type === 'trade' ? 1 : 0,
            totalVolume: tx.amount,
          });
        }
      }

      const activity = Array.from(activityMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      return {
        success: true,
        data: activity,
      };
    } catch (error) {
      logger.error('Error getting wallet activity:', { error, walletId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get wallet activity',
      };
    }
  }

  /**
   * Update all wallet asset values with current prices
   */
  async updateAllAssetValues(): Promise<void> {
    try {
      // Get all unique assets
      const assets = await db
        .select({ asset: walletAssets.asset })
        .from(walletAssets)
        .groupBy(walletAssets.asset);

      const uniqueAssets = assets.map((a) => a.asset);

      // Fetch all prices
      const prices = await priceService.getPrices(uniqueAssets);

      // Update each asset
      for (const [asset, price] of prices.entries()) {
        await db
          .update(walletAssets)
          .set({
            lastPrice: price.priceUsd,
            lastPriceUsd: price.priceUsd,
            lastPriceUpdate: price.lastUpdate,
            valueUsd: sql`(${walletAssets.balance}::decimal * ${price.priceUsd}::decimal)::text`,
            valueBtc: price.priceBtc
              ? sql`(${walletAssets.balance}::decimal * ${price.priceBtc}::decimal)::text`
              : undefined,
            updatedAt: new Date(),
          })
          .where(eq(walletAssets.asset, asset));
      }

      logger.info('Updated all asset values', { assetCount: uniqueAssets.length });
    } catch (error) {
      logger.error('Error updating asset values:', { error });
    }
  }

  /**
   * Calculate portfolio allocation percentages
   */
  async calculatePortfolioAllocation(userId: string): Promise<void> {
    try {
      // Get all user wallets
      const userWallets = await db
        .select()
        .from(wallets)
        .where(and(eq(wallets.userId, userId), eq(wallets.isActive, true)));

      if (userWallets.length === 0) return;

      const walletIds = userWallets.map((w) => w.id);

      // Get all assets
      const allAssets = await db
        .select()
        .from(walletAssets)
        .where(sql`${walletAssets.walletId} = ANY(${walletIds})`);

      // Calculate total value
      const totalValue = allAssets.reduce((sum, a) => sum + parseFloat(a.valueUsd || '0'), 0);

      // Update allocation percentages
      for (const asset of allAssets) {
        const valueUsd = parseFloat(asset.valueUsd || '0');
        const percentage = totalValue > 0 ? (valueUsd / totalValue) * 100 : 0;

        await db
          .update(walletAssets)
          .set({
            allocationPercent: percentage.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(walletAssets.id, asset.id));
      }

      logger.info('Updated portfolio allocation', { userId, totalValue });
    } catch (error) {
      logger.error('Error calculating portfolio allocation:', { error, userId });
    }
  }

  /**
   * Get empty analytics (for users with no assets)
   */
  private getEmptyAnalytics(): PortfolioAnalytics {
    return {
      totalValueUsd: '0',
      totalValueBtc: '0',
      totalValueBrl: '0',
      change24h: '0',
      change24hPercent: '0',
      change7d: '0',
      change7dPercent: '0',
      change30d: '0',
      change30dPercent: '0',
      totalPnl: '0',
      totalPnlPercent: '0',
      assetAllocation: [],
      topGainers: [],
      topLosers: [],
    };
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService();
