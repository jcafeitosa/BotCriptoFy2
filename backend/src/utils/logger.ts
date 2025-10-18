import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { randomUUID } from 'crypto';
import os from 'os';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Enterprise-Grade Logging System for BotCriptoFy2
 * Features:
 * - Structured JSON logging (OpenTelemetry-compatible)
 * - Correlation IDs for request tracing
 * - Rich context metadata
 * - Performance metrics
 * - Multi-environment support
 * @see https://github.com/winstonjs/winston
 */

const { combine, timestamp, printf, errors } = winston.format;

// Log levels following RFC 5424 (Syslog)
const customLevels = {
  levels: {
    fatal: 0,    // System unusable (process exit)
    error: 1,    // Error events that might still allow the app to continue
    warn: 2,     // Warning events (potentially harmful situations)
    info: 3,     // Informational messages (highlight progress)
    http: 4,     // HTTP request/response logging
    debug: 5,    // Detailed debug information
    trace: 6,    // Very detailed diagnostic information
  },
};

// System metadata (static)
const systemMetadata = {
  hostname: os.hostname(),
  platform: os.platform(),
  nodeVersion: process.version,
  bunVersion: typeof Bun !== 'undefined' ? Bun.version : 'N/A',
  pid: process.pid,
};

interface LoggerContext {
  correlationId: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

const loggerContext = new AsyncLocalStorage<LoggerContext>();

const mergeContext = (context?: Record<string, any>): Record<string, any> | undefined => {
  const store = loggerContext.getStore();
  if (!store) {
    return context;
  }

  const baseContext: Record<string, any> = {
    ...(store.metadata || {}),
    ...(context || {}),
  };

  if (store.correlationId && baseContext.correlation_id === undefined) {
    baseContext.correlation_id = store.correlationId;
  }

  if (store.userId && baseContext.user_id === undefined) {
    baseContext.user_id = store.userId;
  }

  if (store.tenantId && baseContext.tenant_id === undefined) {
    baseContext.tenant_id = store.tenantId;
  }

  if (store.requestId && baseContext.request_id === undefined) {
    baseContext.request_id = store.requestId;
  }

  return baseContext;
};

export const setLoggerContext = (context: LoggerContext): void => {
  loggerContext.enterWith(context);
};

export const updateLoggerContext = (context: Partial<LoggerContext>): void => {
  const store = loggerContext.getStore();
  if (store) {
    Object.assign(store, context);
    return;
  }

  const correlationId = context.correlationId ?? randomUUID();
  loggerContext.enterWith({ correlationId, ...context });
};

export const getLoggerContext = (): LoggerContext | undefined => loggerContext.getStore();

export const getCorrelationId = (): string => {
  const store = loggerContext.getStore();
  if (store?.correlationId) {
    return store.correlationId;
  }

  const correlationId = randomUUID();
  loggerContext.enterWith({ correlationId });
  return correlationId;
};

/**
 * Production-grade JSON format (OpenTelemetry compatible)
 * Structure:
 * - timestamp: ISO 8601
 * - level: string (fatal, error, warn, info, http, debug, trace)
 * - severity: number (0-6)
 * - message: string
 * - service: object (name, version, environment)
 * - host: object (hostname, platform, pid)
 * - correlation_id: string (for distributed tracing)
 * - context: object (custom metadata)
 */
const productionFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const levelNumber = customLevels.levels[level as keyof typeof customLevels.levels] || 3;

  // Clean metadata (remove internal fields)
  const cleanMeta = { ...metadata };
  delete cleanMeta.service;
  delete cleanMeta.environment;

  const logEntry = {
    '@timestamp': timestamp,
    level: level.toUpperCase(),
    severity: levelNumber,
    message,
    service: {
      name: 'botcriptofy2-api',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
    host: {
      hostname: systemMetadata.hostname,
      platform: systemMetadata.platform,
      pid: systemMetadata.pid,
    },
    runtime: {
      node: systemMetadata.nodeVersion,
      bun: systemMetadata.bunVersion,
    },
    correlation_id: cleanMeta.correlation_id || cleanMeta.requestId || getCorrelationId(),
    ...(Object.keys(cleanMeta).length > 0 && { context: cleanMeta }),
  };

  return JSON.stringify(logEntry);
});

/**
 * Development-friendly console format
 * Format: [YYYY-MM-DD HH:mm:ss.SSS] [ LEVEL ] [ SOURCE ] - message {context}
 */
const developmentFormat = printf(({ level, message, timestamp, ...metadata }) => {
  // Format timestamp: YYYY-MM-DD HH:mm:ss.SSS
  const dt = new Date(timestamp as string);
  
  // Get date parts
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  
  // Get time parts
  const hours = String(dt.getHours()).padStart(2, '0');
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  const seconds = String(dt.getSeconds()).padStart(2, '0');
  const ms = String(dt.getMilliseconds()).padStart(3, '0');
  
  const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;

  // Format level with colors (5 chars, uppercase)
  const levelUpper = level.toUpperCase();
  const levelStr = levelUpper.padEnd(5);
  
  // Color codes (ANSI)
  const colors: Record<string, string> = {
    FATAL: '\x1b[1m\x1b[31m', // bold red
    ERROR: '\x1b[31m',         // red
    WARN: '\x1b[33m',          // yellow
    INFO: '\x1b[36m',          // cyan
    HTTP: '\x1b[35m',          // magenta
    DEBUG: '\x1b[34m',         // blue
    TRACE: '\x1b[90m',         // gray
  };
  const reset = '\x1b[0m';
  
  const coloredLevel = `${colors[levelUpper] || ''}${levelStr}${reset}`;

  // Extract source/origin (max 12 chars for better alignment)
  const source = metadata.source || metadata.module || metadata.component || 'app';
  const sourceStr = String(source).padEnd(12).substring(0, 12);

  // Clean metadata
  const cleanMeta = { ...metadata };
  delete cleanMeta.service;
  delete cleanMeta.environment;
  delete cleanMeta.correlation_id;
  delete cleanMeta.requestId;
  delete cleanMeta.source;
  delete cleanMeta.module;
  delete cleanMeta.component;

  // Build log line: [YYYY-MM-DD HH:mm:ss.SSS] [ LEVEL ] [ SOURCE ] - message
  let logLine = `[${formattedTime}] [ ${coloredLevel} ] [ ${sourceStr} ] - ${message}`;

  // Add context if present (compact format, dimmed)
  if (Object.keys(cleanMeta).length > 0) {
    logLine += ` \x1b[90m${JSON.stringify(cleanMeta)}${reset}`;
  }

  return logLine;
});

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const _isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const isTest = process.env.NODE_ENV === 'test';

