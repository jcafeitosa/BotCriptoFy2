/**
 * Mock Risk Profile Repository
 * In-memory implementation for testing
 */

import type { 
  IRiskProfileRepository,
  CreateRiskProfileRequest,
  UpdateRiskProfileRequest 
} from '../interfaces/risk-repository.interface';
import type { RiskProfile } from '../../types/risk.types';

export class MockRiskProfileRepository implements IRiskProfileRepository {
  private profiles: Map<string, RiskProfile> = new Map();
  private nextId = 1;

  /**
   * Create a new risk profile
   */
  async create(data: CreateRiskProfileRequest): Promise<RiskProfile> {
    const id = `mock-profile-${this.nextId++}`;
    const now = new Date();
    
    const profile: RiskProfile = {
      id,
      userId: data.userId,
      tenantId: data.tenantId,
      riskTolerance: data.riskTolerance,
      investmentHorizon: data.investmentHorizon,
      maxDrawdown: data.maxDrawdown,
      maxLeverage: data.maxLeverage,
      maxPositionSize: data.maxPositionSize,
      maxSectorExposure: data.maxSectorExposure,
      maxCorrelation: data.maxCorrelation,
      isActive: data.isActive ?? true,
      preferences: data.preferences,
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(id, profile);
    return profile;
  }

  /**
   * Find risk profile by ID
   */
  async findById(id: string): Promise<RiskProfile | null> {
    return this.profiles.get(id) || null;
  }

  /**
   * Find risk profiles by user ID
   */
  async findByUserId(userId: string, tenantId: string): Promise<RiskProfile[]> {
    return Array.from(this.profiles.values())
      .filter(profile => profile.userId === userId && profile.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Find risk profile by user ID and tenant (single active profile)
   */
  async findByUserIdAndTenant(userId: string, tenantId: string): Promise<RiskProfile | null> {
    const profiles = await this.findByUserId(userId, tenantId);
    return profiles.find(profile => profile.isActive) || null;
  }

  /**
   * Update risk profile
   */
  async update(id: string, data: UpdateRiskProfileRequest): Promise<RiskProfile | null> {
    const existing = this.profiles.get(id);
    if (!existing) return null;

    const updated: RiskProfile = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    this.profiles.set(id, updated);
    return updated;
  }

  /**
   * Delete risk profile
   */
  async delete(id: string): Promise<boolean> {
    return this.profiles.delete(id);
  }

  /**
   * Check if risk profile exists
   */
  async exists(id: string): Promise<boolean> {
    return this.profiles.has(id);
  }

  /**
   * Find profiles by risk tolerance
   */
  async findByRiskTolerance(tolerance: string): Promise<RiskProfile[]> {
    return Array.from(this.profiles.values())
      .filter(profile => profile.riskTolerance === tolerance)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Find profiles by investment horizon
   */
  async findByInvestmentHorizon(horizon: string): Promise<RiskProfile[]> {
    return Array.from(this.profiles.values())
      .filter(profile => profile.investmentHorizon === horizon)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Find profiles by active status
   */
  async findByActiveStatus(active: boolean): Promise<RiskProfile[]> {
    return Array.from(this.profiles.values())
      .filter(profile => profile.isActive === active)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Count profiles by tenant
   */
  async countByTenant(tenantId: string): Promise<number> {
    return Array.from(this.profiles.values())
      .filter(profile => profile.tenantId === tenantId).length;
  }

  /**
   * Get active profile count
   */
  async getActiveProfileCount(): Promise<number> {
    return Array.from(this.profiles.values())
      .filter(profile => profile.isActive).length;
  }

  /**
   * Clear all profiles (for testing)
   */
  clear(): void {
    this.profiles.clear();
    this.nextId = 1;
  }

  /**
   * Get all profiles (for testing)
   */
  getAll(): RiskProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Seed test data
   */
  seedTestData(): void {
    this.clear();
    
    // Create test profiles
    this.create({
      userId: 'test-user-1',
      tenantId: 'test-tenant-1',
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      maxDrawdown: 0.15,
      maxLeverage: 2.0,
      maxPositionSize: 0.1,
      maxSectorExposure: 0.3,
      maxCorrelation: 0.7,
      isActive: true,
    });

    this.create({
      userId: 'test-user-2',
      tenantId: 'test-tenant-1',
      riskTolerance: 'conservative',
      investmentHorizon: 'long',
      maxDrawdown: 0.10,
      maxLeverage: 1.5,
      maxPositionSize: 0.05,
      maxSectorExposure: 0.2,
      maxCorrelation: 0.5,
      isActive: true,
    });

    this.create({
      userId: 'test-user-3',
      tenantId: 'test-tenant-2',
      riskTolerance: 'aggressive',
      investmentHorizon: 'short',
      maxDrawdown: 0.25,
      maxLeverage: 3.0,
      maxPositionSize: 0.2,
      maxSectorExposure: 0.5,
      maxCorrelation: 0.8,
      isActive: false,
    });
  }
}