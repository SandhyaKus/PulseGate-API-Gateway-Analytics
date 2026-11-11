const request = require('supertest');
const express = require('express');
const app = require('../src/app');
const upstreamApp = require('../src/upstream/upstreamApp');
const { ProxyService } = require('../src/services/proxy');
const redisService = require('../src/services/redis');
const { RAW_KEYS } = require('../src/config/clients');

describe('Safe Upstream Request Forwarding & Reverse Proxy (proxy.js & gatewayRoutes.js)', () => {
  let upstreamServer;
  const UPSTREAM_PORT = 4001;

  beforeAll((done) => {
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

  // 1. Successful forwarding
  test('1. Successfully forwards GET /gateway/products to upstream GET /api/products', async () => {
    const res = await request(app)
      .get('/gateway/products')
      .set('X-API-Key', RAW_KEYS.demo);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);

    // Verify gateway tracking headers injected on response
    expect(res.headers).toHaveProperty('x-ratelimit-limit');
    expect(res.headers).toHaveProperty('x-ratelimit-remaining');
    expect(res.headers).toHaveProperty('x-client-id', 'client_demo');
    expect(res.headers).toHaveProperty('x-request-id');
  });

  // 1b. Query parameter forwarding
  test('1b. Safely forwards query parameters to upstream', async () => {
    const res = await request(app)
      .get('/gateway/products?category=Security&limit=1')
      .set('X-API-Key', RAW_KEYS.demo);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].category).toBe('Security');
  });

  // 2. Invalid API key
  test('2. Rejects request with invalid API key with HTTP 401', async () => {
    const res = await request(app)
      .get('/gateway/products')
      .set('X-API-Key', 'invalid_unrecognized_key_123');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_API_KEY');
  });

  // 3. Rate-limited request
  test('3. Rejects request with HTTP 429 when quota is exhausted', async () => {
    // client_free has capacity 10. Send 11 rapid requests.
    let response;
    for (let i = 0; i < 11; i++) {
      response = await request(app)
        .get('/gateway/products')
        .set('X-API-Key', RAW_KEYS.free);
    }

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
    expect(response.headers).toHaveProperty('retry-after');
  });

  // 4. Upstream timeout handling
  test('4. Handles upstream timeout with controlled HTTP 504 GATEWAY_TIMEOUT', async () => {
    // Create an isolated proxy service configured with an unreachable/delayed mock
    const timeoutApp = express();
    // Simulate slow upstream that takes 200ms
    const slowServer = express();
    slowServer.get('/api/slow', (req, res) => {
      setTimeout(() => res.json({ done: true }), 300);
    });
    const slowHttpServer = slowServer.listen(4009);

    const testProxy = new ProxyService({
      upstreamBaseUrl: 'http://localhost:4009',
      timeoutMs: 50 // Enforce 50ms timeout
    });

    timeoutApp.get('/test-timeout', (req, res) => testProxy.forward(req, res, '/api/slow'));

    const res = await request(timeoutApp).get('/test-timeout');

    slowHttpServer.close();

    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('GATEWAY_TIMEOUT');
    expect(res.body.error.statusCode).toBe(504);
    expect(res.body.error.message).toContain('timed out');
  });

  // 5. Upstream unavailable handling
  test('5. Handles upstream connection failure with controlled HTTP 502 BAD_GATEWAY', async () => {
    const testProxy = new ProxyService({
      upstreamBaseUrl: 'http://localhost:59999' // Non-existent port
    });

    const testApp = express();
    testApp.get('/test-down', (req, res) => testProxy.forward(req, res, '/api/products'));

    const res = await request(testApp).get('/test-down');

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('BAD_GATEWAY');
    expect(res.body.error.statusCode).toBe(502);
    expect(res.body.error.message).toContain('unavailable');
  });

  // 6. Fixed destination enforcement: Gateway never acts as an open proxy
  test('6. Strictly rejects arbitrary target injection (SSRF immunity)', async () => {
    // Attempting to inject custom destination via headers or query params
    const res = await request(app)
      .get('/gateway/products?targetUrl=http://169.254.169.254/latest/meta-data')
      .set('X-API-Key', RAW_KEYS.demo)
      .set('X-Target-Url', 'http://malicious-internal-server.local');

    expect(res.status).toBe(200);
    // Verified: The targetUrl parameter and X-Target-Url header are IGNORED.
    // The gateway still forwarded strictly to trusted sample products!
    expect(res.body).toHaveProperty('data');
    expect(res.body.data[0].id).toBe('prod_01J8F9');
  });

  test('6b. Non-whitelisted routes return HTTP 404 (preventing open proxying)', async () => {
    const res = await request(app)
      .get('/gateway/unregistered-arbitrary-endpoint')
      .set('X-API-Key', RAW_KEYS.demo);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

