/**
 * Subscription Plans Seed Data
 * Initial data for plans (Free, Pro, Enterprise) and features
 */

import type { NewSubscriptionPlan, NewSubscriptionFeature } from '../schema/subscription-plans.schema';

/**
 * Subscription Features Seed
 * Define all available features that can be assigned to plans
 */
export const subscriptionFeaturesSeed: NewSubscriptionFeature[] = [
  // === Trading Features ===
  {
    name: 'Basic Trading Bots',
    displayName: 'Bots de Trading Básicos',
    description: 'Crie e execute bots de trading automatizados',
    slug: 'basic_trading_bots',
    category: 'trading',
    isCore: true,
    isPremium: false,
    isEnterprise: false,
    icon: 'robot',
    sortOrder: 1,
  },
  {
    name: 'Advanced Trading Bots',
    displayName: 'Bots Avançados (Ilimitados)',
    description: 'Bots de trading ilimitados com estratégias avançadas',
    slug: 'advanced_trading_bots',
    category: 'trading',
    isCore: false,
    isPremium: true,
    isEnterprise: false,
    icon: 'robot',
    sortOrder: 2,
  },
  {
    name: 'Multiple Exchanges',
    displayName: 'Múltiplas Exchanges',
    description: 'Conecte-se a várias exchanges simultaneamente',
    slug: 'multiple_exchanges',
    category: 'trading',
    isCore: false,
    isPremium: true,
    isEnterprise: false,
    icon: 'exchange',
    sortOrder: 3,
  },
  {
    name: 'Custom Strategies',
    displayName: 'Estratégias Personalizadas',
    description: 'Crie suas próprias estratégias de trading',
    slug: 'custom_strategies',
    category: 'trading',
    isCore: true,
    isPremium: false,
    isEnterprise: false,
    icon: 'strategy',
    sortOrder: 4,
  },
  {
    name: 'Backtesting',
    displayName: 'Backtesting Histórico',
    description: 'Teste suas estratégias com dados históricos',
    slug: 'backtesting',
    category: 'analytics',
    isCore: false,
    isPremium: true,
    isEnterprise: false,
    icon: 'chart-line',
    sortOrder: 5,
  },
  {
    name: 'Advanced Backtesting',
    displayName: 'Backtesting Avançado (Ilimitado)',
    description: 'Backtesting ilimitado com dados de alta qualidade',
    slug: 'advanced_backtesting',
    category: 'analytics',
    isCore: false,
    isPremium: false,
    isEnterprise: true,
    icon: 'chart-line',
    sortOrder: 6,
  },

  // === Analytics Features ===
  {
    name: 'Real-time Analytics',
    displayName: 'Analytics em Tempo Real',
    description: 'Monitore performance dos bots em tempo real',
    slug: 'realtime_analytics',
    category: 'analytics',
    isCore: true,
    isPremium: false,
    isEnterprise: false,
    icon: 'analytics',
    sortOrder: 7,
  },
  {
    name: 'Advanced Reports',
    displayName: 'Relatórios Avançados',
    description: 'Relatórios detalhados de performance e P&L',
    slug: 'advanced_reports',
    category: 'analytics',
    isCore: false,
    isPremium: true,
    isEnterprise: false,
    icon: 'report',
    sortOrder: 8,
  },
  {
    name: 'Custom Dashboards',
    displayName: 'Dashboards Personalizados',
    description: 'Crie dashboards customizados para sua operação',
    slug: 'custom_dashboards',
    category: 'analytics',
    isCore: false,
    isPremium: false,
    isEnterprise: true,
    icon: 'dashboard',
    sortOrder: 9,
  },

  // === AI/ML Features ===
  {
    name: 'AI Models',
    displayName: 'Modelos de IA (LSTM, etc)',
    description: 'Acesso a modelos de IA para predição de mercado',
    slug: 'ai_models',
    category: 'ai',
    isCore: false,
    isPremium: true,
    isEnterprise: false,
    icon: 'brain',
    sortOrder: 10,
  },
  {
    name: 'Sentiment Analysis',
    displayName: 'Análise de Sentimento',
    description: 'Análise de sentimento de mercado em tempo real',
    slug: 'sentiment_analysis',
    category: 'ai',
    isCore: false,
    isPremium: false,
    isEnterprise: true,
    icon: 'sentiment',
    sortOrder: 11,
  },

  // === API & Integration Features ===
  {
    name: 'API Access',
    displayName: 'Acesso à API',
    description: 'Acesso programático via REST API',
    slug: 'api_access',
    category: 'integrations',
    isCore: false,
    isPremium: true,
    isEnterprise: false,
    icon: 'api',
    sortOrder: 12,
  },
  {
    name: 'Webhooks',
    displayName: 'Webhooks',
    description: 'Receba notificações em tempo real via webhooks',
    slug: 'webhooks',
    category: 'integrations',
    isCore: false,
    isPremium: true,
    isEnterprise: false,
    icon: 'webhook',
    sortOrder: 13,
  },
  {
    name: 'Advanced Webhooks',
    displayName: 'Webhooks Avançados (Ilimitados)',
    description: 'Webhooks ilimitados com lógica customizada',
    slug: 'advanced_webhooks',
    category: 'integrations',
    isCore: false,
    isPremium: false,
    isEnterprise: true,
    icon: 'webhook',
    sortOrder: 14,
  },

  // === Support Features ===
  {
    name: 'Email Support',
    displayName: 'Suporte por Email',
    description: 'Suporte via email em até 48h',
    slug: 'email_support',
    category: 'support',
    isCore: true,
    isPremium: false,
    isEnterprise: false,
    icon: 'email',
    sortOrder: 15,
  },
  {
    name: 'Priority Support',
    displayName: 'Suporte Prioritário',
    description: 'Suporte prioritário em até 4h',
    slug: 'priority_support',
    category: 'support',
    isCore: false,
    isPremium: true,
    isEnterprise: false,
    icon: 'support',
    sortOrder: 16,
  },
  {
    name: 'Dedicated Support',
    displayName: 'Suporte Dedicado',
    description: 'Gerente de conta dedicado + Slack privado',
    slug: 'dedicated_support',
    category: 'support',
    isCore: false,
    isPremium: false,
    isEnterprise: true,
    icon: 'support',
    sortOrder: 17,
  },

  // === Enterprise Features ===
  {
    name: 'White Label',
    displayName: 'White Label',
    description: 'Plataforma com sua marca',
    slug: 'white_label',
    category: 'enterprise',
    isCore: false,
    isPremium: false,
    isEnterprise: true,
    icon: 'brand',
    sortOrder: 18,
  },
  {
    name: 'Custom Domain',
    displayName: 'Domínio Personalizado',
    description: 'Use seu próprio domínio',
    slug: 'custom_domain',
    category: 'enterprise',
    isCore: false,
    isPremium: false,
    isEnterprise: true,
    icon: 'domain',
    sortOrder: 19,
  },
  {
    name: 'SLA 99.9%',
    displayName: 'SLA 99.9% Uptime',
    description: 'Garantia de disponibilidade de 99.9%',
    slug: 'sla_guarantee',
    category: 'enterprise',
    isCore: false,
    isPremium: false,
    isEnterprise: true,
    icon: 'shield',
    sortOrder: 20,
  },
];

