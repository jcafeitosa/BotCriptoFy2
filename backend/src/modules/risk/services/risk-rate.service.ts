/**
 * Risk Rate Service
 * Fetches real-time risk-free rates from external APIs
 * 
 * Sources:
 * - US Treasury API (primary)
 * - Federal Reserve Economic Data (FRED) API (fallback)
 * - Internal cache with 1-hour TTL
 */

import logger from '@/utils/logger';
import redis from '@/utils/redis';

/**
 * Risk-free rate sources
 */
const RATE_SOURCES = {
  TREASURY: 'https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/avg_interest_rates',
  FRED: 'https://api.stlouisfed.org/fred/series/observations',
} as const;

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  TTL: 3600, // 1 hour
  KEY_PREFIX: 'risk:rate',
  FALLBACK_RATE: 0.02, // 2% fallback
} as const;

/**
 * Rate data interface
 */
interface RateData {
  rate: number;
  source: string;
  timestamp: Date;
  maturity: string;
}

/**
 * Treasury API response interface
 */
interface TreasuryResponse {
  data: Array<{
    record_date: string;
    avg_interest_rate_amt: string;
    security_type_desc: string;
  }>;
}

/**
 * FRED API response interface
 */
interface FredResponse {
  observations: Array<{
    date: string;
    value: string;
  }>;
}

/**
 * Risk Rate Service
 */
export class RiskRateService {
  /**
   * Get current risk-free rate
   * Priority: Cache -> Treasury API -> FRED API -> Fallback
   */
  static async getRiskFreeRate(): Promise<number> {
    try {
      // Try cache first
      const cached = await this.getCachedRate();
      if (cached) {
        logger.debug('Risk-free rate served from cache', { rate: cached.rate });
        return cached.rate;
      }

      // Try Treasury API
      try {
        const treasuryRate = await this.fetchTreasuryRate();
        if (treasuryRate) {
          await this.cacheRate(treasuryRate);
          logger.info('Risk-free rate fetched from Treasury API', { rate: treasuryRate.rate });
          return treasuryRate.rate;
        }
      } catch (error) {
        logger.warn('Treasury API failed, trying FRED', { error: error instanceof Error ? error.message : String(error) });
      }

      // Try FRED API
      try {
        const fredRate = await this.fetchFredRate();
        if (fredRate) {
          await this.cacheRate(fredRate);
          logger.info('Risk-free rate fetched from FRED API', { rate: fredRate.rate });
          return fredRate.rate;
        }
      } catch (error) {
        logger.warn('FRED API failed, using fallback', { error: error instanceof Error ? error.message : String(error) });
      }

      // Use fallback rate
      logger.warn('All rate sources failed, using fallback rate', { rate: CACHE_CONFIG.FALLBACK_RATE });
      return CACHE_CONFIG.FALLBACK_RATE;

    } catch (error) {
      logger.error('Failed to get risk-free rate', {
        error: error instanceof Error ? error.message : String(error),
      });
      return CACHE_CONFIG.FALLBACK_RATE;
    }
  }

  /**
   * Get cached risk-free rate
   */
  private static async getCachedRate(): Promise<RateData | null> {
    try {
      const key = `${CACHE_CONFIG.KEY_PREFIX}:current`;
      const cached = await redis.get(key);
      
      if (!cached) return null;

      const data = JSON.parse(cached) as RateData;
      data.timestamp = new Date(data.timestamp);
      
      return data;
    } catch (error) {
      logger.error('Failed to get cached rate', { error });
      return null;
    }
  }

  /**
   * Cache risk-free rate
   */
  private static async cacheRate(rateData: RateData): Promise<void> {
    try {
      const key = `${CACHE_CONFIG.KEY_PREFIX}:current`;
      await redis.set(key, JSON.stringify(rateData), CACHE_CONFIG.TTL);
      
      logger.debug('Risk-free rate cached', {
        rate: rateData.rate,
        source: rateData.source,
        ttl: CACHE_CONFIG.TTL,
      });
    } catch (error) {
      logger.error('Failed to cache rate', { error });
    }
  }

  /**
   * Fetch rate from Treasury API
   */
  private static async fetchTreasuryRate(): Promise<RateData | null> {
    try {
      const url = `${RATE_SOURCES.TREASURY}?filter=security_type_desc:eq:'Treasury Bills'&sort=-record_date&page[size]=1`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BotCriptoFy-RiskService/1.0',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Treasury API error: ${response.status} ${response.statusText}`);
      }

      const data: TreasuryResponse = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No data from Treasury API');
      }

      const latest = data.data[0];
      const rate = parseFloat(latest.avg_interest_rate_amt) / 100; // Convert to decimal

