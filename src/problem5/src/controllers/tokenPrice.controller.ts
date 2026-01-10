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
 * Token Price Controller
 * Handles HTTP requests for token price operations
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
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/token-prices/:currency
   * Get token price by currency
   */
  getByCurrency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currency } = req.params;
      const correlationId = (req as RequestWithCorrelationId).correlationId;
      const logger = createRequestLogger(correlationId);

      logger.debug({ currency }, 'Getting token price by currency');

      const result = await this.service.getTokenPriceByCurrency(currency);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/token-prices/id/:id
   * Get token price by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const correlationId = (req as RequestWithCorrelationId).correlationId;
      const logger = createRequestLogger(correlationId);

      logger.debug({ id }, 'Getting token price by ID');

      const result = await this.service.getTokenPriceById(id);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/token-prices
   * Create a new token price
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as CreateTokenPriceBody;
      const correlationId = (req as RequestWithCorrelationId).correlationId;
      const logger = createRequestLogger(correlationId);

      logger.info({ currency: body.currency }, 'Creating token price');

      const result = await this.service.createTokenPrice(body);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/token-prices/:id
   * Update an existing token price
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const body = req.body as UpdateTokenPriceBody;
      const correlationId = (req as RequestWithCorrelationId).correlationId;
      const logger = createRequestLogger(correlationId);

      logger.info({ id, updates: body }, 'Updating token price');

      const result = await this.service.updateTokenPrice(id, body);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/token-prices/:id
   * Delete a token price
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const correlationId = (req as RequestWithCorrelationId).correlationId;
      const logger = createRequestLogger(correlationId);

      logger.info({ id }, 'Deleting token price');

      await this.service.deleteTokenPrice(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/exchange-rate
   * Calculate exchange rate between two currencies
   */
  exchangeRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ExchangeRateQuery;
      const correlationId = (req as RequestWithCorrelationId).correlationId;
      const logger = createRequestLogger(correlationId);

      logger.debug(
        { from: query.from, to: query.to, amount: query.amount },
        'Calculating exchange rate'
      );

      const result = await this.service.calculateExchangeRate(query);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

// Export singleton instance
export const tokenPriceController = new TokenPriceController();