/**
 * Subscription Plans Seed
 * Define the 3 main plans: Free, Pro, Enterprise
 */
export const subscriptionPlansSeed: NewSubscriptionPlan[] = [
  // === FREE PLAN ===
  {
    name: 'Free',
    displayName: 'Plano Gratuito',
    description: 'Perfeito para começar com trading automatizado',
    slug: 'free',
    priceMonthly: '0.00',
    priceQuarterly: '0.00',
    priceYearly: '0.00',
    currency: 'BRL',
    limits: {
      maxBots: 1,
      maxStrategies: 3,
      maxBacktests: 5, // per month
      maxExchanges: 1,
      maxApiCalls: 1000, // per month
      maxWebhooks: 0,
      maxAlerts: 5,
      maxOrders: 10, // per day
      storageGB: 1,
      historicalDataMonths: 3,
      aiModelAccess: false,
      prioritySupport: false,
      customDomain: false,
      whiteLabel: false,
      apiAccess: false,
      webhookAccess: false,
    },
    features: [
      'basic_trading_bots',
      'custom_strategies',
      'realtime_analytics',
      'email_support',
    ],
    isActive: true,
    isPublic: true,
    isFeatured: false,
    sortOrder: 1,
    trialDays: 0,
    trialPrice: '0.00',
  },

  // === PRO PLAN ===
  {
    name: 'Pro',
    displayName: 'Plano Pro',
    description: 'Para traders sérios que querem maximizar resultados',
    slug: 'pro',
    priceMonthly: '29.00',
    priceQuarterly: '82.65', // 5% desconto (2.85 meses)
    priceYearly: '290.00', // 17% desconto (10 meses)
    currency: 'BRL',
    limits: {
      maxBots: 10,
      maxStrategies: 50,
      maxBacktests: 100, // per month
      maxExchanges: 5,
      maxApiCalls: 100000, // per month
      maxWebhooks: 10,
      maxAlerts: 50,
      maxOrders: 500, // per day
      storageGB: 10,
      historicalDataMonths: 12,
      aiModelAccess: true,
      prioritySupport: true,
      customDomain: false,
      whiteLabel: false,
      apiAccess: true,
      webhookAccess: true,
    },
    features: [
      'basic_trading_bots',
      'advanced_trading_bots',
      'multiple_exchanges',
      'custom_strategies',
      'backtesting',
      'realtime_analytics',
      'advanced_reports',
      'ai_models',
      'api_access',
      'webhooks',
      'email_support',
      'priority_support',
    ],
    isActive: true,
    isPublic: true,
    isFeatured: true, // Featured plan
    sortOrder: 2,
    trialDays: 14, // 14-day free trial
    trialPrice: '0.00',
  },

  // === ENTERPRISE PLAN ===
  {
    name: 'Enterprise',
    displayName: 'Plano Enterprise',
    description: 'Solução completa para operações institucionais',
    slug: 'enterprise',
    priceMonthly: '299.00',
    priceQuarterly: '851.57', // 5% desconto (2.85 meses)
    priceYearly: '2990.00', // 17% desconto (10 meses)
    currency: 'BRL',
    limits: {
      maxBots: 999999, // Unlimited
      maxStrategies: 999999, // Unlimited
      maxBacktests: 999999, // Unlimited
      maxExchanges: 999999, // Unlimited
      maxApiCalls: 10000000, // 10M per month
      maxWebhooks: 999999, // Unlimited
      maxAlerts: 999999, // Unlimited
      maxOrders: 999999, // Unlimited
      storageGB: 1000, // 1TB
      historicalDataMonths: 60, // 5 years
      aiModelAccess: true,
      prioritySupport: true,
      customDomain: true,
      whiteLabel: true,
      apiAccess: true,
      webhookAccess: true,
    },
    features: [
      'basic_trading_bots',
      'advanced_trading_bots',
      'multiple_exchanges',
      'custom_strategies',
      'backtesting',
      'advanced_backtesting',
      'realtime_analytics',
      'advanced_reports',
      'custom_dashboards',
      'ai_models',
      'sentiment_analysis',
      'api_access',
      'webhooks',
      'advanced_webhooks',
      'email_support',
      'priority_support',
      'dedicated_support',
      'white_label',
      'custom_domain',
      'sla_guarantee',
    ],
    isActive: true,
    isPublic: true,
    isFeatured: false,
    sortOrder: 3,
    trialDays: 30, // 30-day free trial
    trialPrice: '0.00',
  },

  // === INTERNAL PLAN (Influencers/Parceiros) ===
  {
    name: 'Internal',
    displayName: 'Plano Interno',
    description: 'Plano exclusivo para influencers, parceiros e uso interno da plataforma',
    slug: 'internal',
    priceMonthly: '0.00', // Gratuito para parceiros
    priceQuarterly: '0.00',
    priceYearly: '0.00',
    currency: 'BRL',
    limits: {
      maxBots: 50, // Entre Pro e Enterprise
      maxStrategies: 200,
      maxBacktests: 500, // per month
      maxExchanges: 10,
      maxApiCalls: 500000, // per month
      maxWebhooks: 50,
      maxAlerts: 200,
      maxOrders: 2000, // per day
      storageGB: 50,
      historicalDataMonths: 36, // 3 years
      aiModelAccess: true,
      prioritySupport: true,
      customDomain: false,
      whiteLabel: false,
      apiAccess: true,
      webhookAccess: true,
    },
    features: [
      'basic_trading_bots',
      'advanced_trading_bots',
      'multiple_exchanges',
      'custom_strategies',
      'backtesting',
      'advanced_backtesting',
      'realtime_analytics',
      'advanced_reports',
      'custom_dashboards',
      'ai_models',
      'sentiment_analysis',
      'api_access',
      'webhooks',
      'advanced_webhooks',
      'email_support',
      'priority_support',
    ],
    isActive: true,
    isPublic: false, // NÃO aparece na página de pricing
    isFeatured: false,
    sortOrder: 4,
    trialDays: 0, // Sem trial (já é gratuito)
    trialPrice: '0.00',
  },
];

/**
 * Helper function to get feature IDs by slugs
 * (Used when creating plans with feature references)
 */
export function getFeatureIdsBySlug(
  features: Array<{ id: string; slug: string }>,
  slugs: string[]
): string[] {
  return slugs
    .map((slug) => features.find((f) => f.slug === slug)?.id)
    .filter((id): id is string => id !== undefined);
}
