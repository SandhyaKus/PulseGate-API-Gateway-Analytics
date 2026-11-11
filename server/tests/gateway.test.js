const request = require('supertest');
const app = require('../src/app');
const upstreamApp = require('../src/upstream/upstreamApp');
const redisService = require('../src/services/redis');
const { RAW_KEYS } = require('../src/config/clients');

describe('Gateway Protected Reverse Proxy & Rate Limiting Integration', () => {
  let upstreamServer;
  const UPSTREAM_PORT = 4001;

  beforeAll((done) => {
    // Start sample upstream server on port 4001
    upstreamServer = upstreamApp.listen(UPSTREAM_PORT, async () => {
      await redisService.connect();
      done();
    });
  });

  afterAll((done) => {
    upstreamServer.close(async () => {
      await redisService.disconnect();
      done();
    });
  });

  test('GET /gateway/api/products requires X-API-Key header (401)', async () => {
    const res = await request(app).get('/gateway/api/products');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('API_KEY_REQUIRED');
  });

  test('GET /gateway/api/products rejects invalid key (401)', async () => {
    const res = await request(app)
      .get('/gateway/api/products')
      .set('X-API-Key', 'invalid_key_abc');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_API_KEY');
  });

  test('GET /gateway/api/products rejects disabled client (403)', async () => {
    const res = await request(app)
      .get('/gateway/api/products')
      .set('X-API-Key', RAW_KEYS.disabled);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CLIENT_DISABLED');
  });

  test('GET /gateway/api/products with valid key proxies to upstream with RateLimit headers', async () => {
    const res = await request(app)
      .get('/gateway/api/products')
      .set('X-API-Key', RAW_KEYS.demo);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);

    // Verify RateLimit headers
    expect(res.headers).toHaveProperty('x-ratelimit-limit');
    expect(res.headers).toHaveProperty('x-ratelimit-remaining');
    expect(res.headers).toHaveProperty('x-ratelimit-reset');
    expect(res.headers).toHaveProperty('x-client-id', 'client_demo');
    expect(res.headers).toHaveProperty('x-request-id');
  });

  test('GET /gateway/api/products/:id proxies single product item', async () => {
    const res = await request(app)
      .get('/gateway/api/products/prod_01J8F9')
      .set('X-API-Key', RAW_KEYS.demo);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('prod_01J8F9');
    expect(res.body.data.name).toBe('PulseGate Shield Pro');
  });

  test('Exhausting quota triggers HTTP 429 with Retry-After header', async () => {
    // Free tier has capacity = 10
    // Send 11 rapid requests
    let lastResponse;
    for (let i = 0; i < 11; i++) {
      lastResponse = await request(app)
        .get('/gateway/api/products')
        .set('X-API-Key', RAW_KEYS.free);
    }

    expect(lastResponse.status).toBe(429);
    expect(lastResponse.body.error.code).toBe('RATE_LIMITED');
    expect(lastResponse.headers).toHaveProperty('retry-after');
    expect(Number(lastResponse.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(lastResponse.headers['x-ratelimit-remaining']).toBe('0');
  });

  test('Non-whitelisted routes are blocked (SSRF immunity)', async () => {
    const res = await request(app)
      .get('/gateway/api/malicious-target-path')
      .set('X-API-Key', RAW_KEYS.demo);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  test('GET /api/clients returns public client catalog with masked keys and zero secrets', async () => {
    const res = await request(app).get('/api/clients');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.clients)).toBe(true);
    expect(res.body.clients.length).toBeGreaterThanOrEqual(4);

    // Verify no apiKeyHash is leaked
    res.body.clients.forEach((client) => {
      expect(client).not.toHaveProperty('apiKeyHash');
      expect(client).toHaveProperty('maskedKey');
      expect(client.maskedKey).toContain('••••••');
    });
  });
});

