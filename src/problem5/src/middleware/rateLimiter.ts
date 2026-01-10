import rateLimit from 'express-rate-limit';

import { config } from '@/config';

/**
 * Rate Limiter Middleware
 *
 * Provides backup rate limiting in case Kong's rate limiting is bypassed.
 * In production, Kong should be the primary rate limiter.
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: config.isProduction ? 100 : 1000, // More permissive in development
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    statusCode: 429,
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  keyGenerator: (req) => {
    // Use X-Consumer-ID from Kong if available, otherwise use IP
    return (req.headers['x-consumer-id'] as string) || req.ip || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    return req.path === '/health' || req.path === '/health/ready';
  },
});
