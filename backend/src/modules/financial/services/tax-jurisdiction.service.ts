/**
 * Tax Jurisdiction Service
 * Manages global platform tax jurisdiction configuration with database persistence
 * Only CEO can set/change the jurisdiction
 */

import { eq, desc } from 'drizzle-orm';
import { db } from '../../../db';
import {
  taxJurisdictionConfig,
  taxJurisdictionHistory,
} from '../schema/tax-jurisdiction.schema';
import type {
  TaxJurisdiction,
  TaxJurisdictionConfig,
  TaxJurisdictionDisplayInfo,
} from '../types/tax-jurisdiction.types';
import {
  TAX_JURISDICTIONS,
  TAX_JURISDICTION_DISPLAY,
} from '../types/tax-jurisdiction.types';

// Import calculators for both jurisdictions
import * as BrazilValidators from '../utils/validators';
import * as EstoniaTax from '../utils/calculations.estonia';
import * as EstoniaValidators from '../utils/validators.estonia';

/**
 * In-memory cache for performance (synced with database)
 */
let cachedJurisdiction: TaxJurisdictionConfig | null = null;

/**
 * Tax Jurisdiction Service with Database Persistence
 */
export class TaxJurisdictionService {
  /**
   * Initialize service - Load current jurisdiction from database
   */
  async initialize(): Promise<void> {
    try {
      const current = await db
        .select()
        .from(taxJurisdictionConfig)
        .where(eq(taxJurisdictionConfig.isActive, true))
        .orderBy(desc(taxJurisdictionConfig.configuredAt))
        .limit(1);

      if (current.length > 0) {
        const config = current[0];
        cachedJurisdiction = {
          jurisdiction: config.jurisdiction as TaxJurisdiction,
          countryName: config.countryName,
          countryCode: config.countryCode,
          currency: config.currency,
          locale: config.locale,
          taxSystem: config.taxSystem as any,
          configuredAt: config.configuredAt,
          configuredBy: config.configuredBy,
        };

        console.log(`✅ Tax jurisdiction loaded from database: ${config.jurisdiction}`);
      } else {
        console.log('⚠️  No tax jurisdiction configured in database');
      }
    } catch (error) {
      console.error('❌ Failed to load tax jurisdiction from database:', error);
      throw error;
    }
  }

  /**
   * Get current platform tax jurisdiction
   */
  getCurrentJurisdiction(): TaxJurisdictionConfig | null {
    return cachedJurisdiction;
  }

  /**
   * Get all available jurisdictions for selection
   */
  getAvailableJurisdictions(): TaxJurisdictionDisplayInfo[] {
    return Object.values(TAX_JURISDICTION_DISPLAY);
  }

  /**
   * Get specific jurisdiction info
   */
  getJurisdictionInfo(jurisdiction: TaxJurisdiction): TaxJurisdictionDisplayInfo {
    return TAX_JURISDICTION_DISPLAY[jurisdiction];
  }

  /**
   * Set platform tax jurisdiction (CEO only) with database persistence
   * This is a critical operation that affects the entire platform
   */
  async setJurisdiction(
    jurisdiction: TaxJurisdiction,
    userId: string,
    userRole: string,
  ): Promise<{ success: boolean; data?: TaxJurisdictionConfig; error?: string }> {
    // Validate CEO role
    if (userRole !== 'CEO' && userRole !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Only CEO or Super Admin can set tax jurisdiction',
      };
    }

    // Validate jurisdiction exists
    if (!TAX_JURISDICTIONS[jurisdiction]) {
      return {
        success: false,
        error: `Invalid jurisdiction: ${jurisdiction}`,
      };
    }

    try {
      const previousJurisdiction = cachedJurisdiction?.jurisdiction;

      // Start transaction
      const result = await db.transaction(async (tx) => {
        // Deactivate previous configurations
        if (cachedJurisdiction) {
          await tx
            .update(taxJurisdictionConfig)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(taxJurisdictionConfig.isActive, true));
        }

        // Insert new configuration
        const jurisdictionData = TAX_JURISDICTIONS[jurisdiction];
        const [newConfig] = await tx
          .insert(taxJurisdictionConfig)
          .values({
            jurisdiction,
            countryName: jurisdictionData.countryName,
            countryCode: jurisdictionData.countryCode,
            flag: TAX_JURISDICTION_DISPLAY[jurisdiction].flag,
            currency: jurisdictionData.currency,
            currencySymbol: jurisdictionData.currency === 'BRL' ? 'R$' : '€',
            locale: jurisdictionData.locale,
            taxSystem: jurisdictionData.taxSystem as any,
            status: 'active',
            isActive: true,
            configuredAt: new Date(),
            configuredBy: userId,
            configuredByRole: userRole,
            previousJurisdiction: previousJurisdiction || null,
            notes: previousJurisdiction
              ? `Migrated from ${previousJurisdiction}`
              : 'Initial configuration',
          })
          .returning();

        // Create history record
        await tx.insert(taxJurisdictionHistory).values({
          configId: newConfig.id,
          action: previousJurisdiction ? 'migrated' : 'created',
          fromJurisdiction: previousJurisdiction,
          toJurisdiction: jurisdiction,
          changedBy: userId,
          changedByRole: userRole,
          changeReason: previousJurisdiction
            ? `Migration from ${previousJurisdiction} to ${jurisdiction}`
            : 'Initial tax jurisdiction configuration',
          requiresApproval: false, // CEO action is auto-approved
          approvedBy: userId,
          approvedAt: new Date(),
          changedAt: new Date(),
        });

        return newConfig;
      });

