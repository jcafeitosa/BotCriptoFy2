/**
 * Copy Trading Service
 */

import { db } from '../../../db';
import { socialCopySettings, socialCopiedTrades } from '../schema/social.schema';
import { eq } from 'drizzle-orm';
import type { CreateCopySettingsRequest, CopySettings, ServiceResponse } from '../types/social.types';
import { prepareCopiedTrade, type TradeToConform } from '../utils/copy-engine';

export async function createCopySettings(request: CreateCopySettingsRequest): Promise<ServiceResponse<CopySettings>> {
  try {
    const settings = await db.insert(socialCopySettings).values({
      tenantId: request.tenantId,
      copierId: request.copierId,
      traderId: request.traderId,
      copyRatio: request.copyRatio?.toString() || '1.0',
      maxAmountPerTrade: request.maxAmountPerTrade?.toString(),
      maxDailyLoss: request.maxDailyLoss?.toString(),
      copiedPairs: request.copiedPairs,
      stopLossPercentage: request.stopLossPercentage?.toString(),
      takeProfitPercentage: request.takeProfitPercentage?.toString(),
      isActive: true,
    }).returning();

    return { success: true, data: settings[0] as CopySettings };
  } catch (error) {
    return { success: false, error: 'Failed to create copy settings', code: 'CREATE_COPY_SETTINGS_FAILED' };
  }
}

export async function executeCopiedTrade(
  copySettingsId: string,
  originalTrade: TradeToConform
): Promise<ServiceResponse<any>> {
  try {
    const settings = await db.query.socialCopySettings.findFirst({
      where: eq(socialCopySettings.id, copySettingsId),
    });

    if (!settings) {
      return { success: false, error: 'Copy settings not found', code: 'SETTINGS_NOT_FOUND' };
    }

    const copiedTrade = prepareCopiedTrade(originalTrade, settings as CopySettings);

    if (!copiedTrade.shouldExecute) {
      return { success: false, error: copiedTrade.reason, code: 'TRADE_NOT_COPIED' };
    }

    const trade = await db.insert(socialCopiedTrades).values({
      tenantId: settings.tenantId,
      copySettingsId,
      originalTradeId: 'original-' + Date.now(),
      traderId: settings.traderId,
      copierId: settings.copierId,
      symbol: copiedTrade.symbol,
      side: copiedTrade.side,
      amount: copiedTrade.adjustedAmount.toString(),
      entryPrice: copiedTrade.price.toString(),
      status: 'open',
    }).returning();

    return { success: true, data: trade[0] };
  } catch (error) {
    return { success: false, error: 'Failed to execute copied trade', code: 'EXECUTE_TRADE_FAILED' };
  }
}
