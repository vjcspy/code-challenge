/**
 * Application Configuration
 * Centralized configuration from environment variables
 */

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // External API
  priceApiUrl: process.env.PRICE_API_URL || 'https://interview.switcheo.com/prices.json',
  priceSyncIntervalMs: parseInt(process.env.PRICE_SYNC_INTERVAL_MS || '30000', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const required = ['DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

