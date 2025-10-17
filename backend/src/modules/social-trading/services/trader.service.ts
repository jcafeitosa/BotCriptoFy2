/**
 * Trader Service
 */

import { db } from '../../../db';
import { socialTraders } from '../schema/social.schema';
import { eq, and, desc } from 'drizzle-orm';
import type { CreateTraderRequest, TraderProfile, ServiceResponse } from '../types/social.types';

export async function createTrader(request: CreateTraderRequest): Promise<ServiceResponse<TraderProfile>> {
  try {
    const trader = await db.insert(socialTraders).values({
      tenantId: request.tenantId,
      userId: request.userId,
      displayName: request.displayName,
      bio: request.bio,
      specialties: request.specialties || [],
      strategyType: request.strategyType,
      tradingSince: new Date(),
      status: 'active',
    }).returning();

    return { success: true, data: trader[0] as TraderProfile };
  } catch (error) {
    return { success: false, error: 'Failed to create trader', code: 'CREATE_TRADER_FAILED' };
  }
}

export async function getTrader(traderId: string, tenantId: string): Promise<ServiceResponse<TraderProfile>> {
  try {
    const trader = await db.select().from(socialTraders)
      .where(and(eq(socialTraders.id, traderId), eq(socialTraders.tenantId, tenantId)))
      .limit(1);

    if (!trader.length) {
      return { success: false, error: 'Trader not found', code: 'TRADER_NOT_FOUND' };
    }

    return { success: true, data: trader[0] as TraderProfile };
  } catch (error) {
    return { success: false, error: 'Failed to get trader', code: 'GET_TRADER_FAILED' };
  }
}

export async function listTraders(tenantId: string, filters?: { limit?: number; offset?: number }) {
  try {
    const traders = await db.select().from(socialTraders)
      .where(eq(socialTraders.tenantId, tenantId))
      .orderBy(desc(socialTraders.totalFollowers))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return { success: true, data: traders };
  } catch (error) {
    return { success: false, error: 'Failed to list traders', code: 'LIST_TRADERS_FAILED' };
  }
}
