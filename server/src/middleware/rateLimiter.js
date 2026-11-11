const rateLimiter = require('../services/rateLimiter');
const { resolveRouteId, resolvePolicy } = require('../config/policies');
const logger = require('../utils/logger');

/**
 * PulseGate Rate Limiting Middleware
 * Enforces client-specific and route-specific Token Bucket rate limiting via Redis Lua.
 */
async function rateLimitMiddleware(req, res, next) {
  const requestId = req.id || 'unknown';

  // 1. Guard: Do not allow unauthenticated clients to consume tokens
  if (!req.client || !req.client.clientId) {
    logger.warn(`Unauthenticated client attempted to consume rate limit tokens [${requestId}]`);
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required. Unauthenticated clients cannot consume rate limit tokens.',
        statusCode: 401,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  const clientId = req.client.clientId;

  // 2. Resolve routeId and client/route rate-limit policy
  const routeId = resolveRouteId(req.originalUrl || req.path, req.method);
  const policy = resolvePolicy(clientId, routeId, req.client);

  try {
    // 3. Evaluate and consume quota atomically via Redis Lua script
    const result = await rateLimiter.consume({
      clientId: policy.clientId,
      routeId: policy.routeId,
      capacity: policy.capacity,
      refillRatePerSecond: policy.refillRatePerSecond,
      cost: policy.cost || 1
    });

    // 4. Attach rate-limit decision to request context
    req.rateLimit = {
      ...result,
      clientId: policy.clientId,
      routeId: policy.routeId,
      cost: policy.cost || 1
    };

    // 5. Always inject standard rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    const tokensSpent = Math.max(0, policy.capacity - result.remaining);
    const resetSeconds = Math.ceil(tokensSpent / policy.refillRatePerSecond);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    // 6. Handle Allowed vs Rejected
    if (result.allowed) {
      logger.info(
        `Rate limit ALLOWED: client [${clientId}] route [${routeId}] remaining [${result.remaining}/${result.limit}] [${requestId}]`
      );
      return next();
    }

    // 7. Reject: Set Retry-After header and return HTTP 429
    res.setHeader('Retry-After', result.retryAfterSeconds);

    logger.warn(
      `Rate limit REJECTED: client [${clientId}] route [${routeId}] remaining [0/${result.limit}] retryAfter [${result.retryAfterSeconds}s] [${requestId}]`
    );

    return res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Request quota exceeded',
        requestId,
        retryAfterSeconds: result.retryAfterSeconds
      }
    });
  } catch (err) {
    logger.error(`Rate limiter execution error for [${clientId}] on [${routeId}]: ${err.message}`);
    // Fail closed: reject request when rate limiter unavailable
    const requestId = req.id || 'unknown';
    return res.status(503).json({
      error: {
        code: 'RATE_LIMIT_UNAVAILABLE',
        message: 'Rate limiting service unavailable',
        statusCode: 503,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
}

module.exports = rateLimitMiddleware;
