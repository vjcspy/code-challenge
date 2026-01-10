/**
 * Custom Application Error
 * Provides structured error handling with HTTP status codes
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Factory method for 400 Bad Request
   */
  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, true, details);
  }

  /**
   * Factory method for 401 Unauthorized
   */
  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(message, 401, true);
  }

  /**
   * Factory method for 403 Forbidden
   */
  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(message, 403, true);
  }

  /**
   * Factory method for 404 Not Found
   */
  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, 404, true);
  }

  /**
   * Factory method for 409 Conflict
   */
  static conflict(message: string): AppError {
    return new AppError(message, 409, true);
  }

  /**
   * Factory method for 422 Unprocessable Entity
   */
  static unprocessableEntity(message: string, details?: unknown): AppError {
    return new AppError(message, 422, true, details);
  }

  /**
   * Factory method for 500 Internal Server Error
   */
  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, 500, false);
  }

  /**
   * Factory method for 503 Service Unavailable
   */
  static serviceUnavailable(message: string = 'Service unavailable'): AppError {
    return new AppError(message, 503, true);
  }
}
