const request = require('supertest');
const express = require('express');
const rateLimitMiddleware = require('../src/middleware/rateLimiter');
const redisService = require('../src/services/redis');
const rateLimiter = require('../src/services/rateLimiter');

describe('Rate Limiter Middleware with Client & Route Policies', () => {
  let app;
  let client;

  beforeAll(async () => {
    client = await redisService.connect();
  });

  afterAll(async () => {
    if (client && redisService.isConnected) {
      const keys = await client.keys('rate:test_middleware_*');
      if (keys.length > 0) {
        await client.del(keys);
      }
      await redisService.disconnect();
    }
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Middleware to set dummy requestId
    app.use((req, res, next) => {
      req.id = 'req_test_12345';
      next();
    });
  });

  // 1. Guard against unauthenticated clients
  test('rejects unauthenticated request with HTTP 401 and code UNAUTHENTICATED', async () => {
    // No req.client attached
    app.get('/api/products', rateLimitMiddleware, (req, res) => {
      res.json({ success: true });
    });

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(res.body.error.message).toContain('Authentication required');
  });

  // 2. Client & Route policy resolution and successful allowance
  test('resolves policy for demo-client-a on products-read and allows requests with headers', async () => {
    const testClientId = `test_middleware_client_a_${Date.now()}`;

    // Attach authenticated client
    app.use((req, res, next) => {
      req.client = {
        clientId: testClientId,
        name: 'Demo Client A',
        capacity: 10,
        refillRatePerSecond: 2
      };
      next();
    });

    app.get('/api/products', rateLimitMiddleware, (req, res) => {
      res.json({
        success: true,
        rateLimit: req.rateLimit
      });
    });

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify rate-limit decision attached to req context
    expect(res.body.rateLimit).toBeDefined();
    expect(res.body.rateLimit.allowed).toBe(true);
    expect(res.body.rateLimit.limit).toBe(10);
    expect(res.body.rateLimit.remaining).toBe(9);
    expect(res.body.rateLimit.routeId).toBe('products-read');

    // Verify response headers
    expect(res.headers['x-ratelimit-limit']).toBe('10');
    expect(res.headers['x-ratelimit-remaining']).toBe('9');
    expect(res.headers).not.toHaveProperty('retry-after');
  });

  // 3. Exhausted bucket triggers HTTP 429 with exact error body
  test('rejects request with HTTP 429, Retry-After header, and exact error payload when quota is exhausted', async () => {
    const testClientId = `test_middleware_exhaust_${Date.now()}`;

    app.use((req, res, next) => {
      req.client = {
        clientId: testClientId,
        name: 'Limited Client',
        capacity: 3,
        refillRatePerSecond: 0.5 // Slow refill
      };
      next();
    });

    app.get('/api/products', rateLimitMiddleware, (req, res) => {
      res.json({ success: true });
    });

    // Consume 3 tokens (capacity = 3)
    await request(app).get('/api/products');
    await request(app).get('/api/products');
    const thirdRes = await request(app).get('/api/products');
    expect(thirdRes.headers['x-ratelimit-remaining']).toBe('0');

    // 4th request must be rejected with 429
    const rejectedRes = await request(app).get('/api/products');

    expect(rejectedRes.status).toBe(429);

    // Verify response headers
    expect(rejectedRes.headers['x-ratelimit-limit']).toBe('3');
    expect(rejectedRes.headers['x-ratelimit-remaining']).toBe('0');
    expect(rejectedRes.headers).toHaveProperty('retry-after');
    expect(Number(rejectedRes.headers['retry-after'])).toBeGreaterThanOrEqual(1);

    // Verify exact required error body structure
    expect(rejectedRes.body).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Request quota exceeded',
        requestId: 'req_test_12345',
        retryAfterSeconds: expect.any(Number)
      }
    });
  });

  // 4. Client isolation: Multiple clients do not interfere with each other
  test('maintains isolated bucket state for separate clients on the same route', async () => {
    const clientOne = `test_middleware_iso1_${Date.now()}`;
    const clientTwo = `test_middleware_iso2_${Date.now()}`;

    // App supporting dynamic clientId via header for test simulation
    const isolatedApp = express();
    isolatedApp.use((req, res, next) => {
      req.id = 'req_test';
      const cId = req.headers['x-test-client'];
      req.client = {
        clientId: cId,
        capacity: 5,
        refillRatePerSecond: 1
      };
      next();
    });
    isolatedApp.get('/api/products', rateLimitMiddleware, (req, res) => {
      res.json({ success: true, remaining: req.rateLimit.remaining });
    });

    // Client 1 consumes 3 tokens
    await request(isolatedApp).get('/api/products').set('x-test-client', clientOne);
    await request(isolatedApp).get('/api/products').set('x-test-client', clientOne);
    const resClient1 = await request(isolatedApp).get('/api/products').set('x-test-client', clientOne);

    expect(resClient1.body.remaining).toBe(2);

    // Client 2 consumes 1 token -> bucket should be full (capacity 5 - 1 = 4 remaining)
    const resClient2 = await request(isolatedApp).get('/api/products').set('x-test-client', clientTwo);
    expect(resClient2.body.remaining).toBe(4);
  });
});

