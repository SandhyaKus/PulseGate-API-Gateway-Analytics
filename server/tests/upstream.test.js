const request = require('supertest');
const upstreamApp = require('../src/upstream/upstreamApp');

describe('Sample Trusted Upstream API (Day 1)', () => {
  it('GET /api/products returns at least 5 sample products', async () => {
    const res = await request(upstreamApp).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);

    // Verify first product schema
    const product = res.body.data[0];
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('stock');
    expect(product).toHaveProperty('category');
    expect(product).toHaveProperty('description');
  });

  it('GET /api/products supports limit query parameter', async () => {
    const res = await request(upstreamApp).get('/api/products?limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('GET /api/products supports category filtering', async () => {
    const res = await request(upstreamApp).get('/api/products?category=Security');

    expect(res.status).toBe(200);
    expect(res.body.data.every(p => p.category === 'Security')).toBe(true);
  });

  it('GET /api/products/:id returns specific product', async () => {
    const res = await request(upstreamApp).get('/api/products/prod_01J8F9');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('prod_01J8F9');
    expect(res.body.data.name).toBe('PulseGate Shield Pro');
  });

  it('GET /api/products/:id returns 404 for unknown product', async () => {
    const res = await request(upstreamApp).get('/api/products/unknown_xyz');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /health returns upstream mock service status', async () => {
    const res = await request(upstreamApp).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('Trusted Upstream');
  });
});

