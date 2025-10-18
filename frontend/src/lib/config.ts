/**
 * @fileoverview Application Configuration
 * @description Centralized configuration from environment variables
 * @version 1.0.0
 */

/**
 * Backend API URL
 * @default http://localhost:3000 (development)
 * @production https://api.botcriptofy.com
 */
export const API_URL = import.meta.env.PUBLIC_API_URL || "http://localhost:3000";

/**
 * WebSocket URL
 * @default ws://localhost:3000 (development)
 * @production wss://api.botcriptofy.com
 */
export const WS_URL = import.meta.env.PUBLIC_WS_URL || "ws://localhost:3000";

/**
 * Application URL
 * @default http://localhost:4321 (development)
 * @production https://app.botcriptofy.com
 */
export const APP_URL = import.meta.env.PUBLIC_APP_URL || "http://localhost:4321";

/**
 * Application Name
 */
export const APP_NAME = import.meta.env.PUBLIC_APP_NAME || "BotCriptoFy";

/**
 * Feature Flags
 */
export const ENABLE_ANALYTICS = import.meta.env.PUBLIC_ENABLE_ANALYTICS === "true";
export const ENABLE_SERVICE_WORKER = import.meta.env.PUBLIC_ENABLE_SERVICE_WORKER !== "false";

/**
 * Chart Settings
 */
export const DEFAULT_SYMBOL = import.meta.env.PUBLIC_DEFAULT_SYMBOL || "BTC/USDT";
export const DEFAULT_EXCHANGE = import.meta.env.PUBLIC_DEFAULT_EXCHANGE || "binance";

/**
 * Check if running in production
 */
export const IS_PRODUCTION = import.meta.env.PROD;

/**
 * Check if running in development
 */
export const IS_DEVELOPMENT = import.meta.env.DEV;
