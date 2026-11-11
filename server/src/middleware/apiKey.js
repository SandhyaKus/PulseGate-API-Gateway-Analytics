const { findClientByRawApiKey, sanitizeClient } = require('../config/clients');
const logger = require('../utils/logger');
const maskApiKey = require('../utils/maskKey');

/**
 * PulseGate API Key Authentication Middleware
 * Validates the X-API-Key header against cryptographic hashes of registered demo clients.
 */
function apiKeyMiddleware(req, res, next) {
  const requestId = req.id || 'unknown';

  // 1. Read API key from X-API-Key header (case-insensitive)
  const rawKey = req.headers['x-api-key'];

  // 2. Reject missing keys with HTTP 401
  if (!rawKey || typeof rawKey !== 'string' || rawKey.trim().length === 0) {
    return res.status(401).json({
      error: {
        code: 'API_KEY_REQUIRED',
        message: 'Missing API key. Please provide a valid key in the X-API-Key header.',
        statusCode: 401,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // 3. Cryptographically verify key against stored hashes using timing-safe comparison
  const client = findClientByRawApiKey(rawKey);

  // 4. Reject invalid keys with HTTP 401
  if (!client) {
    logger.warn(`Failed authentication attempt with invalid key [${maskApiKey(rawKey)}] [${requestId}]`);
    return res.status(401).json({
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key provided.',
        statusCode: 401,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // 5. Reject disabled clients with HTTP 403 Forbidden
  if (client.enabled === false) {
    logger.warn(`Blocked access attempt by disabled client [${client.clientId}] [${requestId}]`);
    return res.status(403).json({
      error: {
        code: 'CLIENT_DISABLED',
        message: 'This API client has been suspended or disabled.',
        statusCode: 403,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // 6. Attach sanitized client info to req.client (NEVER includes apiKeyHash)
  req.client = sanitizeClient(client);

  // 7. Inject client tracing header
  res.setHeader('X-Client-Id', client.clientId);

  next();
}

module.exports = apiKeyMiddleware;

