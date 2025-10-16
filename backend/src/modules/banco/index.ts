/**
 * Banco Module
 *
 * Multi-asset wallet system with main wallet + savings
 * Integrations: CoinGecko for prices
 */

// Services
export { walletService } from './services/wallet.service';
export { priceService } from './services/price.service';
export { portfolioService } from './services/portfolio.service';

// Routes
export { walletRoutes } from './routes/wallet.routes';
export { portfolioRoutes } from './routes/portfolio.routes';

// Schema
export * from './schema/wallet.schema';

// Types
export * from './types/wallet.types';
