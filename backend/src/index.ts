import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import 'dotenv/config';
import logger from './utils/logger';
import redis from './utils/redis';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { transformMiddleware } from './middleware/transform';
import { healthRoutes } from './routes/health.routes';
import { infoRoutes } from './routes/info.routes';
import { errorRoutes } from './routes/error.routes';
import { authRoutes, authCustomRoutes, adminAuthRoutes, devAuthRoutes } from './modules/auth';
import { userRoutes } from './modules/users';
import { tenantRoutes } from './modules/tenants';
import { departmentRoutes, membershipRoutes, analyticsRoutes } from './modules/departments';
import { notificationRoutes } from './modules/notifications';
import { configurationRoutes } from './modules/configurations';
import { securityRoutes } from './modules/security';
import { auditRoutes } from './modules/audit';
import { rateLimitMiddleware, rateLimitRoutes } from './modules/rate-limiting';
import { metricsMiddleware, metricsRoutes } from './monitoring';
import {
  invoiceRoutes,
  expenseRoutes,
  budgetRoutes,
  ledgerRoutes,
  taxRoutes,
  reportRoutes,
  taxJurisdictionRoutes,
  taxReportRoutes,
  paymentRoutes,
  gatewayRoutes,
  webhookRoutes,
} from './modules/financial/routes';
import {
  publicSubscriptionRoutes,
  authenticatedSubscriptionRoutes,
  usageSubscriptionRoutes,
  adminSubscriptionRoutes,
} from './modules/subscriptions';
import { ceoRoutes } from './modules/ceo';
import { walletRoutes, portfolioRoutes } from './modules/banco';
import { affiliateModule } from './modules/affiliate';
import { mmnModule } from './modules/mmn';
import { p2pMarketplaceModule } from './modules/p2p-marketplace';
import { socialTradingModule } from './modules/social-trading';
import { documentsRoutes, foldersRoutes, sharesRoutes } from './modules/documents/routes';
import { marketingRoutes } from './modules/marketing/routes';
import { contactsRoutes, dealsRoutes, pipelineRoutes, activitiesRoutes, analyticsRoutes as salesAnalyticsRoutes } from './modules/sales/routes';
import { agentsRoutes } from './modules/agents';
import { ticketsRoutes, slaRoutes, kbRoutes, automationsRoutes, cannedResponsesRoutes, analyticsRoutes as supportAnalyticsRoutes } from './modules/support/routes';
import { exchangesRoutes } from './modules/exchanges';
import { marketDataRoutes } from './modules/market-data';
import { ordersRoutes } from './modules/orders';
import { strategiesRoutes } from './modules/strategies';
import { positionsRouter } from './modules/positions';
import { riskRoutes } from './modules/risk';
import { botsRoutes } from './modules/bots';
import { indicatorsRoutes } from './modules/indicators';
import { sentimentRoutes } from './modules/sentiment/routes/sentiment.routes';
import { initializeNotificationWorkers } from './modules/notifications/services/notification.service';
import { initializeMarketDataPipeline } from './modules/market-data/websocket/pipeline';
import { initializeMembershipEventBus } from './modules/tenants/events/membership-event-bus';
import { initializeMembershipEventsConsumer } from './modules/users/services/membership-events.consumer';

/**
 * BotCriptoFy2 - Backend Server
 * Built with Elysia + Bun + Better-Auth + Drizzle ORM + Winston
 */

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4321';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const WORKER_ID = process.env.WORKER_ID || '1';
const WORKER_COUNT = process.env.WORKER_COUNT || '1';

// Log server startup
logger.info(`Starting server on port ${PORT}`, {
  source: 'server',
  environment: NODE_ENV,
  version: APP_VERSION,
  workerId: WORKER_ID,
  workerCount: WORKER_COUNT,
  clustering: WORKER_COUNT !== '1',
});

