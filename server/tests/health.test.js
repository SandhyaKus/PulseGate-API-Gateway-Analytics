const request = require('supertest');
const app = require('../src/app');

describe('Gateway Foundation & Health Check (Day 1)', () => {
  it('GET /health returns 200 and structured health diagnostics', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('service', 'PulseGate API Gateway');
    expect(res.body).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('redis');
    expect(res.body.redis).toHaveProperty('status');
    expect(res.body).toHaveProperty('upstream');
    expect(res.body.upstream).toHaveProperty('configuredUrl');
  });

  it('assigns and returns X-Request-Id header', async () => {
    const res = await request(app).get('/health');

    expect(res.headers).toHaveProperty('x-request-id');
    expect(typeof res.headers['x-request-id']).toBe('string');
    expect(res.headers['x-request-id'].length).toBeGreaterThan(10);
  });

  it('preserves client-provided X-Request-Id header', async () => {
    const customId = 'test-req-tracing-12345';
    const res = await request(app)
      .get('/health')
      .set('X-Request-Id', customId);

    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('returns structured JSON error on non-existent routes (404)', async () => {
    const res = await request(app).get('/api/unmatched-route-xyz');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('statusCode', 404);
    expect(res.body.error).toHaveProperty('requestId');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('GET / returns gateway service metadata', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.service).toContain('PulseGate');
    expect(res.body.status).toBe('online');
  });
});

