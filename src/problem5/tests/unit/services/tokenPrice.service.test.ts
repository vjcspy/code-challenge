import { TokenPriceService } from '../../../src/services/tokenPrice.service';
import { TokenPriceRepository } from '../../../src/repositories/tokenPrice.repository';
import { AppError } from '../../../src/errors/AppError';
import { PriceSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

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

describe('TokenPriceService', () => {
  let service: TokenPriceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TokenPriceService(mockRepository);
  });

  describe('getTokenPriceByCurrency', () => {
    it('should return token price when found', async () => {
      const mockTokenPrice = {
        id: 'test-id',
        currency: 'ETH',
        price: new Decimal('2500.50'),
        date: new Date('2024-01-01'),
        source: PriceSource.EXTERNAL_API,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByCurrency.mockResolvedValue(mockTokenPrice);

      const result = await service.getTokenPriceByCurrency('ETH');

      expect(result).toEqual({
        id: 'test-id',
        currency: 'ETH',
        price: '2500.5',
        date: mockTokenPrice.date.toISOString(),
        source: PriceSource.EXTERNAL_API,
        createdAt: mockTokenPrice.createdAt.toISOString(),
        updatedAt: mockTokenPrice.updatedAt.toISOString(),
      });
      expect(mockRepository.findByCurrency).toHaveBeenCalledWith('ETH');
    });

    it('should throw NotFound error when currency not found', async () => {
      mockRepository.findByCurrency.mockResolvedValue(null);

      await expect(service.getTokenPriceByCurrency('UNKNOWN')).rejects.toThrow(
        AppError
      );
      await expect(service.getTokenPriceByCurrency('UNKNOWN')).rejects.toThrow(
        "Token price for currency 'UNKNOWN' not found"
      );
    });
  });

  describe('createTokenPrice', () => {
    it('should create token price successfully', async () => {
      const createData = {
        currency: 'NEW_TOKEN',
        price: 100.5,
        date: '2024-01-01T00:00:00.000Z',
      };

      const mockCreated = {
        id: 'new-id',
        currency: 'NEW_TOKEN',
        price: new Decimal('100.5'),
        date: new Date('2024-01-01'),
        source: PriceSource.MANUAL,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByCurrency.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCreated);

      const result = await service.createTokenPrice(createData);

      expect(result.currency).toBe('NEW_TOKEN');
      expect(result.price).toBe('100.5');
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should throw Conflict error when currency already exists', async () => {
      const existingToken = {
        id: 'existing-id',
        currency: 'ETH',
        price: new Decimal('2500'),
        date: new Date(),
        source: PriceSource.EXTERNAL_API,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByCurrency.mockResolvedValue(existingToken);

      await expect(
        service.createTokenPrice({ currency: 'ETH', price: 3000 })
      ).rejects.toThrow(AppError);
      await expect(
        service.createTokenPrice({ currency: 'ETH', price: 3000 })
      ).rejects.toThrow("Token price for currency 'ETH' already exists");
    });
  });

  describe('updateTokenPrice', () => {
    it('should update token price successfully', async () => {
      const existingToken = {
        id: 'test-id',
        currency: 'ETH',
        price: new Decimal('2500'),
        date: new Date(),
        source: PriceSource.EXTERNAL_API,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedToken = {
        ...existingToken,
        price: new Decimal('3000'),
      };

      mockRepository.findById.mockResolvedValue(existingToken);
      mockRepository.update.mockResolvedValue(updatedToken);

      const result = await service.updateTokenPrice('test-id', { price: 3000 });

      expect(result.price).toBe('3000');
      expect(mockRepository.update).toHaveBeenCalledWith('test-id', {
        currency: undefined,
        price: 3000,
        date: undefined,
        source: PriceSource.MANUAL,
      });
    });

    it('should throw NotFound error when token not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateTokenPrice('non-existent', { price: 100 })
      ).rejects.toThrow(AppError);
    });

    it('should throw Conflict error when updating to existing currency', async () => {
      const existingToken = {
        id: 'test-id',
        currency: 'ETH',
        price: new Decimal('2500'),
        date: new Date(),
        source: PriceSource.EXTERNAL_API,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const conflictingToken = {
        id: 'other-id',
        currency: 'BTC',
        price: new Decimal('40000'),
        date: new Date(),
        source: PriceSource.EXTERNAL_API,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(existingToken);
      mockRepository.findByCurrency.mockResolvedValue(conflictingToken);

      await expect(
        service.updateTokenPrice('test-id', { currency: 'BTC' })
      ).rejects.toThrow("Token price for currency 'BTC' already exists");
    });
  });

  describe('deleteTokenPrice', () => {
    it('should delete token price successfully', async () => {
      const existingToken = {
        id: 'test-id',
        currency: 'ETH',
        price: new Decimal('2500'),
        date: new Date(),
        source: PriceSource.EXTERNAL_API,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(existingToken);
      mockRepository.delete.mockResolvedValue(existingToken);

      await service.deleteTokenPrice('test-id');

      expect(mockRepository.delete).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFound error when token not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deleteTokenPrice('non-existent')).rejects.toThrow(
        AppError
      );
    });
  });

  describe('calculateExchangeRate', () => {
    it('should calculate exchange rate correctly', async () => {
      const ethToken = {
        id: 'eth-id',
        currency: 'ETH',
        price: new Decimal('2500'),
        date: new Date(),
        source: PriceSource.EXTERNAL_API,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const usdcToken = {
        id: 'usdc-id',
        currency: 'USDC',
        price: new Decimal('1'),
        date: new Date(),
        source: PriceSource.EXTERNAL_API,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByCurrency
        .mockResolvedValueOnce(ethToken)
        .mockResolvedValueOnce(usdcToken);

      const result = await service.calculateExchangeRate({
        from: 'ETH',
        to: 'USDC',
        amount: 2,
      });

      expect(result.from).toBe('ETH');
      expect(result.to).toBe('USDC');
      expect(result.amount).toBe(2);
      expect(result.rate).toBe(2500); // ETH/USDC = 2500/1
      expect(result.result).toBe(5000); // 2 ETH * 2500 = 5000 USDC
    });

    it('should throw NotFound error when from currency not found', async () => {
      mockRepository.findByCurrency.mockResolvedValueOnce(null);

      await expect(
        service.calculateExchangeRate({ from: 'UNKNOWN', to: 'USDC', amount: 1 })
      ).rejects.toThrow("Currency 'UNKNOWN' not found");
    });

    it('should throw NotFound error when to currency not found', async () => {
      const ethToken = {
        id: 'eth-id',
        currency: 'ETH',
        price: new Decimal('2500'),
        date: new Date(),
        source: PriceSource.EXTERNAL_API,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByCurrency
        .mockResolvedValueOnce(ethToken)
        .mockResolvedValueOnce(null);

      await expect(
        service.calculateExchangeRate({ from: 'ETH', to: 'UNKNOWN', amount: 1 })
      ).rejects.toThrow("Currency 'UNKNOWN' not found");
    });
  });

  describe('getTokenPrices', () => {
    it('should return paginated token prices', async () => {
      const mockData = [
        {
          id: '1',
          currency: 'ETH',
          price: new Decimal('2500'),
          date: new Date(),
          source: PriceSource.EXTERNAL_API,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          currency: 'BTC',
          price: new Decimal('40000'),
          date: new Date(),
          source: PriceSource.EXTERNAL_API,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findMany.mockResolvedValue({
        data: mockData,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });

      const result = await service.getTokenPrices({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.data[0].currency).toBe('ETH');
      expect(result.data[1].currency).toBe('BTC');
    });
  });
});

