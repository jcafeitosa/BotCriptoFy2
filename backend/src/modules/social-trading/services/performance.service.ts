/**
 * Performance Service
 */

import { db } from '../../../db';
import { socialPerformance } from '../schema/social.schema';
import { eq, and } from 'drizzle-orm';
import type { PerformanceMetrics, PerformancePeriod, ServiceResponse } from '../types/social.types';

export async function getPerformance(
  traderId: string,
  tenantId: string,
  period: PerformancePeriod
): Promise<ServiceResponse<PerformanceMetrics>> {
  try {
    const performance = await db
      .select()
      .from(socialPerformance)
      .where(
        and(
          eq(socialPerformance.traderId, traderId),
          eq(socialPerformance.tenantId, tenantId),
          eq(socialPerformance.period, period)
        )
      )
      .orderBy(socialPerformance.date)
      .limit(1);

    if (!performance.length) {
      return { success: false, error: 'Performance data not found', code: 'PERFORMANCE_NOT_FOUND' };
    }

    return { success: true, data: performance[0] as PerformanceMetrics };
  } catch (error) {
    return { success: false, error: 'Failed to get performance', code: 'GET_PERFORMANCE_FAILED' };
  }
}
