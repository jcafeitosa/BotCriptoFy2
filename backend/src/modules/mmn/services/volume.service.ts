/**
 * MMN Volume Service
 * Tracks and propagates sales volume through binary tree
 */

import { db } from '@/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import {
  mmnVolumes,
  mmnTree,
  type MmnVolume,
  type NewMmnVolume,
} from '../schema/mmn.schema';
import { GenealogyService } from './genealogy.service';
import type { VolumeUpdate, BinaryCalculation } from '../types/mmn.types';

export class VolumeService {
  /**
   * Record personal volume and propagate to upline
   */
  static async recordVolume(data: VolumeUpdate): Promise<MmnVolume> {
    logger.info('Recording volume', {
      memberId: data.memberId,
      volume: data.personalVolume,
    });

    // Get current period
    const period = this.getCurrentPeriod('weekly');

    // Check if volume record exists for this period
    const [existing] = await db
      .select()
      .from(mmnVolumes)
      .where(
        and(
          eq(mmnVolumes.memberId, data.memberId),
          eq(mmnVolumes.period, period.name),
          eq(mmnVolumes.periodStart, period.start),
          eq(mmnVolumes.periodEnd, period.end)
        )
      )
      .limit(1);

    let volumeRecord: MmnVolume;

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(mmnVolumes)
        .set({
          personalVolume: sql`${mmnVolumes.personalVolume} + ${data.personalVolume}`,
          totalVolume: sql`${mmnVolumes.totalVolume} + ${data.personalVolume}`,
          updatedAt: new Date(),
        })
        .where(eq(mmnVolumes.id, existing.id))
        .returning();

      volumeRecord = updated;
    } else {
      // Create new record
      const newVolume: NewMmnVolume = {
        memberId: data.memberId,
        personalVolume: data.personalVolume.toString(),
        totalVolume: data.personalVolume.toString(),
        period: period.name,
        periodStart: period.start,
        periodEnd: period.end,
      };

      const [created] = await db.insert(mmnVolumes).values(newVolume).returning();
      volumeRecord = created;
    }

    // Propagate to upline if requested
    if (data.propagateToUpline) {
      await this.propagateVolumeToUpline(
        data.memberId,
        data.personalVolume,
        period
      );
    }

    logger.info('Volume recorded', {
      volumeId: volumeRecord.id,
      personalVolume: volumeRecord.personalVolume,
    });

