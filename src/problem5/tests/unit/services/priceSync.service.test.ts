import { PriceSyncService } from '../../../src/services/priceSync.service';
import { TokenPriceRepository } from '../../../src/repositories/tokenPrice.repository';
import { PriceSource } from '@prisma/client';

// Mock the httpClient
jest.mock('../../../src/utils/httpClient', () => ({
  fetchExternalPrices: jest.fn(),
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logPriceSync: jest.fn(),
}));

// Mock fallback data
jest.mock('../../../data/fallback-prices.json', () => [
  { currency: 'ETH', price: 2500, date: '2024-01-01T00:00:00.000Z' },
  { currency: 'BTC', price: 40000, date: '2024-01-01T00:00:00.000Z' },
]);

import { fetchExternalPrices } from '../../../src/utils/httpClient';

const mockFetchExternalPrices = fetchExternalPrices as jest.MockedFunction<
  typeof fetchExternalPrices
>;

// Mock repository
const mockRepository: jest.Mocked<TokenPriceRepository> = {
  findMany: jest.fn(),
  findByCurrency: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  upsert: jest.fn(),
  upsertMany: jest.fn(),
  findByCurrencies: jest.fn(),
  deleteAll: jest.fn(),
  count: jest.fn(),
} as unknown as jest.Mocked<TokenPriceRepository>;

describe('PriceSyncService', () => {
  let service: PriceSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PriceSyncService(mockRepository);
  });

  describe('getLastSyncStatus', () => {
    it('should return initial pending status', () => {
      const status = service.getLastSyncStatus();

      expect(status.time).toBeNull();
      expect(status.status).toBe('pending');
    });
  });

  describe('syncPrices', () => {
    it('should sync from external API successfully', async () => {
      const externalData = [
        { currency: 'ETH', price: 2500, date: '2024-01-01T00:00:00.000Z' },
        { currency: 'BTC', price: 40000, date: '2024-01-01T00:00:00.000Z' },
      ];

      mockFetchExternalPrices.mockResolvedValue(externalData);
      mockRepository.upsertMany.mockResolvedValue(2);

      await service.syncPrices();

      expect(mockFetchExternalPrices).toHaveBeenCalledWith(3, 1000);
      expect(mockRepository.upsertMany).toHaveBeenCalledWith([
        {
          currency: 'ETH',
          price: 2500,
          date: expect.any(Date),
          source: PriceSource.EXTERNAL_API,
        },
        {
          currency: 'BTC',
          price: 40000,
          date: expect.any(Date),
          source: PriceSource.EXTERNAL_API,
        },
      ]);

      const status = service.getLastSyncStatus();
      expect(status.status).toBe('success');
      expect(status.time).not.toBeNull();
    });

    it('should fallback to local data when API fails', async () => {
      mockFetchExternalPrices.mockRejectedValue(new Error('API unavailable'));
      mockRepository.upsertMany.mockResolvedValue(2);

      await service.syncPrices();

      expect(mockRepository.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            currency: 'ETH',
            source: PriceSource.FALLBACK,
          }),
          expect.objectContaining({
            currency: 'BTC',
            source: PriceSource.FALLBACK,
          }),
        ])
      );

      const status = service.getLastSyncStatus();
      expect(status.status).toBe('success');
    });

    it('should deduplicate by currency keeping latest date', async () => {
      const externalData = [
        { currency: 'ETH', price: 2500, date: '2024-01-01T00:00:00.000Z' },
        { currency: 'ETH', price: 2600, date: '2024-01-02T00:00:00.000Z' }, // Later date
        { currency: 'ETH', price: 2400, date: '2023-12-31T00:00:00.000Z' }, // Earlier date
      ];

      mockFetchExternalPrices.mockResolvedValue(externalData);
      mockRepository.upsertMany.mockResolvedValue(1);

      await service.syncPrices();

      // Should only have one ETH entry with price 2600 (latest date)
      expect(mockRepository.upsertMany).toHaveBeenCalledWith([
        {
          currency: 'ETH',
          price: 2600,
          date: expect.any(Date),
          source: PriceSource.EXTERNAL_API,
        },
      ]);
    });
  });

  describe('initialSync', () => {
    it('should skip sync when database has data', async () => {
      mockRepository.count.mockResolvedValue(10);

      await service.initialSync();

      expect(mockFetchExternalPrices).not.toHaveBeenCalled();
      expect(mockRepository.upsertMany).not.toHaveBeenCalled();
    });

    it('should sync when database is empty', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockFetchExternalPrices.mockResolvedValue([
        { currency: 'ETH', price: 2500, date: '2024-01-01T00:00:00.000Z' },
      ]);
      mockRepository.upsertMany.mockResolvedValue(1);

      await service.initialSync();

      expect(mockFetchExternalPrices).toHaveBeenCalled();
      expect(mockRepository.upsertMany).toHaveBeenCalled();
    });
  });

  describe('loadFallbackData', () => {
    it('should load data from fallback JSON', async () => {
      mockRepository.upsertMany.mockResolvedValue(2);

      await service.loadFallbackData();

      expect(mockRepository.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            currency: 'ETH',
            price: 2500,
            source: PriceSource.FALLBACK,
          }),
          expect.objectContaining({
            currency: 'BTC',
            price: 40000,
            source: PriceSource.FALLBACK,
          }),
        ])
      );
    });
  });
});

