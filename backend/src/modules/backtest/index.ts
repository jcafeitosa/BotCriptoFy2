/**
 * Backtest Module
 * Strategy backtesting and analysis system
 *
 * Features:
 * - Historical strategy backtesting
 * - Performance metrics calculation
 * - Trade analysis and recommendations
 * - Result comparison
 * - Equity curve visualization
 */

// Engine
export * from './engine';

// Schema
export * from './schema/backtest.schema';

// Services
export * from './services/backtest.service';

// Routes
export { backtestRoutes } from './routes/backtest.routes';
