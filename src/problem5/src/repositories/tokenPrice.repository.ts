import { PriceSource, Prisma, PrismaClient, TokenPrice } from '@prisma/client';

import { PaginatedResponse, TokenPriceData, TokenPriceFilters } from '@/types';
import { prisma } from '@/utils/prisma';

/**
 * Token Price Repository
 * Data access layer for TokenPrice entity
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
    return this.prisma.tokenPrice.create({
      data: {
        currency: data.currency,
        price: new Prisma.Decimal(data.price),
        date: data.date,
        source: data.source,
      },
    });
  }

  /**
   * Upsert a single token price (create or update by currency)
   */
  async upsert(data: TokenPriceData): Promise<TokenPrice> {
    return this.prisma.tokenPrice.upsert({
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
  }

  /**
   * Batch upsert multiple token prices
   * Uses transaction for atomicity
   */
  async upsertMany(data: TokenPriceData[]): Promise<number> {
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
  }

  /**
   * Find many token prices with filters and pagination
   */
  async findMany(filters: TokenPriceFilters): Promise<PaginatedResponse<TokenPrice>> {
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
  }

  /**
   * Find token price by currency
   */
  async findByCurrency(currency: string): Promise<TokenPrice | null> {
    return this.prisma.tokenPrice.findUnique({
      where: { currency: currency.toUpperCase() },
    });
  }

  /**
   * Find token price by ID
   */
  async findById(id: string): Promise<TokenPrice | null> {
    return this.prisma.tokenPrice.findUnique({
      where: { id },
    });
  }

  /**
   * Find latest prices for multiple currencies
   * Used for exchange rate calculation
   */
  async findByCurrencies(currencies: string[]): Promise<TokenPrice[]> {
    return this.prisma.tokenPrice.findMany({
      where: {
        currency: {
          in: currencies.map((c) => c.toUpperCase()),
        },
      },
    });
  }

  /**
   * Update token price by ID
   */
  async update(
    id: string,
    data: Partial<Omit<TokenPriceData, 'source'>> & { source?: PriceSource }
  ): Promise<TokenPrice> {
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

    return this.prisma.tokenPrice.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete token price by ID
   */
  async delete(id: string): Promise<TokenPrice> {
    return this.prisma.tokenPrice.delete({
      where: { id },
    });
  }

  /**
   * Delete all token prices
   * Used for testing and data reset
   */
  async deleteAll(): Promise<number> {
    const result = await this.prisma.tokenPrice.deleteMany();
    return result.count;
  }

  /**
   * Count total token prices
   */
  async count(): Promise<number> {
    return this.prisma.tokenPrice.count();
  }
}

// Export singleton instance
export const tokenPriceRepository = new TokenPriceRepository();
