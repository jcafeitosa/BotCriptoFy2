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
import { subscriptionPlans } from '@/modules/subscriptions/schema/subscription-plans.schema';
import { eq } from 'drizzle-orm';
import { sendResetPasswordEmail, sendVerificationEmail } from './email.service';

/**
 * Stripe Client Instance
 * Using latest stable API version
 */
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
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
      await sendResetPasswordEmail(user.email, url);
    },
    sendVerificationEmail: async ({ user, url }: { user: any; url: string }) => {
      await sendVerificationEmail(user.email, url);
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
          // Load active public plans from DB and map to plugin format
          const plans = await db
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.isActive, true));

          return plans.map((p) => {
            // Filter limits to only include numeric values (Stripe plugin expects Record<string, number>)
            const numericLimits: Record<string, number> = {};
            if (p.limits) {
              for (const [key, value] of Object.entries(p.limits)) {
                if (typeof value === 'number') {
                  numericLimits[key] = value;
                }
              }
            }

            return {
              name: p.slug || p.name,
              priceId: p.stripePriceIdMonthly || undefined,
              annualDiscountPriceId: p.stripePriceIdYearly || undefined,
              limits: Object.keys(numericLimits).length > 0 ? numericLimits : undefined,
              freeTrial: p.trialDays && p.trialDays > 0 ? {
                days: p.trialDays,
                onTrialStart: async (subscription: any) => {
                  logger.info('Trial started', {
                    plan: p.slug,
                    subscriptionId: subscription.id,
                    referenceId: subscription.referenceId,
                  });
                },
                onTrialEnd: async (data: any) => {
                  logger.info('Trial ended', {
                    plan: p.slug,
                    subscriptionId: data.subscription.id,
                    referenceId: data.subscription.referenceId,
                  });
                },
              } : undefined,
            };
          });
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
