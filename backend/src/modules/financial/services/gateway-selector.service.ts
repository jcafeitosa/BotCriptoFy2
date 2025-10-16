/**
 * Gateway Selector Service
 *
 * Intelligently selects the best payment gateway based on:
 * - Country and currency support
 * - Payment method availability
 * - Gateway fees
 * - User preferences
 * - Gateway priority and availability
 */

import { db } from '../../../db';
import { paymentGateways } from '../schema/payments.schema';
import { eq, and } from 'drizzle-orm';
import type {
  GatewayConfig,
  GatewaySelectionCriteria,
  GatewaySelectionResult,
  PaymentMethodType,
} from '../types/payment.types';

/**
 * Gateway Selector Service
 */
export class GatewaySelector {
  /**
   * Select the best gateway for a payment
   */
  async selectGateway(criteria: GatewaySelectionCriteria): Promise<GatewaySelectionResult> {
    // Load all active gateways
    const activeGateways = await this.getActiveGateways();

    if (activeGateways.length === 0) {
      throw new Error('No active payment gateways available');
    }

    // Filter gateways that support the required criteria
    const eligibleGateways = this.filterEligibleGateways(activeGateways, criteria);

    if (eligibleGateways.length === 0) {
      throw new Error(
        `No gateway available for ${criteria.paymentMethod} in ${criteria.country} (${criteria.currency})`
      );
    }

    // Calculate fees and rank gateways
    const rankedGateways = this.rankGateways(eligibleGateways, criteria);

    // Select the best gateway
    const selectedGateway = rankedGateways[0];

    return {
      gateway: selectedGateway.gateway,
      estimatedFees: selectedGateway.fees,
      estimatedTotal: criteria.amount + selectedGateway.fees,
    };
  }

