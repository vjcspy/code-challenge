import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { RequestWithCorrelationId } from '@/types';
import { RequestContext, requestContext } from '@/utils/context';

/**
 * Correlation ID Middleware
 *
 * Extracts X-Correlation-ID from Kong Gateway headers or generates a new UUID.
 * Sets up AsyncLocalStorage context for automatic log injection.
 *
 * This enables:
 * - End-to-end request tracing: Frontend → Kong → Backend → Database
 * - Automatic correlationId injection in all logs (via AsyncLocalStorage)
 * - Response header for frontend debugging
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract correlation ID from Kong Gateway header or generate new one
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    uuidv4();

  // Attach to request for backward compatibility
  (req as RequestWithCorrelationId).correlationId = correlationId;

  // Set response header for frontend debugging
  res.setHeader('X-Correlation-ID', correlationId);

  // Create request context
  const context: RequestContext = {
    correlationId,
    method: req.method,
    path: req.path,
    startTime: Date.now(),
  };

  // Run the rest of the request within this context
  // All code executed after this will have access to the context
  requestContext.run(context, () => {
    next();
  });
}
