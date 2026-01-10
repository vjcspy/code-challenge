import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {
  correlationIdMiddleware,
  requestLogger,
  errorHandler,
  notFoundHandler,
  rateLimiter,
} from './middleware';
import { routes } from './routes';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS - In production, this is handled by Kong
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Client-ID',
      'X-Client-Type',
      'X-Scope',
      'X-Correlation-ID',
    ],
    exposedHeaders: ['X-Correlation-ID'],
  }));

  // Parse JSON bodies
  app.use(express.json({ limit: '10kb' }));

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Correlation ID middleware (must be before request logger)
  app.use(correlationIdMiddleware);

  // Request logging with correlation ID
  app.use(requestLogger);

  // Rate limiting (backup for Kong)
  app.use(rateLimiter);

  // API routes
  app.use(routes);

  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

// Export singleton app instance
export const app = createApp();

