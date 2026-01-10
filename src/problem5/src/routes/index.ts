import { Router } from 'express';

import { exchangeRateRoutes } from './exchangeRate.routes';
import { healthRoutes } from './health.routes';
import { tokenPriceRoutes } from './tokenPrice.routes';

const router = Router();

/**
 * API Routes Aggregator
 */

// Health check routes (no /api prefix)
router.use('/health', healthRoutes);

// API routes
router.use('/api/token-prices', tokenPriceRoutes);
router.use('/api/exchange-rate', exchangeRateRoutes);

export { router as routes };
