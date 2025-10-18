/**
 * Drizzle Risk Profile Repository
 * Concrete implementation using Drizzle ORM
 */

import { db } from '@/db';
import { riskProfiles } from '../../schema/risk.schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import type { 
  IRiskProfileRepository,
  CreateRiskProfileRequest,
  UpdateRiskProfileRequest 
} from '../interfaces/risk-repository.interface';
import type { RiskProfile } from '../../types/risk.types';
import logger from '@/utils/logger';

export class DrizzleRiskProfileRepository implements IRiskProfileRepository {
  /**
   * Create a new risk profile
   */
  async create(data: CreateRiskProfileRequest): Promise<RiskProfile> {
    try {
      const [profile] = await db
        .insert(riskProfiles)
        .values({
          userId: data.userId,
          tenantId: data.tenantId,
          riskTolerance: data.riskTolerance,
          investmentHorizon: data.investmentHorizon,
          maxDrawdown: data.maxDrawdown?.toString(),
          maxLeverage: data.maxLeverage?.toString(),
          maxPositionSize: data.maxPositionSize?.toString(),
          maxSectorExposure: data.maxSectorExposure?.toString(),
          maxCorrelation: data.maxCorrelation?.toString(),
          isActive: data.isActive ?? true,
          preferences: data.preferences ? JSON.stringify(data.preferences) : null,
        })
        .returning();

      return this.mapToRiskProfile(profile);
    } catch (error) {
      logger.error('Failed to create risk profile', { data, error });
      throw error;
    }
  }

  /**
   * Find risk profile by ID
   */
  async findById(id: string): Promise<RiskProfile | null> {
    try {
      const [profile] = await db
        .select()
        .from(riskProfiles)
        .where(eq(riskProfiles.id, id))
        .limit(1);

      return profile ? this.mapToRiskProfile(profile) : null;
    } catch (error) {
      logger.error('Failed to find risk profile by ID', { id, error });
      throw error;
    }
  }

  /**
   * Find risk profiles by user ID
   */
  async findByUserId(userId: string, tenantId: string): Promise<RiskProfile[]> {
    try {
      const profiles = await db
        .select()
        .from(riskProfiles)
        .where(and(
          eq(riskProfiles.userId, userId),
          eq(riskProfiles.tenantId, tenantId)
        ))
        .orderBy(desc(riskProfiles.createdAt));

      return profiles.map(profile => this.mapToRiskProfile(profile));
    } catch (error) {
      logger.error('Failed to find risk profiles by user ID', { userId, tenantId, error });
      throw error;
    }
  }

  /**
   * Find risk profile by user ID and tenant (single active profile)
   */
  async findByUserIdAndTenant(userId: string, tenantId: string): Promise<RiskProfile | null> {
    try {
      const [profile] = await db
        .select()
        .from(riskProfiles)
        .where(and(
          eq(riskProfiles.userId, userId),
          eq(riskProfiles.tenantId, tenantId),
          eq(riskProfiles.isActive, true)
        ))
        .orderBy(desc(riskProfiles.createdAt))
        .limit(1);

      return profile ? this.mapToRiskProfile(profile) : null;
    } catch (error) {
      logger.error('Failed to find risk profile by user and tenant', { userId, tenantId, error });
      throw error;
    }
  }

