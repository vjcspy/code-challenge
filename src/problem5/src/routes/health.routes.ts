import { Request, Response, Router } from 'express';

import { priceSyncService } from '@/services/priceSync.service';
import { HealthCheckResponse, ReadinessCheckResponse } from '@/types';
import { checkDatabaseHealth } from '@/utils/prisma';

const router = Router();
const startTime = Date.now();

/**
 * Health Check Routes
 *
 * Provides K8s-compatible health check endpoints
 */

/**
 * GET /health
 * Liveness probe - checks if application is running
 * Returns 200 if the application process is alive
 */
router.get('/', (_req: Request, res: Response) => {
  const response: HealthCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  res.status(200).json(response);
});

/**
 * GET /health/ready
 * Readiness probe - checks if application is ready to accept traffic
 * Returns 200 if database is connected and services are ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const isDbHealthy = await checkDatabaseHealth();
  const syncStatus = priceSyncService.getLastSyncStatus();

  const response: ReadinessCheckResponse = {
    status: isDbHealthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: isDbHealthy ? 'connected' : 'disconnected',
    lastPriceSync: syncStatus.time?.toISOString(),
  };

  const statusCode = isDbHealthy ? 200 : 503;
  res.status(statusCode).json(response);
});

export const healthRoutes = router;
