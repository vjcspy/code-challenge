import { NextFunction, Request, Response } from 'express';

import {
  CreateTokenPriceBody,
  ExchangeRateQuery,
  ListTokenPricesQuery,
  UpdateTokenPriceBody,
} from '@/schemas/tokenPrice.schema';
import { TokenPriceService, tokenPriceService } from '@/services/tokenPrice.service';
import { RequestWithCorrelationId } from '@/types';
import { createRequestLogger } from '@/utils/logger';

/**
 * Async handler wrapper
 * Automatically catches errors and passes them to next()
 * No need for try-catch in controller methods
 */
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Token Price Controller
 * Handles HTTP requests for token price operations
 *
 * Error handling: NO try-catch blocks.
 * All errors bubble up to the global error handler middleware.
 */
export class TokenPriceController {
  private service: TokenPriceService;

  constructor(service: TokenPriceService = tokenPriceService) {
    this.service = service;
  }

  /**
   * GET /api/token-prices
   * List token prices with filters and pagination
   */
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ListTokenPricesQuery;
    const correlationId = (req as RequestWithCorrelationId).correlationId;
    const logger = createRequestLogger(correlationId);

    logger.debug({ filters: query }, 'Listing token prices');

    const result = await this.service.getTokenPrices({
      page: query.page,
      limit: query.limit,
      currency: query.currency,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
    });

    res.status(200).json(result);
  });

  /**
   * GET /api/token-prices/:currency
   * Get token price by currency
   */
  getByCurrency = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { currency } = req.params;
    const correlationId = (req as RequestWithCorrelationId).correlationId;
    const logger = createRequestLogger(correlationId);

    logger.debug({ currency }, 'Getting token price by currency');

    const result = await this.service.getTokenPriceByCurrency(currency);

    res.status(200).json(result);
  });

  /**
   * GET /api/token-prices/id/:id
   * Get token price by ID
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const correlationId = (req as RequestWithCorrelationId).correlationId;
    const logger = createRequestLogger(correlationId);

    logger.debug({ id }, 'Getting token price by ID');

    const result = await this.service.getTokenPriceById(id);

    res.status(200).json(result);
  });

  /**
   * POST /api/token-prices
   * Create a new token price
   */
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateTokenPriceBody;
    const correlationId = (req as RequestWithCorrelationId).correlationId;
    const logger = createRequestLogger(correlationId);

    logger.info({ currency: body.currency }, 'Creating token price');

    const result = await this.service.createTokenPrice(body);

    res.status(201).json(result);
  });

  /**
   * PUT /api/token-prices/:id
   * Update an existing token price
   */
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const body = req.body as UpdateTokenPriceBody;
    const correlationId = (req as RequestWithCorrelationId).correlationId;
    const logger = createRequestLogger(correlationId);

    logger.info({ id, updates: body }, 'Updating token price');

    const result = await this.service.updateTokenPrice(id, body);

    res.status(200).json(result);
  });

  /**
   * DELETE /api/token-prices/:id
   * Delete a token price
   */
  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const correlationId = (req as RequestWithCorrelationId).correlationId;
    const logger = createRequestLogger(correlationId);

    logger.info({ id }, 'Deleting token price');

    await this.service.deleteTokenPrice(id);

    res.status(204).send();
  });

  /**
   * GET /api/exchange-rate
   * Calculate exchange rate between two currencies
   */
  exchangeRate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ExchangeRateQuery;
    const correlationId = (req as RequestWithCorrelationId).correlationId;
    const logger = createRequestLogger(correlationId);

    logger.debug({ from: query.from, to: query.to, amount: query.amount }, 'Calculating exchange rate');

    const result = await this.service.calculateExchangeRate(query);

    res.status(200).json(result);
  });
}

// Export singleton instance
export const tokenPriceController = new TokenPriceController();
