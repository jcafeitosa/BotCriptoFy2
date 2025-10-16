/**
 * Tax Jurisdiction Types
 * Defines available tax jurisdictions and configuration
 */

/**
 * Supported Tax Jurisdictions
 */
export type TaxJurisdiction = 'BR' | 'EE';

/**
 * Tax Jurisdiction Configuration
 */
export interface TaxJurisdictionConfig {
  jurisdiction: TaxJurisdiction;
  countryName: string;
  countryCode: string;
  currency: string;
  locale: string;
  taxSystem: {
    hasVAT: boolean;
    hasCorporateTax: boolean;
    hasPersonalIncomeTax: boolean;
    hasSocialTax: boolean;
    specialFeatures: string[];
  };
  configuredAt: Date;
  configuredBy: string; // CEO user ID
}

/**
 * Tax Jurisdiction Metadata
 */
export const TAX_JURISDICTIONS: Record<TaxJurisdiction, Omit<TaxJurisdictionConfig, 'configuredAt' | 'configuredBy'>> = {
  BR: {
    jurisdiction: 'BR',
    countryName: 'Brazil',
    countryCode: 'BRA',
    currency: 'BRL',
    locale: 'pt-BR',
    taxSystem: {
      hasVAT: true,
      hasCorporateTax: true,
      hasPersonalIncomeTax: true,
      hasSocialTax: true,
      specialFeatures: [
        'CPF/CNPJ validation',
        'NF-e (Electronic Invoice)',
        'SPED (Digital Tax Bookkeeping)',
        'Multiple tax types (ICMS, ISS, PIS, COFINS, IRPJ, CSLL)',
        'State and municipal taxes',
        'Complex tax burden (~33.25% federal)',
      ],
    },
  },
  EE: {
    jurisdiction: 'EE',
    countryName: 'Estonia',
    countryCode: 'EST',
    currency: 'EUR',
    locale: 'et-EE',
    taxSystem: {
      hasVAT: true,
      hasCorporateTax: true,
      hasPersonalIncomeTax: true,
      hasSocialTax: true,
      specialFeatures: [
        'Zero tax on retained profits (unique in EU)',
        'E-Residency program support',
        'Tax only on distributed profits',
        'Simple 20% flat personal income tax',
        'Digital-first tax filing (99% online)',
        'Business-friendly startup ecosystem',
      ],
    },
  },
};

/**
 * Tax Jurisdiction Display Info
 */
export interface TaxJurisdictionDisplayInfo {
  jurisdiction: TaxJurisdiction;
  name: string;
  flag: string;
  description: string;
  advantages: string[];
  bestFor: string[];
  taxRates: {
    vat: string;
    corporate: string;
    personal: string;
  };
}

export const TAX_JURISDICTION_DISPLAY: Record<TaxJurisdiction, TaxJurisdictionDisplayInfo> = {
  BR: {
    jurisdiction: 'BR',
    name: 'Brazil',
    flag: '🇧🇷',
    description: 'Brazilian tax system with full compliance for CPF, CNPJ, NF-e, and SPED',
    advantages: [
      'Complete Brazilian tax compliance',
      'CPF/CNPJ validation with check digits',
      'NF-e (Electronic Fiscal Document) support',
      'SPED integration ready',
      'Support for all Brazilian tax types',
    ],
    bestFor: [
      'Companies operating in Brazil',
      'Brazilian startups and SMEs',
      'Businesses needing NF-e compliance',
      'Companies with Brazilian customers/suppliers',
    ],
    taxRates: {
      vat: 'ICMS: 17-20% (state), ISS: 2-5% (municipal)',
      corporate: 'IRPJ: 15%, CSLL: 9% + PIS/COFINS: 9.25%',
      personal: 'Progressive: 0-27.5%',
    },
  },
  EE: {
    jurisdiction: 'EE',
    name: 'Estonia',
    flag: '🇪🇪',
    description: 'Estonian tax system with zero tax on retained profits - ideal for startups and digital businesses',
    advantages: [
      'Zero tax on retained profits (unique in EU)',
      'Tax only when distributing dividends',
      'E-Residency program support',
      'Simple 20% flat personal income tax',
      '99% digital tax filing',
      'EU single market access',
    ],
    bestFor: [
      'Tech startups planning to scale',
      'Digital nomads and remote entrepreneurs',
      'E-Residency company holders',
      'Companies focusing on growth/reinvestment',
      'EU-based businesses',
    ],
    taxRates: {
      vat: 'Standard: 22%, Reduced: 9%, Zero: 0%',
      corporate: '0% on retained, 20/80 on distributions',
      personal: 'Flat: 20%',
    },
  },
};
