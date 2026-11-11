const express = require('express');
const router = express.Router();
const redisService = require('../services/redis.service');
const config = require('../config/environment');

const startTime = Date.now();

/**
 * GET /health
 * Returns service health, uptime, Redis connection status, and configuration
 */
router.get('/health', async (req, res) => {
  const redisStatus = await redisService.getStatus();

  // If Redis is connected, overall health is "ok"; otherwise "degraded"
  const isHealthy = redisStatus.connected;
  const status = isHealthy ? 'ok' : 'degraded';
  const httpStatus = isHealthy ? 200 : 200; // Return 200 so monitors can inspect degradation details

  res.status(httpStatus).json({
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    service: 'PulseGate API Gateway',
    version: '1.0.0',
    environment: config.env,
    redis: {
      status: redisStatus.connected ? 'connected' : 'disconnected',
      latencyMs: redisStatus.latencyMs,
      configuredUrl: redisStatus.configuredUrl,
      lastError: redisStatus.lastError
    },
    upstream: {
      configuredUrl: config.upstreamBaseUrl
    }
  });
});

module.exports = router;

