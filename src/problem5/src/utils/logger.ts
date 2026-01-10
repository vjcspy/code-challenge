import pino, { Logger } from 'pino';

import { config } from '@/config';

/**
 * Base Pino logger instance
 * Configured for structured JSON logging with correlation ID support
 */
export const logger: Logger = pino({
  level: config.logLevel,
  transport: config.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'token-price-api',
    env: config.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger with correlation ID context
 * Used for request-scoped logging
 */
export function createRequestLogger(correlationId: string): Logger {
  return logger.child({ correlationId });
}

/**
 * Log application startup
 */
export function logStartup(port: number): void {
  logger.info(
    {
      port,
      nodeEnv: config.nodeEnv,
      priceApiUrl: config.priceApiUrl,
      syncInterval: config.priceSyncIntervalMs,
    },
    'Token Price API starting'
  );
}

/**
 * Log application shutdown
 */
export function logShutdown(reason: string): void {
  logger.info({ reason }, 'Token Price API shutting down');
}

/**
 * Log price sync job status
 */
export function logPriceSync(
  status: 'started' | 'completed' | 'failed',
  details?: { count?: number; error?: string; source?: string }
): void {
  const message = `Price sync ${status}`;
  if (status === 'failed') {
    logger.error({ ...details, job: 'priceSync' }, message);
  } else {
    logger.info({ ...details, job: 'priceSync' }, message);
  }
}
