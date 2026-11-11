const { findClientByApiKey } = require('../config/clients');

/**
 * Authentication middleware for PulseGate clients
 * Validates x-api-key or Bearer token against registered developer tiers.
 */
function authenticateMiddleware(req, res, next) {
  // Extract API key from header or query param
  let apiKey = req.headers['x-api-key'];

  if (!apiKey && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      apiKey = parts[1];
    }
  }

  if (!apiKey && req.query && req.query.apiKey) {
    apiKey = req.query.apiKey;
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return res.status(401).json({
      error: {
        code: 'API_KEY_REQUIRED',
        message: 'Authentication failed. Please provide a valid API key via x-api-key header or Bearer token.',
        statusCode: 401,
        requestId: req.id || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }

  const client = findClientByApiKey(apiKey);

  if (!client) {
    return res.status(401).json({
      error: {
        code: 'INVALID_API_KEY',
        message: 'Authentication failed. The provided API key is unrecognized or revoked.',
        statusCode: 401,
        requestId: req.id || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Attach resolved client context
  req.client = {
    id: client.id,
    name: client.name,
    tier: client.tier,
    capacity: client.capacity,
    refillRatePerSecond: client.refillRatePerSecond,
    maskedKey: client.maskedKey
  };

  res.setHeader('X-Client-Id', client.id);
  next();
}

module.exports = authenticateMiddleware;

