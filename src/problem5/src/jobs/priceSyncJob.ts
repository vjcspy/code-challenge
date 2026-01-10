import cron from 'node-cron';

import { config } from '@/config';
import { priceSyncService } from '@/services/priceSync.service';
import { logger } from '@/utils/logger';

/**
 * Price Sync Cron Job
 *
 * Periodically fetches token prices from external API
 * Default interval: 30 seconds
 */

let cronJob: cron.ScheduledTask | null = null;

/**
 * Convert milliseconds to cron expression
 * For intervals less than 1 minute, uses node-cron's extended syntax
 */
function getCronExpression(intervalMs: number): string {
  const seconds = Math.floor(intervalMs / 1000);

  if (seconds < 60) {
    // Run every N seconds
    return `*/${seconds} * * * * *`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    // Run every N minutes
    return `*/${minutes} * * * *`;
  }

  // Default to every minute
  return '* * * * *';
}

/**
 * Start the price sync cron job
 */
export function startPriceSyncJob(): void {
  const cronExpression = getCronExpression(config.priceSyncIntervalMs);

  logger.info(
    {
      intervalMs: config.priceSyncIntervalMs,
      cronExpression,
    },
    'Starting price sync job'
  );

  cronJob = cron.schedule(
    cronExpression,
    async () => {
      try {
        await priceSyncService.syncPrices();
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'Price sync job failed');
      }
    },
    {
      scheduled: true,
      timezone: 'UTC',
    }
  );

  logger.info('Price sync job started');
}

/**
 * Stop the price sync cron job
 */
export function stopPriceSyncJob(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Price sync job stopped');
  }
}

/**
 * Check if price sync job is running
 */
export function isPriceSyncJobRunning(): boolean {
  return cronJob !== null;
}
