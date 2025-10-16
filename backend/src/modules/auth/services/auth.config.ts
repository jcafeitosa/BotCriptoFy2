/**
 * Better-Auth Configuration
 *
 * Server-side authentication configuration using Better-Auth
 * @see https://www.better-auth.com/docs/introduction
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { stripe as stripePlugin } from '@better-auth/stripe';
import Stripe from 'stripe';
import { db } from '@/db';
import * as authSchema from '../schema/auth.schema';
import logger from '@/utils/logger';

/**
 * Stripe Client Instance
 */
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia' as any,
});

/**
 * Better-Auth Instance
 *
 * Configurado com Drizzle adapter para PostgreSQL
 */
export const auth = betterAuth({
  /**
   * Database Adapter (Drizzle + PostgreSQL)
   */
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authSchema.users,
      session: authSchema.sessions,
      account: authSchema.accounts,
      verification: authSchema.verifications,
      twoFactor: authSchema.twoFactor,
      passkey: authSchema.passkeys,
      subscription: authSchema.subscriptions,
    },
  }),

  /**
   * Email & Password Authentication
   */
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }: { user: any; url: string }) => {
      // Email sending via SMTP (configured via environment variables)
      // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD required
      logger.info('Password reset requested', {
        email: user.email,
        resetUrl: url,
      });
      // Implementation: Use nodemailer or similar SMTP client
    },
    sendVerificationEmail: async ({ user, url }: { user: any; url: string }) => {
      // Email sending via SMTP (configured via environment variables)
      // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD required
      logger.info('Email verification requested', {
        email: user.email,
        verificationUrl: url,
      });
      // Implementation: Use nodemailer or similar SMTP client
    },
  },

  /**
   * Session Configuration
   */
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
  },

  /**
   * Account Configuration
   */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github'],
    },
  },

  /**
   * Security Options
   */
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
    cookieSameSite: 'lax',
  },

  /**
   * Social Providers (Optional)
   */
  socialProviders: {
    // Configurar depois quando necessário
    // google: {
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // },
    // github: {
    //   clientId: process.env.GITHUB_CLIENT_ID!,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    // },
  },

  /**
   * Two-Factor Authentication (Optional)
   */
  twoFactor: {
    enabled: true,
    issuer: 'BotCriptoFy2',
  },

  /**
   * Passkeys/WebAuthn (Optional)
   */
  // passkey: {
  //   enabled: true,
  //   rpName: 'BotCriptoFy2',
  //   rpID: process.env.PASSKEY_RP_ID || 'localhost',
  //   origin: process.env.PASSKEY_ORIGIN || 'http://localhost:4321',
  // },

  /**
   * Trusted Origins (CORS)
   */
  trustedOrigins: [
    process.env.FRONTEND_URL || 'http://localhost:4321',
    'http://localhost:4321',
  ],

  /**
   * Plugins
   */
  plugins: [
    stripePlugin({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: async () => {
          // Planos de assinatura integrados com Stripe
          // Os Stripe Price IDs devem ser configurados no Stripe Dashboard primeiro
          return [
            {
              name: 'free',
              limits: {
                maxBots: 1,
                maxStrategies: 3,
                maxBacktests: 5,
                maxExchanges: 1,
                maxApiCalls: 1000,
              },
              // Free plan não tem price ID (não cobra)
            },
            {
              name: 'pro',
              // Stripe Price IDs (configure via environment variables)
              priceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
              annualDiscountPriceId: process.env.STRIPE_PRICE_PRO_YEARLY,
              limits: {
                maxBots: 10,
                maxStrategies: 50,
                maxBacktests: 100,
                maxExchanges: 5,
                maxApiCalls: 100000,
              },
              freeTrial: {
                days: 14, // 14 days
                onTrialStart: async (subscription: any) => {
                  logger.info('Pro plan trial started', {
                    subscriptionId: subscription.id,
                    referenceId: subscription.referenceId,
                  });
                },
                onTrialEnd: async (data: any) => {
                  logger.info('Pro plan trial ended', {
                    subscriptionId: data.subscription.id,
                    referenceId: data.subscription.referenceId,
                  });
                },
              },
            },
            {
              name: 'enterprise',
              // Stripe Price IDs (configure via environment variables)
              priceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
              annualDiscountPriceId: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
              limits: {
                maxBots: 999999,
                maxStrategies: 999999,
                maxBacktests: 999999,
                maxExchanges: 999999,
                maxApiCalls: 10000000,
              },
              freeTrial: {
                days: 30, // 30 days
                onTrialStart: async (subscription: any) => {
                  logger.info('Enterprise plan trial started', {
                    subscriptionId: subscription.id,
                    referenceId: subscription.referenceId,
                  });
                },
                onTrialEnd: async (data: any) => {
                  logger.info('Enterprise plan trial ended', {
                    subscriptionId: data.subscription.id,
                    referenceId: data.subscription.referenceId,
                  });
                },
              },
            },
            {
              name: 'internal',
              // Plano interno para influencers/parceiros - SEM Stripe (gratuito)
              // Atribuído manualmente via admin panel
              limits: {
                maxBots: 50,
                maxStrategies: 200,
                maxBacktests: 500,
                maxExchanges: 10,
                maxApiCalls: 500000,
              },
              // Sem trial (já é gratuito permanentemente)
            },
          ];
        },
      },
    }),
  ],
});

/**
 * Auth API Handler
 *
 * Exporta o handler HTTP que processa todas as requisições de auth
 */
export const authHandler = auth.handler;

/**
 * Auth API
 *
 * Métodos auxiliares para operações de autenticação
 */
export const authApi = auth.api;
