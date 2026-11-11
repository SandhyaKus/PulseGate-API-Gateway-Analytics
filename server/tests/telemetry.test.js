const request = require('supertest');
const app = require('../src/app');
const logStore = require('../src/services/logStore.service');
const metricsService = require('../src/services/metrics.service');
const { BoundedLogStore } = require('../src/services/logStore.service');

describe('Day 5: Telemetry, Observability & Bounded Logs', () => {
  beforeEach(() => {
    logStore.clear();
    metricsService.reset();
  });

  test('BoundedLogStore never exceeds configured maxCapacity (FIFO eviction)', () => {
    const smallStore = new BoundedLogStore(5);

    // Push 8 items
    for (let i = 1; i <= 8; i++) {
      smallStore.push({ id: `log_${i}`, message: `Message ${i}` });
    }

    const stats = smallStore.getStats();
    expect(stats.currentCount).toBe(5);
    expect(stats.maxCapacity).toBe(5);
    expect(stats.utilizationPercentage).toBe(100);

    // Query all logs: oldest (log_1, log_2, log_3) must have been evicted
    const result = smallStore.query({ limit: 10 });
    expect(result.total).toBe(5);
    // Newest first
    expect(result.data[0].id).toBe('log_8');
    expect(result.data[4].id).toBe('log_4');
  });

  test('Querying logs supports filtering by status, client, and search', () => {
    logStore.push({
      id: 'req_1',
      clientId: 'client_free',
      statusCode: 200,
      outcome: 'allowed',
      path: '/api/products'
    });
    logStore.push({
      id: 'req_2',
      clientId: 'client_free',
      statusCode: 429,
      outcome: 'rate_limited',
      path: '/api/products'
    });
    logStore.push({
      id: 'req_3',
      clientId: 'client_pro',
      statusCode: 200,
      outcome: 'allowed',
      path: '/api/orders'
    });

    // Filter by client
    const clientFreeLogs = logStore.query({ clientId: 'client_free' });
    expect(clientFreeLogs.total).toBe(2);

    // Filter by status 429
    const throttledLogs = logStore.query({ status: '429' });
    expect(throttledLogs.total).toBe(1);
    expect(throttledLogs.data[0].id).toBe('req_2');

    // Search by path keyword
    const ordersLogs = logStore.query({ search: 'orders' });
    expect(ordersLogs.total).toBe(1);
    expect(ordersLogs.data[0].id).toBe('req_3');
  });

  test('GET /api/analytics/overview returns aggregated telemetry metrics', async () => {
    // Record sample telemetry events
    metricsService.recordRequest({
      clientId: 'client_demo',
      clientName: 'Demo Client',
      routeId: 'products-read',
      statusCode: 200,
      latencyMs: 15
    });
    metricsService.recordRequest({
      clientId: 'client_demo',
      clientName: 'Demo Client',
      routeId: 'products-read',
      statusCode: 429,
      latencyMs: 5
    });

    const res = await request(app).get('/api/analytics/overview');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRequests).toBe(2);
    expect(res.body.data.allowedRequests).toBe(1);
    expect(res.body.data.throttledRequests).toBe(1);
    expect(res.body.data.latency).toHaveProperty('avgMs');
    expect(res.body.data.latency).toHaveProperty('p95Ms');
  });

  test('GET /api/analytics/timeseries returns time-bucketed telemetry for charts', async () => {
    metricsService.recordRequest({
      clientId: 'client_demo',
      statusCode: 200,
      latencyMs: 20
    });

    const res = await request(app).get('/api/analytics/timeseries');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('total', 1);
    expect(res.body.data[0]).toHaveProperty('allowed', 1);
  });

  test('GET /api/logs returns paginated traffic logs', async () => {
    logStore.push({
      id: 'req_test_abc',
      clientId: 'client_demo',
      path: '/gateway/api/products',
      statusCode: 200,
      latencyMs: 12
    });

    const res = await request(app).get('/api/logs?limit=10');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].id).toBe('req_test_abc');
  });

  test('POST /api/clients/:id/reset allows resetting bucket', async () => {
    const res = await request(app)
      .post('/api/clients/client_free/reset')
      .send({ routeId: 'products-read' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.clientId).toBe('client_free');
  });
});

