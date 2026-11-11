const express = require('express');
const router = express.Router();
const apiKeyMiddleware = require('../middleware/apiKey');
const rateLimitMiddleware = require('../middleware/rateLimiter');
const proxyService = require('../services/proxy');

/**
 * PulseGate Gateway Protected Routes
 *
 * Implements strict, closed reverse proxy routing targeting trusted UPSTREAM_BASE_URL only.
 * Immune to SSRF: Discards and rejects any user-supplied destination targets.
 */

// 1. API Key Authentication
router.use(apiKeyMiddleware);

// 2. Client & Route-Specific Rate Limiting
router.use(rateLimitMiddleware);

/**
 * GET /gateway/products (and GET /gateway/api/products)
 * Maps strictly to upstream: GET /api/products
 */
router.get(['/products', '/api/products'], (req, res) => {
  return proxyService.forward(req, res, '/api/products');
});

/**
 * GET /gateway/products/:id (and GET /gateway/api/products/:id)
 * Maps strictly to upstream: GET /api/products/:id
 */
router.get(['/products/:id', '/api/products/:id'], (req, res) => {
  const safeId = encodeURIComponent(req.params.id);
  return proxyService.forward(req, res, `/api/products/${safeId}`);
});

/**
 * Catch-all for non-whitelisted routes
 * Guarantees PulseGate NEVER acts as an open proxy
 */
router.all('*', (req, res) => {
  return res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route "${req.method} ${req.path}" is not registered on this gateway.`,
      statusCode: 404,
      requestId: req.id || 'unknown'
    }
  });
});

module.exports = router;

