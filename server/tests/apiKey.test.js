const request = require('supertest');
const express = require('express');
const apiKeyMiddleware = require('../src/middleware/apiKey');
const { RAW_KEYS, hashApiKey } = require('../src/config/clients');

describe('API Key Authentication Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Protected test route that echoes authenticated client info
    app.get('/protected-test', apiKeyMiddleware, (req, res) => {
      res.json({
        success: true,
        client: req.client
      });
    });
  });

  // 1. Missing API key
  test('rejects request with HTTP 401 when X-API-Key is missing', async () => {
    const res = await request(app).get('/protected-test');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('API_KEY_REQUIRED');
    expect(res.body.error.statusCode).toBe(401);
    expect(res.body.error.message).toContain('Missing API key');
  });

  // 2. Invalid API key
  test('rejects request with HTTP 401 when an invalid API key is provided', async () => {
    const res = await request(app)
      .get('/protected-test')
      .set('X-API-Key', 'pg_invalid_fake_key_99999');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('INVALID_API_KEY');
    expect(res.body.error.statusCode).toBe(401);
    expect(res.body.error.message).toContain('Invalid API key');
  });

  // 3. Valid API key (Free Tier)
  test('authenticates valid Free Tier API key and attaches client info', async () => {
    const res = await request(app)
      .get('/protected-test')
      .set('X-API-Key', RAW_KEYS.free);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.client.clientId).toBe('client_free');
    expect(res.body.client.tier).toBe('free');
    expect(res.body.client.capacity).toBe(10);
    expect(res.body.client.refillRatePerSecond).toBe(1);
    expect(res.body.client.enabled).toBe(true);

    // Verify X-Client-Id header injection
    expect(res.headers['x-client-id']).toBe('client_free');
  });

  // 4. Different clients (Pro Tier)
  test('authenticates Pro Tier API key with higher capacity limits', async () => {
    const res = await request(app)
      .get('/protected-test')
      .set('X-API-Key', RAW_KEYS.pro);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.client.clientId).toBe('client_pro');
    expect(res.body.client.tier).toBe('pro');
    expect(res.body.client.capacity).toBe(60);
    expect(res.body.client.refillRatePerSecond).toBe(10);
    expect(res.headers['x-client-id']).toBe('client_pro');
  });

  // 5. Disabled client rejection
  test('rejects disabled/suspended client with HTTP 403 Forbidden', async () => {
    const res = await request(app)
      .get('/protected-test')
      .set('X-API-Key', RAW_KEYS.disabled);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('CLIENT_DISABLED');
    expect(res.body.error.statusCode).toBe(403);
    expect(res.body.error.message).toContain('suspended or disabled');
  });

  // 6. Security: No credential leakage
  test('guarantees no apiKeyHash or raw credentials leak in responses or client state', async () => {
    const res = await request(app)
      .get('/protected-test')
      .set('X-API-Key', RAW_KEYS.free);

    expect(res.status).toBe(200);
    const bodyStr = JSON.stringify(res.body);

    // Ensure apiKeyHash is never present
    expect(res.body.client).not.toHaveProperty('apiKeyHash');
    expect(res.body.client).not.toHaveProperty('apiKey');
    expect(bodyStr).not.toContain(RAW_KEYS.free);
    expect(bodyStr).not.toContain(hashApiKey(RAW_KEYS.free));
  });
});

