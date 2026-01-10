import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { RequestWithCorrelationId } from '@/types';

/**
 * Correlation ID Middleware
 *
 * Extracts X-Correlation-ID from Kong Gateway headers or generates a new UUID.
 * Attaches correlationId to request object and sets it in response headers.
 *
 * This enables end-to-end request tracing:
 * Frontend → Kong → Backend → Database
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract correlation ID from Kong Gateway header or generate new one
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    uuidv4();

  // Attach to request for use in handlers and logging
  (req as RequestWithCorrelationId).correlationId = correlationId;

  // Set response header for frontend debugging
  res.setHeader('X-Correlation-ID', correlationId);

  next();
}
