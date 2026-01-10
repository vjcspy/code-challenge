import { PriceSource, TokenPrice } from '@prisma/client';

import { AppError } from '@/errors/AppError';
import { TokenPriceRepository, tokenPriceRepository } from '@/repositories/tokenPrice.repository';
import {
  CreateTokenPriceBody,
  ExchangeRateQuery,
  UpdateTokenPriceBody,
} from '@/schemas/tokenPrice.schema';
import {
  ExchangeRateResponse,
  PaginatedResponse,
  TokenPriceFilters,
  TokenPriceResponse,
} from '@/types';

/**
 * Token Price Service
 * Business logic layer for token price operations
 */
export class TokenPriceService {
  private repository: TokenPriceRepository;

  constructor(repository: TokenPriceRepository = tokenPriceRepository) {
    this.repository = repository;
  }

  /**
   * Get paginated list of token prices
   */
  async getTokenPrices(filters: TokenPriceFilters): Promise<PaginatedResponse<TokenPriceResponse>> {
    const result = await this.repository.findMany(filters);

    return {
      data: result.data.map(this.formatTokenPrice),
      pagination: result.pagination,
    };
  }

  /**
   * Get token price by currency
   */
  async getTokenPriceByCurrency(currency: string): Promise<TokenPriceResponse> {
    const tokenPrice = await this.repository.findByCurrency(currency);

    if (!tokenPrice) {
      throw AppError.notFound(`Token price for currency '${currency}' not found`);
    }

    return this.formatTokenPrice(tokenPrice);
  }

  /**
   * Get token price by ID
   */
  async getTokenPriceById(id: string): Promise<TokenPriceResponse> {
    const tokenPrice = await this.repository.findById(id);

    if (!tokenPrice) {
      throw AppError.notFound(`Token price with ID '${id}' not found`);
    }

    return this.formatTokenPrice(tokenPrice);
  }

  /**
   * Create a new token price
   */
  async createTokenPrice(data: CreateTokenPriceBody): Promise<TokenPriceResponse> {
    // Check if currency already exists
    const existing = await this.repository.findByCurrency(data.currency);
    if (existing) {
      throw AppError.conflict(`Token price for currency '${data.currency}' already exists`);
    }

    const tokenPrice = await this.repository.create({
      currency: data.currency,
      price: data.price,
      date: data.date ? new Date(data.date) : new Date(),
      source: PriceSource.MANUAL,
    });

    return this.formatTokenPrice(tokenPrice);
  }

  /**
   * Update an existing token price
   */
  async updateTokenPrice(id: string, data: UpdateTokenPriceBody): Promise<TokenPriceResponse> {
    // Check if token price exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Token price with ID '${id}' not found`);
    }

    // If updating currency, check for conflicts
    if (data.currency && data.currency !== existing.currency) {
      const conflicting = await this.repository.findByCurrency(data.currency);
      if (conflicting) {
        throw AppError.conflict(`Token price for currency '${data.currency}' already exists`);
      }
    }

    const tokenPrice = await this.repository.update(id, {
      currency: data.currency,
      price: data.price,
      date: data.date ? new Date(data.date) : undefined,
      source: PriceSource.MANUAL,
    });

    return this.formatTokenPrice(tokenPrice);
  }

  /**
   * Delete a token price
   */
  async deleteTokenPrice(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Token price with ID '${id}' not found`);
    }

    await this.repository.delete(id);
  }

  /**
   * Calculate exchange rate between two currencies
   */
  async calculateExchangeRate(query: ExchangeRateQuery): Promise<ExchangeRateResponse> {
    const { from, to, amount } = query;

    // Get both prices in parallel
    const [fromPrice, toPrice] = await Promise.all([
      this.repository.findByCurrency(from),
      this.repository.findByCurrency(to),
    ]);

    if (!fromPrice) {
      throw AppError.notFound(`Currency '${from}' not found`);
    }

    if (!toPrice) {
      throw AppError.notFound(`Currency '${to}' not found`);
    }

    // Calculate exchange rate
    // rate = fromPrice / toPrice (how many "to" tokens per 1 "from" token)
    const fromPriceNum = Number(fromPrice.price);
    const toPriceNum = Number(toPrice.price);
    const rate = fromPriceNum / toPriceNum;
    const result = amount * rate;

    return {
      from,
      to,
      amount,
      rate: Number(rate.toFixed(8)),
      result: Number(result.toFixed(8)),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format TokenPrice entity to response format
   */
  private formatTokenPrice(tokenPrice: TokenPrice): TokenPriceResponse {
    return {
      id: tokenPrice.id,
      currency: tokenPrice.currency,
      price: tokenPrice.price.toString(),
      date: tokenPrice.date.toISOString(),
      source: tokenPrice.source,
      createdAt: tokenPrice.createdAt.toISOString(),
      updatedAt: tokenPrice.updatedAt.toISOString(),
    };
  }
}

// Export singleton instance
export const tokenPriceService = new TokenPriceService();
