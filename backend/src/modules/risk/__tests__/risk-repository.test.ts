/**
 * Risk Repository Tests
 * Tests for repository pattern implementation
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createRiskRepositoryFactory, resetRiskRepositoryFactory } from '../repositories/factories/risk-repository.factory';
import { MockRiskProfileRepository } from '../repositories/implementations/mock-risk-profile.repository';

describe('Risk Repository Factory', () => {
  beforeEach(() => {
    resetRiskRepositoryFactory();
  });

  afterEach(() => {
    resetRiskRepositoryFactory();
  });

  test('should create factory with default config', () => {
    const factory = createRiskRepositoryFactory();
    expect(factory).toBeDefined();
    expect(factory.profiles).toBeDefined();
  });

  test('should create factory with custom config', () => {
    const factory = createRiskRepositoryFactory({
      useMocks: true,
      enableCaching: false,
    });
    expect(factory).toBeDefined();
    expect(factory.profiles).toBeDefined();
  });

  test('should use mock repositories in test mode', () => {
    const factory = createRiskRepositoryFactory({ useMocks: true });
    expect(factory.profiles).toBeInstanceOf(MockRiskProfileRepository);
  });

  test('should get repository statistics', () => {
    const factory = createRiskRepositoryFactory();
    const stats = factory.getStats();
    
    expect(stats).toBeDefined();
    expect(stats.totalInstances).toBeGreaterThan(0);
    expect(stats.instances).toContain('profiles');
    expect(stats.config).toBeDefined();
  });

  test('should clear instances', () => {
    const factory = createRiskRepositoryFactory();
    factory.clearInstances();
    
    const stats = factory.getStats();
    expect(stats.totalInstances).toBe(0);
  });
});

describe('Mock Risk Profile Repository', () => {
  let repository: MockRiskProfileRepository;

  beforeEach(() => {
    repository = new MockRiskProfileRepository();
    repository.seedTestData();
  });

  afterEach(() => {
    repository.clear();
  });

  test('should create risk profile', async () => {
    const profileData = {
      userId: 'test-user',
      tenantId: 'test-tenant',
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      maxDrawdown: 0.15,
      maxLeverage: 2.0,
      maxPositionSize: 0.1,
      maxSectorExposure: 0.3,
      maxCorrelation: 0.7,
      isActive: true,
    };

    const profile = await repository.create(profileData);

    expect(profile).toBeDefined();
    expect(profile.id).toBeDefined();
    expect(profile.userId).toBe(profileData.userId);
    expect(profile.tenantId).toBe(profileData.tenantId);
    expect(profile.riskTolerance).toBe(profileData.riskTolerance);
    expect(profile.isActive).toBe(true);
    expect(profile.createdAt).toBeDefined();
    expect(profile.updatedAt).toBeDefined();
  });

  test('should find profile by ID', async () => {
    const profiles = repository.getAll();
    expect(profiles.length).toBeGreaterThan(0);

    const profile = await repository.findById(profiles[0].id);
    expect(profile).toBeDefined();
    expect(profile?.id).toBe(profiles[0].id);
  });

  test('should find profiles by user ID', async () => {
    const profiles = await repository.findByUserId('test-user-1', 'test-tenant-1');
    expect(profiles).toBeDefined();
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles[0].userId).toBe('test-user-1');
  });

  test('should find active profile by user and tenant', async () => {
    const profile = await repository.findByUserIdAndTenant('test-user-1', 'test-tenant-1');
    expect(profile).toBeDefined();
    expect(profile?.isActive).toBe(true);
  });

  test('should update profile', async () => {
    const profiles = repository.getAll();
    const profile = profiles[0];

    const updatedProfile = await repository.update(profile.id, {
      riskTolerance: 'aggressive',
      maxDrawdown: 0.25,
    });

    expect(updatedProfile).toBeDefined();
    expect(updatedProfile?.riskTolerance).toBe('aggressive');
    expect(updatedProfile?.maxDrawdown).toBe(0.25);
    expect(updatedProfile?.updatedAt.getTime()).toBeGreaterThan(profile.updatedAt.getTime());
  });

  test('should delete profile', async () => {
    const profiles = repository.getAll();
    const profile = profiles[0];

    const deleted = await repository.delete(profile.id);
    expect(deleted).toBe(true);

    const found = await repository.findById(profile.id);
    expect(found).toBeNull();
  });

  test('should check if profile exists', async () => {
    const profiles = repository.getAll();
    const profile = profiles[0];

    const exists = await repository.exists(profile.id);
    expect(exists).toBe(true);

    const notExists = await repository.exists('non-existent-id');
    expect(notExists).toBe(false);
  });

  test('should find profiles by risk tolerance', async () => {
    const profiles = await repository.findByRiskTolerance('moderate');
    expect(profiles).toBeDefined();
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.every(p => p.riskTolerance === 'moderate')).toBe(true);
  });

  test('should find profiles by investment horizon', async () => {
    const profiles = await repository.findByInvestmentHorizon('medium');
    expect(profiles).toBeDefined();
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.every(p => p.investmentHorizon === 'medium')).toBe(true);
  });

  test('should find profiles by active status', async () => {
    const activeProfiles = await repository.findByActiveStatus(true);
    const inactiveProfiles = await repository.findByActiveStatus(false);

    expect(activeProfiles).toBeDefined();
    expect(inactiveProfiles).toBeDefined();
    expect(activeProfiles.every(p => p.isActive)).toBe(true);
    expect(inactiveProfiles.every(p => !p.isActive)).toBe(true);
  });

  test('should count profiles by tenant', async () => {
    const count1 = await repository.countByTenant('test-tenant-1');
    const count2 = await repository.countByTenant('test-tenant-2');

    expect(count1).toBeGreaterThan(0);
    expect(count2).toBeGreaterThan(0);
    expect(count1).not.toBe(count2);
  });

  test('should get active profile count', async () => {
    const activeCount = await repository.getActiveProfileCount();
    expect(activeCount).toBeGreaterThan(0);
  });

  test('should clear all profiles', () => {
    repository.clear();
    const profiles = repository.getAll();
    expect(profiles.length).toBe(0);
  });

  test('should seed test data', () => {
    repository.clear();
    repository.seedTestData();
    
    const profiles = repository.getAll();
    expect(profiles.length).toBe(3);
    
    const userIds = profiles.map(p => p.userId);
    expect(userIds).toContain('test-user-1');
    expect(userIds).toContain('test-user-2');
    expect(userIds).toContain('test-user-3');
  });
});

describe('Repository Integration', () => {
  test('should work with factory in test mode', async () => {
    const factory = createRiskRepositoryFactory({ useMocks: true });
    const repository = factory.profiles;

    // Create a profile
    const profile = await repository.create({
      userId: 'integration-test-user',
      tenantId: 'integration-test-tenant',
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      maxDrawdown: 0.15,
      maxLeverage: 2.0,
      maxPositionSize: 0.1,
      maxSectorExposure: 0.3,
      maxCorrelation: 0.7,
      isActive: true,
    });

    expect(profile).toBeDefined();
    expect(profile.id).toBeDefined();

    // Find the profile
    const foundProfile = await repository.findById(profile.id);
    expect(foundProfile).toBeDefined();
    expect(foundProfile?.id).toBe(profile.id);

    // Update the profile
    const updatedProfile = await repository.update(profile.id, {
      riskTolerance: 'aggressive',
    });

    expect(updatedProfile).toBeDefined();
    expect(updatedProfile?.riskTolerance).toBe('aggressive');

    // Delete the profile
    const deleted = await repository.delete(profile.id);
    expect(deleted).toBe(true);

    // Verify deletion
    const deletedProfile = await repository.findById(profile.id);
    expect(deletedProfile).toBeNull();
  });
});