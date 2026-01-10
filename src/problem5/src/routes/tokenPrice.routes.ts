import { Router } from 'express';

import { tokenPriceController } from '@/controllers/tokenPrice.controller';
import { validateRequest } from '@/middleware';
import {
  createTokenPriceBodySchema,
  getTokenPriceByCurrencyParamsSchema,
  getTokenPriceByIdParamsSchema,
  listTokenPricesQuerySchema,
  updateTokenPriceBodySchema,
} from '@/schemas/tokenPrice.schema';

const router = Router();

/**
 * Token Price Routes
 *
 * All routes are prefixed with /api/token-prices
 */

/**
 * GET /api/token-prices
 * List all token prices with optional filters and pagination
 */
router.get('/', validateRequest(listTokenPricesQuerySchema, 'query'), tokenPriceController.list);

/**
 * GET /api/token-prices/id/:id
 * Get token price by ID
 */
router.get(
  '/id/:id',
  validateRequest(getTokenPriceByIdParamsSchema, 'params'),
  tokenPriceController.getById
);

/**
 * GET /api/token-prices/:currency
 * Get token price by currency symbol
 */
router.get(
  '/:currency',
  validateRequest(getTokenPriceByCurrencyParamsSchema, 'params'),
  tokenPriceController.getByCurrency
);

/**
 * POST /api/token-prices
 * Create a new token price
 */
router.post('/', validateRequest(createTokenPriceBodySchema, 'body'), tokenPriceController.create);

/**
 * PUT /api/token-prices/:id
 * Update an existing token price
 */
router.put(
  '/:id',
  validateRequest(getTokenPriceByIdParamsSchema, 'params'),
  validateRequest(updateTokenPriceBodySchema, 'body'),
  tokenPriceController.update
);

/**
 * DELETE /api/token-prices/:id
 * Delete a token price
 */
router.delete(
  '/:id',
  validateRequest(getTokenPriceByIdParamsSchema, 'params'),
  tokenPriceController.delete
);

export const tokenPriceRoutes = router;