// Create logs directory path
const logsDir = path.join(process.cwd(), 'logs');

/**
 * Winston Logger Instance
 * Auto-detects environment and applies appropriate format
 */
const logger = winston.createLogger({
  level: logLevel,
  levels: customLevels.levels,
  format: combine(
    errors({ stack: true }), // Include stack traces for errors
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), // ISO 8601
  ),
  defaultMeta: {
    service: 'botcriptofy2-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: isDevelopment ? developmentFormat : productionFormat,
      silent: isTest,
    }),

    // Error logs - daily rotation
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '50m',
      maxFiles: '90d',
      format: productionFormat,
      zippedArchive: true,
    }),

    // Combined logs - daily rotation
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d',
      format: productionFormat,
      zippedArchive: true,
    }),

    // HTTP logs - daily rotation
    new DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '100m',
      maxFiles: '7d',
      format: productionFormat,
      zippedArchive: true,
    }),

    // Performance logs - high-volume metrics
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'debug',
      maxSize: '50m',
      maxFiles: '7d',
      format: productionFormat,
      zippedArchive: true,
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      format: productionFormat,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      format: productionFormat,
    }),
  ],
});

/**
 * Enterprise-grade helper functions for structured logging
 */

/**
 * Log HTTP request with full context
 * @param method - HTTP method (GET, POST, etc)
 * @param path - Request path
 * @param statusCode - HTTP status code
 * @param duration - Request duration in milliseconds
 * @param context - Additional context (user_id, tenant_id, etc)
 */
export const logRequest = (
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: {
    correlation_id?: string;
    user_id?: string;
    tenant_id?: string;
    ip?: string;
    user_agent?: string;
    [key: string]: any;
  }
) => {
  // Compact message format: ← METHOD /path STATUS DURATIONms
  const message = `← ${method} ${path} ${statusCode} ${duration}ms`;

  // Clean context (remove verbose/redundant data)
  const cleanContext = { ...context };
  
  // Remove or shorten verbose fields
  delete cleanContext.user_agent; // Too verbose
  delete cleanContext.ip; // Only keep for errors
  
  const logData = mergeContext(cleanContext);

  // Log at appropriate level
  if (statusCode >= 500) {
    logger.error(message, logData);
  } else if (statusCode >= 400) {
    logger.warn(message, logData);
  } else {
    logger.http(message, logData);
  }
};

/**
 * Log error with full stack trace and context
 */
export const logError = (error: Error, context?: Record<string, any>) => {
  const metadata = mergeContext(context);
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.cause && typeof error.cause === 'object' ? { cause: error.cause } : {}),
    },
    ...(metadata || {}),
  });
};

/**
 * Log fatal error (process-exiting)
 */
export const logFatal = (message: string, error?: Error, context?: Record<string, any>) => {
  const metadata = mergeContext(context);
  logger.log('fatal', message, {
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }),
    ...(metadata || {}),
  });
};

/**
 * Log info with context
 */
export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(message, mergeContext(context));
};

/**
 * Log debug with context
 */
export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(message, mergeContext(context));
};

/**
 * Log trace (very detailed)
 */
export const logTrace = (message: string, context?: Record<string, any>) => {
  logger.log('trace', message, mergeContext(context));
};

/**
 * Log warning with context
 */
export const logWarn = (message: string, context?: Record<string, any>) => {
  logger.warn(message, mergeContext(context));
};

/**
 * Log business metric or KPI
 */
export const logMetric = (metric: string, value: number, unit: string, context?: Record<string, any>) => {
  logger.info(`Metric: ${metric}`, mergeContext({
    metric: {
      name: metric,
      value,
      unit,
    },
    ...(context || {}),
  }));
};

/**
 * Log performance measurement
 */
export const logPerformance = (
  operation: string,
  duration: number,
  context?: Record<string, any>
) => {
  logger.debug(`Performance: ${operation}`, mergeContext({
    performance: {
      operation,
      duration_ms: duration,
    },
    ...(context || {}),
  }));
};

/**
 * Log security event
 */
export const logSecurity = (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  context?: Record<string, any>
) => {
  const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';

  logger.log(level, `Security: ${event}`, mergeContext({
    security: {
      event,
      severity,
    },
    ...(context || {}),
  }));
};

/**
 * Log audit event (compliance)
 */
export const logAudit = (
  action: string,
  resource: string,
  user_id: string,
  result: 'success' | 'failure',
  context?: Record<string, any>
) => {
  logger.info(`Audit: ${action} ${resource}`, mergeContext({
    audit: {
      action,
      resource,
      user_id,
      result,
      timestamp: new Date().toISOString(),
    },
    ...(context || {}),
  }));
};

/**
 * Create child logger with persistent context
 */
export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

/**
 * Stream for Morgan or similar HTTP loggers
 */
export const logStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
