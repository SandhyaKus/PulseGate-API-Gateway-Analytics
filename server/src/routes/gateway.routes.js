const express = require('express');
const router = express.Router();
const apiKeyMiddleware = require('../middleware/apiKey');
const rateLimitMiddleware = require('../middleware/rateLimiter');
const { proxyToUpstream } = require('../controllers/gateway.controller');
const { resolveRouteRule } = require('../config/routes');

/**
 * Route whitelist validator to strictly prevent SSRF
 */
function routeWhitelistGuard(req, res, next) {
  const { matched } = resolveRouteRule(req.path, req.method);
  if (!matched) {
    return res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route "${req.method} ${req.path}" is not available or registered through the gateway.`,
        statusCode: 404,
        requestId: req.id || 'unknown'
      }
    });
  }
  next();
}

/**
 * Gateway request pipeline:
 * 1. API Key Authentication (validates X-API-Key hash, rejects disabled clients)
 * 2. Route Whitelist Guard (SSRF prevention)
 * 3. Rate Limiter (policy resolution & atomic Token Bucket evaluation via Redis Lua)
 * 4. Reverse Proxy Controller (forwards to fixed trusted upstream)
 */
router.use(apiKeyMiddleware);
router.use(routeWhitelistGuard);
router.use(rateLimitMiddleware);
router.all('*', proxyToUpstream);

module.exports = router;