// @ts-expect-error - Type instantiation depth exceeded due to many chained .use() calls
const app = (new Elysia()
  // ===========================================
  // MIDDLEWARE LAYER (Order matters!)
  // ===========================================

  // 1. Logging Middleware (first - to log all requests)
  .use(loggerMiddleware)

  // 2. Error Handling Middleware (early - to catch all errors)
  .use(errorMiddleware)

  // 3. Rate Limiting Middleware (protect API from abuse)
  .use(rateLimitMiddleware)

  // 4. Metrics Middleware (collect HTTP metrics)
  .use(metricsMiddleware)

  // ===========================================
  // INFRASTRUCTURE LAYER
  // ===========================================

  // Swagger/Scalar Documentation
  .use(
    swagger({
      documentation: {
        info: {
          title: 'BotCriptoFy2 API',
          version: APP_VERSION,
          description: 'API Documentation for BotCriptoFy2 - SaaS Multi-Tenant Cryptocurrency Trading Platform with Winston Logging',
        },
        tags: [
          // System & Information
          { name: 'Health', description: 'Health check and status endpoints' },
          { name: 'Info', description: 'API information and version' },
          { name: 'Monitoring', description: 'Prometheus metrics and monitoring' },

          // Authentication & Users
          { name: 'Auth', description: 'Authentication endpoints (Better-Auth)' },
          { name: 'User', description: 'User profile and tenant management' },

          // Multi-tenancy & Organization
          { name: 'Tenants', description: 'Multi-tenant management and membership' },
          { name: 'Departments', description: 'Department management and organization' },

          // Security & Permissions
          { name: 'Security', description: 'RBAC, roles, and permissions management' },
          { name: 'Audit', description: 'Audit logging and compliance (LGPD/GDPR)' },
          { name: 'Compliance', description: 'Compliance reports and data retention' },
          { name: 'Rate Limiting', description: 'Rate limiting and API protection' },

          // Communication & Settings
          { name: 'Notifications', description: 'Multi-channel notification system' },
          { name: 'Configurations', description: 'System-wide configurations' },

          // Financial & Tax
          { name: 'Payments', description: 'Multi-gateway payment processing (InfinityPay, Stripe, Banco)' },
          { name: 'Payment Gateways', description: 'Payment gateway management and configuration' },
          { name: 'Webhooks', description: 'Payment webhook endpoints (public, no auth)' },
          { name: 'Tax Jurisdiction', description: 'Tax jurisdiction configuration (CEO only)' },
          { name: 'Tax Reports', description: 'Automated fiscal report generation' },

          // Administrative
          { name: 'Admin', description: 'Administrative operations (auth required)' },
          { name: 'Development', description: 'Development and debugging endpoints' },
          { name: 'Demo', description: 'Demo and testing endpoints' },

          // Subscriptions & Monetization
          { name: 'Subscriptions - Public', description: 'Public subscription plans and features (no auth)' },
          { name: 'Subscriptions - Authenticated', description: 'Manage tenant subscriptions (auth required)' },
          { name: 'Subscriptions - Usage', description: 'Usage tracking and quota management (auth required)' },
          { name: 'Subscriptions - Admin', description: 'Admin subscription management (admin only)' },

          // Executive Dashboard
          { name: 'CEO Dashboard', description: 'Executive dashboard with aggregated metrics and KPIs (CEO only)' },

          // Banco & Wallet System
          { name: 'Banco - Wallets', description: 'Multi-asset wallet management (main, savings, trading, staking)' },
          { name: 'Banco - Transactions', description: 'Deposits, withdrawals, and transfers' },
          { name: 'Banco - Portfolio', description: 'Portfolio analytics and performance tracking' },
          { name: 'Banco - Prices', description: 'Asset prices from CoinGecko' },
          { name: 'Banco - Admin', description: 'Withdrawal approvals and admin operations' },

          // Affiliate Program
          { name: 'Affiliate', description: 'Affiliate program management with referrals, commissions, and payouts' },
          { name: 'Affiliate - Admin', description: 'Admin operations for affiliate program (admin only)' },

          // Document Management
          { name: 'Documents', description: 'Document upload, management, and versioning' },
          { name: 'Folders', description: 'Document folder organization' },
          { name: 'Shares', description: 'Document sharing and permissions' },

          // Marketing & Campaigns
          { name: 'Marketing', description: 'Email campaigns, segmentation, and marketing analytics' },

          // Sales & CRM
          { name: 'Sales - Contacts', description: 'Contact and lead management' },
          { name: 'Sales - Deals', description: 'Deal tracking and opportunity management' },
          { name: 'Sales - Pipeline', description: 'Sales pipeline management and stages' },
          { name: 'Sales - Activities', description: 'Sales activities and task tracking' },
          { name: 'Sales - Analytics', description: 'Sales analytics and performance metrics' },

          // Support & Help Desk
          { name: 'Support - Tickets', description: 'Support ticket system and management' },
          { name: 'Support - SLA', description: 'Service Level Agreement tracking' },
          { name: 'Support - Knowledge Base', description: 'Knowledge base articles and FAQs' },
          { name: 'Support - Automations', description: 'Support workflow automation and rules' },
          { name: 'Support - Canned Responses', description: 'Predefined response templates' },
          { name: 'Support - Analytics', description: 'Support metrics and performance analytics' },

          // Trading System
          { name: 'Exchanges', description: 'Exchange connections and credentials management (105 exchanges via CCXT)' },
          { name: 'Market Data', description: 'OHLCV, trades, order book, and ticker data collection' },
          { name: 'Orders', description: 'Trading orders with 8 order types (market, limit, stop, trailing)' },
          { name: 'Positions', description: 'Trading positions management for futures/margin trading' },
          { name: 'Strategies', description: 'Trading strategies, signals, and backtesting system' },
          { name: 'Risk Management', description: 'Portfolio risk analysis, position sizing, VaR, and performance metrics' },
          { name: 'Bots', description: 'Automated trading bots with grid, DCA, scalping, and other strategies' },
          { name: 'Indicators', description: 'Technical indicators calculation (106 indicators via @ixjb94/indicators)' },
          { name: 'Presets', description: 'Indicator configuration presets and templates' },
          { name: 'Cache', description: 'Indicator result caching for performance' },
          { name: 'Statistics', description: 'Indicator usage statistics and metrics' },
          { name: 'Sentiment', description: 'Sentiment analysis from news and social media (RSS, Twitter, Reddit, AI-powered)' },

          // Social Trading
          { name: 'Social - Traders', description: 'Trader profiles, verification, and statistics' },
          { name: 'Social - Following', description: 'Follow/unfollow traders and manage connections' },
          { name: 'Social - Copy Trading', description: 'Copy trading settings, execution, and management' },
          { name: 'Social - Signals', description: 'Trading signals with performance tracking' },
          { name: 'Social - Leaderboard', description: 'Rankings and performance comparisons' },
          { name: 'Social - Feed', description: 'Social feed with posts, likes, comments, and shares' },
          { name: 'Social - Analytics', description: 'Performance metrics, Sharpe ratio, Sortino ratio, and statistics' },
        ],
        servers: [
          {
            url: `http://localhost:${PORT}`,
            description: 'Local Development',
          },
        ],
      },
      // Scalar is the default UI - beautiful and modern
      scalarConfig: {
        theme: 'purple',
      },
    })
  )

  // CORS Configuration
  .use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // ===========================================
  // ROUTES LAYER (Modular Plugins)
  // ===========================================

  // Authentication Routes (Better-Auth) - WITHOUT transform middleware
  .use(authRoutes)
  .use(authCustomRoutes)
  .use(adminAuthRoutes)
  .use(devAuthRoutes)

  // Transform Middleware (applied AFTER auth routes to avoid conflicts with Better-Auth)
  .use(transformMiddleware)

  // User Routes (requires authentication)
  .use(userRoutes)

  // Tenant Routes (requires authentication)
  .use(tenantRoutes)

  // Department Routes (requires authentication)
  .use(departmentRoutes)
  .use(membershipRoutes)
  .use(analyticsRoutes)

  // Security Routes (requires authentication, admin for management)
  .use(securityRoutes)

  // Audit Routes (requires authentication + audit:read permission)
  .use(auditRoutes)

  // Notification Routes (requires authentication)
  .use(notificationRoutes)

  // Configuration Routes (requires authentication + admin)
  .use(configurationRoutes)

  // Rate Limiting Routes (requires authentication + admin)
  .use(rateLimitRoutes)

  // Financial Routes (requires authentication)
  .use(invoiceRoutes)
  .use(expenseRoutes)
  .use(budgetRoutes)
  .use(ledgerRoutes)
  .use(taxRoutes)
  .use(reportRoutes)
  .use(paymentRoutes)
  .use(gatewayRoutes)

  // Webhook Routes (public, no authentication)
  .use(webhookRoutes)

  // Tax Jurisdiction Routes (CEO configuration + testing)
  .use(taxJurisdictionRoutes)

  // Tax Report Routes (automated fiscal report generation)
  .use(taxReportRoutes)

  // Subscription Routes (public, authenticated, usage, admin)
  .use(publicSubscriptionRoutes)
  .use(authenticatedSubscriptionRoutes)
  .use(usageSubscriptionRoutes)
  .use(adminSubscriptionRoutes)

  // CEO Dashboard Routes (requires CEO/admin role)
  .use(ceoRoutes)

  // Agents Routes (autonomous agents - Level C employees reporting to CEO)
  .use(agentsRoutes)

  // Banco/Wallet Routes (requires authentication)
  .use(walletRoutes)
  .use(portfolioRoutes)

  // Affiliate Routes (requires authentication, admin for admin routes)
  .use(affiliateModule)

  // MMN Routes (Multi-Level Marketing - requires authentication)
  .use(mmnModule)

  // P2P Marketplace Routes (Peer-to-peer trading - requires authentication)
  .use(p2pMarketplaceModule)

  // Social Trading Routes (copy trading, signals, leaderboard - requires authentication)
  .use(socialTradingModule)

  // Document Management Routes (requires authentication)
  .use(documentsRoutes)
  .use(foldersRoutes)
  .use(sharesRoutes)

  // Marketing Routes (requires authentication)
  .use(marketingRoutes)

  // Sales/CRM Routes (requires authentication)
  .use(contactsRoutes)
  .use(dealsRoutes)
  .use(pipelineRoutes)
  .use(activitiesRoutes)
  .use(salesAnalyticsRoutes)

  // Support/Help Desk Routes (requires authentication)
  .use(ticketsRoutes)
  .use(slaRoutes)
  .use(kbRoutes)
  .use(automationsRoutes)
  .use(cannedResponsesRoutes)
  .use(supportAnalyticsRoutes)

  // Trading System Routes (requires authentication)
  .use(exchangesRoutes)
  .use(marketDataRoutes)
  .use(ordersRoutes)
  .use(strategiesRoutes)
  .use(positionsRouter)
  .use(riskRoutes)
  .use(botsRoutes)
  .use(indicatorsRoutes)
  .use(sentimentRoutes)

  // Metrics Routes (Prometheus endpoint - no auth required)
  .use(metricsRoutes)

  // Health & Status Routes
  .use(healthRoutes)

  // API Information Routes
  .use(infoRoutes)

  // Error Demo Routes (development/testing)
  .use(errorRoutes)) as any as Elysia;