      // Update cache
      cachedJurisdiction = {
        jurisdiction,
        countryName: TAX_JURISDICTIONS[jurisdiction].countryName,
        countryCode: TAX_JURISDICTIONS[jurisdiction].countryCode,
        currency: TAX_JURISDICTIONS[jurisdiction].currency,
        locale: TAX_JURISDICTIONS[jurisdiction].locale,
        taxSystem: TAX_JURISDICTIONS[jurisdiction].taxSystem,
        configuredAt: result.configuredAt,
        configuredBy: userId,
      };

      // Log change
      if (previousJurisdiction && previousJurisdiction !== jurisdiction) {
        console.warn(
          `⚠️  Tax jurisdiction changed from ${previousJurisdiction} to ${jurisdiction}`,
        );
        console.warn('⚠️  This will affect all financial calculations platform-wide!');
      } else {
        console.log(`✅ Tax jurisdiction set to ${jurisdiction} by user ${userId}`);
      }

      return {
        success: true,
        data: cachedJurisdiction,
      };
    } catch (error) {
      console.error('❌ Failed to set tax jurisdiction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set jurisdiction',
      };
    }
  }

  /**
   * Calculate VAT using current jurisdiction
   */
  calculateVAT(
    amount: number,
    category?: string,
    date?: Date,
    stateCode?: string,
    _cityCode?: string,
  ): { success: boolean; data?: any; error?: string } {
    if (!cachedJurisdiction) {
      return {
        success: false,
        error: 'Tax jurisdiction not configured. CEO must set jurisdiction first.',
      };
    }

    try {
      let result;

      if (cachedJurisdiction.jurisdiction === 'BR') {
        // Brazilian VAT (ICMS/ISS)
        const rate = this.getBrazilianICMSRate(stateCode || 'SP');
        const vatAmount = (amount * rate) / 100;
        result = {
          jurisdiction: 'BR',
          taxType: 'ICMS',
          amount,
          rate,
          vatAmount: Math.round(vatAmount * 100) / 100,
          totalAmount: Math.round((amount + vatAmount) * 100) / 100,
          stateCode,
        };
      } else if (cachedJurisdiction.jurisdiction === 'EE') {
        // Estonian VAT
        const estoniaCategory = (category as 'standard' | 'reduced' | 'zero') || 'standard';
        const estonianResult = EstoniaTax.calculateEstonianVAT(amount, date || new Date(), estoniaCategory);
        result = {
          ...estonianResult,
          jurisdiction: 'EE',
          taxType: 'VAT',
        };
      } else {
        return {
          success: false,
          error: `Unsupported jurisdiction: ${cachedJurisdiction.jurisdiction}`,
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'VAT calculation failed',
      };
    }
  }

  /**
   * Calculate Corporate Income Tax using current jurisdiction
   */
  calculateCorporateTax(
    amount: number,
    isDistribution: boolean = false,
  ): { success: boolean; data?: any; error?: string } {
    if (!cachedJurisdiction) {
      return {
        success: false,
        error: 'Tax jurisdiction not configured. CEO must set jurisdiction first.',
      };
    }

    try {
      let result;

      if (cachedJurisdiction.jurisdiction === 'BR') {
        // Brazilian Corporate Tax (IRPJ + CSLL)
        const irpj = amount * 0.15; // 15%
        const csll = amount * 0.09; // 9%
        const total = irpj + csll;

        result = {
          jurisdiction: 'BR',
          taxType: 'CORPORATE',
          taxableAmount: amount,
          irpj: Math.round(irpj * 100) / 100,
          csll: Math.round(csll * 100) / 100,
          totalTax: Math.round(total * 100) / 100,
          effectiveRate: 24, // 15% + 9%
          note: 'Tax on all profits (retained and distributed)',
        };
      } else if (cachedJurisdiction.jurisdiction === 'EE') {
        // Estonian Corporate Tax (only on distributions)
        if (!isDistribution || amount === 0) {
          result = {
            jurisdiction: 'EE',
            taxType: 'CORPORATE',
            taxableAmount: amount,
            totalTax: 0,
            effectiveRate: 0,
            note: 'Zero tax on retained profits (Estonia unique feature)',
          };
        } else {
          const cit = EstoniaTax.calculateEstonianCIT(amount, true);
          result = {
            jurisdiction: 'EE',
            taxType: 'CORPORATE',
            ...cit,
            note: 'Tax only on distributed profits',
          };
        }
      } else {
        return {
          success: false,
          error: `Unsupported jurisdiction: ${cachedJurisdiction.jurisdiction}`,
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Corporate tax calculation failed',
      };
    }
  }

  /**
   * Validate tax ID using current jurisdiction
   */
  validateTaxId(
    taxId: string,
    type: 'personal' | 'business' | 'vat',
  ): { success: boolean; valid?: boolean; formatted?: string; error?: string } {
    if (!cachedJurisdiction) {
      return {
        success: false,
        error: 'Tax jurisdiction not configured. CEO must set jurisdiction first.',
      };
    }

    try {
      let valid = false;
      let formatted = taxId;

      if (cachedJurisdiction.jurisdiction === 'BR') {
        if (type === 'personal') {
          valid = BrazilValidators.validateCPF(taxId);
          if (valid) formatted = BrazilValidators.formatTaxId(taxId);
        } else if (type === 'business' || type === 'vat') {
          valid = BrazilValidators.validateCNPJ(taxId);
          if (valid) formatted = BrazilValidators.formatTaxId(taxId);
        }
      } else if (cachedJurisdiction.jurisdiction === 'EE') {
        if (type === 'personal') {
          valid = EstoniaValidators.validateEstonianPersonalCode(taxId);
          if (valid) formatted = EstoniaValidators.formatEstonianPersonalCode(taxId);
        } else if (type === 'business') {
          valid = EstoniaValidators.validateEstonianBusinessCode(taxId);
        } else if (type === 'vat') {
          valid = EstoniaValidators.validateEstonianVAT(taxId);
          if (valid) formatted = EstoniaValidators.formatEstonianVAT(taxId);
        }
      }

      return {
        success: true,
        valid,
        formatted,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tax ID validation failed',
      };
    }
  }

  /**
   * Get Brazilian ICMS rate by state
   */
  private getBrazilianICMSRate(stateCode: string): number {
    const rates: Record<string, number> = {
      SP: 18, // São Paulo
      RJ: 20, // Rio de Janeiro
      MG: 18, // Minas Gerais
      RS: 17, // Rio Grande do Sul
      PR: 19, // Paraná
      SC: 17, // Santa Catarina
      BA: 18, // Bahia
      PE: 18, // Pernambuco
      CE: 18, // Ceará
      PA: 17, // Pará
    };

    return rates[stateCode] || 18; // Default 18%
  }

  /**
   * Get jurisdiction-specific configuration
   */
  getJurisdictionConfig(): {
    success: boolean;
    data?: {
      jurisdiction: TaxJurisdiction;
      currency: string;
      locale: string;
      features: string[];
    };
    error?: string;
  } {
    if (!cachedJurisdiction) {
      return {
        success: false,
        error: 'Tax jurisdiction not configured',
      };
    }

    return {
      success: true,
      data: {
        jurisdiction: cachedJurisdiction.jurisdiction,
        currency: cachedJurisdiction.currency,
        locale: cachedJurisdiction.locale,
        features: cachedJurisdiction.taxSystem.specialFeatures,
      },
    };
  }

  /**
   * Get jurisdiction history (audit trail)
   */
  async getJurisdictionHistory(): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const history = await db
        .select()
        .from(taxJurisdictionHistory)
        .orderBy(desc(taxJurisdictionHistory.changedAt))
        .limit(50);

      return {
        success: true,
        data: history,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch history',
      };
    }
  }

  /**
   * Reset jurisdiction (for testing or migration)
   * CEO only
   */
  async resetJurisdiction(
    userId: string,
    userRole: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (userRole !== 'CEO' && userRole !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Only CEO or Super Admin can reset jurisdiction',
      };
    }

    try {
      // Deactivate all configurations
      await db
        .update(taxJurisdictionConfig)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(taxJurisdictionConfig.isActive, true));

      // Clear cache
      cachedJurisdiction = null;

      console.log(`⚠️  Tax jurisdiction reset by user ${userId}`);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset jurisdiction',
      };
    }
  }
}

// Export singleton instance
export const taxJurisdictionService = new TaxJurisdictionService();