  /**
   * Get all available gateways for a country/currency
   */
  async getAvailableGateways(
    country: string,
    currency: string,
    paymentMethod?: PaymentMethodType
  ): Promise<GatewayConfig[]> {
    const activeGateways = await this.getActiveGateways();

    return activeGateways.filter((gateway) => {
      // Check country support
      if (!gateway.supportedCountries.includes(country)) {
        return false;
      }

      // Check currency support
      if (!gateway.supportedCurrencies.includes(currency)) {
        return false;
      }

      // Check payment method support if specified
      if (paymentMethod) {
        const method = gateway.supportedMethods[paymentMethod];
        if (!method || !method.enabled) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Load all active gateways from database
   */
  private async getActiveGateways(): Promise<GatewayConfig[]> {
    const gateways = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.isActive, true));

    return gateways.map((gateway) => ({
      name: gateway.name,
      slug: gateway.slug,
      provider: gateway.provider as any,
      isActive: gateway.isActive,
      isPrimary: gateway.isPrimary,
      supportedCountries: gateway.supportedCountries,
      supportedCurrencies: gateway.supportedCurrencies,
      supportedMethods: gateway.supportedMethods as any,
      configuration: gateway.configuration as any,
      fees: gateway.fees as any,
      webhookUrl: gateway.webhookUrl || undefined,
    }));
  }

  /**
   * Filter gateways that meet the selection criteria
   */
  private filterEligibleGateways(
    gateways: GatewayConfig[],
    criteria: GatewaySelectionCriteria
  ): GatewayConfig[] {
    return gateways.filter((gateway) => {
      // Check country support
      if (!gateway.supportedCountries.includes(criteria.country)) {
        return false;
      }

      // Check currency support
      if (!gateway.supportedCurrencies.includes(criteria.currency)) {
        return false;
      }

      // Check payment method support
      const method = gateway.supportedMethods[criteria.paymentMethod];
      if (!method || !method.enabled) {
        return false;
      }

      // Check user preferences if provided
      if (criteria.userPreferences && criteria.userPreferences.length > 0) {
        // If user has gateway preferences, prioritize them
        if (!criteria.userPreferences.includes(gateway.slug)) {
          // Don't exclude, just deprioritize
        }
      }

      return true;
    });
  }

  /**
   * Rank gateways by fees, priority, and user preferences
   */
  private rankGateways(
    gateways: GatewayConfig[],
    criteria: GatewaySelectionCriteria
  ): Array<{ gateway: GatewayConfig; fees: number; score: number }> {
    const rankedGateways = gateways.map((gateway) => {
      // Calculate fees
      const fees = this.calculateGatewayFees(gateway, criteria.amount, criteria.paymentMethod);

      // Calculate selection score (lower is better)
      let score = fees;

      // Primary gateway gets priority (reduce score by 10%)
      if (gateway.isPrimary) {
        score *= 0.9;
      }

      // User preferred gateway gets priority (reduce score by 20%)
      if (criteria.userPreferences && criteria.userPreferences.includes(gateway.slug)) {
        score *= 0.8;
      }

      return {
        gateway,
        fees,
        score,
      };
    });

    // Sort by score (lower is better)
    return rankedGateways.sort((a, b) => a.score - b.score);
  }

  /**
   * Calculate gateway fees for a payment
   */
  private calculateGatewayFees(
    gateway: GatewayConfig,
    amount: number,
    paymentMethod: PaymentMethodType
  ): number {
    const method = gateway.supportedMethods[paymentMethod];
    if (!method) {
      return 0;
    }

    // Get method-specific fees
    const methodFees = method.fees || gateway.fees;

    const fixedFee = methodFees.fixed || 0;
    const percentageFee = (methodFees.percentage || 0) / 100;

    return fixedFee + amount * percentageFee;
  }

  /**
   * Get gateway by slug
   */
  async getGatewayBySlug(slug: string): Promise<GatewayConfig | null> {
    const gateway = await db
      .select()
      .from(paymentGateways)
      .where(and(eq(paymentGateways.slug, slug), eq(paymentGateways.isActive, true)))
      .limit(1);

    if (gateway.length === 0) {
      return null;
    }

    const g = gateway[0];
    return {
      name: g.name,
      slug: g.slug,
      provider: g.provider as any,
      isActive: g.isActive,
      isPrimary: g.isPrimary,
      supportedCountries: g.supportedCountries,
      supportedCurrencies: g.supportedCurrencies,
      supportedMethods: g.supportedMethods as any,
      configuration: g.configuration as any,
      fees: g.fees as any,
      webhookUrl: g.webhookUrl || undefined,
    };
  }

  /**
   * Get primary gateway for a country
   */
  async getPrimaryGateway(country: string, currency: string): Promise<GatewayConfig | null> {
    const gateways = await db
      .select()
      .from(paymentGateways)
      .where(and(eq(paymentGateways.isActive, true), eq(paymentGateways.isPrimary, true)));

    const primaryGateway = gateways.find(
      (g) =>
        g.supportedCountries.includes(country) && g.supportedCurrencies.includes(currency)
    );

    if (!primaryGateway) {
      return null;
    }

    return {
      name: primaryGateway.name,
      slug: primaryGateway.slug,
      provider: primaryGateway.provider as any,
      isActive: primaryGateway.isActive,
      isPrimary: primaryGateway.isPrimary,
      supportedCountries: primaryGateway.supportedCountries,
      supportedCurrencies: primaryGateway.supportedCurrencies,
      supportedMethods: primaryGateway.supportedMethods as any,
      configuration: primaryGateway.configuration as any,
      fees: primaryGateway.fees as any,
      webhookUrl: primaryGateway.webhookUrl || undefined,
    };
  }

  /**
   * Validate if a gateway supports specific criteria
   */
  validateGatewaySupport(gateway: GatewayConfig, criteria: GatewaySelectionCriteria): {
    supported: boolean;
    reason?: string;
  } {
    // Check country
    if (!gateway.supportedCountries.includes(criteria.country)) {
      return {
        supported: false,
        reason: `Gateway does not support country: ${criteria.country}`,
      };
    }

    // Check currency
    if (!gateway.supportedCurrencies.includes(criteria.currency)) {
      return {
        supported: false,
        reason: `Gateway does not support currency: ${criteria.currency}`,
      };
    }

    // Check payment method
    const method = gateway.supportedMethods[criteria.paymentMethod];
    if (!method || !method.enabled) {
      return {
        supported: false,
        reason: `Gateway does not support payment method: ${criteria.paymentMethod}`,
      };
    }

    return { supported: true };
  }
}

// Export singleton instance
export const gatewaySelector = new GatewaySelector();
