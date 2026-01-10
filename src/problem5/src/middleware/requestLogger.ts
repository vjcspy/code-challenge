import pinoHttp from 'pino-http';
import { logger } from '../utils/logger';
import { RequestWithCorrelationId } from '../types';

/**
 * Request Logger Middleware
 * 
 * Uses pino-http to log all HTTP requests with correlation ID context.
 * Logs method, path, status code, and response time.
 */
export const requestLogger = pinoHttp({
  logger,
  
  // Custom props to include in every log
  customProps: (req) => ({
    correlationId: (req as RequestWithCorrelationId).correlationId,
  }),

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

