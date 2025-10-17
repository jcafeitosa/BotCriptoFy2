/**
 * Indicators Module
 * Central export point for all indicator functionality
 *
 * @module indicators
 */

// Types - Export from indicators-full.types (106 indicators)
export * from './types/indicators-full.types';

// Export specific configs from indicators.types (avoid duplicates)
export type {
  RSIConfig,
  RSIResult,
  MACDConfig,
  MACDResult,
  StochasticConfig,
  StochasticResult,
  CCIConfig,
  CCIResult,
  ROCConfig,
  ROCResult,
  MFIConfig,
  MFIResult,
  SMAConfig,
  SMAResult,
  EMAConfig,
  EMAResult,
  WMAConfig,
  WMAResult,
  ADXConfig,
  ADXResult,
  ParabolicSARConfig,
  ParabolicSARResult,
  BollingerBandsConfig,
  BollingerBandsResult,
  ATRConfig,
  ATRResult,
  KeltnerConfig,
  KeltnerResult,
  StandardDevConfig,
  StandardDevResult,
  OBVConfig,
  OBVResult,
  VWAPConfig,
  VWAPResult,
  ADLConfig,
  ADLResult,
  IndicatorPreset,
  CreatePresetRequest,
  UpdatePresetRequest,
  CachedIndicator,
  CalculateIndicatorRequest,
  BatchCalculateRequest,
  IndicatorCalculationResponse,
  BatchCalculationResponse,
  IndicatorStatistics,
  IIndicatorService,
} from './types/indicators.types';

// Schema
export * from './schema/indicators.schema';

// Utilities - Calculator V2 (106 indicators)
export * from './utils/calculator-v2';

// Presets
export * from './presets/indicator-presets';

// Services
// export * from './services/indicators.service'; // TODO: Refactor to use calculator-v2 (async) + fix path aliases
// export * from './services/indicator-factory.service'; // TODO: Refactor to use calculator-v2 (async)

// Routes
// export * from './routes/indicators.routes'; // TODO: Refactor to use calculator-v2 (async) + fix path aliases
