/**
 * Payment Gateways Seed
 *
 * Initial configuration for payment gateways
 * Run with: bun run src/db/seeds/payment-gateways.seed.ts
 */

import { db } from '../connection';
import { paymentGateways } from '../../modules/financial/schema/payments.schema';

/**
 * Seed payment gateways
 */
async function seedPaymentGateways() {
  console.log('🌱 Seeding payment gateways...');

  try {
    // InfinityPay - Primary gateway for Brazil
    await db.insert(paymentGateways).values({
      name: 'InfinityPay',
      slug: 'infinitypay',
      provider: 'infinitypay',
      isActive: false, // Set to true when configured
      isPrimary: true,
      supportedCountries: ['BR'],
      supportedCurrencies: ['BRL'],
      supportedMethods: {
        pix: {
          enabled: true,
          instant: true,
          fees: {
            fixed: 0,
            percentage: 0.99,
          },
        },
        credit_card: {
          enabled: true,
          instant: false,
          brands: ['visa', 'mastercard', 'elo', 'amex', 'hipercard'],
          installments: {
            enabled: true,
            max: 12,
            fees: {
              1: 0,
              2: 1.5,
              3: 2.0,
              6: 2.5,
              12: 3.0,
            },
          },
          fees: {
            fixed: 0,
            percentage: 3.99,
          },
        },
        debit_card: {
          enabled: true,
          instant: true,
          brands: ['visa', 'mastercard', 'elo'],
          fees: {
            fixed: 0,
            percentage: 1.99,
          },
        },
        boleto: {
          enabled: true,
          instant: false,
          fees: {
            fixed: 2.90,
            percentage: 0,
          },
        },
      },
      configuration: {
        baseUrl: 'https://api.infinitypay.io/v2',
        apiKey: process.env.INFINITYPAY_API_KEY || '',
        apiSecret: process.env.INFINITYPAY_API_SECRET || '',
        webhookSecret: process.env.INFINITYPAY_WEBHOOK_SECRET || '',
      },
      fees: {
        fixed: 0,
        percentage: 0.99,
      },
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/infinitypay`,
    });

    // Stripe - International gateway
    await db.insert(paymentGateways).values({
      name: 'Stripe',
      slug: 'stripe',
      provider: 'stripe',
      isActive: false, // Set to true when configured
      isPrimary: false,
      supportedCountries: ['US', 'CA', 'GB', 'AU', 'EU'],
      supportedCurrencies: ['USD', 'CAD', 'GBP', 'EUR', 'AUD'],
      supportedMethods: {
        credit_card: {
          enabled: true,
          instant: false,
          brands: ['visa', 'mastercard', 'amex'],
          fees: {
            fixed: 0.30,
            percentage: 2.9,
          },
        },
        debit_card: {
          enabled: true,
          instant: true,
          brands: ['visa', 'mastercard'],
          fees: {
            fixed: 0.30,
            percentage: 2.9,
          },
        },
        digital_wallet: {
          enabled: true,
          instant: true,
          brands: ['apple_pay', 'google_pay'],
          fees: {
            fixed: 0.30,
            percentage: 2.9,
          },
        },
      },
      configuration: {
        baseUrl: 'https://api.stripe.com/v1',
        apiKey: process.env.STRIPE_SECRET_KEY || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      },
      fees: {
        fixed: 0.30,
        percentage: 2.9,
      },
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/stripe`,
    });

    // Banco - Internal gateway for PIX and transfers
    await db.insert(paymentGateways).values({
      name: 'Banco Interno',
      slug: 'banco',
      provider: 'banco',
      isActive: false, // Set to true when banco module is ready
      isPrimary: false,
      supportedCountries: ['BR'],
      supportedCurrencies: ['BRL'],
      supportedMethods: {
        pix: {
          enabled: true,
          instant: true,
          fees: {
            fixed: 0,
            percentage: 0,
          },
        },
        bank_transfer: {
          enabled: true,
          instant: false,
          fees: {
            fixed: 0,
            percentage: 0,
          },
        },
        digital_wallet: {
          enabled: true,
          instant: true,
          fees: {
            fixed: 0,
            percentage: 0,
          },
        },
      },
      configuration: {
        baseUrl: `${process.env.APP_URL}/api/v1/banco`,
        apiKey: process.env.BANCO_INTERNAL_API_KEY || 'internal',
        webhookSecret: process.env.BANCO_WEBHOOK_SECRET || '',
      },
      fees: {
        fixed: 0,
        percentage: 0,
      },
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/banco`,
    });

    console.log('✅ Payment gateways seeded successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure environment variables:');
    console.log('   - INFINITYPAY_API_KEY');
    console.log('   - INFINITYPAY_API_SECRET');
    console.log('   - INFINITYPAY_WEBHOOK_SECRET');
    console.log('   - STRIPE_SECRET_KEY');
    console.log('   - STRIPE_PUBLISHABLE_KEY');
    console.log('   - STRIPE_WEBHOOK_SECRET');
    console.log('   - BANCO_INTERNAL_API_KEY');
    console.log('   - BANCO_WEBHOOK_SECRET');
    console.log('   - APP_URL (e.g., https://yourdomain.com)');
    console.log('\n2. Update isActive to true for gateways you want to enable');
    console.log('\n3. Test webhooks using the URLs:');
    console.log(`   - InfinityPay: ${process.env.APP_URL}/api/v1/webhooks/infinitypay`);
    console.log(`   - Stripe: ${process.env.APP_URL}/api/v1/webhooks/stripe`);
    console.log(`   - Banco: ${process.env.APP_URL}/api/v1/webhooks/banco`);
  } catch (error) {
    console.error('❌ Error seeding payment gateways:', error);
    throw error;
  }
}

// Run seed if executed directly
if (import.meta.main) {
  await seedPaymentGateways();
  process.exit(0);
}

export { seedPaymentGateways };
