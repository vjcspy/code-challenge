import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

import { validateMultiple, validateRequest } from '@/middleware';

describe('validateRequest', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('body validation', () => {
    const schema = z.object({
      name: z.string().min(1),
      price: z.number().positive(),
    });

    it('should pass validation with valid body', () => {
      mockRequest.body = { name: 'ETH', price: 2500 };

      const middleware = validateRequest(schema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ name: 'ETH', price: 2500 });
    });

    it('should call next with ZodError for invalid body', () => {
      mockRequest.body = { name: '', price: -100 };

      const middleware = validateRequest(schema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should transform and coerce data', () => {
      const coerceSchema = z.object({
        count: z.coerce.number(),
      });

      mockRequest.body = { count: '42' };

      const middleware = validateRequest(coerceSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({ count: 42 });
    });
  });

  describe('query validation', () => {
    const schema = z.object({
      page: z.coerce.number().optional().default(1),
      limit: z.coerce.number().optional().default(10),
    });

    it('should pass validation with valid query', () => {
      mockRequest.query = { page: '2', limit: '20' };

      const middleware = validateRequest(schema, 'query');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({ page: 2, limit: 20 });
    });

    it('should apply defaults for missing query params', () => {
      mockRequest.query = {};

      const middleware = validateRequest(schema, 'query');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({ page: 1, limit: 10 });
    });
  });

  describe('params validation', () => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    it('should pass validation with valid params', () => {
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      const middleware = validateRequest(schema, 'params');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error for invalid UUID', () => {
      mockRequest.params = { id: 'not-a-uuid' };

      const middleware = validateRequest(schema, 'params');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
    });
  });
});

describe('validateMultiple', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  it('should validate body, query, and params together', () => {
    const schemas = {
      body: z.object({ name: z.string() }),
      query: z.object({ page: z.coerce.number().default(1) }),
      params: z.object({ id: z.string() }),
    };

    mockRequest.body = { name: 'ETH' };
    mockRequest.query = { page: '2' };
    mockRequest.params = { id: 'test-id' };

    const middleware = validateMultiple(schemas);
    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockRequest.body).toEqual({ name: 'ETH' });
    expect(mockRequest.query).toEqual({ page: 2 });
    expect(mockRequest.params).toEqual({ id: 'test-id' });
  });

  it('should validate only specified sources', () => {
    const schemas = {
      query: z.object({ search: z.string().optional() }),
    };

    mockRequest.query = { search: 'test' };
    mockRequest.body = { anything: 'here' };

    const middleware = validateMultiple(schemas);
    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockRequest.body).toEqual({ anything: 'here' }); // Not validated
    expect(mockRequest.query).toEqual({ search: 'test' });
  });

  it('should call next with error if any validation fails', () => {
    const schemas = {
      body: z.object({ name: z.string().min(5) }),
    };

    mockRequest.body = { name: 'a' }; // Too short

    const middleware = validateMultiple(schemas);
    middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ZodError));
  });
});
