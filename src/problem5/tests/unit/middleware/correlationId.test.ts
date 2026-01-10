import { Request, Response, NextFunction } from 'express';
import { correlationIdMiddleware } from '../../../src/middleware/correlationId';
import { RequestWithCorrelationId } from '../../../src/types';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-uuid-12345'),
}));

describe('correlationIdMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should extract X-Correlation-ID from headers when present', () => {
    mockRequest.headers = {
      'x-correlation-id': 'existing-correlation-id',
    };

    correlationIdMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect((mockRequest as RequestWithCorrelationId).correlationId).toBe(
      'existing-correlation-id'
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Correlation-ID',
      'existing-correlation-id'
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should extract X-Request-ID from headers when X-Correlation-ID is not present', () => {
    mockRequest.headers = {
      'x-request-id': 'request-id-from-header',
    };

    correlationIdMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect((mockRequest as RequestWithCorrelationId).correlationId).toBe(
      'request-id-from-header'
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Correlation-ID',
      'request-id-from-header'
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should generate new UUID when no correlation ID in headers', () => {
    mockRequest.headers = {};

    correlationIdMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect((mockRequest as RequestWithCorrelationId).correlationId).toBe(
      'generated-uuid-12345'
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Correlation-ID',
      'generated-uuid-12345'
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should prefer X-Correlation-ID over X-Request-ID', () => {
    mockRequest.headers = {
      'x-correlation-id': 'correlation-id',
      'x-request-id': 'request-id',
    };

    correlationIdMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect((mockRequest as RequestWithCorrelationId).correlationId).toBe(
      'correlation-id'
    );
  });

  it('should call next() to continue middleware chain', () => {
    correlationIdMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });
});