  /**
   * Update risk profile
   */
  async update(id: string, data: UpdateRiskProfileRequest): Promise<RiskProfile | null> {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.riskTolerance !== undefined) updateData.riskTolerance = data.riskTolerance;
      if (data.investmentHorizon !== undefined) updateData.investmentHorizon = data.investmentHorizon;
      if (data.maxDrawdown !== undefined) updateData.maxDrawdown = data.maxDrawdown.toString();
      if (data.maxLeverage !== undefined) updateData.maxLeverage = data.maxLeverage.toString();
      if (data.maxPositionSize !== undefined) updateData.maxPositionSize = data.maxPositionSize.toString();
      if (data.maxSectorExposure !== undefined) updateData.maxSectorExposure = data.maxSectorExposure.toString();
      if (data.maxCorrelation !== undefined) updateData.maxCorrelation = data.maxCorrelation.toString();
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.preferences !== undefined) updateData.preferences = JSON.stringify(data.preferences);

      const [updatedProfile] = await db
        .update(riskProfiles)
        .set(updateData)
        .where(eq(riskProfiles.id, id))
        .returning();

      return updatedProfile ? this.mapToRiskProfile(updatedProfile) : null;
    } catch (error) {
      logger.error('Failed to update risk profile', { id, data, error });
      throw error;
    }
  }

  /**
   * Delete risk profile
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(riskProfiles)
        .where(eq(riskProfiles.id, id));

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Failed to delete risk profile', { id, error });
      throw error;
    }
  }

  /**
   * Check if risk profile exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(riskProfiles)
        .where(eq(riskProfiles.id, id));

      return result.count > 0;
    } catch (error) {
      logger.error('Failed to check if risk profile exists', { id, error });
      throw error;
    }
  }

  /**
   * Find profiles by risk tolerance
   */
  async findByRiskTolerance(tolerance: string): Promise<RiskProfile[]> {
    try {
      const profiles = await db
        .select()
        .from(riskProfiles)
        .where(eq(riskProfiles.riskTolerance, tolerance))
        .orderBy(desc(riskProfiles.createdAt));

      return profiles.map(profile => this.mapToRiskProfile(profile));
    } catch (error) {
      logger.error('Failed to find profiles by risk tolerance', { tolerance, error });
      throw error;
    }
  }

  /**
   * Find profiles by investment horizon
   */
  async findByInvestmentHorizon(horizon: string): Promise<RiskProfile[]> {
    try {
      const profiles = await db
        .select()
        .from(riskProfiles)
        .where(eq(riskProfiles.investmentHorizon, horizon))
        .orderBy(desc(riskProfiles.createdAt));

      return profiles.map(profile => this.mapToRiskProfile(profile));
    } catch (error) {
      logger.error('Failed to find profiles by investment horizon', { horizon, error });
      throw error;
    }
  }

  /**
   * Find profiles by active status
   */
  async findByActiveStatus(active: boolean): Promise<RiskProfile[]> {
    try {
      const profiles = await db
        .select()
        .from(riskProfiles)
        .where(eq(riskProfiles.isActive, active))
        .orderBy(desc(riskProfiles.createdAt));

      return profiles.map(profile => this.mapToRiskProfile(profile));
    } catch (error) {
      logger.error('Failed to find profiles by active status', { active, error });
      throw error;
    }
  }

  /**
   * Count profiles by tenant
   */
  async countByTenant(tenantId: string): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(riskProfiles)
        .where(eq(riskProfiles.tenantId, tenantId));

      return result.count;
    } catch (error) {
      logger.error('Failed to count profiles by tenant', { tenantId, error });
      throw error;
    }
  }

  /**
   * Get active profile count
   */
  async getActiveProfileCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(riskProfiles)
        .where(eq(riskProfiles.isActive, true));

      return result.count;
    } catch (error) {
      logger.error('Failed to get active profile count', { error });
      throw error;
    }
  }

  /**
   * Map database record to RiskProfile type
   */
  private mapToRiskProfile(data: any): RiskProfile {
    return {
      id: data.id,
      userId: data.userId,
      tenantId: data.tenantId,
      riskTolerance: data.riskTolerance,
      investmentHorizon: data.investmentHorizon,
      maxDrawdown: data.maxDrawdown ? parseFloat(data.maxDrawdown) : undefined,
      maxLeverage: data.maxLeverage ? parseFloat(data.maxLeverage) : undefined,
      maxPositionSize: data.maxPositionSize ? parseFloat(data.maxPositionSize) : undefined,
      maxSectorExposure: data.maxSectorExposure ? parseFloat(data.maxSectorExposure) : undefined,
      maxCorrelation: data.maxCorrelation ? parseFloat(data.maxCorrelation) : undefined,
      isActive: data.isActive,
      preferences: data.preferences ? JSON.parse(data.preferences) : undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}