// Initialize Redis before starting server
await redis.initialize();

// Initialize Notification Queue Workers (BullMQ with Redis)
try {
  await initializeNotificationWorkers();
  logger.info('Notification system initialized successfully', { source: 'server' });
} catch (error) {
  logger.error('Failed to initialize notification system', {
    source: 'server',
    error: error instanceof Error ? error.message : String(error),
  });
  // Continue startup even if notifications fail (non-critical)
}

// Initialize real-time market data pipeline (optional bootstrap)
try {
  await initializeMarketDataPipeline();
} catch (error) {
  logger.error('Failed to initialize market data pipeline', {
    source: 'server',
    error: error instanceof Error ? error.message : String(error),
  });
}

// Initialize membership events (bus + consumer)
try {
  await initializeMembershipEventBus();
  initializeMembershipEventsConsumer();
} catch (error) {
  logger.error('Failed to initialize membership events', {
    source: 'server',
    error: error instanceof Error ? error.message : String(error),
  });
}

// Initialize Tax Jurisdiction Service (load config from database)
// await taxJurisdictionService.initialize().catch((error) => {
//   logger.error('Failed to initialize tax jurisdiction service', {
//     source: 'server',
//     error: error instanceof Error ? error.message : String(error),
//   });
// });

console.log('🚀 About to start server listen...');

