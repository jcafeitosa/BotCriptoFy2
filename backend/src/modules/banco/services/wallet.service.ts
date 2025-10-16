/**
 * Wallet Service
 *
 * Main service for wallet operations: create, deposit, withdraw, transfer
 */

import { db } from '@/db';
import {
  wallets,
  walletAssets,
  walletTransactions,
  withdrawalRequests,
  type Wallet,
  type WalletAsset,
  type WalletTransaction,
  type WithdrawalRequest,
} from '../schema/wallet.schema';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { priceService } from './price.service';
import { logAuditEvent } from '@/modules/audit/services/audit-logger.service';
import type {
  CreateWalletRequest,
  CreateWalletResponse,
  DepositRequest,
  CreateWithdrawalRequest,
  TransferRequest,
  BalanceResponse,
  WalletSummary,
  ServiceResponse,
  TransactionFilter,
  WithdrawalApprovalRequest,
} from '../types/wallet.types';
import logger from '@/utils/logger';

/**
 * Wallet Service
 */
export class WalletService {
  /**
   * Create a new wallet
   */
  async createWallet(request: CreateWalletRequest): Promise<CreateWalletResponse> {
    try {
      // Check if wallet type already exists for user
      const existing = await db
        .select()
        .from(wallets)
        .where(and(eq(wallets.userId, request.userId), eq(wallets.type, request.type)))
        .limit(1);

      if (existing.length > 0) {
        return {
          success: false,
          error: `Wallet type ${request.type} already exists for this user`,
        };
      }

      // Create wallet
      const [wallet] = await db
        .insert(wallets)
        .values({
          userId: request.userId,
          tenantId: request.tenantId,
          name: request.name,
          type: request.type,
          description: request.description,
          metadata: request.metadata as any,
        })
        .returning();

      // Audit log
      await logAuditEvent({
        eventType: 'system.warning', // Will create 'wallet.created' event type later
        severity: 'medium',
        status: 'success',
        userId: request.userId,
        tenantId: request.tenantId,
        resource: 'wallets',
        resourceId: wallet.id,
        action: 'create',
        metadata: {
          walletType: request.type,
          walletName: request.name,
        },
      });

      logger.info(`Wallet created: ${wallet.id}`, {
        userId: request.userId,
        type: request.type,
      });

      return {
        success: true,
        wallet,
      };
    } catch (error) {
      logger.error('Error creating wallet:', { error, request });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create wallet',
      };
    }
  }

  /**
   * Process a deposit
   */
  async processDeposit(request: DepositRequest): Promise<ServiceResponse<WalletTransaction>> {
    try {
      // Verify wallet exists and belongs to user
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(and(eq(wallets.id, request.walletId), eq(wallets.userId, request.userId)))
        .limit(1);

      if (!wallet) {
        throw new Error('Wallet not found or access denied');
      }

      if (!wallet.isActive || wallet.isLocked) {
        throw new Error('Wallet is not active or is locked');
      }

      // Create transaction record
      const [transaction] = await db
        .insert(walletTransactions)
        .values({
          walletId: request.walletId,
          userId: request.userId,
          tenantId: request.tenantId,
          type: 'deposit',
          asset: request.asset,
          amount: request.amount.toString(),
          status: 'completed',
          fromAddress: request.fromAddress,
          txHash: request.txHash,
          blockchainNetwork: request.network,
          metadata: request.metadata as any,
          processedAt: new Date(),
        })
        .returning();

      // Update or create wallet asset
      await this.updateWalletAssetBalance(
        request.walletId,
        request.asset,
        request.amount,
        'add'
      );

      // Audit log
      await logAuditEvent({
        eventType: 'financial.transaction_created',
        severity: 'high',
        status: 'success',
        userId: request.userId,
        tenantId: request.tenantId,
        resource: 'wallet_transactions',
        resourceId: transaction.id,
        action: 'deposit',
        metadata: {
          walletId: request.walletId,
          asset: request.asset,
          amount: request.amount,
          txHash: request.txHash,
        },
      });

      logger.info(`Deposit processed: ${transaction.id}`, {
        userId: request.userId,
        asset: request.asset,
        amount: request.amount,
      });

      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      logger.error('Error processing deposit:', { error, request });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process deposit',
      };
    }
  }

  /**
   * Create withdrawal request
   */
  async createWithdrawal(
    request: CreateWithdrawalRequest
  ): Promise<ServiceResponse<WithdrawalRequest>> {
    try {
      // Verify wallet and check balance
      const balance = await this.getAssetBalance(request.walletId, request.asset);

      if (!balance) {
        throw new Error('Asset not found in wallet');
      }

      const availableBalance = parseFloat(balance.availableBalance);
      if (availableBalance < request.amount) {
        throw new Error(
          `Insufficient balance. Available: ${availableBalance}, Requested: ${request.amount}`
        );
      }

      // Calculate fees (example: 0.5% platform fee)
      const platformFee = request.amount * 0.005;
      const networkFee = 0; // Should be calculated based on blockchain network
      const totalFee = platformFee + networkFee;

      // Create withdrawal request
      const [withdrawal] = await db
        .insert(withdrawalRequests)
        .values({
          userId: request.userId,
          tenantId: request.tenantId,
          walletId: request.walletId,
          asset: request.asset,
          amount: request.amount.toString(),
          destinationAddress: request.destinationAddress,
          network: request.network,
          platformFee: platformFee.toString(),
          networkFee: networkFee.toString(),
          totalFee: totalFee.toString(),
          status: 'pending',
          requiresApproval: true,
          twoFactorVerified: !!request.twoFactorCode,
          notes: request.notes,
        })
        .returning();

      // Lock the balance
      await this.updateWalletAssetBalance(request.walletId, request.asset, request.amount, 'lock');

      // Audit log
      await logAuditEvent({
        eventType: 'financial.transaction_created',
        severity: 'high',
        status: 'success',
        userId: request.userId,
        tenantId: request.tenantId,
        resource: 'withdrawal_requests',
        resourceId: withdrawal.id,
        action: 'withdrawal_request',
        metadata: {
          walletId: request.walletId,
          asset: request.asset,
          amount: request.amount,
          destinationAddress: request.destinationAddress,
          totalFee,
        },
      });

      logger.info(`Withdrawal request created: ${withdrawal.id}`, {
        userId: request.userId,
        asset: request.asset,
        amount: request.amount,
      });

      return {
        success: true,
        data: withdrawal,
      };
    } catch (error) {
      logger.error('Error creating withdrawal:', { error, request });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create withdrawal',
      };
    }
  }

  /**
   * Approve or reject withdrawal
   */
  async approveWithdrawal(
    request: WithdrawalApprovalRequest
  ): Promise<ServiceResponse<WithdrawalRequest>> {
    try {
      const [withdrawal] = await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.id, request.withdrawalId))
        .limit(1);

      if (!withdrawal) {
        throw new Error('Withdrawal request not found');
      }

      if (withdrawal.status !== 'pending') {
        throw new Error(`Withdrawal is already ${withdrawal.status}`);
      }

      if (request.approved) {
        // Approve and process withdrawal
        const [updated] = await db
          .update(withdrawalRequests)
          .set({
            status: 'approved',
            approvedBy: request.approverId,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(withdrawalRequests.id, request.withdrawalId))
          .returning();

        // Process the actual withdrawal (create transaction)
        await this.executeWithdrawal(updated);

        // Audit log
        await logAuditEvent({
          eventType: 'financial.payment_processed',
          severity: 'high',
          status: 'success',
          userId: withdrawal.userId,
          tenantId: withdrawal.tenantId,
          resource: 'withdrawal_requests',
          resourceId: withdrawal.id,
          action: 'withdrawal_approved',
          metadata: {
            approvedBy: request.approverId,
            amount: withdrawal.amount,
            asset: withdrawal.asset,
          },
        });

        return {
          success: true,
          data: updated,
        };
      } else {
        // Reject withdrawal
        const [updated] = await db
          .update(withdrawalRequests)
          .set({
            status: 'rejected',
            rejectedBy: request.approverId,
            rejectedAt: new Date(),
            rejectionReason: request.reason,
            updatedAt: new Date(),
          })
          .where(eq(withdrawalRequests.id, request.withdrawalId))
          .returning();

        // Unlock the balance
        await this.updateWalletAssetBalance(
          withdrawal.walletId,
          withdrawal.asset,
          parseFloat(withdrawal.amount),
          'unlock'
        );

        // Audit log
        await logAuditEvent({
          eventType: 'financial.payment_failed',
          severity: 'medium',
          status: 'failure',
          userId: withdrawal.userId,
          tenantId: withdrawal.tenantId,
          resource: 'withdrawal_requests',
          resourceId: withdrawal.id,
          action: 'withdrawal_rejected',
          metadata: {
            rejectedBy: request.approverId,
            reason: request.reason,
          },
        });

        return {
          success: true,
          data: updated,
        };
      }
    } catch (error) {
      logger.error('Error approving withdrawal:', { error, request });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve withdrawal',
      };
    }
  }

  /**
   * Execute approved withdrawal
   */
  private async executeWithdrawal(withdrawal: WithdrawalRequest): Promise<void> {
    try {
      // Create transaction record
      const [transaction] = await db
        .insert(walletTransactions)
        .values({
          walletId: withdrawal.walletId,
          userId: withdrawal.userId,
          tenantId: withdrawal.tenantId,
          type: 'withdrawal',
          asset: withdrawal.asset,
          amount: withdrawal.amount,
          fee: withdrawal.totalFee,
          status: 'completed',
          toAddress: withdrawal.destinationAddress,
          blockchainNetwork: withdrawal.network,
          processedAt: new Date(),
        })
        .returning();

      // Link transaction to withdrawal
      await db
        .update(withdrawalRequests)
        .set({
          transactionId: transaction.id,
          status: 'completed',
          processedAt: new Date(),
        })
        .where(eq(withdrawalRequests.id, withdrawal.id));

      // Deduct from balance (unlock and subtract)
      await this.updateWalletAssetBalance(
        withdrawal.walletId,
        withdrawal.asset,
        parseFloat(withdrawal.amount),
        'subtract'
      );

      logger.info(`Withdrawal executed: ${withdrawal.id}`, {
        transactionId: transaction.id,
      });
    } catch (error) {
      logger.error('Error executing withdrawal:', { error, withdrawalId: withdrawal.id });
      throw error;
    }
  }

  /**
   * Transfer between wallets
   */
  async transfer(request: TransferRequest): Promise<ServiceResponse<WalletTransaction>> {
    try {
      // Verify source wallet
      const [fromWallet] = await db
        .select()
        .from(wallets)
        .where(and(eq(wallets.id, request.fromWalletId), eq(wallets.userId, request.userId)))
        .limit(1);

      if (!fromWallet) {
        throw new Error('Source wallet not found or access denied');
      }

      // Verify destination wallet exists
      const [toWallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, request.toWalletId))
        .limit(1);

      if (!toWallet) {
        throw new Error('Destination wallet not found');
      }

      // Check balance
      const balance = await this.getAssetBalance(request.fromWalletId, request.asset);
      if (!balance || parseFloat(balance.availableBalance) < request.amount) {
        throw new Error('Insufficient balance');
      }

      // Create transaction record
      const [transaction] = await db
        .insert(walletTransactions)
        .values({
          walletId: request.fromWalletId,
          userId: request.userId,
          tenantId: request.tenantId,
          type: 'transfer',
          asset: request.asset,
          amount: request.amount.toString(),
          status: 'completed',
          fromWalletId: request.fromWalletId,
          toWalletId: request.toWalletId,
          description: request.description,
          processedAt: new Date(),
        })
        .returning();

      // Update balances
      await this.updateWalletAssetBalance(request.fromWalletId, request.asset, request.amount, 'subtract');
      await this.updateWalletAssetBalance(request.toWalletId, request.asset, request.amount, 'add');

      // Audit log
      await logAuditEvent({
        eventType: 'financial.transaction_created',
        severity: 'medium',
        status: 'success',
        userId: request.userId,
        tenantId: request.tenantId,
        resource: 'wallet_transactions',
        resourceId: transaction.id,
        action: 'transfer',
        metadata: {
          fromWalletId: request.fromWalletId,
          toWalletId: request.toWalletId,
          asset: request.asset,
          amount: request.amount,
        },
      });

      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      logger.error('Error processing transfer:', { error, request });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process transfer',
      };
    }
  }

  /**
   * Get asset balance
   */
  async getAssetBalance(walletId: string, asset: string): Promise<BalanceResponse | null> {
    try {
      const [walletAsset] = await db
        .select()
        .from(walletAssets)
        .where(and(eq(walletAssets.walletId, walletId), eq(walletAssets.asset, asset)))
        .limit(1);

      if (!walletAsset) {
        return null;
      }

      return {
        asset: walletAsset.asset,
        balance: walletAsset.balance,
        availableBalance: walletAsset.availableBalance,
        lockedBalance: walletAsset.lockedBalance,
        valueUsd: walletAsset.valueUsd || undefined,
        valueBtc: walletAsset.valueBtc || undefined,
        allocationPercent: walletAsset.allocationPercent || undefined,
        unrealizedPnl: walletAsset.unrealizedPnl || undefined,
        unrealizedPnlPercent: walletAsset.unrealizedPnlPercent || undefined,
      };
    } catch (error) {
      logger.error('Error getting asset balance:', { error, walletId, asset });
      return null;
    }
  }

  /**
   * Get wallet summary
   */
  async getWalletSummary(walletId: string): Promise<WalletSummary | null> {
    try {
      const [wallet] = await db.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);

      if (!wallet) {
        return null;
      }

      const assets = await db.select().from(walletAssets).where(eq(walletAssets.walletId, walletId));

      const balances: BalanceResponse[] = assets.map((asset) => ({
        asset: asset.asset,
        balance: asset.balance,
        availableBalance: asset.availableBalance,
        lockedBalance: asset.lockedBalance,
        valueUsd: asset.valueUsd || undefined,
        valueBtc: asset.valueBtc || undefined,
        allocationPercent: asset.allocationPercent || undefined,
        unrealizedPnl: asset.unrealizedPnl || undefined,
        unrealizedPnlPercent: asset.unrealizedPnlPercent || undefined,
      }));

      const totalValueUsd = assets.reduce((sum, a) => sum + parseFloat(a.valueUsd || '0'), 0);
      const totalValueBtc = assets.reduce((sum, a) => sum + parseFloat(a.valueBtc || '0'), 0);

      return {
        wallet,
        totalValueUsd: totalValueUsd.toString(),
        totalValueBtc: totalValueBtc.toString(),
        assets: balances,
        assetCount: assets.length,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error('Error getting wallet summary:', { error, walletId });
      return null;
    }
  }

  /**
   * Update wallet asset balance
   */
  private async updateWalletAssetBalance(
    walletId: string,
    asset: string,
    amount: number,
    operation: 'add' | 'subtract' | 'lock' | 'unlock'
  ): Promise<void> {
    try {
      const [existing] = await db
        .select()
        .from(walletAssets)
        .where(and(eq(walletAssets.walletId, walletId), eq(walletAssets.asset, asset)))
        .limit(1);

      if (existing) {
        // Update existing asset
        const currentBalance = parseFloat(existing.balance);
        const currentLocked = parseFloat(existing.lockedBalance);
        const currentAvailable = parseFloat(existing.availableBalance);

        let newBalance = currentBalance;
        let newLocked = currentLocked;
        let newAvailable = currentAvailable;

        switch (operation) {
          case 'add':
            newBalance = currentBalance + amount;
            newAvailable = currentAvailable + amount;
            break;
          case 'subtract':
            newBalance = currentBalance - amount;
            newAvailable = currentAvailable - amount;
            newLocked = currentLocked - amount; // Also unlock
            break;
          case 'lock':
            newLocked = currentLocked + amount;
            newAvailable = currentAvailable - amount;
            break;
          case 'unlock':
            newLocked = currentLocked - amount;
            newAvailable = currentAvailable + amount;
            break;
        }

        // Get current price
        const price = await priceService.getPrice(asset as any);

        await db
          .update(walletAssets)
          .set({
            balance: newBalance.toString(),
            lockedBalance: newLocked.toString(),
            availableBalance: newAvailable.toString(),
            lastPrice: price?.priceUsd,
            lastPriceUsd: price?.priceUsd,
            lastPriceUpdate: price?.lastUpdate,
            valueUsd: price ? (newBalance * parseFloat(price.priceUsd)).toString() : undefined,
            valueBtc: price?.priceBtc
              ? (newBalance * parseFloat(price.priceBtc)).toString()
              : undefined,
            updatedAt: new Date(),
          })
          .where(eq(walletAssets.id, existing.id));
      } else {
        // Create new asset
        const price = await priceService.getPrice(asset as any);
        const balance = operation === 'add' ? amount : 0;
        const available = operation === 'add' ? amount : 0;

        await db.insert(walletAssets).values({
          walletId,
          asset: asset as any,
          balance: balance.toString(),
          lockedBalance: '0',
          availableBalance: available.toString(),
          lastPrice: price?.priceUsd,
          lastPriceUsd: price?.priceUsd,
          lastPriceUpdate: price?.lastUpdate,
          valueUsd: price ? (balance * parseFloat(price.priceUsd)).toString() : '0',
          valueBtc: price?.priceBtc ? (balance * parseFloat(price.priceBtc)).toString() : '0',
        });
      }
    } catch (error) {
      logger.error('Error updating wallet asset balance:', { error, walletId, asset, operation });
      throw error;
    }
  }

  /**
   * Get transactions with filters
   */
  async getTransactions(filter: TransactionFilter): Promise<WalletTransaction[]> {
    try {
      const conditions = [];

      if (filter.walletId) {
        conditions.push(eq(walletTransactions.walletId, filter.walletId));
      }

      if (filter.userId) {
        conditions.push(eq(walletTransactions.userId, filter.userId));
      }

      if (filter.tenantId) {
        conditions.push(eq(walletTransactions.tenantId, filter.tenantId));
      }

      if (filter.type) {
        conditions.push(eq(walletTransactions.type, filter.type));
      }

      if (filter.status) {
        conditions.push(eq(walletTransactions.status, filter.status));
      }

      if (filter.asset) {
        conditions.push(eq(walletTransactions.asset, filter.asset));
      }

      if (filter.startDate) {
        conditions.push(gte(walletTransactions.createdAt, filter.startDate));
      }

      if (filter.endDate) {
        conditions.push(lte(walletTransactions.createdAt, filter.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const transactions = await db
        .select()
        .from(walletTransactions)
        .where(whereClause)
        .orderBy(desc(walletTransactions.createdAt))
        .limit(filter.limit || 100)
        .offset(filter.offset || 0);

      return transactions;
    } catch (error) {
      logger.error('Error getting transactions:', { error, filter });
      return [];
    }
  }
}

// Export singleton instance
export const walletService = new WalletService();
