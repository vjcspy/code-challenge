import { PriceSource } from '@prisma/client';

import { TokenPriceRepository, tokenPriceRepository } from '@/repositories/tokenPrice.repository';
import { ExternalTokenPrice, TokenPriceData } from '@/types';
import { fetchExternalPrices } from '@/utils/httpClient';
import { logger, logPriceSync } from '@/utils/logger';

import fallbackPrices from '../../data/fallback-prices.json';

/**
 * Price Sync Service
 * Handles synchronization of token prices from external API
 */
export class PriceSyncService {
  private repository: TokenPriceRepository;
  private lastSyncTime: Date | null = null;
  private lastSyncStatus: 'success' | 'failed' | 'pending' = 'pending';

  constructor(repository: TokenPriceRepository = tokenPriceRepository) {
    this.repository = repository;
  }

  /**
   * Get last sync status
   */
  getLastSyncStatus(): { time: Date | null; status: string } {
    return {
      time: this.lastSyncTime,
      status: this.lastSyncStatus,
    };
  }

  /**
   * Sync prices from external API
   * Falls back to local data if API fails
   */
  async syncPrices(): Promise<void> {
    logPriceSync('started');

    try {
      // Try to fetch from external API
      const externalPrices = await this.fetchPricesFromApi();
      const processedPrices = this.processPrices(externalPrices, PriceSource.EXTERNAL_API);

      // Upsert to database
      const count = await this.repository.upsertMany(processedPrices);

      this.lastSyncTime = new Date();
      this.lastSyncStatus = 'success';

      logPriceSync('completed', { count, source: 'EXTERNAL_API' });
    } catch (error) {
      logger.warn({ error: (error as Error).message }, 'External API failed, attempting fallback');

      try {
        // Use fallback data
        await this.loadFallbackData();
        this.lastSyncTime = new Date();
        this.lastSyncStatus = 'success';

        logPriceSync('completed', { source: 'FALLBACK' });
      } catch (fallbackError) {
        this.lastSyncStatus = 'failed';
        logPriceSync('failed', { error: (fallbackError as Error).message });
        throw fallbackError;
      }
    }
  }

  /**
   * Initial sync on application startup
   * Ensures database has data before accepting requests
   */
  async initialSync(): Promise<void> {
    const count = await this.repository.count();

    if (count > 0) {
      logger.info({ existingCount: count }, 'Database already has price data');
      return;
    }

    logger.info('Database empty, performing initial sync');
    await this.syncPrices();
  }

  /**
   * Fetch prices from external API
   */
  private async fetchPricesFromApi(): Promise<ExternalTokenPrice[]> {
    return fetchExternalPrices<ExternalTokenPrice[]>(3, 1000);
  }

  /**
   * Load fallback data from local JSON file
   */
  async loadFallbackData(): Promise<void> {
    const processedPrices = this.processPrices(
      fallbackPrices as ExternalTokenPrice[],
      PriceSource.FALLBACK
    );

    const count = await this.repository.upsertMany(processedPrices);
    logger.info({ count }, 'Fallback data loaded');
  }

  /**
   * Process external prices:
   * - Deduplicate by currency (keep latest by date)
   * - Convert to internal format
   */
  private processPrices(prices: ExternalTokenPrice[], source: PriceSource): TokenPriceData[] {
    // Group by currency and keep the one with latest date
    const priceMap = new Map<string, ExternalTokenPrice>();

    for (const price of prices) {
      const existing = priceMap.get(price.currency);

      if (!existing) {
        priceMap.set(price.currency, price);
      } else {
        // Keep the one with the latest date
        const existingDate = new Date(existing.date);
        const currentDate = new Date(price.date);

        if (currentDate > existingDate) {
          priceMap.set(price.currency, price);
        }
      }
    }

    // Convert to internal format
    return Array.from(priceMap.values()).map((price) => ({
      currency: price.currency,
      price: price.price,
      date: new Date(price.date),
      source,
    }));
  }
}

// Export singleton instance
export const priceSyncService = new PriceSyncService();