try {
  // Start server with clustering support
  app.listen({
    port: PORT,
    hostname: '0.0.0.0',
    // Enable port reuse for clustering (Linux only - ignored on macOS/Windows)
    reusePort: true,
  }, (server) => {
    const baseUrl = `http://${server.hostname}:${server.port}`;

    // Main startup log
    logger.info(`Worker ${WORKER_ID}/${WORKER_COUNT} ready at ${baseUrl}`, {
      source: 'server',
      environment: NODE_ENV,
      workerId: WORKER_ID,
      pid: process.pid,
      reusePort: process.platform === 'linux',
    });

    // Additional info logs (clean, no extra metadata)
    if (WORKER_ID === '1') {
      logger.info(`├─ API Docs: ${baseUrl}/swagger`, { source: 'server' });
      logger.info(`└─ Health: ${baseUrl}/`, { source: 'server' });
    }
  });
  console.log('✅ Listen call completed successfully');
} catch (error) {
  console.error('❌ Listen failed:', error);
  process.exit(1);
}

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  const uptimeSeconds = Math.floor(process.uptime());
  logger.warn(`Graceful shutdown initiated (${signal}) - Uptime: ${uptimeSeconds}s`, {
    source: 'server',
  });

  try {
    // Close notification queue
    const { shutdownQueue } = await import('./modules/notifications/utils/notification-queue');
    await shutdownQueue();
    logger.info('Notification queue closed', { source: 'server' });

    // Close Redis connection
    await redis.close();
    logger.info('Redis connection closed', { source: 'server' });

    // Close server
    await app.stop();
    logger.info(`Server closed successfully (${signal})`, {
      source: 'server',
    });

    // Exit process
    process.exit(0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Shutdown error: ${errorMsg}`, {
      source: 'server',
      error_type: error instanceof Error ? error.name : 'Unknown',
    });
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught exception: ${error.message}`, {
    source: 'process',
    error_type: error.name,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  const message = reason?.message || String(reason);
  logger.error(`Unhandled rejection: ${message}`, {
    source: 'process',
    error_type: reason?.name || 'UnhandledRejection',
    stack: reason?.stack,
  });
  process.exit(1);
});

// Export type for testing and type inference
export type App = typeof app;
