/**
 * Data Access Error
 * Thrown by Repository layer for database-related errors
 *
 * Wraps Prisma errors and other database errors into a consistent format.
 */
export class DataAccessError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly originalError?: Error;

  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = 'DataAccessError';
    this.statusCode = 500;
    this.code = code;
    this.originalError = originalError;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DataAccessError.prototype);
  }

  /**
   * Database connection error
   */
  static connectionError(originalError?: Error): DataAccessError {
    return new DataAccessError(
      'Database connection failed',
      'DB_CONNECTION_ERROR',
      originalError
    );
  }

  /**
   * Record not found in database
   */
  static recordNotFound(entity: string, identifier?: string): DataAccessError {
    const message = identifier
      ? `${entity} with identifier '${identifier}' not found in database`
      : `${entity} not found in database`;
    return new DataAccessError(message, 'RECORD_NOT_FOUND');
  }

  /**
   * Unique constraint violation
   */
  static uniqueConstraint(field: string, originalError?: Error): DataAccessError {
    return new DataAccessError(
      `Duplicate value for field '${field}'`,
      'UNIQUE_CONSTRAINT_VIOLATION',
      originalError
    );
  }

  /**
   * Foreign key constraint violation
   */
  static foreignKeyConstraint(originalError?: Error): DataAccessError {
    return new DataAccessError(
      'Referenced record does not exist',
      'FOREIGN_KEY_VIOLATION',
      originalError
    );
  }

  /**
   * Query timeout
   */
  static queryTimeout(originalError?: Error): DataAccessError {
    return new DataAccessError('Database query timed out', 'QUERY_TIMEOUT', originalError);
  }

  /**
   * Generic database error
   */
  static databaseError(message: string, originalError?: Error): DataAccessError {
    return new DataAccessError(message, 'DATABASE_ERROR', originalError);
  }
}

