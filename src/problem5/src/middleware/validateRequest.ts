import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';

/**
 * Request Validation Middleware Factory
 *
 * Creates middleware that validates request data against a Zod schema.
 * Supports validation of body, query, and params.
 *
 * @param schema - Zod schema for validation
 * @param source - Request property to validate ('body' | 'query' | 'params')
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const validated = schema.parse(data);

      // Replace with validated and transformed data
      req[source] = validated as (typeof req)[typeof source];

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Pass to error handler
        next(error);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate multiple sources
 * Useful for validating both body and query params together
 */
export function validateMultiple(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
