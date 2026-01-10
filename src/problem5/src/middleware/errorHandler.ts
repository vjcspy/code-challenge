import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '@/errors/AppError';
import { ApiErrorResponse, RequestWithCorrelationId } from '@/types';
import { createRequestLogger } from '@/utils/logger';

/**
 * Global Error Handler Middleware
 *
 * Handles all errors thrown in the application:
 * - AppError: Custom operational errors
 * - ZodError: Validation errors
 * - Unknown errors: Converted to 500 Internal Server Error
 *
 * All errors are logged with correlation ID for tracing.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = (req as RequestWithCorrelationId).correlationId;
  const logger = createRequestLogger(correlationId);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorResponse: ApiErrorResponse = {
      error: 'Validation Error',
      message: 'Invalid request data',
      statusCode: 400,
      correlationId,
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    };

    logger.warn(
      {
        type: 'ValidationError',
        errors: err.errors,
        path: req.path,
        method: req.method,
      },
      'Request validation failed'
    );

    res.status(400).json(errorResponse);
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    const errorResponse: ApiErrorResponse = {
      error: err.name,
      message: err.message,
      statusCode: err.statusCode,
      correlationId,
      details: err.details,
    };

    // Log operational errors as warnings, programming errors as errors
    if (err.isOperational) {
      logger.warn(
        {
          type: 'AppError',
          statusCode: err.statusCode,
          path: req.path,
          method: req.method,
        },
        err.message
      );
    } else {
      logger.error(
        {
          type: 'AppError',
          statusCode: err.statusCode,
          stack: err.stack,
          path: req.path,
          method: req.method,
        },
        err.message
      );
    }

    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle unknown errors (convert to 500)
  const errorResponse: ApiErrorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    statusCode: 500,
    correlationId,
  };

  logger.error(
    {
      type: 'UnhandledError',
      name: err.name,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    },
    'Unhandled error occurred'
  );

  res.status(500).json(errorResponse);
}

/**
 * Not Found Handler
 * Handles requests to undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const correlationId = (req as RequestWithCorrelationId).correlationId;

  const errorResponse: ApiErrorResponse = {
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    correlationId,
  };

  res.status(404).json(errorResponse);
}
