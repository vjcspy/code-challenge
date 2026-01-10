import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import request from 'supertest';
import { Express } from 'express';

describe('Token Price API Integration Tests', () => {
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
    process.env.PORT = '0';

    // Run migrations
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', {
      env: process.env,
      cwd: process.cwd(),
    });

    // Import app after setting environment
    const { createApp } = await import('../../../src/app');
    app = createApp();
  }, 60000);

  afterAll(async () => {
    process.env = originalEnv;
    if (postgresContainer) {
      await postgresContainer.stop();
    }
  });

  describe('CRUD Operations', () => {
    let createdId: string;

    it('POST /api/token-prices - should create a new token price', async () => {
      const response = await request(app)
        .post('/api/token-prices')
        .send({
          currency: 'TEST_TOKEN',
          price: 123.45,
          date: '2024-01-01T00:00:00.000Z',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.currency).toBe('TEST_TOKEN');
      expect(response.body.price).toBe('123.45');
      expect(response.body.source).toBe('MANUAL');

      createdId = response.body.id;
    });

    it('GET /api/token-prices - should list token prices', async () => {
      const response = await request(app).get('/api/token-prices');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /api/token-prices/:currency - should get token price by currency', async () => {
      const response = await request(app).get('/api/token-prices/TEST_TOKEN');

      expect(response.status).toBe(200);
      expect(response.body.currency).toBe('TEST_TOKEN');
      expect(response.body.price).toBe('123.45');
    });

    it('PUT /api/token-prices/:id - should update token price', async () => {
      const response = await request(app)
        .put(`/api/token-prices/${createdId}`)
        .send({
          price: 999.99,
        });

      expect(response.status).toBe(200);
      expect(response.body.price).toBe('999.99');
    });

    it('DELETE /api/token-prices/:id - should delete token price', async () => {
      const response = await request(app).delete(`/api/token-prices/${createdId}`);

      expect(response.status).toBe(204);
    });

    it('GET /api/token-prices/:currency - should return 404 for deleted token', async () => {
      const response = await request(app).get('/api/token-prices/TEST_TOKEN');

      expect(response.status).toBe(404);
    });
  });

  describe('Filtering and Pagination', () => {
    beforeAll(async () => {
      // Create test data
      await request(app).post('/api/token-prices').send({
        currency: 'ETH_TEST',
        price: 2500,
      });
      await request(app).post('/api/token-prices').send({
        currency: 'BTC_TEST',
        price: 40000,
      });
      await request(app).post('/api/token-prices').send({
        currency: 'USDC_TEST',
        price: 1,
      });
    });

    it('should filter by currency', async () => {
      const response = await request(app).get('/api/token-prices?currency=ETH_TEST');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].currency).toBe('ETH_TEST');
    });

    it('should filter by price range', async () => {
      const response = await request(app).get('/api/token-prices?minPrice=100&maxPrice=50000');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2); // ETH and BTC
    });

    it('should paginate results', async () => {
      const response = await request(app).get('/api/token-prices?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });
  });

  describe('Exchange Rate Calculation', () => {
    beforeAll(async () => {
      // Ensure test tokens exist
      await request(app).post('/api/token-prices').send({
        currency: 'FROM_TOKEN',
        price: 100,
      }).catch(() => {}); // Ignore if already exists
      
      await request(app).post('/api/token-prices').send({
        currency: 'TO_TOKEN',
        price: 50,
      }).catch(() => {}); // Ignore if already exists
    });

    it('should calculate exchange rate', async () => {
      const response = await request(app).get(
        '/api/exchange-rate?from=FROM_TOKEN&to=TO_TOKEN&amount=10'
      );

      expect(response.status).toBe(200);
      expect(response.body.from).toBe('FROM_TOKEN');
      expect(response.body.to).toBe('TO_TOKEN');
      expect(response.body.amount).toBe(10);
      expect(response.body.rate).toBe(2); // 100/50 = 2
      expect(response.body.result).toBe(20); // 10 * 2 = 20
    });

    it('should return 404 for unknown currency', async () => {
      const response = await request(app).get(
        '/api/exchange-rate?from=UNKNOWN&to=TO_TOKEN&amount=10'
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/token-prices')
        .send({
          currency: '', // Empty currency
          price: -100, // Negative price
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent currency', async () => {
      const response = await request(app).get('/api/token-prices/NONEXISTENT');

      expect(response.status).toBe(404);
    });

    it('should return 409 for duplicate currency', async () => {
      // First create
      await request(app).post('/api/token-prices').send({
        currency: 'DUPLICATE_TEST',
        price: 100,
      });

      // Try to create again
      const response = await request(app).post('/api/token-prices').send({
        currency: 'DUPLICATE_TEST',
        price: 200,
      });

      expect(response.status).toBe(409);
    });
  });
});

