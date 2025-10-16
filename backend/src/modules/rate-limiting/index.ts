/**
 * Rate Limiting Module
 * Sistema de rate limiting com Redis para proteção de API
 */

// Routes
export { rateLimitRoutes } from './routes/rate-limit.routes';

// Middleware
export { rateLimitMiddleware } from './middleware/rate-limit.middleware';

// Services
export { rateLimitService } from './services/rate-limit.service';

// Types
export * from './types/rate-limit.types';
