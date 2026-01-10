/**
 * Business Error
 * Thrown by Service layer for business logic errors
 *
 * These are operational errors that should be handled gracefully.
 */
export class BusinessError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, BusinessError.prototype);
  }

  /**
   * Resource not found (404)
   */
  static notFound(resource: string, identifier?: string): BusinessError {
    const message = identifier
      ? `${resource} '${identifier}' not found`
      : `${resource} not found`;
    return new BusinessError(message, 404, 'NOT_FOUND');
  }

  /**
   * Resource conflict (409)
   */
  static conflict(message: string): BusinessError {
    return new BusinessError(message, 409, 'CONFLICT');
  }

  /**
   * Validation error (422)
   */
  static validation(message: string, details?: unknown): BusinessError {
    return new BusinessError(message, 422, 'VALIDATION_ERROR', details);
  }

  /**
   * Bad request (400)
   */
  static badRequest(message: string, details?: unknown): BusinessError {
    return new BusinessError(message, 400, 'BAD_REQUEST', details);
  }

  /**
   * Service unavailable (503)
   */
  static serviceUnavailable(message: string): BusinessError {
    return new BusinessError(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

