import { z } from 'zod';

/**
 * Token Price Validation Schemas
 * Using Zod for runtime validation and TypeScript type inference
 */

/**
 * Schema for listing token prices with filters and pagination
 */
export const listTokenPricesQuerySchema = z.object({
  currency: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListTokenPricesQuery = z.infer<typeof listTokenPricesQuerySchema>;

/**
 * Schema for getting a single token price by currency
 */
export const getTokenPriceByCurrencyParamsSchema = z.object({
  currency: z.string().min(1).max(20),
});

export type GetTokenPriceByCurrencyParams = z.infer<typeof getTokenPriceByCurrencyParamsSchema>;

/**
 * Schema for getting a token price by ID
 */
export const getTokenPriceByIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type GetTokenPriceByIdParams = z.infer<typeof getTokenPriceByIdParamsSchema>;

/**
 * Schema for creating a new token price
 */
export const createTokenPriceBodySchema = z.object({
  currency: z
    .string()
    .min(1, 'Currency is required')
    .max(20, 'Currency must be at most 20 characters')
    .transform((val) => val.toUpperCase()),
  price: z.number().positive('Price must be a positive number'),
  date: z.string().datetime().optional(),
});

export type CreateTokenPriceBody = z.infer<typeof createTokenPriceBodySchema>;

/**
 * Schema for updating an existing token price
 */
export const updateTokenPriceBodySchema = z.object({
  currency: z
    .string()
    .min(1)
    .max(20)
    .transform((val) => val.toUpperCase())
    .optional(),
  price: z.number().positive('Price must be a positive number').optional(),
  date: z.string().datetime().optional(),
});

export type UpdateTokenPriceBody = z.infer<typeof updateTokenPriceBodySchema>;

/**
 * Schema for exchange rate calculation
 */
export const exchangeRateQuerySchema = z.object({
  from: z
    .string()
    .min(1, 'Source currency is required')
    .transform((val) => val.toUpperCase()),
  to: z
    .string()
    .min(1, 'Target currency is required')
    .transform((val) => val.toUpperCase()),
  amount: z.coerce.number().positive('Amount must be positive').default(1),
});

export type ExchangeRateQuery = z.infer<typeof exchangeRateQuerySchema>;
