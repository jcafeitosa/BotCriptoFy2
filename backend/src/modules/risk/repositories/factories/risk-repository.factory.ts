/**
 * Risk Repository Factory
 * Centralized factory for creating repository instances
 * 
 * Benefits:
 * - Single point of configuration
 * - Easy to swap implementations
 * - Supports dependency injection
 * - Enables testing with mocks
 */

import type { IRiskRepositoryFactory } from '../interfaces/risk-repository.interface';
import type { 
  IRiskProfileRepository,
  IRiskLimitRepository,
  IRiskMetricsRepository,
  IRiskAlertRepository,
  IRiskAnalyticsRepository,
  IRiskAuditRepository
} from '../interfaces/risk-repository.interface';

// Import concrete implementations
import { DrizzleRiskProfileRepository } from '../implementations/drizzle-risk-profile.repository';
// import { DrizzleRiskLimitRepository } from '../implementations/drizzle-risk-limit.repository';
// import { DrizzleRiskMetricsRepository } from '../implementations/drizzle-risk-metrics.repository';
// import { DrizzleRiskAlertRepository } from '../implementations/drizzle-risk-alert.repository';
// import { DrizzleRiskAnalyticsRepository } from '../implementations/drizzle-risk-analytics.repository';
// import { DrizzleRiskAuditRepository } from '../implementations/drizzle-risk-audit.repository';

// Import mock implementations for testing
import { MockRiskProfileRepository } from '../implementations/mock-risk-profile.repository';
// import { MockRiskLimitRepository } from '../implementations/mock-risk-limit.repository';
// import { MockRiskMetricsRepository } from '../implementations/mock-risk-metrics.repository';
// import { MockRiskAlertRepository } from '../implementations/mock-risk-alert.repository';
// import { MockRiskAnalyticsRepository } from '../implementations/mock-risk-analytics.repository';
// import { MockRiskAuditRepository } from '../implementations/mock-risk-audit.repository';

/**
 * Repository configuration
 */
export interface RepositoryConfig {
  useMocks: boolean;
  databaseUrl?: string;
  redisUrl?: string;
  enableCaching: boolean;
  enableAuditing: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RepositoryConfig = {
  useMocks: process.env.NODE_ENV === 'test',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  enableCaching: process.env.RISK_CACHE_ENABLED !== 'false',
  enableAuditing: process.env.RISK_AUDIT_ENABLED !== 'false',
};

/**
 * Risk Repository Factory
 */
export class RiskRepositoryFactory implements IRiskRepositoryFactory {
  private config: RepositoryConfig;
  private instances: Map<string, any> = new Map();

  constructor(config: Partial<RepositoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get or create profile repository
   */
  get profiles(): IRiskProfileRepository {
    const key = 'profiles';
    
    if (!this.instances.has(key)) {
      const repository = this.config.useMocks
        ? new MockRiskProfileRepository()
        : new DrizzleRiskProfileRepository();
      
      this.instances.set(key, repository);
    }

    return this.instances.get(key);
  }

  /**
   * Get or create limit repository
   */
  get limits(): IRiskLimitRepository {
    const key = 'limits';
    
    if (!this.instances.has(key)) {
      // TODO: Implement DrizzleRiskLimitRepository
      throw new Error('RiskLimitRepository not implemented yet');
    }

    return this.instances.get(key);
  }

  /**
   * Get or create metrics repository
   */
  get metrics(): IRiskMetricsRepository {
    const key = 'metrics';
    
    if (!this.instances.has(key)) {
      // TODO: Implement DrizzleRiskMetricsRepository
      throw new Error('RiskMetricsRepository not implemented yet');
    }

    return this.instances.get(key);
  }

  /**
   * Get or create alert repository
   */
  get alerts(): IRiskAlertRepository {
    const key = 'alerts';
    
    if (!this.instances.has(key)) {
      // TODO: Implement DrizzleRiskAlertRepository
      throw new Error('RiskAlertRepository not implemented yet');
    }

    return this.instances.get(key);
  }

  /**
   * Get or create analytics repository
   */
  get analytics(): IRiskAnalyticsRepository {
    const key = 'analytics';
    
    if (!this.instances.has(key)) {
      // TODO: Implement DrizzleRiskAnalyticsRepository
      throw new Error('RiskAnalyticsRepository not implemented yet');
    }

    return this.instances.get(key);
  }

  /**
   * Get or create audit repository
   */
  get audit(): IRiskAuditRepository {
    const key = 'audit';
    
    if (!this.instances.has(key)) {
      // TODO: Implement DrizzleRiskAuditRepository
      throw new Error('RiskAuditRepository not implemented yet');
    }

    return this.instances.get(key);
  }

  /**
   * Clear all instances (useful for testing)
   */
  clearInstances(): void {
    this.instances.clear();
  }

  /**
   * Get repository statistics
   */
  getStats(): {
    totalInstances: number;
    instances: string[];
    config: RepositoryConfig;
  } {
    return {
      totalInstances: this.instances.size,
      instances: Array.from(this.instances.keys()),
      config: this.config,
    };
  }
}

/**
 * Singleton factory instance
 */
let factoryInstance: RiskRepositoryFactory | null = null;

/**
 * Get singleton factory instance
 */
export function getRiskRepositoryFactory(config?: Partial<RepositoryConfig>): RiskRepositoryFactory {
  if (!factoryInstance) {
    factoryInstance = new RiskRepositoryFactory(config);
  }
  return factoryInstance;
}

/**
 * Reset factory instance (useful for testing)
 */
export function resetRiskRepositoryFactory(): void {
  factoryInstance = null;
}

/**
 * Create factory with specific configuration
 */
export function createRiskRepositoryFactory(config: Partial<RepositoryConfig>): RiskRepositoryFactory {
  return new RiskRepositoryFactory(config);
}

/**
 * Repository health check
 */
export async function checkRepositoryHealth(): Promise<{
  healthy: boolean;
  repositories: Record<string, boolean>;
  errors: string[];
}> {
  const factory = getRiskRepositoryFactory();
  const health = {
    healthy: true,
    repositories: {} as Record<string, boolean>,
    errors: [] as string[],
  };

  try {
    // Test profile repository
    try {
      await factory.profiles.getActiveProfileCount();
      health.repositories.profiles = true;
    } catch (error) {
      health.repositories.profiles = false;
      health.errors.push(`Profile repository: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test other repositories as they are implemented
    // TODO: Add health checks for other repositories

    health.healthy = Object.values(health.repositories).every(status => status);
  } catch (error) {
    health.healthy = false;
    health.errors.push(`Factory error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return health;
}