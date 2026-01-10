import pino, { Logger } from 'pino';

import { config } from '@/config';
import { getContext } from '@/utils/context';

/**
 * Base Pino logger with automatic context injection
 *
 * Uses AsyncLocalStorage to automatically inject correlationId and other
 * request context into every log entry without explicitly passing it.
 *
 * Usage:
 *   logger.info('Something happened');  // correlationId auto-injected
 *   logger.error({ userId: 123 }, 'Error occurred');  // merged with context
 */
const baseLogger: Logger = pino({
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
  // Mixin function to automatically inject context from AsyncLocalStorage
  mixin() {
    const ctx = getContext();
    if (ctx) {
      return {
        correlationId: ctx.correlationId,
        ...(ctx.method && { method: ctx.method }),
        ...(ctx.path && { path: ctx.path }),
      };
    }
    return {};
  },
});

/**
 * Logger instance with automatic context injection
 * Just use this everywhere - no need to create child loggers
 */
export const logger = baseLogger;

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
