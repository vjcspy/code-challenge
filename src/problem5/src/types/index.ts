import { PriceSource } from '@prisma/client';
import { Request } from 'express';

/**
 * Extended Express Request with correlation ID
 */
export interface RequestWithCorrelationId extends Request {
  correlationId: string;
}

/**
 * Token Price Data from External API
 */
export interface ExternalTokenPrice {
  currency: string;
  date: string;
  price: number;
}

/**
 * Token Price for database operations
 */
export interface TokenPriceData {
  currency: string;
  price: number;
  date: Date;
  source: PriceSource;
}

/**
 * Token Price response
 */
export interface TokenPriceResponse {
  id: string;
  currency: string;
  price: string;
  date: string;
  source: PriceSource;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Token Price filter parameters
 */
export interface TokenPriceFilters extends PaginationParams {
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Exchange rate request
 */
export interface ExchangeRateRequest {
  from: string;
  to: string;
  amount: number;
}

/**
 * Exchange rate response
 */
export interface ExchangeRateResponse {
  from: string;
  to: string;
  amount: number;
  rate: number;
  result: number;
  timestamp: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
}

/**
 * Readiness check response
 */
export interface ReadinessCheckResponse extends HealthCheckResponse {
  database: 'connected' | 'disconnected';
  lastPriceSync?: string;
}

/**
 * API Error response
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  correlationId?: string;
  details?: unknown;
}
