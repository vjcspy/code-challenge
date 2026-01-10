import axios, { AxiosError, AxiosInstance } from 'axios';

import { config } from '@/config';

import { logger } from './logger';

/**
 * HTTP Client for external API calls
 * Configured with timeout and retry logic
 */
export const httpClient: AxiosInstance = axios.create({
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor for logging
httpClient.interceptors.request.use(
  (requestConfig) => {
    logger.debug(
      {
        method: requestConfig.method?.toUpperCase(),
        url: requestConfig.url,
      },
      'HTTP request started'
    );
    return requestConfig;
  },
  (error) => {
    logger.error({ error: error.message }, 'HTTP request error');
    return Promise.reject(error);
  }
);

// Response interceptor for logging
httpClient.interceptors.response.use(
  (response) => {
    logger.debug(
      {
        method: response.config.method?.toUpperCase(),
        url: response.config.url,
        status: response.status,
      },
      'HTTP response received'
    );
    return response;
  },
  (error: AxiosError) => {
    logger.error(
      {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
      },
      'HTTP response error'
    );
    return Promise.reject(error);
  }
);

/**
 * Fetch token prices from external API with retry logic
 */
export async function fetchExternalPrices<T>(
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await httpClient.get<T>(config.priceApiUrl);
      return response.data;
    } catch (error) {
      lastError = error as Error;
      logger.warn(
        {
          attempt,
          maxRetries: retries,
          error: lastError.message,
        },
        'External API request failed, retrying...'
      );

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}
