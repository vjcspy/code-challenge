import pinoHttp from 'pino-http';

import { logger } from '@/utils/logger';

/**
 * Request Logger Middleware
 *
 * Uses pino-http to log all HTTP requests.
 * Correlation ID is automatically injected via logger's mixin (AsyncLocalStorage).
 */
export const requestLogger = pinoHttp({
  logger,

  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },

  // Custom error message
  customErrorMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode} - Error`;
  },

  // Custom log level based on status code
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },

  // Redact sensitive headers
  redact: ['req.headers.authorization', 'req.headers.cookie'],

  // Custom attribute keys
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration',
  },

  // Serializers for request/response
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