      return {
        rate,
        source: 'Treasury API',
        timestamp: new Date(),
        maturity: latest.security_type_desc,
      };
    } catch (error) {
      logger.error('Treasury API fetch failed', { error });
      return null;
    }
  }

  /**
   * Fetch rate from FRED API
   */
  private static async fetchFredRate(): Promise<RateData | null> {
    try {
      const apiKey = process.env.FRED_API_KEY;
      if (!apiKey) {
        throw new Error('FRED_API_KEY not configured');
      }

      // Use 3-Month Treasury Bill rate (DGS3MO)
      const seriesId = 'DGS3MO';
      const url = `${RATE_SOURCES.FRED}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BotCriptoFy-RiskService/1.0',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
      }

      const data: FredResponse = await response.json();
      
      if (!data.observations || data.observations.length === 0) {
        throw new Error('No data from FRED API');
      }

      const latest = data.observations[0];
      const rate = parseFloat(latest.value) / 100; // Convert to decimal

      return {
        rate,
        source: 'FRED API',
        timestamp: new Date(),
        maturity: '3-Month Treasury Bill',
      };
    } catch (error) {
      logger.error('FRED API fetch failed', { error });
      return null;
    }
  }

  /**
   * Get rate with specific maturity
   */
  static async getRateByMaturity(maturity: '3M' | '6M' | '1Y' | '2Y' | '5Y' | '10Y'): Promise<number> {
    try {
      const cacheKey = `${CACHE_CONFIG.KEY_PREFIX}:${maturity}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached) as RateData;
        return data.rate;
      }

      // For now, return the general risk-free rate
      // In a full implementation, this would fetch specific maturity rates
      const generalRate = await this.getRiskFreeRate();
      
      // Apply maturity adjustment (simplified)
      const adjustments: Record<string, number> = {
        '3M': 0.0,   // No adjustment
        '6M': 0.001, // +0.1%
        '1Y': 0.002, // +0.2%
        '2Y': 0.005, // +0.5%
        '5Y': 0.01,  // +1.0%
        '10Y': 0.015, // +1.5%
      };

      const adjustedRate = generalRate + (adjustments[maturity] || 0);
      
      // Cache the adjusted rate
      const rateData: RateData = {
        rate: adjustedRate,
        source: 'Adjusted',
        timestamp: new Date(),
        maturity,
      };
      
      await redis.set(cacheKey, JSON.stringify(rateData), CACHE_CONFIG.TTL);
      
      return adjustedRate;
    } catch (error) {
      logger.error('Failed to get rate by maturity', { maturity, error });
      return CACHE_CONFIG.FALLBACK_RATE;
    }
  }

  /**
   * Get rate history (for analysis)
   */
  static async getRateHistory(days: number = 30): Promise<RateData[]> {
    try {
      const cacheKey = `${CACHE_CONFIG.KEY_PREFIX}:history:${days}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached) as RateData[];
        return data.map(d => ({ ...d, timestamp: new Date(d.timestamp) }));
      }

      // For now, return empty array
      // In a full implementation, this would fetch historical rates
      logger.warn('Rate history not implemented, returning empty array');
      return [];
    } catch (error) {
      logger.error('Failed to get rate history', { days, error });
      return [];
    }
  }

  /**
   * Force refresh rate (bypass cache)
   */
  static async refreshRate(): Promise<number> {
    try {
      // Clear cache
      const keys = await redis.keys(`${CACHE_CONFIG.KEY_PREFIX}:*`);
      if (keys.length > 0) {
        await redis.delMany(keys);
      }

      // Fetch fresh rate
      return await this.getRiskFreeRate();
    } catch (error) {
      logger.error('Failed to refresh rate', { error });
      return CACHE_CONFIG.FALLBACK_RATE;
    }
  }

  /**
   * Get rate statistics
   */
  static async getRateStats(): Promise<{
    currentRate: number;
    source: string;
    lastUpdated: Date | null;
    cacheHitRate: number;
  }> {
    try {
      const cached = await this.getCachedRate();
      
      return {
        currentRate: cached?.rate || CACHE_CONFIG.FALLBACK_RATE,
        source: cached?.source || 'Fallback',
        lastUpdated: cached?.timestamp || null,
        cacheHitRate: 0, // Would need to track this
      };
    } catch (error) {
      logger.error('Failed to get rate stats', { error });
      return {
        currentRate: CACHE_CONFIG.FALLBACK_RATE,
        source: 'Error',
        lastUpdated: null,
        cacheHitRate: 0,
      };
    }
  }
}

export default RiskRateService;