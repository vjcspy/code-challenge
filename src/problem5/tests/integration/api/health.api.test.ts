import { Express } from 'express';
import request from 'supertest';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

describe('Health API Integration Tests', () => {
  let postgresContainer: StartedTestContainer;
  let app: Express;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Start PostgreSQL container
    postgresContainer = await new GenericContainer('postgres:15-alpine')
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test_db',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start();

    // Set environment variables
    const host = postgresContainer.getHost();
    const port = postgresContainer.getMappedPort(5432);
    process.env.DATABASE_URL = `postgresql://test:test@${host}:${port}/test_db`;
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0'; // Random port

    // Run migrations
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', {
      env: process.env,
      cwd: process.cwd(),
    });

    // Import app after setting environment
    const { createApp } = await import('../../../src/app');
    app = createApp();
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    // Restore environment
    process.env = originalEnv;

    // Stop container
    if (postgresContainer) {
      await postgresContainer.stop();
    }
  });

  describe('GET /health', () => {
    it('should return 200 OK with status up', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 OK when database is connected', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('database', 'connected');
    });
  });

  describe('Correlation ID Header', () => {
    it('should return X-Correlation-ID header when not provided', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.headers['x-correlation-id']).toBeDefined();
      expect(response.headers['x-correlation-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should return same X-Correlation-ID when provided in request', async () => {
      const correlationId = 'test-correlation-id-12345';

      const response = await request(app).get('/health').set('X-Correlation-ID', correlationId);

      expect(response.status).toBe(200);
      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });
});
