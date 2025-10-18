/**
 * Affiliate Payout Service
 * Manages payouts to affiliates via Stripe Connect
 */

import { getAffiliateDb } from '../test-helpers/db-access';
import { eq, and, desc, sql, inArray, gte, lte } from 'drizzle-orm';
import logger from '@/utils/logger';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import {
  affiliatePayouts,
  affiliateCommissions,
  affiliateProfiles,
  type AffiliatePayout,
  type NewAffiliatePayout,
} from '../schema/affiliate.schema';
import { AffiliateCommissionService } from './commission.service';
import type { RequestPayoutData, PayoutFilters, PaginationOptions, PaginatedResponse } from '../types/affiliate.types';
import { selectCommissionsForAmount } from '../utils/payout-selection';
import { PayoutDisbursementService } from '../../financial/services/payout-disbursement.service';
import { getConfigValue } from '../../configurations/services/configuration.service';

export class AffiliatePayoutService {
  /**
   * Request payout
   */
  static async requestPayout(affiliateId: string, data: RequestPayoutData): Promise<AffiliatePayout> {
    logger.info('Requesting payout', { affiliateId, amount: data.amount });

    // Get affiliate profile
    const [profile] = await getAffiliateDb()
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.id, affiliateId))
      .limit(1);

    if (!profile) {
      throw new NotFoundError('Affiliate profile not found');
    }

    // Validate payout method requirements
    if (data.method === 'stripe' && !profile.stripeAccountId) {
      throw new BadRequestError('Stripe account not connected for this affiliate');
    }

    // Check minimum payout amount
    const minimum = parseFloat(profile.payoutMinimum || '100');
    if (data.amount < minimum) {
      throw new BadRequestError(`Minimum payout amount is ${minimum}`);
    }

    // Get approved commissions (eligible for payout)
    const commissions = await AffiliateCommissionService.getApprovedCommissions(affiliateId);
    const totalAvailable = commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0);

    if (data.amount > totalAvailable) {
      throw new BadRequestError(`Insufficient balance. Available: ${totalAvailable}`);
    }

    // Seleciona comissões elegíveis para atender o valor
    const { selectedIds: selectedCommissions, selectedSum } = selectCommissionsForAmount(
      commissions.map((c) => ({ id: c.id, amount: c.amount })),
      data.amount
    );
    if (selectedCommissions.length === 0) {
      throw new BadRequestError('Não foi possível selecionar comissões para o valor solicitado. Tente outro valor.');
    }

    // Calculate fee (example: 2.5%)
    // Fee configurável: affiliate.payout.fee.percent (padrão 2.5)
    let feePercent = 2.5;
    try {
      const cfg = await getConfigValue<number>('affiliate.payout.fee.percent');
      if (typeof cfg === 'number' && cfg >= 0) feePercent = cfg;
    } catch {}
    const feeRate = feePercent / 100;
    const fee = Math.round(selectedSum * feeRate * 100) / 100;
    const netAmount = selectedSum - fee;

    // Create payout
    const newPayout: NewAffiliatePayout = {
      affiliateId,
      amount: selectedSum.toString(),
      currency: profile.currency || 'BRL',
      method: data.method,
      stripeAccountId: profile.stripeAccountId || undefined,
      bankInfo: data.bankInfo,
      status: 'pending',
      commissionIds: selectedCommissions,
      fee: fee.toString(),
      netAmount: netAmount.toString(),
      notes: data.notes,
    };

    const [payout] = await getAffiliateDb().insert(affiliatePayouts).values(newPayout).returning();

    // Lock commissions to this payout (do not mark as paid yet)
    await getAffiliateDb()
      .update(affiliateCommissions)
      .set({
        payoutId: payout.id,
        updatedAt: new Date(),
      })
      .where(inArray(affiliateCommissions.id, selectedCommissions));

    // Update affiliate profile
    await getAffiliateDb()
      .update(affiliateProfiles)
      .set({
        pendingBalance: sql`${affiliateProfiles.pendingBalance} - ${selectedSum}`,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, affiliateId));

    logger.info('Payout requested', { payoutId: payout.id, amount: data.amount });

    return payout;
  }

  /**
   * Process payout (admin)
   */
  static async processPayout(id: string): Promise<AffiliatePayout> {
    logger.info('Processing payout', { payoutId: id });

    // Busca payout + perfil para iniciar desembolso financeiro
    const [payoutRow] = await getAffiliateDb()
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.id, id))
      .limit(1);
    if (!payoutRow) throw new NotFoundError('Payout not found');

    const [profile] = await getAffiliateDb()
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.id, payoutRow.affiliateId))
      .limit(1);
    if (!profile) throw new NotFoundError('Affiliate profile not found');

    // Disparo do desembolso via módulo Financeiro
    const init = await PayoutDisbursementService.initiateDisbursement({
      tenantId: profile.tenantId,
      userId: profile.userId,
      method: payoutRow.method as any,
      amount: parseFloat(payoutRow.amount),
      currency: payoutRow.currency,
      details: payoutRow.bankInfo || { stripeAccountId: profile.stripeAccountId },
    });

    const [updated] = await getAffiliateDb()
      .update(affiliatePayouts)
      .set({
        status: 'processing',
        processedAt: new Date(),
        updatedAt: new Date(),
        metadata: sql`jsonb_set(COALESCE(${affiliatePayouts.metadata}, '{}'), '{financialTransactionId}', to_jsonb(${init.transactionId}))`,
      })
      .where(eq(affiliatePayouts.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError('Payout not found');
    }

    return updated;
  }

  /**
   * Complete payout
   */
  static async completePayout(id: string, stripeTransferId?: string): Promise<AffiliatePayout> {
    const [payout] = await getAffiliateDb()
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.id, id))
      .limit(1);

    if (!payout) {
      throw new NotFoundError('Payout not found');
    }

    // Marca transação financeira como concluída (se existir)
    const [metaRow] = await getAffiliateDb()
      .select({ metadata: affiliatePayouts.metadata })
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.id, id))
      .limit(1);
    const finId = (metaRow?.metadata as any)?.financialTransactionId as string | undefined;
    if (finId) {
      await PayoutDisbursementService.markCompleted(finId, stripeTransferId);
    }

    const [updated] = await getAffiliateDb()
      .update(affiliatePayouts)
      .set({
        status: 'completed',
        completedAt: new Date(),
        stripeTransferId,
        updatedAt: new Date(),
      })
      .where(eq(affiliatePayouts.id, id))
      .returning();

    // Mark related commissions as paid now that payout completed
    await getAffiliateDb()
      .update(affiliateCommissions)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
      .where(eq(affiliateCommissions.payoutId, id));

    // Update affiliate total paid
    await getAffiliateDb()
      .update(affiliateProfiles)
      .set({
        totalPaid: sql`${affiliateProfiles.totalPaid} + ${payout.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, payout.affiliateId));

    logger.info('Payout completed', { payoutId: id });

    return updated;
  }

  /**
   * List payouts
   */
  static async listPayouts(
    filters: PayoutFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<AffiliatePayout>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.affiliateId) {
      conditions.push(eq(affiliatePayouts.affiliateId, filters.affiliateId));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(affiliatePayouts.status, filters.status));
    }

    if (filters.method && filters.method.length > 0) {
      conditions.push(inArray(affiliatePayouts.method, filters.method));
    }

    if (filters.dateFrom) {
      conditions.push(gte(affiliatePayouts.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(affiliatePayouts.createdAt, filters.dateTo));
    }

    const [{ count }] = await getAffiliateDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliatePayouts)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const results = await getAffiliateDb()
      .select()
      .from(affiliatePayouts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(affiliatePayouts.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(count / limit);

    return {
      data: results,
      pagination: { page, limit, total: count, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }
}
