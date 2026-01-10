import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { BusinessError } from '@/errors/BusinessError';
import { DataAccessError } from '@/errors/DataAccessError';
import { ApiErrorResponse, RequestWithCorrelationId } from '@/types';
import { createRequestLogger } from '@/utils/logger';

/**
 * Global Error Handler Middleware
 *
 * SINGLE POINT for error handling - all errors are logged here ONCE.
 *
 * Error handling strategy:
 * - BusinessError: Service layer errors (404, 409, 422, etc.)
 * - DataAccessError: Repository layer errors (database errors)
 * - ZodError: Request validation errors
 * - Unknown errors: Converted to 500 Internal Server Error
 *
 * Each error is logged exactly ONCE with correlation ID for tracing.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = (req as RequestWithCorrelationId).correlationId;
  const logger = createRequestLogger(correlationId);

  // Common log context
  const logContext = {
    path: req.path,
    method: req.method,
    correlationId,
  };

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

    logger.warn({ ...logContext, type: 'ValidationError', errors: err.errors }, 'Request validation failed');

    res.status(400).json(errorResponse);
    return;
  }

  // Handle Business Errors (Service Layer)
  if (err instanceof BusinessError) {
    const errorResponse: ApiErrorResponse = {
      error: err.code,
      message: err.message,
      statusCode: err.statusCode,
      correlationId,
      details: err.details,
    };

    // Business errors are expected operational errors - log as warn
    logger.warn(
      { ...logContext, type: 'BusinessError', code: err.code, statusCode: err.statusCode },
      err.message
    );

    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle Data Access Errors (Repository Layer)
  if (err instanceof DataAccessError) {
    const errorResponse: ApiErrorResponse = {
      error: 'Database Error',
      message: 'A database error occurred',
      statusCode: 500,
      correlationId,
    };

    // Data access errors are infrastructure errors - log as error with original error details
    logger.error(
      {
        ...logContext,
        type: 'DataAccessError',
        code: err.code,
        originalError: err.originalError?.message,
        stack: err.stack,
      },
      err.message
    );

    res.status(500).json(errorResponse);
    return;
  }

  // Handle unknown errors (convert to 500)
  const errorResponse: ApiErrorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    statusCode: 500,
    correlationId,
  };

  // Unknown errors are unexpected - log as error with full stack trace
  logger.error(
    {
      ...logContext,
      type: 'UnhandledError',
      name: err.name,
      message: err.message,
      stack: err.stack,
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