    return volumeRecord;
  }

  /**
   * Propagate volume to upline (updates left/right leg volumes)
   */
  private static async propagateVolumeToUpline(
    memberId: string,
    volume: number,
    period: { name: string; start: Date; end: Date }
  ): Promise<void> {
    logger.debug('Propagating volume to upline', { memberId, volume });

    // Get member node
    const [memberNode] = await db
      .select()
      .from(mmnTree)
      .where(eq(mmnTree.id, memberId))
      .limit(1);

    if (!memberNode || !memberNode.parentId) {
      logger.debug('No parent to propagate to', { memberId });
      return;
    }

    // Get upline through genealogy
    const upline = await GenealogyService.getUpline(
      memberNode.userId,
      memberNode.tenantId
    );

    // Propagate to each ancestor
    for (const ancestor of upline) {
      // Determine which leg this member is under
      const leg = ancestor.leg as 'left' | 'right' | null;

      if (!leg) continue;

      // Get or create volume record for ancestor
      const [ancestorVolume] = await db
        .select()
        .from(mmnVolumes)
        .where(
          and(
            eq(mmnVolumes.memberId, ancestor.id),
            eq(mmnVolumes.period, period.name),
            eq(mmnVolumes.periodStart, period.start),
            eq(mmnVolumes.periodEnd, period.end)
          )
        )
        .limit(1);

      if (ancestorVolume) {
        // Update existing record
        const updateField = leg === 'left'
          ? { leftVolume: sql`${mmnVolumes.leftVolume} + ${volume}` }
          : { rightVolume: sql`${mmnVolumes.rightVolume} + ${volume}` };

        await db
          .update(mmnVolumes)
          .set({
            ...updateField,
            totalVolume: sql`${mmnVolumes.totalVolume} + ${volume}`,
            updatedAt: new Date(),
          })
          .where(eq(mmnVolumes.id, ancestorVolume.id));
      } else {
        // Create new record
        const newVolume: NewMmnVolume = {
          memberId: ancestor.id,
          leftVolume: leg === 'left' ? volume.toString() : '0.00',
          rightVolume: leg === 'right' ? volume.toString() : '0.00',
          personalVolume: '0.00',
          totalVolume: volume.toString(),
          period: period.name,
          periodStart: period.start,
          periodEnd: period.end,
        };

        await db.insert(mmnVolumes).values(newVolume);
      }

      logger.debug('Volume propagated to ancestor', {
        ancestorId: ancestor.id,
        leg,
        volume,
      });
    }
  }

  /**
   * Calculate leg volumes (left/right) for a member
   */
  static async calculateLegVolumes(
    memberId: string,
    period?: string
  ): Promise<BinaryCalculation> {
    const periodInfo = period
      ? this.parsePeriod(period)
      : this.getCurrentPeriod('weekly');

    const [volumeRecord] = await db
      .select()
      .from(mmnVolumes)
      .where(
        and(
          eq(mmnVolumes.memberId, memberId),
          eq(mmnVolumes.period, periodInfo.name),
          eq(mmnVolumes.periodStart, periodInfo.start),
          eq(mmnVolumes.periodEnd, periodInfo.end)
        )
      )
      .limit(1);

    if (!volumeRecord) {
      return {
        leftVolume: 0,
        rightVolume: 0,
        weakerLeg: 0,
        strongerLeg: 0,
        commissionableVolume: 0,
        commission: 0,
        leftCarryForward: 0,
        rightCarryForward: 0,
      };
    }

    const leftVolume = parseFloat(volumeRecord.leftVolume);
    const rightVolume = parseFloat(volumeRecord.rightVolume);
    const leftCarryForward = parseFloat(volumeRecord.leftCarryForward || '0');
    const rightCarryForward = parseFloat(volumeRecord.rightCarryForward || '0');

    // Calculate total volumes including carry forward
    const totalLeft = leftVolume + leftCarryForward;
    const totalRight = rightVolume + rightCarryForward;

    const weakerLeg = Math.min(totalLeft, totalRight);
    const strongerLeg = Math.max(totalLeft, totalRight);

    // Commissionable volume is the weaker leg
    const commissionableVolume = weakerLeg;

    // Commission calculation (will be done in commission service)
    const commission = 0;

    // Carry forward is the difference
    const newLeftCarryForward = totalLeft > totalRight ? totalLeft - totalRight : 0;
    const newRightCarryForward = totalRight > totalLeft ? totalRight - totalLeft : 0;

    return {
      leftVolume: totalLeft,
      rightVolume: totalRight,
      weakerLeg,
      strongerLeg,
      commissionableVolume,
      commission,
      leftCarryForward: newLeftCarryForward,
      rightCarryForward: newRightCarryForward,
    };
  }

  /**
   * Get volumes for a member
   */
  static async getVolumes(
    memberId: string,
    period?: string
  ): Promise<MmnVolume | null> {
    const periodInfo = period
      ? this.parsePeriod(period)
      : this.getCurrentPeriod('weekly');

    const [volumeRecord] = await db
      .select()
      .from(mmnVolumes)
      .where(
        and(
          eq(mmnVolumes.memberId, memberId),
          eq(mmnVolumes.period, periodInfo.name),
          eq(mmnVolumes.periodStart, periodInfo.start),
          eq(mmnVolumes.periodEnd, periodInfo.end)
        )
      )
      .limit(1);

    return volumeRecord || null;
  }

  /**
   * Get volume history for a member
   */
  static async getVolumeHistory(
    memberId: string,
    limit: number = 12
  ): Promise<MmnVolume[]> {
    return await db
      .select()
      .from(mmnVolumes)
      .where(eq(mmnVolumes.memberId, memberId))
      .orderBy(desc(mmnVolumes.periodStart))
      .limit(limit);
  }

  /**
   * Mark period as processed
   */
  static async markAsProcessed(
    memberId: string,
    period: string
  ): Promise<void> {
    const periodInfo = this.parsePeriod(period);

    await db
      .update(mmnVolumes)
      .set({
        isProcessed: true,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mmnVolumes.memberId, memberId),
          eq(mmnVolumes.period, periodInfo.name),
          eq(mmnVolumes.periodStart, periodInfo.start),
          eq(mmnVolumes.periodEnd, periodInfo.end)
        )
      );
  }

  /**
   * Update carry forward for next period
   */
  static async updateCarryForward(
    memberId: string,
    period: string,
    leftCarryForward: number,
    rightCarryForward: number
  ): Promise<void> {
    const periodInfo = this.parsePeriod(period);

    await db
      .update(mmnVolumes)
      .set({
        leftCarryForward: leftCarryForward.toString(),
        rightCarryForward: rightCarryForward.toString(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mmnVolumes.memberId, memberId),
          eq(mmnVolumes.period, periodInfo.name),
          eq(mmnVolumes.periodStart, periodInfo.start),
          eq(mmnVolumes.periodEnd, periodInfo.end)
        )
      );
  }

  /**
   * Get current period
   */
  private static getCurrentPeriod(
    type: 'weekly' | 'monthly'
  ): { name: string; start: Date; end: Date } {
    const now = new Date();

    if (type === 'weekly') {
      // Week starts on Monday
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust if Sunday

      const start = new Date(now);
      start.setDate(now.getDate() + diff);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return {
        name: 'weekly',
        start,
        end,
      };
    } else {
      // Monthly
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);

      return {
        name: 'monthly',
        start,
        end,
      };
    }
  }

  /**
   * Parse period string (e.g., "weekly_2025-W03" or "monthly_2025-01")
   */
  private static parsePeriod(period: string): {
    name: string;
    start: Date;
    end: Date;
  } {
    const [type, dateStr] = period.split('_');

    if (type === 'weekly') {
      // Format: 2025-W03
      const [year, week] = dateStr.split('-W');
      const weekNum = parseInt(week, 10);

      // Calculate start of week
      const start = this.getWeekStart(parseInt(year, 10), weekNum);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return { name: 'weekly', start, end };
    } else if (type === 'monthly') {
      // Format: 2025-01
      const [year, month] = dateStr.split('-');
      const start = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(parseInt(year, 10), parseInt(month, 10), 0);
      end.setHours(23, 59, 59, 999);

      return { name: 'monthly', start, end };
    }

    throw new BadRequestError('Invalid period format');
  }

  /**
   * Get Monday of ISO week
   */
  private static getWeekStart(year: number, week: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const ISOweekStart = simple;

    if (dayOfWeek <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }

    return ISOweekStart;
  }

  /**
   * Get total volumes across all members (admin)
   */
  static async getTotalVolumes(
    tenantId: string,
    period?: string
  ): Promise<{
    totalVolume: number;
    totalLeft: number;
    totalRight: number;
    totalPersonal: number;
  }> {
    const periodInfo = period
      ? this.parsePeriod(period)
      : this.getCurrentPeriod('weekly');

    const [result] = await db
      .select({
        totalVolume: sql<string>`COALESCE(SUM(${mmnVolumes.totalVolume}), 0)`,
        totalLeft: sql<string>`COALESCE(SUM(${mmnVolumes.leftVolume}), 0)`,
        totalRight: sql<string>`COALESCE(SUM(${mmnVolumes.rightVolume}), 0)`,
        totalPersonal: sql<string>`COALESCE(SUM(${mmnVolumes.personalVolume}), 0)`,
      })
      .from(mmnVolumes)
      .innerJoin(mmnTree, eq(mmnVolumes.memberId, mmnTree.id))
      .where(
        and(
          eq(mmnTree.tenantId, tenantId),
          eq(mmnVolumes.period, periodInfo.name),
          eq(mmnVolumes.periodStart, periodInfo.start),
          eq(mmnVolumes.periodEnd, periodInfo.end)
        )
      );

    return {
      totalVolume: parseFloat(result.totalVolume || '0'),
      totalLeft: parseFloat(result.totalLeft || '0'),
      totalRight: parseFloat(result.totalRight || '0'),
      totalPersonal: parseFloat(result.totalPersonal || '0'),
    };
  }
}
