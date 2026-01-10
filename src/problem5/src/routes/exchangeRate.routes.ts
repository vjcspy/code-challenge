import { Router } from 'express';
import { tokenPriceController } from '../controllers/tokenPrice.controller';
import { validateRequest } from '../middleware/validateRequest';
import { exchangeRateQuerySchema } from '../schemas/tokenPrice.schema';

const router = Router();

/**
 * Exchange Rate Routes
 * 
 * Route: GET /api/exchange-rate
 */

/**
 * GET /api/exchange-rate
 * Calculate exchange rate between two currencies
 * 
 * Query params:
 * - from: Source currency (required)
 * - to: Target currency (required)
 * - amount: Amount to convert (optional, default: 1)
 */
router.get(
  '/',
  validateRequest(exchangeRateQuerySchema, 'query'),
  tokenPriceController.exchangeRate
);

export const exchangeRateRoutes = router;

