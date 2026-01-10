import { PriceSource, Prisma, PrismaClient, TokenPrice } from '@prisma/client';

import { DataAccessError } from '@/errors/DataAccessError';
import { PaginatedResponse, TokenPriceData, TokenPriceFilters } from '@/types';
import { prisma } from '@/utils/prisma';

/**
 * Wrap Prisma errors into DataAccessError
 */
function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      const field = (error.meta?.target as string[])?.join(', ') || 'unknown';
      throw DataAccessError.uniqueConstraint(field, error);
    }
    // Record not found
    if (error.code === 'P2025') {
      throw DataAccessError.recordNotFound('Record', undefined);
    }
    // Foreign key constraint
    if (error.code === 'P2003') {
      throw DataAccessError.foreignKeyConstraint(error);
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw DataAccessError.connectionError(error);
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    throw DataAccessError.databaseError('Database engine panic', error);
  }

  if (error instanceof Error) {
    throw DataAccessError.databaseError(error.message, error);
  }

  throw DataAccessError.databaseError('Unknown database error');
}

/**
 * Token Price Repository
 * Data access layer for TokenPrice entity
 *
 * Error handling: Throws DataAccessError for all database errors.
 * Does NOT catch errors internally - they bubble up to middleware.
 */
export class TokenPriceRepository {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prisma = prismaClient;
  }

  /**
   * Create a new token price
   */
  async create(data: TokenPriceData): Promise<TokenPrice> {
    try {
      return await this.prisma.tokenPrice.create({
        data: {
          currency: data.currency,
          price: new Prisma.Decimal(data.price),
          date: data.date,
          source: data.source,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Upsert a single token price (create or update by currency)
   */
  async upsert(data: TokenPriceData): Promise<TokenPrice> {
    try {
      return await this.prisma.tokenPrice.upsert({
        where: { currency: data.currency },
        update: {
          price: new Prisma.Decimal(data.price),
          date: data.date,
          source: data.source,
        },
        create: {
          currency: data.currency,
          price: new Prisma.Decimal(data.price),
          date: data.date,
          source: data.source,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Batch upsert multiple token prices
   * Uses transaction for atomicity
   */
  async upsertMany(data: TokenPriceData[]): Promise<number> {
    try {
      const operations = data.map((item) =>
        this.prisma.tokenPrice.upsert({
          where: { currency: item.currency },
          update: {
            price: new Prisma.Decimal(item.price),
            date: item.date,
            source: item.source,
          },
          create: {
            currency: item.currency,
            price: new Prisma.Decimal(item.price),
            date: item.date,
            source: item.source,
          },
        })
      );

      const results = await this.prisma.$transaction(operations);
      return results.length;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Find many token prices with filters and pagination
   */
  async findMany(filters: TokenPriceFilters): Promise<PaginatedResponse<TokenPrice>> {
    try {
      const { page, limit, currency, minPrice, maxPrice } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.TokenPriceWhereInput = {};

      if (currency) {
        where.currency = { equals: currency, mode: 'insensitive' };
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) {
          where.price.gte = new Prisma.Decimal(minPrice);
        }
        if (maxPrice !== undefined) {
          where.price.lte = new Prisma.Decimal(maxPrice);
        }
      }

      // Execute queries in parallel
      const [data, total] = await Promise.all([
        this.prisma.tokenPrice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { currency: 'asc' },
        }),
        this.prisma.tokenPrice.count({ where }),
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Find token price by currency
   */
  async findByCurrency(currency: string): Promise<TokenPrice | null> {
    try {
      return await this.prisma.tokenPrice.findUnique({
        where: { currency: currency.toUpperCase() },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Find token price by ID
   */
  async findById(id: string): Promise<TokenPrice | null> {
    try {
      return await this.prisma.tokenPrice.findUnique({
        where: { id },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Find latest prices for multiple currencies
   * Used for exchange rate calculation
   */
  async findByCurrencies(currencies: string[]): Promise<TokenPrice[]> {
    try {
      return await this.prisma.tokenPrice.findMany({
        where: {
          currency: {
            in: currencies.map((c) => c.toUpperCase()),
          },
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Update token price by ID
   */
  async update(
    id: string,
    data: Partial<Omit<TokenPriceData, 'source'>> & { source?: PriceSource }
  ): Promise<TokenPrice> {
    try {
      const updateData: Prisma.TokenPriceUpdateInput = {};

      if (data.currency !== undefined) {
        updateData.currency = data.currency;
      }
      if (data.price !== undefined) {
        updateData.price = new Prisma.Decimal(data.price);
      }
      if (data.date !== undefined) {
        updateData.date = data.date;
      }
      if (data.source !== undefined) {
        updateData.source = data.source;
      }

      return await this.prisma.tokenPrice.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Delete token price by ID
   */
  async delete(id: string): Promise<TokenPrice> {
    try {
      return await this.prisma.tokenPrice.delete({
        where: { id },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Delete all token prices
   * Used for testing and data reset
   */
  async deleteAll(): Promise<number> {
    try {
      const result = await this.prisma.tokenPrice.deleteMany();
      return result.count;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Count total token prices
   */
  async count(): Promise<number> {
    try {
      return await this.prisma.tokenPrice.count();
    } catch (error) {
      handlePrismaError(error);
    }
  }
}

// Export singleton instance
export const tokenPriceRepository = new TokenPriceRepository();
