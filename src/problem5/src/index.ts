import { app } from './app';
import { config, validateConfig } from './config';
import { startPriceSyncJob, stopPriceSyncJob } from './jobs';
import { priceSyncService } from './services/priceSync.service';
import { logger, logShutdown, logStartup } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './utils/prisma';

/**
 * Application Entry Point
 *
 * Handles:
 * - Configuration validation
 * - Database connection
 * - Initial price sync
 * - Server startup
 * - Graceful shutdown
 */

let server: ReturnType<typeof app.listen> | null = null;

async function startServer(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();

    // Connect to database
    await connectDatabase();

    // Perform initial price sync (loads data if database is empty)
    await priceSyncService.initialSync();

    // Start the price sync cron job
    startPriceSyncJob();

    // Start HTTP server
    server = app.listen(config.port, () => {
      logStartup(config.port);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error({ port: config.port }, 'Port is already in use');
        process.exit(1);
      }
      throw error;
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  logShutdown(signal);

  // Stop accepting new requests
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Stop cron jobs
  stopPriceSyncJob();

  // Disconnect from database
  await disconnectDatabase();

  // Exit process
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

// Start the server
startServer();
