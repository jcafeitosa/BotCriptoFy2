/**
 * CEO Dashboard Module
 * Executive dashboard with aggregated metrics and KPIs
 *
 * @module ceo
 */

// Export routes
export { ceoRoutes, default as ceoRoutesDefault } from './routes/ceo.routes';

// Export services
export { ceoService, CeoService } from './services/ceo.service';

// Export types
export * from './types/ceo.types';

// Export schemas
export * from './schema/ceo.schema';
